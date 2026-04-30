// ──────────────────────────────────────────────
// POST /api/disease/explain – SSE streaming disease explanation via Claude
// ──────────────────────────────────────────────

import { supabase } from "@/lib/supabaseClient";
import { streamClaude, buildFarmerSystemPrompt } from "@/lib/server/claude";
import { z } from "zod";

const explainSchema = z.object({
  diseaseName: z.string().min(1),
  crop: z.string().optional(),
  farmerId: z.string().optional(),
  language: z.enum(["hi", "en"]).default("hi"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = explainSchema.parse(body);

    // Get farmer context if available
    let farmerContext: any = { language: validated.language };
    if (validated.farmerId) {
      const { data: farmer } = await supabase
        .from("farmers")
        .select("*")
        .eq("id", validated.farmerId)
        .maybeSingle();

      if (farmer) {
        farmerContext = {
          name: farmer.name,
          state: farmer.state,
          district: farmer.district,
          crop: validated.crop || farmer.primary_crop || undefined,
          language: farmer.language_pref,
        };
      }
    }

    const systemPrompt = buildFarmerSystemPrompt(
      farmerContext,
      `You are a plant pathology expert. Explain the given crop disease in simple terms.
Include: what it is, why it happens, how to identify it, treatment options (both organic and chemical),
and prevention methods. Use practical language a farmer can understand.
If the language is Hindi, respond in simple Hindi using Devanagari script.`
    );

    const userMessage = `Explain the disease "${validated.diseaseName}" affecting ${validated.crop || "crops"} in detail. Provide treatment and prevention advice.`;

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamClaude(systemPrompt, userMessage, 1500)) {
            const data = `data: ${JSON.stringify({ text: chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const errorMsg = `data: ${JSON.stringify({ error: "Stream failed" })}\n\n`;
          controller.enqueue(encoder.encode(errorMsg));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to explain disease" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ──────────────────────────────────────────────
// POST /api/disease/predict – Disease detection via deployed Plant-Disease-Model
// Calls: https://plant-disease-model.vercel.app/predict
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError } from "@/lib/server/errors";
import { z } from "zod";

const predictSchema = z.object({
  fieldId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  imageBase64: z.string().optional(),
});

const ML_API_URL = "https://plant-disease-model.vercel.app/predict";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = predictSchema.parse(body);

    let detected = "Unknown";
    let confidence = 0;

    if (validated.imageBase64) {
      try {
        // The Flask API expects: { "image": "data:image/png;base64,..." }
        // and internally does data.split(',')[1] to get the raw base64.
        // Our frontend sends a full data URL, so pass it directly.
        const imageData = validated.imageBase64;

        const mlRes = await fetch(ML_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageData }),
        });

        if (mlRes.ok) {
          const mlData = await mlRes.json();
          // Flask API returns: { "result": "Healthy ✅" or "Diseased ❌", "confidence": 92.3 }
          console.log("ML API response:", JSON.stringify(mlData));

          const rawResult = (mlData.result || "").toString();

          // Clean up emojis from the result string
          if (rawResult.toLowerCase().includes("healthy")) {
            detected = "Healthy";
          } else if (rawResult.toLowerCase().includes("diseased")) {
            detected = "Diseased";
          } else {
            detected = rawResult.replace(/[❌✅🟢🔴]/g, "").trim() || "Unknown";
          }

          // Confidence comes as a percentage number (e.g. 92.3)
          confidence = typeof mlData.confidence === "number" ? mlData.confidence : 0;
        } else {
          const errText = await mlRes.text();
          console.error("ML API failed:", mlRes.status, errText);
          detected = "Unknown";
          confidence = 0;
        }
      } catch (err) {
        console.error("Failed to connect to Plant-Disease-Model API:", err);
        detected = "Unknown";
        confidence = 0;
      }
    }

    const isHealthy = detected.toLowerCase().includes("healthy");

    // Treatment advice based on result
    const treatment = isHealthy
      ? "No treatment needed. Your crop looks healthy! Continue regular monitoring."
      : "Consult your local agricultural officer. Apply appropriate fungicide/pesticide based on the specific disease identified. Remove and destroy infected plant parts.";

    const severity = isHealthy ? "none" : confidence > 80 ? "high" : confidence > 50 ? "medium" : "low";

    // Log to database if fieldId provided
    if (validated.fieldId) {
      await supabase
        .from("disease_detections")
        .insert([{
          field_id: validated.fieldId,
          image_url: validated.imageUrl || "uploaded-image",
          disease_name: detected,
          confidence: confidence,
          treatment_applied: null,
          date: new Date().toISOString(),
        }])
        .then(() => {});
    }

    return NextResponse.json({
      disease: detected,
      confidence: confidence,
      severity,
      treatment,
      preventive_measures: [
        "Use disease-resistant varieties",
        "Maintain proper spacing between plants",
        "Avoid overhead irrigation",
        "Remove and destroy infected plant debris",
      ],
    });
  } catch (err) {
    return handleApiError(err);
  }
}

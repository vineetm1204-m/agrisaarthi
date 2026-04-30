import { NextResponse } from "next/server";
import { callClaude } from "@/lib/server/claude";
import { findFarmerById, logIvrCall } from "@/lib/server/ivr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = (body.text || "").toString().trim();
    const farmerId = (body.farmerId || "").toString();

    if (!text) {
      return NextResponse.json(
        { error: "Missing query text" },
        { status: 400 }
      );
    }

    const farmer = farmerId ? await findFarmerById(farmerId) : null;

    const system =
      "You are AgriSaarthi, an agricultural assistant for Indian farmers. " +
      "Answer in simple Hindi in 2-3 sentences max. " +
      `Farmer's profile: ${JSON.stringify({
        name: farmer?.name ?? "Farmer",
        district: farmer?.district ?? "",
        state: farmer?.state ?? "",
        crop: farmer?.primaryCrop ?? "",
      })}.`;

    const responseText =
      (await callClaude({ system, user: text, maxTokens: 240 })) ??
      "Maaf kijiye, abhi main is sawal ka uttar nahi de pa raha hoon.";

    await logIvrCall({
      farmerId: farmer?.id ?? farmerId ?? null,
      farmerPhone: farmer?.phone ?? "",
      queryType: "web_voice",
      queryText: text,
      responseText,
      durationSeconds: null,
      channel: "web_voice",
    });

    return NextResponse.json({ responseText });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to process query", details: err.message },
      { status: 500 }
    );
  }
}

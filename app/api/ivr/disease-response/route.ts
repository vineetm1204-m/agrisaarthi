import { callClaude } from "@/lib/server/claude";
import { findFarmerByPhone, logIvrCall, normalizePhone } from "@/lib/server/ivr";
import { say, wrapResponse, xmlResponse } from "@/lib/server/twiml";
import type { FarmerProfile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildFallback() {
  return wrapResponse(
    say(
      "Kripya fasal aur rog ke lakshan dobara batayein.",
      "hi-IN"
    )
  );
}

function parseDurationSeconds(form: FormData): number | null {
  const raw =
    form.get("CallDuration")?.toString() ??
    form.get("Duration")?.toString() ??
    "";
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildFarmerContext(farmer: FarmerProfile | null) {
  if (farmer) {
    return farmer;
  }

  return {
    id: "unknown",
    name: "Farmer",
    phone: "",
    village: "",
    district: "",
    state: "",
    avatarUrl: "",
    language: "hi" as const,
  };
}

export async function POST(req: Request) {
  const form = await req.formData();
  const speech = form.get("SpeechResult")?.toString() ?? "";
  const fromRaw = form.get("From")?.toString() ?? "";
  const from = normalizePhone(fromRaw);
  const callSid = form.get("CallSid")?.toString() ?? "";
  const durationSeconds = parseDurationSeconds(form);

  if (!speech) {
    return xmlResponse(buildFallback());
  }

  const farmer = await findFarmerByPhone(from);
  const context = buildFarmerContext(farmer);

  const system =
    "You are AgriSaarthi, an agricultural assistant for Indian farmers. " +
    "Diagnose crop disease based on the farmer's description. " +
    "Answer in simple Hindi in 2-3 sentences, mention likely disease and " +
    "2 quick actions. " +
    `Farmer's profile: ${JSON.stringify({
      name: context.name,
      district: context.district,
      crop: context.primaryCrop,
    })}.`;

  const responseText =
    (await callClaude(system, speech, 240)) ??
    "Maaf kijiye, abhi main is rog ka uttar nahi de pa raha hoon.";

  await logIvrCall({
    farmerId: farmer?.id ?? null,
    farmerPhone: from,
    queryType: "disease",
    queryText: speech,
    responseText,
    durationSeconds,
    channel: "ivr",
    callSid,
  });

  return xmlResponse(wrapResponse(say(responseText, "hi-IN")));
}

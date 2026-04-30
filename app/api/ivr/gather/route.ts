// ──────────────────────────────────────────────
// POST /api/ivr/gather – Twilio Webhook (Speech Processed)
// ──────────────────────────────────────────────

import { twiml } from "@/lib/server/twilio";
import { supabase } from "@/lib/supabaseClient";
import { callClaude, buildFarmerSystemPrompt } from "@/lib/server/claude";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const from = formData.get("From") as string;
    const speechResult = formData.get("SpeechResult") as string;
    const callSid = formData.get("CallSid") as string;

    const response = twiml();

    if (!speechResult) {
      response.redirect("/api/ivr/inbound");
      return new Response(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Lookup farmer context
    const { data: farmer } = await supabase
      .from("farmers")
      .select("*")
      .eq("phone", from)
      .maybeSingle();

    const systemPrompt = buildFarmerSystemPrompt(
      {
        name: farmer?.name,
        state: farmer?.state,
        district: farmer?.district,
        crop: farmer?.primary_crop || undefined,
        language: farmer?.language_pref,
      },
      `You are an interactive voice response (IVR) assistant answering a farmer's question spoken over the phone.
The farmer asked a question in Hindi (or mixed English/Hindi). 
Provide a very short, direct, and actionable answer (under 30 seconds to read aloud).
Format the response as plain text only. Speak naturally in Hindi.`
    );

    let answerText = "क्षमा करें, मुझे आपका सवाल समझ नहीं आया।";
    
    try {
      answerText = await callClaude(systemPrompt, `Farmer asked: "${speechResult}"`);
    } catch (err) {
      answerText = "क्षमा करें, अभी हमारे सिस्टम में कुछ तकनीकी समस्या है।";
    }

    // Determine query type (basic heuristic)
    let queryType = "general";
    const lowerQ = speechResult.toLowerCase();
    if (lowerQ.includes("weather") || lowerQ.includes("mausam") || lowerQ.includes("मौसम")) queryType = "weather";
    else if (lowerQ.includes("disease") || lowerQ.includes("bimari") || lowerQ.includes("बीमारी")) queryType = "disease";
    else if (lowerQ.includes("mandi") || lowerQ.includes("bhav") || lowerQ.includes("मंडी") || lowerQ.includes("भाव")) queryType = "mandi";
    else if (lowerQ.includes("scheme") || lowerQ.includes("yojana") || lowerQ.includes("योजना")) queryType = "schemes";

    // Log the IVR call to the database
    await supabase
      .from("ivr_calls")
      .insert([{
        farmer_phone: from,
        query_type: queryType,
        query_text: speechResult,
        response_text: answerText,
        call_sid: callSid,
        channel: "ivr",
      }])
      .then(() => {});

    // Speak the answer and allow further questions
    response.say({ language: "hi-IN" }, answerText);
    
    const gather = response.gather({
      input: ["speech"],
      action: "/api/ivr/gather",
      method: "POST",
      language: "hi-IN",
      speechTimeout: "auto",
    });
    gather.say({ language: "hi-IN" }, "क्या आपका कोई और सवाल है?");

    response.say({ language: "hi-IN" }, "धन्यवाद। आपका दिन शुभ हो।");

    return new Response(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err: any) {
    const response = twiml();
    response.say(
      { language: "hi-IN" },
      "क्षमा करें, तकनीकी समस्या है।"
    );
    return new Response(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}

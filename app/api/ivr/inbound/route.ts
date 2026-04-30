// ──────────────────────────────────────────────
// POST /api/ivr/inbound – Twilio Webhook (Initial Call)
// ──────────────────────────────────────────────

import { twiml } from "@/lib/server/twilio";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const from = formData.get("From") as string;
    
    // Create TwiML response
    const response = twiml();
    
    const gather = response.gather({
      input: ["speech"],
      action: "/api/ivr/gather",
      method: "POST",
      language: "hi-IN",
      speechTimeout: "auto",
    });

    gather.say(
      { language: "hi-IN" },
      "एग्री सारथी में आपका स्वागत है। कृपया अपना सवाल पूछें। जैसे: गेहूं की फसल में कौन सी बीमारी लगी है? या आज का मौसम कैसा है?"
    );

    // If no speech detected, loop
    response.redirect("/api/ivr/inbound");

    return new Response(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err: any) {
    const response = twiml();
    response.say(
      { language: "hi-IN" },
      "क्षमा करें, तकनीकी समस्या है। कृपया बाद में कॉल करें।"
    );
    return new Response(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}

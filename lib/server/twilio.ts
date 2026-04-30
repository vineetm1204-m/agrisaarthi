// ──────────────────────────────────────────────
// Twilio – SMS + IVR Helpers
// ──────────────────────────────────────────────

import twilio from "twilio";

const globalForTwilio = globalThis as unknown as {
  twilioClient: twilio.Twilio | undefined;
};

function createTwilioClient(): twilio.Twilio | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token || sid === "your_twilio_account_sid") {
    return null;
  }

  return twilio(sid, token);
}

export const twilioClient =
  globalForTwilio.twilioClient ?? createTwilioClient();

if (process.env.NODE_ENV !== "production") {
  globalForTwilio.twilioClient = twilioClient as any;
}

/**
 * Send an SMS to a phone number.
 */
export async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!twilioClient) {
    if (process.env.NODE_ENV === "development") {
      return { success: true, sid: "dev-mock-sid" };
    }
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const message = await twilioClient.messages.create({
      body,
      to,
      from: process.env.TWILIO_PHONE_NUMBER || "",
    });
    return { success: true, sid: message.sid };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generate TwiML for IVR responses.
 */
export function twiml() {
  return new twilio.twiml.VoiceResponse();
}

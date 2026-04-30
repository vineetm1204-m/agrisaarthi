interface GatherOptions {
  action: string;
  input?: "dtmf" | "speech" | "dtmf speech";
  language?: string;
  speechTimeout?: string;
  numDigits?: number;
  sayText: string;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function say(text: string, language = "hi-IN"): string {
  return `<Say language="${language}">${escapeXml(text)}</Say>`;
}

export function gather({
  action,
  input = "dtmf speech",
  language = "hi-IN",
  speechTimeout = "3",
  numDigits,
  sayText,
}: GatherOptions): string {
  const digitsAttr = typeof numDigits === "number" ? ` numDigits="${numDigits}"` : "";
  return (
    `<Gather input="${input}" action="${action}" method="POST" language="${language}" speechTimeout="${speechTimeout}"${digitsAttr}>` +
    `${say(sayText, language)}` +
    "</Gather>"
  );
}

export function wrapResponse(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
}

export function xmlResponse(twiml: string): Response {
  return new Response(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

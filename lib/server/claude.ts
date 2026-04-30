// ──────────────────────────────────────────────
// AI Helper — Gemini primary, OpenRouter fallback
// Automatically retries with fallback provider
// ──────────────────────────────────────────────

// ─── Provider configs ───
const GEMINI_MODEL = "gemini-2.0-flash";
const OPENROUTER_MODEL = "deepseek/deepseek-chat";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function getGeminiUrl(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "";
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
}

// ─── Gemini call ───
async function callGemini(
  systemPrompt: string,
  contents: { role: string; parts: { text: string }[] }[],
  maxTokens: number
): Promise<string> {
  const url = getGeminiUrl();
  if (!url) throw new Error("NO_GEMINI_KEY");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.warn(`Gemini API error: ${res.status}`);
    throw new Error(`GEMINI_${res.status}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── OpenRouter call ───
async function callOpenRouter(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  maxTokens: number
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY; // This holds the OpenRouter key
  if (!key) throw new Error("No OpenRouter API key (ANTHROPIC_API_KEY) set");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "AgriSaarthi",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("OpenRouter API error:", res.status, errBody);
    throw new Error(`OpenRouter returned ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Public helpers (try Gemini → fallback OpenRouter) ───

/**
 * Build a system prompt that includes farmer context.
 */
export function buildFarmerSystemPrompt(
  farmerContext: {
    name?: string;
    state?: string;
    district?: string;
    crop?: string;
    landSize?: number;
    language?: string;
  },
  additionalInstructions: string
): string {
  const lang = farmerContext.language === "hi" ? "Hindi" : "English";
  return `You are AgriSaarthi, an expert AI assistant for Indian farmers.

Farmer Context:
- Name: ${farmerContext.name || "Unknown"}
- Location: ${farmerContext.district || "Unknown"}, ${farmerContext.state || "India"}
- Crop: ${farmerContext.crop || "General"}
- Land Size: ${farmerContext.landSize || "Unknown"} acres
- Preferred Language: ${lang}

${additionalInstructions}

Always provide practical, region-specific advice. When responding in Hindi, use simple everyday Hindi that a rural farmer would understand. Be concise and actionable.`;
}

/**
 * Call AI with a simple system + user prompt. Tries Gemini first, falls back to OpenRouter.
 */
export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2000
): Promise<string> {
  // 1) Try Gemini
  try {
    const result = await callGemini(
      systemPrompt,
      [{ role: "user", parts: [{ text: userMessage }] }],
      maxTokens
    );
    if (result) return result;
  } catch (err: any) {
    console.warn("Gemini failed, falling back to OpenRouter:", err.message);
  }

  // 2) Fallback to OpenRouter
  try {
    const result = await callOpenRouter(
      systemPrompt,
      [{ role: "user", content: userMessage }],
      maxTokens
    );
    if (result) return result;
  } catch (err: any) {
    console.error("OpenRouter fallback also failed:", err.message);
  }

  return "Maaf kijiye, abhi service uplabdh nahi hai. Kripya thodi der baad prayaas karein.";
}

/**
 * Call AI with full message history (for multi-turn chat / IVR).
 * Tries Gemini first, falls back to OpenRouter.
 */
export async function callClaudeWithHistory(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens = 200
): Promise<string> {
  // 1) Try Gemini
  try {
    const geminiContents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const result = await callGemini(systemPrompt, geminiContents, maxTokens);
    if (result) return result;
  } catch (err: any) {
    console.warn("Gemini failed, falling back to OpenRouter:", err.message);
  }

  // 2) Fallback to OpenRouter
  try {
    const openRouterMsgs = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const result = await callOpenRouter(systemPrompt, openRouterMsgs, maxTokens);
    if (result) return result;
  } catch (err: any) {
    console.error("OpenRouter fallback also failed:", err.message);
  }

  return "Maaf kijiye, abhi service uplabdh nahi hai. Kripya thodi der baad prayaas karein.";
}

// Keep this export so any file importing CLAUDE_MODEL still works
export const CLAUDE_MODEL = GEMINI_MODEL;

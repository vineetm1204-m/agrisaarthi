// ──────────────────────────────────────────────
// Anthropic Claude API Helper
// ──────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

function createClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  });
}

export const anthropic = globalForAnthropic.anthropic ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForAnthropic.anthropic = anthropic;
}

export const CLAUDE_MODEL = "claude-sonnet-4-20250514";

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
 * Call Claude with a simple prompt and return the text response.
 */
export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2000
): Promise<string> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}

/**
 * Stream Claude response as an async generator for SSE.
 */
export async function* streamClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2000
): AsyncGenerator<string> {
  const stream = anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

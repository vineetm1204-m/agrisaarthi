import { NextResponse } from 'next/server';
import { callClaude } from '../../../../lib/server/claude';

export async function POST(req: Request) {
  try {
    const { conversation_history } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ summary: "Summary unavailable because API key is missing." });
    }

    const summary = await callClaude(
      "You summarize agricultural conversations between a farmer and an AI. Provide a maximum 2-sentence summary of what was discussed.",
      JSON.stringify(conversation_history),
      150
    );

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summary API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

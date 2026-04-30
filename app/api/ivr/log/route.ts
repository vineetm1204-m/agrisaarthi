import { NextResponse } from "next/server";
import { logIvrCall } from "@/lib/server/ivr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.farmer_phone || !body.query_type || !body.query_text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await logIvrCall({
      farmerId: body.farmer_id ?? null,
      farmerPhone: body.farmer_phone,
      queryType: body.query_type,
      queryText: body.query_text,
      responseText: body.response_text ?? "",
      durationSeconds:
        typeof body.duration_seconds === "number" ? body.duration_seconds : null,
      channel: body.channel ?? "ivr",
      callSid: body.call_sid ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to log call", details: err.message },
      { status: 500 }
    );
  }
}

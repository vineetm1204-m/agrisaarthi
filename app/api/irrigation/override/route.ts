import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    return NextResponse.json({ success: true, newTime: data.time });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

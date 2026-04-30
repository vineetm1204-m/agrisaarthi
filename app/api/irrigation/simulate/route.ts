import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Forward to Flask ML microservice
    const mlRes = await fetch("http://localhost:5000/api/irrigation/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!mlRes.ok) {
      throw new Error(`ML microservice error: ${mlRes.status}`);
    }

    const data = await mlRes.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Simulation failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getIvrSettings, setIvrSettings } from "@/lib/server/ivr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const farmerId = searchParams.get("farmerId") || "";

  if (!farmerId) {
    return NextResponse.json(
      { error: "Missing farmerId" },
      { status: 400 }
    );
  }

  const settings = await getIvrSettings(farmerId);
  return NextResponse.json({
    enabled: settings?.enabled ?? true,
    number: settings?.number ?? process.env.NEXT_PUBLIC_IVR_NUMBER ?? null,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.farmerId) {
      return NextResponse.json(
        { error: "Missing farmerId" },
        { status: 400 }
      );
    }

    const enabled = Boolean(body.enabled);
    const number = body.number ?? process.env.NEXT_PUBLIC_IVR_NUMBER ?? null;

    await setIvrSettings(body.farmerId, { enabled, number });

    return NextResponse.json({
      success: true,
      enabled,
      number,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to update settings", details: err.message },
      { status: 500 }
    );
  }
}

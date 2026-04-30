import { NextResponse } from "next/server";
import {
  getMonthlyStats,
  getRecentCallsByFarmer,
} from "@/lib/server/ivr";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  try {
    const { farmerId } = await params;
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "10");

    if (!farmerId) {
      return NextResponse.json(
        { error: "Missing farmer id" },
        { status: 400 }
      );
    }

    // Get farmer phone first for count
    const { data: farmer } = await supabase
      .from("farmers")
      .select("phone")
      .eq("id", farmerId)
      .single();

    if (!farmer) {
      return NextResponse.json({ items: [], totalCount: 0, stats: {} });
    }

    const [items, countRes] = await Promise.all([
      getRecentCallsByFarmer(farmerId, page, pageSize),
      supabase
        .from("ivr_calls")
        .select("*", { count: "exact", head: true })
        .eq("farmer_phone", farmer.phone)
    ]);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const stats = await getMonthlyStats(farmerId, monthStart);

    return NextResponse.json({
      items,
      page,
      pageSize,
      totalCount: countRes.count || 0,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to load IVR history", details: err.message },
      { status: 500 }
    );
  }
}

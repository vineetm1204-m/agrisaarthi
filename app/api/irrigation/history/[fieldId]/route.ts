// ──────────────────────────────────────────────
// GET /api/irrigation/history/[fieldId] – Irrigation history
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError } from "@/lib/server/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    const { fieldId } = await params;

    const { data: logs, error } = await supabase
      .from("irrigation_logs")
      .select("*")
      .eq("field_id", fieldId)
      .order("date", { ascending: false })
      .limit(30);

    if (error) throw error;

    if (!logs || logs.length === 0) {
      // Return mock data for fields without history
      const mockHistory = Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - i * 86400000).toISOString().split("T")[0],
        waterUsed: Math.round(300 + Math.random() * 400),
      }));
      return NextResponse.json(mockHistory);
    }

    return NextResponse.json(
      logs.map((l: any) => ({
        date: l.date?.split("T")[0],
        waterUsed: l.water_liters,
        source: l.source,
      }))
    );
  } catch (err) {
    return handleApiError(err);
  }
}

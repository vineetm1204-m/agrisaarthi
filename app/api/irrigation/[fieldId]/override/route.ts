// ──────────────────────────────────────────────
// POST /api/irrigation/[fieldId]/override – Manual irrigation override
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError } from "@/lib/server/errors";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    const { fieldId } = await params;

    // Log the manual override as an irrigation event
    const { data: log, error } = await supabase
      .from("irrigation_logs")
      .insert([{
        field_id: fieldId,
        date: new Date().toISOString(),
        water_liters: 500, // Default override amount
        source: "manual",
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Irrigation override recorded",
      logId: log.id,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

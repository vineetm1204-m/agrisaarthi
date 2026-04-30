// ──────────────────────────────────────────────
// GET /api/disease/history/[fieldId] – Disease detection history
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

    const { data: detections, error } = await supabase
      .from("disease_detections")
      .select("*")
      .eq("field_id", fieldId)
      .order("date", { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!detections || detections.length === 0) {
      return NextResponse.json([
        {
          id: "mock-1",
          date: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
          diseaseName: "Wheat Rust",
          treatment: "Applied Propiconazole",
        },
      ]);
    }

    return NextResponse.json(
      detections.map((d: any) => ({
        id: d.id,
        date: d.date?.split("T")[0],
        diseaseName: d.disease_name || "Unknown",
        confidence: d.confidence,
        treatment: d.treatment_applied || "Pending",
        imageUrl: d.image_url,
      }))
    );
  } catch (err) {
    return handleApiError(err);
  }
}

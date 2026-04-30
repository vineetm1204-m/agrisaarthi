// ──────────────────────────────────────────────
// GET/POST /api/activity/[fieldId] – Field activities
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError, notFound } from "@/lib/server/errors";
import { activityCreateSchema } from "@/lib/server/validators";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    const { fieldId } = await params;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const [activitiesRes, countRes] = await Promise.all([
      supabase
        .from("activities")
        .select("*")
        .eq("field_id", fieldId)
        .order("date", { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from("activities")
        .select("*", { count: "exact", head: true })
        .eq("field_id", fieldId),
    ]);

    if (activitiesRes.error) throw activitiesRes.error;

    const total = countRes.count || 0;

    return NextResponse.json({
      data: (activitiesRes.data || []).map((a: any) => ({
        id: a.id,
        fieldId: a.field_id,
        type: a.type,
        date: a.date?.split("T")[0],
        note: a.note,
        quantity: a.quantity,
        unit: a.unit,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    const { fieldId } = await params;
    const body = await req.json();
    const validated = activityCreateSchema.parse({ ...body, fieldId });

    // Verify field exists
    const { data: field } = await supabase
      .from("fields")
      .select("id")
      .eq("id", fieldId)
      .maybeSingle();

    if (!field) throw notFound("Field not found");

    const { data: activity, error } = await supabase
      .from("activities")
      .insert([{
        field_id: fieldId,
        type: validated.type,
        date: new Date(validated.date).toISOString(),
        note: validated.note,
        quantity: validated.quantity,
        unit: validated.unit,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        id: activity.id,
        fieldId: activity.field_id,
        type: activity.type,
        date: activity.date?.split("T")[0],
        note: activity.note,
        quantity: activity.quantity,
        unit: activity.unit,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}

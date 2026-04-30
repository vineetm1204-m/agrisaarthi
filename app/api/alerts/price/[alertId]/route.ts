// ──────────────────────────────────────────────
// PATCH/DELETE /api/alerts/price/[alertId] – Update or Delete Price Alert
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError } from "@/lib/server/errors";
import { priceAlertUpdateSchema } from "@/lib/server/validators";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await params;
    const body = await req.json();
    const validated = priceAlertUpdateSchema.parse(body);

    const { data: alert, error } = await supabase
      .from("price_alerts")
      .update({
        active: validated.active,
        target_price: validated.targetPrice,
        direction: validated.direction,
      })
      .eq("id", alertId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(alert);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await params;

    const { error } = await supabase
      .from("price_alerts")
      .delete()
      .eq("id", alertId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

// ──────────────────────────────────────────────
// GET/POST /api/alerts/price – Manage Price Alerts
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError } from "@/lib/server/errors";
import { priceAlertCreateSchema } from "@/lib/server/validators";

export async function GET(req: Request) {
  try {
    const phone = req.headers.get("x-farmer-phone");
    if (!phone) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: farmer } = await supabase
      .from("farmers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (!farmer) {
      return NextResponse.json([]);
    }

    const { data: alerts, error } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("farmer_id", farmer.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(alerts || []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const phone = req.headers.get("x-farmer-phone");
    if (!phone) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: farmer } = await supabase
      .from("farmers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (!farmer) {
      return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    }

    const body = await req.json();
    const validated = priceAlertCreateSchema.parse(body);

    const { data: alert, error } = await supabase
      .from("price_alerts")
      .insert([{
        farmer_id: farmer.id,
        crop: validated.crop,
        target_price: validated.targetPrice,
        direction: validated.direction,
        active: true,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(alert, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

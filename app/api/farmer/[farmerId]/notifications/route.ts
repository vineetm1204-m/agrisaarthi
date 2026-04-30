// ──────────────────────────────────────────────
// GET/PATCH /api/farmer/[farmerId]/notifications
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError, notFound } from "@/lib/server/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  try {
    const { farmerId } = await params;

    const { data: farmer, error } = await supabase
      .from("farmers")
      .select("notif_weather, notif_mandi, notif_irrigation, notif_disease, notif_schemes")
      .eq("id", farmerId)
      .maybeSingle();

    if (error) throw error;
    if (!farmer) throw notFound("Farmer not found");

    return NextResponse.json({
      weatherAlerts: farmer.notif_weather,
      mandiAlerts: farmer.notif_mandi,
      irrigationReminders: farmer.notif_irrigation,
      diseaseAlerts: farmer.notif_disease,
      schemeAlerts: farmer.notif_schemes,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  try {
    const { farmerId } = await params;
    const body = await req.json();

    const updateData: any = {};
    if (body.weatherAlerts !== undefined) updateData.notif_weather = body.weatherAlerts;
    if (body.mandiAlerts !== undefined) updateData.notif_mandi = body.mandiAlerts;
    if (body.irrigationReminders !== undefined) updateData.notif_irrigation = body.irrigationReminders;
    if (body.diseaseAlerts !== undefined) updateData.notif_disease = body.diseaseAlerts;
    if (body.schemeAlerts !== undefined) updateData.notif_schemes = body.schemeAlerts;

    const { data: farmer, error } = await supabase
      .from("farmers")
      .update(updateData)
      .eq("id", farmerId)
      .select("notif_weather, notif_mandi, notif_irrigation, notif_disease, notif_schemes")
      .single();

    if (error) throw error;

    return NextResponse.json({
      weatherAlerts: farmer.notif_weather,
      mandiAlerts: farmer.notif_mandi,
      irrigationReminders: farmer.notif_irrigation,
      diseaseAlerts: farmer.notif_disease,
      schemeAlerts: farmer.notif_schemes,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

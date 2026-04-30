// ──────────────────────────────────────────────
// GET /api/farmer/[farmerId]/export – Download farmer data as JSON
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

    // Fetch farmer with all related data
    const { data: farmer, error: farmerErr } = await supabase
      .from("farmers")
      .select("*")
      .eq("id", farmerId)
      .single();

    if (farmerErr || !farmer) throw notFound("Farmer not found");

    const { data: fields } = await supabase
      .from("fields")
      .select("*")
      .eq("farmer_id", farmerId);

    const { data: priceAlerts } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("farmer_id", farmerId);

    // For each field, get activities, irrigation logs, disease detections
    const fieldsWithData = await Promise.all(
      (fields || []).map(async (f: any) => {
        const [activitiesRes, irrigationRes, diseaseRes] = await Promise.all([
          supabase.from("activities").select("*").eq("field_id", f.id),
          supabase.from("irrigation_logs").select("*").eq("field_id", f.id),
          supabase.from("disease_detections").select("*").eq("field_id", f.id),
        ]);
        return {
          name: f.name,
          areaAcres: f.area_acres,
          soilType: f.soil_type,
          currentCrop: f.current_crop,
          sowingDate: f.sowing_date,
          activities: (activitiesRes.data || []).map((a: any) => ({
            type: a.type,
            date: a.date,
            note: a.note,
            quantity: a.quantity,
          })),
          irrigationLogs: (irrigationRes.data || []).map((l: any) => ({
            date: l.date,
            waterLiters: l.water_liters,
            source: l.source,
          })),
          diseaseDetections: (diseaseRes.data || []).map((d: any) => ({
            diseaseName: d.disease_name,
            confidence: d.confidence,
            date: d.date,
          })),
        };
      })
    );

    const exportData = {
      profile: {
        id: farmer.id,
        name: farmer.name,
        phone: farmer.phone,
        district: farmer.district,
        state: farmer.state,
        language: farmer.language_pref,
        landSizeAcres: farmer.land_size_acres,
        primaryCrop: farmer.primary_crop,
        createdAt: farmer.created_at,
      },
      fields: fieldsWithData,
      priceAlerts: (priceAlerts || []).map((a: any) => ({
        crop: a.crop,
        targetPrice: a.target_price,
        direction: a.direction,
        active: a.active,
      })),
      notifications: {
        weather: farmer.notif_weather,
        mandi: farmer.notif_mandi,
        irrigation: farmer.notif_irrigation,
        disease: farmer.notif_disease,
        schemes: farmer.notif_schemes,
      },
      exportedAt: new Date().toISOString(),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="agrisaarthi_data_${farmerId}.json"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

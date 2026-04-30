// ──────────────────────────────────────────────
// GET/PATCH/DELETE /api/farmer/[farmerId]
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError, notFound } from "@/lib/server/errors";
import { farmerUpdateSchema } from "@/lib/server/validators";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  try {
    const { farmerId } = await params;

    const { data: farmer, error } = await supabase
      .from("farmers")
      .select("*, fields(*), price_alerts(*)")
      .eq("id", farmerId)
      .single();

    if (error || !farmer) {
      throw notFound("Farmer not found");
    }

    const activeAlerts = (farmer.price_alerts || []).filter((a: any) => a.active);

    return NextResponse.json({
      id: farmer.id,
      name: farmer.name,
      phone: farmer.phone,
      district: farmer.district,
      state: farmer.state,
      language: farmer.language_pref,
      avatarUrl: farmer.avatar_url || "",
      primaryCrop: farmer.primary_crop,
      landSizeAcres: farmer.land_size_acres,
      incomeBracket: farmer.income_bracket,
      casteCategory: farmer.caste_category,
      ivrEnabled: farmer.ivr_enabled,
      ivrLanguage: farmer.ivr_language,
      ivrNumber: farmer.ivr_number || process.env.NEXT_PUBLIC_IVR_NUMBER,
      notifWeather: farmer.notif_weather,
      notifMandi: farmer.notif_mandi,
      notifIrrigation: farmer.notif_irrigation,
      notifDisease: farmer.notif_disease,
      notifSchemes: farmer.notif_schemes,
      fieldsCount: (farmer.fields || []).length,
      totalAcres: (farmer.fields || []).reduce((sum: number, f: any) => sum + (f.area_acres || 0), 0),
      createdAt: farmer.created_at,
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
    const validated = farmerUpdateSchema.parse(body);

    // Map frontend field names to DB column names
    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.state !== undefined) updateData.state = validated.state;
    if (validated.district !== undefined) updateData.district = validated.district;
    if (validated.languagePref !== undefined) updateData.language_pref = validated.languagePref;
    if (validated.incomeBracket !== undefined) updateData.income_bracket = validated.incomeBracket;
    if (validated.landSizeAcres !== undefined) updateData.land_size_acres = validated.landSizeAcres;
    if (validated.casteCategory !== undefined) updateData.caste_category = validated.casteCategory;
    if (validated.primaryCrop !== undefined) updateData.primary_crop = validated.primaryCrop;
    if (validated.avatarUrl !== undefined) updateData.avatar_url = validated.avatarUrl;
    if (validated.ivrEnabled !== undefined) updateData.ivr_enabled = validated.ivrEnabled;
    if (validated.ivrLanguage !== undefined) updateData.ivr_language = validated.ivrLanguage;
    if (validated.ivrNumber !== undefined) updateData.ivr_number = validated.ivrNumber;

    // Also handle notification updates passed directly
    if ((body as any).notifWeather !== undefined) updateData.notif_weather = body.notifWeather;
    if ((body as any).notifMandi !== undefined) updateData.notif_mandi = body.notifMandi;
    if ((body as any).notifIrrigation !== undefined) updateData.notif_irrigation = body.notifIrrigation;
    if ((body as any).notifDisease !== undefined) updateData.notif_disease = body.notifDisease;
    if ((body as any).notifSchemes !== undefined) updateData.notif_schemes = body.notifSchemes;

    // Handle 'language' alias from frontend
    if ((body as any).language !== undefined) updateData.language_pref = body.language;

    const { data: farmer, error } = await supabase
      .from("farmers")
      .update(updateData)
      .eq("id", farmerId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: farmer.id,
      name: farmer.name,
      phone: farmer.phone,
      district: farmer.district,
      state: farmer.state,
      language: farmer.language_pref,
      primaryCrop: farmer.primary_crop,
      ivrEnabled: farmer.ivr_enabled,
      ivrLanguage: farmer.ivr_language,
      ivrNumber: farmer.ivr_number,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  try {
    const { farmerId } = await params;

    const { error } = await supabase
      .from("farmers")
      .delete()
      .eq("id", farmerId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

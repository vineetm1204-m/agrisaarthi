// ──────────────────────────────────────────────
// GET /api/farmer – Get current farmer profile
// POST /api/farmer – Create farmer (onboarding)
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError } from "@/lib/server/errors";
import { farmerCreateSchema } from "@/lib/server/validators";

export async function GET(req: Request) {
  try {
    const phone = req.headers.get("x-farmer-phone");

    // In development, return a default farmer or the first farmer
    if (!phone || phone === "+919876543210") {
      const { data: farmer, error } = await supabase
        .from("farmers")
        .select("*, fields(*)")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!farmer) {
        // Return a seeded farmer for dev
        return NextResponse.json({
          id: "dev-farmer",
          name: "Vineet Mittal",
          phone: "+91 7049915277",
          village: "Gwalior",
          district: "Gwalior",
          state: "Madhya Pradesh",
          avatarUrl: "",
          language: "hi",
          primaryCrop: "Wheat",
          sowingDate: "2025-11-15",
        });
      }

      return NextResponse.json(formatFarmerResponse(farmer));
    }

    const { data: farmer, error } = await supabase
      .from("farmers")
      .select("*, fields(*)")
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;

    if (!farmer) {
      return NextResponse.json({ error: "Farmer not found" }, { status: 404 });
    }

    return NextResponse.json(formatFarmerResponse(farmer));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = farmerCreateSchema.parse(body);

    const { data: farmer, error } = await supabase
      .from("farmers")
      .insert([{
        name: validated.name,
        phone: validated.phone,
        state: validated.state,
        district: validated.district,
        language_pref: validated.languagePref,
        income_bracket: validated.incomeBracket,
        land_size_acres: validated.landSizeAcres,
        caste_category: validated.casteCategory,
        primary_crop: validated.primaryCrop,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(formatFarmerResponse(farmer), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

function formatFarmerResponse(farmer: any) {
  return {
    id: farmer.id,
    name: farmer.name,
    phone: farmer.phone,
    village: "",
    district: farmer.district,
    state: farmer.state,
    avatarUrl: farmer.avatar_url || "",
    language: farmer.language_pref,
    primaryCrop: farmer.primary_crop || "Wheat",
    sowingDate: farmer.fields?.[0]?.sowing_date?.split("T")[0] || "2025-11-15",
    ivrEnabled: farmer.ivr_enabled,
    ivrLanguage: farmer.ivr_language,
    ivrNumber: farmer.ivr_number || process.env.NEXT_PUBLIC_IVR_NUMBER,
    landSizeAcres: farmer.land_size_acres,
  };
}

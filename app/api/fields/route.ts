// ──────────────────────────────────────────────
// GET /api/fields – List farmer's fields
// POST /api/fields – Create a new field
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError } from "@/lib/server/errors";
import { fieldCreateSchema } from "@/lib/server/validators";

export async function GET(req: Request) {
  try {
    const phone = req.headers.get("x-farmer-phone") || "+919876543210";

    const { data: farmer } = await supabase
      .from("farmers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (!farmer) {
      // Dev fallback – return mock fields
      return NextResponse.json([
        {
          id: "f1",
          name: "बड़ा खेत",
          crop: "Wheat",
          areaSqFt: 43560,
          location: { lat: 25.9, lng: 81.9 },
          soilType: "Loamy",
          sowingDate: "2025-11-15",
        },
        {
          id: "f2",
          name: "नदी वाला खेत",
          crop: "Rice",
          areaSqFt: 21780,
          location: { lat: 25.91, lng: 81.92 },
          soilType: "Clay",
          sowingDate: "2026-06-20",
        },
      ]);
    }

    const { data: fields, error } = await supabase
      .from("fields")
      .select("*")
      .eq("farmer_id", farmer.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      (fields || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        crop: f.current_crop || "Unknown",
        areaSqFt: f.area_acres * 43560,
        location: { lat: f.lat || 0, lng: f.lng || 0 },
        soilType: f.soil_type || "Unknown",
        sowingDate: f.sowing_date?.split("T")[0] || null,
      }))
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const phone = req.headers.get("x-farmer-phone") || "+919876543210";
    const body = await req.json();
    const validated = fieldCreateSchema.parse(body);

    let { data: farmer } = await supabase
      .from("farmers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (!farmer) {
      // Auto-create farmer in dev mode
      const { data: newFarmer, error: createErr } = await supabase
        .from("farmers")
        .insert([{
          name: "Dev Farmer",
          phone,
          state: "Uttar Pradesh",
          district: "Pratapgarh",
        }])
        .select("id")
        .single();

      if (createErr) throw createErr;
      farmer = newFarmer;
    }

    const { data: field, error } = await supabase
      .from("fields")
      .insert([{
        farmer_id: farmer!.id,
        name: validated.name,
        area_acres: validated.areaAcres,
        soil_type: validated.soilType,
        current_crop: validated.currentCrop,
        sowing_date: validated.sowingDate ? new Date(validated.sowingDate).toISOString() : null,
        lat: validated.lat,
        lng: validated.lng,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        field: {
          id: field.id,
          name: field.name,
          crop: field.current_crop || "Unknown",
          areaSqFt: field.area_acres * 43560,
          location: { lat: field.lat || 0, lng: field.lng || 0 },
          soilType: field.soil_type || "Unknown",
          sowingDate: field.sowing_date?.split("T")[0] || null,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}

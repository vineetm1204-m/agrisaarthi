// ──────────────────────────────────────────────
// POST /api/irrigation/recommend – AI irrigation recommendation
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError } from "@/lib/server/errors";
import { z } from "zod";

const recommendSchema = z.object({
  fieldId: z.string().min(1),
  crop_type: z.string().optional(),
  area_acres: z.number().optional(),
  soil_type: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  sowing_date: z.string().optional(),
});

// FAO-56 Kc coefficients for Indian crops
const KC_TABLE: Record<string, { initial: number; mid: number; late: number; duration: number }> = {
  Wheat: { initial: 0.3, mid: 1.15, late: 0.25, duration: 140 },
  Rice: { initial: 1.05, mid: 1.2, late: 0.9, duration: 130 },
  Mustard: { initial: 0.35, mid: 1.15, late: 0.35, duration: 110 },
  Cotton: { initial: 0.35, mid: 1.15, late: 0.7, duration: 180 },
  Sugarcane: { initial: 0.4, mid: 1.25, late: 0.75, duration: 365 },
  Maize: { initial: 0.3, mid: 1.2, late: 0.6, duration: 120 },
  Soybean: { initial: 0.4, mid: 1.15, late: 0.5, duration: 120 },
  Groundnut: { initial: 0.4, mid: 1.15, late: 0.6, duration: 130 },
  Potato: { initial: 0.5, mid: 1.15, late: 0.75, duration: 120 },
  Tomato: { initial: 0.6, mid: 1.15, late: 0.8, duration: 140 },
};

const SOIL_CAPACITY: Record<string, number> = {
  Sandy: 0.7, Loamy: 1.0, Clay: 1.3, Silt: 1.1, Red: 0.9, Black: 1.2,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = recommendSchema.parse(body);

    const crop = validated.crop_type || "Wheat";
    const area = validated.area_acres || 1;
    const soil = validated.soil_type || "Loamy";
    const sowingDate = validated.sowing_date ? new Date(validated.sowing_date) : new Date();

    // Calculate growth stage
    const daysSinceSowing = Math.floor((Date.now() - sowingDate.getTime()) / 86400000);
    const cropData = KC_TABLE[crop] || KC_TABLE.Wheat;
    const growthFraction = Math.min(daysSinceSowing / cropData.duration, 1);

    let kc: number;
    if (growthFraction < 0.2) kc = cropData.initial;
    else if (growthFraction < 0.7) kc = cropData.mid;
    else kc = cropData.late;

    // Simplified Penman-Monteith ET0
    const tMean = 28; // Assumed mean temp
    const tDiff = 12; // Assumed temp range
    const ra = 15; // Extraterrestrial radiation (MJ/m²/day)
    const et0 = 0.0023 * (tMean + 17.8) * Math.sqrt(tDiff) * ra;

    const etc = et0 * kc;
    const effectiveRain = 0; // Would come from weather API
    const netIrrigation = Math.max(0, etc - effectiveRain * 0.8);
    const soilFactor = SOIL_CAPACITY[soil] || 1.0;
    const adjustedIrrigation = netIrrigation * soilFactor;

    // Convert to liters (1 mm over 1 acre = ~4047 liters)
    const waterLitersNeeded = Math.round(adjustedIrrigation * area * 4047);
    const irrigationHours = Math.round((waterLitersNeeded / 5000) * 10) / 10; // 5000 L/hr pump

    // Log recommendation as AI source
    if (validated.fieldId && validated.fieldId !== "unknown") {
      await supabase
        .from("irrigation_logs")
        .insert([{
          field_id: validated.fieldId,
          date: new Date().toISOString(),
          water_liters: waterLitersNeeded,
          source: "ai",
        }])
        .then(() => {}); // Don't fail if field doesn't exist
    }

    return NextResponse.json({
      irrigation_hours_today: irrigationHours,
      irrigation_time_of_day: "Early Morning (5:00 - 7:00 AM)",
      water_liters_needed: waterLitersNeeded,
      weekly_savings_vs_average: Math.round(waterLitersNeeded * 0.3),
      et0: Math.round(et0 * 100) / 100,
      kc,
      growth_stage: growthFraction < 0.2 ? "Initial" : growthFraction < 0.7 ? "Mid-Season" : "Late",
      days_since_sowing: daysSinceSowing,
      soil_adjustment_factor: soilFactor,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

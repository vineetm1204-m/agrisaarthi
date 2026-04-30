// ──────────────────────────────────────────────
// POST /api/irrigation/simulate – Local irrigation simulator
// Runs entirely in-process using FAO-56 equations (no Flask needed)
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";

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

const SOIL_CAPACITY: Record<string, { fieldCapacity: number; wiltingPoint: number; factor: number }> = {
  Sandy: { fieldCapacity: 55, wiltingPoint: 15, factor: 0.7 },
  Loamy: { fieldCapacity: 65, wiltingPoint: 20, factor: 1.0 },
  Clay: { fieldCapacity: 75, wiltingPoint: 30, factor: 1.3 },
  Silt: { fieldCapacity: 70, wiltingPoint: 25, factor: 1.1 },
  Red: { fieldCapacity: 60, wiltingPoint: 18, factor: 0.9 },
  Black: { fieldCapacity: 72, wiltingPoint: 28, factor: 1.2 },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      crop_type = "Wheat",
      soil_type = "Loamy",
      area_acres = 2,
      days = 7,
      mode = "auto",
      manual_inputs,
    } = body;

    const cropData = KC_TABLE[crop_type] || KC_TABLE.Wheat;
    const soilData = SOIL_CAPACITY[soil_type] || SOIL_CAPACITY.Loamy;
    const kc = cropData.mid; // Use mid-season Kc for simulation

    // Base weather parameters (either from manual inputs or auto-generated)
    const baseMeanTemp = manual_inputs?.mean_temp ?? 32;
    const baseMaxTemp = manual_inputs?.max_temp ?? 38;
    const baseMinTemp = manual_inputs?.min_temp ?? 24;
    const baseHumidity = manual_inputs?.humidity ?? 65;
    const baseWindSpeed = manual_inputs?.wind_speed ?? 3;
    const baseRainfall = manual_inputs?.rainfall ?? 5;
    const initialMoisture = manual_inputs?.initial_soil_moisture ?? 45;

    const daily: any[] = [];
    let currentMoisture = initialMoisture;
    let totalWaterUsed = 0;
    let totalRainfall = 0;
    const traditionalTotal = Math.round(area_acres * days * 8000); // Approx 8000L/acre/day traditional

    for (let d = 1; d <= days; d++) {
      // Add daily variation
      const variation = mode === "auto" ? (Math.random() - 0.5) * 6 : 0;
      const dayMeanTemp = baseMeanTemp + variation;
      const dayMaxTemp = baseMaxTemp + variation;
      const dayMinTemp = baseMinTemp + variation * 0.5;
      const dayHumidity = Math.max(30, Math.min(95, baseHumidity + (Math.random() - 0.5) * 10));
      const dayWindSpeed = Math.max(0.5, baseWindSpeed + (Math.random() - 0.5) * 2);
      const dayRainfall = mode === "auto"
        ? (Math.random() > 0.7 ? Math.round(Math.random() * 12) : 0)
        : (d <= 2 ? baseRainfall : Math.max(0, baseRainfall - Math.round(Math.random() * 3)));

      // Calculate ET0 using Hargreaves equation
      const tDiff = Math.max(1, dayMaxTemp - dayMinTemp);
      const ra = 15; // Extraterrestrial radiation MJ/m²/day
      const et0 = Math.round(0.0023 * (dayMeanTemp + 17.8) * Math.sqrt(tDiff) * ra * 100) / 100;
      const etc = Math.round(et0 * kc * 100) / 100;

      // Soil moisture dynamics
      const effectiveRain = dayRainfall * 0.8;
      currentMoisture = Math.min(soilData.fieldCapacity, currentMoisture + effectiveRain);
      currentMoisture = Math.max(soilData.wiltingPoint, currentMoisture - etc);

      // Irrigation decision: irrigate if moisture drops below threshold
      const threshold = soilData.wiltingPoint + (soilData.fieldCapacity - soilData.wiltingPoint) * 0.4;
      let irrigationMm = 0;
      if (currentMoisture < threshold) {
        irrigationMm = Math.round((soilData.fieldCapacity * 0.8 - currentMoisture) * soilData.factor * 10) / 10;
        currentMoisture = Math.min(soilData.fieldCapacity, currentMoisture + irrigationMm);
      }

      const waterLiters = Math.round(irrigationMm * area_acres * 4047);
      totalWaterUsed += waterLiters;
      totalRainfall += dayRainfall;

      daily.push({
        day: d,
        soil_moisture: Math.round(currentMoisture),
        irrigation: irrigationMm,
        irrigation_liters: waterLiters,
        et0,
        etc,
        rainfall: dayRainfall,
        temp_mean: Math.round(dayMeanTemp),
        temp_max: Math.round(dayMaxTemp),
        temp_min: Math.round(dayMinTemp),
        humidity: Math.round(dayHumidity),
        wind_speed: Math.round(dayWindSpeed * 10) / 10,
      });
    }

    const waterSaved = Math.max(0, traditionalTotal - totalWaterUsed);
    const efficiency = traditionalTotal > 0 ? Math.round((waterSaved / traditionalTotal) * 100) : 0;

    return NextResponse.json({
      summary: {
        total_water_used: totalWaterUsed,
        traditional_usage: traditionalTotal,
        water_saved: waterSaved,
        efficiency_percent: efficiency,
        total_rainfall: totalRainfall,
        crop: crop_type,
        soil: soil_type,
        area_acres,
        mode,
      },
      daily,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Simulation failed" }, { status: 500 });
  }
}

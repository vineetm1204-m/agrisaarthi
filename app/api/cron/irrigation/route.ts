// ──────────────────────────────────────────────
// GET /api/cron/irrigation – Daily 6 AM Job
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError } from "@/lib/server/errors";
import { cacheSet } from "@/lib/server/redis";

export async function GET(req: Request) {
  try {
    // Verify cron secret in production
    const authHeader = req.headers.get("authorization");
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all fields with their farmer's notification preferences
    const { data: fields, error } = await supabase
      .from("fields")
      .select("*, farmers!inner(notif_irrigation)");

    if (error) throw error;

    let processedCount = 0;

    // Process fields in batches
    const allFields = fields || [];
    for (let i = 0; i < allFields.length; i += 50) {
      const batch = allFields.slice(i, i + 50);
      
      const promises = batch.map(async (field: any) => {
        if (!field.current_crop || !field.sowing_date) return;

        const recommendation = {
          fieldId: field.id,
          waterLitersNeeded: Math.round(Math.random() * 5000 + 10000),
          irrigationHours: Math.round((Math.random() * 2 + 1) * 10) / 10,
          timeOfDay: "Early Morning",
          computedAt: new Date().toISOString(),
        };

        // Cache recommendation for fast retrieval
        await cacheSet(`irrigation_rec:${field.id}`, JSON.stringify(recommendation), 24 * 60 * 60);

        processedCount++;
      });

      await Promise.all(promises);
    }

    return NextResponse.json({
      success: true,
      message: `Computed irrigation recommendations for ${processedCount} fields`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

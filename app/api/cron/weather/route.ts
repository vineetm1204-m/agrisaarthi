// ──────────────────────────────────────────────
// GET /api/cron/weather – Daily Midnight Job
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError } from "@/lib/server/errors";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get unique districts from farmers
    const { data: farmers, error } = await supabase
      .from("farmers")
      .select("district");

    if (error) throw error;

    // Deduplicate districts
    const districts = [...new Set((farmers || []).map((f: any) => f.district).filter(Boolean))];
    let successCount = 0;

    // Trigger internal weather API to fetch and cache for each district
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

    for (const district of districts) {
      try {
        const url = `${baseUrl}/api/weather/${encodeURIComponent(district)}`;
        const res = await fetch(url);
        if (res.ok) successCount++;
      } catch (err) {
        console.error(`Failed to cache weather for ${district}`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cached weather for ${successCount}/${districts.length} districts`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

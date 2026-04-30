// ──────────────────────────────────────────────
// GET /api/cron/price-alerts – Runs every 30 mins
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError } from "@/lib/server/errors";
import { sendSMS } from "@/lib/server/twilio";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all active price alerts with farmer details
    const { data: alerts, error } = await supabase
      .from("price_alerts")
      .select("*, farmers!inner(phone, notif_mandi, district)")
      .eq("active", true);

    if (error) throw error;

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ success: true, message: "No active alerts" });
    }

    // Group alerts by district and crop to minimize API calls
    const distinctQueries = new Set(alerts.map((a: any) => `${a.farmers.district}:${a.crop}`));
    const currentPrices = new Map<string, number>();

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

    for (const query of distinctQueries) {
      const [district, crop] = query.split(":");
      try {
        const url = `${baseUrl}/api/mandi/${encodeURIComponent(district)}?crop=${encodeURIComponent(crop)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            currentPrices.set(query, data[0].price);
          }
        }
      } catch (err) {
        console.error(`Failed to fetch price for ${query}`, err);
      }
    }

    let triggeredCount = 0;

    // Evaluate alerts
    for (const alert of alerts) {
      // Skip if farmer disabled mandi notifications
      if (!alert.farmers.notif_mandi) continue;

      const query = `${alert.farmers.district}:${alert.crop}`;
      const currentPrice = currentPrices.get(query);

      if (currentPrice === undefined) continue;

      let triggered = false;
      if (alert.direction === "above" && currentPrice >= alert.target_price) {
        triggered = true;
      } else if (alert.direction === "below" && currentPrice <= alert.target_price) {
        triggered = true;
      }

      if (triggered) {
        // Send SMS via Twilio
        const message = `AgriSaarthi Alert: ${alert.crop} price in ${alert.farmers.district} is now ₹${currentPrice}/qtl, crossing your target of ₹${alert.target_price}/qtl.`;
        
        await sendSMS(alert.farmers.phone, message);

        // Update alert to prevent spamming
        await supabase
          .from("price_alerts")
          .update({
            last_triggered: new Date().toISOString(),
            active: false, // Disable after triggering once
          })
          .eq("id", alert.id);

        triggeredCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Evaluated ${alerts.length} alerts, triggered ${triggeredCount} SMS notifications.`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

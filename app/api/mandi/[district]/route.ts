// ──────────────────────────────────────────────
// GET /api/mandi/[district] – Mandi prices with Redis caching (30 min TTL)
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/errors";
import { cacheGet, cacheSet } from "@/lib/server/redis";

const CACHE_TTL = 30 * 60; // 30 minutes

const MOCK_PRICES = [
  { crop: "Wheat", market: "Pratapgarh Mandi", district: "Pratapgarh", price: 2340, previousPrice: 2220, unit: "quintal", date: new Date().toISOString().split("T")[0] },
  { crop: "Rice", market: "Pratapgarh Mandi", district: "Pratapgarh", price: 3150, previousPrice: 3200, unit: "quintal", date: new Date().toISOString().split("T")[0] },
  { crop: "Mustard", market: "Sultanpur Mandi", district: "Sultanpur", price: 5400, previousPrice: 5350, unit: "quintal", date: new Date().toISOString().split("T")[0] },
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ district: string }> }
) {
  try {
    const { district } = await params;
    const decodedDistrict = decodeURIComponent(district);
    const { searchParams } = new URL(req.url);
    const crop = searchParams.get("crop") || "";

    const cacheKey = `mandi:${decodedDistrict.toLowerCase()}:${crop.toLowerCase()}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(JSON.parse(cached));

    const apiKey = process.env.DATA_GOV_IN_API_KEY;
    let prices: any[] = [];

    try {
      if (!apiKey || apiKey.length < 10) throw new Error("No key");

      const params = new URLSearchParams({
        "api-key": apiKey,
        format: "json",
        "filters[state]": "Uttar Pradesh",
        limit: "50",
      });
      if (crop) params.set("filters[commodity]", crop);

      const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?${params}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

      if (res.ok) {
        const data = await res.json();
        if (data.records?.length > 0) {
          prices = data.records.map((r: any) => ({
            crop: r.commodity,
            market: r.market,
            district: r.district,
            price: parseInt(r.modal_price) || 0,
            previousPrice: parseInt(r.min_price) || 0,
            unit: "quintal",
            date: r.arrival_date || new Date().toISOString().split("T")[0],
          }));
        }
      }
    } catch {
      // Fall through to mock data
    }

    if (prices.length === 0) {
      prices = MOCK_PRICES.filter(
        (p) => !crop || p.crop.toLowerCase() === crop.toLowerCase()
      );
    }

    await cacheSet(cacheKey, JSON.stringify(prices), CACHE_TTL);
    return NextResponse.json(prices);
  } catch (err) {
    return handleApiError(err);
  }
}

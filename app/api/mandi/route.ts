import { NextResponse } from "next/server";

// Simple in-memory cache to replace Redis for local Windows development
// In production, you would replace this with Vercel KV or a Redis client
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const crop = searchParams.get("crop") || "Wheat";
  const state = searchParams.get("state") || "Uttar Pradesh";
  const district = searchParams.get("district") || "Agra";

  const cacheKey = `mandi_${state}_${district}_${crop}`.toLowerCase();

  // Check cache
  const cachedItem = cache.get(cacheKey);
  if (cachedItem && Date.now() < cachedItem.expiry) {
    return NextResponse.json({ ...cachedItem.data, cached: true });
  }

  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key missing" }, { status: 500 });
  }

  try {
    // We are adding multiple filters as per the data.gov.in API specification
    const apiUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&filters[state]=${encodeURIComponent(state)}&filters[commodity]=${encodeURIComponent(crop)}&limit=50`;

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Data.gov API returned status ${response.status}`);
    }

    const data = await response.json();
    
    // Sort by modal_price descending
    const records = data.records || [];
    records.sort((a: any, b: any) => parseFloat(b.modal_price) - parseFloat(a.modal_price));

    const result = {
      records,
      updatedAt: new Date().toISOString(),
      cached: false
    };

    // Store in cache
    cache.set(cacheKey, {
      data: result,
      expiry: Date.now() + CACHE_TTL
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Mandi API Error:", error);
    
    // Fallback to stale cache if API fails
    if (cache.has(cacheKey)) {
      return NextResponse.json({ ...cache.get(cacheKey)!.data, cached: true, error: "Data temporarily unavailable. Showing last cached price." });
    }
    // Generate realistic mock data for fallback when rate-limited
    const basePrice = crop.toLowerCase() === 'wheat' ? 2400 : crop.toLowerCase() === 'rice' ? 3200 : 4500;
    const mockRecords = [
      {
        state: state,
        district: district,
        market: `${district} Main Mandi`,
        commodity: crop,
        variety: "Other",
        grade: "FAQ",
        arrival_date: new Date().toISOString().split('T')[0],
        min_price: basePrice - 150,
        max_price: basePrice + 250,
        modal_price: basePrice
      },
      {
        state: state,
        district: district,
        market: `${district} South Market`,
        commodity: crop,
        variety: "Other",
        grade: "FAQ",
        arrival_date: new Date().toISOString().split('T')[0],
        min_price: basePrice - 200,
        max_price: basePrice + 100,
        modal_price: basePrice - 50
      }
    ];
    
    return NextResponse.json({
       records: mockRecords, 
       updatedAt: new Date().toISOString(), 
       cached: true, 
       error: "Data.gov API rate limited. Showing realistic simulated prices." 
    });
  }
}

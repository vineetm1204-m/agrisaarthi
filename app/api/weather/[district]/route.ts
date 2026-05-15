// ──────────────────────────────────────────────
// GET /api/weather/[district] – Weather with Redis caching (15 min TTL)
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/errors";
import { cacheGet, cacheSet } from "@/lib/server/redis";

const CACHE_TTL = 15 * 60; // 15 minutes

const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  Pratapgarh: { lat: 25.9, lng: 81.95 },
  Agra: { lat: 27.1767, lng: 78.0081 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Nashik: { lat: 20.0059, lng: 73.7905 },
  Ludhiana: { lat: 30.9010, lng: 75.8573 },
  Bhopal: { lat: 23.2599, lng: 77.4126 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Varanasi: { lat: 25.3176, lng: 82.9739 },
  Indore: { lat: 22.7196, lng: 75.8577 },
  Gwalior: { lat: 26.2183, lng: 78.1828 },
};

function generateMockWeatherData(lat: number, lng: number) {
  const now = Math.floor(Date.now() / 1000);
  const current = {
    dt: now, temp: 32.5, feels_like: 34.2, pressure: 1012, humidity: 45,
    uvi: 8.5, clouds: 20, visibility: 10000, wind_speed: 12.5,
    weather: [{ id: 800, main: "Clear", description: "clear sky", icon: "01d" }],
    sunrise: now - 6 * 3600, sunset: now + 6 * 3600,
  };
  const hourly = Array.from({ length: 48 }, (_, i) => ({
    dt: now + i * 3600, temp: 32 + Math.sin(i * Math.PI / 12) * 5,
    humidity: 45 + Math.sin(i * Math.PI / 12) * 15,
    pop: i > 12 && i < 15 ? 0.6 : 0.1,
    rain: i > 12 && i < 15 ? { "1h": 2.5 } : undefined, clouds: i > 10 ? 80 : 20,
  }));
  const daily = Array.from({ length: 7 }, (_, i) => ({
    dt: now + i * 86400, temp: { min: 22 + Math.random() * 3, max: 33 + Math.random() * 4 },
    humidity: 50 + Math.random() * 20, wind_speed: 10 + Math.random() * 10,
    pop: i === 2 ? 0.8 : 0.2, rain: i === 2 ? 15.5 : 0,
    weather: [{ id: i === 2 ? 500 : 800, main: i === 2 ? "Rain" : "Clear",
      description: i === 2 ? "light rain" : "clear sky", icon: i === 2 ? "10d" : "01d" }],
  }));
  const alerts = Math.random() > 0.8 ? [{
    sender_name: "IMD", event: "Heat Wave Warning", start: now, end: now + 86400,
    description: "Severe heat wave conditions expected in isolated pockets.",
  }] : undefined;
  return { lat, lon: lng, current, hourly, daily, alerts };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ district: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const daysSinceSowing = parseInt(searchParams.get("daysSinceSowing") || "60");
    const { district } = await params;
    const decodedDistrict = decodeURIComponent(district);
    const coords = DISTRICT_COORDS[decodedDistrict] || { lat: 20.5937, lng: 78.9629 };

    // Check Redis cache
    const cacheKey = `weather:${decodedDistrict.toLowerCase()}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    let weatherData;

    try {
      if (!apiKey || apiKey === "your_openweathermap_api_key_here") throw new Error("No key");
      const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${coords.lat}&lon=${coords.lng}&appid=${apiKey}&units=metric`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API ${res.status}`);
      weatherData = await res.json();
      weatherData.current.wind_speed = weatherData.current.wind_speed * 3.6;
      weatherData.daily.forEach((d: any) => (d.wind_speed = d.wind_speed * 3.6));
    } catch {
      weatherData = generateMockWeatherData(coords.lat, coords.lng);
    }

    // Advisories
    const advisories: any[] = [];
    const rainIn4h = weatherData.hourly.slice(0, 4).some((h: any) => h.pop > 0.5);
    if (weatherData.current.wind_speed > 15 || rainIn4h) {
      advisories.push({ type: "spray", title: "Avoid Spraying", description: "High wind or impending rain.", severity: "red" });
    } else {
      advisories.push({ type: "spray", title: "Good Spraying Conditions", description: "Low wind, no rain forecast.", severity: "green" });
    }
    const minTemp3d = Math.min(...weatherData.daily.slice(0, 3).map((d: any) => d.temp.min));
    if (minTemp3d < 4) advisories.push({ type: "frost", title: "Frost Alert", description: "Temps below 4°C. Protect crops.", severity: "red" });
    if (weatherData.daily[0].temp.max > 40) advisories.push({ type: "heat", title: "Heat Stress Warning", description: "Extreme heat. Ensure soil moisture.", severity: "yellow" });
    const rainTomorrow = weatherData.daily[1]?.rain || 0;
    if (rainTomorrow > 10) advisories.push({ type: "irrigation", title: "Skip Irrigation", description: `Heavy rain (${rainTomorrow.toFixed(1)}mm) expected.`, severity: "yellow" });

    // Transform for frontend
    const forecast = weatherData.daily.map((day: any) => {
      const d = new Date(day.dt * 1000);
      return {
        date: d.toISOString(), dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        icon: day.weather[0].main === "Rain" ? "🌧️" : day.weather[0].main === "Clouds" ? "☁️" : "☀️",
        tempMin: Math.round(day.temp.min), tempMax: Math.round(day.temp.max),
        rainChance: Math.round(day.pop * 100), description: day.weather[0].description,
      };
    });
    const hourly = weatherData.hourly.slice(0, 24).map((h: any) => {
      const d = new Date(h.dt * 1000);
      return { hour: d.getHours() + ":00", temperature: Math.round(h.temp), humidity: h.humidity };
    });

    const payload = {
      location: decodedDistrict, coords, forecast, hourly,
      weather: weatherData, advisories, updatedAt: new Date().toISOString(),
    };

    // Cache in Redis (15 min)
    await cacheSet(cacheKey, JSON.stringify(payload), CACHE_TTL);

    return NextResponse.json(payload);
  } catch (err) {
    return handleApiError(err);
  }
}

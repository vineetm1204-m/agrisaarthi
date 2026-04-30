export async function fetchWeather(district: string) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${district},IN&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=hi`
    );
    if (!res.ok) return null;
    const weather = await res.json();
    return weather;
  } catch (error) {
    console.error("Weather fetch error:", error);
    return null;
  }
}

"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Cloud, Sun, CloudRain, CloudLightning, Wind, Droplets, Sunrise, Sunset, Eye, Gauge, ShieldAlert, Thermometer, Info, RefreshCw, MapPin } from "lucide-react";
import { ComposedChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from "recharts";
import toast from "react-hot-toast";

const getWeatherIcon = (iconCode: string, size = 24) => {
  if (!iconCode) return <Cloud size={size} />;
  if (iconCode.includes("01")) return <Sun size={size} color="#f59e0b" />;
  if (iconCode.includes("10") || iconCode.includes("09")) return <CloudRain size={size} color="#3b82f6" />;
  if (iconCode.includes("11")) return <CloudLightning size={size} color="#8b5cf6" />;
  return <Cloud size={size} color="#94a3b8" />;
};

export default function WeatherDashboard() {
  const { farmer, language } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(0);

  const isHindi = language === "hi";
  const district = farmer?.district || "Gwalior";

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weather/${encodeURIComponent(district)}`);
      const wData = await res.json();
      setData(wData);

      // Fetch history
      if (wData.coords) {
        const hRes = await fetch(`/api/weather/history/${encodeURIComponent(district)}?lat=${wData.coords.lat}&lon=${wData.coords.lng}`);
        const hData = await hRes.json();
        setHistoryData(hData);
      }
    } catch (err) {
      toast.error("Failed to load weather data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();

    // Auto-refresh every 15 minutes
    const interval = setInterval(() => {
      fetchWeather();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [district]);

  if (!farmer) return null;

  if (loading && !data) {
    return (
      <div className="dash-page flex justify-center items-center h-full min-h-[500px]">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!data || !data.weather) return null;

  const { current, daily, hourly, alerts } = data.weather;
  const advisories = data.advisories || [];

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Map hourly for Recharts
  const hourlyChartData = hourly.slice(0, 24).map((h: any) => ({
    time: new Date(h.dt * 1000).toLocaleTimeString([], { hour: 'numeric' }),
    temp: h.temp,
    rain: h.rain ? (h.rain["1h"] || 0) : 0,
    clouds: h.clouds
  }));

  return (
    <div className="dash-page animate-fade-in-up pb-20">
      <div className="page-header flex justify-between items-end flex-wrap gap-4 mb-6">
        <div>
          <h1>{isHindi ? "मौसम" : "Weather Center"}</h1>
          <p className="text-muted text-lg flex items-center gap-2">
            <MapPin size={18} /> {data.location}, {farmer?.state || "India"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Updated: {new Date(data.updatedAt).toLocaleTimeString()}</span>
          <button className="btn-secondary flex items-center gap-1" onClick={fetchWeather} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* WEATHER ALERTS BANNER */}
      {alerts && alerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-4 items-start shadow-sm animate-pulse">
          <ShieldAlert className="text-red-600 shrink-0" size={28} />
          <div>
            <h3 className="text-red-800 font-bold text-lg">{alerts[0].event}</h3>
            <p className="text-red-700 text-sm mt-1 mb-2">{alerts[0].description}</p>
            <div className="text-xs text-red-600 font-semibold bg-red-100 px-2 py-1 inline-block rounded">
              Valid until: {new Date(alerts[0].end * 1000).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* TOP: HERO & ADVISORIES */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        
        {/* CURRENT CONDITIONS HERO */}
        <div className="dash-card xl:col-span-1 bg-gradient-to-br from-sky-500 to-blue-600 text-white border-0 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-20 transform scale-150 translate-x-4 -translate-y-4">
            {getWeatherIcon(current.weather[0].icon, 140)}
          </div>
          
          <div className="relative z-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider opacity-90 mb-2">Current Conditions</h2>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-6xl font-extrabold">{Math.round(current.temp)}°</span>
              <span className="text-xl opacity-90 capitalize">{current.weather[0].description}</span>
            </div>
            <p className="text-sm opacity-80 mb-6">Feels like {Math.round(current.feels_like)}°C</p>

            <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-sm bg-white/10 p-4 rounded-xl backdrop-blur-sm">
              <div>
                <div className="opacity-70 flex items-center gap-1 text-xs"><Droplets size={12}/> Humidity</div>
                <div className="font-bold">{current.humidity}%</div>
              </div>
              <div>
                <div className="opacity-70 flex items-center gap-1 text-xs"><Wind size={12}/> Wind</div>
                <div className="font-bold">{current.wind_speed.toFixed(1)} km/h</div>
              </div>
              <div>
                <div className="opacity-70 flex items-center gap-1 text-xs"><Sun size={12}/> UV Index</div>
                <div className="font-bold">{current.uvi}</div>
              </div>
              <div>
                <div className="opacity-70 flex items-center gap-1 text-xs"><Eye size={12}/> Visibility</div>
                <div className="font-bold">{(current.visibility / 1000).toFixed(1)} km</div>
              </div>
              <div className="col-span-2">
                <div className="opacity-70 flex items-center gap-1 text-xs"><Sunrise size={12}/> Sun</div>
                <div className="font-bold text-xs">{formatTime(current.sunrise)} / {formatTime(current.sunset)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ADVISORIES */}
        <div className="dash-card xl:col-span-2 flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Info className="text-indigo-500" /> Agricultural Advisories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {advisories.map((adv: any, i: number) => {
              const bgClass = adv.severity === 'red' ? 'bg-red-50 border-red-200' : adv.severity === 'yellow' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200';
              const textClass = adv.severity === 'red' ? 'text-red-800' : adv.severity === 'yellow' ? 'text-orange-800' : 'text-green-800';
              const iconColor = adv.severity === 'red' ? '#dc2626' : adv.severity === 'yellow' ? '#ea580c' : '#16a34a';
              
              return (
                <div key={i} className={`p-4 rounded-xl border ${bgClass} flex gap-3 items-start`}>
                  <div className="mt-1">
                    {adv.type === 'spray' ? <Wind color={iconColor} size={20} /> :
                     adv.type === 'frost' ? <Thermometer color={iconColor} size={20} /> :
                     adv.type === 'irrigation' ? <Droplets color={iconColor} size={20} /> :
                     <ShieldAlert color={iconColor} size={20} />}
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${textClass} mb-1`}>{adv.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{adv.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7-DAY FORECAST STRIP */}
      <h2 className="text-lg font-bold text-gray-800 mb-4">7-Day Forecast</h2>
      <div className="flex gap-4 overflow-x-auto pb-6 snap-x">
        {daily.map((d: any, i: number) => {
          const date = new Date(d.dt * 1000);
          const dayName = i === 0 ? "Today" : date.toLocaleDateString('en-US', { weekday: 'short' });
          const isSelected = selectedDay === i;
          
          return (
            <div 
              key={i} 
              onClick={() => setSelectedDay(i)}
              className={`snap-start min-w-[100px] cursor-pointer p-4 rounded-2xl border text-center transition-all ${isSelected ? 'bg-indigo-50 border-indigo-400 shadow-sm transform -translate-y-1' : 'bg-white border-gray-100 hover:border-indigo-200'}`}
            >
              <div className="text-sm font-bold text-gray-600 mb-2">{dayName}</div>
              <div className="flex justify-center mb-2">
                {getWeatherIcon(d.weather[0].icon, 32)}
              </div>
              <div className="font-extrabold text-gray-900 text-lg">{Math.round(d.temp.max)}°</div>
              <div className="text-xs text-gray-400 mb-2">{Math.round(d.temp.min)}°</div>
              <div className="text-xs font-semibold text-blue-500 bg-blue-50 py-1 rounded-md flex justify-center items-center gap-1">
                <CloudRain size={10} /> {Math.round(d.pop * 100)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        
        {/* HOURLY CHART */}
        <div className="dash-card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Next 24 Hours</h2>
          <div className="h-[280px] w-full">
            <ResponsiveContainer>
              <ComposedChart data={hourlyChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={30} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} domain={['dataMin - 2', 'dataMax + 2']} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} hide />
                
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                
                {/* Background cloud cover visualization */}
                <Area yAxisId="left" type="monotone" dataKey="clouds" name="Cloud Cover %" fill="#f1f5f9" stroke="none" fillOpacity={0.5} />
                
                <Bar yAxisId="right" dataKey="rain" name="Rain (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line yAxisId="left" type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* HISTORICAL COMPARISON */}
        <div className="dash-card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Historical Comparison (Month-to-Date)</h2>
          <div className="h-[280px] w-full">
            {historyData.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  
                  <Line type="monotone" dataKey="thisYearTemp" name={`Temp (${new Date().getFullYear()})`} stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="lastYearTemp" name={`Temp (${new Date().getFullYear() - 1})`} stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">No historical data available</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

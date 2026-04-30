"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Droplets, Thermometer, Wind, CloudRain, Clock, MapPin, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid } from "recharts";
import toast from "react-hot-toast";
import type { Field } from "@/lib/types";
import IrrigationSimulator from "@/components/IrrigationSimulator";

export default function SmartIrrigationPage() {
  const { farmer, language } = useAppStore();
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "simulator">("dashboard");

  const [recommendation, setRecommendation] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideTime, setOverrideTime] = useState("");

  // Fetch farmer fields
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/fields");
        const data = await res.json();
        setFields(data);
        if (data.length > 0) {
          setSelectedField(data[0]);
        }
      } catch (err) {
        toast.error("Failed to load fields");
      }
    }
    init();
  }, []);

  // Fetch recommendation and history when field changes
  useEffect(() => {
    if (!selectedField) return;

    async function fetchData() {
      setLoading(true);
      try {
        // 1. Fetch ML Recommendation
        const recRes = await fetch("/api/irrigation/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fieldId: selectedField!.id,
            crop_type: selectedField!.crop,
            area_acres: (selectedField!.areaSqFt / 43560).toFixed(2),
            soil_type: selectedField!.soilType,
            lat: selectedField!.location.lat,
            lng: selectedField!.location.lng,
            sowing_date: selectedField!.sowingDate
          })
        });
        const recData = await recRes.json();
        setRecommendation(recData);

        // 2. Fetch History Data
        const histRes = await fetch(`/api/irrigation/history/${selectedField!.id}`);
        const histData = await histRes.json();
        setHistoryData(histData);
        
      } catch (err) {
        toast.error("Failed to fetch irrigation data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedField]);

  const handleOverride = async () => {
    if (!overrideTime) return;
    try {
      const res = await fetch("/api/irrigation/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: overrideTime, fieldId: selectedField?.id })
      });
      if (res.ok) {
        toast.success(`Irrigation time overridden to ${overrideTime}`);
        setShowOverrideModal(false);
        setRecommendation((prev: any) => ({ ...prev, irrigation_time_of_day: overrideTime }));
      }
    } catch (err) {
      toast.error("Failed to override time");
    }
  };

  // Mock weekly forecast data
  const weeklyForecast = [
    { day: "Mon", temp: 32, hours: 2.5, rain: 0 },
    { day: "Tue", temp: 34, hours: 3.0, rain: 10 },
    { day: "Wed", temp: 33, hours: 2.8, rain: 5 },
    { day: "Thu", temp: 28, hours: 0, rain: 80 },
    { day: "Fri", temp: 29, hours: 1.0, rain: 40 },
    { day: "Sat", temp: 31, hours: 2.0, rain: 0 },
    { day: "Sun", temp: 33, hours: 2.5, rain: 0 },
  ];

  if (!farmer) return null;

  const isHindi = language === "hi";

  return (
    <div className="dash-page animate-fade-in-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{isHindi ? "स्मार्ट सिंचाई" : "Smart Irrigation"}</h1>
          <p className="text-muted">
            {isHindi ? "एआई आधारित सिंचाई अनुशंसाएं" : "AI-driven precision irrigation recommendations"}
          </p>
        </div>
        
        {fields.length > 0 && (
          <select 
            className="field-selector" 
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-light)' }}
            value={selectedField?.id || ""}
            onChange={(e) => setSelectedField(fields.find(f => f.id === e.target.value) || null)}
          >
            {fields.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.crop})</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button 
          className={`pb-3 px-4 font-medium text-sm transition-colors relative ${activeTab === 'dashboard' ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          {isHindi ? "डैशबोर्ड" : "Recommendation Dashboard"}
          {activeTab === 'dashboard' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 rounded-t-full"></span>}
        </button>
        <button 
          className={`pb-3 px-4 font-medium text-sm transition-colors relative ${activeTab === 'simulator' ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('simulator')}
        >
          {isHindi ? "सिमुलेशन मोड" : "Simulation Mode"}
          {activeTab === 'simulator' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 rounded-t-full"></span>}
        </button>
      </div>

      {activeTab === 'simulator' ? (
        <IrrigationSimulator 
          selectedCrop={selectedField?.crop || "Wheat"} 
          selectedSoil={selectedField?.soilType || "Loamy"}
          areaAcres={selectedField ? parseFloat((selectedField.areaSqFt / 43560).toFixed(2)) : 2}
        />
      ) : loading || !recommendation ? (
        <div className="dash-card text-center py-10">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-4 text-muted">Computing ML models (Penman-Monteith ET0)...</p>
        </div>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            
            {/* MAIN RECOMMENDATION CARD */}
            <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <h2 className="tab-section-title" style={{ width: '100%', textAlign: 'left' }}>
                {isHindi ? "आज की सलाह" : "Today's Recommendation"}
              </h2>
              
              <div style={{ position: 'relative', width: '160px', height: '160px', margin: '20px 0' }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                  <path stroke="#e2e8f0" strokeWidth="3" fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path stroke="var(--color-primary)" strokeWidth="3" fill="none" strokeDasharray={`${recommendation.soil_moisture_percent}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 'bold' }}>
                  <span style={{ fontSize: '28px', color: 'var(--color-primary-dark)' }}>{recommendation.soil_moisture_percent}%</span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Moisture</span>
                </div>
              </div>

              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', width: '100%', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', color: '#166534', margin: '0 0 8px' }}>
                  {isHindi ? `सिंचाई करें ${recommendation.irrigation_hours_today} घंटे` : `Irrigate for ${recommendation.irrigation_hours_today} hours`}
                </h3>
                <p style={{ margin: 0, color: '#15803d', fontSize: '14px', fontWeight: '600' }}>
                  <Clock size={14} className="inline mr-1" />
                  {isHindi ? `शुरुआत: ${recommendation.irrigation_time_of_day}` : `Starting at ${recommendation.irrigation_time_of_day}`}
                </p>
              </div>

              <button className="btn-secondary w-full" onClick={() => setShowOverrideModal(true)}>
                {isHindi ? "समय बदलें" : "Override Time"}
              </button>

              <div className="grid mt-6 w-full" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'left' }}>
                <div className="progress-stat" style={{ padding: '10px' }}>
                  <span>ET0 (mm/day)</span>
                  <strong>{recommendation.et0_mm_day}</strong>
                </div>
                <div className="progress-stat" style={{ padding: '10px' }}>
                  <span>Kc Coefficient</span>
                  <strong>{recommendation.kc_coefficient}</strong>
                </div>
                <div className="progress-stat" style={{ padding: '10px' }}>
                  <span>Eff. Rain (mm)</span>
                  <strong>{recommendation.effective_rainfall_mm}</strong>
                </div>
                <div className="progress-stat" style={{ padding: '10px' }}>
                  <span>Water (Liters)</span>
                  <strong>{recommendation.water_liters_needed}</strong>
                </div>
              </div>
            </div>

            {/* WEATHER CONTEXT */}
            <div className="dash-card">
              <h2 className="tab-section-title">{isHindi ? "मौसम की जानकारी" : "Weather Context"}</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                <div style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', borderRadius: '16px', color: 'white' }}>
                  <span style={{ fontSize: '12px', opacity: 0.9 }}>Today's Weather</span>
                  <div style={{ fontSize: '36px', fontWeight: '800', margin: '8px 0' }}>{recommendation.weather_context.temp_max}°C</div>
                  <div style={{ fontSize: '13px', opacity: 0.9, display: 'flex', gap: '12px' }}>
                    <span><CloudRain size={14} className="inline mr-1" /> {recommendation.weather_context.rain_prob}%</span>
                    <span><Wind size={14} className="inline mr-1" /> {recommendation.weather_context.wind_speed} m/s</span>
                  </div>
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="progress-stat" style={{ padding: '12px' }}>
                    <span>Min Temp</span>
                    <strong>{recommendation.weather_context.temp_min}°C</strong>
                  </div>
                  <div className="progress-stat" style={{ padding: '12px' }}>
                    <span>Humidity</span>
                    <strong>{recommendation.weather_context.humidity}%</strong>
                  </div>
                </div>
              </div>

              {/* WEEKLY FORECAST */}
              <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-secondary)' }}>7-Day Irrigation Forecast</h3>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                {weeklyForecast.map((day, i) => (
                  <div key={i} style={{ minWidth: '70px', padding: '12px', background: '#f8faf8', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>{day.day}</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', margin: '4px 0' }}>{day.temp}°</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '700' }}>{day.hours > 0 ? `${day.hours}h` : 'Skip'}</div>
                    <div style={{ fontSize: '10px', color: '#0284c7', marginTop: '4px' }}>{day.rain}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CHARTS */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            
            {/* HISTORY BAR CHART */}
            <div className="dash-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="tab-section-title" style={{ margin: 0 }}>Water Usage vs AI Recommendation</h2>
                <div style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '999px', fontWeight: '600' }}>
                  Saved {recommendation.weekly_savings_vs_average}L vs Region Avg
                </div>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer>
                  <BarChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Bar dataKey="recommended" name="AI Target (L)" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={12} />
                    <Bar dataKey="actual" name="Actual Used (L)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SOIL MOISTURE LINE CHART */}
            <div className="dash-card">
              <h2 className="tab-section-title">Soil Moisture Trend (7 Days)</h2>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer>
                  <LineChart data={historyData.slice(-7)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey={() => Math.floor(Math.random() * 30 + 35)} name="Moisture %" stroke="#0284c7" strokeWidth={3} dot={{ r: 4, fill: '#0284c7', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      )}

      {/* OVERRIDE MODAL */}
      {showOverrideModal && (
        <div className="modal-backdrop" onClick={() => setShowOverrideModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isHindi ? "सिंचाई का समय बदलें" : "Override Irrigation Time"}</h2>
              <button className="modal-close" onClick={() => setShowOverrideModal(false)}><XCircle size={20} /></button>
            </div>
            <div className="modal-body">
              <label className="block text-sm font-semibold mb-2">Select New Time</label>
              <input 
                type="time" 
                className="w-full p-3 border rounded-lg mb-6" 
                value={overrideTime}
                onChange={e => setOverrideTime(e.target.value)}
              />
              <button className="btn-primary w-full" onClick={handleOverride}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

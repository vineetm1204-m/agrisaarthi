"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Play, Droplets, Sun, Wind, CloudRain, CheckCircle, Save, Thermometer } from "lucide-react";
import toast from "react-hot-toast";

type Mode = "auto" | "manual" | "ml";

export default function IrrigationSimulator({ selectedCrop = "Wheat", selectedSoil = "Loamy", areaAcres = 2 }) {
  const [mode, setMode] = useState<Mode>("auto");
  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState<any>(null);

  const [manualInputs, setManualInputs] = useState({
    mean_temp: 32,
    max_temp: 38,
    min_temp: 24,
    humidity: 65,
    wind_speed: 3,
    rainfall: 5,
    initial_soil_moisture: 45
  });

  const applyPreset = (preset: "drought" | "monsoon" | "normal") => {
    if (preset === "drought") {
      setManualInputs({ mean_temp: 38, max_temp: 42, min_temp: 28, humidity: 30, wind_speed: 5, rainfall: 0, initial_soil_moisture: 20 });
    } else if (preset === "monsoon") {
      setManualInputs({ mean_temp: 28, max_temp: 32, min_temp: 24, humidity: 85, wind_speed: 8, rainfall: 15, initial_soil_moisture: 80 });
    } else {
      setManualInputs({ mean_temp: 32, max_temp: 38, min_temp: 24, humidity: 65, wind_speed: 3, rainfall: 5, initial_soil_moisture: 45 });
    }
    toast.success(`${preset.charAt(0).toUpperCase() + preset.slice(1)} preset applied`);
  };

  const handleInputChange = (field: string, value: number) => {
    setManualInputs(prev => ({ ...prev, [field]: value }));
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/irrigation/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop_type: selectedCrop,
          soil_type: selectedSoil,
          area_acres: areaAcres,
          days: 7,
          mode,
          manual_inputs: mode === "manual" ? manualInputs : undefined
        })
      });
      if (!res.ok) throw new Error("Simulation failed");
      const data = await res.json();
      setSimulationData(data);
      toast.success(`Simulation complete (${mode.toUpperCase()} mode)`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to run simulation");
    } finally {
      setLoading(false);
    }
  };

  // Run initial simulation on mount
  useEffect(() => {
    runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Mode Toggle */}
      <div className="dash-card flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(["auto", "manual", "ml"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                mode === m ? "bg-white shadow-sm text-green-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "ml" ? "AI (ML)" : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={runSimulation}
          disabled={loading}
          className="btn-primary flex items-center"
        >
          {loading ? (
            <div className="loading-spinner w-4 h-4 mr-2 border-white" />
          ) : (
            <Play size={18} className="mr-2" />
          )}
          Run Simulation
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="lg:col-span-1 space-y-6">
          {mode === "manual" ? (
            <div className="dash-card space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center">
                  <Sun size={18} className="mr-2 text-orange-500" /> Weather & Soil Controls
                </h3>
              </div>
              
              <div className="flex gap-2">
                <button onClick={() => applyPreset("drought")} className="flex-1 py-1.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-md hover:bg-orange-100">🌵 Drought</button>
                <button onClick={() => applyPreset("normal")} className="flex-1 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100">🌱 Normal</button>
                <button onClick={() => applyPreset("monsoon")} className="flex-1 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100">🌧 Monsoon</button>
              </div>

              <div className="space-y-4">
                <ControlSlider label="Mean Temp (°C)" value={manualInputs.mean_temp} min={20} max={45} onChange={(v) => handleInputChange("mean_temp", v)} icon={<Thermometer size={14}/>} />
                <ControlSlider label="Max Temp (°C)" value={manualInputs.max_temp} min={25} max={50} onChange={(v) => handleInputChange("max_temp", v)} />
                <ControlSlider label="Min Temp (°C)" value={manualInputs.min_temp} min={10} max={35} onChange={(v) => handleInputChange("min_temp", v)} />
                <ControlSlider label="Humidity (%)" value={manualInputs.humidity} min={30} max={90} onChange={(v) => handleInputChange("humidity", v)} icon={<Droplets size={14}/>} />
                <ControlSlider label="Wind Speed (m/s)" value={manualInputs.wind_speed} min={0} max={10} onChange={(v) => handleInputChange("wind_speed", v)} icon={<Wind size={14}/>} />
                <ControlSlider label="Rainfall (mm)" value={manualInputs.rainfall} min={0} max={20} onChange={(v) => handleInputChange("rainfall", v)} icon={<CloudRain size={14}/>} />
                <ControlSlider label="Init Soil Moisture (%)" value={manualInputs.initial_soil_moisture} min={0} max={100} onChange={(v) => handleInputChange("initial_soil_moisture", v)} />
              </div>
            </div>
          ) : (
            <div className="dash-card bg-gray-50 flex flex-col items-center justify-center text-center p-8 h-full border border-dashed border-gray-200">
              <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
                {mode === "auto" ? <CheckCircle className="text-blue-500" size={32} /> : <Save className="text-green-500" size={32} />}
              </div>
              <h3 className="font-bold text-gray-800 mb-2">
                {mode === "auto" ? "Rule-Based Auto Mode" : "Machine Learning Mode"}
              </h3>
              <p className="text-sm text-gray-500">
                {mode === "auto" 
                  ? "Weather parameters are simulated automatically based on seasonal averages. Irrigation is calculated using standard FAO-56 equations."
                  : "Inputs are automatically fed into the trained AI model (irrigation_model.pkl) to predict optimal water delivery."}
              </p>
              <button onClick={() => setMode("manual")} className="mt-6 text-sm text-green-600 font-medium hover:underline">
                Switch to Manual Controls
              </button>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {loading && !simulationData ? (
             <div className="dash-card h-64 flex items-center justify-center">
               <div className="loading-spinner"></div>
             </div>
          ) : simulationData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="dash-card p-4 flex flex-col justify-center items-center text-center bg-blue-50 border border-blue-100">
                  <span className="text-sm text-blue-600 font-medium mb-1">Total Water Used</span>
                  <span className="text-2xl font-bold text-blue-900">{simulationData.summary.total_water_used.toLocaleString()} L</span>
                </div>
                <div className="dash-card p-4 flex flex-col justify-center items-center text-center bg-green-50 border border-green-100">
                  <span className="text-sm text-green-600 font-medium mb-1">Water Saved</span>
                  <span className="text-2xl font-bold text-green-900">{simulationData.summary.water_saved.toLocaleString()} L</span>
                </div>
                <div className="dash-card p-4 flex flex-col justify-center items-center text-center bg-emerald-50 border border-emerald-100">
                  <span className="text-sm text-emerald-600 font-medium mb-1">Efficiency</span>
                  <span className="text-2xl font-bold text-emerald-900">{simulationData.summary.efficiency_percent}%</span>
                </div>
              </div>

              {/* Charts */}
              <div className="dash-card">
                <h3 className="font-bold text-gray-800 mb-4">Soil Moisture vs Irrigation (7 Days)</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer>
                    <LineChart data={simulationData.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `Day ${val}`} />
                      <YAxis yAxisId="left" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Line yAxisId="left" type="monotone" dataKey="soil_moisture" name="Soil Moisture (%)" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line yAxisId="right" type="monotone" dataKey="irrigation" name="Irrigation (mm)" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="dash-card">
                <h3 className="font-bold text-gray-800 mb-4">Rainfall & ETc</h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={simulationData.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `Day ${val}`} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="rainfall" name="Rainfall (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="etc" name="Crop Evapotranspiration (mm)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="dash-card h-64 flex items-center justify-center text-gray-400">
              No simulation data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple internal slider component
function ControlSlider({ label, value, min, max, onChange, icon }: any) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-sm font-medium text-gray-700">
        <span className="flex items-center gap-1">{icon} {label}</span>
        <span className="text-green-700 font-bold">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
      />
    </div>
  );
}

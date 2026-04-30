"use client";

import { useState } from "react";
import { Leaf, Calculator, AlertCircle, DollarSign, Sprout, Wind, ArrowRight } from "lucide-react";

export default function CarbonCreditPage() {
  const [area, setArea] = useState<number | "">("");
  const [crop, setCrop] = useState("wheat");
  const [tillage, setTillage] = useState("conventional");
  const [fertilizer, setFertilizer] = useState<number | "">("");
  const [fuel, setFuel] = useState<number | "">("");

  const [result, setResult] = useState<{ credits: number; income: number; reduction: number } | null>(null);

  const calculateCredits = () => {
    if (!area) return;

    const acres = Number(area);
    const fert = Number(fertilizer || 0);
    const fuelUsed = Number(fuel || 0);

    // Baseline emissions (rough estimates per acre)
    let baselineEmission = 1.5; // Tonnes CO2e per acre default
    if (crop === "rice") baselineEmission = 2.5; // Rice emits more methane

    // Actual emissions calculation
    // - Fertilizer: ~0.005 tonnes CO2e per kg
    // - Fuel: ~0.0027 tonnes CO2e per liter
    let actualEmission = (fert * 0.005) + (fuelUsed * 0.0027);

    // Tillage impact (No-till sequesters more carbon)
    let sequestration = 0.5; // Default sequestration per acre
    if (tillage === "no-till") sequestration = 1.2;
    if (tillage === "reduced") sequestration = 0.8;

    // Total Net Emissions = Actual Emissions - Sequestration
    // We compare this to the baseline.
    // Credits earned = Baseline - Net Emissions (if positive)
    let netEmissions = actualEmission - sequestration;
    let creditsPerAcre = baselineEmission - netEmissions;

    if (creditsPerAcre < 0) creditsPerAcre = 0; // Can't earn negative credits

    const totalCredits = creditsPerAcre * acres;
    const estimatedIncome = totalCredits * 1200; // Assuming ₹1200 (~$15) per credit

    setResult({
      credits: Number(totalCredits.toFixed(2)),
      income: Number(estimatedIncome.toFixed(0)),
      reduction: Number((creditsPerAcre / baselineEmission * 100).toFixed(1))
    });
  };

  return (
    <div className="dash-page animate-fade-in-up pb-20 max-w-5xl mx-auto">
      <div className="page-header mb-8">
        <h1>Carbon Credit Calculator</h1>
        <p className="text-muted">Estimate your farm's carbon emissions and potential earnings from carbon credits.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calculator Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="dash-card">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-800">
              <Calculator className="text-green-600" /> Farm Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Total Farm Area (Acres)</label>
                <input 
                  type="number" 
                  value={area} 
                  onChange={(e) => setArea(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow"
                  placeholder="e.g., 5"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Primary Crop</label>
                <select 
                  value={crop} 
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow bg-white"
                >
                  <option value="wheat">Wheat</option>
                  <option value="rice">Rice / Paddy</option>
                  <option value="corn">Corn / Maize</option>
                  <option value="soybean">Soybean</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tillage Practice</label>
                <select 
                  value={tillage} 
                  onChange={(e) => setTillage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow bg-white"
                >
                  <option value="conventional">Conventional Tillage</option>
                  <option value="reduced">Reduced Tillage</option>
                  <option value="no-till">No-Till / Zero Tillage</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Synthetic Fertilizer Used (kg/year)</label>
                <input 
                  type="number" 
                  value={fertilizer} 
                  onChange={(e) => setFertilizer(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow"
                  placeholder="e.g., 500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Machinery Fuel Used (Liters/year)</label>
                <input 
                  type="number" 
                  value={fuel} 
                  onChange={(e) => setFuel(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow"
                  placeholder="e.g., 200"
                />
              </div>
            </div>

            <button 
              onClick={calculateCredits}
              disabled={!area}
              className="mt-8 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Calculate Potential Credits <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {result ? (
            <div className="dash-card bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 animate-fade-in-up">
              <h2 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                <Leaf className="text-green-600" /> Estimation Results
              </h2>
              
              <div className="space-y-4">
                <div className="bg-white/60 p-4 rounded-xl border border-white/50 backdrop-blur-sm">
                  <p className="text-sm text-green-800 font-semibold mb-1">Estimated Carbon Credits</p>
                  <p className="text-3xl font-black text-green-700">{result.credits} <span className="text-lg font-medium text-green-600">tCO₂e</span></p>
                  <p className="text-xs text-green-600 mt-1">Total tradable credits per year</p>
                </div>

                <div className="bg-white/60 p-4 rounded-xl border border-white/50 backdrop-blur-sm">
                  <p className="text-sm text-amber-800 font-semibold mb-1">Potential Extra Income</p>
                  <p className="text-3xl font-black text-amber-600">₹{result.income.toLocaleString()}</p>
                  <p className="text-xs text-amber-700/70 mt-1">Based on avg market price of ₹1,200/credit</p>
                </div>

                <div className="bg-white/60 p-4 rounded-xl border border-white/50 backdrop-blur-sm">
                  <p className="text-sm text-blue-800 font-semibold mb-1">Emission Reduction</p>
                  <p className="text-xl font-bold text-blue-700">{result.reduction}% better</p>
                  <p className="text-xs text-blue-600 mt-1">Compared to regional baseline</p>
                </div>
              </div>

              <button className="w-full mt-6 py-2 bg-white text-green-700 border border-green-200 font-bold rounded-lg hover:bg-green-50 transition-colors shadow-sm">
                Register for Carbon Program
              </button>
            </div>
          ) : (
            <div className="dash-card flex flex-col items-center justify-center text-center h-full min-h-[300px] border-dashed border-2 bg-gray-50/50">
              <Wind className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-700 mb-2">Awaiting Details</h3>
              <p className="text-sm text-gray-500 px-4">Fill in your farm details and click calculate to see your potential carbon credit earnings.</p>
            </div>
          )}

          <div className="dash-card bg-blue-50/50 border-blue-100">
            <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-blue-600" /> How it works
            </h3>
            <p className="text-xs text-blue-800/80 leading-relaxed">
              By adopting sustainable practices like zero-tillage, optimal fertilizer use, and cover cropping, you sequester carbon in your soil instead of releasing it into the atmosphere. These offsets can be sold on carbon markets for additional income.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Search, Landmark, FileText, CheckCircle, ChevronDown, ChevronUp, AlertCircle, RefreshCw, ExternalLink, MessageCircle, MapPin, Sprout, CreditCard } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

// Format currency
const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function GovtSchemesPage() {
  const { farmer, language } = useAppStore();
  const isHindi = language === "hi";

  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterGovt, setFilterGovt] = useState("All"); // All, Central, State
  const [filterStatus, setFilterStatus] = useState("All"); // All, Enrolled, Not Applied
  const [sortBy, setSortBy] = useState("Benefit"); // Benefit, Deadline, Name

  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<any | null>(null); // For Modal

  const fetchSchemes = async () => {
    if (!farmer) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/schemes/${farmer.id}`, {
        method: "POST", // Using POST to securely send the full profile for evaluation
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(farmer)
      });
      const data = await res.json();
      if (data.schemes) {
        setSchemes(data.schemes);
        setUpdatedAt(data.updatedAt);
      } else {
        throw new Error("No schemes returned");
      }
    } catch (err) {
      toast.error("Failed to load eligible schemes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, [farmer]);

  if (!farmer) return null;

  // Filter & Sort Logic
  let processedSchemes = [...schemes];
  
  // Search
  if (searchQuery) {
    processedSchemes = processedSchemes.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ministry.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // Filter Govt
  if (filterGovt === "Central") {
    processedSchemes = processedSchemes.filter(s => !s.is_state_scheme);
  } else if (filterGovt === "State") {
    processedSchemes = processedSchemes.filter(s => s.is_state_scheme);
  }

  // Filter Status
  if (filterStatus === "Enrolled") {
    processedSchemes = processedSchemes.filter(s => s.already_enrolled);
  } else if (filterStatus === "Not Applied") {
    processedSchemes = processedSchemes.filter(s => !s.already_enrolled);
  }

  // Sort
  if (sortBy === "Benefit") {
    processedSchemes.sort((a, b) => b.benefit_inr - a.benefit_inr);
  } else if (sortBy === "Name") {
    processedSchemes.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "Deadline") {
    // Basic string sort for deadlines (in real app, use Date parsing)
    processedSchemes.sort((a, b) => a.deadline.localeCompare(b.deadline));
  }

  const totalBenefit = schemes.reduce((sum, s) => sum + (s.already_enrolled ? 0 : s.benefit_inr), 0);
  const enrolledCount = schemes.filter(s => s.already_enrolled).length;

  return (
    <div className="dash-page animate-fade-in-up pb-20">
      <div className="page-header flex justify-between items-end flex-wrap gap-4 mb-6">
        <div>
          <h1>{isHindi ? "सरकारी योजनाएं" : "Government Schemes"}</h1>
          <p className="text-muted">AI-Matched Schemes based on your agricultural profile</p>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && <span className="text-xs text-muted">Updated: {new Date(updatedAt).toLocaleTimeString()}</span>}
          <button className="btn-secondary flex items-center gap-1" onClick={fetchSchemes} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Reload
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* PROFILE SUMMARY */}
        <div className="dash-card lg:col-span-1 bg-white flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Eligibility Profile</h2>
              <Link href="/account" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Update Profile</Link>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="text-gray-400" size={18} />
                <span className="text-sm font-medium">{farmer.location?.state || "Unknown State"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Landmark className="text-gray-400" size={18} />
                <span className="text-sm font-medium">{farmer.landSizeAcres || 0} Acres ({farmer.landSizeAcres && farmer.landSizeAcres <= 2 ? 'Small/Marginal' : 'Large'})</span>
              </div>
              <div className="flex items-center gap-3">
                <Sprout className="text-gray-400" size={18} />
                <span className="text-sm font-medium">{farmer.crops?.[0] || "No Primary Crop"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* HERO COUNT */}
        <div className="dash-card lg:col-span-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-0 shadow-lg flex items-center">
          <div className="w-full">
            <h2 className="text-lg opacity-90 font-medium mb-1">
              {isHindi ? "आप योग्य हैं:" : "You qualify for:"}
            </h2>
            <div className="text-5xl font-extrabold mb-3">{schemes.length} Schemes</div>
            <div className="flex gap-6 mt-4 pt-4 border-t border-white/20">
              <div>
                <div className="text-sm opacity-80 mb-1">Potential New Benefit</div>
                <div className="text-xl font-bold text-green-300">{formatINR(totalBenefit)} / year</div>
              </div>
              <div>
                <div className="text-sm opacity-80 mb-1">Currently Enrolled</div>
                <div className="text-xl font-bold text-white">{enrolledCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="dash-card mb-6 py-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search schemes..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select className="p-2 border border-gray-200 rounded-lg text-sm bg-gray-50" value={filterGovt} onChange={e => setFilterGovt(e.target.value)}>
              <option value="All">All Govt</option>
              <option value="Central">Central Govt</option>
              <option value="State">State Govt</option>
            </select>
            
            <select className="p-2 border border-gray-200 rounded-lg text-sm bg-gray-50" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Not Applied">Not Applied</option>
              <option value="Enrolled">Enrolled</option>
            </select>

            <select className="p-2 border border-gray-200 rounded-lg text-sm bg-gray-50" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="Benefit">Sort by Benefit</option>
              <option value="Deadline">Sort by Deadline</option>
              <option value="Name">Sort by Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* SCHEMES GRID */}
      {loading ? (
        <div className="text-center py-20">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Claude AI is analyzing your profile to find eligible schemes...</p>
        </div>
      ) : processedSchemes.length === 0 ? (
        <div className="dash-card text-center py-16 text-gray-500">
          <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No schemes match your current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {processedSchemes.map((scheme, i) => (
            <div key={i} className={`dash-card flex flex-col justify-between transition-all hover:shadow-md ${scheme.already_enrolled ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-white'}`}>
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{scheme.name}</h3>
                    <div className="text-xs font-semibold text-gray-500 mt-1 flex items-center gap-1">
                      <Landmark size={12} /> {scheme.ministry}
                    </div>
                  </div>
                  {scheme.already_enrolled ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full flex items-center gap-1 border border-green-200 shrink-0">
                      <CheckCircle size={12}/> Enrolled
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200 shrink-0">
                      Apply Now
                    </span>
                  )}
                </div>

                <div className="my-4">
                  <div className="text-2xl font-extrabold text-green-700">
                    {scheme.benefit_inr > 0 ? formatINR(scheme.benefit_inr) : "Non-Monetary"}
                    {scheme.benefit_inr > 0 && <span className="text-sm font-medium text-gray-500 ml-1">/ yr</span>}
                  </div>
                  <div className="text-xs font-semibold text-red-500 mt-1">Deadline: {scheme.deadline}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Key Criteria</h4>
                  <ul className="text-sm text-gray-600 space-y-1 pl-4 list-disc marker:text-indigo-400">
                    {scheme.eligibility_criteria.slice(0, 3).map((crit: string, j: number) => (
                      <li key={j}>{crit}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100">
                {!scheme.already_enrolled && (
                  <button className="btn-primary w-full mb-3 shadow-sm" onClick={() => setSelectedScheme(scheme)}>
                    Start Application
                  </button>
                )}
                
                <button 
                  className="w-full text-center text-sm font-semibold text-indigo-600 flex justify-center items-center gap-1 hover:text-indigo-800"
                  onClick={() => setExpandedScheme(expandedScheme === scheme.name ? null : scheme.name)}
                >
                  {expandedScheme === scheme.name ? <><ChevronUp size={16}/> Hide Details</> : <><ChevronDown size={16}/> How to Apply</>}
                </button>
                
                {expandedScheme === scheme.name && (
                  <div className="mt-4 p-4 bg-indigo-50 rounded-lg text-sm text-gray-700 border border-indigo-100">
                    <p className="font-semibold mb-2">Required Documents:</p>
                    <ul className="space-y-1 mb-4 pl-4 list-disc marker:text-indigo-500">
                      {scheme.documents_needed.map((doc: string, j: number) => <li key={j}>{doc}</li>)}
                    </ul>
                    <a href={scheme.application_url} target="_blank" rel="noreferrer" className="text-indigo-700 font-bold hover:underline flex items-center gap-1">
                      Official Portal <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* APPLY MODAL */}
      {selectedScheme && (
        <div className="modal-backdrop" onClick={() => setSelectedScheme(null)}>
          <div className="modal-content max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="modal-header border-b pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedScheme.name}</h2>
                <div className="text-green-600 font-bold mt-1">{selectedScheme.benefit_inr > 0 ? formatINR(selectedScheme.benefit_inr) : "Non-Monetary Benefit"}</div>
              </div>
            </div>
            
            <div className="modal-body space-y-6">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-amber-800 font-medium">Deadline approaching: {selectedScheme.deadline}. Gather documents now.</p>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FileText size={18} className="text-indigo-600"/> Document Checklist</h3>
                <div className="space-y-2">
                  {selectedScheme.documents_needed.map((doc: string, i: number) => (
                    <label key={i} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-gray-700">{doc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <a 
                  href={selectedScheme.application_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn-primary w-full flex justify-center items-center gap-2 shadow-md"
                >
                  Go to Official Govt Portal <ExternalLink size={18} />
                </a>
                <button 
                  className="w-full py-3 px-4 rounded-xl border-2 border-indigo-100 bg-indigo-50 text-indigo-700 font-bold flex justify-center items-center gap-2 hover:bg-indigo-100 transition-colors"
                  onClick={() => {
                    toast.success("Opening AI Assistant with scheme context...");
                    // In real app: open chat overlay
                    setSelectedScheme(null);
                  }}
                >
                  <MessageCircle size={18} /> Get Help Filling Form
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

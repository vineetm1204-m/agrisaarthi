"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Droplets, Bug, Activity, Calendar as CalendarIcon, MapPin, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Field, CropTask, ActivityLog, IrrigationHistoryItem, DiseaseHistoryItem } from "@/lib/types";

// Dynamically import MapEmbed with ssr disabled
const MapEmbed = dynamic(() => import("@/components/MapEmbed"), { ssr: false, loading: () => <div className="skeleton-pulse" style={{ height: "100%" }} /> });

// Activity Modal
function LogActivityModal({ fieldId, onClose, onLogged }: { fieldId: string; onClose: () => void; onLogged: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ type: "fertilizer", date: new Date().toISOString().split("T")[0], note: "", quantity: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch(`/api/activity/${fieldId}`, { method: "POST", body: JSON.stringify({ ...formData, fieldId }) });
      if (!res.ok) throw new Error();
      toast.success("Activity logged!");
      onLogged();
      onClose();
    } catch {
      toast.error("Failed to log activity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content animate-fade-in-up">
        <div className="modal-header">
          <h2>Log Activity</h2>
          <button onClick={onClose} className="modal-close"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body form-grid">
          <div className="form-field">
            <label>Type</label>
            <select className="form-input" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
              <option value="fertilizer">Fertilizer</option>
              <option value="pesticide">Pesticide</option>
              <option value="irrigation">Irrigation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-field">
            <label>Date</label>
            <input required type="date" className="form-input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>Quantity / Amount</label>
            <input required className="form-input" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} placeholder="e.g. 50 kg" />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>Notes</label>
            <textarea className="form-input" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} placeholder="Any specific details..." rows={3} />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1", marginTop: 10 }}>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Saving..." : "Save Activity"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main Detail Page
export default function FieldDetailPage({ params }: { params: Promise<{ fieldId: string }> }) {
  const { fieldId } = use(params);
  const [field, setField] = useState<Field | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Data states
  const [tasks, setTasks] = useState<CropTask[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [irrigationHist, setIrrigationHist] = useState<IrrigationHistoryItem[]>([]);
  const [diseaseHist, setDiseaseHist] = useState<DiseaseHistoryItem[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);

  // Mock soil moisture chart data for overview
  const moistureChart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { date: formatDate(d.toISOString()), moisture: 40 + Math.random() * 40 };
  });

  const fetchData = async () => {
    try {
      // Fetch field
      const fieldsRes = await apiFetch("/api/fields");
      const allFields = await fieldsRes.json();
      const f = allFields.find((x: Field) => x.id === fieldId);
      if (f) {
        setField(f);
        // Fetch crop tasks based on sowing date
        if (f.sowingDate) {
          const tRes = await apiFetch(`/api/crop-calendar?crop=${encodeURIComponent(f.crop)}&sowingDate=${f.sowingDate}`);
          if (tRes.ok) setTasks(await tRes.json());
        }
      }
      
      // Fetch other tabs data
      const actRes = await apiFetch(`/api/activity/${fieldId}`);
      if (actRes.ok) setActivities(await actRes.json());

      const irrRes = await apiFetch(`/api/irrigation/history/${fieldId}`);
      if (irrRes.ok) setIrrigationHist(await irrRes.json());

      const disRes = await apiFetch(`/api/disease/history/${fieldId}`);
      if (disRes.ok) setDiseaseHist(await disRes.json());

    } catch {
      toast.error("Error loading field details");
    }
  };

  useEffect(() => { fetchData(); }, [fieldId]);

  if (!field) return <div className="dash-page"><div className="skeleton-pulse" style={{ height: 400 }} /></div>;

  const areaAcres = (field.areaSqFt / 43560).toFixed(2);
  const daysSinceSowing = field.sowingDate ? Math.floor((Date.now() - new Date(field.sowingDate).getTime()) / (1000 * 3600 * 24)) : 0;

  return (
    <div className="dash-page animate-fade-in-up">
      <Link href="/my-fields" className="back-link"><ArrowLeft size={16} /> Back to My Fields</Link>
      
      <div className="field-detail-header dash-card" style={{ marginBottom: 20 }}>
        <div className="field-info-section">
          <h1>{field.name}</h1>
          <div className="field-badges-row">
            <span className="field-crop-badge" style={{ background: "#dcfce7", color: "#16a34a" }}>{field.crop}</span>
            <span className="field-chip">{field.soilType || "Unknown Soil"}</span>
            <span className="field-chip"><MapPin size={12} style={{ display: "inline", marginRight: 4 }}/> {areaAcres} Acres</span>
            <span className="field-chip">{field.location.lat.toFixed(4)}, {field.location.lng.toFixed(4)}</span>
          </div>
        </div>
        <div className="field-map-section">
          <MapEmbed lat={field.location.lat} lng={field.location.lng} zoom={16} />
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
          <button className={`tab-btn ${activeTab === "activity" ? "active" : ""}`} onClick={() => setActiveTab("activity")}>Activity Log</button>
          <button className={`tab-btn ${activeTab === "irrigation" ? "active" : ""}`} onClick={() => setActiveTab("irrigation")}>Irrigation History</button>
          <button className={`tab-btn ${activeTab === "disease" ? "active" : ""}`} onClick={() => setActiveTab("disease")}>Disease History</button>
        </div>

        <div className="tab-content dash-card">
          {activeTab === "overview" && (
            <div className="tab-grid animate-fade-in-up">
              <div>
                <h3 className="tab-section-title">Crop Progress</h3>
                <div className="progress-stats">
                  <div className="progress-stat"><span>Days Since Sowing</span><strong>{daysSinceSowing} Days</strong></div>
                  <div className="progress-stat"><span>Est. Days to Harvest</span><strong>{Math.max(0, 120 - daysSinceSowing)} Days</strong></div>
                </div>
                
                <h3 className="tab-section-title" style={{ marginTop: 24 }}>Upcoming Tasks</h3>
                {tasks.length > 0 ? (
                  <div className="crop-tasks-list">
                    {tasks.map(t => (
                      <div key={t.id} className="crop-task-item" style={{ background: "#fff", border: "1px solid #e2e8e4" }}>
                        <CalendarIcon size={16} className="dash-icon-blue" />
                        <div className="crop-task-info"><span className="crop-task-name">{t.task}</span><span className="crop-task-range">{t.dueDate}</span></div>
                        <span className={`crop-task-badge badge-${t.status}`}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="no-data-text">No upcoming tasks found.</p>}
              </div>

              <div>
                <h3 className="tab-section-title">Soil Moisture Trend (7 Days)</h3>
                <div style={{ height: 260, marginTop: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={moistureChart} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="moisture" name="Moisture %" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="animate-fade-in-up">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 className="tab-section-title" style={{ margin: 0 }}>Activity Timeline</h3>
                <button className="btn-primary" onClick={() => setShowLogModal(true)}>Log New Activity</button>
              </div>
              
              {activities.length > 0 ? (
                <div className="timeline-list">
                  {activities.map(act => (
                    <div key={act.id} className="timeline-item">
                      <div className="timeline-icon">
                        {act.type === "irrigation" ? <Droplets size={16} color="#2563eb" /> : act.type === "fertilizer" ? <Activity size={16} color="#16a34a" /> : <Bug size={16} color="#d97706" />}
                      </div>
                      <div className="timeline-content">
                        <strong>{act.type.charAt(0).toUpperCase() + act.type.slice(1)} • {act.quantity}</strong>
                        <span className="timeline-date">{formatDate(act.date)}</span>
                        <p className="timeline-note">{act.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="no-data-text">No activities logged yet.</p>}
            </div>
          )}

          {activeTab === "irrigation" && (
            <div className="animate-fade-in-up">
              <h3 className="tab-section-title">Water Usage (Last 30 Days)</h3>
              <div style={{ height: 350, marginTop: 20 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={irrigationHist} margin={{ top: 10, right: 10, bottom: 20, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.split("-").slice(1).join("/")} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(val) => [`${val} L`, "Water Used"]} />
                    <Bar dataKey="waterUsed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "disease" && (
            <div className="animate-fade-in-up">
              <h3 className="tab-section-title">Past Disease Detections</h3>
              {diseaseHist.length > 0 ? (
                <div className="disease-history-list">
                  {diseaseHist.map(dis => (
                    <div key={dis.id} className="disease-history-item">
                      <Bug size={20} className="dash-icon-red" />
                      <div className="disease-history-info">
                        <strong>{dis.diseaseName}</strong>
                        <span>Detected on: {formatDate(dis.date)}</span>
                      </div>
                      <div className="disease-treatment">
                        <span className="treatment-label">Treatment Applied</span>
                        <span className="treatment-value">{dis.treatment}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="no-data-text">No past diseases recorded.</p>}
            </div>
          )}
        </div>
      </div>

      {showLogModal && <LogActivityModal fieldId={fieldId} onClose={() => setShowLogModal(false)} onLogged={fetchData} />}
    </div>
  );
}

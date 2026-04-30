"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, MapPin, CloudSun, Droplets, ArrowRight, X, LocateFixed } from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Field, IrrigationData } from "@/lib/types";
import { CROPS } from "@/lib/crops";

// Helper to calculate harvest date (mocked duration per crop)
function getEstimatedHarvest(sowingDate: string, crop: string) {
  const d = new Date(sowingDate);
  const durationMap: Record<string, number> = { Wheat: 140, Rice: 130, Mustard: 110 };
  d.setDate(d.getDate() + (durationMap[crop] || 120));
  return formatDate(d.toISOString());
}

// Helper to get crop badge color
function getCropColor(crop: string) {
  const colors = ["#dcfce7", "#fef3c7", "#dbeafe", "#fce7f3", "#e0e7ff"];
  const textColors = ["#16a34a", "#d97706", "#2563eb", "#db2777", "#4f46e5"];
  const index = crop.length % colors.length;
  return { bg: colors[index], text: textColors[index] };
}

// Field Card Component
function FieldCard({ field }: { field: Field }) {
  const [irrigation, setIrrigation] = useState<IrrigationData | null>(null);
  const [weather, setWeather] = useState<{ temp: number; rain: number } | null>(null);

  useEffect(() => {
    // Fetch irrigation
    apiFetch(`/api/irrigation/${field.id}`)
      .then((res) => res.json())
      .then(setIrrigation)
      .catch(() => {});

    // Mock weather fetch using GPS coordinates
    // In production: fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${field.location.lat}&lon=${field.location.lng}...`)
    setTimeout(() => {
      setWeather({
        temp: 24 + Math.round(Math.random() * 8),
        rain: Math.round(Math.random() * 40),
      });
    }, 500);
  }, [field.id, field.location]);

  const { bg, text } = getCropColor(field.crop);
  const areaAcres = (field.areaSqFt / 43560).toFixed(2);
  const irrigationStatusColor = irrigation ? (irrigation.averageMoisture > 60 ? "#16a34a" : "#dc2626") : "#9ca3af";

  return (
    <div className="dash-card field-card">
      <div className="field-card-header">
        <h3 className="field-card-title">{field.name}</h3>
        <span className="field-crop-badge" style={{ backgroundColor: bg, color: text }}>
          {field.crop}
        </span>
      </div>

      <div className="field-card-body">
        <div className="field-card-row">
          <MapPin size={16} />
          <span>{areaAcres} Acres</span>
        </div>
        <div className="field-card-row">
          <span className="field-label">Soil:</span>
          <span className="field-chip">{field.soilType || "Unknown"}</span>
        </div>
        <div className="field-card-row">
          <span className="field-label">Sown:</span>
          <span>{field.sowingDate ? formatDate(field.sowingDate) : "N/A"}</span>
        </div>
        <div className="field-card-row">
          <span className="field-label">Est. Harvest:</span>
          <span>{field.sowingDate ? getEstimatedHarvest(field.sowingDate, field.crop) : "N/A"}</span>
        </div>
      </div>

      <div className="field-card-badges">
        <div className="field-mini-badge">
          <span className="irrigation-dot" style={{ backgroundColor: irrigationStatusColor }} />
          <span>{irrigation ? `${irrigation.averageMoisture}% Moisture` : "Loading..."}</span>
        </div>
        <div className="field-mini-badge">
          <CloudSun size={14} className="dash-icon-blue" />
          <span>{weather ? `${weather.temp}°C, ${weather.rain}% Rain` : "Loading..."}</span>
        </div>
      </div>

      <div className="field-card-footer">
        <Link href={`/my-fields/${field.id}`} className="btn-secondary field-btn">
          View Details <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

// Add Field Modal
function AddFieldModal({ onClose, onAdded }: { onClose: () => void; onAdded: (f: Field) => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    crop: "Wheat",
    areaAcres: "",
    soilType: "Loamy",
    sowingDate: new Date().toISOString().split("T")[0],
    lat: "",
    lng: "",
  });

  const handleDetectGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((p) => ({
            ...p,
            lat: pos.coords.latitude.toFixed(4),
            lng: pos.coords.longitude.toFixed(4),
          }));
          toast.success("GPS Location detected!");
        },
        () => toast.error("Failed to detect location.")
      );
    } else {
      toast.error("Geolocation not supported.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        areaSqFt: parseFloat(formData.areaAcres) * 43560,
        location: { lat: parseFloat(formData.lat) || 0, lng: parseFloat(formData.lng) || 0 },
      };
      const res = await apiFetch("/api/fields", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success("Field added successfully!");
      onAdded(data.field);
      onClose();
    } catch {
      toast.error("Failed to add field.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content animate-fade-in-up">
        <div className="modal-header">
          <h2>Add New Field</h2>
          <button onClick={onClose} className="modal-close"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body form-grid">
          <div className="form-field">
            <label>Field Name</label>
            <input required className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. North Plot" />
          </div>
          <div className="form-field">
            <label>Crop</label>
            <select className="form-input" value={formData.crop} onChange={(e) => setFormData({ ...formData, crop: e.target.value })}>
              {CROPS.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div className="form-field">
            <label>Area (Acres)</label>
            <input required type="number" step="0.1" className="form-input" value={formData.areaAcres} onChange={(e) => setFormData({ ...formData, areaAcres: e.target.value })} placeholder="e.g. 2.5" />
          </div>
          <div className="form-field">
            <label>Soil Type</label>
            <select className="form-input" value={formData.soilType} onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}>
              <option>Loamy</option>
              <option>Clay</option>
              <option>Sandy</option>
              <option>Silt</option>
            </select>
          </div>
          <div className="form-field">
            <label>Sowing Date</label>
            <input required type="date" className="form-input" value={formData.sowingDate} onChange={(e) => setFormData({ ...formData, sowingDate: e.target.value })} />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label>GPS Coordinates</label>
            <div className="gps-row">
              <input required type="number" step="0.0001" className="form-input" style={{ flex: 1 }} placeholder="Lat" value={formData.lat} onChange={(e) => setFormData({ ...formData, lat: e.target.value })} />
              <input required type="number" step="0.0001" className="form-input" style={{ flex: 1 }} placeholder="Lng" value={formData.lng} onChange={(e) => setFormData({ ...formData, lng: e.target.value })} />
              <button type="button" onClick={handleDetectGPS} className="btn-secondary"><LocateFixed size={18} /> Auto-detect</button>
            </div>
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1", marginTop: 10 }}>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Adding..." : "Add Field"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main Page
export default function MyFieldsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    apiFetch("/api/fields")
      .then((res) => res.json())
      .then((data) => {
        setFields(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load fields");
        setLoading(false);
      });
  }, []);

  return (
    <div className="dash-page animate-fade-in-up">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>My Fields</h1>
          <p>Manage your registered farm plots</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} style={{ display: "inline", marginRight: 6, verticalAlign: "text-bottom" }} />
          Add New Field
        </button>
      </div>

      {loading ? (
        <div className="fields-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="dash-card"><div className="skeleton-pulse" style={{ height: 200 }} /></div>
          ))}
        </div>
      ) : fields.length === 0 ? (
        <div className="dash-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <MapPin size={48} className="dash-icon-green" style={{ margin: "0 auto 16px" }} />
          <h3>No fields added yet</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>Add your first field to start receiving smart insights.</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Add New Field</button>
        </div>
      ) : (
        <div className="fields-grid stagger-children">
          {fields.map((f) => (
            <FieldCard key={f.id} field={f} />
          ))}
        </div>
      )}

      {showModal && <AddFieldModal onClose={() => setShowModal(false)} onAdded={(f) => setFields([...fields, f])} />}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Droplets,
  CloudSun,
  TrendingUp,
  TrendingDown,
  Shield,
  Landmark,
  Clock,
  Zap,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
} from "lucide-react";
import {
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import dynamic from "next/dynamic";

const LineChart = dynamic(() => import("recharts").then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(mod => mod.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(mod => mod.YAxis), { ssr: false });
import { motion } from "framer-motion";
import CountUp from "react-countup";
import toast from "react-hot-toast";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import { dashboardTranslations } from "@/lib/dashboardTranslations";
import { formatIndianNumber, formatTime, getMoistureColor, getMoistureTextColor } from "@/lib/utils";
import type {
  IrrigationData,
  WeatherData,
  MandiPrice,
  DiseaseAlert,
  CropTask,
  Field,
} from "@/lib/types";

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ─── Skeleton Loader ───
function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton-pulse ${className}`} style={style} />;
}

function SkeletonCard() {
  return (
    <div className="dash-card">
      <Skeleton style={{ height: 20, width: "60%", marginBottom: 12 }} />
      <Skeleton style={{ height: 14, width: "80%", marginBottom: 8 }} />
      <Skeleton style={{ height: 14, width: "40%", marginBottom: 16 }} />
      <Skeleton style={{ height: 100, width: "100%" }} />
    </div>
  );
}

// ─── SVG Field Map ───
function FieldMoistureMap({
  sections,
  t,
}: {
  sections: IrrigationData["sections"];
  t: Record<string, string>;
}) {
  const cols = 3;
  const cellW = 90;
  const cellH = 70;
  const gap = 6;
  const totalW = cols * cellW + (cols - 1) * gap;
  const rows = Math.ceil(sections.length / cols);
  const totalH = rows * cellH + (rows - 1) * gap;

  return (
    <div className="moisture-map-container">
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="moisture-map-svg"
        aria-label={t.soilMoistureMap}
      >
        {sections.map((sec, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = col * (cellW + gap);
          const y = row * (cellH + gap);
          const fill = getMoistureColor(sec.moisture);
          const textFill = getMoistureTextColor(sec.moisture);

          return (
            <g key={sec.id}>
              <rect
                x={x}
                y={y}
                width={cellW}
                height={cellH}
                rx={8}
                fill={fill}
                className="moisture-cell"
              />
              <text
                x={x + cellW / 2}
                y={y + cellH / 2 - 8}
                textAnchor="middle"
                fill={textFill}
                fontSize="11"
                fontWeight="600"
              >
                {sec.name}
              </text>
              <text
                x={x + cellW / 2}
                y={y + cellH / 2 + 12}
                textAnchor="middle"
                fill={textFill}
                fontSize="16"
                fontWeight="800"
              >
                {sec.moisture}%
              </text>
            </g>
          );
        })}
      </svg>
      <div className="moisture-legend">
        <span className="moisture-legend-label">{t.dry}</span>
        <div className="moisture-legend-bar" />
        <span className="moisture-legend-label">{t.wet}</span>
      </div>
    </div>
  );
}

// ─── Animation Variants ───
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

// ─── Main Dashboard ───
export default function DashboardPage() {
  const { language, farmer, fields } = useAppStore();
  const t = dashboardTranslations[language];

  // State
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [irrigationData, setIrrigationData] = useState<IrrigationData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [mandiPrices, setMandiPrices] = useState<MandiPrice[] | null>(null);
  const [alerts, setAlerts] = useState<DiseaseAlert[] | null>(null);
  const [schemesCount, setSchemesCount] = useState<number | null>(null);
  const [cropTasks, setCropTasks] = useState<CropTask[] | null>(null);
  const [overriding, setOverriding] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Loading states
  const [loadingIrrigation, setLoadingIrrigation] = useState(true);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [loadingMandi, setLoadingMandi] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingSchemes, setLoadingSchemes] = useState(true);
  const [loadingCropTasks, setLoadingCropTasks] = useState(true);

  // Auto-select first field
  useEffect(() => {
    if (fields?.length > 0 && !selectedFieldId) {
      setSelectedFieldId(fields[0].id);
    }
  }, [fields, selectedFieldId]);

  // ─── Data Fetchers ───
  const fetchIrrigation = useCallback(async (fieldId: string) => {
    setLoadingIrrigation(true);
    try {
      const res = await apiFetch(`/api/irrigation/${fieldId}`);
      if (!res.ok) throw new Error("Irrigation API failed");
      const data = await res.json();
      setIrrigationData(data);
    } catch {
      toast.error(t.errorFetching);
    } finally {
      setLoadingIrrigation(false);
    }
  }, [t.errorFetching]);

  const fetchWeather = useCallback(async (district: string) => {
    setLoadingWeather(true);
    try {
      const res = await apiFetch(`/api/weather/${encodeURIComponent(district)}`);
      if (!res.ok) throw new Error("Weather API failed");
      const data = await res.json();
      setWeatherData(data);
    } catch {
      toast.error(t.errorFetching);
    } finally {
      setLoadingWeather(false);
    }
  }, [t.errorFetching]);

  const fetchMandi = useCallback(async (district: string, crop: string) => {
    setLoadingMandi(true);
    try {
      const res = await apiFetch(
        `/api/mandi/${encodeURIComponent(district)}?crop=${encodeURIComponent(crop)}`
      );
      if (!res.ok) throw new Error("Mandi API failed");
      const data = await res.json();
      setMandiPrices(data);
    } catch {
      toast.error(t.errorFetching);
    } finally {
      setLoadingMandi(false);
    }
  }, [t.errorFetching]);

  const fetchAlerts = useCallback(async (district: string) => {
    setLoadingAlerts(true);
    try {
      const res = await apiFetch(`/api/alerts/${encodeURIComponent(district)}`);
      if (!res.ok) throw new Error("Alerts API failed");
      const data = await res.json();
      setAlerts(data);
    } catch {
      toast.error(t.errorFetching);
    } finally {
      setLoadingAlerts(false);
    }
  }, [t.errorFetching]);

  const fetchSchemes = useCallback(async (farmerId: string) => {
    setLoadingSchemes(true);
    try {
      const res = await apiFetch(`/api/schemes/${farmerId}`);
      if (!res.ok) throw new Error("Schemes API failed");
      const data = await res.json();
      setSchemesCount(data.eligibleCount);
    } catch {
      toast.error(t.errorFetching);
    } finally {
      setLoadingSchemes(false);
    }
  }, [t.errorFetching]);

  const fetchCropTasks = useCallback(
    async (crop: string, sowingDate: string) => {
      setLoadingCropTasks(true);
      try {
        const res = await apiFetch(
          `/api/crop-calendar?crop=${encodeURIComponent(crop)}&sowingDate=${sowingDate}`
        );
        if (!res.ok) throw new Error("Crop calendar API failed");
        const data = await res.json();
        setCropTasks(data);
      } catch {
        toast.error(t.errorFetching);
      } finally {
        setLoadingCropTasks(false);
      }
    },
    [t.errorFetching]
  );

  // ─── Fetch all data ───
  const fetchAllData = useCallback(() => {
    if (!farmer) return;

    if (selectedFieldId) {
      fetchIrrigation(selectedFieldId);
    }
    fetchWeather(farmer.district);
    fetchMandi(farmer.district, farmer.primaryCrop ?? "Wheat");
    fetchAlerts(farmer.district);
    fetchSchemes(farmer.id);

    if (farmer.primaryCrop && farmer.sowingDate) {
      fetchCropTasks(farmer.primaryCrop, farmer.sowingDate);
    }
  }, [farmer, selectedFieldId, fetchIrrigation, fetchWeather, fetchMandi, fetchAlerts, fetchSchemes, fetchCropTasks]);

  // Initial fetch + auto-refresh every 5 minutes
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Refetch irrigation when field changes
  useEffect(() => {
    if (selectedFieldId) {
      fetchIrrigation(selectedFieldId);
    }
  }, [selectedFieldId, fetchIrrigation]);

  // ─── Override Handler ───
  const handleOverride = async () => {
    if (!selectedFieldId) return;
    setOverriding(true);
    try {
      const res = await apiFetch(`/api/irrigation/${selectedFieldId}/override`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success(t.overrideSuccess);
      fetchIrrigation(selectedFieldId);
    } catch {
      toast.error(t.overrideFail);
    } finally {
      setOverriding(false);
    }
  };

  const selectedField = fields?.find((f: Field) => f.id === selectedFieldId);

  return (
    <motion.div 
      className="dash-page"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="dash-layout">
        {/* ════════════════════════════════════════════ */}
        {/* COLUMN 1 — Smart Irrigation (35%) */}
        {/* ════════════════════════════════════════════ */}
        <div className="dash-col dash-col-left">
          <motion.div variants={cardVariants} className="dash-card dash-card-irrigation">
            {/* Header */}
            <div className="dash-card-header">
              <div className="dash-card-title-row">
                <Droplets size={20} className="dash-icon-green" />
                <h2>{t.smartIrrigation}</h2>
                <span className="badge-active">{t.active}</span>
              </div>
            </div>

            {/* Field selector */}
            <div className="field-selector-wrap">
              <button
                className="field-selector"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
              >
                <span>{selectedField?.name ?? t.selectField}</span>
                <ChevronDown size={16} className={dropdownOpen ? "rotate-180" : ""} />
              </button>
              {dropdownOpen && (
                <div className="field-dropdown">
                  {fields?.map((f: Field) => (
                    <button
                      key={f.id}
                      className={`field-dropdown-item ${f.id === selectedFieldId ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedFieldId(f.id);
                        setDropdownOpen(false);
                      }}
                    >
                      <span>{f.name}</span>
                      <span className="field-crop-tag">{f.crop}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Moisture Map */}
            {loadingIrrigation ? (
              <Skeleton style={{ height: 200, borderRadius: 12 }} />
            ) : irrigationData ? (
              <FieldMoistureMap sections={irrigationData.sections} t={t} />
            ) : null}

            {/* Stat Cards */}
            <div className="irrigation-stats">
              {loadingIrrigation ? (
                <>
                  <Skeleton style={{ height: 80, borderRadius: 12 }} />
                  <Skeleton style={{ height: 80, borderRadius: 12 }} />
                </>
              ) : irrigationData ? (
                <>
                  <div className="irrigation-stat-card">
                    <div className="irrigation-stat-icon moisture-icon">
                      <Droplets size={18} />
                    </div>
                    <div>
                      <p className="irrigation-stat-label">{t.avgSoilMoisture}</p>
                      <p className="irrigation-stat-value">
                        <CountUp end={irrigationData.averageMoisture} duration={2} />%
                      </p>
                    </div>
                  </div>
                  <div className="irrigation-stat-card">
                    <div className="irrigation-stat-icon water-icon">
                      <Zap size={18} />
                    </div>
                    <div>
                      <p className="irrigation-stat-label">{t.waterSavedThisWeek}</p>
                      <p className="irrigation-stat-value">
                        <CountUp end={irrigationData.waterSavedLiters} duration={2.5} separator="," /> {t.liters}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Upcoming Schedule */}
            {loadingIrrigation ? (
              <Skeleton style={{ height: 90, borderRadius: 12 }} />
            ) : irrigationData ? (
              <div className="irrigation-schedule">
                <div className="schedule-header">
                  <Clock size={16} />
                  <h3>{t.upcomingIrrigation}</h3>
                </div>
                <div className="schedule-body">
                  <div className="schedule-info">
                    <p className="schedule-label">{t.nextScheduled}</p>
                    <p className="schedule-time">
                      {formatTime(irrigationData.nextIrrigationTime)}
                    </p>
                    <p className="schedule-zone">
                      {t.zone}: {irrigationData.nextIrrigationZone}
                    </p>
                  </div>
                  <button
                    className="btn-override"
                    onClick={handleOverride}
                    disabled={overriding}
                  >
                    {overriding ? "..." : t.overrideBtn}
                  </button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* COLUMN 2 — Weather & Crop Chart (40%) */}
        {/* ════════════════════════════════════════════ */}
        <div className="dash-col dash-col-center">
          {/* 7-Day Forecast */}
          <motion.div variants={cardVariants} className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title-row">
                <CloudSun size={20} className="dash-icon-blue" />
                <h2>{t.weatherForecast}</h2>
              </div>
            </div>

            {loadingWeather ? (
              <div className="forecast-grid">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} style={{ height: 120, borderRadius: 12 }} />
                ))}
              </div>
            ) : weatherData ? (
              <div className="forecast-grid">
                {weatherData.forecast?.map((day, i) => (
                  <div
                    key={day.date}
                    className={`forecast-card ${i === 0 ? "forecast-card-today" : ""}`}
                  >
                    <span className="forecast-day">{day.dayName}</span>
                    <span className="forecast-icon">{day.icon}</span>
                    <span className="forecast-temp">
                      {day.tempMax}° / {day.tempMin}°
                    </span>
                    <span className="forecast-rain">
                      💧 {day.rainChance}%
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </motion.div>

          {/* 24h Chart */}
          <motion.div variants={cardVariants} className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title-row">
                <h2>{t.realtimeWeather}</h2>
              </div>
            </div>

            {loadingWeather ? (
              <Skeleton style={{ height: 260, borderRadius: 12 }} />
            ) : weatherData ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={weatherData.hourly} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 12, fill: "#8fa498" }}
                      axisLine={{ stroke: "#e2e8e4" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#8fa498" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e2e8e4",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: 13,
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      name={t.temperature}
                      stroke="#16a34a"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#16a34a" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="humidity"
                      name={t.humidity}
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#2563eb" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </motion.div>

          {/* Crop Calendar */}
          <motion.div variants={cardVariants} className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title-row">
                <Calendar size={20} className="dash-icon-amber" />
                <h2>{t.cropCalendar}</h2>
              </div>
              <span className="dash-card-subtitle">{t.tasksThisWeek}</span>
            </div>

            {loadingCropTasks ? (
              <div className="crop-tasks-list">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} style={{ height: 50, borderRadius: 10, marginBottom: 8 }} />
                ))}
              </div>
            ) : cropTasks && cropTasks.length > 0 ? (
              <div className="crop-tasks-list">
                {cropTasks.map((task) => (
                  <div key={task.id} className={`crop-task-item crop-task-${task.status}`}>
                    <div className="crop-task-indicator" />
                    <div className="crop-task-info">
                      <span className="crop-task-name">{task.task}</span>
                      <span className="crop-task-range">{task.dayRange}</span>
                    </div>
                    <span className={`crop-task-badge badge-${task.status}`}>
                      {task.status === "today" ? t.today : task.status === "overdue" ? t.overdue : t.upcoming}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data-text">{t.noTasks}</p>
            )}
          </motion.div>
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* COLUMN 3 — Mandi + Alerts (25%) */}
        {/* ════════════════════════════════════════════ */}
        <div className="dash-col dash-col-right">
          {/* Mandi Prices */}
          <motion.div variants={cardVariants} className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title-row">
                <TrendingUp size={20} className="dash-icon-orange" />
                <h2>{t.mandiPrices}</h2>
              </div>
              <span className="dash-card-subtitle">{t.todaysPrice}</span>
            </div>

            {loadingMandi ? (
              <>
                <Skeleton style={{ height: 80, borderRadius: 12, marginBottom: 12 }} />
                <Skeleton style={{ height: 80, borderRadius: 12 }} />
              </>
            ) : mandiPrices && mandiPrices.length > 0 ? (
              <div className="mandi-list">
                {mandiPrices.map((mp, i) => {
                  const change = mp.price - mp.previousPrice;
                  const isUp = change >= 0;
                  return (
                    <div key={i} className="mandi-item">
                      <div className="mandi-item-header">
                        <span className="mandi-crop">{mp.crop}</span>
                        <span className="mandi-market">{mp.market}</span>
                      </div>
                      <div className="mandi-price-row">
                        <span className="mandi-price">
                          ₹<CountUp end={mp.price} duration={2} separator="," />
                        </span>
                        <span className="mandi-unit">/{t.perQuintal}</span>
                        <span className={`mandi-change ${isUp ? "up" : "down"}`}>
                          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          ₹{Math.abs(change)} {isUp ? t.priceUp : t.priceDown}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <Link href="/mandi-prices" className="view-all-link">
                  {t.viewAllMandis}
                </Link>
              </div>
            ) : null}
          </motion.div>

          {/* Disease Alerts */}
          <motion.div variants={cardVariants} className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title-row">
                <Shield size={20} className="dash-icon-red" />
                <h2>{t.diseaseAlerts}</h2>
              </div>
            </div>

            {loadingAlerts ? (
              <div className="alerts-list">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} style={{ height: 60, borderRadius: 10, marginBottom: 8 }} />
                ))}
              </div>
            ) : alerts && alerts.length > 0 ? (
              <div className="alerts-list">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`alert-item alert-${alert.severity}`}>
                    <div className={`alert-dot alert-dot-${alert.severity}`} />
                    <div className="alert-content">
                      <div className="alert-title-row">
                        <span className="alert-title">{alert.title}</span>
                        <span className={`alert-severity-badge severity-${alert.severity}`}>
                          {alert.severity === "urgent"
                            ? t.urgent
                            : alert.severity === "watch"
                              ? t.watch
                              : t.info}
                        </span>
                      </div>
                      <p className="alert-desc">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-alerts">
                <CheckCircle size={32} className="dash-icon-green" />
                <p>{t.noAlerts}</p>
              </div>
            )}
          </motion.div>

          {/* Govt Schemes Banner */}
          <motion.div variants={cardVariants} className="dash-card scheme-banner">
            <div className="scheme-banner-content">
              <Landmark size={28} className="scheme-icon" />
              {loadingSchemes ? (
                <Skeleton style={{ height: 40, width: "80%", borderRadius: 8 }} />
              ) : (
                <>
                  <div className="scheme-info">
                    <span className="scheme-count">
                      <CountUp end={schemesCount ?? 0} duration={1.5} />
                    </span>
                    <span className="scheme-label">{t.eligibleSchemes}</span>
                  </div>
                  <Link href="/govt-schemes" className="btn-scheme">
                    {t.checkEligibility}
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

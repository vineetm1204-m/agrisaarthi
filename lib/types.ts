// ──────────────────────────────────────────────
// AgriSaarthi – Shared TypeScript types
// ──────────────────────────────────────────────

export type Language = "en" | "hi";

export interface FarmerProfile {
  id: string;
  name: string;
  phone: string;
  village: string;
  district: string;
  state: string;
  avatarUrl: string;
  language: Language;
  primaryCrop?: string;
  sowingDate?: string; // ISO date string
  ivrEnabled?: boolean;
  ivrNumber?: string | null;
  ivrLanguage?: string;
  crops?: string[];
  location?: { state?: string; district?: string };
  landSizeAcres?: number;
}

export interface FieldSection {
  id: string;
  name: string;
  moisture: number; // 0-100
}

export interface Field {
  id: string;
  name: string;
  crop: string;
  areaSqFt: number;
  location: { lat: number; lng: number };
  sections?: FieldSection[];
  soilType?: string;
  sowingDate?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// ─── Irrigation ───
export interface IrrigationData {
  fieldId: string;
  averageMoisture: number;
  waterSavedLiters: number;
  sections: FieldSection[];
  nextIrrigationTime: string; // ISO datetime
  nextIrrigationZone: string;
}

// ─── Weather ───
export interface DayForecast {
  date: string;
  dayName: string;
  icon: string;
  tempMin: number;
  tempMax: number;
  rainChance: number;
  description: string;
}

export interface HourlyPoint {
  hour: string;
  temperature: number;
  humidity: number;
}

export interface WeatherData {
  forecast: DayForecast[];
  hourly: HourlyPoint[];
}

// ─── Mandi ───
export interface MandiPrice {
  crop: string;
  market: string;
  district: string;
  price: number;
  previousPrice: number;
  unit: string;
  date: string;
}

// ─── Alerts ───
export interface DiseaseAlert {
  id: string;
  title: string;
  description: string;
  severity: "urgent" | "watch" | "info";
  crop: string;
  date: string;
}

// ─── Schemes ───
export interface GovtScheme {
  id: string;
  name: string;
  description: string;
  eligibleCount: number;
}

export interface CropTask {
  id: string;
  task: string;
  dayRange: string;
  dueDate: string;
  status: "upcoming" | "today" | "overdue";
}

// ─── Field Activities ───
export interface ActivityLog {
  id: string;
  fieldId: string;
  date: string;
  type: "fertilizer" | "pesticide" | "irrigation" | "other";
  note: string;
  quantity: string;
}

export interface IrrigationHistoryItem {
  date: string;
  waterUsed: number;
}

export interface DiseaseHistoryItem {
  id: string;
  date: string;
  diseaseName: string;
  treatment: string;
}

// ─── IVR / Voice ───
export type IvrQueryType =
  | "disease"
  | "weather"
  | "mandi"
  | "schemes"
  | "general"
  | "web_voice";

export interface IvrCallLog {
  id: string;
  farmerId?: string | null;
  farmerPhone: string;
  timestamp: string; // ISO date
  queryType: IvrQueryType;
  queryText: string;
  responseText: string;
  durationSeconds?: number | null;
  channel?: "ivr" | "web_voice";
}

export interface IvrQueryStats {
  queryType: IvrQueryType;
  count: number;
}

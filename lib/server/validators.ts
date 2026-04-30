// ──────────────────────────────────────────────
// Zod Validation Schemas
// ──────────────────────────────────────────────

import { z } from "zod";

// ── Farmer ──
export const farmerCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().regex(/^\+91\d{10}$/, "Phone must be +91 followed by 10 digits"),
  state: z.string().min(1),
  district: z.string().min(1),
  languagePref: z.enum(["hi", "en", "mr"]).default("hi"),
  incomeBracket: z.string().optional(),
  landSizeAcres: z.number().positive().optional(),
  casteCategory: z.string().optional(),
  primaryCrop: z.string().optional(),
});

export const farmerUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  state: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  languagePref: z.enum(["hi", "en", "mr"]).optional(),
  incomeBracket: z.string().optional(),
  landSizeAcres: z.number().positive().optional(),
  casteCategory: z.string().optional(),
  primaryCrop: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  ivrEnabled: z.boolean().optional(),
  ivrLanguage: z.enum(["hi", "en", "mr"]).optional(),
  ivrNumber: z.string().optional(),
});

export const farmerNotificationsSchema = z.object({
  notifWeather: z.boolean().optional(),
  notifMandi: z.boolean().optional(),
  notifIrrigation: z.boolean().optional(),
  notifDisease: z.boolean().optional(),
  notifSchemes: z.boolean().optional(),
});

// ── Field ──
export const fieldCreateSchema = z.object({
  name: z.string().min(1, "Field name is required").max(100),
  areaAcres: z.number().positive("Area must be positive"),
  soilType: z.enum(["Loamy", "Clay", "Sandy", "Silt", "Red", "Black"]).optional(),
  currentCrop: z.string().optional(),
  sowingDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const fieldUpdateSchema = fieldCreateSchema.partial();

// ── Activity ──
export const activityCreateSchema = z.object({
  fieldId: z.string().min(1),
  type: z.enum(["fertilizer", "pesticide", "irrigation", "other"]),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  note: z.string().max(500).optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
});

// ── Irrigation ──
export const irrigationLogSchema = z.object({
  fieldId: z.string().min(1),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  waterLiters: z.number().positive(),
  source: z.enum(["ai", "manual"]).default("manual"),
});

// ── Disease ──
export const diseaseDetectionSchema = z.object({
  fieldId: z.string().min(1),
  imageUrl: z.string().url(),
  diseaseName: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  treatmentApplied: z.string().optional(),
});

// ── IVR ──
export const ivrCallSchema = z.object({
  farmerPhone: z.string().min(1),
  queryType: z.enum(["disease", "weather", "mandi", "schemes", "general", "web_voice"]),
  queryText: z.string().min(1),
  responseText: z.string().min(1),
  durationSec: z.number().int().optional(),
  callSid: z.string().optional(),
  channel: z.enum(["ivr", "web_voice"]).default("ivr"),
});

// ── Price Alert ──
export const priceAlertCreateSchema = z.object({
  crop: z.string().min(1),
  targetPrice: z.number().positive(),
  direction: z.enum(["above", "below"]),
});

export const priceAlertUpdateSchema = z.object({
  active: z.boolean().optional(),
  targetPrice: z.number().positive().optional(),
  direction: z.enum(["above", "below"]).optional(),
});

// ── Query Params ──
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const dateRangeSchema = z.object({
  from: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  to: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

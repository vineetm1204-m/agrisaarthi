// ──────────────────────────────────────────────
// IVR Utility – Migrated to Supabase
// ──────────────────────────────────────────────

import { supabase } from "@/lib/supabaseClient";
import { DISTRICTS_BY_STATE } from "@/lib/indiaLocations";
import type { FarmerProfile, IvrQueryType } from "@/lib/types";

const ALL_DISTRICTS = Object.values(DISTRICTS_BY_STATE).flat();

export interface IvrSession {
  callSid: string;
  phone: string;
  name?: string | null;
  district?: string | null;
  nameDistrictRaw?: string | null;
  isUnknown?: boolean;
  updatedAt?: string;
}

export interface IvrSettings {
  enabled: boolean;
  number: string | null;
}

export interface IvrLogInput {
  farmerId?: string | null;
  farmerPhone: string;
  queryType: IvrQueryType;
  queryText: string;
  responseText: string;
  durationSeconds?: number | null;
  channel?: "ivr" | "web_voice";
  callSid?: string | null;
}

export function normalizePhone(raw: string | null): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length >= 12) return `+${digits}`;
  return `+91${digits}`;
}

export function guessDistrict(text: string | null): string | null {
  if (!text) return null;
  const normalized = text.toLowerCase();
  return (
    ALL_DISTRICTS.find((district) =>
      normalized.includes(district.toLowerCase())
    ) ?? null
  );
}

function coerceLanguage(value: string | undefined): "en" | "hi" {
  return value === "en" ? "en" : "hi";
}

export async function findFarmerByPhone(phone: string): Promise<FarmerProfile | null> {
  if (!phone) return null;
  try {
    const { data: farmer, error } = await supabase
      .from("farmers")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (error || !farmer) return null;

    return {
      id: farmer.id,
      name: farmer.name,
      phone: farmer.phone,
      village: "",
      district: farmer.district,
      state: farmer.state,
      avatarUrl: farmer.avatar_url || "",
      language: coerceLanguage(farmer.language_pref),
      primaryCrop: farmer.primary_crop || undefined,
      sowingDate: farmer.created_at, // Fallback
      ivrEnabled: farmer.ivr_enabled,
      ivrNumber: farmer.ivr_number || process.env.NEXT_PUBLIC_IVR_NUMBER || null,
    };
  } catch (err) {
    console.warn("Unable to lookup farmer by phone:", err);
    return null;
  }
}

export async function findFarmerById(farmerId: string): Promise<FarmerProfile | null> {
  if (!farmerId) return null;
  try {
    const { data: farmer, error } = await supabase
      .from("farmers")
      .select("*")
      .eq("id", farmerId)
      .maybeSingle();

    if (error || !farmer) return null;

    return {
      id: farmer.id,
      name: farmer.name,
      phone: farmer.phone,
      village: "",
      district: farmer.district,
      state: farmer.state,
      avatarUrl: farmer.avatar_url || "",
      language: coerceLanguage(farmer.language_pref),
      primaryCrop: farmer.primary_crop || undefined,
      sowingDate: farmer.created_at,
      ivrEnabled: farmer.ivr_enabled,
      ivrNumber: farmer.ivr_number || process.env.NEXT_PUBLIC_IVR_NUMBER || null,
    };
  } catch (err) {
    console.warn("Unable to lookup farmer by id:", err);
    return null;
  }
}

export async function logIvrCall(log: IvrLogInput): Promise<void> {
  if (!log.farmerPhone || !log.queryType) return;
  try {
    await supabase.from("ivr_calls").insert([{
      farmer_phone: log.farmerPhone,
      query_type: log.queryType,
      query_text: log.queryText,
      response_text: log.responseText,
      duration_sec: log.durationSeconds || null,
      call_sid: log.callSid || null,
      channel: log.channel || "ivr",
    }]);
  } catch (err) {
    console.warn("Unable to log IVR call:", err);
  }
}

export async function getRecentCallsByFarmer(
  farmerId: string,
  page: number,
  pageSize: number
) {
  try {
    const { data: farmer } = await supabase
      .from("farmers")
      .select("phone")
      .eq("id", farmerId)
      .single();

    if (!farmer) return [];

    const { data: calls, error } = await supabase
      .from("ivr_calls")
      .select("*")
      .eq("farmer_phone", farmer.phone)
      .order("timestamp", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;

    return (calls || []).map((c: any) => ({
      id: c.id,
      farmerPhone: c.farmer_phone,
      queryType: c.query_type,
      queryText: c.query_text,
      responseText: c.response_text,
      durationSeconds: c.duration_sec,
      channel: c.channel,
      timestamp: c.timestamp,
    }));
  } catch (err) {
    console.warn("Unable to get recent calls:", err);
    return [];
  }
}

export async function getMonthlyStats(farmerId: string, monthStart: Date) {
  try {
    const { data: farmer } = await supabase
      .from("farmers")
      .select("phone")
      .eq("id", farmerId)
      .single();

    if (!farmer) return {};

    const { data: calls, error } = await supabase
      .from("ivr_calls")
      .select("query_type")
      .eq("farmer_phone", farmer.phone)
      .gte("timestamp", monthStart.toISOString());

    if (error) throw error;

    const counts: Record<string, number> = {};
    (calls || []).forEach((c: any) => {
      counts[c.query_type] = (counts[c.query_type] || 0) + 1;
    });
    return counts;
  } catch (err) {
    console.warn("Unable to get monthly stats:", err);
    return {};
  }
}

export async function getIvrSettings(farmerId: string): Promise<IvrSettings | null> {
  if (!farmerId) return null;
  try {
    const { data: farmer, error } = await supabase
      .from("farmers")
      .select("ivr_enabled, ivr_number")
      .eq("id", farmerId)
      .single();

    if (error || !farmer) return null;

    return {

      enabled: farmer.ivr_enabled !== false,
      number: farmer.ivr_number,

      enabled: farmer.ivr_enabled ?? true,
      number: farmer.ivr_number ?? null,

    };
  } catch (err) {
    console.warn("Unable to get IVR settings:", err);
    return null;
  }
}


export async function setIvrSettings(farmerId: string, settings: IvrSettings): Promise<boolean> {
  if (!farmerId) return false;
export async function setIvrSettings(farmerId: string, settings: IvrSettings): Promise<void> {
  if (!farmerId) return;
  try {
    const { error } = await supabase
      .from("farmers")
      .update({
        ivr_enabled: settings.enabled,
        ivr_number: settings.number,
      })
      .eq("id", farmerId);

    if (error) throw error;

    return true;
  } catch (err) {
    console.warn("Unable to set IVR settings:", err);
    return false;

  } catch (err) {
    console.warn("Unable to set IVR settings:", err);
    throw err;
  }
}

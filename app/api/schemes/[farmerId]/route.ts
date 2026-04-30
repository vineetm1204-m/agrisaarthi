// ──────────────────────────────────────────────
// GET/POST /api/schemes/[farmerId] – AI-powered scheme eligibility
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { handleApiError } from "@/lib/server/errors";
import { cacheGet, cacheSet } from "@/lib/server/redis";
import { callClaude, buildFarmerSystemPrompt } from "@/lib/server/claude";

const CACHE_TTL = 24 * 60 * 60; // 24 hours

const MOCK_SCHEMES = [
  {
    name: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    is_state_scheme: false,
    benefit_inr: 6000,
    eligibility_criteria: ["Small and marginal farmers", "Must hold valid land records"],
    documents_needed: ["Aadhaar Card", "Land holding papers", "Bank account details"],
    application_url: "https://pmkisan.gov.in/",
    deadline: "Open All Year",
    already_enrolled: false,
  },
  {
    name: "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    is_state_scheme: false,
    benefit_inr: 25000,
    eligibility_criteria: ["Must be growing notified crops", "Both loanee and non-loanee eligible"],
    documents_needed: ["Aadhaar Card", "Bank Passbook", "Land certificate"],
    application_url: "https://pmfby.gov.in/",
    deadline: "Varies by State (Kharif/Rabi)",
    already_enrolled: true,
  },
  {
    name: "KCC (Kisan Credit Card)",
    ministry: "Ministry of Finance / RBI",
    is_state_scheme: false,
    benefit_inr: 300000,
    eligibility_criteria: ["All farmers - individuals/joint borrowers", "Tenant farmers eligible"],
    documents_needed: ["Aadhaar Card", "PAN Card", "Land ownership proof", "Photo"],
    application_url: "https://sbi.co.in/web/agri-rural/agriculture-banking/crop-loan/kisan-credit-card",
    deadline: "Open All Year",
    already_enrolled: false,
  },
  {
    name: "Soil Health Card Scheme",
    ministry: "Ministry of Agriculture",
    is_state_scheme: false,
    benefit_inr: 0,
    eligibility_criteria: ["All farmers in India", "Cultivating active agricultural land"],
    documents_needed: ["Aadhaar Card", "Land Details"],
    application_url: "https://soilhealth.dac.gov.in/",
    deadline: "Open All Year",
    already_enrolled: false,
  },
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  try {
    const { farmerId } = await params;

    // Check cache
    const cacheKey = `schemes:${farmerId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    // Try to get farmer from DB
    const { data: farmer } = await supabase
      .from("farmers")
      .select("*")
      .eq("id", farmerId)
      .maybeSingle();

    let schemes = MOCK_SCHEMES;

    if (farmer) {
      try {
        const systemPrompt = buildFarmerSystemPrompt(
          {
            name: farmer.name,
            state: farmer.state,
            district: farmer.district,
            crop: farmer.primary_crop || undefined,
            landSize: farmer.land_size_acres || undefined,
            language: farmer.language_pref,
          },
          `You are an expert on Indian government agricultural schemes.
List ALL central and state government schemes this farmer is eligible for.
For each scheme return JSON: { "name": string, "ministry": string, "is_state_scheme": boolean, "benefit_inr": number, "eligibility_criteria": string[], "documents_needed": string[], "application_url": string, "deadline": string, "already_enrolled": boolean }.
Include: PM-KISAN, PMFBY, KCC, Soil Health Card, PKVY, and state-specific schemes for ${farmer.state}.
Return valid JSON array only, no markdown formatting.`
        );

        const response = await callClaude(systemPrompt, `Farmer profile: ${JSON.stringify({
          state: farmer.state,
          district: farmer.district,
          landSize: farmer.land_size_acres,
          crop: farmer.primary_crop,
          income: farmer.income_bracket,
          caste: farmer.caste_category,
        })}`);

        let content = response.trim();
        if (content.startsWith("```json")) {
          content = content.replace(/```json\n?/, "").replace(/```$/, "");
        }
        if (content.startsWith("```")) {
          content = content.replace(/```\n?/, "").replace(/```$/, "");
        }

        schemes = JSON.parse(content);
      } catch {
        // Fall back to mock schemes
      }
    }

    const result = { schemes, updatedAt: new Date().toISOString() };

    // Cache for 24 hours
    await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL);

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

// POST also supported for backwards compatibility
export async function POST(
  req: Request,
  { params }: { params: Promise<{ farmerId: string }> }
) {
  return GET(req, { params });
}

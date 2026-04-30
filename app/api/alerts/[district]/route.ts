import { NextResponse } from "next/server";
import type { DiseaseAlert } from "@/lib/types";

/**
 * GET /api/alerts/[district]
 * Returns active disease/pest alerts for the district.
 * TODO: Integrate with ICAR disease monitoring APIs.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ district: string }> }
) {
  const { district } = await params;
  const today = new Date().toISOString().split("T")[0];

  const alerts: DiseaseAlert[] = [
    {
      id: "alert-1",
      title: "Yellow Rust Warning",
      description: `High risk of yellow rust detected in ${district} region. Apply fungicide within 48 hours.`,
      severity: "urgent",
      crop: "Wheat",
      date: today,
    },
    {
      id: "alert-2",
      title: "Aphid Infestation Watch",
      description: "Moderate aphid activity observed in surrounding areas. Monitor fields closely.",
      severity: "watch",
      crop: "Mustard",
      date: today,
    },
    {
      id: "alert-3",
      title: "Optimal Harvest Window",
      description: "Weather conditions ideal for wheat harvesting in the next 5 days.",
      severity: "info",
      crop: "Wheat",
      date: today,
    },
  ];

  return NextResponse.json(alerts);
}

// ──────────────────────────────────────────────
// GET /api/notifications – Farmer notifications
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/errors";

export async function GET() {
  try {
    // In production, these would come from a notifications table
    // For now, return contextual mock notifications
    const now = new Date();
    return NextResponse.json([
      {
        id: "n1",
        title: "Weather Alert",
        body: "High temperatures expected tomorrow. Ensure adequate irrigation.",
        read: false,
        createdAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      },
      {
        id: "n2",
        title: "Mandi Price Update",
        body: "Wheat prices rose 3.4% in Pratapgarh Mandi today.",
        read: false,
        createdAt: new Date(now.getTime() - 5 * 3600000).toISOString(),
      },
      {
        id: "n3",
        title: "Irrigation Reminder",
        body: "Section C1 moisture is below 40%. Schedule irrigation.",
        read: true,
        createdAt: new Date(now.getTime() - 24 * 3600000).toISOString(),
      },
    ]);
  } catch (err) {
    return handleApiError(err);
  }
}

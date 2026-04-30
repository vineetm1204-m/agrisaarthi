import { NextResponse } from "next/server";
import type { CropTask } from "@/lib/types";

// Crop-specific task timelines (days after sowing)
const CROP_TASKS: Record<string, { task: string; dayStart: number; dayEnd: number }[]> = {
  Wheat: [
    { task: "First Irrigation", dayStart: 21, dayEnd: 25 },
    { task: "First Top Dressing (Urea)", dayStart: 21, dayEnd: 25 },
    { task: "Second Irrigation", dayStart: 40, dayEnd: 45 },
    { task: "Weed Control", dayStart: 25, dayEnd: 35 },
    { task: "Second Top Dressing", dayStart: 40, dayEnd: 50 },
    { task: "Third Irrigation", dayStart: 60, dayEnd: 65 },
    { task: "Pest Monitoring", dayStart: 50, dayEnd: 70 },
    { task: "Fourth Irrigation", dayStart: 80, dayEnd: 85 },
    { task: "Pre-Harvest Assessment", dayStart: 110, dayEnd: 120 },
    { task: "Harvest", dayStart: 135, dayEnd: 150 },
  ],
  Rice: [
    { task: "Nursery Preparation", dayStart: 0, dayEnd: 5 },
    { task: "Transplanting", dayStart: 25, dayEnd: 30 },
    { task: "First Weeding", dayStart: 35, dayEnd: 40 },
    { task: "First Top Dressing", dayStart: 30, dayEnd: 35 },
    { task: "Second Weeding", dayStart: 55, dayEnd: 60 },
    { task: "Pest Control", dayStart: 50, dayEnd: 70 },
    { task: "Drainage Before Harvest", dayStart: 100, dayEnd: 105 },
    { task: "Harvest", dayStart: 120, dayEnd: 130 },
  ],
};

/**
 * GET /api/crop-calendar?crop=Wheat&sowingDate=2025-11-15
 * Returns tasks due this week based on crop type and sowing date.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const crop = searchParams.get("crop") ?? "Wheat";
  const sowingDateStr = searchParams.get("sowingDate");

  if (!sowingDateStr) {
    return NextResponse.json([]);
  }

  const sowingDate = new Date(sowingDateStr);
  const now = new Date();
  const daysSinceSowing = Math.floor(
    (now.getTime() - sowingDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const tasks = CROP_TASKS[crop] ?? CROP_TASKS.Wheat ?? [];
  const weekTasks: CropTask[] = [];

  for (const t of tasks) {
    // Show tasks within 10-day window of current day
    if (Math.abs(daysSinceSowing - t.dayStart) <= 10 || 
        (daysSinceSowing >= t.dayStart - 5 && daysSinceSowing <= t.dayEnd + 5)) {
      const dueDate = new Date(sowingDate);
      dueDate.setDate(dueDate.getDate() + t.dayStart);

      let status: "upcoming" | "today" | "overdue" = "upcoming";
      if (daysSinceSowing > t.dayEnd) {
        status = "overdue";
      } else if (daysSinceSowing >= t.dayStart && daysSinceSowing <= t.dayEnd) {
        status = "today";
      }

      weekTasks.push({
        id: `task-${t.dayStart}`,
        task: t.task,
        dayRange: `Day ${t.dayStart}-${t.dayEnd}`,
        dueDate: dueDate.toISOString().split("T")[0],
        status,
      });
    }
  }

  // If no tasks match the window, show nearest upcoming tasks
  if (weekTasks.length === 0) {
    const upcoming = tasks
      .filter((t) => t.dayStart > daysSinceSowing)
      .slice(0, 3);

    for (const t of upcoming) {
      const dueDate = new Date(sowingDate);
      dueDate.setDate(dueDate.getDate() + t.dayStart);
      weekTasks.push({
        id: `task-${t.dayStart}`,
        task: t.task,
        dayRange: `Day ${t.dayStart}-${t.dayEnd}`,
        dueDate: dueDate.toISOString().split("T")[0],
        status: "upcoming",
      });
    }
  }

  return NextResponse.json(weekTasks);
}

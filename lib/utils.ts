// ──────────────────────────────────────────────
// AgriSaarthi – Utility functions
// ──────────────────────────────────────────────

/**
 * Format a number using the Indian number system (1,00,000 not 100,000).
 */
export function formatIndianNumber(num: number): string {
  const str = Math.round(num).toString();
  const isNegative = str.startsWith("-");
  const absStr = isNegative ? str.slice(1) : str;

  if (absStr.length <= 3) {
    return (isNegative ? "-" : "") + absStr;
  }

  const lastThree = absStr.slice(-3);
  const rest = absStr.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
  return (isNegative ? "-" : "") + formatted;
}

/**
 * Format a date/time string to human-readable time in IST.
 */
export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Format a date to short date string.
 */
export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Get moisture color — blue gradient from light (dry) to dark (wet).
 */
export function getMoistureColor(moisture: number): string {
  // Clamp 0-100
  const m = Math.max(0, Math.min(100, moisture));
  // Light blue (dry) to dark blue (wet)
  const lightness = 85 - (m * 0.5); // 85% (dry) -> 35% (wet)
  const saturation = 50 + (m * 0.3); // 50% -> 80%
  return `hsl(210, ${saturation}%, ${lightness}%)`;
}

/**
 * Get moisture text color for contrast.
 */
export function getMoistureTextColor(moisture: number): string {
  return moisture > 65 ? "#ffffff" : "#1a365d";
}

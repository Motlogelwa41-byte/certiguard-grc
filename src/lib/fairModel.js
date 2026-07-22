export const TEF_VALUES = { low: 0.1, medium: 1, high: 10 };

export function computeFair(input) {
  const tef_level = input.tef_level || "medium";
  const tef = TEF_VALUES[tef_level] ?? 1;
  const vuln = Math.min(Math.max(Number(input.vuln_pct) || 0, 0), 100) / 100;
  const lef = tef * vuln;

  const pMin = Number(input.primary_loss_min) || 0;
  const pMax = Number(input.primary_loss_max) || 0;
  const sMin = Number(input.secondary_loss_min) || 0;
  const sMax = Number(input.secondary_loss_max) || 0;

  const lmMin = pMin + sMin;
  const lmMax = pMax + sMax;
  const lmAvg = (lmMin + lmMax) / 2;

  const aleMin = lef * lmMin;
  const aleMax = lef * lmMax;
  const aleAvg = lef * lmAvg;

  let exposure = "low";
  if (aleAvg >= 2000000) exposure = "critical";
  else if (aleAvg >= 500000) exposure = "high";
  else if (aleAvg >= 50000) exposure = "medium";

  return {
    tef_level, tef_value: tef, vuln_pct: Number(input.vuln_pct) || 0, lef,
    primary_loss_min: pMin, primary_loss_max: pMax,
    secondary_loss_min: sMin, secondary_loss_max: sMax,
    loss_magnitude_min: lmMin, loss_magnitude_max: lmMax, loss_magnitude_avg: lmAvg,
    ale_min: aleMin, ale_max: aleMax, ale_avg: aleAvg,
    exposure_rating: exposure,
  };
}

export function formatZAR(n) {
  return "R " + Math.round(Number(n) || 0).toLocaleString("en-ZA");
}

export const EXPOSURE_STYLE = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};
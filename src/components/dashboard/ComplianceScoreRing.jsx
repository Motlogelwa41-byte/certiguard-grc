import React from "react";

export default function ComplianceScoreRing({ score = 0, size = 120 }) {
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Strong" : score >= 60 ? "Moderate" : "At Risk";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="700" fill="currentColor" className="fill-foreground">{score}%</text>
        <text x="50" y="62" textAnchor="middle" fontSize="9" fill="currentColor" className="fill-muted-foreground">{label}</text>
      </svg>
      <p className="text-xs text-muted-foreground font-medium">Compliance Score</p>
    </div>
  );
}
import React from "react";

export default function ComplianceScoreRing({ score = 0, size = 120 }) {
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Strong" : score >= 60 ? "Moderate" : "At Risk";
  const glowId = `glow-${color.replace("#", "")}`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={size} height={size} viewBox="0 0 100 100" className="drop-shadow-sm">
          <defs>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={`grad-${color.replace("#", "")}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" opacity="0.4" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={`url(#grad-${color.replace("#", "")})`} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            filter={`url(#${glowId})`}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />
          <text x="50" y="45" textAnchor="middle" fontSize="20" fontWeight="800" fill="white" className="fill-foreground">{score}%</text>
          <text x="50" y="60" textAnchor="middle" fontSize="8" fontWeight="600" fill={color} className="uppercase tracking-wider">{label}</text>
        </svg>
      </div>
      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Compliance Score</p>
    </div>
  );
}
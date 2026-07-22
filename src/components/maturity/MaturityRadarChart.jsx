import React from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { GRC_DOMAINS } from "@/lib/grcMaturity";

export default function MaturityRadarChart({ domains }) {
  const data = GRC_DOMAINS.map((d) => {
    const s = (domains || []).find((x) => x.domain === d.key) || {};
    const label = d.name.split(" ")[0];
    return {
      domain: label,
      Current: s.current_level || 0,
      Target: s.target_level || 0,
    };
  });
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="domain" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 5]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
        <Radar name="Current" dataKey="Current" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
        <Radar name="Target" dataKey="Target" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}
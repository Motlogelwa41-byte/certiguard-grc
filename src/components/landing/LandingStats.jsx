import React from "react";

const STATS = [
  { value: "40+", label: "Regulatory frameworks" },
  { value: "16", label: "SADC nations covered" },
  { value: "60+", label: "Automated workflows" },
  { value: "3", label: "Languages (EN · FR · PT)" },
];

export default function LandingStats() {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl font-heading font-bold text-foreground tracking-tight">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
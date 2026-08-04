import React from "react";
import { Globe2, MapPin, Landmark, Languages } from "lucide-react";

const POINTS = [
  {
    icon: Landmark,
    title: "Native African regulatory coverage",
    desc: "SADC Model Law, POPIA, and cross-border data sovereignty checks built in — not bolted on. 16 SADC nations supported out of the box.",
  },
  {
    icon: Globe2,
    title: "Cross-border data transfer intelligence",
    desc: "Automated checks flag when data moves across jurisdictions with different protection levels — critical for multi-country African operations.",
  },
  {
    icon: Languages,
    title: "Multi-language from day one",
    desc: "English, French, and Portuguese — covering the three official SADC working languages. Swahili and Arabic on the roadmap.",
  },
  {
    icon: MapPin,
    title: "Local payment options",
    desc: "DPO Group integration for African payment methods alongside global billing. NGO and localized pricing tiers available.",
  },
];

export default function LandingGeo() {
  return (
    <section id="geo" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Why CertiGuard</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-heading font-bold text-foreground tracking-tight">
              Global GRC with an Africa-first edge
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Drata and Vanta are built for US and EU markets. CertiGuard GRC is built for the world —
              with deep, native coverage of the regulations that actually govern African businesses.
            </p>

            <div className="mt-8 space-y-5">
              {POINTS.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="flex gap-4">
                    <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/15">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-foreground">{p.title}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map / coverage visual */}
          <div className="relative rounded-2xl border border-border bg-gradient-to-br from-[hsl(222_47%_11%)] to-[hsl(215_28%_9%)] p-8 overflow-hidden">
            <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[hsl(160_84%_37%)]/20 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[hsl(160_84%_60%)]">
                <Globe2 className="w-5 h-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Coverage Map</span>
              </div>
              <h3 className="mt-3 text-xl font-heading font-bold text-white">SADC Member States</h3>
              <p className="mt-1 text-sm text-slate-400">16 nations with native regulatory alignment</p>

              <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
                {[
                  "South Africa", "Botswana", "Zimbabwe", "Zambia",
                  "Namibia", "Mozambique", "Tanzania", "Malawi",
                  "Lesotho", "Eswatini", "Angola", "DRC",
                  "Madagascar", "Mauritius", "Seychelles", "Comoros",
                ].map((country) => (
                  <div key={country} className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-[hsl(160_84%_55%)] shrink-0" />
                    <span className="truncate">{country}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
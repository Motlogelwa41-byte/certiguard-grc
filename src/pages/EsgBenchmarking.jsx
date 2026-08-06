import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { Leaf, Globe2, Users, TrendingUp, Award, Building2 } from "lucide-react";

// ESG framework benchmarks (industry averages)
const ESG_BENCHMARKS = {
  "GRI Standards": { E: 72, S: 75, G: 78 },
  "SASB (Tech)": { E: 68, S: 73, G: 76 },
  "SASB (Financial)": { E: 65, S: 78, G: 82 },
  "TCFD": { E: 70, S: 72, G: 80 },
  "UN SDGs": { E: 74, S: 76, G: 77 },
  "SADC ESG Avg": { E: 62, S: 68, G: 72 },
};

const ESG_DIMENSIONS = [
  { key: "environmental", label: "Environmental", icon: Leaf, color: "text-emerald-500", desc: "Carbon footprint, energy use, waste, water" },
  { key: "social", label: "Social", icon: Users, color: "text-blue-500", desc: "Diversity, labor practices, community, health & safety" },
  { key: "governance", label: "Governance", icon: Building2, color: "text-purple-500", desc: "Board independence, ethics, compliance, transparency" },
];

export default function EsgBenchmarking() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState("GRI Standards");

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.EsgMetric.list("-updated_date", 200);
      setMetrics(data || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Calculate ESG scores from metrics
  const calcDimensionScore = (dim) => {
    const dimMetrics = metrics.filter(m => m.dimension === dim && m.actual_value != null && m.target_value != null);
    if (dimMetrics.length === 0) return 0;
    const scores = dimMetrics.map(m => {
      const ratio = m.better_direction === "higher" ? m.actual_value / m.target_value : m.target_value / m.actual_value;
      return Math.min(100, Math.max(0, Math.round(ratio * 100)));
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const myScores = {
    E: calcDimensionScore("environmental"),
    S: calcDimensionScore("social"),
    G: calcDimensionScore("governance"),
  };
  const overallScore = Math.round((myScores.E + myScores.S + myScores.G) / 3);

  const benchmark = ESG_BENCHMARKS[selectedFramework] || ESG_BENCHMARKS["GRI Standards"];

  const radarData = [
    { dimension: "Environmental", you: myScores.E, benchmark: benchmark.E },
    { dimension: "Social", you: myScores.S, benchmark: benchmark.S },
    { dimension: "Governance", you: myScores.G, benchmark: benchmark.G },
  ];

  const barData = [
    { metric: "Environmental", yours: myScores.E, industry: benchmark.E },
    { metric: "Social", yours: myScores.S, industry: benchmark.S },
    { metric: "Governance", yours: myScores.G, industry: benchmark.G },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="ESG Benchmarking & Framework Alignment"
        subtitle="Compare your ESG performance against GRI, SASB, TCFD, UN SDGs, and SADC industry averages"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Overall ESG Score" value={`${overallScore}/100`} icon={Award} color="green" />
        <StatCard label="Environmental" value={`${myScores.E}/100`} icon={Leaf} color="green" />
        <StatCard label="Social" value={`${myScores.S}/100`} icon={Users} color="blue" />
        <StatCard label="Governance" value={`${myScores.G}/100`} icon={Building2} color="purple" />
      </div>

      {/* Framework selector */}
      <Card>
        <CardHeader><CardTitle>ESG Framework Benchmark</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(ESG_BENCHMARKS).map(fw => (
              <Badge key={fw} variant={selectedFramework === fw ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedFramework(fw)}>
                {fw}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ESG_DIMENSIONS.map(dim => {
              const myScore = myScores[dim.key === "environmental" ? "E" : dim.key === "social" ? "S" : "G"];
              const benchScore = benchmark[dim.key === "environmental" ? "E" : dim.key === "social" ? "S" : "G"];
              const diff = myScore - benchScore;
              return (
                <div key={dim.key} className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <dim.icon className={`h-5 w-5 ${dim.color}`} />
                    <span className="font-medium">{dim.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{myScore}</span>
                    <span className="text-xs text-muted-foreground">vs {benchScore} ({selectedFramework})</span>
                  </div>
                  <div className={`text-xs mt-1 ${diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-amber-500"}`}>
                    {diff > 0 ? `+${diff} above benchmark` : diff < 0 ? `${diff} below benchmark` : "At benchmark"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{dim.desc}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>ESG Score vs Benchmark</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="yours" fill="hsl(var(--chart-2))" name="Your Org" radius={[4, 4, 0, 0]} />
                <Bar dataKey="industry" fill="hsl(var(--chart-3))" name={selectedFramework} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>ESG Radar — 3 Dimensions</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid className="opacity-30" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar name="Your Org" dataKey="you" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} />
                <Radar name={selectedFramework} dataKey="benchmark" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.2} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ESG metrics table */}
      <Card>
        <CardHeader><CardTitle>ESG Metrics Inventory</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
          ) : metrics.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No ESG metrics recorded. Add ESG metrics from the ESG Reporting page to see benchmarks.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left bg-muted/50">
                    <th className="p-3 font-medium">Metric</th>
                    <th className="p-3 font-medium">Dimension</th>
                    <th className="p-3 font-medium">Actual</th>
                    <th className="p-3 font-medium">Target</th>
                    <th className="p-3 font-medium">Unit</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.slice(0, 15).map(m => (
                    <tr key={m.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{m.metric_name || m.name}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs">{m.dimension || "—"}</Badge></td>
                      <td className="p-3 font-mono">{m.actual_value ?? "—"}</td>
                      <td className="p-3 font-mono text-muted-foreground">{m.target_value ?? "—"}</td>
                      <td className="p-3 text-xs">{m.unit || "—"}</td>
                      <td className="p-3"><Badge variant={m.status === "on_track" ? "default" : m.status === "warning" ? "secondary" : "destructive"} className="text-xs">{m.status || "—"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Framework alignment info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe2 className="h-5 w-5" /> ESG Framework Alignment Guide</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "GRI Standards", desc: "Global Reporting Initiative — comprehensive sustainability reporting (GRI 1-3, 200-300 series)", focus: "Stakeholder-focused, materiality-based" },
              { name: "SASB Standards", desc: "Sustainability Accounting Standards Board — industry-specific financial materiality", focus: "Investor-focused, 77 industries" },
              { name: "TCFD", desc: "Task Force on Climate-related Financial Disclosures — climate risk governance & strategy", focus: "Climate risk, financial impact" },
              { name: "UN SDGs", desc: "UN Sustainable Development Goals — 17 goals, 169 targets for global sustainability", focus: "Global development alignment" },
            ].map(fw => (
              <div key={fw.name} className="p-3 rounded-lg border bg-muted/30">
                <div className="font-medium text-sm">{fw.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{fw.desc}</div>
                <div className="text-xs text-muted-foreground mt-1"><strong>Focus:</strong> {fw.focus}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
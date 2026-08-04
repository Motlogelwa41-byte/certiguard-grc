import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Plus, Trophy, Pencil, Trash2, Sparkles, Loader2, TrendingUp, TrendingDown } from "lucide-react";

const INDUSTRIES = ["Financial Services", "Healthcare", "Technology/SaaS", "Mining", "Retail", "Public Sector"];
const FRAMEWORKS = [
  { code: "ISO", name: "ISO 27001" },
  { code: "SOC2", name: "SOC 2" },
  { code: "NIST", name: "NIST CSF" },
  { code: "GDPR", name: "GDPR" },
  { code: "POPIA", name: "POPIA" },
];

const emptyForm = {
  industry: "Financial Services", framework_code: "ISO", framework_name: "ISO 27001",
  metric_name: "", your_value: 0, industry_median: 0, top_quartile: 0, bottom_quartile: 0,
  percentile_rank: 50, benchmark_period: new Date().getFullYear().toString(),
  unit: "%", better_direction: "higher", notes: "",
};

export default function ComplianceBenchmarking() {
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [industry, setIndustry] = useState("Financial Services");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    base44.entities.ComplianceBenchmark.filter({ industry }, "-created_date")
      .then((d) => setBenchmarks(d || []))
      .catch(() => toast({ title: "Failed to load benchmarks", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [industry, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, industry }); setDialogOpen(true); };
  const openEdit = (b) => { setEditing(b); setForm({ ...emptyForm, ...b }); setDialogOpen(true); };

  const save = async () => {
    if (!form.metric_name || !form.industry) {
      toast({ title: "Metric name and industry are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const fw = FRAMEWORKS.find((f) => f.code === form.framework_code);
      const payload = { ...form, framework_name: fw?.name || form.framework_name };
      if (editing) {
        await base44.entities.ComplianceBenchmark.update(editing.id, payload);
        toast({ title: "Benchmark updated" });
      } else {
        await base44.entities.ComplianceBenchmark.create(payload);
        toast({ title: "Benchmark added" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b) => {
    if (!confirm(`Delete "${b.metric_name}"?`)) return;
    try {
      await base44.entities.ComplianceBenchmark.delete(b.id);
      toast({ title: "Benchmark deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const runAiInsight = async () => {
    if (benchmarks.length === 0) {
      toast({ title: "Add benchmarks first", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    setAiInsight(null);
    try {
      const summary = benchmarks.map((b) => ({
        metric: b.metric_name, your: b.your_value, median: b.industry_median,
        top: b.top_quartile, percentile: b.percentile_rank, better: b.better_direction,
      }));
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a GRC benchmarking analyst. Compare this organisation's compliance metrics against industry peers and provide actionable insights.\n\nIndustry: ${industry}\nMetrics (JSON): ${JSON.stringify(summary)}\n\nProvide:\n1. Top 3 areas where the organisation LAGS peers (with specific gap and recommended action)\n2. Top 2 areas where the organisation LEADS peers\n3. Overall percentile assessment and one strategic recommendation\n\nBe concise and specific. Use bullet points.`,
      });
      setAiInsight(res || "No insight generated.");
    } catch (e) {
      toast({ title: "AI analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const chartData = benchmarks.map((b) => ({
    metric: b.metric_name.length > 18 ? b.metric_name.slice(0, 16) + "…" : b.metric_name,
    You: b.your_value, "Industry Median": b.industry_median, "Top Quartile": b.top_quartile,
  }));

  const gapBadge = (b) => {
    const isBetter = b.better_direction === "higher" ? b.your_value >= b.industry_median : b.your_value <= b.industry_median;
    return isBetter
      ? { icon: TrendingUp, cls: "text-emerald-600 dark:text-emerald-400", label: "Above median" }
      : { icon: TrendingDown, cls: "text-red-600 dark:text-red-400", label: "Below median" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Compliance Benchmarking"
        subtitle="Compare your compliance posture against industry peers and top performers"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={runAiInsight} variant="outline" size="sm" disabled={aiLoading || benchmarks.length === 0}>
              {aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {aiLoading ? "Analyzing…" : "AI Insights"}
            </Button>
            <Button onClick={openCreate} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Benchmark
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-5 h-5 text-primary" />
        <Label>Industry cohort:</Label>
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {benchmarks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-foreground">No benchmarks for {industry} yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Add benchmark metrics to compare your control pass rate, remediation speed, and risk density against industry peers.
          </p>
        </div>
      ) : (
        <>
          {/* Comparison chart */}
          <div className="rounded-xl border border-border bg-card p-5 mb-6">
            <h3 className="font-heading font-semibold text-foreground mb-4">Performance vs Industry</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="metric" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="You" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Industry Median" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Top Quartile" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* AI insight panel */}
          {aiInsight && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">AI Benchmark Analysis</h3>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{aiInsight}</div>
            </div>
          )}

          {/* Benchmark table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Metric</th>
                  <th className="text-left font-medium px-4 py-3">Framework</th>
                  <th className="text-right font-medium px-4 py-3">You</th>
                  <th className="text-right font-medium px-4 py-3">Median</th>
                  <th className="text-right font-medium px-4 py-3">Top Q</th>
                  <th className="text-right font-medium px-4 py-3">Percentile</th>
                  <th className="text-left font-medium px-4 py-3">Gap</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {benchmarks.map((b) => {
                  const gap = gapBadge(b);
                  const GapIcon = gap.icon;
                  return (
                    <tr key={b.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{b.metric_name}</p>
                        <p className="text-xs text-muted-foreground">{b.benchmark_period} · {b.unit}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{b.framework_name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">{b.your_value} {b.unit}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{b.industry_median} {b.unit}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{b.top_quartile} {b.unit}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{b.percentile_rank}%</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${gap.cls}`}>
                          <GapIcon className="w-3.5 h-3.5" /> {gap.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(b)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(b)} className="p-1 text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Benchmark" : "Add Benchmark Metric"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Industry</Label>
                <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Framework</Label>
                <Select value={form.framework_code} onValueChange={(v) => setForm({ ...form, framework_code: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FRAMEWORKS.map((f) => <SelectItem key={f.code} value={f.code}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Metric name</Label>
              <Input value={form.metric_name} onChange={(e) => setForm({ ...form, metric_name: e.target.value })} placeholder="e.g. Control pass rate" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Your value</Label>
                <Input type="number" value={form.your_value} onChange={(e) => setForm({ ...form, your_value: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Industry median</Label>
                <Input type="number" value={form.industry_median} onChange={(e) => setForm({ ...form, industry_median: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Top quartile</Label>
                <Input type="number" value={form.top_quartile} onChange={(e) => setForm({ ...form, top_quartile: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Bottom quartile</Label>
                <Input type="number" value={form.bottom_quartile} onChange={(e) => setForm({ ...form, bottom_quartile: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Percentile rank</Label>
                <Input type="number" value={form.percentile_rank} onChange={(e) => setForm({ ...form, percentile_rank: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="%, days" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Period</Label>
                <Input value={form.benchmark_period} onChange={(e) => setForm({ ...form, benchmark_period: e.target.value })} />
              </div>
              <div>
                <Label>Better direction</Label>
                <Select value={form.better_direction} onValueChange={(v) => setForm({ ...form, better_direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="higher">Higher is better</SelectItem>
                    <SelectItem value="lower">Lower is better</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
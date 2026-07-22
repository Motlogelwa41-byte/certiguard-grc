import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { computeFair, formatZAR, EXPOSURE_STYLE } from "@/lib/fairModel";

const LEVELS = ["low", "medium", "high"];
const today = new Date().toISOString().slice(0, 10);
const empty = { risk_title: "", scenario_name: "", threat_agent: "", tef_level: "medium", vuln_pct: 50, primary_loss_min: "", primary_loss_max: "", secondary_loss_min: "", secondary_loss_max: "", analyst_name: "", analysis_date: today, notes: "" };

export default function FairAnalysisForm({ open, onOpenChange, editing, risks, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(editing ? { ...empty, ...editing } : empty); }, [editing, open]);

  const preview = useMemo(() => computeFair(form), [form]);

  const submit = async () => {
    if (!form.risk_title || !form.scenario_name) return;
    setSaving(true);
    try {
      const payload = { ...computeFair(form), risk_title: form.risk_title, scenario_name: form.scenario_name, threat_agent: form.threat_agent, analyst_name: form.analyst_name, analysis_date: form.analysis_date, notes: form.notes, risk_id: form.risk_id };
      if (editing) await base44.entities.RiskQuantification.update(editing.id, payload);
      else await base44.entities.RiskQuantification.create(payload);
      onSaved?.();
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit FAIR analysis" : "New FAIR analysis"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Risk title</Label><Input value={form.risk_title || ""} onChange={(e) => setForm({ ...form, risk_title: e.target.value })} placeholder="e.g. Ransomware data exfiltration" /></div>
            <div><Label>Scenario</Label><Input value={form.scenario_name || ""} onChange={(e) => setForm({ ...form, scenario_name: e.target.value })} placeholder="e.g. External actor encrypts prod DB" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Linked risk (optional)</Label>
              <Select value={form.risk_id || ""} onValueChange={(v) => { const r = risks.find((x) => x.id === v); setForm({ ...form, risk_id: v, risk_title: r?.title || form.risk_title }); }}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>{(risks || []).map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Threat agent</Label><Input value={form.threat_agent || ""} onChange={(e) => setForm({ ...form, threat_agent: e.target.value })} placeholder="e.g. Cybercriminal group" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Threat event frequency</Label><Select value={form.tef_level} onValueChange={(v) => setForm({ ...form, tef_level: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEVELS.map((s) => <SelectItem key={s} value={s}>{s} ({s === "low" ? "0.1/yr" : s === "medium" ? "1/yr" : "10/yr"})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Vulnerability %</Label><Input type="number" min="0" max="100" value={form.vuln_pct ?? ""} onChange={(e) => setForm({ ...form, vuln_pct: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Primary loss min (ZAR)</Label><Input type="number" value={form.primary_loss_min ?? ""} onChange={(e) => setForm({ ...form, primary_loss_min: e.target.value })} /></div>
            <div><Label>Primary loss max (ZAR)</Label><Input type="number" value={form.primary_loss_max ?? ""} onChange={(e) => setForm({ ...form, primary_loss_max: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Secondary loss min (ZAR)</Label><Input type="number" value={form.secondary_loss_min ?? ""} onChange={(e) => setForm({ ...form, secondary_loss_min: e.target.value })} /></div>
            <div><Label>Secondary loss max (ZAR)</Label><Input type="number" value={form.secondary_loss_max ?? ""} onChange={(e) => setForm({ ...form, secondary_loss_max: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Analyst</Label><Input value={form.analyst_name || ""} onChange={(e) => setForm({ ...form, analyst_name: e.target.value })} /></div>
            <div><Label>Analysis date</Label><Input type="date" value={form.analysis_date || ""} onChange={(e) => setForm({ ...form, analysis_date: e.target.value })} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground uppercase mb-2">Live FAIR computation</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Loss Event Frequency</span><br /><span className="font-semibold">{preview.lef.toFixed(2)} /yr</span></div>
              <div><span className="text-muted-foreground">Loss Magnitude (avg)</span><br /><span className="font-semibold">{formatZAR(preview.loss_magnitude_avg)}</span></div>
              <div><span className="text-muted-foreground">ALE range</span><br /><span className="font-semibold">{formatZAR(preview.ale_min)} – {formatZAR(preview.ale_max)}</span></div>
              <div><span className="text-muted-foreground">Exposure</span><br /><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${EXPOSURE_STYLE[preview.exposure_rating]}`}>{preview.exposure_rating}</span></div>
            </div>
            <div className="mt-2 pt-2 border-t border-border"><span className="text-muted-foreground text-sm">Annualized Loss Expectancy (avg): </span><span className="font-bold text-lg">{formatZAR(preview.ale_avg)}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.risk_title || !form.scenario_name}>{saving ? "Saving…" : "Save analysis"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileDown, Plus, Pencil, Trash2, Loader2, LayoutDashboard, Save, X, Calendar, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import jsPDF from "jspdf";

const SECTION_TYPES = [
  { value: "executive_summary", label: "Executive Summary", icon: "📋", description: "High-level compliance posture overview" },
  { value: "framework_readiness", label: "Framework Readiness", icon: "📊", description: "Readiness scores by framework" },
  { value: "control_status", label: "Control Status", icon: "✅", description: "Pass/fail breakdown of all controls" },
  { value: "risk_overview", label: "Risk Overview", icon: "⚠️", description: "Risk distribution and top risks" },
  { value: "evidence_summary", label: "Evidence Summary", icon: "📁", description: "Evidence collection status" },
  { value: "kpi_dashboard", label: "KPI Dashboard", icon: "📈", description: "Key performance indicators" },
  { value: "audit_summary", label: "Audit Summary", icon: "🔍", description: "Audit status and findings" },
  { value: "incident_summary", label: "Incident Summary", icon: "🚨", description: "Open and recent incidents" },
  { value: "vendor_summary", label: "Vendor Summary", icon: "🏢", description: "Vendor risk assessments" },
  { value: "custom_table", label: "Custom Table", icon: "📑", description: "Custom data table with filters" },
];

export default function CustomReportBuilder() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", sections: [], format: "pdf", schedule_frequency: "on_demand", schedule_recipients: "" });

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const items = await base44.entities.ReportTemplate.list("-created_date", 50);
      setTemplates(items);
    } catch (e) { toast({ title: "Failed to load templates", description: e.message, variant: "destructive" }); }
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", sections: [{ id: "s1", type: "executive_summary", title: "Executive Summary" }], format: "pdf", schedule_frequency: "on_demand", schedule_recipients: "" });
    setOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description || "",
      sections: t.sections ? JSON.parse(t.sections) : [],
      format: t.format || "pdf",
      schedule_frequency: t.schedule_frequency || "on_demand",
      schedule_recipients: t.schedule_recipients ? JSON.parse(t.schedule_recipients).join(", ") : "",
    });
    setOpen(true);
  };

  const addSection = (type) => {
    const config = SECTION_TYPES.find((s) => s.value === type);
    setForm({ ...form, sections: [...form.sections, { id: `s${Date.now()}`, type, title: config?.label || type }] });
  };

  const removeSection = (id) => {
    setForm({ ...form, sections: form.sections.filter((s) => s.id !== id) });
  };

  const moveSection = (idx, dir) => {
    const newSections = [...form.sections];
    const target = idx + dir;
    if (target < 0 || target >= newSections.length) return;
    [newSections[idx], newSections[target]] = [newSections[target], newSections[idx]];
    setForm({ ...form, sections: newSections });
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const recipients = form.schedule_recipients.split(",").map((e) => e.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      description: form.description,
      sections: JSON.stringify(form.sections),
      format: form.format,
      schedule_frequency: form.schedule_frequency,
      schedule_recipients: JSON.stringify(recipients),
      status: "active",
    };
    try {
      if (editing) {
        await base44.entities.ReportTemplate.update(editing.id, payload);
        toast({ title: "Template updated" });
      } else {
        await base44.entities.ReportTemplate.create(payload);
        toast({ title: "Template created" });
      }
      setOpen(false);
      loadTemplates();
    } catch (e) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.ReportTemplate.delete(id);
      toast({ title: "Template deleted" });
      loadTemplates();
    } catch (e) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
  };

  const generateReport = async (template) => {
    setGenerating(template.id);
    try {
      const [controls, risks, evidence, audits, incidents, tasks, frameworks, vendors] = await Promise.all([
        base44.entities.Control.list().catch(() => []),
        base44.entities.Risk.list().catch(() => []),
        base44.entities.Evidence.list().catch(() => []),
        base44.entities.Audit.list().catch(() => []),
        base44.entities.Incident.list().catch(() => []),
        base44.entities.ComplianceTask.list().catch(() => []),
        base44.entities.Framework.list().catch(() => []),
        base44.entities.Vendor.list().catch(() => []),
      ]);

      const sections = template.sections ? JSON.parse(template.sections) : [];
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      let y = 20;

      // Header
      pdf.setFillColor(30, 41, 59);
      pdf.rect(0, 0, pageWidth, 30, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(template.name, pageWidth / 2, 15, { align: "center" });
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 25, { align: "center" });
      y = 38;

      for (const section of sections) {
        if (y > 260) { pdf.addPage(); y = 20; }
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(section.title, 15, y);
        y += 8;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");

        switch (section.type) {
          case "executive_summary": {
            const passing = controls.filter((c) => c.status === "passing").length;
            const failing = controls.filter((c) => c.status === "failing").length;
            const openRisks = risks.filter((r) => r.status === "open").length;
            const avgScore = frameworks.length > 0 ? Math.round(frameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / frameworks.length) : 0;
            const lines = [
              `Frameworks tracked: ${frameworks.length}`,
              `Total controls: ${controls.length} (${passing} passing, ${failing} failing)`,
              `Open risks: ${openRisks}`,
              `Average readiness score: ${avgScore}%`,
              `Pending tasks: ${tasks.filter((t) => t.status !== "completed").length}`,
              `Open incidents: ${incidents.filter((i) => i.status !== "closed").length}`,
            ];
            lines.forEach((line) => { pdf.text(line, 15, y); y += 6; });
            break;
          }
          case "framework_readiness": {
            frameworks.forEach((fw) => {
              if (y > 270) { pdf.addPage(); y = 20; }
              const score = fw.readiness_score || 0;
              pdf.text(`${fw.name}`, 15, y);
              pdf.text(`${Math.round(score)}%`, pageWidth - 15, y, { align: "right" });
              pdf.setFillColor(230, 230, 230);
              pdf.rect(15, y + 2, pageWidth - 30, 4, "F");
              const w = (pageWidth - 30) * (score / 100);
              pdf.setFillColor(score >= 80 ? 16 : score >= 50 ? 245 : 239, score >= 80 ? 185 : score >= 50 ? 158 : 68, score >= 80 ? 129 : score >= 50 ? 11 : 68);
              pdf.rect(15, y + 2, w, 4, "F");
              y += 10;
            });
            break;
          }
          case "control_status": {
            const statuses = ["passing", "failing", "not_tested", "not_applicable"];
            statuses.forEach((s) => {
              const count = controls.filter((c) => c.status === s).length;
              const pct = controls.length > 0 ? Math.round((count / controls.length) * 100) : 0;
              pdf.text(`${s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}: ${count} (${pct}%)`, 15, y);
              y += 6;
            });
            break;
          }
          case "risk_overview": {
            const byCat = {};
            risks.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + 1; });
            Object.entries(byCat).forEach(([cat, count]) => {
              pdf.text(`${cat.replace(/_/g, " ")}: ${count}`, 15, y);
              y += 6;
            });
            const topRisks = risks.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 5);
            y += 3;
            pdf.setFont("helvetica", "bold");
            pdf.text("Top 5 Risks:", 15, y); y += 6;
            pdf.setFont("helvetica", "normal");
            topRisks.forEach((r) => {
              if (y > 270) { pdf.addPage(); y = 20; }
              pdf.text(`• ${r.title} (Score: ${r.risk_score || "N/A"}, Status: ${r.status})`, 15, y);
              y += 6;
            });
            break;
          }
          case "evidence_summary": {
            const approved = evidence.filter((e) => e.status === "approved").length;
            const pending = evidence.filter((e) => e.status === "pending_review").length;
            const rejected = evidence.filter((e) => e.status === "rejected").length;
            pdf.text(`Total evidence items: ${evidence.length}`, 15, y); y += 6;
            pdf.text(`Approved: ${approved}`, 15, y); y += 6;
            pdf.text(`Pending review: ${pending}`, 15, y); y += 6;
            pdf.text(`Rejected: ${rejected}`, 15, y); y += 6;
            break;
          }
          case "kpi_dashboard": {
            const avgEffectiveness = controls.length > 0
              ? Math.round(controls.reduce((s, c) => s + (c.effectiveness_score || 0), 0) / controls.length)
              : 0;
            pdf.text(`Average control effectiveness: ${avgEffectiveness}%`, 15, y); y += 6;
            pdf.text(`Controls with evidence: ${controls.filter((c) => c.evidence_count > 0).length}`, 15, y); y += 6;
            pdf.text(`Automated controls: ${controls.filter((c) => c.automation_status === "automated").length}`, 15, y); y += 6;
            break;
          }
          case "audit_summary": {
            audits.slice(0, 10).forEach((a) => {
              if (y > 270) { pdf.addPage(); y = 20; }
              pdf.text(`• ${a.title} — ${a.status} — ${a.result || "Pending"}`, 15, y);
              y += 6;
            });
            break;
          }
          case "incident_summary": {
            const open = incidents.filter((i) => i.status !== "closed" && i.status !== "false_positive");
            pdf.text(`Open incidents: ${open.length}`, 15, y); y += 6;
            open.slice(0, 8).forEach((i) => {
              if (y > 270) { pdf.addPage(); y = 20; }
              pdf.text(`• [${i.severity}] ${i.title} — ${i.status}`, 15, y);
              y += 6;
            });
            break;
          }
          case "vendor_summary": {
            vendors.slice(0, 10).forEach((v) => {
              if (y > 270) { pdf.addPage(); y = 20; }
              pdf.text(`• ${v.name} — ${v.risk_level || "N/A"} — ${v.status || "active"}`, 15, y);
              y += 6;
            });
            break;
          }
          case "custom_table": {
            pdf.text("Custom table section — configure filters in the template editor.", 15, y);
            y += 6;
            break;
          }
        }
        y += 5;
      }

      // Footer
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Generated by EthicalEdge GRC — Confidential — Page ${i}/${pageCount}`, pageWidth / 2, 290, { align: "center" });
      }

      pdf.save(`${template.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);

      // Update last_generated_at
      await base44.entities.ReportTemplate.update(template.id, { last_generated_at: new Date().toISOString() });
      toast({ title: "Report generated successfully" });
    } catch (e) {
      toast({ title: "Report generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Custom Report Builder" subtitle="Create reusable report templates with drag-and-drop sections — export to PDF with scheduling" />
      <div className="flex items-center gap-2 mb-6">
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New Report Template</Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState icon={LayoutDashboard} title="No report templates yet" description="Create your first custom report template by selecting sections and configuring filters." actionLabel="Create Template" onAction={openNew} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-card rounded-xl border border-border p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{t.name}</h3>
                  {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {t.sections && JSON.parse(t.sections).map((s, i) => (
                  <span key={i} className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">{s.title}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                {t.schedule_frequency !== "on_demand" && <><Calendar className="w-3 h-3" /> {t.schedule_frequency}</>}
                {t.last_generated_at && <span className="ml-auto">Last: {new Date(t.last_generated_at).toLocaleDateString()}</span>}
              </div>
              <Button onClick={() => generateReport(t)} disabled={generating === t.id} className="mt-auto w-full" variant="outline">
                {generating === t.id ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Generating...</> : <><FileDown className="w-4 h-4 mr-1.5" /> Generate PDF</>}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Report Template" : "New Report Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Quarterly Board Compliance Report" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="What does this report cover?" />
            </div>

            {/* Section Builder */}
            <div>
              <Label>Report Sections</Label>
              <div className="space-y-2 mb-3">
                {form.sections.map((s, idx) => {
                  const config = SECTION_TYPES.find((st) => st.value === s.type);
                  return (
                    <div key={s.id} className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveSection(idx, -1)} className="text-muted-foreground hover:text-foreground text-xs">▲</button>
                        <button onClick={() => moveSection(idx, 1)} className="text-muted-foreground hover:text-foreground text-xs">▼</button>
                      </div>
                      <span className="text-lg">{config?.icon || "📄"}</span>
                      <div className="flex-1">
                        <Input value={s.title} onChange={(e) => setForm({ ...form, sections: form.sections.map((x) => x.id === s.id ? { ...x, title: e.target.value } : x) })} className="h-8 text-sm" />
                        <p className="text-[10px] text-muted-foreground mt-0.5">{config?.description}</p>
                      </div>
                      <button onClick={() => removeSection(s.id)} className="p-1 rounded hover:bg-muted text-destructive"><X className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
              <Select onValueChange={addSection}>
                <SelectTrigger><SelectValue placeholder="+ Add Section" /></SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Format & Schedule */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Export Format</Label>
                <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Schedule</Label>
                <Select value={form.schedule_frequency} onValueChange={(v) => setForm({ ...form, schedule_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_demand">On Demand</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.schedule_frequency !== "on_demand" && (
              <div>
                <Label><Mail className="w-3.5 h-3.5 inline mr-1" /> Recipient Emails (comma-separated)</Label>
                <Input value={form.schedule_recipients} onChange={(e) => setForm({ ...form, schedule_recipients: e.target.value })} placeholder="board@company.com, ciso@company.com" />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" /> {editing ? "Update" : "Create"} Template</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
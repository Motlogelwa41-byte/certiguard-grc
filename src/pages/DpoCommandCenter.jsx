import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Mail, Phone, Calendar, AlertTriangle, FileSpreadsheet,
  Lock, Users, FileSearch, Siren, Clock, CheckCircle2, XCircle,
  Building2, Gavel, Loader2, Save, ChevronRight, TrendingUp, Eye
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const REGULATORS = [
  { code: "POPIA", name: "Information Regulator (South Africa)", jurisdiction: "ZA" },
  { code: "GDPR", name: "Supervisory Authority (EU)", jurisdiction: "EU" },
  { code: "BW_DPA", name: "Data Protection Authority (Botswana)", jurisdiction: "BW" },
  { code: "NA_DPA", name: "Data Protection Authority (Namibia)", jurisdiction: "NA" },
  { code: "OTHER", name: "Other / Multi-jurisdictional", jurisdiction: "GLOBAL" },
];

export default function DpoCommandCenter() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingDpo, setSavingDpo] = useState(false);
  const [dpoDesignation, setDpoDesignation] = useState(null);
  const [dpoForm, setDpoForm] = useState({ dpo_name: "", dpo_email: "", dpo_phone: "", dpo_appointed_at: "", dpo_regulator: "POPIA", dpo_registration_ref: "" });

  // Privacy data
  const [dsars, setDsars] = useState([]);
  const [dpias, setDpias] = useState([]);
  const [ropas, setRopas] = useState([]);
  const [consents, setConsents] = useState([]);
  const [breachIncidents, setBreachIncidents] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, dsarList, dpiaList, ropaList, consentList, incidentList] = await Promise.all([
        base44.entities.TenantSettings.list("-updated_date", 5).catch(() => []),
        base44.entities.PrivacyRequest.list("-updated_date", 200).catch(() => []),
        base44.entities.DPIA.list("-updated_date", 200).catch(() => []),
        base44.entities.ROPA.list("-updated_date", 200).catch(() => []),
        base44.entities.ConsentRecord.list("-updated_date", 200).catch(() => []),
        base44.entities.Incident.list("-updated_date", 200).catch(() => []),
      ]);

      // DPO designation from TenantSettings
      const settingsRec = settings?.[0] || null;
      setDpoDesignation(settingsRec);
      if (settingsRec) {
        setDpoForm({
          dpo_name: settingsRec.dpo_name || "",
          dpo_email: settingsRec.dpo_email || "",
          dpo_phone: settingsRec.dpo_phone || "",
          dpo_appointed_at: settingsRec.dpo_appointed_at || "",
          dpo_regulator: settingsRec.dpo_regulator || "POPIA",
          dpo_registration_ref: settingsRec.dpo_registration_ref || "",
        });
      }

      setDsars(dsarList || []);
      setDpias(dpiaList || []);
      setRopas(ropaList || []);
      setConsents(consentList || []);
      // Only incidents that require regulator notification
      setBreachIncidents((incidentList || []).filter((i) => i.notify_regulator === true));
    } catch (e) {
      toast({ title: "Failed to load DPO dashboard", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveDpo = async () => {
    setSavingDpo(true);
    try {
      if (dpoDesignation?.id) {
        await base44.entities.TenantSettings.update(dpoDesignation.id, dpoForm);
      } else {
        const created = await base44.entities.TenantSettings.create({ ...dpoForm, setting_id: "DPO-001" });
        setDpoDesignation(created);
      }
      toast({ title: "DPO designation saved", description: "The Data Protection Officer details have been updated." });
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingDpo(false);
    }
  };

  // Derived metrics
  const today = new Date();
  const dsarOpen = dsars.filter((d) => !["closed", "response_sent", "rejected"].includes(d.status));
  const dsarOverdue = dsars.filter((d) => d.sla_breached || (d.due_date && new Date(d.due_date) < today && !["closed", "response_sent"].includes(d.status)));
  const dsarSlaSoon = dsars.filter((d) => {
    if (!d.due_date || ["closed", "response_sent"].includes(d.status)) return false;
    const days = Math.ceil((new Date(d.due_date) - today) / 86400000);
    return days >= 0 && days <= 7;
  });

  const dpiaHighRisk = dpias.filter((d) => d.residual_risk_level === "high" && d.status !== "completed");
  const dpiaConsultationRequired = dpias.filter((d) => d.consultation_required && !d.regulator_consulted);
  const dpiaOverdue = dpias.filter((d) => d.review_date && new Date(d.review_date) < today && d.status !== "completed");

  const ropaSensitive = ropas.filter((r) => r.sensitive_data);
  const ropaDpiaRequired = ropas.filter((r) => r.dpia_required && !r.dpia_completed);
  const ropaActive = ropas.filter((r) => r.status === "active");

  const consentGiven = consents.filter((c) => c.status === "given");
  const consentWithdrawn = consents.filter((c) => c.status === "withdrawn");
  const consentExpired = consents.filter((c) => c.status === "expired");

  const breachPending = breachIncidents.filter((i) => !["filed", "not_required_confirmed"].includes(i.regulator_notification_status));
  const breachFiled = breachIncidents.filter((i) => i.regulator_notification_status === "filed");
  const breachOverdue = breachIncidents.filter((i) => i.regulator_notification_deadline && new Date(i.regulator_notification_deadline) < today && i.regulator_notification_status !== "filed");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="DPO Command Center"
        subtitle="Centralised oversight for your Data Protection Officer — privacy requests, DPIAs, ROPA, consent, and breach notification."
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Privacy Program
          </Badge>
        }
      />

      {/* DPO Designation Card */}
      <Card className="mb-6 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-5 h-5 text-primary" /> DPO Designation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dpo_name" className="text-xs">DPO Name</Label>
              <Input id="dpo_name" value={dpoForm.dpo_name} onChange={(e) => setDpoForm({ ...dpoForm, dpo_name: e.target.value })} placeholder="e.g. Jane Smith" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dpo_email" className="text-xs">Email</Label>
              <Input id="dpo_email" type="email" value={dpoForm.dpo_email} onChange={(e) => setDpoForm({ ...dpoForm, dpo_email: e.target.value })} placeholder="dpo@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dpo_phone" className="text-xs">Phone</Label>
              <Input id="dpo_phone" value={dpoForm.dpo_phone} onChange={(e) => setDpoForm({ ...dpoForm, dpo_phone: e.target.value })} placeholder="+27..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dpo_appointed" className="text-xs">Appointed</Label>
              <Input id="dpo_appointed" type="date" value={dpoForm.dpo_appointed_at} onChange={(e) => setDpoForm({ ...dpoForm, dpo_appointed_at: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dpo_regulator" className="text-xs">Regulator</Label>
              <select id="dpo_regulator" value={dpoForm.dpo_regulator} onChange={(e) => setDpoForm({ ...dpoForm, dpo_regulator: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                {REGULATORS.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dpo_ref" className="text-xs">Registration Ref</Label>
              <Input id="dpo_ref" value={dpoForm.dpo_registration_ref} onChange={(e) => setDpoForm({ ...dpoForm, dpo_registration_ref: e.target.value })} placeholder="e.g. IR-2026-001" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={saveDpo} disabled={savingDpo} size="sm">
              {savingDpo ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-1.5" /> Save DPO Designation</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alert banners for critical items */}
      {(dsarOverdue.length > 0 || dpiaConsultationRequired.length > 0 || breachOverdue.length > 0) && (
        <div className="space-y-2 mb-6">
          {dsarOverdue.length > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive font-medium">{dsarOverdue.length} privacy request(s) are OVERDUE — statutory deadline breached.</p>
              <Link to="/privacy-requests" className="ml-auto text-xs font-medium text-destructive hover:underline">Review →</Link>
            </div>
          )}
          {dpiaConsultationRequired.length > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <Gavel className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700 font-medium">{dpiaConsultationRequired.length} DPIA(s) with high residual risk require prior consultation with the regulator.</p>
              <Link to="/dpia" className="ml-auto text-xs font-medium text-amber-700 hover:underline">Review →</Link>
            </div>
          )}
          {breachOverdue.length > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
              <Siren className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive font-medium">{breachOverdue.length} breach notification(s) have PASSED the regulatory deadline and are not yet filed.</p>
              <Link to="/incidents" className="ml-auto text-xs font-medium text-destructive hover:underline">Review →</Link>
            </div>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Open DSARs" value={dsarOpen.length} icon={FileSearch} color="blue" trendLabel={`${dsarOverdue.length} overdue`} trend={dsarOverdue.length > 0 ? "down" : "up"} />
        <StatCard label="DPIAs Pending" value={dpias.filter((d) => !["completed", "not_required"].includes(d.status)).length} icon={ShieldCheck} color="purple" trendLabel={`${dpiaHighRisk.length} high risk`} trend={dpiaHighRisk.length > 0 ? "down" : "up"} />
        <StatCard label="Active ROPA" value={ropaActive.length} icon={FileSpreadsheet} color="green" trendLabel={`${ropaSensitive.length} sensitive`} trend="up" />
        <StatCard label="Active Consents" value={consentGiven.length} icon={Lock} color="green" trendLabel={`${consentWithdrawn.length} withdrawn`} trend={consentWithdrawn.length > 0 ? "down" : "up"} />
        <StatCard label="Breaches (Notifiable)" value={breachIncidents.length} icon={Siren} color="red" trendLabel={`${breachPending.length} pending`} trend={breachPending.length > 0 ? "down" : "up"} />
        <StatCard label="DPIA Gaps" value={ropaDpiaRequired.length} icon={AlertTriangle} color="amber" trendLabel="ROPA needing DPIA" trend={ropaDpiaRequired.length > 0 ? "down" : "up"} />
      </div>

      {/* Two-column: DSAR SLA + Breach oversight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* DSAR SLA Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Privacy Request SLA</span>
              <Link to="/privacy-requests" className="text-xs text-primary hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dsarOpen.length === 0 ? (
              <EmptyInline icon={CheckCircle2} text="No open privacy requests" />
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {dsarOpen.slice(0, 8).map((d) => {
                  const daysLeft = d.due_date ? Math.ceil((new Date(d.due_date) - today) / 86400000) : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const isSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                  return (
                  <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{d.requester_name} — <span className="text-muted-foreground capitalize">{d.request_type?.replace(/_/g, " ")}</span></p>
                      <p className="text-xs text-muted-foreground">Due: {d.due_date || "N/A"}</p>
                    </div>
                    {isOverdue ? (
                      <Badge variant="destructive" className="shrink-0">Overdue {Math.abs(daysLeft)}d</Badge>
                    ) : isSoon ? (
                      <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 shrink-0">{daysLeft}d left</Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">{daysLeft !== null ? `${daysLeft}d left` : "No SLA"}</Badge>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Breach Notification Oversight */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><Siren className="w-5 h-5 text-destructive" /> Breach Notification Oversight</span>
              <Link to="/incidents" className="text-xs text-primary hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {breachIncidents.length === 0 ? (
              <EmptyInline icon={CheckCircle2} text="No notifiable breaches recorded" />
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {breachIncidents.slice(0, 8).map((i) => (
                  <div key={i.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{i.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">Severity: {i.severity} · Status: {i.regulator_notification_status?.replace(/_/g, " ")}</p>
                    </div>
                    {i.regulator_notification_status === "filed" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shrink-0 gap-1"><CheckCircle2 className="w-3 h-3" /> Filed</Badge>
                    ) : i.regulator_notification_deadline && new Date(i.regulator_notification_deadline) < today ? (
                      <Badge variant="destructive" className="shrink-0">Overdue</Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 shrink-0">Pending</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DPIA + ROPA overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> DPIA Register</span>
              <Link to="/dpia" className="text-xs text-primary hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MiniStat label="Required" value={dpias.filter((d) => d.status === "required").length} color="text-amber-600" />
              <MiniStat label="In Progress" value={dpias.filter((d) => d.status === "in_progress").length} color="text-blue-600" />
              <MiniStat label="Completed" value={dpias.filter((d) => d.status === "completed").length} color="text-emerald-600" />
              <MiniStat label="Review Due" value={dpiaOverdue.length} color="text-rose-600" />
            </div>
            {dpiaHighRisk.length > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">High residual risk — action required:</p>
                <div className="space-y-1">
                  {dpiaHighRisk.slice(0, 3).map((d) => (
                    <p key={d.id} className="text-xs text-muted-foreground truncate">• {d.title}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" /> ROPA Coverage</span>
              <Link to="/ropa" className="text-xs text-primary hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MiniStat label="Active Activities" value={ropaActive.length} color="text-emerald-600" />
              <MiniStat label="Sensitive Data" value={ropaSensitive.length} color="text-rose-600" />
              <MiniStat label="DPIA Required" value={ropaDpiaRequired.length} color="text-amber-600" />
              <MiniStat label="Under Review" value={ropas.filter((r) => r.status === "under_review").length} color="text-blue-600" />
            </div>
            {ropaDpiaRequired.length > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Processing activities needing a DPIA:</p>
                <div className="space-y-1">
                  {ropaDpiaRequired.slice(0, 3).map((r) => (
                    <p key={r.id} className="text-xs text-muted-foreground truncate">• {r.processing_activity}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Consent + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Lock className="w-5 h-5 text-primary" /> Consent Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ConsentBar label="Given" count={consentGiven.length} total={consents.length} color="bg-emerald-500" />
              <ConsentBar label="Pending" count={consents.filter((c) => c.status === "pending").length} total={consents.length} color="bg-amber-500" />
              <ConsentBar label="Withdrawn" count={consentWithdrawn.length} total={consents.length} color="bg-rose-500" />
              <ConsentBar label="Expired" count={consentExpired.length} total={consents.length} color="bg-slate-400" />
            </div>
            {consents.length === 0 && <EmptyInline icon={Lock} text="No consent records yet" />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Privacy Program Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { to: "/privacy-requests", icon: FileSearch, label: "Privacy Requests" },
                { to: "/dpia", icon: ShieldCheck, label: "DPIA Register" },
                { to: "/ropa", icon: FileSpreadsheet, label: "ROPA" },
                { to: "/privacy-data-mapping", icon: Eye, label: "Data Flow Mapping" },
                { to: "/incidents", icon: Siren, label: "Incident & Breach" },
                { to: "/data-privacy", icon: Lock, label: "Data Privacy Hub" },
                { to: "/policies", icon: FileSpreadsheet, label: "Privacy Policies" },
                { to: "/training", icon: Users, label: "Privacy Training" },
                { to: "/audit-trail", icon: Clock, label: "Audit Trail" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="group flex items-center gap-2.5 rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-primary/5 transition-all">
                  <l.icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium flex-1">{l.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className={`text-2xl font-heading font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function ConsentBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyInline({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="w-8 h-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Pencil, Trash2, Award, Search, RefreshCw, Eye } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import CertificationForm from "@/components/certifications/CertificationForm";

export default function Certifications() {
  const [certs, setCerts] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Certification.list("-created_date", 500),
      base44.entities.Framework.list("-created_date", 200),
      base44.entities.Control.list("-created_date", 500),
    ]).then(([c, f, ctrl]) => { setCerts(c || []); setFrameworks(f || []); setControls(ctrl || []); })
      .catch(() => toast({ title: "Failed to load certifications", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const scan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("scanCertificationExpiry", {});
      const d = res.data || res;
      toast({ title: "Scan complete", description: `${d.scanned} scanned · ${d.updated} updated · ${d.tasksCreated} renewal tasks created` });
      load();
    } catch (e) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const handleDelete = async (cert) => {
    if (!confirm(`Delete certification "${cert.name}"?`)) return;
    try {
      await base44.entities.Certification.delete(cert.id);
      load();
      toast({ title: "Certification deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const filtered = certs.filter((c) => {
    if (search && !`${c.name} ${c.standard} ${c.certifying_body}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  const certified = certs.filter((c) => c.status === "certified").length;
  const dueRenewal = certs.filter((c) => c.renewal_status === "due_soon" || c.renewal_status === "in_renewal").length;
  const expired = certs.filter((c) => c.renewal_status === "expired" || c.status === "expired" || c.status === "lapsed").length;

  return (
    <div>
      <PageHeader
        title="Certifications"
        subtitle="Formal certification lifecycle management — plan, track audits, manage renewals and surveillance"
        actions={
          <>
            <Button variant="outline" onClick={scan} disabled={scanning}>
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Scan renewals
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> New certification</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={certs.length} icon={Award} color="blue" />
        <StatCard label="Certified" value={certified} icon={Award} color="green" />
        <StatCard label="Due Renewal" value={dueRenewal} icon={Award} color={dueRenewal ? "amber" : "slate"} />
        <StatCard label="Expired/Lapsed" value={expired} icon={Award} color={expired ? "red" : "slate"} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search certifications…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["planned", "gap_assessment", "implementation", "audit_in_progress", "remediation", "certified", "suspended", "expired", "lapsed"].map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Award className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No certifications yet. Start tracking your SOC 2 or ISO 27001 lifecycle.</p>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> New certification</Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Certification</th>
                  <th className="text-left px-4 py-3">Body</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Renewal</th>
                  <th className="text-left px-4 py-3">Expiry</th>
                  <th className="text-left px-4 py-3">Evidence</th>
                  <th className="text-left px-4 py-3">Owner</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <Link to={`/certifications/${c.id}`} className="font-medium text-foreground hover:underline">{c.name}</Link>
                      <div className="text-xs text-muted-foreground">{c.standard}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.certifying_body || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3"><StatusBadge status={c.renewal_status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.expiry_date || "—"}</td>
                    <td className="px-4 py-3">
                      {(c.linked_control_ids || []).length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-xs font-semibold ${c.evidence_coverage_pct >= 100 ? "text-emerald-600" : c.evidence_coverage_pct >= 50 ? "text-amber-600" : "text-red-600"}`}>{c.evidence_coverage_pct ?? 0}% covered</span>
                          {c.expiring_evidence_count > 0 && <span className="text-xs text-amber-600">{c.expiring_evidence_count} expiring</span>}
                          <span className="text-xs text-muted-foreground">{c.linked_evidence_count ?? 0} approved</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.owner_name || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" asChild><Link to={`/certifications/${c.id}`}><Eye className="w-4 h-4" /></Link></Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(c)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CertificationForm open={formOpen} onOpenChange={setFormOpen} editing={editing} frameworks={frameworks} controls={controls} onSaved={load} />
    </div>
  );
}
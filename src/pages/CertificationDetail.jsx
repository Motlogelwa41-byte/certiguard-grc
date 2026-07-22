import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, Building2, Calendar, User } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import LifecycleTimeline from "@/components/certifications/LifecycleTimeline";
import MilestoneDialog from "@/components/certifications/MilestoneDialog";

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function CertificationDetail() {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Certification.get(id),
      base44.entities.CertificationMilestone.filter({ certification_id: id }, "order", 200),
    ]).then(([c, m]) => { setCert(c); setMilestones(m || []); })
      .catch(() => toast({ title: "Certification not found", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const deleteMilestone = async (m) => {
    if (!confirm(`Delete milestone "${m.title}"?`)) return;
    await base44.entities.CertificationMilestone.delete(m.id);
    load();
    toast({ title: "Milestone deleted" });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  if (!cert) return <div className="text-center py-20 text-muted-foreground">Certification not found. <Link to="/certifications" className="text-primary underline">Back</Link></div>;

  return (
    <div>
      <Link to="/certifications" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-4 h-4" /> Certifications
      </Link>
      <PageHeader
        title={cert.name}
        subtitle={`${cert.standard} · ${cert.audit_type} audit`}
        actions={<Button variant="outline" asChild><Link to="/certifications">Edit</Link></Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <LifecycleTimeline status={cert.status} milestones={milestones} />
          <div className="mt-5 flex justify-end">
            <Button size="sm" onClick={() => { setEditingMilestone(null); setMilestoneOpen(true); }}><Plus className="w-4 h-4" /> Add milestone</Button>
          </div>
          <div className="mt-4 space-y-1.5">
            {[...milestones].sort((a, b) => (a.order || 0) - (b.order || 0)).map((m) => (
              <div key={m.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{m.title}</span>
                  <span className="text-xs text-muted-foreground ml-2 capitalize">· {(m.milestone_type || "").replace(/_/g, " ")} · due {m.due_date || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={m.status === "completed" ? "completed" : m.status === "in_progress" ? "in_progress" : m.status === "overdue" ? "overdue" : "not_started"} />
                  <Button size="icon" variant="ghost" onClick={() => { setEditingMilestone(m); setMilestoneOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMilestone(m)}><Trash2 className="w-3.5 h-3.5 text-red-600" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Engagement Details</h3>
            <Info icon={Building2} label="Certifying body" value={cert.certifying_body} />
            <Info icon={User} label="Lead auditor" value={cert.auditor_lead} />
            <Info icon={User} label="Owner" value={cert.owner_name} />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Scope</p>
              <p className="text-sm text-foreground">{cert.scope_description || "—"}</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Key Dates</h3>
            <Info icon={Calendar} label="Audit window" value={`${cert.audit_start_date || "—"} → ${cert.audit_end_date || "—"}`} />
            <Info icon={Calendar} label="Certified" value={cert.certification_date} />
            <Info icon={Calendar} label="Expires" value={cert.expiry_date} />
            <Info icon={Calendar} label="Next surveillance" value={cert.next_surveillance_date} />
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase">Renewal</span>
              <StatusBadge status={cert.renewal_status} />
            </div>
          </div>
          {cert.notes && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{cert.notes}</p>
            </div>
          )}
        </div>
      </div>

      <MilestoneDialog open={milestoneOpen} onOpenChange={setMilestoneOpen} certification={cert} editing={editingMilestone} onSaved={load} />
    </div>
  );
}
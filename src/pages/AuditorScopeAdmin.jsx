import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Pencil } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import ScopeForm from "@/components/auditor/ScopeForm";

export default function AuditorScopeAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scopes, setScopes] = useState([]);
  const [auditors, setAuditors] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.AuditorScope.list("-created_date", 200),
      base44.entities.User.list("-created_date", 200),
      base44.entities.Framework.list("-created_date", 200),
    ]).then(([sc, users, fw]) => {
      setScopes(sc || []);
      setFrameworks(fw || []);
      setAuditors((users || []).filter((u) => u.role === "external_auditor"));
    }).catch(() => toast({ title: "Failed to load scopes", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (scope) => {
    await base44.entities.AuditorScope.update(scope.id, { status: scope.status === "active" ? "revoked" : "active" });
    load();
  };

  const handleDelete = async (scope) => {
    if (!confirm(`Revoke and delete scope for ${scope.auditor_name}?`)) return;
    await base44.entities.AuditorScope.delete(scope.id);
    load();
    toast({ title: "Scope deleted" });
  };

  return (
    <div>
      <PageHeader
        title="Auditor Scope Management"
        subtitle="Assign framework scopes to external auditors and manage engagement access"
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> Assign scope</Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Auditor</th>
                  <th className="text-left px-4 py-3">Scoped frameworks</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Expires</th>
                  <th className="text-left px-4 py-3">Assigned by</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scopes.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No auditor scopes assigned yet. Invite an external auditor (Users page), then assign a scope here.</td></tr>}
                {scopes.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.auditor_name}</div>
                      <div className="text-xs text-muted-foreground">{s.auditor_email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.framework_names?.length ? s.framework_names.join(", ") : <span className="italic">All frameworks</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={s.status === "active" ? "approved" : "rejected"} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.expires_at || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.assigned_by_name || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(s)}>{s.status === "active" ? "Revoke" : "Activate"}</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(s)} className="text-red-600">Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ScopeForm open={formOpen} onOpenChange={setFormOpen} auditors={auditors} frameworks={frameworks} editing={editing} assignedBy={user?.full_name || user?.email} onSaved={load} />
    </div>
  );
}
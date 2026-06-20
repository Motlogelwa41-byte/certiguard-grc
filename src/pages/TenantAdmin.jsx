import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Plus, Pencil, Trash2, Shield, Users, BarChart3, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { useTenant } from "@/lib/TenantContext";

const tierLabels = { trial: "Trial", starter: "Starter", professional: "Professional", enterprise: "Enterprise" };
const defaultForm = { name: "", slug: "", industry: "", size: "smb", country: "", subscription_tier: "trial", subscription_status: "trial", trial_ends_at: "", billing_email: "", max_users: 5, max_frameworks: 2, admin_name: "", admin_email: "", is_active: true };

export default function TenantAdmin() {
  const [tenants, setTenants] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const { toast } = useToast();
  const { tenant: currentTenant } = useTenant();

  const load = () => {
    Promise.all([
      base44.entities.Tenant.list(),
      base44.entities.Subscription.list()
    ]).then(([t, s]) => { setTenants(t); setSubscriptions(s); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const getTenantSubscription = (tenantId) => subscriptions.find(s => s.tenant_id === tenantId);

  const handleSave = async () => {
    try {
      if (editId) await base44.entities.Tenant.update(editId, form);
      else {
        const tenant = await base44.entities.Tenant.create(form);
        // Create matching subscription
        await base44.entities.Subscription.create({
          tenant_id: tenant.id, tenant_name: form.name, tier: form.subscription_tier,
          status: form.subscription_status, amount_monthly: 0,
          start_date: new Date().toISOString().slice(0, 10),
          users_count: 1, frameworks_count: 0
        });
      }
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Tenant updated" : "Tenant created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (t) => {
    setForm({
      name: t.name || "", slug: t.slug || "", industry: t.industry || "",
      size: t.size || "smb", country: t.country || "",
      subscription_tier: t.subscription_tier || "trial", subscription_status: t.subscription_status || "trial",
      trial_ends_at: t.trial_ends_at || "", billing_email: t.billing_email || "",
      max_users: t.max_users || 5, max_frameworks: t.max_frameworks || 2,
      admin_name: t.admin_name || "", admin_email: t.admin_email || "", is_active: !!t.is_active
    });
    setEditId(t.id); setOpen(true);
  };

  const handleDelete = async (id) => {
    const sub = subscriptions.find(s => s.tenant_id === id);
    if (sub) await base44.entities.Subscription.delete(sub.id);
    await base44.entities.Tenant.delete(id); load(); toast({ title: "Tenant deleted" });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Tenant Administration" subtitle="Manage organizations, subscriptions, and tenant isolation" actions={
        <Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Tenant
        </Button>
      } />

      {tenants.length === 0 ? (
        <EmptyState icon={Building2} title="No tenants yet" description="Add your first organization to enable multi-tenant isolation." actionLabel="Add Tenant" onAction={() => setOpen(true)} />
      ) : (
        <div className="space-y-4">
          {tenants.map((t) => {
            const sub = getTenantSubscription(t.id);
            const tierColor = t.subscription_tier === "enterprise" ? "border-purple-300" : t.subscription_tier === "professional" ? "border-primary/50" : "border-border";
            return (
              <div key={t.id} className={`bg-card rounded-xl border-2 ${tierColor} p-5`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-lg text-foreground">{t.name}</h3>
                      <p className="text-xs text-muted-foreground">{t.industry || "—"} · {t.country || "—"} · {t.size?.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.subscription_tier} />
                    <StatusBadge status={t.subscription_status} />
                    {t.is_active ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">Active</span> : <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Inactive</span>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-muted-foreground">Users:</span>
                    <span className="font-semibold">{t.max_users}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span className="text-muted-foreground">Frameworks:</span>
                    <span className="font-semibold">{t.max_frameworks}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-muted-foreground">Trial ends:</span>
                    <span className="font-semibold">{t.trial_ends_at || "—"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    Admin: {t.admin_name || "—"} ({t.admin_email || "—"})
                    {sub && <span className="ml-3">· Billing: {sub.billing_cycle} · Next: {sub.next_billing_date || "—"}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(t)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Tenant" : "Add New Tenant"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
              <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
              <div><Label>Size</Label>
                <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="startup">Startup</SelectItem><SelectItem value="smb">SMB</SelectItem><SelectItem value="mid_market">Mid-Market</SelectItem><SelectItem value="enterprise">Enterprise</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Subscription Tier</Label>
                <Select value={form.subscription_tier} onValueChange={(v) => {
                  const limits = { trial: { max_users: 3, max_frameworks: 2 }, starter: { max_users: 10, max_frameworks: 5 }, professional: { max_users: 100, max_frameworks: 20 }, enterprise: { max_users: 999, max_frameworks: 999 } };
                  setForm({ ...form, subscription_tier: v, max_users: limits[v].max_users, max_frameworks: limits[v].max_frameworks });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="trial">Trial (14 days)</SelectItem><SelectItem value="starter">Starter</SelectItem><SelectItem value="professional">Professional</SelectItem><SelectItem value="enterprise">Enterprise</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.subscription_status} onValueChange={(v) => setForm({ ...form, subscription_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="trial">Trial</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="past_due">Past Due</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Max Users</Label><Input type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>Max Frameworks</Label><Input type="number" value={form.max_frameworks} onChange={(e) => setForm({ ...form, max_frameworks: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>Trial Ends</Label><Input type="date" value={form.trial_ends_at} onChange={(e) => setForm({ ...form, trial_ends_at: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Admin Name</Label><Input value={form.admin_name} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} /></div>
              <div><Label>Admin Email</Label><Input value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} /></div>
            </div>
            <div><Label>Billing Email</Label><Input value={form.billing_email} onChange={(e) => setForm({ ...form, billing_email: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.name}>{editId ? "Update Tenant" : "Create Tenant"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
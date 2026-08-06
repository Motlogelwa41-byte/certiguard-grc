import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Palette, Save, Building2, Eye } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULTS = {
  brand_display_name: "",
  brand_logo_url: "",
  brand_primary_color: "#1e293b",
  brand_secondary_color: "#10b981",
  brand_accent_color: "#10b981",
  brand_footer_text: "",
  brand_login_message: "",
};

export default function WhiteLabelSettings() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.TenantSettings.list("-created_date", 10)
      .then((items) => {
        if (items && items.length > 0) {
          setSettings(items[0]);
          setForm({ ...DEFAULTS, ...items[0] });
        }
      })
      .catch(() => toast({ title: "Failed to load settings", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const payload = { ...form, updated_by_name: user?.full_name || user?.email || "Admin" };
      if (settings?.id) {
        await base44.entities.TenantSettings.update(settings.id, payload);
      } else {
        await base44.entities.TenantSettings.create({ ...payload, tenant_id: user?.data?.tenant_id });
      }
      // Apply branding immediately
      applyBranding(form);
      toast({ title: "Branding saved", description: "White-label settings applied across the platform." });
    } catch (e) {
      toast({ title: "Failed to save branding", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const applyBranding = (b) => {
    const root = document.documentElement;
    if (b.brand_primary_color) root.style.setProperty("--primary", hexToHsl(b.brand_primary_color));
    if (b.brand_secondary_color) root.style.setProperty("--sidebar-primary", hexToHsl(b.brand_secondary_color));
    if (b.brand_accent_color) root.style.setProperty("--ring", hexToHsl(b.brand_accent_color));
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <PageHeader title="White-Label Branding" subtitle="Configure your organization's corporate identity, logo, and color palette across the platform"
        actions={<Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Branding</Button>} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Brand Identity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Display Name</Label>
              <Input value={form.brand_display_name || ""} onChange={(e) => setForm({ ...form, brand_display_name: e.target.value })} placeholder="e.g. Acme Security Group" />
              <p className="text-xs text-muted-foreground mt-1">Shown in sidebar header and report covers</p>
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input value={form.brand_logo_url || ""} onChange={(e) => setForm({ ...form, brand_logo_url: e.target.value })} placeholder="https://…/logo.png" />
            </div>
            <div>
              <Label>Footer Text</Label>
              <Input value={form.brand_footer_text || ""} onChange={(e) => setForm({ ...form, brand_footer_text: e.target.value })} placeholder="© 2026 Acme Group. All rights reserved." />
            </div>
            <div>
              <Label>Login Welcome Message</Label>
              <Textarea value={form.brand_login_message || ""} onChange={(e) => setForm({ ...form, brand_login_message: e.target.value })} placeholder="Welcome to Acme GRC Portal" rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Color Palette</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ColorField label="Primary Color" value={form.brand_primary_color} onChange={(v) => setForm({ ...form, brand_primary_color: v })} />
            <ColorField label="Secondary / Sidebar Color" value={form.brand_secondary_color} onChange={(v) => setForm({ ...form, brand_secondary_color: v })} />
            <ColorField label="Accent / Ring Color" value={form.brand_accent_color} onChange={(v) => setForm({ ...form, brand_accent_color: v })} />
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Eye className="w-3 h-3" /> Live Preview</p>
              <div className="rounded-lg overflow-hidden border border-border">
                <div className="p-4" style={{ background: form.brand_primary_color, color: "#fff" }}>
                  <div className="flex items-center gap-2">
                    {form.brand_logo_url ? <img src={form.brand_logo_url} alt="logo" className="h-6 w-auto" /> : <Building2 className="w-5 h-5" />}
                    <span className="font-semibold">{form.brand_display_name || "Your Organization"}</span>
                  </div>
                </div>
                <div className="p-3 bg-muted/50 flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-md text-xs font-medium text-white" style={{ background: form.brand_secondary_color }}>Primary Button</button>
                  <button className="px-3 py-1.5 rounded-md text-xs font-medium border-2" style={{ borderColor: form.brand_accent_color, color: form.brand_accent_color }}>Outline Button</button>
                </div>
                <div className="p-2 text-xs text-center text-muted-foreground" style={{ background: form.brand_primary_color + "10" }}>
                  {form.brand_footer_text || "© 2026 Your Organization. All rights reserved."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="flex-1">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-9 rounded cursor-pointer border border-border" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-28 font-mono text-xs" />
      </div>
    </div>
  );
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Eye, Save, Plus, Trash2, ExternalLink, Globe, RefreshCw, ToggleLeft, ToggleRight, Lock, BarChart3, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

function parse(val) { try { return JSON.parse(val || "[]"); } catch { return []; } }

const defaultConfig = {
  company_name: "", company_tagline: "Security & Trust Center", company_description: "",
  logo_url: "", website_url: "", contact_email: "", is_published: false,
  show_frameworks: true, show_controls_count: true, show_uptime: true, uptime_percentage: 99.9,
  show_pentest: false, pentest_date: "", pentest_firm: "",
  show_subprocessors: true, subprocessors: "[]", custom_sections: "[]", accent_color: "#2563eb",
  access_mode: "public", nda_required: false, nda_template: "", nda_validity_days: 90,
  crm_sync_enabled: false, crm_webhook_url: "", crm_provider: "none",
  analytics_enabled: true, auto_approve_access: false, welcome_message: "",
};

export default function TrustCenterSettings() {
  const [config, setConfig] = useState(defaultConfig);
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subprocessors, setSubprocessors] = useState([]);
  const [customSections, setCustomSections] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.TrustCenter.list().then(list => {
      if (list?.[0]) {
        setConfig({ ...defaultConfig, ...list[0] });
        setRecordId(list[0].id);
        setSubprocessors(parse(list[0].subprocessors));
        setCustomSections(parse(list[0].custom_sections));
      }
      setLoading(false);
    });
  }, []);

  const set = (k, v) => setConfig(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = { ...config, subprocessors: JSON.stringify(subprocessors), custom_sections: JSON.stringify(customSections) };
    try {
      if (recordId) {
        await base44.entities.TrustCenter.update(recordId, data);
      } else {
        const r = await base44.entities.TrustCenter.create(data);
        setRecordId(r.id);
      }
      toast({ title: "Trust Center saved", description: config.is_published ? "Your Trust Center is now live." : "Saved as draft (not yet published)." });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const addSubprocessor = () => setSubprocessors(prev => [...prev, { name: "", purpose: "", location: "" }]);
  const updateSP = (i, k, v) => setSubprocessors(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  const removeSP = (i) => setSubprocessors(prev => prev.filter((_, idx) => idx !== i));

  const addSection = () => setCustomSections(prev => [...prev, { title: "", content: "" }]);
  const updateCS = (i, k, v) => setCustomSections(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  const removeCS = (i) => setCustomSections(prev => prev.filter((_, idx) => idx !== i));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const publicUrl = `${window.location.origin}/trust-center`;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Trust Center"
        subtitle="Configure your public-facing security and compliance page"
        actions={
          <div className="flex items-center gap-2">
            {config.is_published && (
              <a href="/trust-center" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1" /> Preview</Button>
              </a>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save Changes
            </Button>
          </div>
        }
      />

      {/* Publish banner */}
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${config.is_published ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        <div>
          <p className={`font-semibold text-sm ${config.is_published ? "text-emerald-800" : "text-amber-800"}`}>
            {config.is_published ? "✅ Trust Center is LIVE" : "⚠️ Trust Center is unpublished (draft)"}
          </p>
          {config.is_published && (
            <p className="text-xs text-emerald-600 mt-0.5">Public URL: <a href="/trust-center" target="_blank" className="underline font-mono">{publicUrl}</a></p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{config.is_published ? "Published" : "Draft"}</span>
          <Switch checked={!!config.is_published} onCheckedChange={v => set("is_published", v)} />
        </div>
      </div>

      {/* Company info */}
      <Card title="Company Information">
        <div className="space-y-4">
          <Row>
            <Field label="Company Name *">
              <Input value={config.company_name} onChange={e => set("company_name", e.target.value)} placeholder="Acme Corp" />
            </Field>
            <Field label="Tagline">
              <Input value={config.company_tagline} onChange={e => set("company_tagline", e.target.value)} placeholder="Security & Trust Center" />
            </Field>
          </Row>
          <Field label="Description">
            <Textarea value={config.company_description} onChange={e => set("company_description", e.target.value)} placeholder="Brief description of your security posture..." rows={2} />
          </Field>
          <Row>
            <Field label="Logo URL">
              <Input value={config.logo_url} onChange={e => set("logo_url", e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Website URL">
              <Input value={config.website_url} onChange={e => set("website_url", e.target.value)} placeholder="https://yourcompany.com" />
            </Field>
          </Row>
          <Row>
            <Field label="Security Contact Email">
              <Input value={config.contact_email} onChange={e => set("contact_email", e.target.value)} placeholder="security@yourcompany.com" />
            </Field>
            <Field label="Accent Color">
              <div className="flex items-center gap-2">
                <input type="color" value={config.accent_color} onChange={e => set("accent_color", e.target.value)} className="w-10 h-9 rounded border border-input cursor-pointer" />
                <Input value={config.accent_color} onChange={e => set("accent_color", e.target.value)} className="flex-1" />
              </div>
            </Field>
          </Row>
        </div>
      </Card>

      {/* Visibility toggles */}
      <Card title="Sections to Display">
        <div className="space-y-3">
          {[
            { key: "show_frameworks", label: "Compliance Frameworks & Certifications", desc: "Show your framework readiness and certification status" },
            { key: "show_controls_count", label: "Control Pass Rate", desc: "Show percentage of passing controls" },
            { key: "show_uptime", label: "Uptime Statistics", desc: "Display your availability metrics" },
            { key: "show_pentest", label: "Penetration Testing", desc: "Show last pen test date and firm" },
            { key: "show_subprocessors", label: "Sub-processors List", desc: "List third-party data processors" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch checked={!!config[item.key]} onCheckedChange={v => set(item.key, v)} />
            </div>
          ))}
        </div>
      </Card>

      {/* NDA & Access Control */}
      <Card title="NDA & Document Access Control" action={<Lock className="w-4 h-4 text-muted-foreground" />}>
        <div className="space-y-4">
          <Field label="Access Mode">
            <Select value={config.access_mode || "public"} onValueChange={v => set("access_mode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public — Open access, no form required</SelectItem>
                <SelectItem value="request_access">Request Access — Visitors fill a form</SelectItem>
                <SelectItem value="nda_required">NDA Required — Visitors must sign an NDA</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Require NDA Signing</p>
              <p className="text-xs text-muted-foreground">Visitors must sign a mutual NDA before accessing compliance documents</p>
            </div>
            <Switch checked={!!config.nda_required} onCheckedChange={v => set("nda_required", v)} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-Approve Access</p>
              <p className="text-xs text-muted-foreground">Automatically approve access requests without manual review</p>
            </div>
            <Switch checked={!!config.auto_approve_access} onCheckedChange={v => set("auto_approve_access", v)} />
          </div>
          <Field label="NDA Validity (days)">
            <Input type="number" value={config.nda_validity_days || 90} onChange={e => set("nda_validity_days", parseInt(e.target.value) || 90)} />
          </Field>
          <Field label="NDA Template (optional — leave blank for default)">
            <Textarea
              value={config.nda_template || ""}
              onChange={e => set("nda_template", e.target.value)}
              placeholder="Use {{visitor_name}}, {{visitor_company}}, {{company_name}}, {{date}} as placeholders..."
              rows={4}
            />
          </Field>
          <Field label="Welcome Message (optional)">
            <Textarea
              value={config.welcome_message || ""}
              onChange={e => set("welcome_message", e.target.value)}
              placeholder="Custom message shown to visitors on the access request form"
              rows={2}
            />
          </Field>
        </div>
      </Card>

      {/* CRM Integration */}
      <Card title="CRM Integration" action={<Webhook className="w-4 h-4 text-muted-foreground" />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Enable CRM Sync</p>
              <p className="text-xs text-muted-foreground">Sync visitor activity (access requests, NDA signings, document downloads) to your CRM</p>
            </div>
            <Switch checked={!!config.crm_sync_enabled} onCheckedChange={v => set("crm_sync_enabled", v)} />
          </div>
          <Field label="CRM Provider">
            <Select value={config.crm_provider || "none"} onValueChange={v => set("crm_provider", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="salesforce">Salesforce</SelectItem>
                <SelectItem value="hubspot">HubSpot</SelectItem>
                <SelectItem value="pipedrive">Pipedrive</SelectItem>
                <SelectItem value="zoho">Zoho CRM</SelectItem>
                <SelectItem value="custom">Custom Webhook</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="CRM Webhook URL">
            <Input
              value={config.crm_webhook_url || ""}
              onChange={e => set("crm_webhook_url", e.target.value)}
              placeholder="https://your-crm-webhook-url..."
              disabled={!config.crm_sync_enabled}
            />
          </Field>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Enable Visitor Analytics</p>
              <p className="text-xs text-muted-foreground">Track page views, document downloads, and questions for account-level analytics</p>
            </div>
            <Switch checked={!!config.analytics_enabled} onCheckedChange={v => set("analytics_enabled", v)} />
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <Card title="Metrics">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Uptime %">
            <Input type="number" step="0.1" max="100" value={config.uptime_percentage} onChange={e => set("uptime_percentage", parseFloat(e.target.value))} />
          </Field>
          <Field label="Pen Test Date">
            <Input type="date" value={config.pentest_date} onChange={e => set("pentest_date", e.target.value)} />
          </Field>
          <Field label="Pen Test Firm" className="col-span-2">
            <Input value={config.pentest_firm} onChange={e => set("pentest_firm", e.target.value)} placeholder="e.g. Rapid7" />
          </Field>
        </div>
      </Card>

      {/* Sub-processors */}
      <Card title="Sub-processors" action={<Button size="sm" variant="outline" onClick={addSubprocessor}><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>}>
        {subprocessors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No sub-processors added yet.</p>
        ) : (
          <div className="space-y-3">
            {subprocessors.map((sp, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-start">
                <Input placeholder="Name" value={sp.name} onChange={e => updateSP(i, "name", e.target.value)} />
                <Input placeholder="Purpose" value={sp.purpose} onChange={e => updateSP(i, "purpose", e.target.value)} />
                <div className="flex gap-1">
                  <Input placeholder="Location" value={sp.location} onChange={e => updateSP(i, "location", e.target.value)} />
                  <button onClick={() => removeSP(i)} className="p-2 rounded hover:bg-muted text-destructive shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Custom sections */}
      <Card title="Custom Sections" action={<Button size="sm" variant="outline" onClick={addSection}><Plus className="w-3.5 h-3.5 mr-1" /> Add Section</Button>}>
        {customSections.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Add custom content sections like "Data Retention Policy" or "Bug Bounty Program".</p>
        ) : (
          <div className="space-y-4">
            {customSections.map((sec, i) => (
              <div key={i} className="space-y-2 border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Input placeholder="Section title" value={sec.title} onChange={e => updateCS(i, "title", e.target.value)} />
                  <button onClick={() => removeCS(i)} className="p-2 rounded hover:bg-muted text-destructive shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
                <Textarea placeholder="Section content..." value={sec.content} onChange={e => updateCS(i, "content", e.target.value)} rows={3} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Button className="w-full" onClick={handleSave} disabled={saving || !config.company_name}>
        {saving ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
        Save Trust Center
      </Button>
    </div>
  );
}

function Card({ title, action, children }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, children, className }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
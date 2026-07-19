import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { CATALOG, catalogEntry } from "@/lib/connectionsCatalog";
import { Wand2, ArrowRight, ArrowLeft, Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";

const STEPS = ["Frameworks", "Cloud Provider", "Map Controls", "Review"];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFws, setSelectedFws] = useState([]);
  const [provider, setProvider] = useState("aws");
  const [name, setName] = useState("");
  const [config, setConfig] = useState("");
  const [mapping, setMapping] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [fws, ctls] = await Promise.all([
        base44.entities.Framework.list("-updated_date", 100),
        base44.entities.Control.list("-updated_date", 300),
      ]);
      setFrameworks(fws || []);
      setControls(ctls || []);
      setLoading(false);
    })();
  }, []);

  const cloudEntries = CATALOG.filter((c) => c.category === "cloud");

  const scopedControls = () => {
    if (selectedFws.length === 0) return controls;
    return controls.filter((c) => Array.isArray(c.framework_ids) && c.framework_ids.some((id) => selectedFws.includes(id)));
  };

  const runMapping = async () => {
    const cs = scopedControls();
    if (cs.length === 0) { toast({ title: "No controls to map", variant: "destructive" }); return; }
    setAiLoading(true);
    const brief = cs.map((c) => ({ id: c.id, control_id: c.control_id, title: c.title, category: c.category }));
    try {
      const out = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a GRC automation expert. Given a list of compliance controls and a ${provider} cloud connection, determine which controls ${provider} can AUTOMATICALLY monitor or collect evidence for (e.g. IAM, logging, encryption, configuration, inventory, access reviews). For each control return: id (match exactly), monitorable (boolean), evidence_source (short, the ${provider} service that provides it), confidence (high/medium/low). Controls: ${JSON.stringify(brief)}`,
        response_json_schema: {
          type: "object",
          properties: {
            mappings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  monitorable: { type: "boolean" },
                  evidence_source: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                },
              },
            },
          },
        },
      });
      const maps = out?.mappings || out?.data?.mappings || [];
      const m = {};
      cs.forEach((c) => {
        const found = maps.find((x) => x.id === c.id || x.id === c.control_id);
        const monitorable = found?.monitorable || false;
        m[c.id] = { monitorable, source: found?.evidence_source || "", confidence: found?.confidence || "low", selected: monitorable };
      });
      setMapping(m);
      toast({ title: "Mapping complete", description: `${Object.values(m).filter((x) => x.monitorable).length} controls auto-selected.` });
    } catch (e) {
      toast({ title: "AI mapping failed", description: e.message, variant: "destructive" });
      const m = {};
      cs.forEach((c) => (m[c.id] = { monitorable: false, source: "", confidence: "low", selected: false }));
      setMapping(m);
    }
    setAiLoading(false);
  };

  const toggleMap = (id) => setMapping((m) => ({ ...m, [id]: { ...m[id], selected: !m[id].selected } }));
  const selectedControlIds = () => Object.keys(mapping || {}).filter((id) => mapping[id].selected);

  const finish = async () => {
    setSaving(true);
    try {
      const ids = selectedControlIds();
      const entry = catalogEntry(provider);
      await base44.entities.Connection.create({
        name: name || entry.label,
        service: provider,
        category: "cloud",
        auth_method: entry?.authMethod || "api_key",
        connector_type: entry?.connectorType || "",
        config,
        secret_env_var: entry?.secretHint ? entry.secretHint.split(" ")[0] : "",
        controls_monitored: ids,
        control_count: ids.length,
        auto_collect: true,
        collect_frequency: "daily",
        status: "needs_credentials",
      });
      toast({ title: "Connection created", description: `${ids.length} controls pre-mapped. Add credentials to start collecting.` });
      navigate("/connections");
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Onboarding Wizard" subtitle="Connect a cloud provider and auto-map your controls in minutes" />

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={`flex items-center gap-2 ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i < step ? "bg-primary text-primary-foreground border-primary" : i === step ? "border-primary" : "border-border"}`}>{i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}</div>
              <span className="text-sm font-medium hidden sm:block">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded ${i < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8">
        {step === 0 && (
          <div>
            <h2 className="text-lg font-heading font-semibold mb-1">Select compliance frameworks</h2>
            <p className="text-sm text-muted-foreground mb-4">Scope which controls the wizard considers for pre-mapping. Optional — leave empty to map all controls.</p>
            {frameworks.length === 0 ? <p className="text-sm text-muted-foreground">No frameworks found. You can skip this step.</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {frameworks.map((f) => {
                  const on = selectedFws.includes(f.id);
                  return (
                    <button key={f.id} onClick={() => setSelectedFws((s) => on ? s.filter((x) => x !== f.id) : [...s, f.id])} className={`text-left p-3 rounded-xl border transition-colors ${on ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                      <div className="flex items-center justify-between"><span className="font-medium text-foreground">{f.name}</span>{on && <Check className="w-4 h-4 text-primary" />}</div>
                      {f.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{f.description}</p>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-heading font-semibold mb-1">Choose your cloud provider</h2>
            <p className="text-sm text-muted-foreground mb-4">We'll connect this source and map it to your controls.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              {cloudEntries.map((e) => {
                const Icon = e.icon;
                const on = provider === e.service;
                return (
                  <button key={e.service} onClick={() => { setProvider(e.service); if (!name) setName(e.label); }} className={`p-4 rounded-xl border text-left transition-colors ${on ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                    <div className="flex items-center gap-2 mb-1"><Icon className="w-5 h-5 text-primary" /><span className="font-medium">{e.label}</span></div>
                    <p className="text-xs text-muted-foreground">{e.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="space-y-3 max-w-lg">
              <div><Label>Connection name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My AWS Production" /></div>
              <div><Label>Configuration (JSON)</Label><Textarea rows={3} className="font-mono text-xs" placeholder={'{"region":"af-south-1","account":"123456789012"}'} value={config} onChange={(e) => setConfig(e.target.value)} /></div>
              {catalogEntry(provider)?.secretHint && <p className="text-xs text-muted-foreground">Credentials required: <code className="text-xs">{catalogEntry(provider).secretHint}</code> — add in Dashboard → Secrets after setup.</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-heading font-semibold mb-1">AI control mapping</h2>
            <p className="text-sm text-muted-foreground mb-4">Our AI suggests which controls {catalogEntry(provider)?.label} can automatically monitor. Toggle to confirm your selections.</p>
            {!mapping && !aiLoading && (
              <div className="text-center py-8">
                <Wand2 className="w-10 h-10 text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">{scopedControls().length} controls ready to map against {catalogEntry(provider)?.label}.</p>
                <Button onClick={runMapping}><Sparkles className="w-4 h-4 mr-1" /> Run AI mapping</Button>
              </div>
            )}
            {aiLoading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mr-2" /><span className="text-sm text-muted-foreground">Analyzing controls…</span></div>}
            {mapping && (
              <>
                <p className="text-xs text-muted-foreground mb-2">{selectedControlIds().length} selected · {Object.values(mapping).filter((x) => x.monitorable).length} auto-detected</p>
                <div className="border border-border rounded-lg max-h-96 overflow-y-auto divide-y divide-border">
                  {Object.keys(mapping).map((id) => {
                    const c = controls.find((x) => x.id === id);
                    const m = mapping[id];
                    return (
                      <div key={id} className="flex items-start gap-3 p-3">
                        <input type="checkbox" checked={m.selected} onChange={() => toggleMap(id)} className="mt-1 rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{c?.control_id ? `[${c.control_id}] ` : ""}{c?.title}</p>
                          {m.source && <p className="text-xs text-muted-foreground mt-0.5">{m.source}</p>}
                        </div>
                        {m.monitorable && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 shrink-0">{m.confidence}</span>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-heading font-semibold mb-1">Review & create</h2>
            <p className="text-sm text-muted-foreground mb-4">Confirm the details and create your connection.</p>
            <div className="space-y-1 text-sm max-w-lg">
              <Row label="Provider" value={catalogEntry(provider)?.label} />
              <Row label="Connection name" value={name} />
              <Row label="Controls mapped" value={selectedControlIds().length} />
              <Row label="Auto-sync frequency" value="Daily" />
            </div>
            <div className="mt-6 rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-success mt-0.5" />
              <p className="text-sm text-muted-foreground">After creation, add your credentials in Dashboard → Secrets. The daily Connections Monitor will then collect evidence automatically.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !name}><ArrowRight className="w-4 h-4 mr-1" /> Continue</Button>
          ) : (
            <Button onClick={finish} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Create connection</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex justify-between py-2 border-b border-border last:border-0"><span className="text-muted-foreground">{label}</span><span className="text-foreground font-medium">{value}</span></div>;
}
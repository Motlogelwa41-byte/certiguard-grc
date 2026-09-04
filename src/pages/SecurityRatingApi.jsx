import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Globe, Key, Copy, Check, Eye, Activity, Shield, Zap,
  ExternalLink, Lock, Code, RefreshCw, Star
} from "lucide-react";

export default function SecurityRatingApi() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const configs = await base44.entities.SecurityRatingConfig.list();
      if (configs.length > 0) {
        setConfig(configs[0]);
      } else {
        const newConfig = {
          config_id: `SRC-${Date.now().toString().slice(-6)}`,
          is_public: false,
          api_key: generateApiKey(),
          rating_scale: "0_100",
          expose_score: true,
          expose_grade: true,
          expose_frameworks: true,
          expose_certifications: true,
          expose_control_summary: true,
          expose_incident_count: false,
          expose_last_audit_date: false,
          expose_uptime: false,
          custom_message: "",
          rate_limit_per_hour: 100
        };
        await base44.entities.SecurityRatingConfig.create(newConfig);
        setConfig(newConfig);
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to load config", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function generateApiKey() {
    return "sk_" + Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
  }

  const update = async (field, value) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const save = async () => {
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, tenant_id, total_api_calls, last_api_call_at, current_score, current_grade, last_rating_computed_at, ...payload } = config;
      await base44.entities.SecurityRatingConfig.update(config.id, payload);
      toast({ title: "Settings saved" });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const regenerateKey = async () => {
    if (!confirm("Regenerate API key? The old key will stop working immediately.")) return;
    const newKey = generateApiKey();
    await base44.entities.SecurityRatingConfig.update(config.id, { api_key: newKey });
    setConfig({ ...config, api_key: newKey });
    toast({ title: "API key regenerated" });
  };

  const copyKey = () => {
    navigator.clipboard.writeText(config.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testApi = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await base44.functions.invoke("getPublicSecurityRating", { api_key: config.api_key });
      setTestResult(result.data);
      toast({ title: "API test successful" });
      load();
    } catch (err) {
      toast({ title: "API test failed", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const gradeColor = (grade) => {
    const map = { A: "text-emerald-400", B: "text-green-400", C: "text-amber-400", D: "text-orange-400", F: "text-red-400" };
    return map[grade] || "text-muted-foreground";
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Vendor Security Rating API"
        subtitle="A public API where prospects can programmatically query your security rating"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="API Status" value={config.is_public ? "Live" : "Disabled"} icon={Globe} color={config.is_public ? "green" : "slate"} />
        <StatCard label="Current Score" value={config.current_score || 0} icon={Shield} color="blue" />
        <StatCard label="Current Grade" value={config.current_grade || "—"} icon={Star} color="amber" />
        <StatCard label="Total API Calls" value={config.total_api_calls || 0} icon={Activity} color="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" />API Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <Label className="text-sm font-semibold">Public API Enabled</Label>
                <p className="text-xs text-muted-foreground">When on, prospects can query your rating</p>
              </div>
              <Switch checked={config.is_public} onCheckedChange={v => update("is_public", v)} />
            </div>

            <div>
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input value={config.api_key || ""} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={copyKey}>
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="outline" onClick={regenerateKey}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Prospects must include this as the x-api-key header</p>
            </div>

            <div>
              <Label>Rating Scale</Label>
              <Select value={config.rating_scale} onValueChange={v => update("rating_scale", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0_100">0-100 (Standard)</SelectItem>
                  <SelectItem value="0_1000">0-1000 (Granular)</SelectItem>
                  <SelectItem value="letter_grade">Letter Grade (A-F)</SelectItem>
                  <SelectItem value="star_5">5-Star Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rate Limit (requests/hour)</Label>
              <Input type="number" value={config.rate_limit_per_hour} onChange={e => update("rate_limit_per_hour", Number(e.target.value))} />
            </div>

            <div>
              <Label>Custom Message (included in API response)</Label>
              <Textarea value={config.custom_message || ""} onChange={e => update("custom_message", e.target.value)} rows={2} placeholder="e.g. Security posture verified as of 2026-09-04" />
            </div>

            <Button onClick={save} disabled={saving}>
              {saving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5" />Data Exposure Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "expose_score", label: "Numeric Score", desc: "Include the security score number" },
              { key: "expose_grade", label: "Letter Grade", desc: "Include A-F grade" },
              { key: "expose_control_summary", label: "Control Summary", desc: "Pass/fail counts and pass rate" },
              { key: "expose_frameworks", label: "Compliance Frameworks", desc: "List of active frameworks" },
              { key: "expose_certifications", label: "Certifications", desc: "Active certifications with expiry" },
              { key: "expose_incident_count", label: "Incident Count", desc: "Recent incidents (last 90 days)" },
              { key: "expose_last_audit_date", label: "Last Audit Date", desc: "When the last audit was completed" },
              { key: "expose_uptime", label: "Uptime SLA", desc: "Uptime percentage commitment" }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                <div>
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={config[item.key]} onCheckedChange={v => update(item.key, v)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Code className="w-5 h-5" />API Usage & Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border p-4 bg-muted/30">
            <p className="text-sm font-semibold mb-2">Example Request:</p>
            <pre className="text-xs font-mono overflow-x-auto p-2 rounded bg-slate-900 text-slate-200">{`curl -H "x-api-key: ${config.api_key?.slice(0, 12)}..." \\
  https://[your-app-url]/api/functions/getPublicSecurityRating`}</pre>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={testApi} disabled={testing || !config.is_public}>
              {testing ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />Testing...</> : <><Zap className="w-4 h-4 mr-2" />Test API Call</>}
            </Button>
            {!config.is_public && <Badge variant="outline">Enable the API first to test</Badge>}
          </div>

          {testResult && (
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />API Response:
              </p>
              <div className="flex items-center gap-4 mb-3">
                {testResult.score != null && (
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${gradeColor(testResult.grade)}`}>{testResult.score}</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                )}
                {testResult.grade && (
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${gradeColor(testResult.grade)}`}>{testResult.grade}</p>
                    <p className="text-xs text-muted-foreground">Grade</p>
                  </div>
                )}
                {testResult.controls && (
                  <div className="text-center">
                    <p className="text-2xl font-bold">{testResult.controls.pass_rate}</p>
                    <p className="text-xs text-muted-foreground">Control Pass Rate</p>
                  </div>
                )}
              </div>
              <pre className="text-xs font-mono overflow-x-auto p-2 rounded bg-slate-900 text-slate-200 max-h-60 overflow-y-auto">{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}

          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Globe className="w-4 h-4" />Embeddable Badge URL:</p>
            <pre className="text-xs font-mono overflow-x-auto p-2 rounded bg-slate-900 text-slate-200">{`https://[your-app-url]/api/functions/getPublicSecurityRating?action=get_badge&api_key=${config.api_key?.slice(0, 12)}...`}</pre>
            <p className="text-xs text-muted-foreground mt-2">Returns an SVG badge — embed with &lt;img src="..." /&gt;</p>
          </div>

          {config.last_api_call_at && (
            <p className="text-xs text-muted-foreground">Last API call: {new Date(config.last_api_call_at).toLocaleString()}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
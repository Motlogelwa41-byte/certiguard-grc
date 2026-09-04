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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Cloud, Store, CheckCircle2, AlertCircle, Copy, ExternalLink,
  FileCheck, Shield, Globe, Lock, Activity, Eye, Download,
  Settings, Link2, FileText, Zap, Gauge
} from "lucide-react";

export default function AwsMarketplaceIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [frameworks, setFrameworks] = useState([]);
  const [feedPreview, setFeedPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const [configs, fws] = await Promise.all([
        base44.entities.AwsMarketplaceConfig.list("-created_date", 5),
        base44.entities.RegulatoryFramework.list("-created_date", 100),
      ]);
      setConfig(configs?.[0] || null);
      setFrameworks(fws || []);
    } catch (err) {
      toast({ title: "Error loading config", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      await base44.entities.AwsMarketplaceConfig.update(config.id, {
        seller_name: config.seller_name,
        seller_id: config.seller_id,
        product_name: config.product_name,
        product_id: config.product_id,
        listing_url: config.listing_url,
        feed_slug: config.feed_slug,
        integration_status: config.integration_status,
        expose_frameworks: config.expose_frameworks || [],
        expose_certifications: config.expose_certifications,
        expose_controls_summary: config.expose_controls_summary,
        expose_subprocessors: config.expose_subprocessors,
        expose_incident_history: config.expose_incident_history,
        expose_pen_tests: config.expose_pen_tests,
        expose_data_residency: config.expose_data_residency,
        document_access_mode: config.document_access_mode,
        nda_request_email: config.nda_request_email,
        auto_approve_aws_buyers: config.auto_approve_aws_buyers,
        data_hosting_regions: config.data_hosting_regions || [],
        data_residency_statement: config.data_residency_statement,
        encryption_at_rest: config.encryption_at_rest,
        encryption_in_transit: config.encryption_in_transit,
        kms_provider: config.kms_provider,
        incident_response_sla_hours: config.incident_response_sla_hours,
        breach_notification_sla_hours: config.breach_notification_sla_hours,
        uptime_sla_percentage: config.uptime_sla_percentage,
        support_plan: config.support_plan,
        notes: config.notes,
      });
      toast({ title: "Configuration saved", description: "AWS Marketplace integration updated." });
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      const newConfig = await base44.entities.AwsMarketplaceConfig.create({
        config_id: `AWS-MKT-${Date.now()}`,
        seller_name: user?.full_name || "My Company",
        feed_slug: `aws-mkt-${Date.now().toString(36)}`,
        integration_status: "draft",
        expose_frameworks: [],
        expose_certifications: true,
        expose_controls_summary: true,
        expose_subprocessors: true,
        expose_incident_history: false,
        expose_pen_tests: true,
        expose_data_residency: true,
        document_access_mode: "request_access",
        auto_approve_aws_buyers: false,
        data_hosting_regions: [],
        encryption_at_rest: "AES-256-GCM",
        encryption_in_transit: "TLS 1.2+",
        kms_provider: "AWS KMS",
        incident_response_sla_hours: 24,
        breach_notification_sla_hours: 72,
        uptime_sla_percentage: 99.9,
        support_plan: "business",
      });
      setConfig(newConfig);
      toast({ title: "Integration created", description: "Configure your AWS Marketplace feed settings below." });
    } catch (err) {
      toast({ title: "Creation failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!config?.feed_slug || !config?.seller_name) {
      toast({ title: "Missing fields", description: "Seller name and feed slug are required to activate.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      await base44.entities.AwsMarketplaceConfig.update(config.id, { integration_status: "active" });
      setConfig({ ...config, integration_status: "active" });
      toast({ title: "Feed activated", description: "Your compliance feed is now live for AWS Marketplace buyers." });
    } catch (err) {
      toast({ title: "Activation failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const loadPreview = async () => {
    if (!config?.feed_slug) return;
    try {
      setLoadingPreview(true);
      const res = await fetch(`/api/functions/getAwsMarketplaceFeed?slug=${config.feed_slug}&format=json`);
      const data = await res.json();
      setFeedPreview(data);
    } catch (err) {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const feedUrl = config?.feed_slug
    ? `${window.location.origin}/api/functions/getAwsMarketplaceFeed?slug=${config.feed_slug}`
    : "";
  const feedHtmlUrl = config?.feed_slug
    ? `${window.location.origin}/api/functions/getAwsMarketplaceFeed?slug=${config.feed_slug}&format=html`
    : "";

  const toggleFramework = (code) => {
    const current = config.expose_frameworks || [];
    const updated = current.includes(code) ? current.filter(c => c !== code) : [...current, code];
    setConfig({ ...config, expose_frameworks: updated });
  };

  const toggleRegion = (region) => {
    const current = config.data_hosting_regions || [];
    const updated = current.includes(region) ? current.filter(r => r !== region) : [...current, region];
    setConfig({ ...config, data_hosting_regions: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AWS Marketplace Trust Center"
          subtitle="Feature your compliance posture on your AWS Marketplace listing so buyers access compliance docs during purchase."
        />
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-lg font-heading font-bold mb-2">No AWS Marketplace Integration Configured</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Create your integration to generate a public compliance feed that AWS Marketplace buyers can access
              during purchase evaluation.
            </p>
            <Button onClick={handleCreate} disabled={saving}>
              <Store className="w-4 h-4 mr-2" />
              Create Integration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors = {
    draft: "bg-slate-100 text-slate-600",
    pending_review: "bg-amber-100 text-amber-700",
    active: "bg-emerald-100 text-emerald-700",
    suspended: "bg-orange-100 text-orange-700",
    disabled: "bg-rose-100 text-rose-700",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AWS Marketplace Trust Center"
        subtitle="Feature your compliance posture on your AWS Marketplace listing so buyers access compliance docs during purchase."
        actions={
          <div className="flex items-center gap-2">
            <Badge className={statusColors[config.integration_status]}>
              {config.integration_status.replace(/_/g, " ")}
            </Badge>
            <Button variant="outline" onClick={loadPreview} disabled={loadingPreview}>
              <Eye className="w-4 h-4 mr-2" />
              {loadingPreview ? "Loading..." : "Preview Feed"}
            </Button>
            {config.integration_status !== "active" ? (
              <Button onClick={handleActivate} disabled={saving}>
                <Zap className="w-4 h-4 mr-2" />
                Activate Feed
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Feed Requests" value={config.feed_request_count || 0} icon={Activity} color="blue" />
        <StatCard label="Buyer Access Requests" value={config.buyer_access_requests || 0} icon={FileCheck} color="green" />
        <StatCard label="Frameworks Exposed" value={(config.expose_frameworks || []).length} icon={Shield} color="purple" />
        <StatCard label="Overall Score" value={feedPreview?.security_posture?.overall_compliance_score != null ? `${feedPreview.security_posture.overall_compliance_score}%` : "—"} icon={Gauge} color="amber" />
      </div>

      <Tabs defaultValue="listing">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="listing">Listing</TabsTrigger>
          <TabsTrigger value="exposure">Data Exposure</TabsTrigger>
          <TabsTrigger value="security">Security & SLAs</TabsTrigger>
          <TabsTrigger value="embed">Embed & URLs</TabsTrigger>
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
        </TabsList>

        {/* === Listing Tab === */}
        <TabsContent value="listing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Store className="w-5 h-5 text-orange-500" /> AWS Marketplace Listing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Seller Display Name *</Label>
                  <Input value={config.seller_name || ""} onChange={e => setConfig({ ...config, seller_name: e.target.value })} placeholder="Acme Security Inc." />
                </div>
                <div>
                  <Label>AWS Seller ID (12-digit account)</Label>
                  <Input value={config.seller_id || ""} onChange={e => setConfig({ ...config, seller_id: e.target.value })} placeholder="123456789012" />
                </div>
                <div>
                  <Label>Product Name</Label>
                  <Input value={config.product_name || ""} onChange={e => setConfig({ ...config, product_name: e.target.value })} placeholder="Acme GRC Platform" />
                </div>
                <div>
                  <Label>Product ID</Label>
                  <Input value={config.product_id || ""} onChange={e => setConfig({ ...config, product_id: e.target.value })} placeholder="prod-xxxx1234" />
                </div>
                <div className="md:col-span-2">
                  <Label>AWS Marketplace Listing URL</Label>
                  <Input value={config.listing_url || ""} onChange={e => setConfig({ ...config, listing_url: e.target.value })} placeholder="https://aws.amazon.com/marketplace/pp/prod-xxxx" />
                </div>
                <div>
                  <Label>Feed Slug (public URL identifier) *</Label>
                  <Input value={config.feed_slug || ""} onChange={e => setConfig({ ...config, feed_slug: e.target.value })} placeholder="acme-aws-compliance" />
                  <p className="text-xs text-muted-foreground mt-1">This becomes part of your public feed URL.</p>
                </div>
                <div>
                  <Label>Integration Status</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={config.integration_status}
                    onChange={e => setConfig({ ...config, integration_status: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Data Exposure Tab === */}
        <TabsContent value="exposure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-blue-500" /> What Buyers Can See</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <ToggleRow
                  label="Compliance Frameworks"
                  description="Expose framework compliance scores and control counts"
                  checked={true}
                  disabled={true}
                />
                <ToggleRow
                  label="Certifications"
                  description="Include certification records (SOC 2, ISO 27001, etc.)"
                  checked={config.expose_certifications}
                  onChange={v => setConfig({ ...config, expose_certifications: v })}
                />
                <ToggleRow
                  label="Controls Summary"
                  description="Show pass/fail control counts per framework"
                  checked={config.expose_controls_summary}
                  onChange={v => setConfig({ ...config, expose_controls_summary: v })}
                />
                <ToggleRow
                  label="Subprocessors"
                  description="Include active subprocessor list"
                  checked={config.expose_subprocessors}
                  onChange={v => setConfig({ ...config, expose_subprocessors: v })}
                />
                <ToggleRow
                  label="Penetration Tests"
                  description="Include completed pen test summaries"
                  checked={config.expose_pen_tests}
                  onChange={v => setConfig({ ...config, expose_pen_tests: v })}
                />
                <ToggleRow
                  label="Incident History"
                  description="Include resolved incident summaries (last 10)"
                  checked={config.expose_incident_history}
                  onChange={v => setConfig({ ...config, expose_incident_history: v })}
                />
                <ToggleRow
                  label="Data Residency"
                  description="Include hosting regions and residency statement"
                  checked={config.expose_data_residency}
                  onChange={v => setConfig({ ...config, expose_data_residency: v })}
                />
              </div>

              <div className="pt-4 border-t">
                <Label className="font-semibold">Frameworks to Expose</Label>
                <p className="text-xs text-muted-foreground mb-3">Select which frameworks appear in the feed. Leave empty to expose all.</p>
                <div className="flex flex-wrap gap-2">
                  {frameworks.map(fw => {
                    const selected = (config.expose_frameworks || []).includes(fw.code);
                    return (
                      <button
                        key={fw.id}
                        onClick={() => toggleFramework(fw.code)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:bg-accent"
                        }`}
                      >
                        {fw.code?.toUpperCase()} — {fw.name}
                      </button>
                    );
                  })}
                  {frameworks.length === 0 && (
                    <p className="text-sm text-muted-foreground">No frameworks configured yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-amber-500" /> Document Access Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Document Access Mode</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={config.document_access_mode}
                  onChange={e => setConfig({ ...config, document_access_mode: e.target.value })}
                >
                  <option value="public">Public — anyone can download</option>
                  <option value="request_access">Request Access — buyers request via email</option>
                  <option value="nda_required">NDA Required — buyers must sign NDA first</option>
                </select>
              </div>
              <div>
                <Label>NDA / Access Request Email</Label>
                <Input
                  type="email"
                  value={config.nda_request_email || ""}
                  onChange={e => setConfig({ ...config, nda_request_email: e.target.value })}
                  placeholder="compliance@yourcompany.com"
                />
              </div>
              <ToggleRow
                label="Auto-approve AWS Marketplace Buyers"
                description="Automatically grant document access to verified AWS Marketplace buyer accounts"
                checked={config.auto_approve_aws_buyers}
                onChange={v => setConfig({ ...config, auto_approve_aws_buyers: v })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Security & SLAs Tab === */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-500" /> Encryption & Key Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Encryption at Rest</Label>
                  <Input value={config.encryption_at_rest || ""} onChange={e => setConfig({ ...config, encryption_at_rest: e.target.value })} />
                </div>
                <div>
                  <Label>Encryption in Transit</Label>
                  <Input value={config.encryption_in_transit || ""} onChange={e => setConfig({ ...config, encryption_in_transit: e.target.value })} />
                </div>
                <div>
                  <Label>KMS Provider</Label>
                  <Input value={config.kms_provider || ""} onChange={e => setConfig({ ...config, kms_provider: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-500" /> Data Residency</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>AWS Hosting Regions</Label>
                <p className="text-xs text-muted-foreground mb-2">Select the AWS regions where your product hosts customer data.</p>
                <div className="flex flex-wrap gap-2">
                  {["us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-northeast-1", "af-south-1", "me-south-1", "sa-east-1"].map(region => {
                    const selected = (config.data_hosting_regions || []).includes(region);
                    return (
                      <button
                        key={region}
                        onClick={() => toggleRegion(region)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:bg-accent"
                        }`}
                      >
                        {region}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Data Residency Statement</Label>
                <Textarea
                  value={config.data_residency_statement || ""}
                  onChange={e => setConfig({ ...config, data_residency_statement: e.target.value })}
                  placeholder="Customer data is stored exclusively in the selected AWS regions and is not transferred outside these regions without explicit consent."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-purple-500" /> Service Level Agreements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Incident Response SLA (hours)</Label>
                  <Input type="number" value={config.incident_response_sla_hours || 0} onChange={e => setConfig({ ...config, incident_response_sla_hours: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Breach Notification SLA (hours)</Label>
                  <Input type="number" value={config.breach_notification_sla_hours || 0} onChange={e => setConfig({ ...config, breach_notification_sla_hours: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Uptime SLA (%)</Label>
                  <Input type="number" step="0.01" value={config.uptime_sla_percentage || 99.9} onChange={e => setConfig({ ...config, uptime_sla_percentage: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Support Plan</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    value={config.support_plan}
                    onChange={e => setConfig({ ...config, support_plan: e.target.value })}
                  >
                    <option value="basic">Basic</option>
                    <option value="business">Business</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="enterprise_plus">Enterprise Plus</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Embed & URLs Tab === */}
        <TabsContent value="embed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Link2 className="w-5 h-5 text-blue-500" /> Public Feed URLs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>JSON API Endpoint</Label>
                <p className="text-xs text-muted-foreground mb-2">Use this URL in your AWS Marketplace listing's compliance section. Returns live JSON data.</p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={feedUrl} className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(feedUrl)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>HTML Buyer Preview Page</Label>
                <p className="text-xs text-muted-foreground mb-2">A styled HTML page buyers can view directly in their browser.</p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={feedHtmlUrl} className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(feedHtmlUrl)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={feedHtmlUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cloud className="w-5 h-5 text-orange-500" /> AWS Marketplace Listing Embed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Embed Code — Compliance Badge Link</Label>
                <p className="text-xs text-muted-foreground mb-2">Add this to your AWS Marketplace product description or README to link buyers to your live compliance feed.</p>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
{`🔗 View our live compliance status:
${feedUrl}

Or view the full compliance profile:
${feedHtmlUrl}`}
                </pre>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(`${feedUrl}\n${feedHtmlUrl}`)}>
                  <Copy className="w-4 h-4 mr-2" /> Copy Embed Text
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Label>iframe Embed (for partner portals)</Label>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto">
{`<iframe
  src="${feedHtmlUrl}"
  width="100%"
  height="800"
  frameborder="0"
  title="Compliance Profile"
></iframe>`}
                </pre>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(`<iframe src="${feedHtmlUrl}" width="100%" height="800" frameborder="0" title="Compliance Profile"></iframe>`)}>
                  <Copy className="w-4 h-4 mr-2" /> Copy iframe Code
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-slate-500" /> Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                <p>Configure your listing details, data exposure, and security settings in the tabs above.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                <p>Click <strong>Activate Feed</strong> to make your compliance data live for buyers.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                <p>Copy the JSON API endpoint or HTML preview URL and add it to your AWS Marketplace listing's product description or compliance documentation section.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                <p>Buyers evaluating your product on AWS Marketplace can click the link to view your live compliance posture, certifications, and request audit documents.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</span>
                <p>Document access requests are sent to your configured NDA request email. Enable auto-approve to grant verified AWS buyers instant access.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Live Preview Tab === */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-blue-500" /> Live Feed Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                </div>
              ) : feedPreview ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Feed is live and returning data</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-card rounded-lg border">
                      <p className="text-xs text-muted-foreground">Overall Score</p>
                      <p className="text-2xl font-bold text-primary">{feedPreview.security_posture?.overall_compliance_score}%</p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border">
                      <p className="text-xs text-muted-foreground">Frameworks</p>
                      <p className="text-2xl font-bold">{feedPreview.security_posture?.total_frameworks}</p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border">
                      <p className="text-xs text-muted-foreground">Certified</p>
                      <p className="text-2xl font-bold text-emerald-500">{feedPreview.security_posture?.certified_frameworks}</p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border">
                      <p className="text-xs text-muted-foreground">Uptime SLA</p>
                      <p className="text-2xl font-bold">{feedPreview.security_posture?.uptime_sla_percentage}%</p>
                    </div>
                  </div>

                  {feedPreview.frameworks?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Exposed Frameworks</h4>
                      <div className="space-y-2">
                        {feedPreview.frameworks.map((fw, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                            <div>
                              <p className="font-medium text-sm">{fw.name}</p>
                              <p className="text-xs text-muted-foreground">{fw.code?.toUpperCase()} · {fw.controls_passing}/{fw.controls_total} controls</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">{fw.compliance_score}%</p>
                              {fw.certified && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Certified</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" asChild>
                      <a href={feedHtmlUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Full HTML Preview
                      </a>
                    </Button>
                    <Button variant="outline" onClick={() => copyToClipboard(JSON.stringify(feedPreview, null, 2))}>
                      <Download className="w-4 h-4 mr-2" />
                      Copy JSON
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Click "Preview Feed" to load your live compliance data.</p>
                  <Button variant="outline" onClick={loadPreview}>
                    <Eye className="w-4 h-4 mr-2" />
                    Load Preview
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {config.integration_status === "active" && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
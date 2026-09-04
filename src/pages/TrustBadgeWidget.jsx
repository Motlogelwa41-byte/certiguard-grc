import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { Award, Copy, Check, ExternalLink, Eye } from "lucide-react";

export default function TrustBadgeWidget() {
  const { toast } = useToast();
  const [trustCenter, setTrustCenter] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const load = async () => {
    try {
      const tcs = await base44.entities.TrustCenter.list("-updated_date", 1);
      if (tcs.length > 0) setTrustCenter(tcs[0]);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const update = (field, value) => {
    setTrustCenter(tc => ({ ...tc, [field]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, tenant_id, ...payload } = trustCenter;
      await base44.entities.TrustCenter.update(trustCenter.id, payload);
      toast({ title: "Badge settings saved" });
      setPreviewKey(k => k + 1);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const embedUrl = trustCenter?.slug
    ? `${window.location.origin}/api/functions/getTrustBadgeWidget?slug=${trustCenter.slug}`
    : `${window.location.origin}/api/functions/getTrustBadgeWidget?slug=trust`;

  const embedCode = `<iframe src="${embedUrl}" width="340" height="400" frameborder="0" style="border:0; border-radius:16px; overflow:hidden;"></iframe>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!trustCenter) {
    return (
      <div className="p-6">
        <PageHeader title="Trust Badge Widget" subtitle="Embeddable compliance badge for customer websites" />
        <Card><CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Set up your Trust Center first to configure the badge widget.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Trust Badge Widget" subtitle="Embeddable compliance badge for customer websites" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5" /> Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-4 flex items-center justify-center">
              <iframe
                key={previewKey}
                src={embedUrl}
                width="340"
                height="400"
                frameBorder="0"
                style={{ border: 0, borderRadius: 16, overflow: "hidden" }}
                title="Trust Badge Preview"
              />
            </div>
            <div className="mt-4">
              <Label>Embed Code</Label>
              <div className="flex gap-2 mt-1">
                <Input readOnly value={embedCode} className="font-mono text-xs" />
                <Button onClick={copyEmbed} variant="outline" size="icon">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Copy this code and paste it into your website HTML where you want the badge to appear.</p>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5" /> Badge Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div><Label>Enable Badge Widget</Label><p className="text-xs text-muted-foreground">Make the embeddable badge accessible publicly</p></div>
              <Switch checked={trustCenter.badge_enabled} onCheckedChange={v => update("badge_enabled", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div><Label>Show Security Score</Label><p className="text-xs text-muted-foreground">Display numeric score on the badge</p></div>
              <Switch checked={trustCenter.badge_show_score} onCheckedChange={v => update("badge_show_score", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div><Label>Show Grade</Label><p className="text-xs text-muted-foreground">Display letter grade (A-F)</p></div>
              <Switch checked={trustCenter.badge_show_grade} onCheckedChange={v => update("badge_show_grade", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div><Label>Show Frameworks</Label><p className="text-xs text-muted-foreground">Display compliance framework badges</p></div>
              <Switch checked={trustCenter.badge_show_frameworks} onCheckedChange={v => update("badge_show_frameworks", v)} />
            </div>

            <div className="flex items-center justify-between">
              <div><Label>Show Certifications</Label><p className="text-xs text-muted-foreground">Display active certifications</p></div>
              <Switch checked={trustCenter.badge_show_certifications} onCheckedChange={v => update("badge_show_certifications", v)} />
            </div>

            <div>
              <Label htmlFor="slug">Trust Center Slug</Label>
              <Input id="slug" value={trustCenter.slug || ""} onChange={e => update("slug", e.target.value)} placeholder="trust" className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">The URL path used to identify your trust center</p>
            </div>

            <div>
              <Label htmlFor="accent">Accent Color</Label>
              <Input id="accent" value={trustCenter.accent_color || ""} onChange={e => update("accent_color", e.target.value)} placeholder="#2563eb" className="mt-1" />
            </div>

            <div className="flex items-center justify-between">
              <div><Label>Published</Label><p className="text-xs text-muted-foreground">Trust center must be published for badge to work</p></div>
              <Switch checked={trustCenter.is_published} onCheckedChange={v => update("is_published", v)} />
            </div>

            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
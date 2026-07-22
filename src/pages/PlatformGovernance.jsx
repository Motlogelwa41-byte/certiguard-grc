import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, ChevronDown, ChevronRight, Send, ShieldCheck, Lock, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { PLATFORM_POLICIES } from "@/lib/platformPolicies";

const categoryColors = {
  information_security: "bg-emerald-100 text-emerald-700",
  data_privacy: "bg-purple-100 text-purple-700",
  acceptable_use: "bg-blue-100 text-blue-700",
  access_control: "bg-indigo-100 text-indigo-700",
  incident_response: "bg-red-100 text-red-700",
  change_management: "bg-amber-100 text-amber-700",
  vendor_management: "bg-cyan-100 text-cyan-700",
  business_continuity: "bg-orange-100 text-orange-700",
  human_resources: "bg-pink-100 text-pink-700",
  physical_security: "bg-slate-100 text-slate-700",
};

const labelOf = (c) => c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

export default function PlatformGovernance() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [publishing, setPublishing] = useState(null);
  const [published, setPublished] = useState(new Set());
  const { toast } = useToast();

  const filtered = PLATFORM_POLICIES.filter(
    (p) => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.summary.toLowerCase().includes(search.toLowerCase())
  );

  const publishToRegister = async (p) => {
    setPublishing(p.id);
    try {
      await base44.entities.Policy.create({
        title: p.title,
        description: p.summary,
        content: p.content,
        category: p.category,
        status: "draft",
        version: p.version,
        owner_name: p.owner,
        next_review_date: p.nextReview,
        acknowledgment_required: true,
      });
      setPublished(new Set([...published, p.id]));
      toast({ title: "Published to Policy Register", description: `${p.title} now flows through the approval workflow.` });
    } catch (e) {
      toast({ title: "Error publishing policy", description: e.message, variant: "destructive" });
    } finally {
      setPublishing(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Platform Governance"
        subtitle="The policies that govern CertiGuard GRC itself — version-controlled, auditable, and aligned to POPIA, King IV, ISO 27001, and SOC 2."
      />

      {/* Integrity banner */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-6">
        <div className="rounded-lg bg-emerald-100 p-2">
          <Lock className="w-5 h-5 text-emerald-700" />
        </div>
        <div className="text-sm">
          <p className="font-semibold text-emerald-800">Tamper-evident by design</p>
          <p className="text-emerald-700 mt-0.5">
            Every action on risks, policies, and controls is recorded in an append-only, hash-chained audit trail. No user — including
            administrators — can modify or delete an audit record. Chain integrity is verifiable on demand from the Activity Log.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Governance Policies</p>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">{PLATFORM_POLICIES.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Current Version</p>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">1.0</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Review Cycle</p>
          <p className="text-2xl font-heading font-bold text-foreground mt-1">Annual</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Alignment</p>
          <p className="text-sm font-semibold text-foreground mt-2">POPIA · King IV · ISO 27001 · SOC 2</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Policy cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((p) => {
          const isOpen = expanded === p.id;
          const isPublished = published.has(p.id);
          return (
            <div key={p.id} className="bg-card rounded-xl border border-border p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground leading-tight">{p.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{p.summary}</p>
                  </div>
                </div>
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${categoryColors[p.category] || "bg-slate-100 text-slate-600"}`}>
                  {labelOf(p.category)}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-3">
                <span>Version {p.version}</span>
                <span>·</span>
                <span>Owner: {p.owner}</span>
                <span>·</span>
                <span>Reviewed: {p.lastReviewed}</span>
                <span>·</span>
                <span>Next review: {p.nextReview}</span>
              </div>

              <button
                onClick={() => setExpanded(isOpen ? null : p.id)}
                className="flex items-center gap-1 text-xs font-medium text-primary mt-3 self-start"
              >
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                {isOpen ? "Hide full policy" : "View full policy"}
              </button>

              {isOpen && (
                <div className="mt-3 rounded-lg bg-muted/30 border border-border p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed flex-1">
                  {p.content}
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {isPublished ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : null}
                  {isPublished ? "Published to register" : "Not yet in Policy Register"}
                </span>
                <Button size="sm" variant="outline" onClick={() => publishToRegister(p)} disabled={publishing === p.id || isPublished}>
                  <Send className="w-3.5 h-3.5 mr-1" />
                  {isPublished ? "Published" : "Publish to Register"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
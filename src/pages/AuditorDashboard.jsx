import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, ShieldCheck, FileText, Database, Download, LogOut, Search, CheckCircle2, XCircle, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/shared/StatusBadge";

export default function AuditorDashboard() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [controls, setControls] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [controlSearch, setControlSearch] = useState("");
  const [policySearch, setPolicySearch] = useState("");

  useEffect(() => {
    base44.functions
      .invoke("fetchAuditorDashboardData", {})
      .then((res) => {
        if (res?.error) {
          setError(res.error);
          return;
        }
        setControls(res.controls || []);
        setPolicies(res.policies || []);
        setLedger(res.ledger || []);
      })
      .catch(() => setError("Failed to load auditor data."))
      .finally(() => setLoading(false));
  }, []);

  const filteredControls = useMemo(() => {
    const q = controlSearch.toLowerCase();
    if (!q) return controls;
    return controls.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.control_id?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
    );
  }, [controls, controlSearch]);

  const filteredPolicies = useMemo(() => {
    const q = policySearch.toLowerCase();
    if (!q) return policies;
    return policies.filter(
      (p) => p.title?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    );
  }, [policies, policySearch]);

  const handleDownloadLedger = () => {
    const headers = ["Timestamp", "Submitted By", "File Name", "SHA-256 Hash", "Control ID", "Notes"];
    const rows = ledger.map((l) => [
      l.timestamp || "",
      l.user_name || "",
      l.file_name || "",
      l.sha256_hash || "",
      l.control_id || "",
      (l.notes || "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Evidence_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    logout(false);
    window.location.href = "/login";
  };

  if (loading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={handleLogout}>
            Back to Login
          </Button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Header — no sidebar, no nav */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-heading font-semibold text-foreground">Auditor Dashboard</h1>
              <p className="text-xs text-muted-foreground">Read-only compliance review</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-muted-foreground">{user?.full_name || user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Readiness Summary — for bank regulators to see progress at a glance */}
        <ReadinessBanner controls={controls} ledger={ledger} />

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-medium">Active Controls</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{controls.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium">Approved Policies</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{policies.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Database className="w-4 h-4" />
              <span className="text-xs font-medium">Evidence Records</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{ledger.length}</p>
          </div>
        </div>

        <Tabs defaultValue="controls">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="controls">Universal Controls</TabsTrigger>
            <TabsTrigger value="policies">Active Policies</TabsTrigger>
            <TabsTrigger value="ledger">Evidence Ledger</TabsTrigger>
          </TabsList>

          {/* Universal Controls — read-only */}
          <TabsContent value="controls" className="mt-4">
            <div className="mb-4 relative max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search controls..."
                value={controlSearch}
                onChange={(e) => setControlSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">ID</th>
                      <th className="text-left px-4 py-3">Title</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Automation</th>
                      <th className="text-left px-4 py-3 hidden lg:table-cell">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredControls.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          No active controls found.
                        </td>
                      </tr>
                    )}
                    {filteredControls.map((c) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.control_id || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{c.title}</div>
                          {c.description && (
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground capitalize hidden sm:table-cell">
                          {c.category?.replace(/_/g, " ") || "—"}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <StatusBadge status={c.automation_status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                          {c.owner_name || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Active Policies — read-only */}
          <TabsContent value="policies" className="mt-4">
            <div className="mb-4 relative max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Title</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
                      <th className="text-left px-4 py-3">Version</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Approved By</th>
                      <th className="text-left px-4 py-3 hidden lg:table-cell">Next Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPolicies.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          No approved policies found.
                        </td>
                      </tr>
                    )}
                    {filteredPolicies.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{p.title}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground capitalize hidden sm:table-cell">
                          {p.category?.replace(/_/g, " ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.version || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                          {p.approved_by || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                          {p.next_review_date || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Evidence Ledger — read-only with download */}
          <TabsContent value="ledger" className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <p className="text-sm text-muted-foreground">
                {ledger.length} evidence record{ledger.length !== 1 ? "s" : ""} with SHA-256 integrity hashes
              </p>
              <Button onClick={handleDownloadLedger} disabled={ledger.length === 0} size="sm">
                <Download className="w-4 h-4" />
                Download Ledger (CSV)
              </Button>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Timestamp</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Submitted By</th>
                      <th className="text-left px-4 py-3">File Name</th>
                      <th className="text-left px-4 py-3">SHA-256 Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-muted-foreground">
                          No evidence records found.
                        </td>
                      </tr>
                    )}
                    {ledger.map((l) => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {l.user_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground">{l.file_name || "—"}</td>
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono text-muted-foreground break-all">
                            {l.sha256_hash ? l.sha256_hash.slice(0, 16) + "…" : "—"}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ReadinessBanner({ controls, ledger }) {
  const passing = controls.filter((c) => c.status === "passing");
  const failing = controls.filter((c) => c.status === "failing");
  const notTested = controls.filter((c) => c.status === "not_tested" || !c.status);
  const tested = passing.length + failing.length;
  const score = tested > 0 ? Math.round((passing.length / tested) * 100) : 0;
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  const scoreColor = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";

  const approvedEvidence = ledger.filter((l) => l.status === "approved" || l.approved);
  const pendingEvidence = ledger.filter((l) => l.status === "pending_review" || (!l.status && !l.approved));
  const expiredEvidence = ledger.filter((l) => l.status === "expired");

  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-base font-heading font-semibold text-foreground">Compliance Readiness Summary</h2>
        <span className="ml-auto text-xs text-muted-foreground">Auto-calculated from live control test results</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Score ring */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={scoreColor}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 264} 264`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-2xl font-heading font-bold tabular-nums" style={{ color: scoreColor }}>{score}%</p>
            <p className="text-xs text-muted-foreground">Grade {grade}</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 w-full">
          <div className="rounded-lg border border-border p-3 text-center">
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
            <p className="text-xl font-heading font-bold text-emerald-600 tabular-nums">{passing.length}</p>
            <p className="text-xs text-muted-foreground">Passing</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <XCircle className="w-4 h-4 mx-auto mb-1 text-rose-600" />
            <p className="text-xl font-heading font-bold text-rose-600 tabular-nums">{failing.length}</p>
            <p className="text-xs text-muted-foreground">Failing</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600" />
            <p className="text-xl font-heading font-bold text-amber-600 tabular-nums">{notTested.length}</p>
            <p className="text-xs text-muted-foreground">Not Tested</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <Database className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-xl font-heading font-bold text-primary tabular-nums">{ledger.length}</p>
            <p className="text-xs text-muted-foreground">Evidence Items</p>
          </div>
        </div>
      </div>

      {failing.length > 0 && (
        <div className="flex items-center gap-2 mt-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="text-xs text-rose-700 font-medium">
            {failing.length} control(s) currently failing — remediation required before audit sign-off.
          </p>
        </div>
      )}
    </div>
  );
}
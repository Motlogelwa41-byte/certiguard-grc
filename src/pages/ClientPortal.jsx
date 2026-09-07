import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle2, FileCheck, Award, TrendingUp, Loader2, Lock, Building2 } from "lucide-react";

export default function ClientPortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // Fetch public security rating (already designed for external consumption)
        const res = await base44.functions.invoke("getPublicSecurityRating", {}).catch(() => null);
        const resData = res ? (res.data || res) : null;
        if (resData && !resData.error) {
          setData(resData);
        } else {
          // Fallback: fetch compliance data directly
          const [controls, frameworks, certifications] = await Promise.all([
            base44.entities.Control.list().catch(() => []),
            base44.entities.Framework.list().catch(() => []),
            base44.entities.Certification.list().catch(() => []),
          ]);
          const passing = (controls || []).filter((c) => c.status === "passing").length;
          const total = (controls || []).length;
          const score = total > 0 ? Math.round((passing / total) * 100) : 0;
          setData({
            score,
            grade: score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F",
            total_controls: total,
            passing_controls: passing,
            frameworks: frameworks || [],
            certifications: (certifications || []).filter((c) => c.status === "active" || c.status === "certified"),
          });
        }
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">Compliance portal not available</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const score = data?.score || 0;
  const grade = data?.grade || "—";
  const scoreColor = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";
  const orgName = data?.organization_name || data?.brand_display_name || "Our Organization";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Branded header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data?.brand_logo_url ? (
              <img src={data.brand_logo_url} alt={orgName} className="h-8 w-auto" />
            ) : (
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-heading font-semibold text-foreground">{orgName}</h1>
              <p className="text-xs text-muted-foreground">Compliance Posture Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Lock className="w-3 h-3" /> Verified
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Compliance Score Hero */}
        <div className="rounded-2xl border border-border bg-card p-8 mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-base font-heading font-semibold text-foreground">Security & Compliance Posture</h2>
          </div>
          <div className="relative inline-flex items-center justify-center mb-4">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 264} 264`} className="transition-all duration-1000" />
            </svg>
            <div className="absolute text-center">
              <p className="text-4xl font-heading font-bold" style={{ color: scoreColor }}>{score}%</p>
              <p className="text-sm text-muted-foreground mt-1">Grade {grade}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This compliance score is calculated from {data?.total_controls || 0} active controls and updated in real-time.
            {data?.custom_message && ` ${data.custom_message}`}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-emerald-600" />
            <p className="text-2xl font-heading font-bold text-foreground">{data?.passing_controls || 0}</p>
            <p className="text-xs text-muted-foreground">Passing Controls</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <FileCheck className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-heading font-bold text-foreground">{data?.total_controls || 0}</p>
            <p className="text-xs text-muted-foreground">Total Controls</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <Award className="w-5 h-5 mx-auto mb-2 text-amber-600" />
            <p className="text-2xl font-heading font-bold text-foreground">{data?.certifications?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Certifications</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-heading font-bold text-foreground">{data?.frameworks?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Active Frameworks</p>
          </div>
        </div>

        {/* Active Frameworks */}
        {data?.frameworks && data.frameworks.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Active Compliance Frameworks
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.frameworks.slice(0, 9).map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.name || f.framework_name || "Framework"}</p>
                    <p className="text-xs text-muted-foreground">{f.status || "active"}</p>
                  </div>
                  {f.readiness_score != null && (
                    <span className="text-sm font-semibold text-primary">{f.readiness_score}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Certifications */}
        {data?.certifications && data.certifications.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6 mb-6">
            <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" /> Active Certifications
            </h3>
            <div className="space-y-2">
              {data.certifications.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name || c.certification_name || "Certification"}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.issuer || "—"} · {c.valid_until || c.expiry_date || "—"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> {c.status || "active"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Compliance data verified by CertiGuard GRC Platform · Last updated {new Date().toLocaleDateString()}
          </p>
          {data?.brand_footer_text && (
            <p className="text-xs text-muted-foreground mt-1">{data.brand_footer_text}</p>
          )}
        </div>
      </main>
    </div>
  );
}
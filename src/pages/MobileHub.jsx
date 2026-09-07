import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import {
  Shield, AlertTriangle, CheckCircle, Camera, Upload, Loader2,
  FileCheck, Clock, ChevronRight, Bell, TrendingUp, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MobileHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({ complianceScore: 0, overdueTasks: 0, pendingApprovals: 0, openRisks: 0, evidenceItems: 0 });
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [recentEvidence, setRecentEvidence] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [controls, tasks, risks, evidence] = await Promise.all([
          base44.entities.Control.list().catch(() => []),
          base44.entities.ComplianceTask.list().catch(() => []),
          base44.entities.Risk.list().catch(() => []),
          base44.entities.Evidence.list("-created_date", 5).catch(() => []),
        ]);

        const passing = (controls || []).filter((c) => c.status === "passing").length;
        const score = controls.length ? Math.round((passing / controls.length) * 100) : 0;
        const overdue = (tasks || []).filter((t) => t.status === "overdue" || (t.due_date && t.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10) && t.status !== "completed"));
        const openR = (risks || []).filter((r) => r.status === "open" || r.status === "mitigating");

        setStats({
          complianceScore: score,
          overdueTasks: overdue.length,
          pendingApprovals: 0,
          openRisks: openR.length,
          evidenceItems: evidence.length,
        });
        setOverdueTasks(overdue.slice(0, 5));
        setRecentEvidence(evidence || []);
      } catch (e) {
        // ignore
      }
      setLoading(false);
    })();
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Evidence.create({
        title: `Photo Evidence — ${file.name}`,
        description: `Photo uploaded from mobile hub by ${user?.full_name || "user"} on ${new Date().toLocaleDateString()}`,
        type: "screenshot",
        status: "pending_review",
        collected_date: new Date().toISOString().slice(0, 10),
        file_url,
        notes: `Uploaded from mobile device. File: ${file.name}`,
      });
      toast({ title: "Evidence photo uploaded", description: "Submitted for review." });
      // Refresh recent evidence
      const ev = await base44.entities.Evidence.list("-created_date", 5).catch(() => []);
      setRecentEvidence(ev || []);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const scoreColor = stats.complianceScore >= 70 ? "text-success" : stats.complianceScore >= 40 ? "text-warning" : "text-destructive";
  const scoreBg = stats.complianceScore >= 70 ? "from-success/20 to-success/5" : stats.complianceScore >= 40 ? "from-warning/20 to-warning/5" : "from-destructive/20 to-destructive/5";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Mobile-first container — max-width to keep it phone-like on desktop */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">CertiGuard</h1>
            <p className="text-xs text-muted-foreground">Mobile Compliance Hub</p>
          </div>
          <Link to="/notification-center">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {stats.overdueTasks > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {stats.overdueTasks}
                </span>
              )}
            </Button>
          </Link>
        </div>

        {/* Compliance Score Hero Card */}
        <div className={`rounded-3xl bg-gradient-to-br ${scoreBg} border border-border p-6 text-center`}>
          <p className="text-sm text-muted-foreground mb-1">Compliance Score</p>
          <p className={`text-5xl font-heading font-bold ${scoreColor}`}>{stats.complianceScore}%</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <Shield className={`w-4 h-4 ${scoreColor}`} />
            <span className="text-xs text-muted-foreground">
              {stats.complianceScore >= 70 ? "Strong posture" : stats.complianceScore >= 40 ? "Needs attention" : "Critical gaps"}
            </span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/tasks" className="block">
            <div className="rounded-2xl bg-card border border-border p-4 active:scale-95 transition-transform">
              <div className="flex items-center justify-between mb-1">
                <AlertTriangle className={`w-5 h-5 ${stats.overdueTasks > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">{stats.overdueTasks}</p>
              <p className="text-xs text-muted-foreground">Overdue Tasks</p>
            </div>
          </Link>
          <Link to="/risks" className="block">
            <div className="rounded-2xl bg-card border border-border p-4 active:scale-95 transition-transform">
              <div className="flex items-center justify-between mb-1">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">{stats.openRisks}</p>
              <p className="text-xs text-muted-foreground">Open Risks</p>
            </div>
          </Link>
          <Link to="/evidence" className="block">
            <div className="rounded-2xl bg-card border border-border p-4 active:scale-95 transition-transform">
              <div className="flex items-center justify-between mb-1">
                <FileCheck className="w-5 h-5 text-primary" />
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">{stats.evidenceItems}</p>
              <p className="text-xs text-muted-foreground">Evidence Items</p>
            </div>
          </Link>
          <Link to="/notification-center" className="block">
            <div className="rounded-2xl bg-card border border-border p-4 active:scale-95 transition-transform">
              <div className="flex items-center justify-between mb-1">
                <Bell className="w-5 h-5 text-blue-500" />
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">{stats.overdueTasks}</p>
              <p className="text-xs text-muted-foreground">Alerts</p>
            </div>
          </Link>
        </div>

        {/* Evidence Photo Upload */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <h2 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> Quick Evidence Capture
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <Button
            className="w-full h-14 rounded-xl text-base"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Camera className="w-5 h-5 mr-2" /> Take Photo / Upload Evidence</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Snap a photo of physical evidence, documents, or screens — auto-uploaded for review.
          </p>
        </div>

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-destructive" /> Overdue Tasks
              </h2>
              <Link to="/tasks" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {overdueTasks.map((t) => (
                <Link key={t.id} to="/tasks" className="block">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-destructive/5 border border-destructive/10 active:scale-98 transition-transform">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">Due {t.due_date} · {t.assignee_name || "Unassigned"}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Evidence */}
        {recentEvidence.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Recent Evidence
              </h2>
              <Link to="/evidence" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {recentEvidence.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
                  <FileCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{ev.status} · {ev.collected_date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Nav */}
        <div className="grid grid-cols-3 gap-2 pb-4">
          {[
            { label: "Controls", path: "/controls", icon: Shield },
            { label: "Tasks", path: "/tasks", icon: CheckCircle },
            { label: "Reports", path: "/one-click-report", icon: FileText },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}>
                <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border border-border active:scale-95 transition-transform">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
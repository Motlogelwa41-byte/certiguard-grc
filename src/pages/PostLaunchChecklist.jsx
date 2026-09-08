import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Circle, Users, Mail, Activity, Calendar,
  Bell, Shield, TrendingUp, AlertTriangle, MessageSquare, Zap
} from "lucide-react";

const CHECKLIST_SECTIONS = [
  {
    title: "Daily Monitoring (First 30 Days)",
    icon: Activity,
    color: "text-blue-600",
    items: [
      { id: "d1", task: "Check Dashboard for new trial signups and demo requests", owner: "Admin" },
      { id: "d2", task: "Review Onboarding Health Check results for new tenants", owner: "Compliance Officer" },
      { id: "d3", task: "Monitor DPO Pay checkout success rate (failed payments = lost revenue)", owner: "Admin" },
      { id: "d4", task: "Check Slack/Teams for critical risk and control failure alerts", owner: "Risk Manager" },
      { id: "d5", task: "Verify all 45+ automated workflows ran successfully (check workflow dashboard)", owner: "Admin" },
      { id: "d6", task: "Review Audit Trail for any suspicious or failed operations", owner: "Admin" },
    ]
  },
  {
    title: "Support Ticket Management",
    icon: MessageSquare,
    color: "text-emerald-600",
    items: [
      { id: "s1", task: "Set up a shared inbox (support@ethicaledgegrcconsulting.com) for user queries", owner: "Admin" },
      { id: "s2", task: "Establish a 24-hour response SLA for all support emails", owner: "Admin" },
      { id: "s3", task: "Create a FAQ document from early user questions to deflect repeat tickets", owner: "Compliance Officer" },
      { id: "s4", task: "Track common pain points and log them for product improvement", owner: "Admin" },
      { id: "s5", task: "Escalate critical issues (data access, payment failures) within 2 hours", owner: "Admin" },
    ]
  },
  {
    title: "Onboarding Health Tracking",
    icon: Shield,
    color: "text-violet-600",
    items: [
      { id: "o1", task: "Monitor Onboarding Health Check dashboard for tenant completion rates", owner: "Compliance Officer" },
      { id: "o2", task: "Identify tenants who started but didn't complete onboarding (follow up within 48h)", owner: "Admin" },
      { id: "o3", task: "Review feedback survey responses (auto-sent 24h after onboarding completion)", owner: "Admin" },
      { id: "o4", task: "Track trial-to-paid conversion rate weekly", owner: "Admin" },
      { id: "o5", task: "Identify the most-used and least-used features from analytics", owner: "Admin" },
    ]
  },
  {
    title: "Weekly Status Syncs",
    icon: Calendar,
    color: "text-amber-600",
    items: [
      { id: "w1", task: "Schedule a weekly Monday 9am team sync (30 min) to review launch metrics", owner: "Admin" },
      { id: "w2", task: "Review: new signups, demo requests, trial conversions, churn, support tickets", owner: "Admin" },
      { id: "w3", task: "Discuss top 3 user pain points and assign owners for fixes", owner: "Admin" },
      { id: "w4", task: "Review feedback survey NPS scores and qualitative comments", owner: "Admin" },
      { id: "w5", task: "Plan feature prioritization for the following week based on user feedback", owner: "Admin" },
      { id: "w6", task: "Send a weekly summary to stakeholders (signups, revenue, health, risks)", owner: "Admin" },
    ]
  },
  {
    title: "Growth & Engagement",
    icon: TrendingUp,
    color: "text-rose-600",
    items: [
      { id: "g1", task: "Post launch announcement on LinkedIn with platform screenshots", owner: "Marketing" },
      { id: "g2", task: "Reach out to compliance consultants for the referral partner program", owner: "Admin" },
      { id: "g3", task: "Create G2 and Capterra listings with screenshots and feature tags", owner: "Marketing" },
      { id: "g4", task: "Follow up with demo requesters within 24 hours of their request", owner: "Admin" },
      { id: "g5", task: "Track Google Search Console for organic search visibility", owner: "Marketing" },
    ]
  },
  {
    title: "Platform Health & Security",
    icon: Zap,
    color: "text-sky-600",
    items: [
      { id: "p1", task: "Verify all OAuth connectors remain authorized (Slack, Teams, Gmail, Drive, Calendar)", owner: "Admin" },
      { id: "p2", task: "Monitor entity record counts for unexpected growth (storage limits)", owner: "Admin" },
      { id: "p3", task: "Review regulatory alert banners for new SADC regulatory changes", owner: "Compliance Officer" },
      { id: "p4", task: "Confirm evidence integrity scanner and audit chain verification are running", owner: "Compliance Officer" },
      { id: "p5", task: "Check that DPO Pay live credentials are still active (test a sandbox payment weekly)", owner: "Admin" },
    ]
  },
];

export default function PostLaunchChecklist() {
  const [completed, setCompleted] = useState({});
  const [stats, setStats] = useState({ demos: 0, onboardingChecks: 0, surveys: 0, trials: 0 });

  useEffect(() => {
    // Load completion state from localStorage
    const saved = localStorage.getItem("postLaunchChecklist");
    if (saved) setCompleted(JSON.parse(saved));

    // Fetch real platform stats
    Promise.all([
      base44.entities.DemoRequest.list("-created_date", 100).catch(() => []),
      base44.entities.OnboardingHealthCheck.list("-created_date", 50).catch(() => []),
      base44.entities.UserFeedbackSurvey.list("-created_date", 50).catch(() => []),
      base44.entities.Tenant.list("-created_date", 50).catch(() => []),
    ]).then(([demos, checks, surveys, tenants]) => {
      setStats({
        demos: (demos || []).length,
        onboardingChecks: (checks || []).filter(c => c.scan_status === "completed").length,
        surveys: (surveys || []).length,
        trials: (tenants || []).filter(t => t.subscription_status === "trial").length,
      });
    }).catch(() => {});
  }, []);

  const toggle = (id) => {
    const updated = { ...completed, [id]: !completed[id] };
    setCompleted(updated);
    localStorage.setItem("postLaunchChecklist", JSON.stringify(updated));
  };

  const totalItems = CHECKLIST_SECTIONS.reduce((s, sec) => s + sec.items.length, 0);
  const completedCount = Object.values(completed).filter(Boolean).length;
  const progressPct = Math.round((completedCount / totalItems) * 100);

  return (
    <div>
      <PageHeader
        title="Post-Launch Checklist"
        subtitle="Ensure your team manages early users properly — monitor, support, and grow"
      />

      {/* Progress + Live Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Checklist Progress</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-heading font-bold text-foreground">{progressPct}%</span>
              <span className="text-sm text-muted-foreground">{completedCount}/{totalItems} done</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Mail className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Demo Requests</span>
            </div>
            <p className="text-3xl font-heading font-bold text-foreground">{stats.demos}</p>
            <p className="text-xs text-muted-foreground mt-1">Follow up within 24h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Onboardings Done</span>
            </div>
            <p className="text-3xl font-heading font-bold text-foreground">{stats.onboardingChecks}</p>
            <p className="text-xs text-muted-foreground mt-1">Health checks completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Active Trials</span>
            </div>
            <p className="text-3xl font-heading font-bold text-foreground">{stats.trials}</p>
            <p className="text-xs text-muted-foreground mt-1">Track conversion weekly</p>
          </CardContent>
        </Card>
      </div>

      {/* Checklist Sections */}
      <div className="space-y-6">
        {CHECKLIST_SECTIONS.map((section) => {
          const sectionDone = section.items.filter(i => completed[i.id]).length;
          const sectionTotal = section.items.length;
          return (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <section.icon className={`w-4 h-4 ${section.color}`} />
                    {section.title}
                  </CardTitle>
                  <span className="text-xs font-medium text-muted-foreground">
                    {sectionDone}/{sectionTotal} complete
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className="flex items-start gap-3 w-full text-left p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      {completed[item.id] ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm ${completed[item.id] ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {item.task}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Owner: {item.owner}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Weekly Sync Template */}
      <Card className="mt-6 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-primary" />
            Weekly Status Sync Template (Every Monday 9am · 30 min)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-foreground mb-2">Agenda:</p>
              <ol className="space-y-1.5 text-muted-foreground list-decimal list-inside">
                <li>Launch metrics review (signups, demos, conversions, revenue)</li>
                <li>Support ticket review (open, resolved, common themes)</li>
                <li>Onboarding health (completion rate, stuck tenants)</li>
                <li>Feedback survey results (NPS, qualitative comments)</li>
                <li>Top 3 user pain points + owners assigned</li>
                <li>Feature prioritization for the week ahead</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Key Metrics to Review:</p>
              <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
                <li>Weekly trial signups (target: 5/wk organic)</li>
                <li>Demo requests (target: 2/wk)</li>
                <li>Gap analysis completions (target: 4/wk)</li>
                <li>Trial-to-paid conversion rate</li>
                <li>Average onboarding completion time</li>
                <li>NPS score from feedback surveys</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
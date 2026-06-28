import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Shield, FileCheck, AlertTriangle, CheckSquare,
  FileText, ArrowRight
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import VendorAssessmentWidget from "@/components/dashboard/VendorAssessmentWidget";
import ComplianceScoreRing from "@/components/dashboard/ComplianceScoreRing";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import QuickActions from "@/components/dashboard/QuickActions";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"];

export default function Dashboard() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [risks, setRisks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Framework.list(),
      base44.entities.Control.list(),
      base44.entities.Risk.list(),
      base44.entities.ComplianceTask.list(),
      base44.entities.Vendor.list(),
      base44.entities.VendorAssessment.list(),
    ]).then(([f, c, r, t, v, a]) => {
      setFrameworks(f);
      setControls(c);
      setRisks(r);
      setTasks(t);
      setVendors(v);
      setAssessments(a);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const passingControls = controls.filter((c) => c.status === "passing").length;
  const failingControls = controls.filter((c) => c.status === "failing").length;
  const openRisks = risks.filter((r) => r.status === "open" || r.status === "mitigating").length;
  const overdueTasks = tasks.filter((t) => t.status === "overdue").length;
  const pendingTasks = tasks.filter((t) => t.status === "todo" || t.status === "in_progress").length;

  // Compliance score: weighted average of passing controls + framework readiness
  const controlScore = controls.length > 0 ? Math.round((passingControls / controls.length) * 100) : 0;
  const frameworkScore = frameworks.length > 0
    ? Math.round(frameworks.reduce((sum, f) => sum + (f.readiness_score || 0), 0) / frameworks.length)
    : 0;
  const complianceScore = frameworks.length > 0
    ? Math.round(controlScore * 0.6 + frameworkScore * 0.4)
    : controlScore;

  const controlStatusData = [
    { name: "Passing", value: controls.filter((c) => c.status === "passing").length },
    { name: "Failing", value: controls.filter((c) => c.status === "failing").length },
    { name: "Not Tested", value: controls.filter((c) => c.status === "not_tested").length },
    { name: "N/A", value: controls.filter((c) => c.status === "not_applicable").length },
  ].filter((d) => d.value > 0);

  const riskByCategory = Object.entries(
    risks.reduce((acc, r) => {
      const cat = (r.category || "operational").replace(/_/g, " ");
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  return (
    <div>
      <PageHeader
        title="Compliance Dashboard"
        subtitle="Real-time overview of your organization's compliance posture"
      />

      {/* Score + Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center">
          <ComplianceScoreRing score={complianceScore} size={140} />
        </div>
        <div className="lg:col-span-2">
          <QuickActions />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Frameworks" value={frameworks.length} icon={Shield} color="blue" trendLabel={`${frameworks.filter(f => f.status === 'certified').length} certified`} />
        <StatCard label="Controls" value={controls.length} icon={FileCheck} color="green" trendLabel={`${passingControls} passing`} trend={passingControls > failingControls ? "up" : "down"} />
        <StatCard label="Open Risks" value={openRisks} icon={AlertTriangle} color={openRisks > 0 ? "amber" : "green"} trendLabel={`${risks.length} total`} />
        <StatCard label="Pending Tasks" value={pendingTasks} icon={CheckSquare} color={overdueTasks > 0 ? "red" : "blue"} trendLabel={overdueTasks > 0 ? `${overdueTasks} overdue` : "On track"} trend={overdueTasks > 0 ? "down" : "up"} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Control Status Chart */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Control Status</h3>
          {controlStatusData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={controlStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={2} stroke="hsl(var(--card))">
                    {controlStatusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {controlStatusData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No controls added yet</p>
          )}
        </div>

        {/* Risk Distribution */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Risk Distribution</h3>
          {riskByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={riskByCategory} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No risks added yet</p>
          )}
        </div>
      </div>

      {/* Framework Readiness */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-foreground">Framework Readiness</h3>
          <Link to="/frameworks" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {frameworks.length > 0 ? (
          <div className="space-y-3">
            {frameworks.map((fw) => {
              const pct = fw.total_controls > 0 ? Math.round((fw.passing_controls / fw.total_controls) * 100) : fw.readiness_score || 0;
              return (
                <div key={fw.id} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-foreground w-32 truncate">{fw.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-12 text-right">{pct}%</span>
                  <StatusBadge status={fw.status} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">Add frameworks to track compliance readiness</p>
        )}
      </div>

      {/* Recent Items + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground">Recent Tasks</h3>
            <Link to="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.assignee_name || "Unassigned"}</p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No tasks yet</p>
          )}
        </div>

        <VendorAssessmentWidget assessments={assessments} />
        <ActivityFeed />
      </div>
    </div>
  );
}
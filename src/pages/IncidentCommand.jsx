import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  ShieldAlert, Clock, TrendingDown, TrendingUp, CheckCircle2,
  AlertTriangle, ArrowUp, Users, Activity, ArrowRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell, PieChart, Pie
} from "recharts";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";

const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#10b981" };
const SEV_BG = { critical: "bg-red-100 text-red-700 border-red-200", high: "bg-orange-100 text-orange-700 border-orange-200", medium: "bg-amber-100 text-amber-700 border-amber-200", low: "bg-emerald-100 text-emerald-700 border-emerald-200" };

function calcHours(from, to) {
  if (!from || !to) return null;
  const diff = new Date(to) - new Date(from);
  return diff > 0 ? Math.round((diff / 3600000) * 10) / 10 : null;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  );
};

function MetricTile({ label, value, unit, sub, color, icon: Icon, trend }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <p className={`text-2xl font-bold ${color || "text-foreground"}`}>
        {value ?? "—"}{value != null && unit && <span className="text-sm font-normal ml-0.5">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {trend != null && (
        <div className={`flex items-center gap-1 text-xs mt-1 font-medium ${trend <= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {trend <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
          {Math.abs(trend)}% vs last period
        </div>
      )}
    </div>
  );
}

export default function IncidentCommand() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Incident.list("-created_date").then(d => { setIncidents(d); setLoading(false); });
  }, []);

  const metrics = useMemo(() => {
    const open = incidents.filter(i => !["closed", "false_positive", "remediated"].includes(i.status));
    const closed = incidents.filter(i => ["closed", "remediated"].includes(i.status));
    const critical = incidents.filter(i => i.severity === "critical" && !["closed", "false_positive"].includes(i.status));

    const withMTTR = closed.map(i => ({
      ...i,
      mttr: calcHours(i.detected_date, i.resolved_date || i.remediated_date),
      mttc: calcHours(i.detected_date, i.contained_date),
    })).filter(i => i.mttr !== null);

    const avgMTTR = withMTTR.length ? Math.round(withMTTR.reduce((s, i) => s + i.mttr, 0) / withMTTR.length * 10) / 10 : null;
    const avgMTTC = withMTTR.filter(i => i.mttc).length
      ? Math.round(withMTTR.filter(i => i.mttc).reduce((s, i) => s + i.mttc, 0) / withMTTR.filter(i => i.mttc).length * 10) / 10
      : null;

    const escalated = incidents.filter(i => (i.escalation_level || 0) > 0 && !["closed", "false_positive"].includes(i.status));

    return { open, closed, critical, withMTTR, avgMTTR, avgMTTC, escalated };
  }, [incidents]);

  // MTTR by severity
  const mttrBySev = useMemo(() => ["critical", "high", "medium", "low"].map(sev => {
    const items = metrics.withMTTR.filter(i => i.severity === sev);
    const avg = items.length ? Math.round(items.reduce((s, i) => s + i.mttr, 0) / items.length * 10) / 10 : 0;
    return { severity: sev.charAt(0).toUpperCase() + sev.slice(1), avg, count: items.length };
  }).filter(d => d.count > 0), [metrics.withMTTR]);

  // Incident trend: last 6 months
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const monthStr = d.toLocaleString("default", { month: "short" });
      const y = d.getFullYear(); const m = d.getMonth();
      const monthInc = incidents.filter(inc => {
        const cd = new Date(inc.detected_date || inc.created_date);
        return cd.getFullYear() === y && cd.getMonth() === m;
      });
      return {
        month: monthStr,
        total: monthInc.length,
        critical: monthInc.filter(i => i.severity === "critical").length,
        high: monthInc.filter(i => i.severity === "high").length,
        closed: monthInc.filter(i => ["closed", "remediated"].includes(i.status)).length,
      };
    });
  }, [incidents]);

  // Status distribution pie
  const statusData = useMemo(() => {
    const counts = {};
    incidents.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
  }, [incidents]);

  const STATUS_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#6b7280"];

  // Escalation chain summary
  const escalationData = useMemo(() => metrics.escalated.map(inc => {
    const chain = (() => { try { return JSON.parse(inc.escalation_chain || "[]"); } catch { return []; } })();
    const notified = chain.filter(c => c.notified_at);
    const acknowledged = chain.filter(c => c.acknowledged_at);
    return { ...inc, chain, notified, acknowledged };
  }), [metrics.escalated]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident Command Center"
        subtitle="Management view — incident trends, MTTR analytics, and live escalation status"
        actions={
          <Link to="/incidents">
            <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
              Manage Incidents <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        }
      />

      {/* Hero banner */}
      <div className="bg-gradient-to-r from-slate-900 to-red-950 rounded-2xl p-6 text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Open Incidents", value: metrics.open.length, color: metrics.open.length > 0 ? "text-red-400" : "text-emerald-400" },
            { label: "Critical Active", value: metrics.critical.length, color: metrics.critical.length > 0 ? "text-red-400" : "text-emerald-400" },
            { label: "Avg MTTR", value: metrics.avgMTTR != null ? `${metrics.avgMTTR}h` : "—", color: "text-blue-300" },
            { label: "Escalated Now", value: metrics.escalated.length, color: metrics.escalated.length > 0 ? "text-orange-400" : "text-emerald-400" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile label="Avg MTTR" value={metrics.avgMTTR} unit="hrs" sub={`${metrics.withMTTR.length} closed incidents`} color="text-primary" icon={Clock} />
        <MetricTile label="Avg MTTC" value={metrics.avgMTTC} unit="hrs" sub="Mean time to contain" color="text-blue-600" icon={Activity} />
        <MetricTile label="Total Incidents" value={incidents.length} sub={`${metrics.closed.length} resolved`} icon={ShieldAlert} />
        <MetricTile label="Escalated" value={metrics.escalated.length} sub="Awaiting resolution" color={metrics.escalated.length > 0 ? "text-orange-600" : "text-emerald-600"} icon={ArrowUp} />
      </div>

      {/* Trend + Status pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-1">Incident Trend — Last 6 Months</h3>
          <p className="text-xs text-muted-foreground mb-4">Monthly volume by severity</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="critical" name="Critical" fill={SEV_COLORS.critical} stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="high" name="High" fill={SEV_COLORS.high} stackId="a" />
              <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[3, 3, 0, 0]} hide />
              <Line type="monotone" dataKey="closed" name="Closed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-1">Status Distribution</h3>
          <p className="text-xs text-muted-foreground mb-3">All incidents by current state</p>
          {incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No incidents yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {statusData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                      <span className="text-muted-foreground capitalize">{d.name}</span>
                    </div>
                    <span className="font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MTTR by severity */}
      {mttrBySev.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-1">MTTR by Severity</h3>
          <p className="text-xs text-muted-foreground mb-4">Average hours to resolve, broken down by severity level</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={mttrBySev} barSize={40}>
              <XAxis dataKey="severity" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} unit="h" />
              <Tooltip formatter={v => [`${v}h`, "Avg MTTR"]} content={<CustomTooltip />} />
              <Bar dataKey="avg" name="Avg MTTR (h)" radius={[4, 4, 0, 0]}>
                {mttrBySev.map((entry, i) => <Cell key={i} fill={SEV_COLORS[entry.severity.toLowerCase()] || "#6366f1"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Escalation chain status */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-orange-500" />
          <h3 className="font-semibold text-foreground">Active Escalation Status</h3>
          <span className="ml-auto text-xs text-muted-foreground">{escalationData.length} escalated</span>
        </div>
        {escalationData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-500" />
            <p className="text-sm font-medium">No active escalations</p>
            <p className="text-xs mt-1">All incidents are within normal response thresholds</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {escalationData.map(inc => (
              <div key={inc.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {inc.incident_id && <span className="text-xs font-mono text-muted-foreground">{inc.incident_id}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${SEV_BG[inc.severity]}`}>{inc.severity}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-semibold flex items-center gap-1">
                        <ArrowUp className="w-3 h-3" />Level {inc.escalation_level}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground text-sm">{inc.title}</p>
                    <p className="text-xs text-muted-foreground">Detected: {inc.detected_date || "—"} · Assigned: {inc.assigned_to || "Unassigned"}</p>
                  </div>
                  <StatusBadge status={inc.status} />
                </div>
                {/* Chain progress */}
                <div className="flex items-center gap-2 flex-wrap">
                  {inc.chain.map((contact, i) => (
                    <div key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground text-xs">→</span>}
                      <div className={`text-xs px-2 py-1 rounded-lg border font-medium ${contact.acknowledged_at ? "bg-emerald-50 border-emerald-200 text-emerald-700" : contact.notified_at ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-muted border-border text-muted-foreground"}`}>
                        <span className="font-bold mr-1">L{contact.level}</span>{contact.name}
                        {contact.acknowledged_at && " ✓"}
                        {contact.notified_at && !contact.acknowledged_at && " 🔔"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open incidents table */}
      {metrics.open.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-foreground">Open Incidents</h3>
            <span className="ml-auto text-xs text-muted-foreground">{metrics.open.length} active</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  {["ID", "Title", "Severity", "Status", "Assigned To", "Detected", "Escalation"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...metrics.open]
                  .sort((a, b) => {
                    const so = { critical: 0, high: 1, medium: 2, low: 3 };
                    return (so[a.severity] ?? 4) - (so[b.severity] ?? 4);
                  })
                  .map(inc => (
                    <tr key={inc.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{inc.incident_id || "—"}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground max-w-48 truncate">{inc.title}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${SEV_BG[inc.severity]}`}>{inc.severity}</span>
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={inc.status} /></td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{inc.assigned_to || "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{inc.detected_date || "—"}</td>
                      <td className="px-4 py-2.5">
                        {(inc.escalation_level || 0) > 0
                          ? <span className="text-xs text-orange-600 font-semibold flex items-center gap-1"><ArrowUp className="w-3 h-3" />L{inc.escalation_level}</span>
                          : <span className="text-xs text-muted-foreground">None</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
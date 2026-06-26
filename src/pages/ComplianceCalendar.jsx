import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Pencil, Trash2,
  Clock, AlertTriangle, CheckCircle, LayoutGrid, List, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

const defaultForm = {
  title: "", type: "review", status: "upcoming", start_date: "", end_date: "",
  framework_name: "", description: "", assigned_to: "", priority: "medium", color: ""
};

const TYPE_COLORS = {
  audit: "#6366f1", review: "#3b82f6", certification_expiry: "#ef4444",
  training_deadline: "#f59e0b", policy_review: "#8b5cf6", control_test: "#06b6d4",
  evidence_expiry: "#ec4899", vendor_assessment: "#10b981", risk_review: "#f97316", other: "#6b7280"
};

const TYPE_LABELS = {
  audit: "Audit", review: "Task", certification_expiry: "Cert Expiry",
  training_deadline: "Training", policy_review: "Policy Review", control_test: "Control Test",
  evidence_expiry: "Evidence Expiry", vendor_assessment: "Vendor", risk_review: "Risk Review", other: "Other"
};

function EventPill({ ev, small }) {
  const color = TYPE_COLORS[ev.type] || "#6b7280";
  return (
    <div
      className={`truncate font-medium cursor-pointer hover:opacity-80 transition-opacity ${small ? "text-[9px] px-1 py-0.5" : "text-xs px-2 py-1"} rounded`}
      style={{ backgroundColor: color + "22", color, borderLeft: `2px solid ${color}` }}
      title={ev.title}
    >
      {small ? ev.title : `${TYPE_LABELS[ev.type]}: ${ev.title}`}
    </div>
  );
}

export default function ComplianceCalendar() {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [audits, setAudits] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [view, setView] = useState("calendar"); // "calendar" | "agenda"
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const { toast } = useToast();

  const loadAll = () => {
    Promise.all([
      base44.entities.ComplianceEvent.list(),
      base44.entities.ComplianceTask.list(),
      base44.entities.Audit.list(),
      base44.entities.Framework.list(),
      base44.entities.Policy.list(),
    ]).then(([ev, t, a, f, p]) => {
      setEvents(ev); setTasks(t); setAudits(a); setFrameworks(f); setPolicies(p);
      setLoading(false);
    });
  };

  useEffect(() => { loadAll(); }, []);

  const allItems = useMemo(() => {
    const items = [...events.map(e => ({ ...e, source: "manual" }))];

    tasks.filter(t => t.due_date && t.status !== "completed").forEach(t => {
      items.push({
        id: `task-${t.id}`, title: t.title, type: "review",
        status: t.status === "overdue" ? "overdue" : "upcoming",
        start_date: t.due_date, end_date: t.due_date,
        description: t.description, assigned_to: t.assignee_name,
        priority: t.priority, source: "auto", _sourceType: "task"
      });
    });

    audits.forEach(a => {
      if (a.start_date) items.push({
        id: `audit-${a.id}`, title: a.title, type: "audit",
        status: a.status === "completed" ? "completed" : "upcoming",
        start_date: a.start_date, end_date: a.end_date,
        description: a.description, framework_name: a.framework_name,
        priority: "high", source: "auto", _sourceType: "audit"
      });
    });

    frameworks.filter(f => f.expiry_date).forEach(f => {
      items.push({
        id: `cert-${f.id}`, title: `${f.name} Certification Expires`,
        type: "certification_expiry",
        status: new Date(f.expiry_date) < new Date() ? "overdue" : "upcoming",
        start_date: f.expiry_date, end_date: f.expiry_date,
        framework_name: f.name, priority: "critical", source: "auto", _sourceType: "framework"
      });
    });

    policies.filter(p => p.next_review_date).forEach(p => {
      items.push({
        id: `policy-${p.id}`, title: `Review: ${p.title}`,
        type: "policy_review",
        status: new Date(p.next_review_date) < new Date() ? "overdue" : "upcoming",
        start_date: p.next_review_date, end_date: p.next_review_date,
        description: p.description, priority: "medium", source: "auto", _sourceType: "policy"
      });
    });

    return items;
  }, [events, tasks, audits, frameworks, policies]);

  const filteredItems = useMemo(() =>
    filterType === "all" ? allItems : allItems.filter(e => e.type === filterType),
    [allItems, filterType]
  );

  // Calendar grid
  const startDay = currentMonth.clone().startOf("month").startOf("week");
  const endDay = currentMonth.clone().endOf("month").endOf("week");
  const days = [];
  let d = startDay.clone();
  while (d.isSameOrBefore(endDay, "day")) { days.push(d.clone()); d.add(1, "day"); }

  const getDayItems = (date) =>
    filteredItems.filter(e => {
      const s = moment(e.start_date);
      const en = e.end_date ? moment(e.end_date) : s;
      return date.isBetween(s, en, "day", "[]");
    });

  // This-week milestones
  const thisWeek = useMemo(() => {
    const start = moment().startOf("week");
    const end = moment().endOf("week");
    return filteredItems.filter(e => moment(e.start_date).isBetween(start, end, "day", "[]"))
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  }, [filteredItems]);

  const overdue = useMemo(() =>
    filteredItems.filter(e => e.status === "overdue" || (e.start_date && moment(e.start_date).isBefore(moment(), "day") && e.status !== "completed")),
    [filteredItems]
  );

  const upcoming90 = useMemo(() =>
    filteredItems
      .filter(e => {
        const d = moment(e.start_date);
        return d.isSameOrAfter(moment(), "day") && d.isBefore(moment().add(90, "days"), "day");
      })
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date)),
    [filteredItems]
  );

  const handleSave = async () => {
    try {
      if (editId) await base44.entities.ComplianceEvent.update(editId, form);
      else await base44.entities.ComplianceEvent.create(form);
      setOpen(false); setForm(defaultForm); setEditId(null); loadAll();
      toast({ title: editId ? "Event updated" : "Event created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({
      title: item.title || "", type: item.type || "review", status: item.status || "upcoming",
      start_date: item.start_date || "", end_date: item.end_date || "",
      framework_name: item.framework_name || "", description: item.description || "",
      assigned_to: item.assigned_to || "", priority: item.priority || "medium", color: item.color || ""
    });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => {
    if (typeof id === "string" && !id.match(/^[0-9a-f-]{36}$/i)) return;
    await base44.entities.ComplianceEvent.delete(id); loadAll(); toast({ title: "Deleted" });
  };

  const selectedDayItems = selectedDay ? getDayItems(selectedDay) : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Compliance Calendar"
        subtitle="Unified view of all tasks, audits, reviews, and certification deadlines"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button onClick={() => setView("calendar")} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === "calendar" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Calendar
              </button>
              <button onClick={() => setView("agenda")} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === "agenda" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                <List className="w-3.5 h-3.5" /> Agenda
              </button>
            </div>
            <Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Event
            </Button>
          </div>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "This Week", value: thisWeek.length, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Overdue", value: overdue.length, color: "text-red-400", bg: overdue.length > 0 ? "bg-red-500/10 border-red-500/20" : "bg-card border-border" },
          { label: "Next 30 Days", value: filteredItems.filter(e => { const d = moment(e.start_date); return d.isSameOrAfter(moment(), "day") && d.isBefore(moment().add(30, "days")); }).length, color: "text-amber-400", bg: "bg-card border-border" },
          { label: "Total Events", value: allItems.length, color: "text-foreground", bg: "bg-card border-border" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {view === "calendar" && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          {/* Calendar grid */}
          <div className="xl:col-span-3 bg-card rounded-xl border border-border overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(currentMonth.clone().subtract(1, "month"))}><ChevronLeft className="w-4 h-4" /></Button>
              <h2 className="font-heading text-base font-bold text-foreground">{currentMonth.format("MMMM YYYY")}</h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(currentMonth.clone().add(1, "month"))}><ChevronRight className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCurrentMonth(moment())}>Today</Button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center py-2 text-xs font-semibold text-muted-foreground bg-muted/30">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const dayItems = getDayItems(day);
                const isToday = day.isSame(moment(), "day");
                const isCurrentMonth = day.month() === currentMonth.month();
                const isSelected = selectedDay && day.isSame(selectedDay, "day");
                const hasOverdue = dayItems.some(e => e.status === "overdue" || (moment(e.start_date).isBefore(moment(), "day") && e.status !== "completed"));
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDay(isSelected ? null : day.clone())}
                    className={`min-h-[90px] border-b border-r border-border p-1.5 cursor-pointer transition-colors
                      ${isCurrentMonth ? "hover:bg-muted/30" : "opacity-40 bg-muted/10"}
                      ${isToday ? "bg-primary/5 ring-2 ring-primary ring-inset" : ""}
                      ${isSelected ? "bg-primary/10" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full
                        ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                        {day.format("D")}
                      </span>
                      {hasOverdue && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    </div>
                    <div className="space-y-0.5">
                      {dayItems.slice(0, 3).map((ev, j) => <EventPill key={j} ev={ev} small />)}
                      {dayItems.length > 3 && <div className="text-[8px] text-muted-foreground px-1">+{dayItems.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Selected day detail */}
            {selectedDay && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-foreground">{selectedDay.format("MMM D, YYYY")}</h3>
                  <button onClick={() => setSelectedDay(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                  {selectedDayItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No events on this day</p>
                  ) : selectedDayItems.map((ev) => (
                    <div key={ev.id} className="rounded-lg p-2.5 space-y-1" style={{ backgroundColor: (TYPE_COLORS[ev.type] || "#6b7280") + "15" }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold rounded px-1.5 py-0.5" style={{ backgroundColor: (TYPE_COLORS[ev.type]) + "30", color: TYPE_COLORS[ev.type] }}>{TYPE_LABELS[ev.type]}</span>
                          <p className="text-xs font-medium text-foreground mt-1">{ev.title}</p>
                        </div>
                        <StatusBadge status={ev.priority} />
                      </div>
                      {ev.assigned_to && <p className="text-[10px] text-muted-foreground">👤 {ev.assigned_to}</p>}
                      {ev.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{ev.description}</p>}
                      {ev.source === "manual" && (
                        <div className="flex gap-1 pt-1">
                          <button onClick={() => handleEdit(ev)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3 h-3 text-muted-foreground" /></button>
                          <button onClick={() => handleDelete(ev.id)} className="p-1 rounded hover:bg-muted"><Trash2 className="w-3 h-3 text-destructive" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* This week */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-sm text-foreground">This Week</h3>
              </div>
              <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                {thisWeek.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 flex flex-col items-center gap-1"><CheckCircle className="w-5 h-5 text-emerald-500" /> Clear this week</p>
                ) : thisWeek.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2">
                    <div className="w-1 h-full min-h-[24px] rounded-full shrink-0 mt-1" style={{ backgroundColor: TYPE_COLORS[ev.type] }} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground">{moment(ev.start_date).format("ddd MMM D")} · {TYPE_LABELS[ev.type]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Overdue */}
            {overdue.length > 0 && (
              <div className="bg-red-500/5 rounded-xl border border-red-500/20 overflow-hidden">
                <div className="px-4 py-3 border-b border-red-500/20 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h3 className="font-semibold text-sm text-red-400">{overdue.length} Overdue</h3>
                </div>
                <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                  {overdue.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="flex items-start gap-2">
                      <div className="w-1 min-h-[24px] rounded-full shrink-0 mt-1 bg-red-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{ev.title}</p>
                        <p className="text-[10px] text-red-400">{moment(ev.start_date).format("MMM D")} · {Math.abs(moment().diff(moment(ev.start_date), "days"))}d overdue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Legend</p>
              <div className="space-y-1.5">
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: TYPE_COLORS[k] }} />
                    <span className="text-xs text-muted-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "agenda" && (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="font-heading font-semibold text-red-400">Overdue ({overdue.length})</h3>
              </div>
              <div className="space-y-2">
                {overdue.map((ev) => <AgendaRow key={ev.id} ev={ev} onEdit={handleEdit} onDelete={handleDelete} />)}
              </div>
            </div>
          )}
          <div>
            <h3 className="font-heading font-semibold text-foreground mb-3">Upcoming — Next 90 Days ({upcoming90.length})</h3>
            {upcoming90.length === 0 ? (
              <div className="bg-card rounded-xl border border-border py-12 text-center text-muted-foreground text-sm">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" /> No upcoming events in the next 90 days
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming90.map((ev) => <AgendaRow key={ev.id} ev={ev} onEdit={handleEdit} onDelete={handleDelete} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Event" : "Add Calendar Event"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Framework</Label><Input value={form.framework_name} onChange={(e) => setForm({ ...form, framework_name: e.target.value })} /></div>
              <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} /></div>
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={!form.title || !form.start_date}>{editId ? "Update" : "Create Event"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgendaRow({ ev, onEdit, onDelete }) {
  const color = TYPE_COLORS[ev.type] || "#6b7280";
  const isOverdue = ev.status === "overdue" || (ev.start_date && moment(ev.start_date).isBefore(moment(), "day") && ev.status !== "completed");
  const daysAway = moment(ev.start_date).diff(moment(), "days");
  return (
    <div className="flex items-center gap-3 bg-card rounded-lg border border-border p-3 hover:bg-muted/20 transition-colors">
      <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="w-16 shrink-0 text-center">
        <p className="text-xs font-bold text-foreground">{moment(ev.start_date).format("MMM D")}</p>
        <p className="text-[10px] text-muted-foreground">{moment(ev.start_date).format("ddd")}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: color + "20", color }}>{TYPE_LABELS[ev.type]}</span>
          <span className="font-medium text-sm text-foreground truncate">{ev.title}</span>
          {ev.priority && <StatusBadge status={ev.priority} />}
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {isOverdue
              ? <span className="text-red-400 font-medium">{Math.abs(daysAway)}d overdue</span>
              : daysAway === 0 ? <span className="text-amber-400 font-medium">Today</span>
              : <span>{daysAway}d away</span>}
          </span>
          {ev.assigned_to && <span>· 👤 {ev.assigned_to}</span>}
          {ev.framework_name && <span>· {ev.framework_name}</span>}
        </p>
      </div>
      {ev.source === "manual" && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(ev)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
          <button onClick={() => onDelete(ev.id)} className="p-1 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
        </div>
      )}
    </div>
  );
}
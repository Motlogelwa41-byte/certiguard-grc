import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

const defaultForm = { title: "", type: "review", status: "upcoming", start_date: "", end_date: "", framework_name: "", description: "", assigned_to: "", priority: "medium", color: "" };

const eventTypeColors = {
  audit: "#6366f1", review: "#3b82f6", certification_expiry: "#ef4444",
  training_deadline: "#f59e0b", policy_review: "#8b5cf6", control_test: "#06b6d4",
  evidence_expiry: "#ec4899", vendor_assessment: "#10b981", risk_review: "#f97316", other: "#6b7280"
};

const eventTypeLabels = {
  audit: "Audit", review: "Review", certification_expiry: "Cert Expiry",
  training_deadline: "Training", policy_review: "Policy Review", control_test: "Control Test",
  evidence_expiry: "Evidence Expiry", vendor_assessment: "Vendor", risk_review: "Risk Review", other: "Other"
};

export default function ComplianceCalendar() {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [audits, setAudits] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const { toast } = useToast();

  const loadAll = () => {
    Promise.all([
      base44.entities.ComplianceEvent.list(),
      base44.entities.ComplianceTask.list(),
      base44.entities.Audit.list(),
      base44.entities.Framework.list(),
      base44.entities.Policy.list(),
    ]).then(([ev, t, a, f, p]) => { setEvents(ev); setTasks(t); setAudits(a); setFrameworks(f); setPolicies(p); setLoading(false); });
  };
  useEffect(() => { loadAll(); }, []);

  // Auto-generate events from other entities
  const allCalendarItems = useMemo(() => {
    const items = [...events.map(e => ({ ...e, source: "manual" }))];

    // Task due dates
    tasks.filter(t => t.due_date && t.status !== "completed").forEach(t => {
      if (!items.find(i => i.title === t.title && i.start_date === t.due_date)) {
        items.push({ id: `task-${t.id}`, title: t.title, type: "review", status: t.status === "overdue" ? "overdue" : "upcoming", start_date: t.due_date, end_date: t.due_date, description: t.description, assigned_to: t.assignee_name, priority: t.priority, source: "auto", _realId: t.id });
      }
    });

    // Audit dates
    audits.forEach(a => {
      if (a.start_date && !items.find(i => i._realId === a.id && i.source === "auto")) {
        items.push({ id: `audit-${a.id}`, title: a.title, type: "audit", status: a.status === "completed" ? "completed" : "upcoming", start_date: a.start_date, end_date: a.end_date, description: a.description, framework_name: a.framework_name, priority: "high", source: "auto", _realId: a.id });
      }
    });

    // Framework certification expiry
    frameworks.filter(f => f.expiry_date).forEach(f => {
      if (!items.find(i => i._realId === f.id && i.source === "auto")) {
        items.push({ id: `cert-${f.id}`, title: `${f.name} Certification Expires`, type: "certification_expiry", status: new Date(f.expiry_date) < new Date() ? "overdue" : "upcoming", start_date: f.expiry_date, end_date: f.expiry_date, framework_name: f.name, priority: "critical", source: "auto", _realId: f.id });
      }
    });

    // Policy review dates
    policies.filter(p => p.next_review_date).forEach(p => {
      if (!items.find(i => i._realId === p.id && i.source === "auto")) {
        items.push({ id: `policy-${p.id}`, title: `Review: ${p.title}`, type: "policy_review", status: new Date(p.next_review_date) < new Date() ? "overdue" : "upcoming", start_date: p.next_review_date, end_date: p.next_review_date, description: p.description, priority: "medium", source: "auto", _realId: p.id });
      }
    });

    return items;
  }, [events, tasks, audits, frameworks, policies]);

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
    if (typeof id === "string" && id.startsWith("task-")) return;
    await base44.entities.ComplianceEvent.delete(id); loadAll(); toast({ title: "Deleted" });
  };

  // Build calendar grid
  const startOfMonth = currentMonth.clone().startOf("month");
  const endOfMonth = currentMonth.clone().endOf("month");
  const startDay = startOfMonth.clone().startOf("week");
  const endDay = endOfMonth.clone().endOf("week");
  const days = [];
  let day = startDay.clone();
  while (day.isBefore(endDay) || day.isSame(endDay, "day")) {
    days.push(day.clone()); day.add(1, "day");
  }

  const getDayEvents = (date) => allCalendarItems.filter(e => {
    const s = moment(e.start_date);
    const ed = e.end_date ? moment(e.end_date) : s;
    return date.isBetween(s, ed, "day", "[]");
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Compliance Calendar" subtitle="Visual timeline of audits, reviews, certifications, and deadlines" actions={
        <Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Event</Button>
      } />
      
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4 bg-card rounded-xl border border-border p-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(currentMonth.clone().subtract(1, "month"))}><ChevronLeft className="w-5 h-5" /></Button>
        <h2 className="font-heading text-lg font-bold text-foreground">{currentMonth.format("MMMM YYYY")}</h2>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(currentMonth.clone().add(1, "month"))}><ChevronRight className="w-5 h-5" /></Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(moment())}>Today</Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
            <div key={i} className="text-center py-2 text-xs font-semibold text-muted-foreground bg-muted/30">{d}</div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const dayEvents = getDayEvents(d);
            const isToday = d.isSame(moment(), "day");
            const isCurrentMonth = d.month() === currentMonth.month();
            return (
              <div key={i} className={`min-h-[80px] border-b border-r border-border p-1.5 ${isCurrentMonth ? "" : "opacity-40 bg-muted/20"} ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}>
                <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>{d.format("D")}</div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <div key={j} className="text-[9px] px-1 py-0.5 rounded truncate font-medium cursor-pointer hover:opacity-80" style={{ backgroundColor: eventTypeColors[ev.type] + "20", color: eventTypeColors[ev.type], borderLeft: `2px solid ${eventTypeColors[ev.type]}` }} title={ev.title}>
                      {eventTypeLabels[ev.type]}: {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="mt-6">
        <h3 className="font-heading font-semibold text-foreground mb-3">Upcoming Events</h3>
        <div className="space-y-2">
          {allCalendarItems.filter(e => moment(e.start_date).isAfter(moment().subtract(1, "day"))).slice(0, 15).map((ev) => (
            <div key={ev.id} className="flex items-center gap-3 bg-card rounded-lg border border-border p-3">
              <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: eventTypeColors[ev.type] }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: eventTypeColors[ev.type] + "20", color: eventTypeColors[ev.type] }}>{eventTypeLabels[ev.type]}</span>
                  <span className="font-medium text-sm text-foreground truncate">{ev.title}</span>
                  {ev.priority && <StatusBadge status={ev.priority} />}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> {moment(ev.start_date).format("MMM DD, YYYY")}
                  {ev.end_date && ev.end_date !== ev.start_date && ` — ${moment(ev.end_date).format("MMM DD, YYYY")}`}
                  {ev.assigned_to && ` · ${ev.assigned_to}`}
                </p>
              </div>
              {ev.source === "manual" && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleEdit(ev)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3 h-3 text-muted-foreground" /></button>
                  <button onClick={() => handleDelete(ev.id)} className="p-1 rounded hover:bg-muted"><Trash2 className="w-3 h-3 text-destructive" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Event" : "Add Calendar Event"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, color: eventTypeColors[v] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(eventTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
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
                <SelectContent><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={!form.title || !form.start_date}>{editId ? "Update" : "Create Event"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
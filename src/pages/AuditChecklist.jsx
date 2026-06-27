import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, Trash2, Edit2, CheckSquare, Square, ChevronDown, ChevronRight,
  ClipboardList, Search, Download, RefreshCw, X, Check, GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/use-toast";

const defaultForm = {
  title: "", description: "", framework_name: "", framework_id: "",
  status: "draft", assigned_to: "", due_date: "",
};

function parseItems(raw) {
  try { return JSON.parse(raw || "[]"); } catch { return []; }
}

function progress(checklist) {
  const total = checklist.total_items || 0;
  const done = checklist.checked_items || 0;
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export default function AuditChecklist() {
  const [checklists, setChecklists] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null); // currently open checklist
  const [items, setItems] = useState([]);     // items for active checklist
  const [newItemText, setNewItemText] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({});
  const { toast } = useToast();

  const load = async () => {
    const [cls, fws] = await Promise.all([
      base44.entities.AuditChecklist.list("-created_date", 100),
      base44.entities.Framework.list(),
    ]);
    setChecklists(cls || []);
    setFrameworks(fws || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    checklists.filter(c =>
      !search || c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.framework_name?.toLowerCase().includes(search.toLowerCase())
    ), [checklists, search]);

  // ── Checklist CRUD ──────────────────────────────────────────────────────────
  const openNew = () => { setForm(defaultForm); setEditId(null); setListOpen(true); };
  const openEdit = (cl) => {
    setForm({ title: cl.title || "", description: cl.description || "", framework_name: cl.framework_name || "",
      framework_id: cl.framework_id || "", status: cl.status || "draft",
      assigned_to: cl.assigned_to || "", due_date: cl.due_date || "" });
    setEditId(cl.id); setListOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      if (editId) {
        await base44.entities.AuditChecklist.update(editId, form);
        toast({ title: "Checklist updated" });
      } else {
        const created = await base44.entities.AuditChecklist.create({ ...form, items: "[]", total_items: 0, checked_items: 0 });
        toast({ title: "Checklist created" });
        await load();
        openChecklist(created);
        setListOpen(false);
        setSaving(false);
        return;
      }
      setListOpen(false);
      await load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.AuditChecklist.delete(id);
    if (active?.id === id) setActive(null);
    toast({ title: "Checklist deleted" });
    load();
  };

  // ── Open a checklist for editing items ─────────────────────────────────────
  const openChecklist = (cl) => {
    setActive(cl);
    setItems(parseItems(cl.items));
    setExpandedCategories({});
  };

  // ── Item operations (all saved to entity) ───────────────────────────────────
  const saveItems = async (nextItems, cl = active) => {
    const checked = nextItems.filter(i => i.checked).length;
    const updated = await base44.entities.AuditChecklist.update(cl.id, {
      items: JSON.stringify(nextItems),
      total_items: nextItems.length,
      checked_items: checked,
      status: nextItems.length > 0 && checked === nextItems.length ? "completed"
            : checked > 0 ? "in_progress" : "draft",
    });
    setItems(nextItems);
    setActive(prev => ({ ...prev, ...updated, total_items: nextItems.length, checked_items: checked }));
    setChecklists(prev => prev.map(c => c.id === cl.id ? { ...c, total_items: nextItems.length, checked_items: checked } : c));
  };

  const addItem = async () => {
    const text = newItemText.trim();
    if (!text) return;
    const next = [...items, { id: Date.now().toString(), text, checked: false, category: newItemCategory || "General", notes: "" }];
    await saveItems(next);
    setNewItemText("");
  };

  const toggleItem = async (id) => {
    const next = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    await saveItems(next);
  };

  const deleteItem = async (id) => {
    await saveItems(items.filter(i => i.id !== id));
  };

  const updateItemNotes = async (id, notes) => {
    const next = items.map(i => i.id === id ? { ...i, notes } : i);
    await saveItems(next);
  };

  // ── CSV export ──────────────────────────────────────────────────────────────
  const exportChecklist = () => {
    if (!active) return;
    const rows = [["Category", "Item", "Status", "Notes"]];
    items.forEach(i => rows.push([i.category || "General", i.text, i.checked ? "Done" : "Pending", i.notes || ""]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${active.title.replace(/\s+/g,"_")}_checklist.csv`; a.click();
  };

  // ── Group items by category ─────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = {};
    items.forEach(item => {
      const cat = item.category || "General";
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return map;
  }, [items]);

  const toggleCategory = (cat) => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Checklists"
        subtitle="Break framework requirements into actionable checklist items for your team"
        actions={
          <div className="flex items-center gap-2">
            {active && (
              <>
                <Button variant="outline" size="sm" onClick={exportChecklist}>
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActive(null)}>
                  <X className="w-4 h-4 mr-1" /> Close
                </Button>
              </>
            )}
            <Button size="sm" onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> New Checklist
            </Button>
          </div>
        }
      />

      {active ? (
        /* ── CHECKLIST DETAIL VIEW ─────────────────────────────────────── */
        <div className="space-y-5">
          {/* Header card */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-xl font-heading font-bold text-foreground">{active.title}</h2>
                  <StatusBadge status={active.status} />
                  {active.framework_name && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{active.framework_name}</span>
                  )}
                </div>
                {active.description && <p className="text-sm text-muted-foreground">{active.description}</p>}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                  {active.assigned_to && <span>Assigned to: <strong>{active.assigned_to}</strong></span>}
                  {active.due_date && <span>Due: <strong>{active.due_date}</strong></span>}
                  <span>{active.checked_items || 0} / {active.total_items || 0} items complete</span>
                </div>
              </div>
              <button onClick={() => openEdit(active)} className="p-1.5 rounded hover:bg-muted shrink-0">
                <Edit2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Progress</span>
                <span className="font-semibold text-foreground">{progress(active)}%</span>
              </div>
              <Progress value={progress(active)} className="h-2" />
            </div>
          </div>

          {/* Add new item */}
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Add Checklist Item</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Item description, e.g. 'Review access control policy'"
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addItem()}
                className="flex-1"
              />
              <Input
                placeholder="Category (optional)"
                value={newItemCategory}
                onChange={e => setNewItemCategory(e.target.value)}
                className="w-full sm:w-44"
                onKeyDown={e => e.key === "Enter" && addItem()}
              />
              <Button onClick={addItem} disabled={!newItemText.trim()} className="shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Items grouped by category */}
          {Object.keys(grouped).length === 0 ? (
            <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 gap-3">
              <ClipboardList className="w-12 h-12 text-muted-foreground/30" />
              <p className="font-semibold text-foreground">No items yet</p>
              <p className="text-sm text-muted-foreground">Add checklist items above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([cat, catItems]) => {
                const allDone = catItems.every(i => i.checked);
                const someDone = catItems.some(i => i.checked);
                const isExpanded = expandedCategories[cat] !== false; // default expanded
                return (
                  <div key={cat} className="bg-card rounded-xl border border-border overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                      onClick={() => toggleCategory(cat)}
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <span className="font-semibold text-sm text-foreground flex-1">{cat}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allDone ? "bg-emerald-100 text-emerald-700" : someDone ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                        {catItems.filter(i => i.checked).length}/{catItems.length}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="divide-y divide-border">
                        {catItems.map(item => (
                          <ChecklistItem
                            key={item.id}
                            item={item}
                            onToggle={() => toggleItem(item.id)}
                            onDelete={() => deleteItem(item.id)}
                            onNotesChange={(notes) => updateItemNotes(item.id, notes)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── CHECKLIST LIST VIEW ───────────────────────────────────────── */
        <div className="space-y-5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search checklists..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          {filtered.length === 0 ? (
            <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 gap-3">
              <ClipboardList className="w-12 h-12 text-muted-foreground/30" />
              <p className="font-semibold text-foreground">No checklists yet</p>
              <p className="text-sm text-muted-foreground text-center max-w-sm">Create a checklist to break down framework requirements into actionable items for your team.</p>
              <Button size="sm" onClick={openNew} className="mt-2"><Plus className="w-4 h-4 mr-1" /> Create Checklist</Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map(cl => {
                const pct = progress(cl);
                return (
                  <div
                    key={cl.id}
                    className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => openChecklist(cl)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold text-foreground truncate">{cl.title}</h3>
                        {cl.framework_name && (
                          <span className="text-xs text-blue-600 font-medium">{cl.framework_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <button className="p-1.5 rounded hover:bg-muted" onClick={() => openEdit(cl)}>
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-muted" onClick={() => handleDelete(cl.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>

                    {cl.description && <p className="text-xs text-muted-foreground line-clamp-2">{cl.description}</p>}

                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{cl.checked_items || 0}/{cl.total_items || 0} done</span>
                        <span className="font-semibold text-foreground">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                      <StatusBadge status={cl.status} />
                      {cl.assigned_to && <span>{cl.assigned_to}</span>}
                      {cl.due_date && <span>Due {cl.due_date}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Checklist" : "New Audit Checklist"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input placeholder="e.g. ISO 27001 Annex A Review" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Framework</Label>
              <Select value={form.framework_id || "__none__"} onValueChange={v => {
                const fw = frameworks.find(f => f.id === v);
                setForm({ ...form, framework_id: v === "__none__" ? "" : v, framework_name: fw?.name || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Select framework (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {frameworks.map(fw => <SelectItem key={fw.id} value={fw.id}>{fw.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assigned To</Label>
                <Input placeholder="Name or team" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Optional description or scope" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving || !form.title}>
              {saving ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : null}
              {editId ? "Update Checklist" : "Create Checklist"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChecklistItem({ item, onToggle, onDelete, onNotesChange }) {
  const [showNotes, setShowNotes] = useState(false);
  const [notesVal, setNotesVal] = useState(item.notes || "");

  return (
    <div className={`px-4 py-3 ${item.checked ? "bg-emerald-50/30" : ""}`}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 shrink-0">
          {item.checked
            ? <CheckSquare className="w-5 h-5 text-emerald-500" />
            : <Square className="w-5 h-5 text-muted-foreground" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.text}</p>
          {item.notes && !showNotes && (
            <p className="text-xs text-muted-foreground mt-0.5 italic truncate">{item.notes}</p>
          )}
          {showNotes && (
            <div className="mt-2 flex gap-2">
              <Textarea
                value={notesVal}
                onChange={e => setNotesVal(e.target.value)}
                placeholder="Add notes..."
                rows={2}
                className="text-xs"
              />
              <div className="flex flex-col gap-1">
                <button className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { onNotesChange(notesVal); setShowNotes(false); }}>
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded hover:bg-muted" onClick={() => setShowNotes(false)}>
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowNotes(v => !v)}
            className="p-1.5 rounded hover:bg-muted text-xs text-muted-foreground"
            title="Add notes"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-muted">
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      </div>
    </div>
  );
}
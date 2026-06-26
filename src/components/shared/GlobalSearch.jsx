import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Shield, FileCheck, AlertTriangle, FileText, Paperclip, Building2, CheckSquare, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/shared/StatusBadge";

const ENTITY_CONFIG = [
  { name: "Framework", label: "Frameworks", icon: Shield, path: "/frameworks", fields: ["name", "description", "status"], color: "text-blue-500" },
  { name: "Control", label: "Controls", icon: FileCheck, path: "/controls", fields: ["control_id", "title", "description", "category", "status"], color: "text-emerald-500" },
  { name: "Risk", label: "Risks", icon: AlertTriangle, path: "/risks", fields: ["risk_id", "title", "description", "category", "status"], color: "text-red-500" },
  { name: "Policy", label: "Policies", icon: FileText, path: "/policies", fields: ["title", "description", "category", "status"], color: "text-purple-500" },
  { name: "Evidence", label: "Evidence", icon: Paperclip, path: "/evidence", fields: ["title", "description", "control_title", "type"], color: "text-amber-500" },
  { name: "Vendor", label: "Vendors", icon: Building2, path: "/vendors", fields: ["name", "description", "category", "status"], color: "text-cyan-500" },
  { name: "ComplianceTask", label: "Tasks", icon: CheckSquare, path: "/tasks", fields: ["title", "description", "status", "assignee_name"], color: "text-indigo-500" },
];

function getTitle(entity, item) {
  return item.title || item.name || item.control_id || item.risk_id || item.processing_activity || "Untitled";
}

function getSubtitle(entity, item) {
  const parts = [];
  if (item.category) parts.push(item.category.replace(/_/g, " "));
  if (item.control_id) parts.push(item.control_id);
  if (item.risk_id) parts.push(item.risk_id);
  if (item.control_title) parts.push(`Control: ${item.control_title}`);
  if (item.assignee_name) parts.push(item.assignee_name);
  return parts.slice(0, 2).join(" · ");
}

export default function GlobalSearch({ open, onOpenChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const allResults = await Promise.all(
        ENTITY_CONFIG.map(async (ec) => {
          const items = await base44.entities[ec.name].list();
          return items
            .filter(item =>
              ec.fields.some(f => item[f]?.toString().toLowerCase().includes(q.toLowerCase()))
            )
            .slice(0, 4)
            .map(item => ({ ...item, _entity: ec }));
        })
      );
      setResults(allResults.flat());
      setSelected(0);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  useEffect(() => {
    if (open) { setQuery(""); setResults([]); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const handleSelect = (result) => {
    navigate(result._entity.path);
    onOpenChange(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) handleSelect(results[selected]);
    if (e.key === "Escape") onOpenChange(false);
  };

  const grouped = ENTITY_CONFIG.map(ec => ({
    ...ec,
    items: results.filter(r => r._entity.name === ec.name)
  })).filter(g => g.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search across controls, risks, policies, vendors…"
            className="border-0 shadow-none focus-visible:ring-0 text-base p-0 h-auto"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
          {query && !loading && <button onClick={() => setQuery("")}><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {query.length < 2 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Type at least 2 characters to search across all modules
            </div>
          )}
          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No results found for <span className="font-semibold text-foreground">"{query}"</span>
            </div>
          )}
          {grouped.map(group => {
            const Icon = group.icon;
            return (
              <div key={group.name}>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border">
                  <Icon className={`w-3.5 h-3.5 ${group.color}`} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                </div>
                {group.items.map((result, idx) => {
                  const globalIdx = results.indexOf(result);
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${globalIdx === selected ? "bg-muted/50" : ""}`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 ${group.color} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{getTitle(group, result)}</p>
                        {getSubtitle(group, result) && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{getSubtitle(group, result)}</p>
                        )}
                      </div>
                      {result.status && <StatusBadge status={result.status} />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">↑↓</kbd> navigate</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">↵</kbd> open</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Esc</kbd> close</span>
          {results.length > 0 && <span className="ml-auto">{results.length} result{results.length !== 1 ? "s" : ""}</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_MAP = {
  todo: { label: "To Do", cls: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700" },
};

const PRIORITY_MAP = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-700",
};

export default function MaturityRoadmap({ roadmap, onChange }) {
  const update = (id, patch) =>
    onChange(roadmap.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const completed = roadmap.filter((r) => r.status === "completed").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Improvement Roadmap</h3>
        <Badge variant="outline">
          {completed}/{roadmap.length} completed
        </Badge>
      </div>
      {roadmap.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No gaps identified — your organization is at target maturity across all domains.
        </p>
      ) : (
        roadmap.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-2 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{item.title}</span>
                    <Badge className={PRIORITY_MAP[item.priority]} variant="secondary">
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.domain_name}</p>
                </div>
                <Badge className={STATUS_MAP[item.status].cls} variant="secondary">
                  {STATUS_MAP[item.status].label}
                </Badge>
              </div>
              <p className="text-sm text-foreground/80">{item.actions}</p>
              <div className="flex flex-wrap items-end gap-2 pt-1">
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={item.status}
                    onValueChange={(v) => update(item.id, { status: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs">Owner</Label>
                  <Input
                    className="h-8 text-xs"
                    value={item.owner_name || ""}
                    onChange={(e) => update(item.id, { owner_name: e.target.value })}
                    placeholder="Assign..."
                  />
                </div>
                <div className="min-w-[140px]">
                  <Label className="text-xs">Due Date</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={item.due_date || ""}
                    onChange={(e) => update(item.id, { due_date: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
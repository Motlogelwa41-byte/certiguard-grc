import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  GRC_DOMAINS,
  MATURITY_LEVELS,
  computeOverall,
  computeTargetOverall,
  generateRoadmap,
} from "@/lib/grcMaturity";

export default function MaturityAssessmentForm({ onSave, onCancel, saving }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [scores, setScores] = useState(() =>
    Object.fromEntries(GRC_DOMAINS.map((d) => [d.key, { current_level: 1, target_level: 3, notes: "" }]))
  );
  const [expanded, setExpanded] = useState(GRC_DOMAINS[0].key);

  const setScore = (key, field, value) =>
    setScores((p) => ({ ...p, [key]: { ...p[key], [field]: value } }));

  const handleSubmit = () => {
    if (!name.trim()) return;
    const domainScores = GRC_DOMAINS.map((d) => ({
      domain: d.key,
      domain_name: d.name,
      current_level: scores[d.key].current_level,
      target_level: scores[d.key].target_level,
      notes: scores[d.key].notes,
    }));
    const overall = computeOverall(domainScores);
    const targetOverall = computeTargetOverall(domainScores);
    const roadmap = generateRoadmap(domainScores);
    onSave({
      name: name.trim(),
      assessment_date: date,
      status: "completed",
      overall_level: Math.round(overall),
      target_level: targetOverall,
      domain_scores: JSON.stringify(domainScores),
      roadmap: JSON.stringify(roadmap),
      summary: `Overall GRC maturity assessed at Level ${Math.round(overall)} (${
        MATURITY_LEVELS[Math.round(overall) - 1]?.name
      }). Target Level ${targetOverall}. ${roadmap.length} improvement actions generated.`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Assessment Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q3 2026 GRC Maturity Baseline"
          />
        </div>
        <div>
          <Label>Assessment Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Score each domain from 1 (Initial) to 5 (Optimizing). Select your current and target levels — an
        improvement roadmap is generated automatically for every gap.
      </p>

      <div className="space-y-3">
        {GRC_DOMAINS.map((domain) => {
          const isOpen = expanded === domain.key;
          return (
            <Card key={domain.key} className={isOpen ? "ring-2 ring-emerald-400/50" : ""}>
              <CardHeader
                className="cursor-pointer py-3"
                onClick={() => setExpanded(isOpen ? null : domain.key)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-sm">{domain.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      Current: <b className="text-foreground">{scores[domain.key].current_level}</b>
                    </span>
                    <span className="text-muted-foreground">
                      Target: <b className="text-foreground">{scores[domain.key].target_level}</b>
                    </span>
                  </div>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="space-y-3 pt-0">
                  <p className="text-xs text-muted-foreground italic">{domain.description}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Current Level</Label>
                      <Select
                        value={String(scores[domain.key].current_level)}
                        onValueChange={(v) => setScore(domain.key, "current_level", Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MATURITY_LEVELS.map((l) => (
                            <SelectItem key={l.level} value={String(l.level)}>
                              <b>{l.level}.</b> {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Target Level</Label>
                      <Select
                        value={String(scores[domain.key].target_level)}
                        onValueChange={(v) => setScore(domain.key, "target_level", Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MATURITY_LEVELS.map((l) => (
                            <SelectItem key={l.level} value={String(l.level)}>
                              <b>{l.level}.</b> {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3 text-xs">
                    <span className="font-medium">
                      Level {scores[domain.key].current_level} criteria:{" "}
                    </span>
                    {domain.criteria[scores[domain.key].current_level - 1]}
                  </div>
                  <Textarea
                    placeholder="Evidence / notes for this domain..."
                    value={scores[domain.key].notes}
                    onChange={(e) => setScore(domain.key, "notes", e.target.value)}
                    rows={2}
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 sticky bottom-0 bg-background py-2 border-t">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
          {saving ? "Saving..." : "Complete Assessment"}
        </Button>
      </div>
    </div>
  );
}
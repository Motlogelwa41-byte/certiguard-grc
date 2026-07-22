import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MATURITY_LEVELS } from "@/lib/grcMaturity";
import MaturityRadarChart from "./MaturityRadarChart";
import MaturityRoadmap from "./MaturityRoadmap";

export default function AssessmentDetail({ assessment, onBack, onRoadmapChange, parseArr }) {
  const domains = parseArr(assessment.domain_scores);
  const roadmap = parseArr(assessment.roadmap);
  const lvl = MATURITY_LEVELS[assessment.overall_level - 1];
  const completed = roadmap.filter((r) => r.status === "completed").length;
  const gap = (assessment.target_level || 0) - (assessment.overall_level || 0);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-1" /> All assessments
      </Button>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-xs text-muted-foreground">Overall Maturity</div>
            <div className="text-4xl font-bold mt-1" style={{ color: lvl?.color }}>
              {assessment.overall_level}
            </div>
            <Badge variant="secondary" className="mt-1">
              {lvl?.name}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-xs text-muted-foreground">Target Level</div>
            <div className="text-4xl font-bold mt-1">{assessment.target_level}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {gap > 0 ? `${gap} level${gap > 1 ? "s" : ""} to close` : "At target"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-xs text-muted-foreground">Roadmap Progress</div>
            <div className="text-4xl font-bold mt-1">
              {completed}
              <span className="text-lg text-muted-foreground">/{roadmap.length}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {roadmap.length ? Math.round((completed / roadmap.length) * 100) : 0}% complete
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Maturity Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <MaturityRadarChart domains={domains} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Domain Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {domains.map((d) => {
              const meta = MATURITY_LEVELS[d.current_level - 1];
              const g = (d.target_level || 0) - (d.current_level || 0);
              return (
                <div key={d.domain} className="flex items-center justify-between text-sm">
                  <span>{d.domain_name || d.domain}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" style={{ color: meta?.color }}>
                      {d.current_level} {meta?.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">to {d.target_level}</span>
                    {g > 0 && <Badge variant="outline">gap {g}</Badge>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <MaturityRoadmap roadmap={roadmap} onChange={(r) => onRoadmapChange(assessment, r)} />
    </div>
  );
}
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { ChevronRight } from "lucide-react";
import { MATURITY_LEVELS } from "@/lib/grcMaturity";

export default function AssessmentList({ assessments, onSelect, parseArr }) {
  const trend = [...assessments]
    .reverse()
    .map((a) => ({
      name: new Date(a.created_date).toLocaleDateString(),
      level: a.overall_level,
      target: a.target_level,
    }));

  return (
    <div className="space-y-4">
      {assessments.length > 1 && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold mb-2">Maturity Trend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Line type="monotone" dataKey="level" stroke="#10b981" name="Overall" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#3b82f6"
                  name="Target"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {assessments.map((a) => {
          const domains = parseArr(a.domain_scores);
          const roadmap = parseArr(a.roadmap);
          const completed = roadmap.filter((r) => r.status === "completed").length;
          const lvl = MATURITY_LEVELS[a.overall_level - 1];
          return (
            <Card
              key={a.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelect(a)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.assessment_date} · {domains.length} domains
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: lvl?.color }}>
                      {a.overall_level}
                    </div>
                    <div className="text-xs text-muted-foreground">of 5</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge variant="secondary">{lvl?.name}</Badge>
                  <Badge variant="outline">Target {a.target_level}</Badge>
                  <Badge variant="outline">
                    {completed}/{roadmap.length} done
                  </Badge>
                </div>
                <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground">
                  View details <ChevronRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
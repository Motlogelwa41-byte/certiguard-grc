import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Star, MessageSquare, TrendingUp, Mail, Clock } from "lucide-react";

export default function FeedbackSurveys() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.UserFeedbackSurvey.list("-created_date", 100)
      .then((items) => { setSurveys(items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const responded = surveys.filter(s => s.status === "responded");
  const avgRating = responded.length > 0
    ? (responded.reduce((s, r) => s + (r.overall_rating || 0), 0) / responded.length).toFixed(1)
    : "—";
  const avgNps = responded.length > 0
    ? Math.round(responded.reduce((s, r) => s + (r.nps_score || 0), 0) / responded.length)
    : "—";
  const wouldRecommendPct = responded.length > 0
    ? Math.round((responded.filter(r => r.would_recommend).length / responded.length) * 100)
    : 0;
  const responseRate = surveys.length > 0
    ? Math.round((responded.length / surveys.length) * 100)
    : 0;

  const exportCsv = () => {
    const headers = ["User", "Email", "Status", "Overall Rating", "Ease of Use", "NPS", "Would Recommend", "Most Useful", "Least Useful", "Improvements", "Comments", "Sent At", "Responded At"];
    const rows = surveys.map(s => [
      s.user_name || "",
      s.user_email || "",
      s.status || "",
      s.overall_rating || "",
      s.ease_of_use || "",
      s.nps_score || "",
      s.would_recommend ? "Yes" : "No",
      (s.most_useful_feature || "").replace(/"/g, '""'),
      (s.least_useful_feature || "").replace(/"/g, '""'),
      (s.what_could_be_improved || "").replace(/"/g, '""'),
      (s.additional_comments || "").replace(/"/g, '""'),
      s.survey_sent_at || "",
      s.responded_at || ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-surveys-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Onboarding Feedback Surveys"
        subtitle="First impressions from users 24 hours after they complete onboarding"
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={surveys.length === 0}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Mail className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Surveys Sent</span>
            </div>
            <p className="text-3xl font-heading font-bold text-foreground">{surveys.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{responseRate}% response rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Star className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Rating</span>
            </div>
            <p className="text-3xl font-heading font-bold text-foreground">{avgRating}<span className="text-lg text-muted-foreground">/5</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Avg NPS</span>
            </div>
            <p className="text-3xl font-heading font-bold text-foreground">{avgNps}<span className="text-lg text-muted-foreground">/10</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Would Recommend</span>
            </div>
            <p className="text-3xl font-heading font-bold text-foreground">{wouldRecommendPct}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Survey List */}
      {surveys.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No feedback surveys yet"
          description="Surveys are automatically sent 24 hours after a user completes onboarding. Responses will appear here."
        />
      ) : (
        <div className="space-y-3">
          {surveys.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground text-sm">{s.user_name || s.user_email}</p>
                      <Badge variant={s.status === "responded" ? "default" : "secondary"} className="text-[10px]">
                        {s.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.user_email}</p>
                    {s.status === "responded" && (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-3 text-xs">
                          {s.overall_rating && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-500" /> {s.overall_rating}/5
                            </span>
                          )}
                          {s.nps_score != null && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-blue-500" /> NPS: {s.nps_score}/10
                            </span>
                          )}
                          {s.would_recommend != null && (
                            <span className={`font-medium ${s.would_recommend ? "text-emerald-600" : "text-muted-foreground"}`}>
                              {s.would_recommend ? "✓ Would recommend" : "✗ Would not recommend"}
                            </span>
                          )}
                        </div>
                        {s.most_useful_feature && (
                          <p className="text-xs text-muted-foreground"><strong className="text-foreground">Most useful:</strong> {s.most_useful_feature}</p>
                        )}
                        {s.what_could_be_improved && (
                          <p className="text-xs text-muted-foreground"><strong className="text-foreground">Improve:</strong> {s.what_could_be_improved}</p>
                        )}
                        {s.additional_comments && (
                          <p className="text-xs text-muted-foreground italic">"{s.additional_comments}"</p>
                        )}
                      </div>
                    )}
                    {s.status === "sent" && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Sent {new Date(s.survey_sent_at).toLocaleDateString()} — awaiting response
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
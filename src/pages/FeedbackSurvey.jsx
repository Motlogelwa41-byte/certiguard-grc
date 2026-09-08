import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Star, Send, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function FeedbackSurvey() {
  const { toast } = useToast();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    overall_rating: 0,
    ease_of_use: 0,
    nps_score: 0,
    would_recommend: null,
    most_useful_feature: "",
    least_useful_feature: "",
    what_could_be_improved: "",
    additional_comments: "",
  });

  const urlParams = new URLSearchParams(window.location.search);
  const surveyId = urlParams.get("survey_id");

  useEffect(() => {
    if (!surveyId) { setLoading(false); return; }
    base44.functions.invoke("feedbackSurveyPublic", { action: "get", survey_id: surveyId })
      .then((res) => {
        const s = res.data;
        if (!s || s.error) { setSurvey(null); setLoading(false); return; }
        setSurvey(s);
        if (s.status === "responded") setSubmitted(true);
        setLoading(false);
      })
      .catch(() => { setSurvey(null); setLoading(false); });
  }, [surveyId]);

  const submit = async () => {
    if (form.overall_rating === 0) {
      toast({ title: "Please rate your overall experience", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("feedbackSurveyPublic", {
        action: "submit",
        survey_id: surveyId,
        ...form,
      });
      if (res.data?.error) {
        toast({ title: res.data.error, variant: "destructive" });
      } else {
        setSubmitted(true);
        toast({ title: "Thank you for your feedback!" });
      }
    } catch (e) {
      toast({ title: "Failed to submit feedback", variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!surveyId || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground">Invalid Survey Link</p>
            <p className="text-sm text-muted-foreground mt-2">This survey link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-xl font-heading font-bold text-foreground">Thank You!</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your feedback helps us improve CertiGuard GRC for everyone. We appreciate you taking the time to share your first impressions.
            </p>
            <p className="text-xs text-muted-foreground mt-4">— The Ethical Edge GRC Team</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StarRating = ({ value, onChange, label }) => (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1 mt-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}>
            <Star className={`w-7 h-7 ${value >= n ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"} transition-colors`} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-foreground text-lg">CertiGuard GRC</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Onboarding Feedback Survey</h1>
          <p className="text-sm text-muted-foreground mt-1">Takes less than 2 minutes — your feedback goes directly to our product team</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <StarRating
              label="Overall, how would you rate your CertiGuard experience?"
              value={form.overall_rating}
              onChange={(v) => setForm({ ...form, overall_rating: v })}
            />
            <StarRating
              label="How easy was the platform to use?"
              value={form.ease_of_use}
              onChange={(v) => setForm({ ...form, ease_of_use: v })}
            />

            {/* NPS */}
            <div>
              <Label className="text-sm font-medium">How likely are you to recommend CertiGuard to a colleague? (0 = not at all, 10 = extremely likely)</Label>
              <div className="flex gap-1 mt-2 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, nps_score: n })}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      form.nps_score === n
                        ? n <= 6 ? "bg-red-500 text-white" : n <= 8 ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Would recommend */}
            <div>
              <Label className="text-sm font-medium">Would you recommend CertiGuard to a colleague?</Label>
              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant={form.would_recommend === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => setForm({ ...form, would_recommend: true })}
                >
                  Yes, I would
                </Button>
                <Button
                  type="button"
                  variant={form.would_recommend === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => setForm({ ...form, would_recommend: false })}
                >
                  Not right now
                </Button>
              </div>
            </div>

            {/* Open text */}
            <div>
              <Label className="text-sm font-medium">Which feature did you find most useful during onboarding?</Label>
              <Textarea
                className="mt-1.5"
                rows={2}
                placeholder="e.g., The AI Control Mapper, risk heatmap, evidence collection..."
                value={form.most_useful_feature}
                onChange={(e) => setForm({ ...form, most_useful_feature: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">What could we improve?</Label>
              <Textarea
                className="mt-1.5"
                rows={3}
                placeholder="Any feature that was confusing, missing, or could be better..."
                value={form.what_could_be_improved}
                onChange={(e) => setForm({ ...form, what_could_be_improved: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Anything else you'd like to share?</Label>
              <Textarea
                className="mt-1.5"
                rows={2}
                placeholder="Additional comments or suggestions..."
                value={form.additional_comments}
                onChange={(e) => setForm({ ...form, additional_comments: e.target.value })}
              />
            </div>

            <Button onClick={submit} disabled={submitting || form.overall_rating === 0} className="w-full" size="lg">
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Submitting...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Submit Feedback</>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Your responses are confidential and used only to improve the platform.
        </p>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Shield, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUESTIONNAIRE = [
  { category: "Data Security", question: "Do you encrypt data at rest and in transit?" },
  { category: "Data Security", question: "Do you have a formal data classification policy?" },
  { category: "Access Control", question: "Do you enforce multi-factor authentication for all users?" },
  { category: "Access Control", question: "Do you follow the principle of least privilege?" },
  { category: "Incident Response", question: "Do you have a documented incident response plan?" },
  { category: "Incident Response", question: "What is your average time to notify customers of a breach?" },
  { category: "Compliance", question: "Are you SOC 2 Type II certified?" },
  { category: "Compliance", question: "Are you ISO 27001 certified?" },
  { category: "Business Continuity", question: "Do you have a tested business continuity plan?" },
  { category: "Business Continuity", question: "What is your RTO/RPO for critical systems?" },
];

const ANSWER_OPTIONS = ["Yes", "No", "Partial", "N/A"];

export default function VendorPortal() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const [vendor, setVendor] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid link — no token provided.");
      setLoading(false);
      return;
    }
    base44.functions
      .invoke("vendorPortalAccess", { action: "load", token })
      .then((res) => {
        if (res?.error) {
          setError(res.error);
          setLoading(false);
          return;
        }
        setVendor(res);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load vendor portal.");
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("vendorPortalAccess", {
        action: "submit",
        token,
        answers,
      });
      if (res?.error) {
        setError(res.error);
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Failed to submit. Please try again.");
    }
    setSubmitting(false);
  };

  const grouped = QUESTIONNAIRE.reduce((groups, q, i) => {
    (groups[q.category] = groups[q.category] || []).push({ ...q, i });
    return groups;
  }, {});

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-white text-lg font-medium">{error}</p>
          <p className="text-slate-500 text-sm mt-2">Contact your compliance partner for a valid link.</p>
        </div>
      </div>
    );

  if (submitted)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Questionnaire Submitted</h2>
          <p className="text-slate-400">
            Thank you, {vendor?.vendor_name}. Your responses have been recorded and sent to the compliance team for
            review.
          </p>
        </div>
      </div>
    );

  const answered = Object.keys(answers).length;
  const pct = Math.round((answered / QUESTIONNAIRE.length) * 100);

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 sm:py-10 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">Security Questionnaire</h1>
            <p className="text-sm text-slate-400 truncate">{vendor?.vendor_name}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>{answered} of {QUESTIONNAIRE.length} answered</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4 sm:space-y-6">
          {Object.entries(grouped).map(([cat, qs]) => (
            <div key={cat} className="bg-slate-900 rounded-xl border border-slate-800 p-4 sm:p-5">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-4">{cat}</p>
              <div className="space-y-5">
                {qs.map(({ question, i }) => (
                  <div key={i}>
                    <p className="text-sm text-white font-medium mb-2">{question}</p>
                    <div className="flex flex-wrap gap-2">
                      {ANSWER_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setAnswers((prev) => ({ ...prev, [i]: opt }))}
                          className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            answers[i] === opt
                              ? opt === "Yes"
                                ? "bg-emerald-500 text-white border-emerald-500"
                                : opt === "No"
                                ? "bg-red-500 text-white border-red-500"
                                : opt === "Partial"
                                ? "bg-amber-500 text-white border-amber-500"
                                : "bg-slate-500 text-white border-slate-500"
                              : "bg-transparent border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 sm:mt-8">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
            onClick={handleSubmit}
            disabled={submitting || answered < QUESTIONNAIRE.length}
          >
            {submitting ? "Submitting..." : `Submit Questionnaire (${answered}/${QUESTIONNAIRE.length})`}
          </Button>
          {answered < QUESTIONNAIRE.length && (
            <p className="text-xs text-slate-500 text-center mt-2">
              Please answer all {QUESTIONNAIRE.length} questions before submitting.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
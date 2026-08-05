import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Send, Lock, MessageSquare, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = [
  { value: "fraud", label: "Fraud or Financial Misconduct" },
  { value: "harassment", label: "Harassment or Discrimination" },
  { value: "safety", label: "Workplace Safety Violation" },
  { value: "ethics", label: "Ethics Violation" },
  { value: "data_privacy", label: "Data Privacy Breach" },
  { value: "corruption", label: "Bribery or Corruption" },
  { value: "other", label: "Other Concern" },
];

export default function WhistleblowerPortal() {
  const [mode, setMode] = useState("submit"); // "submit" | "check"
  const [submitting, setSubmitting] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [anonymousToken, setAnonymousToken] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [form, setForm] = useState({ category: "other", subject: "", description: "" });
  const [replyText, setReplyText] = useState("");
  const [caseData, setCaseData] = useState(null);
  const [loadingCase, setLoadingCase] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!form.description.trim()) { toast({ title: "Description required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("whistleblowerPortal", {
        action: "submit",
        category: form.category,
        subject: form.subject,
        description: form.description,
      });
      setCaseNumber(res.data.case_number);
      setAnonymousToken(res.data.anonymous_token);
      setSavedToken(res.data.anonymous_token);
      toast({ title: "Report submitted", description: `Your case number is ${res.data.case_number}` });
    } catch (e) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const checkStatus = async () => {
    if (!savedToken) { toast({ title: "Token required", variant: "destructive" }); return; }
    setLoadingCase(true);
    try {
      const res = await base44.functions.invoke("whistleblowerPortal", { action: "status", anonymous_token: savedToken });
      setCaseData(res.data);
    } catch (e) {
      toast({ title: "Not found", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
    setLoadingCase(false);
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    try {
      await base44.functions.invoke("whistleblowerPortal", { action: "reply", anonymous_token: savedToken, text: replyText });
      setReplyText("");
      checkStatus();
      toast({ title: "Message sent" });
    } catch (e) {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    }
  };

  const messages = caseData ? (() => { try { return JSON.parse(caseData.messages || "[]"); } catch { return []; } })() : [];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Anonymous Ethics Reporting</h1>
          <p className="text-sm text-muted-foreground mt-1">Secure, encrypted, and completely anonymous</p>
        </div>

        {/* Security Notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-6 flex items-start gap-2">
          <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Your identity is not recorded. Reports are encrypted and accessible only to the Ethics Committee.
            Save your case token after submission to check status and communicate anonymously.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <Button variant={mode === "submit" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setMode("submit")}>
            <FileText className="w-4 h-4 mr-1" /> Submit Report
          </Button>
          <Button variant={mode === "check" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setMode("check")}>
            <Eye className="w-4 h-4 mr-1" /> Check Status
          </Button>
        </div>

        {/* Submit Mode */}
        {mode === "submit" && !caseNumber && (
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Subject (brief)</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief title of your concern" /></div>
            <div><Label>Detailed Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} placeholder="Describe the concern in detail. Do not include your name or identifying information." /></div>
            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              <Send className="w-4 h-4 mr-1" /> {submitting ? "Submitting..." : "Submit Anonymously"}
            </Button>
          </div>
        )}

        {/* Submit Success */}
        {mode === "submit" && caseNumber && (
          <div className="bg-card rounded-xl border border-emerald-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"><Shield className="w-6 h-6 text-emerald-600" /></div>
            <div>
              <h3 className="font-heading font-bold text-foreground">Report Submitted Successfully</h3>
              <p className="text-sm text-muted-foreground mt-1">Your case number is:</p>
              <p className="text-xl font-bold text-primary mt-1">{caseNumber}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-left">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">⚠ SAVE THIS TOKEN — it cannot be recovered:</p>
              <p className="text-xs font-mono text-foreground break-all bg-muted p-2 rounded">{anonymousToken}</p>
            </div>
            <p className="text-xs text-muted-foreground">Use this token to check your case status and communicate with the Ethics Committee. Do not share it.</p>
            <Button variant="outline" size="sm" onClick={() => { setMode("check"); setSavedToken(anonymousToken); }}><Eye className="w-4 h-4 mr-1" /> View Case Status</Button>
          </div>
        )}

        {/* Check Status Mode */}
        {mode === "check" && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-4">
              <Label>Enter Your Anonymous Token</Label>
              <div className="flex gap-2 mt-1">
                <Input value={savedToken} onChange={(e) => setSavedToken(e.target.value)} placeholder="Paste your case token..." className="font-mono text-xs" />
                <Button size="sm" onClick={checkStatus} disabled={loadingCase}>{loadingCase ? "..." : "Check"}</Button>
              </div>
            </div>

            {caseData && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-foreground">{caseData.case_number}</h3>
                    <p className="text-xs text-muted-foreground">{caseData.subject}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${caseData.status === "resolved" ? "bg-emerald-100 text-emerald-700" : caseData.status === "investigating" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                    {caseData.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>

                {/* Messages */}
                {messages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Communication Log</p>
                    {messages.map((msg, i) => (
                      <div key={i} className={`p-3 rounded-lg ${msg.is_admin ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : "bg-muted/40"}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <MessageSquare className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-semibold text-muted-foreground">{msg.is_admin ? "ETHICS COMMITTEE" : "YOU"}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(msg.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-foreground">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Box */}
                <div>
                  <Label>Add a Message</Label>
                  <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3} placeholder="Send an anonymous message to the Ethics Committee..." />
                  <Button size="sm" className="mt-2" onClick={sendReply} disabled={!replyText.trim()}><Send className="w-3.5 h-3.5 mr-1" /> Send Message</Button>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by CertiGuard GRC · Your report is encrypted and tamper-evident
        </p>
      </div>
    </div>
  );
}
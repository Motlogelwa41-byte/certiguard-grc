import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardList, Plus, Eye, Trash2, Send, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";

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
const SCORE_MAP = { Yes: 10, Partial: 5, No: 0, "N/A": 7 };

function calcRiskLevel(score) {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  if (score >= 40) return "high";
  return "critical";
}

export default function VendorAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [createForm, setCreateForm] = useState({ vendor_id: "", title: "", due_date: "" });
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const getQuestionnaireUrl = (id) =>
    `${window.location.origin}/vendor-questionnaire?id=${id}`;

  const load = async () => {
    const [a, v] = await Promise.all([base44.entities.VendorAssessment.list(), base44.entities.Vendor.list()]);
    setAssessments(a); setVendors(v); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const vendor = vendors.find((v) => v.id === createForm.vendor_id);
    const initAnswers = QUESTIONNAIRE.map((q) => ({ ...q, answer: "", score: 0 }));
    await base44.entities.VendorAssessment.create({
      ...createForm,
      vendor_name: vendor?.name || "",
      status: "draft",
      total_questions: QUESTIONNAIRE.length,
      answered_questions: 0,
      risk_score: 0,
      answers: JSON.stringify(initAnswers),
    });
    setCreateOpen(false);
    setCreateForm({ vendor_id: "", title: "", due_date: "" });
    load();
    toast({ title: "Assessment created" });
  };

  const handleOpen = (a) => {
    setSelected(a);
    const parsed = (() => { try { return JSON.parse(a.answers || "[]"); } catch { return []; } })();
    const map = {};
    parsed.forEach((q, i) => { map[i] = q.answer || ""; });
    setAnswers(map);
    setViewOpen(true);
  };

  const handleSaveAnswers = async (submit = false) => {
    const answeredList = QUESTIONNAIRE.map((q, i) => ({
      ...q,
      answer: answers[i] || "",
      score: SCORE_MAP[answers[i]] ?? 0,
    }));
    const answered = answeredList.filter((a) => a.answer).length;
    const rawScore = answeredList.reduce((s, a) => s + a.score, 0);
    const maxScore = QUESTIONNAIRE.length * 10;
    const risk_score = Math.round((rawScore / maxScore) * 100);
    await base44.entities.VendorAssessment.update(selected.id, {
      answers: JSON.stringify(answeredList),
      answered_questions: answered,
      risk_score,
      risk_level: calcRiskLevel(risk_score),
      status: submit ? "submitted" : "in_progress",
      ...(submit ? { completed_date: new Date().toISOString().split("T")[0] } : {}),
    });
    setViewOpen(false);
    load();
    toast({ title: submit ? "Assessment submitted" : "Answers saved" });
  };

  const handleDelete = async (id) => { await base44.entities.VendorAssessment.delete(id); load(); toast({ title: "Assessment deleted" }); };

  const handleOpenSend = (a) => { setSendTarget(a); setRecipientEmail(""); setSendOpen(true); };

  const handleCopyLink = (a) => {
    navigator.clipboard.writeText(getQuestionnaireUrl(a.id));
    toast({ title: "Link copied to clipboard" });
  };

  const handleSendEmail = async () => {
    setSending(true);
    const url = getQuestionnaireUrl(sendTarget.id);
    await base44.integrations.Core.SendEmail({
      to: recipientEmail,
      subject: `Security Questionnaire: ${sendTarget.title}`,
      body: `Dear ${sendTarget.vendor_name} team,\n\nPlease complete the security questionnaire below at your earliest convenience.\n\nAssessment: ${sendTarget.title}\nDue Date: ${sendTarget.due_date || "As soon as possible"}\n\nClick here to begin: ${url}\n\nThank you,\nCompliance Team`,
    });
    await base44.entities.VendorAssessment.update(sendTarget.id, {
      status: "sent",
      sent_date: new Date().toISOString().split("T")[0],
    });
    setSending(false);
    setSendOpen(false);
    load();
    toast({ title: "Questionnaire sent", description: `Email sent to ${recipientEmail}` });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Vendor Assessments"
        subtitle="Send security questionnaires and auto-score vendor risk"
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Assessment</Button>}
      />

      {assessments.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No assessments yet" description="Create an assessment to evaluate vendor security posture." actionLabel="New Assessment" onAction={() => setCreateOpen(true)} />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vendor</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Assessment</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Progress</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Risk Score</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Due Date</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => {
                const pct = a.total_questions > 0 ? Math.round((a.answered_questions / a.total_questions) * 100) : 0;
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{a.vendor_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.title}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {a.risk_score > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{a.risk_score}</span>
                          <StatusBadge status={a.risk_level || calcRiskLevel(a.risk_score)} />
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.due_date || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleCopyLink(a)} className="p-1.5 rounded hover:bg-muted" title="Copy link"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => handleOpenSend(a)} className="p-1.5 rounded hover:bg-muted" title="Send to vendor"><Send className="w-3.5 h-3.5 text-blue-500" /></button>
                        <button onClick={() => handleOpen(a)} className="p-1.5 rounded hover:bg-muted" title="Fill / Review"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Vendor Assessment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Vendor</Label>
              <Select value={createForm.vendor_id} onValueChange={(v) => setCreateForm({ ...createForm, vendor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Assessment Title</Label><Input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} placeholder="e.g. Annual Security Review 2026" /></div>
            <div><Label>Due Date</Label><Input type="date" value={createForm.due_date} onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })} /></div>
            <Button className="w-full" onClick={handleCreate} disabled={!createForm.vendor_id || !createForm.title}>Create Assessment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Send Questionnaire — {sendTarget?.vendor_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Shareable link</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-foreground truncate flex-1 font-mono">{sendTarget ? getQuestionnaireUrl(sendTarget.id) : ""}</p>
                <button onClick={() => handleCopyLink(sendTarget)} className="p-1.5 rounded hover:bg-muted shrink-0"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <a href={sendTarget ? getQuestionnaireUrl(sendTarget.id) : "#"} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-muted shrink-0"><ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /></a>
              </div>
            </div>
            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or send via email</span></div></div>
            <div>
              <Label>Vendor Contact Email</Label>
              <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="vendor@example.com" />
            </div>
            <Button className="w-full" onClick={handleSendEmail} disabled={!recipientEmail || sending}>
              <Send className="w-4 h-4 mr-1" />{sending ? "Sending..." : "Send Email & Mark as Sent"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fill/review dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Security Questionnaire — {selected?.vendor_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {Object.entries(
              QUESTIONNAIRE.reduce((groups, q, i) => {
                (groups[q.category] = groups[q.category] || []).push({ ...q, i });
                return groups;
              }, {})
            ).map(([cat, qs]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">{cat}</p>
                {qs.map(({ question, i }) => (
                  <div key={i} className="mb-3">
                    <p className="text-sm font-medium mb-1.5">{question}</p>
                    <div className="flex items-center gap-2">
                      {ANSWER_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setAnswers((prev) => ({ ...prev, [i]: opt }))}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            answers[i] === opt
                              ? opt === "Yes" ? "bg-emerald-500 text-white border-emerald-500"
                              : opt === "No" ? "bg-red-500 text-white border-red-500"
                              : opt === "Partial" ? "bg-amber-500 text-white border-amber-500"
                              : "bg-slate-400 text-white border-slate-400"
                              : "bg-transparent border-border text-muted-foreground hover:border-primary"
                          }`}
                        >{opt}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="outline" className="flex-1" onClick={() => handleSaveAnswers(false)}>Save Progress</Button>
            <Button className="flex-1" onClick={() => handleSaveAnswers(true)}><CheckCircle className="w-4 h-4 mr-1" /> Submit & Score</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
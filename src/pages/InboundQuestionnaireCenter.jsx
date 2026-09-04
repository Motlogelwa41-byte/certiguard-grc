import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles, Loader2, FileQuestion, Send, Inbox, CheckCircle2,
  AlertCircle, Clock, Shield, RefreshCw, Plus, Mail
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

const CONFIDENCE_META = {
  drafted: { label: "Drafted", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  verified: { label: "Verified", color: "bg-blue-100 text-blue-700", icon: Shield },
  needs_input: { label: "Needs Review", color: "bg-amber-100 text-amber-700", icon: AlertCircle },
  none: { label: "Pending", color: "bg-slate-100 text-slate-600", icon: Clock },
};

const STATUS_META = {
  received: { label: "Received", color: "bg-blue-100 text-blue-700" },
  drafting: { label: "Drafting", color: "bg-amber-100 text-amber-700" },
  in_review: { label: "In Review", color: "bg-purple-100 text-purple-700" },
  submitted: { label: "Submitted", color: "bg-emerald-100 text-emerald-700" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-600" },
};

export default function InboundQuestionnaireCenter() {
  const { toast } = useToast();
  const [questionnaires, setQuestionnaires] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQ, setSelectedQ] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.SecurityQuestionnaire.list("-created_date", 50).catch(() => []);
      setQuestionnaires(data || []);
      if (data && data.length > 0 && !selectedQ) setSelectedQ(data[0]);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  const loadItems = useCallback(async (qId) => {
    if (!qId) { setItems([]); return; }
    try {
      const data = await base44.entities.QuestionnaireItem.filter({ questionnaire_id: qId }, "created_date", 200).catch(() => []);
      setItems(data || []);
    } catch (e) { setItems([]); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (selectedQ) loadItems(selectedQ.id); }, [selectedQ, loadItems]);

  const runAutoResponse = async (qId) => {
    setDrafting(true);
    try {
      const res = await base44.functions.invoke("autoRespondCustomerQuestionnaire", { questionnaire_id: qId });
      const data = res?.data || res;
      toast({ title: "AI auto-response complete", description: data.message });
      loadItems(qId);
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Auto-response failed", description: e?.message }); }
    setDrafting(false);
  };

  const received = questionnaires.filter(q => q.status === "received");
  const draftingQs = questionnaires.filter(q => q.status === "drafting");
  const ready = questionnaires.filter(q => q.status === "in_review" || q.status === "submitted");

  return (
    <div>
      <PageHeader
        title="Inbound Questionnaire Auto-Response"
        subtitle="AI-powered auto-drafting of customer security questionnaires from Trust Center content, control library, and evidence — reduces response time from days to hours"
        actions={
          <Button onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-1.5" />New Questionnaire
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Received" value={received.length} icon={Inbox} color="blue" trendLabel="Awaiting response" />
        <StatCard label="Drafting" value={draftingQs.length} icon={Sparkles} color="amber" trendLabel="AI working" />
        <StatCard label="Ready/Sent" value={ready.length} icon={Send} color="green" trendLabel="Completed" />
        <StatCard label="Total" value={questionnaires.length} icon={FileQuestion} color="slate" trendLabel="All questionnaires" />
      </div>

      {showNew && (
        <NewQuestionnaireForm
          onClose={() => setShowNew(false)}
          onCreated={(q) => { setShowNew(false); loadData(); setSelectedQ(q); }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Inbound Questionnaires</h3>
          <div className="space-y-2">
            {loading ? <Spinner /> : (
              questionnaires.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-xl">
                  <FileQuestion className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No questionnaires yet</p>
                </div>
              ) : (
                questionnaires.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQ(q)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedQ?.id === q.id ? 'bg-primary/5 border-primary' : 'bg-card border-border hover:border-primary/30'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{q.questionnaire_id || 'Q-?'}</span>
                      <Badge className={`text-xs ${STATUS_META[q.status]?.color || STATUS_META.received.color}`}>{STATUS_META[q.status]?.label || q.status}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{q.title}</p>
                    <p className="text-xs text-muted-foreground">{q.client_name}</p>
                    {q.due_date && <p className="text-xs text-muted-foreground mt-0.5">Due: {q.due_date}</p>}
                  </button>
                ))
              )
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedQ ? (
            <QuestionnaireDetail
              questionnaire={selectedQ}
              items={items}
              drafting={drafting}
              onAutoRespond={() => runAutoResponse(selectedQ.id)}
              onRefresh={() => loadItems(selectedQ.id)}
            />
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <FileQuestion className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Select a questionnaire to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionnaireDetail({ questionnaire, items, drafting, onAutoRespond, onRefresh }) {
  const drafted = items.filter(i => i.status === "drafted" || i.status === "answered");
  const needsInput = items.filter(i => i.confidence === "needs_input");
  const pending = items.filter(i => i.status === "pending");

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-heading font-bold text-foreground">{questionnaire.title}</h2>
          <p className="text-sm text-muted-foreground">{questionnaire.client_name} · {questionnaire.client_email}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{questionnaire.request_type?.replace(/_/g, ' ')}</Badge>
            {questionnaire.due_date && <span className="text-xs text-muted-foreground">Due: {questionnaire.due_date}</span>}
          </div>
        </div>
        <Button onClick={onAutoRespond} disabled={drafting || pending.length === 0}>
          {drafting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
          {drafting ? "Drafting..." : "Run AI Auto-Response"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{items.length}</p>
          <p className="text-xs text-muted-foreground">Total Questions</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{drafted.length}</p>
          <p className="text-xs text-muted-foreground">Drafted</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{needsInput.length}</p>
          <p className="text-xs text-muted-foreground">Needs Review</p>
        </div>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <FileQuestion className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No questions yet. Add questions or run the AI auto-response.</p>
          </div>
        ) : (
          items.map((item, idx) => <QuestionItemCard key={item.id} item={item} index={idx} onRefresh={onRefresh} />)
        )}
      </div>
    </div>
  );
}

function QuestionItemCard({ item, index, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [answer, setAnswer] = useState(item.answer || item.suggested_answer || "");
  const conf = CONFIDENCE_META[item.confidence] || CONFIDENCE_META.none;
  const ConfIcon = conf.icon;

  const saveAnswer = async () => {
    try {
      await base44.entities.QuestionnaireItem.update(item.id, { answer, status: "answered", confidence: "verified" });
      setEditing(false);
      onRefresh();
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xs font-mono text-muted-foreground shrink-0">Q{index + 1}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{item.question}</p>
          {item.section && <Badge variant="outline" className="text-xs mt-1">{item.section}</Badge>}
        </div>
        <Badge className={`text-xs ${conf.color}`}><ConfIcon className="w-3 h-3 mr-1" />{conf.label}</Badge>
      </div>
      {editing ? (
        <div className="mt-2">
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} className="text-sm" />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={saveAnswer}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          {item.answer || item.suggested_answer ? (
            <p className="text-sm text-muted-foreground bg-muted/30 rounded p-2">{item.answer || item.suggested_answer}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No answer drafted yet</p>
          )}
          {(item.source_control_id || item.source_evidence_id) && (
            <div className="flex gap-2 mt-1.5">
              {item.source_control_id && <Badge variant="outline" className="text-xs">Control: {item.source_control_id}</Badge>}
              {item.source_evidence_id && <Badge variant="outline" className="text-xs">Evidence: {item.source_evidence_id}</Badge>}
            </div>
          )}
          <Button size="sm" variant="ghost" className="mt-1.5 h-7 text-xs" onClick={() => setEditing(true)}>Edit answer</Button>
        </div>
      )}
    </div>
  );
}

function NewQuestionnaireForm({ onClose, onCreated }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [questions, setQuestions] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title || !clientName) { toast({ variant: "destructive", title: "Title and client name required" }); return; }
    setCreating(true);
    try {
      const qId = `Q-${Date.now().toString().slice(-6)}`;
      const today = new Date().toISOString().split('T')[0];
      const q = await base44.entities.SecurityQuestionnaire.create({
        questionnaire_id: qId,
        title,
        client_name: clientName,
        client_email: clientEmail,
        request_type: "security_review",
        status: "received",
        received_date: today,
        item_count: 0,
      });

      // Parse questions (one per line) and create items
      const qList = questions.split('\n').map(q => q.trim()).filter(Boolean);
      if (qList.length > 0) {
        const items = qList.map((question, idx) => ({
          questionnaire_id: q.id,
          questionnaire_title: title,
          section: "General",
          question,
          status: "pending",
          confidence: "none",
        }));
        await base44.entities.QuestionnaireItem.bulkCreate(items);
        await base44.entities.SecurityQuestionnaire.update(q.id, { item_count: qList.length });
      }

      toast({ title: "Questionnaire created", description: `${qList.length} questions added` });
      onCreated(q);
    } catch (e) { toast({ variant: "destructive", title: "Create failed", description: e?.message }); }
    setCreating(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">New Inbound Questionnaire</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Security Review Questionnaire" />
        </div>
        <div>
          <Label className="text-xs">Client Name</Label>
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Corp" />
        </div>
        <div>
          <Label className="text-xs">Client Email</Label>
          <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="security@acme.com" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Questions (one per line)</Label>
        <Textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={6} placeholder={"Do you have a SOC 2 Type II report?\nWhat is your data encryption policy?\nHow do you handle incident response?"} />
      </div>
      <div className="flex gap-2 mt-3">
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
          Create & Add Questions
        </Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
}
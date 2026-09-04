import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MessageSquare, Loader2, Send, Plus, FileText, HelpCircle, CheckCircle2,
  Building2, Paperclip, Upload, Clock, ArrowRight, X
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

const STATUS_META = {
  open: { label: "Open", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  awaiting_vendor: { label: "Awaiting Vendor", color: "bg-orange-100 text-orange-700" },
  awaiting_tenant: { label: "Awaiting You", color: "bg-purple-100 text-purple-700" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-600" },
};

export default function VendorCollaborationCenter() {
  const { toast } = useToast();
  const [collaborations, setCollaborations] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [collabs, vens] = await Promise.all([
        base44.entities.VendorCollaboration.list("-last_activity", 100).catch(() => []),
        base44.entities.Vendor.list("-created_date", 100).catch(() => []),
      ]);
      setCollaborations(collabs || []);
      setVendors(vens || []);
      if ((collabs || []).length > 0 && !selected) setSelected(collabs[0]);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCollabs = collaborations.filter(c => c.status !== "closed");
  const awaitingVendor = collaborations.filter(c => c.status === "awaiting_vendor");
  const awaitingTenant = collaborations.filter(c => c.status === "awaiting_tenant");
  const totalUnread = collaborations.reduce((sum, c) => sum + (c.unread_count_tenant || 0), 0);

  return (
    <div>
      <PageHeader
        title="Vendor Collaboration Network"
        subtitle="Two-sided real-time collaboration — vendors respond to assessments, upload evidence, answer follow-up questions, and exchange documents directly in the platform"
        actions={
          <Button onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-1.5" />New Collaboration
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Threads" value={openCollabs.length} icon={MessageSquare} color="blue" trendLabel="Open collaborations" />
        <StatCard label="Awaiting Vendor" value={awaitingVendor.length} icon={Clock} color="amber" trendLabel="Vendor needs to respond" />
        <StatCard label="Awaiting You" value={awaitingTenant.length} icon={ArrowRight} color="purple" trendLabel="Your turn to respond" />
        <StatCard label="Unread Messages" value={totalUnread} icon={MessageSquare} color={totalUnread > 0 ? "red" : "green"} trendLabel="From vendors" />
      </div>

      {showNew && (
        <NewCollaborationForm
          vendors={vendors}
          onClose={() => setShowNew(false)}
          onCreated={(c) => { setShowNew(false); loadData(); setSelected(c); }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Collaboration Threads</h3>
          <div className="space-y-2">
            {loading ? <Spinner /> : (
              collaborations.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-xl">
                  <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No collaborations yet</p>
                </div>
              ) : (
                collaborations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selected?.id === c.id ? 'bg-primary/5 border-primary' : 'bg-card border-border hover:border-primary/30'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{c.collaboration_id}</span>
                      <Badge className={`text-xs ${STATUS_META[c.status]?.color || STATUS_META.open.color}`}>{STATUS_META[c.status]?.label || c.status}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.vendor_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {c.unread_count_tenant > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{c.unread_count_tenant} unread</Badge>}
                      <span className="text-xs text-muted-foreground">{c.message_count || 0} msgs · {c.document_count || 0} docs</span>
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <CollaborationThread collaboration={selected} onRefresh={() => loadData()} />
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Select a collaboration to view the thread</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CollaborationThread({ collaboration, onRefresh }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("messages");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    try { setMessages(JSON.parse(collaboration.messages || '[]')); } catch (_) { setMessages([]); }
    try { setDocuments(JSON.parse(collaboration.shared_documents || '[]')); } catch (_) { setDocuments([]); }
    try { setQuestions(JSON.parse(collaboration.follow_up_questions || '[]')); } catch (_) { setQuestions([]); }
  }, [collaboration]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await base44.functions.invoke("vendorCollaboration", {
        action: "post_message",
        collaboration_id: collaboration.id,
        text: newMessage,
        from_type: "tenant",
        from_name: "You",
      });
      setNewMessage("");
      // Mark as read on our side
      await base44.functions.invoke("vendorCollaboration", {
        action: "mark_read",
        collaboration_id: collaboration.id,
        side: "tenant",
      });
      onRefresh();
    } catch (e) { toast({ variant: "destructive", title: "Send failed", description: e?.message }); }
    setSending(false);
  };

  const askQuestion = async () => {
    if (!newQuestion.trim()) return;
    setSending(true);
    try {
      await base44.functions.invoke("vendorCollaboration", {
        action: "ask_question",
        collaboration_id: collaboration.id,
        question: newQuestion,
        asked_by: "You",
        asked_by_type: "tenant",
      });
      setNewQuestion("");
      onRefresh();
    } catch (e) { toast({ variant: "destructive", title: "Question failed", description: e?.message }); }
    setSending(false);
  };

  const answerQuestion = async (qId, answer) => {
    if (!answer.trim()) return;
    setSending(true);
    try {
      await base44.functions.invoke("vendorCollaboration", {
        action: "answer_question",
        collaboration_id: collaboration.id,
        question_id: qId,
        answer,
        answered_by: "You (simulated vendor response)",
        answered_by_type: "vendor",
      });
      onRefresh();
    } catch (e) { toast({ variant: "destructive", title: "Answer failed", description: e?.message }); }
    setSending(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col" style={{ height: "600px" }}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-heading font-bold text-foreground">{collaboration.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{collaboration.vendor_name}</span>
              <Badge className={`text-xs ${STATUS_META[collaboration.status]?.color || STATUS_META.open.color}`}>{STATUS_META[collaboration.status]?.label || collaboration.status}</Badge>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{collaboration.message_count || 0} messages</p>
            <p>{collaboration.document_count || 0} documents</p>
            <p>{collaboration.open_questions || 0} open questions</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border">
        <button onClick={() => setActiveTab("messages")} className={`flex-1 py-2 text-xs font-medium ${activeTab === "messages" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>Messages</button>
        <button onClick={() => setActiveTab("documents")} className={`flex-1 py-2 text-xs font-medium ${activeTab === "documents" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>Documents ({documents.length})</button>
        <button onClick={() => setActiveTab("questions")} className={`flex-1 py-2 text-xs font-medium ${activeTab === "questions" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>Questions ({collaboration.open_questions || 0})</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "messages" && (
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No messages yet. Start the conversation below.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from_type === "tenant" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg p-3 ${msg.from_type === "tenant" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <p className="text-xs font-semibold mb-1 opacity-70">{msg.from_name || msg.from_type}</p>
                    <p className="text-sm">{msg.text}</p>
                    {msg.attachment_url && (
                      <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-xs underline mt-1 inline-flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />{msg.attachment_name || "Attachment"}
                      </a>
                    )}
                    <p className="text-xs opacity-50 mt-1">{new Date(msg.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-2">
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No documents shared yet.</p>
              </div>
            ) : (
              documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-foreground hover:underline truncate">{doc.name}</a>
                    <p className="text-xs text-muted-foreground">Uploaded by {doc.uploaded_by} · {new Date(doc.uploaded_at).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{doc.uploaded_by_type}</Badge>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "questions" && (
          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="text-center py-8">
                <HelpCircle className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No follow-up questions yet.</p>
              </div>
            ) : (
              questions.map((q) => <QuestionCard key={q.id} question={q} onAnswer={answerQuestion} />)
            )}
          </div>
        )}
      </div>

      {activeTab === "messages" && (
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..." rows={2} className="text-sm" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
            <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} size="icon" className="self-end">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {activeTab === "questions" && (
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Ask a follow-up question..." className="text-sm" onKeyDown={(e) => { if (e.key === "Enter") askQuestion(); }} />
            <Button onClick={askQuestion} disabled={sending || !newQuestion.trim()} size="sm">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <HelpCircle className="w-4 h-4 mr-1" />}
              Ask
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionCard({ question, onAnswer }) {
  const [answer, setAnswer] = useState("");
  const isAnswered = question.status === "answered" && question.answer;

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-start gap-2 mb-2">
        <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{question.question}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Asked by {question.asked_by} · {new Date(question.asked_at).toLocaleString()}</p>
        </div>
        {isAnswered ? (
          <Badge className="bg-emerald-100 text-emerald-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Answered</Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 text-xs">Open</Badge>
        )}
      </div>
      {isAnswered ? (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground bg-muted/30 rounded p-2">{question.answer}</p>
          <p className="text-xs text-muted-foreground mt-1">Answered by {question.answered_by} · {new Date(question.answered_at).toLocaleString()}</p>
        </div>
      ) : (
        <div className="mt-2">
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type the vendor's response..." rows={2} className="text-sm mb-2" />
          <Button size="sm" onClick={() => onAnswer(question.id, answer)} disabled={!answer.trim()}>
            Record Answer
          </Button>
        </div>
      )}
    </div>
  );
}

function NewCollaborationForm({ vendors, onClose, onCreated }) {
  const { toast } = useToast();
  const [vendorId, setVendorId] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!vendorId || !title) { toast({ variant: "destructive", title: "Vendor and title required" }); return; }
    setCreating(true);
    try {
      const vendor = vendors.find(v => v.id === vendorId);
      const res = await base44.functions.invoke("vendorCollaboration", {
        action: "create_collaboration",
        vendor_id: vendorId,
        vendor_name: vendor?.name || "",
        title,
        priority,
      });
      const data = res?.data || res;
      toast({ title: "Collaboration created" });
      onCreated(data.collaboration);
    } catch (e) { toast({ variant: "destructive", title: "Create failed", description: e?.message }); }
    setCreating(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">New Vendor Collaboration</h3>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Vendor</Label>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-transparent text-sm">
            <option value="">Select a vendor...</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Security Assessment Follow-up" />
        </div>
        <div>
          <Label className="text-xs">Priority</Label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-transparent text-sm">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
            Create Collaboration
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
}
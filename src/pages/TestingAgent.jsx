import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import MessageBubble from "@/components/agents/MessageBubble";
import { FlaskRound, Send, Loader2, Plus, MessageSquare, Trash2 } from "lucide-react";

const AGENT_NAME = "testing_agent";
const SUGGESTIONS = [
  "Are all critical controls passing?",
  "Verify risk scores are calculated correctly (likelihood × impact)",
  "Check for overdue compliance tasks",
  "Are there unmapped framework requirements?",
  "Do all active vendors have a recent assessment?",
  "Are there open high-severity security findings?",
];

export default function TestingAgent() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const scrollRef = useRef(null);
  const { toast } = useToast();

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
    } catch {
      /* first load may be empty */
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Subscribe to active conversation updates
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setActiveConv(null);
      return;
    }
    base44.agents.getConversation(activeId).then((c) => {
      setActiveConv(c);
      setMessages(c.messages || []);
    }).catch(() => {
      setMessages([]);
    });
    const unsubscribe = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [activeId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const createConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: `Test Session ${new Date().toLocaleString()}` },
      });
      await loadConversations();
      setActiveId(conv.id);
    } catch (e) {
      toast({ title: "Failed to start session", description: e.message, variant: "destructive" });
    }
  };

  const sendMessage = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    if (!activeId) {
      toast({ title: "Start a test session first", variant: "destructive" });
      return;
    }
    setInput("");
    setSending(true);
    try {
      const conv = activeConv || await base44.agents.getConversation(activeId);
      await base44.agents.addMessage(conv, { role: "user", content });
    } catch (e) {
      toast({ title: "Failed to send message", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const deleteConversation = async (id) => {
    if (!window.confirm("Delete this test session?")) return;
    try {
      await base44.agents.updateConversation(id, { metadata: { name: "__deleted__" } });
      if (activeId === id) {
        setActiveId(null);
      }
      await loadConversations();
      toast({ title: "Session deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Testing Agent"
        subtitle="AI-powered QA assistant — validate GRC workflows, verify data integrity, and run structured test scenarios"
        actions={
          <Button onClick={createConversation} size="sm">
            <Plus className="w-4 h-4 mr-1" /> New Test Session
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Conversation list */}
        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          <div className="px-3 py-2.5 border-b border-border bg-muted/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Test Sessions</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingList ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8 px-3">
                No sessions yet. Click <strong>New Test Session</strong> to start.
              </p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${activeId === c.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"}`}
                  onClick={() => setActiveId(c.id)}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground truncate flex-1">
                    {c.metadata?.name || "Untitled session"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <FlaskRound className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground">CertiGuard Testing Agent</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Start a new test session, then ask the agent to verify your compliance data, check workflow integrity, or run a structured QA scenario.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-lg w-full">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => createConversation()}
                    className="text-left text-xs rounded-lg border border-border bg-muted/30 px-3 py-2.5 hover:bg-muted/60 hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Ask the testing agent a question to begin your QA session.</p>
                  </div>
                )}
                {messages.map((m, idx) => (
                  <MessageBubble key={idx} message={m} />
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Agent is thinking…</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-border p-3 bg-card">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask the testing agent to verify a workflow…"
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={sending || !input.trim()}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
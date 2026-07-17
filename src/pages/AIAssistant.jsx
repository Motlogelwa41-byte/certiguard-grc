import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, Plus, MessageSquare, Loader2, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const AGENT_NAME = "platform_guide";
const SUGGESTIONS = [
  "How do I get my SOC 2 readiness score up?",
  "How do I assign control owners in bulk?",
  "Explain the policy approval workflow",
  "How do I export a board PDF report?",
];

export default function AIAssistant() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingConv, setLoadingConv] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef(null);
  const { toast } = useToast();

  // Load conversation list on mount
  useEffect(() => {
    base44.agents
      .listConversations({ agent_name: AGENT_NAME })
      .then((list) => {
        setConversations(list || []);
        if (list && list.length > 0) {
          setActiveId(list[0].id);
        }
      })
      .catch(() => toast({ title: "Could not load conversations", variant: "destructive" }))
      .finally(() => setLoadingConv(false));
  }, []);

  // Load messages + subscribe when active conversation changes
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let unsub = () => {};
    base44.agents
      .getConversation(activeId)
      .then((conv) => {
        setMessages(conv.messages || []);
        const u = base44.agents.subscribeToConversation(activeId, (data) => {
          setMessages(data.messages || []);
          setSending(false);
        });
        unsub = u;
      })
      .catch(() => toast({ title: "Could not open conversation", variant: "destructive" }));
    return () => unsub();
  }, [activeId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const createConversation = async () => {
    setCreating(true);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: `Chat ${new Date().toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` },
      });
      setConversations([conv, ...conversations]);
      setActiveId(conv.id);
      setMessages([]);
    } catch (e) {
      toast({ title: "Could not start chat", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    if (!activeId) {
      await createConversation();
      return;
    }
    const conv = conversations.find((c) => c.id === activeId) || { id: activeId };
    setInput("");
    setSending(true);
    // optimistic user message
    setMessages((m) => [...m, { role: "user", content }]);
    try {
      await base44.agents.addMessage(conv, { role: "user", content });
      // subscription will stream the assistant response
    } catch (e) {
      setSending(false);
      toast({ title: "Message failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <PageHeader
        title="AI Assistant"
        subtitle="Your guide to the CertiGuard GRC platform — ask how to do anything"
        actions={
          <Button size="sm" onClick={createConversation} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            New Chat
          </Button>
        }
      />

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Conversation list */}
        <div className="w-60 shrink-0 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Conversations
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            {loadingConv ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 px-2">No chats yet. Start a new one.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-lg text-sm transition-colors ${
                    c.id === activeId ? "bg-primary/10 text-foreground border border-primary/30" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{c.metadata?.name || "Untitled"}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden min-h-0">
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-foreground">Meet your Compliance Guide</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                I can show you how to use any part of the platform — from running a SOC 2 gap analysis to exporting board PDF reports. Start a chat to begin.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-lg w-full">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => createConversation().then(() => setTimeout(() => send(s), 300))}
                    className="text-left text-sm px-3.5 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="block w-full text-left text-sm px-3.5 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {messages.map((m, i) => (
                  <MessageBubble key={i} message={m} />
                ))}
                {sending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Guide is thinking…
                  </div>
                )}
              </div>

              <div className="border-t border-border p-3 flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask how to do anything in the platform…"
                  disabled={sending}
                />
                <Button size="icon" onClick={() => send()} disabled={sending || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-border"}`}>
        {message.content ? (
          isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:mt-2 prose-headings:mb-1">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )
        ) : null}
        {message.tool_calls?.map((tc, idx) => (
          <FunctionDisplay key={idx} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}

function FunctionDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = tcStatus(toolCall);
  let parsed = null;
  try { parsed = typeof toolCall.results === "string" ? JSON.parse(toolCall.results) : toolCall.results; } catch { parsed = toolCall.results; }
  const failed = status === "failed" || (parsed && typeof parsed === "object" && parsed.success === false);
  const proj = toolCall.display_projection || {};
  if (proj.hide_details && proj.details_redacted) {
    return (
      <div className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${failed ? "bg-red-500" : "bg-emerald-500"}`} />
        {failed ? (proj.error_label || "Failed") : (proj.label || toolCall.name)}
      </div>
    );
  }
  return (
    <div className="mt-2 text-xs border-t border-border/50 pt-1.5">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <span className={`w-1.5 h-1.5 rounded-full ${failed ? "bg-red-500" : "bg-emerald-500"}`} />
        <span className="font-medium">{toolCall.name}</span>
        <span className="opacity-70">— {failed ? "failed" : "completed"}</span>
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1 text-muted-foreground">
          {toolCall.arguments_string && (
            <div>
              <span className="font-medium text-foreground/70">Parameters:</span>
              <pre className="mt-0.5 bg-muted/50 rounded p-1.5 overflow-x-auto text-[11px]">{toolCall.arguments_string}</pre>
            </div>
          )}
          {parsed != null && (
            <div>
              <span className="font-medium text-foreground/70">Result:</span>
              <pre className="mt-0.5 bg-muted/50 rounded p-1.5 overflow-x-auto text-[11px]">{typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function tcStatus(tc) {
  return tc.status || "";
}
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2, ChevronDown, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const AGENT_NAME = "mitigation_advisor";

const SUGGESTED_PROMPTS = [
  "Which mitigation steps should I prioritize for my highest-ALE risk quantifications?",
  "Analyze the risk quantification for our top exposure and recommend the best mitigation step with a linked control.",
  "Show me existing mitigation steps for the risk with the highest exposure rating and suggest improvements.",
];

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status || "pending";
  const isFailed = ["failed", "error"].includes(status) ||
    (toolCall.results && /error|failed/i.test(typeof toolCall.results === "string" ? toolCall.results : JSON.stringify(toolCall.results)));
  const isRunning = ["pending", "running", "in_progress"].includes(status);

  let parsedResults = toolCall.results;
  if (typeof toolCall.results === "string") {
    try { parsedResults = JSON.parse(toolCall.results); } catch { parsedResults = toolCall.results; }
  }

  let parsedArgs = toolCall.arguments_string;
  if (typeof parsedArgs === "string") {
    try { parsedArgs = JSON.parse(parsedArgs); } catch { /* keep raw */ }
  }

  const proj = toolCall.display_projection || {};
  const hideDetails = proj.hide_details && proj.details_redacted;

  const statusIcon = isFailed ? "✕" : isRunning ? "⟳" : "✓";
  const statusColor = isFailed ? "text-destructive" : isRunning ? "text-accent" : "text-success";
  const label = proj.label || (toolCall.name || "tool").replace(/_/g, " ");

  return (
    <div className="mt-2 text-xs rounded-lg border border-border bg-muted/30 p-2.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className={`font-semibold ${statusColor}`}>{statusIcon}</span>
        <span className="font-medium capitalize flex-1">{label}</span>
        {isRunning && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        {!hideDetails && <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />}
      </button>
      {!hideDetails && expanded && (
        <div className="mt-2 space-y-2">
          {parsedArgs && Object.keys(parsedArgs).length > 0 && (
            <div>
              <p className="text-muted-foreground font-medium mb-1">Parameters:</p>
              <pre className="bg-background rounded p-2 overflow-x-auto text-[11px] leading-relaxed">{JSON.stringify(parsedArgs, null, 2)}</pre>
            </div>
          )}
          {parsedResults != null && (
            <div>
              <p className="text-muted-foreground font-medium mb-1">Result:</p>
              <pre className="bg-background rounded p-2 overflow-x-auto text-[11px] leading-relaxed max-h-48">{typeof parsedResults === "string" ? parsedResults : JSON.stringify(parsedResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${isUser ? "" : "w-full"}`}>
        {message.content && (
          isUser
            ? <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">{message.content}</div>
            : <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3 text-sm">
                <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-heading prose-p:my-1.5 prose-li:my-0.5 prose-ul:my-1.5">{message.content}</ReactMarkdown>
              </div>
        )}
        {message.tool_calls?.map((tc, idx) => <ToolCallDisplay key={idx} toolCall={tc} />)}
      </div>
    </div>
  );
}

export default function MitigationAdvisor() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const unsubscribe = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data.messages || []);
      setSending(false);
    });
    return () => unsubscribe();
  }, [activeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const loadConversations = async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
      if (list && list.length > 0) {
        setActiveId(list[0].id);
        setMessages(list[0].messages || []);
      }
    } catch (e) {
      console.error("Failed to load conversations", e);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: "Mitigation Advisory", description: "Mitigation step selection assistance" },
      });
      setConversations([conv, ...conversations]);
      setActiveId(conv.id);
      setMessages([]);
    } catch (e) {
      console.error("Failed to create conversation", e);
    }
  };

  const selectConversation = async (convId) => {
    setActiveId(convId);
    try {
      const conv = await base44.agents.getConversation(convId);
      setMessages(conv.messages || []);
    } catch (e) {
      console.error("Failed to load conversation", e);
    }
  };

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || sending) return;

    let convId = activeId;
    if (!convId) {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: "Mitigation Advisory", description: "Mitigation step selection assistance" },
        });
        setConversations([conv, ...conversations]);
        setActiveId(conv.id);
        convId = conv.id;
      } catch (e) {
        console.error("Failed to create conversation", e);
        return;
      }
    }

    setInput("");
    setSending(true);
    setMessages(prev => [...prev, { role: "user", content }]);

    try {
      const conv = await base44.agents.getConversation(convId);
      await base44.agents.addMessage(conv, { role: "user", content });
    } catch (e) {
      console.error("Failed to send message", e);
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Conversation sidebar */}
      <div className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="p-3 border-b border-sidebar-border">
          <Button onClick={startNewConversation} className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> New Advisory
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                  activeId === conv.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{conv.metadata?.name || "Mitigation Advisory"}</span>
              </button>
            ))}
            {conversations.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">No conversations yet</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border px-6 py-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <div>
            <h1 className="font-heading font-semibold text-lg leading-tight">Mitigation Step Advisor</h1>
            <p className="text-xs text-muted-foreground">AI-powered selection of the best mitigation actions for your quantified risks</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : messages.length === 0 ? (
            <div className="max-w-2xl mx-auto pt-12">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h2 className="font-heading text-xl font-semibold mb-2">Mitigation Step Advisor</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  I analyze your FAIR-based risk quantifications and recommend the most effective mitigation steps —
                  with linked controls, owners, and due dates — to reduce ALE and exposure.
                </p>
              </div>
              <div className="space-y-2">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    disabled={sending}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/10 hover:border-accent/40 transition-colors text-sm text-foreground disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border px-6 py-4">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask about mitigation steps for a risk quantification..."
              disabled={sending}
              className="flex-1"
            />
            <Button onClick={() => sendMessage()} disabled={sending || !input.trim()} size="icon">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
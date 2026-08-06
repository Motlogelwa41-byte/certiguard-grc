import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft, Send, Paperclip, Loader2, ShieldAlert, Users, Clock,
  Upload, FileText, MessageSquare,
} from "lucide-react";

export default function IncidentWarRoom() {
  const { id } = useParams();
  const { toast } = useToast();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setCurrentUser(me);
        const inc = await base44.entities.Incident.get(id);
        setIncident(inc);
        const parsed = (() => {
          try { return JSON.parse(inc.war_room_messages || "[]"); } catch { return []; }
        })();
        setMessages(parsed);
        const ev = (() => {
          try { return JSON.parse(inc.response_summary || "[]"); } catch { return []; }
        })();
        if (Array.isArray(ev) && ev.length > 0 && typeof ev[0] === "string") setEvidenceUrls(ev);
      } catch (e) {
        toast({ title: "Failed to load incident", description: e.message, variant: "destructive" });
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    setSending(true);
    const msg = {
      id: `msg_${Date.now()}`,
      from: currentUser.full_name || currentUser.email || "Unknown",
      from_id: currentUser.id,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: "message",
    };
    const updated = [...messages, msg];
    setMessages(updated);
    setNewMessage("");
    try {
      await base44.entities.Incident.update(id, {
        war_room_messages: JSON.stringify(updated),
      });
    } catch (e) {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const artifact = {
        id: `art_${Date.now()}`,
        from: currentUser?.full_name || currentUser?.email || "Unknown",
        from_id: currentUser?.id,
        file_name: file.name,
        file_url,
        timestamp: new Date().toISOString(),
        type: "evidence",
      };
      const updated = [...messages, artifact];
      setMessages(updated);
      await base44.entities.Incident.update(id, {
        war_room_messages: JSON.stringify(updated),
      });
      toast({ title: "Evidence uploaded", description: file.name });
    } catch (e) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
    setUploading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!incident) return (
    <div className="text-center py-20">
      <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground">Incident not found.</p>
      <Link to="/incidents"><Button variant="outline" className="mt-4">Back to Incidents</Button></Link>
    </div>
  );

  const sevColor = {
    critical: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader
        title="Incident War Room"
        subtitle="Secure collaboration and evidence collection channel"
        actions={
          <Link to="/incidents"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button></Link>
        }
      />

      {/* Incident context bar */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4 flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${sevColor[incident.severity] || sevColor.medium}`}>
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-heading font-semibold text-foreground truncate">{incident.title}</h2>
            <Badge variant="outline" className="capitalize">{incident.severity}</Badge>
            <Badge variant="outline" className="capitalize">{incident.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{incident.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {incident.assigned_to || "Unassigned"}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {incident.detected_date || "Unknown"}</span>
          </div>
        </div>
      </div>

      {/* Chat thread */}
      <div className="flex-1 bg-card rounded-xl border border-border flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">War Room Thread</h3>
          <span className="text-xs text-muted-foreground ml-auto">{messages.length} messages</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
            </div>
          )}
          {messages.map((m) => {
            const isMe = m.from_id === currentUser?.id;
            if (m.type === "evidence") {
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%]">
                    <div className={`rounded-xl border p-3 ${isMe ? "bg-primary/5 border-primary/20" : "bg-muted border-border"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-primary" />
                        <a href={m.file_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline truncate">{m.file_name}</a>
                      </div>
                      <p className="text-xs text-muted-foreground">Evidence artifact · {m.from} · {new Date(m.timestamp).toLocaleString("en-ZA")}</p>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[75%]">
                  <div className={`rounded-xl px-4 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <p className="text-sm">{m.text}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    {m.from} · {new Date(m.timestamp).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <label className="cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Paperclip className="w-5 h-5 text-muted-foreground" />}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            <Textarea
              rows={1}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              className="flex-1 resize-none max-h-32"
            />
            <Button size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 px-1">All messages and evidence are tenant-isolated and recorded in the audit trail.</p>
        </div>
      </div>
    </div>
  );
}
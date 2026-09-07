import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Send, Reply, CornerDownRight, Check, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function renderMentions(body) {
  const parts = body.split(/(@\w[\w\s.]+)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="bg-primary/15 text-primary font-medium rounded px-1">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function CommentThread({ entityType, entityId, entityTitle }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const load = useCallback(async () => {
    try {
      const all = await base44.entities.Comment.list("-created_date", 200);
      const filtered = (all || []).filter(
        (c) => c.entity_type === entityType && c.entity_id === entityId
      );
      setComments(filtered);
    } catch (_) {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const handlePost = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const mentions = (body.match(/@(\w[\w\s.]+)/g) || []).map((m) => m.slice(1).trim());
      const payload = {
        entity_type: entityType,
        entity_id: entityId,
        entity_title: entityTitle || "",
        body: body.trim(),
        mentions,
        author_name: user?.full_name || "Unknown",
        author_id: user?.id || "",
      };
      if (replyTo) payload.parent_comment_id = replyTo.id;
      await base44.entities.Comment.create(payload);
      setBody("");
      setReplyTo(null);
      await load();
      toast({ title: "Comment posted" });
    } catch (e) {
      toast({ title: "Failed to post comment", description: e.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const handleResolve = async (comment) => {
    try {
      await base44.entities.Comment.update(comment.id, { resolved: !comment.resolved });
      await load();
    } catch (e) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (comment) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await base44.entities.Comment.delete(comment.id);
      await load();
    } catch (e) {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    }
  };

  // Build threaded structure
  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const getReplies = (parentId) => comments.filter((c) => c.parent_comment_id === parentId);
  const unresolvedCount = comments.filter((c) => !c.resolved).length;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-base font-heading font-semibold text-foreground">
          Collaboration Thread
        </h3>
        <span className="text-xs text-muted-foreground">
          ({comments.length} {comments.length === 1 ? "comment" : "comments"}
          {unresolvedCount > 0 && ` · ${unresolvedCount} open`})
        </span>
      </div>

      {/* Comment input */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <CornerDownRight className="w-3 h-3" />
          Replying to {replyTo.author_name}
          <Button variant="ghost" size="sm" className="h-5 text-xs" onClick={() => setReplyTo(null)}>
            Cancel
          </Button>
        </div>
      )}
      <div className="flex gap-2 mb-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Comment on this ${entityType.toLowerCase()}... (use @name to mention someone)`}
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost();
          }}
        />
        <Button onClick={handlePost} disabled={posting || !body.trim()} className="self-end">
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No comments yet. Start the conversation.
        </p>
      ) : (
        <div className="space-y-3">
          {topLevel.map((comment) => {
            const replies = getReplies(comment.id);
            return (
              <div key={comment.id}>
                <CommentCard
                  comment={comment}
                  onReply={() => setReplyTo(comment)}
                  onResolve={() => handleResolve(comment)}
                  onDelete={() => handleDelete(comment)}
                  canModify={user?.id === comment.author_id || user?.role === "admin"}
                />
                {replies.length > 0 && (
                  <div className="ml-6 mt-2 space-y-2 border-l-2 border-border/50 pl-4">
                    {replies.map((reply) => (
                      <CommentCard
                        key={reply.id}
                        comment={reply}
                        onResolve={() => handleResolve(reply)}
                        onDelete={() => handleDelete(reply)}
                        canModify={user?.id === reply.author_id || user?.role === "admin"}
                        isReply
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CommentCard({ comment, onReply, onResolve, onDelete, canModify, isReply }) {
  return (
    <div className={`p-3 rounded-lg border ${comment.resolved ? "bg-muted/10 border-border/50 opacity-70" : "bg-card border-border"}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
          {(comment.author_name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-foreground">{comment.author_name || "Unknown"}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(comment.created_date)}</span>
            {comment.resolved && (
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <Check className="w-3 h-3" /> Resolved
              </span>
            )}
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {renderMentions(comment.body)}
          </p>
          <div className="flex items-center gap-1 mt-2">
            {!isReply && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onReply}>
                <Reply className="w-3 h-3 mr-1" /> Reply
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onResolve}>
              <Check className="w-3 h-3 mr-1" /> {comment.resolved ? "Reopen" : "Resolve"}
            </Button>
            {canModify && (
              <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={onDelete}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
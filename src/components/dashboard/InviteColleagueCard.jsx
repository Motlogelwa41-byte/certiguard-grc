import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { UserPlus, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function InviteColleagueCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast({ title: "Please enter a colleague's email.", variant: "destructive" });
      return;
    }
    if (trimmed === user?.email?.toLowerCase()) {
      toast({ title: "You can't invite yourself.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await base44.functions.invoke("sendColleagueInvite", {
        invitee_email: trimmed,
      });
      if (res?.data?.error) {
        toast({ title: res.data.error, variant: "destructive" });
      } else {
        toast({ title: "Invite sent!", description: `We emailed ${trimmed} a link to join your team.` });
        setSent(true);
        setEmail("");
      }
    } catch (err) {
      toast({ title: err?.message || "Failed to send invite.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
          <UserPlus className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-foreground">Invite a colleague</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Send a branded invitation with a pre-filled registration link to your tenant.
          </p>
        </div>
      </div>

      {sent ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Invitation sent. Invite another colleague below.</span>
        </div>
      ) : null}

      <form onSubmit={handleInvite} className="flex gap-2 mt-1">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setSent(false); }}
            className="pl-9"
            disabled={sending}
          />
        </div>
        <Button type="submit" disabled={sending || !email.trim()} className="gap-1.5 shrink-0">
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Sending…
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" /> Invite
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, Clock, Users, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

export default function PolicyAcknowledgments() {
  const [policies, setPolicies] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.Policy.list(),
      base44.entities.User.list(),
      base44.auth.me(),
    ]).then(([p, u, me]) => {
      setPolicies(p);
      setUsers(u);
      setCurrentUser(me);
      setLoading(false);
    });
  }, []);

  // acknowledgments stored as JSON string in policy.acknowledged_by field
  const getAcknowledged = (policy) => {
    try { return JSON.parse(policy.acknowledged_by || "[]"); } catch { return []; }
  };

  const handleAcknowledge = async (policy) => {
    if (!currentUser) return;
    setAcknowledging(policy.id);
    const acked = getAcknowledged(policy);
    if (acked.find(a => a.user_id === currentUser.id)) {
      toast({ title: "Already acknowledged" });
      setAcknowledging(null);
      return;
    }
    const newAcked = [...acked, { user_id: currentUser.id, user_name: currentUser.full_name || currentUser.email, acknowledged_at: new Date().toISOString(), version: policy.version || "1.0" }];
    await base44.entities.Policy.update(policy.id, {
      acknowledged_by: JSON.stringify(newAcked),
      acknowledgment_count: newAcked.length,
    });
    setPolicies(prev => prev.map(p => p.id === policy.id ? { ...p, acknowledged_by: JSON.stringify(newAcked), acknowledgment_count: newAcked.length } : p));
    toast({ title: "Policy acknowledged", description: `You acknowledged "${policy.title}"` });
    setAcknowledging(null);
  };

  const requiresAck = policies.filter(p => p.acknowledgment_required && (p.status === "approved" || p.status === "published"));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Policy Acknowledgments"
        subtitle="Track who has acknowledged each policy"
        actions={<Link to="/policies"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Policies</Button></Link>}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <FileText className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{requiresAck.length}</p>
          <p className="text-xs text-muted-foreground">Policies Requiring Ack</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <Users className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{users.length}</p>
          <p className="text-xs text-muted-foreground">Team Members</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {currentUser ? requiresAck.filter(p => getAcknowledged(p).find(a => a.user_id === currentUser.id)).length : 0}
          </p>
          <p className="text-xs text-muted-foreground">You've Acknowledged</p>
        </div>
      </div>

      {requiresAck.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
          <p className="font-semibold text-foreground">No policies require acknowledgment</p>
          <p className="text-sm mt-1">Approve policies and mark them as requiring acknowledgment to see them here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requiresAck.map((policy) => {
            const acked = getAcknowledged(policy);
            const myAck = currentUser && acked.find(a => a.user_id === currentUser.id);
            const totalUsers = users.length;
            const pct = totalUsers > 0 ? Math.round((acked.length / totalUsers) * 100) : 0;

            return (
              <div key={policy.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{policy.title}</h3>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{(policy.category || "").replace(/_/g, " ")} · v{policy.version || "1.0"}</p>
                  </div>
                  {myAck ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => handleAcknowledge(policy)} disabled={acknowledging === policy.id}>
                      {acknowledging === policy.id ? "Saving..." : "Acknowledge"}
                    </Button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{acked.length} of {totalUsers} team members acknowledged</span>
                    <span className="font-semibold text-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Who acknowledged */}
                {acked.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Acknowledged by:</p>
                    <div className="flex flex-wrap gap-2">
                      {acked.map((a, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {a.user_name}
                          <span className="text-muted-foreground">· {new Date(a.acknowledged_at).toLocaleDateString()}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Who hasn't — show outstanding users */}
                {acked.length < totalUsers && (
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-amber-500" /> Pending ({totalUsers - acked.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {users.filter(u => !acked.find(a => a.user_id === u.id)).map((u) => (
                        <span key={u.id} className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                          <Clock className="w-3 h-3" />
                          {u.full_name || u.email}
                        </span>
                      ))}
                    </div>
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
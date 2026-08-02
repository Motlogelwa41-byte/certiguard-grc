import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { FileText, PenLine, CheckCircle2, Clock, FileSignature } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import ReactMarkdown from "react-markdown";

export default function MyPolicies() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [policies, setPolicies] = useState([]);
  const [attestations, setAttestations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signature, setSignature] = useState("");
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Policy.list().catch(() => []),
      base44.entities.PolicyAttestation.list().catch(() => []),
    ]).then(([pols, atts]) => {
      // Show approved and in_review policies to employees
      setPolicies((pols || []).filter((p) => p.status === "approved" || p.status === "in_review"));
      setAttestations(atts || []);
      setLoading(false);
    });
  }, []);

  const hasSigned = (policyId) => {
    return attestations.some(
      (a) => a.policy_id === policyId && a.employee_id === user?.id
    );
  };

  const handleSign = async () => {
    if (!signature.trim()) {
      toast({ title: "Please type your full name to sign", variant: "destructive" });
      return;
    }
    setSigning(true);
    try {
      const now = new Date().toISOString();
      await base44.entities.PolicyAttestation.create({
        tenant_id: user?.data?.tenant_id || user?.tenant_id,
        policy_id: selectedPolicy.id,
        policy_title: selectedPolicy.title,
        policy_version: selectedPolicy.version || "1.0",
        employee_name: user?.full_name || user?.email,
        employee_id: user?.id,
        employee_email: user?.email,
        signed_at: now,
        signature: signature.trim(),
        acknowledgment_text: `I acknowledge that I have read and understood the "${selectedPolicy.title}" policy (version ${selectedPolicy.version || "1.0"}) and agree to comply with its requirements.`,
        ip_address: "",
      });
      // Refresh attestations
      const atts = await base44.entities.PolicyAttestation.list().catch(() => []);
      setAttestations(atts || []);
      setSignDialogOpen(false);
      setSignature("");
      setSelectedPolicy(null);
      toast({ title: "Policy signed successfully", description: "Your acknowledgment has been recorded." });
    } catch (e) {
      toast({ title: "Error signing policy", description: e.message, variant: "destructive" });
    } finally {
      setSigning(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="My Policies" subtitle="Review and acknowledge your company's policies" />

      {policies.length === 0 ? (
        <EmptyState icon={FileText} title="No policies assigned" description="Your organization hasn't published any policies for your review yet." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Policy list */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Assigned Policies ({policies.length})</h3>
            {policies.map((p) => {
              const signed = hasSigned(p.id);
              return (
                <Card key={p.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedPolicy?.id === p.id ? "ring-2 ring-primary" : ""}`}>
                  <CardContent className="p-5" onClick={() => setSelectedPolicy(p)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${signed ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"}`}>
                          {signed ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground">{p.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">v{p.version || "1.0"}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground capitalize">{(p.category || "").replace(/_/g, " ")}</span>
                          </div>
                          {signed ? (
                            <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" /> Signed & acknowledged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-600">
                              <Clock className="w-3 h-3" /> Awaiting your review
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Document viewer */}
          <div className="lg:sticky lg:top-6 self-start">
            {selectedPolicy ? (
              <Card>
                <CardContent className="p-0">
                  <div className="px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-heading font-bold text-foreground">{selectedPolicy.title}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">Version {selectedPolicy.version || "1.0"}</span>
                      {selectedPolicy.category && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{(selectedPolicy.category || "").replace(/_/g, " ")}</span>}
                    </div>
                  </div>
                  <div className="px-6 py-5 max-h-[50vh] overflow-y-auto prose prose-sm max-w-none text-foreground">
                    {selectedPolicy.content ? (
                      <ReactMarkdown>{selectedPolicy.content}</ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground">{selectedPolicy.description || "No content available for this policy."}</p>
                    )}
                  </div>
                  <div className="px-6 py-4 border-t border-border bg-muted/30">
                    {hasSigned(selectedPolicy.id) ? (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium">You have already signed this policy.</span>
                      </div>
                    ) : (
                      <Button
                        size="lg"
                        className="w-full text-base font-semibold"
                        onClick={() => setSignDialogOpen(true)}
                      >
                        <FileSignature className="w-5 h-5 mr-2" /> Review and Sign Policy
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-border rounded-xl">
                <FileText className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Select a policy to view its contents</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sign dialog */}
      <Dialog open={signDialogOpen} onOpenChange={(open) => { setSignDialogOpen(open); if (!open) setSignature(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-primary" /> Acknowledge & Sign
            </DialogTitle>
            <DialogDescription>
              By typing your full name below, you confirm that you have read and understood the "{selectedPolicy?.title}" policy (version {selectedPolicy?.version || "1.0"}) and agree to comply with its requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="signature">Type your full name as signature</Label>
              <Input
                id="signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder={user?.full_name || "Your full name"}
                onKeyDown={(e) => { if (e.key === "Enter" && signature.trim()) handleSign(); }}
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p className="font-medium mb-1">Acknowledgment statement:</p>
              <p>I acknowledge that I have read and understood the "{selectedPolicy?.title}" policy and agree to comply with its requirements. This attestation will be timestamped and recorded for audit purposes.</p>
            </div>
            <Button className="w-full" size="lg" onClick={handleSign} disabled={!signature.trim() || signing}>
              <FileSignature className="w-4 h-4 mr-2" /> {signing ? "Signing…" : "Sign & Submit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
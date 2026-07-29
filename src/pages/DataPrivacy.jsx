import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { Download, Trash2, Shield, AlertTriangle, Loader2, FileJson } from "lucide-react";

export default function DataPrivacy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [eraseDialog, setEraseDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const isAdmin = user?.role === "admin";

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await base44.functions.invoke("exportUserData", {});
      const data = res?.data || res;
      const total = data?.counts ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certiguard-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Data exported", description: `${total} records downloaded.` });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  const handleErase = async () => {
    setErasing(true);
    try {
      await base44.functions.invoke("eraseUserData", {});
      toast({ title: "Data erased", description: "All compliance data has been permanently deleted." });
      setEraseDialog(false);
      setConfirmText("");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      toast({ title: "Erasure failed", description: e.message, variant: "destructive" });
    }
    setErasing(false);
  };

  return (
    <div>
      <PageHeader title="Data Privacy & Your Rights" subtitle="Export or erase your data under GDPR and POPIA" />

      <div className="max-w-3xl space-y-6">
        {/* Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-success" />
              </div>
              <div>
                <CardTitle>Export Your Data</CardTitle>
                <CardDescription>Download all your tenant data as a portable JSON file — your right to data portability under GDPR Article 20 and POPIA.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              The export includes all frameworks, controls, risks, policies, evidence, tasks, vendors, incidents, certifications, and connections associated with your tenant.
            </p>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Preparing export…</> : <><FileJson className="w-4 h-4 mr-1" /> Download my data</>}
            </Button>
          </CardContent>
        </Card>

        {/* Erasure — admin only */}
        {isAdmin && (
          <Card className="border-destructive/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-destructive">Erase All Tenant Data</CardTitle>
                  <CardDescription>Permanently delete all compliance data — your right to erasure under GDPR Article 17 and POPIA.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 mb-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold text-destructive mb-1">This action is irreversible.</p>
                  <p>All frameworks, controls, risks, policies, evidence, tasks, vendors, incidents, certifications, and connections will be permanently deleted. Your user account and tenant record remain so you can continue to log in. Consider exporting your data first.</p>
                </div>
              </div>
              <Button variant="destructive" onClick={() => setEraseDialog(true)}>
                <Trash2 className="w-4 h-4 mr-1" /> Request data erasure
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Rights info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Your Rights</CardTitle>
                <CardDescription>Under GDPR and POPIA, you have the right to access, rectify, erase, and port your personal data.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>To exercise other rights (access, rectification, objection), contact our Information Officer at <a href="mailto:privacy@certiguard.io" className="text-primary underline">privacy@certiguard.io</a>.</p>
            <p>See our <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> for full details on how we handle your data.</p>
          </CardContent>
        </Card>
      </div>

      {/* Erase confirmation */}
      <Dialog open={eraseDialog} onOpenChange={(o) => { setEraseDialog(o); if (!o) setConfirmText(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Confirm permanent erasure</DialogTitle>
            <DialogDescription>This will permanently delete ALL compliance data for your tenant. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Type <strong className="text-destructive">ERASE MY DATA</strong> to confirm:</p>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="ERASE MY DATA" className="font-mono" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEraseDialog(false); setConfirmText(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleErase} disabled={erasing || confirmText !== "ERASE MY DATA"}>
              {erasing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Erasing…</> : <><Trash2 className="w-4 h-4 mr-1" /> Erase all data</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
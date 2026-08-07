import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Building2, Clock } from "lucide-react";

export default function TestAccountsCard() {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" /> Test Account Credentials
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-card border border-border p-3">
            <p className="text-xs font-semibold text-foreground mb-1">Admin (Full Access)</p>
            <p className="font-mono text-xs text-primary">boitshwarelomotlogelwa41@gmail.com</p>
            <p className="text-xs text-muted-foreground mt-1">Use the password you set during registration.</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3">
            <p className="text-xs font-semibold text-foreground mb-1">Compliance Officer</p>
            <p className="font-mono text-xs text-primary">qa.compliance@ethicaledge.co.bw</p>
            <p className="text-xs text-muted-foreground mt-1">Must accept the invite email first.</p>
          </div>
        </div>
        <div className="rounded-lg bg-card border border-border p-3 flex items-start gap-2">
          <Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Tenant</p>
            <p className="text-xs text-muted-foreground">Ethical Edge GRC Consulting</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">tenant_id: 6a5e0c283b019fab0fc65dd9</p>
          </div>
        </div>
        <div className="rounded-lg bg-card border border-border p-3 flex items-start gap-2">
          <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Timezone</p>
            <p className="text-xs text-muted-foreground">Africa/Johannesburg (SAST, UTC+2)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
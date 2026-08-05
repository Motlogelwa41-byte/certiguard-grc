import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Fingerprint, Shield, ShieldAlert, Search, MapPin, KeyRound, Clock, Flag, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";

export default function ZeroTrustLedger() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFlagged, setFilterFlagged] = useState("all");
  const [filterMfa, setFilterMfa] = useState("all");
  const { toast } = useToast();

  const load = () => base44.entities.AccessAttestation.list("-login_timestamp", 200).then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleAction = async (id, action) => {
    try {
      await base44.entities.AccessAttestation.update(id, { action_taken: action });
      load();
      toast({ title: `Session ${action}` });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const filtered = items.filter((a) => {
    if (search && !a.user_email?.toLowerCase().includes(search.toLowerCase()) && !a.module_accessed?.toLowerCase().includes(search.toLowerCase()) && !a.ip_address?.includes(search)) return false;
    if (filterFlagged === "flagged" && !a.flagged) return false;
    if (filterFlagged === "clean" && a.flagged) return false;
    if (filterMfa === "verified" && !a.mfa_verified) return false;
    if (filterMfa === "unverified" && a.mfa_verified) return false;
    return true;
  });

  const stats = useMemo(() => ({
    total: items.length,
    flagged: items.filter((a) => a.flagged).length,
    noMfa: items.filter((a) => !a.mfa_verified).length,
    uniqueIps: new Set(items.map((a) => a.ip_address).filter(Boolean)).size,
  }), [items]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Zero-Trust Access & Device Attestation Ledger" subtitle="Access telemetry for sensitive GRC modules — IP geofencing, MFA enforcement, and anomaly detection" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4"><Fingerprint className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total Sessions</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><ShieldAlert className="w-5 h-5 text-red-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.flagged}</p><p className="text-xs text-muted-foreground">Flagged Sessions</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><KeyRound className="w-5 h-5 text-amber-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.noMfa}</p><p className="text-xs text-muted-foreground">No MFA</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><MapPin className="w-5 h-5 text-blue-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.uniqueIps}</p><p className="text-xs text-muted-foreground">Unique IPs</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by user, module, or IP..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterFlagged} onValueChange={setFilterFlagged}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Sessions</SelectItem><SelectItem value="flagged">Flagged Only</SelectItem><SelectItem value="clean">Clean Only</SelectItem></SelectContent>
        </Select>
        <Select value={filterMfa} onValueChange={setFilterMfa}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All MFA</SelectItem><SelectItem value="verified">MFA Verified</SelectItem><SelectItem value="unverified">No MFA</SelectItem></SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Shield} title="No access attestations" description="Access telemetry for sensitive GRC modules will appear here as users interact with the system." />
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div key={a.id} className={`bg-card rounded-xl border p-4 ${a.flagged ? "border-red-300 dark:border-red-800" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{a.user_email}</span>
                    {a.mfa_verified ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><KeyRound className="w-3 h-3 mr-0.5" />MFA: {a.mfa_method || "verified"}</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><ShieldAlert className="w-3 h-3 mr-0.5" />No MFA</Badge>
                    )}
                    {a.flagged && <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><Flag className="w-3 h-3 mr-0.5" />Flagged</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span><Shield className="w-3 h-3 inline mr-0.5" />{a.module_accessed}</span>
                    {a.ip_address && <span><MapPin className="w-3 h-3 inline mr-0.5" />{a.ip_address}</span>}
                    {a.geo_location && <span>📍 {a.geo_location}</span>}
                    {a.login_timestamp && <span><Clock className="w-3 h-3 inline mr-0.5" />{new Date(a.login_timestamp).toLocaleString()}</span>}
                    {a.session_duration_min > 0 && <span>{a.session_duration_min}min session</span>}
                  </div>
                  {a.anomaly_flags && a.anomaly_flags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {a.anomaly_flags.map((f, i) => <span key={i} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{f.replace(/_/g, " ")}</span>)}
                    </div>
                  )}
                  {a.risk_score > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${a.risk_score >= 70 ? "bg-red-500" : a.risk_score >= 40 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${a.risk_score}%` }} /></div>
                      <span className="text-xs font-semibold text-muted-foreground">Risk: {a.risk_score}/100</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.flagged && a.action_taken === "none" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleAction(a.id, "investigated")}>Investigate</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAction(a.id, "blocked")}>Block</Button>
                    </>
                  )}
                  {a.action_taken === "investigated" && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Investigated</Badge>}
                  {a.action_taken === "blocked" && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Blocked</Badge>}
                  {a.action_taken === "resolved" && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="w-3 h-3 mr-0.5" />Resolved</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
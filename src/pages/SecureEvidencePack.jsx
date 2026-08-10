import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileArchive, Search, Shield, Lock, Hash, Loader2, FileDown, History } from "lucide-react";
import { generateSecureEvidencePack } from "@/lib/secureEvidencePack";

export default function SecureEvidencePack() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [controls, setControls] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedControlIds, setSelectedControlIds] = useState(new Set());
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState(new Set());
  const [controlSearch, setControlSearch] = useState("");
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [orgName, setOrgName] = useState("");
  const [preparedBy, setPreparedBy] = useState(user?.full_name || user?.email || "");
  const [notes, setNotes] = useState("");
  const [lastPack, setLastPack] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const refreshLedger = () => {
    setLoadingLedger(true);
    base44.entities.AuditEvidenceLedger.list("-timestamp", 10)
      .then((entries) => setLedgerEntries(entries || []))
      .catch(() => setLedgerEntries([]))
      .finally(() => setLoadingLedger(false));
  };

  useEffect(() => {
    Promise.all([
      base44.entities.Control.list().catch(() => []),
      base44.entities.Evidence.list().catch(() => []),
      base44.entities.TrustCenter.list().catch(() => []),
    ]).then(([c, e, t]) => {
      setControls(c || []);
      setEvidence(e || []);
      if (t && t[0]?.company_name) setOrgName(t[0].company_name);
      setLoading(false);
    }).catch(() => setLoading(false));
    refreshLedger();
  }, []);

  const filteredControls = controls.filter((c) => {
    const q = controlSearch.toLowerCase();
    return !q || (c.title || "").toLowerCase().includes(q) || (c.control_id || "").toLowerCase().includes(q);
  });
  const filteredEvidence = evidence.filter((e) => {
    const q = evidenceSearch.toLowerCase();
    return !q || (e.title || "").toLowerCase().includes(q) || (e.control_title || "").toLowerCase().includes(q);
  });

  const toggleControl = (id) => {
    const next = new Set(selectedControlIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedControlIds(next);
  };
  const toggleEvidence = (id) => {
    const next = new Set(selectedEvidenceIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedEvidenceIds(next);
  };
  const selectAllControls = () => {
    if (selectedControlIds.size === filteredControls.length) setSelectedControlIds(new Set());
    else setSelectedControlIds(new Set(filteredControls.map((c) => c.id)));
  };
  const selectAllEvidence = () => {
    if (selectedEvidenceIds.size === filteredEvidence.length) setSelectedEvidenceIds(new Set());
    else setSelectedEvidenceIds(new Set(filteredEvidence.map((e) => e.id)));
  };

  const selectedControls = controls.filter((c) => selectedControlIds.has(c.id));
  const selectedEvidenceItems = evidence.filter((e) => selectedEvidenceIds.has(e.id));
  const totalSelected = selectedControls.length + selectedEvidenceItems.length;

  const handleGenerate = async () => {
    if (totalSelected === 0) {
      toast({ title: "Nothing selected", description: "Select at least one control or evidence item.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const result = await generateSecureEvidencePack({
        selectedControls,
        selectedEvidence: selectedEvidenceItems,
        orgName,
        preparedBy,
        notes,
      });
      setLastPack(result);

      // Upload the PDF to app storage for audit trail
      let pdfUrl = null;
      try {
        const file = new File([result.blob], result.fileName, { type: "application/pdf" });
        const up = await base44.integrations.Core.UploadFile({ file });
        pdfUrl = up?.file_url || null;
      } catch (uploadErr) {
        console.error("Evidence pack upload failed:", uploadErr);
      }

      // Log to the append-only AuditEvidenceLedger for tamper-evident audit trail.
      // Store the SHA-256 of the actual PDF file bytes (not the payload seal hash)
      // so the daily integrity scanner can re-download and verify the file content.
      if (pdfUrl) {
        try {
          const fileBytes = await result.blob.arrayBuffer();
          const fileHashBuf = await crypto.subtle.digest("SHA-256", fileBytes);
          const fileSha256 = Array.from(new Uint8Array(fileHashBuf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          const tenantId = user?.data?.tenant_id;
          if (!tenantId) {
            toast({ title: "Ledger entry skipped", description: "Your account has no tenant context — pack was generated but not logged to the audit ledger.", variant: "warning" });
          } else {
            await base44.entities.AuditEvidenceLedger.create({
              tenant_id: tenantId,
              user_id: user?.id || "",
              user_name: user?.full_name || user?.email || "Unknown",
              timestamp: result.timestamp,
              file_url: pdfUrl,
              file_name: result.fileName,
              sha256_hash: fileSha256,
              notes: `Secure Evidence Pack ${result.packId} (seal ${result.hash.slice(0, 16)}…): ${result.controlCount} controls, ${result.evidenceCount} evidence items. Org: ${orgName || "—"}. Prepared by: ${preparedBy || "—"}.`,
            });
          }
        } catch (ledgerErr) {
          console.error("Ledger logging failed:", ledgerErr);
          toast({ title: "Ledger entry failed", description: ledgerErr?.message || "Could not log to audit ledger", variant: "destructive" });
        }
      }

      // Trigger browser download
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Evidence pack generated", description: `Pack ${result.packId} — ${result.controlCount} controls, ${result.evidenceCount} evidence items.${pdfUrl ? " Logged to audit ledger." : ""}` });
      refreshLedger();
    } catch (err) {
      console.error("Evidence pack generation failed:", err);
      toast({ title: "Generation failed", description: err?.message || "Could not generate the pack.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Secure Auditor Evidence Pack"
        subtitle="Package selected controls and evidence into a timestamped, tamper-evident PDF for external auditor review."
        actions={
          <Button onClick={handleGenerate} disabled={generating || totalSelected === 0}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {generating ? "Generating…" : `Generate Pack (${totalSelected})`}
          </Button>
        }
      />

      {/* Integrity banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
        <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">Tamper-Evident Packaging</p>
          <p className="text-muted-foreground mt-0.5">
            Each pack is sealed with a UTC timestamp and SHA-256 hash computed from the pack ID, timestamp, organization, and all included record IDs.
            Auditors can re-request the pack and compare hashes to verify integrity.
          </p>
        </div>
      </div>

      {lastPack && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
          <Hash className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm flex-1">
            <p className="font-semibold text-foreground">Last pack generated</p>
            <p className="text-muted-foreground mt-0.5">
              Pack ID: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{lastPack.packId}</code>
            </p>
            <p className="text-muted-foreground mt-1 break-all">
              SHA-256: <code className="text-xs">{lastPack.hash}</code>
            </p>
            <p className="text-muted-foreground mt-1">Timestamp: {new Date(lastPack.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Pack metadata */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Pack Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="orgName">Organization name</Label>
            <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Your organization" />
          </div>
          <div>
            <Label htmlFor="preparedBy">Prepared by</Label>
            <Input id="preparedBy" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Your name" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Cover notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scope, audit period, or instructions for the auditor…" rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileArchive className="w-4 h-4" /> Controls ({selectedControlIds.size}/{controls.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={selectAllControls} className="text-xs">
                {selectedControlIds.size === filteredControls.length && filteredControls.length > 0 ? "Clear" : "Select all"}
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={controlSearch} onChange={(e) => setControlSearch(e.target.value)} placeholder="Search controls…" className="pl-9 h-9" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-1">
              {filteredControls.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No controls found.</p>
              ) : (
                filteredControls.map((c) => (
                  <label key={c.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <Checkbox checked={selectedControlIds.has(c.id)} onCheckedChange={() => toggleControl(c.id)} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{c.title}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{c.control_id || "—"}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={c.status === "failing" ? "destructive" : "secondary"} className={`text-[10px] ${c.status === "passing" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : ""}`}>
                          {(c.status || "—").replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{c.owner_name || "Unassigned"}</span>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Evidence selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4" /> Evidence ({selectedEvidenceIds.size}/{evidence.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={selectAllEvidence} className="text-xs">
                {selectedEvidenceIds.size === filteredEvidence.length && filteredEvidence.length > 0 ? "Clear" : "Select all"}
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={evidenceSearch} onChange={(e) => setEvidenceSearch(e.target.value)} placeholder="Search evidence…" className="pl-9 h-9" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-1">
              {filteredEvidence.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No evidence found.</p>
              ) : (
                filteredEvidence.map((e) => (
                  <label key={e.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <Checkbox checked={selectedEvidenceIds.has(e.id)} onCheckedChange={() => toggleEvidence(e.id)} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground block truncate">{e.title}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={e.status === "rejected" ? "destructive" : "secondary"} className={`text-[10px] ${e.status === "approved" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : ""}`}>
                          {(e.status || "—").replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">{e.control_title || e.control_id || "—"}</span>
                      </div>
                      {e.file_name && <span className="text-[10px] text-muted-foreground/70 block mt-0.5 truncate">{e.file_name}</span>}
                    </div>
                  </label>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Evidence Ledger — tamper-evident log of all generated packs */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" /> Audit Evidence Ledger
            {loadingLedger && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Append-only, tamper-evident log of every generated evidence pack. Each entry is timestamped and sealed with a SHA-256 hash.
          </p>
        </CardHeader>
        <CardContent>
          {ledgerEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {loadingLedger ? "Loading ledger entries…" : "No ledger entries yet. Generate a pack above to create the first entry."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Timestamp (UTC)</th>
                    <th className="pb-2 pr-4 font-medium">Pack / File</th>
                    <th className="pb-2 pr-4 font-medium">SHA-256 Hash</th>
                    <th className="pb-2 pr-4 font-medium">User</th>
                    <th className="pb-2 font-medium">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 align-top whitespace-nowrap text-xs font-mono">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <div className="text-xs font-medium text-foreground truncate max-w-[200px]">{entry.file_name || "—"}</div>
                        {entry.notes && <div className="text-[10px] text-muted-foreground truncate max-w-[200px] mt-0.5">{entry.notes}</div>}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <code className="text-[10px] font-mono text-emerald-700 bg-emerald-500/5 px-1.5 py-0.5 rounded break-all">
                          {entry.sha256_hash || "—"}
                        </code>
                      </td>
                      <td className="py-3 pr-4 align-top text-xs whitespace-nowrap">{entry.user_name || "—"}</td>
                      <td className="py-3 align-top">
                        {entry.file_url ? (
                          <a href={entry.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View PDF</a>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
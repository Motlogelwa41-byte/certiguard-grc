import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { UserCog, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { logAuditTrail } from "@/lib/auditLogger";

export default function TransferOwnershipDialog({ open, onOpenChange, control, onTransferred }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      base44.entities.User.list().then(setUsers).catch(() => setUsers([]));
      setSearch("");
      setSelected(null);
      setReason("");
    }
  }, [open]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  const handleTransfer = async () => {
    if (!selected) {
      toast({ title: "Select a user", description: "Choose a new owner to transfer this control.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const updates = {
        owner_name: selected.full_name || selected.email,
        owner_id: selected.id,
      };
      await base44.entities.Control.update(control.id, updates);
      await logAuditTrail({
        action: "transfer_ownership",
        entity_type: "Control",
        entity_id: control.id,
        entity_name: control.title,
        before: { owner_name: control.owner_name, owner_id: control.owner_id },
        after: updates,
        user,
        severity: "info",
        notes: reason || `Ownership transferred from ${control.owner_name || "—"} to ${updates.owner_name}`,
      });
      toast({ title: "Ownership transferred", description: `Control is now owned by ${updates.owner_name}.` });
      onOpenChange(false);
      if (onTransferred) onTransferred();
    } catch (e) {
      toast({ title: "Transfer failed", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" /> Transfer Control Ownership
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm">
            <span className="text-muted-foreground">Control: </span>
            <span className="font-medium text-foreground">{control?.title}</span>
            <div className="text-xs text-muted-foreground mt-1">
              Current owner: {control?.owner_name || "—"}
            </div>
          </div>
          <div>
            <Label>Search new owner</Label>
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
            ) : filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  selected?.id === u.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted border border-transparent"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{u.full_name || u.email}</p>
                  {u.full_name && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                </div>
                {selected?.id === u.id && <ArrowRight className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
          <div>
            <Label>Transfer reason (optional)</Label>
            <Input
              placeholder="e.g. Role change, department reassignment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleTransfer} disabled={saving || !selected}>
            {saving ? "Transferring..." : "Transfer Ownership"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
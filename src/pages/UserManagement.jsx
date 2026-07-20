import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, UserPlus, Shield, Mail, Trash2, Search, Crown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { useTenant } from "@/lib/TenantContext";

const roleColors = {
  admin: "bg-purple-100 text-purple-700",
  compliance_officer: "bg-blue-100 text-blue-700",
  risk_manager: "bg-amber-100 text-amber-700",
  auditor: "bg-emerald-100 text-emerald-700",
  user: "bg-slate-100 text-slate-600",
};

const roleLabels = {
  admin: "Admin",
  compliance_officer: "Compliance Officer",
  risk_manager: "Risk Manager",
  auditor: "Auditor",
  user: "User",
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const { toast } = useToast();
  const { canAddUser, tenant } = useTenant();
  const userLimit = tenant?.limits?.maxUsers ?? tenant?.max_users ?? null;
  const atLimit = !canAddUser(users.length);

  const load = async () => {
    const [allUsers, me] = await Promise.all([
      base44.entities.User.list(),
      base44.auth.me(),
    ]);
    setUsers(allUsers);
    setCurrentUser(me);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    if (!canAddUser(users.length)) {
      toast({ title: "User limit reached", description: "Upgrade your plan to invite more users.", variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      toast({ title: "Invitation sent", description: `${inviteEmail} has been invited as ${roleLabels[inviteRole]}.` });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("user");
      load();
    } catch (e) {
      toast({ title: "Invite failed", description: e.message, variant: "destructive" });
    }
    setInviting(false);
  };

  const handleBulkInvite = async () => {
    const emails = bulkText.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0) return;
    setBulkSending(true);
    let ok = 0, fail = 0;
    for (const email of emails) {
      try { await base44.users.inviteUser(email, "user"); ok++; }
      catch { fail++; }
    }
    setBulkSending(false);
    setBulkOpen(false);
    setBulkText("");
    toast({ title: `Invited ${ok} user${ok !== 1 ? "s" : ""}`, description: fail > 0 ? `${fail} failed (already invited or limit reached)` : "All invitations sent." });
    load();
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await base44.entities.User.update(userId, { role: newRole });
      toast({ title: "Role updated" });
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role || "user"] = (acc[u.role || "user"] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Invite team members, manage roles and access"
        actions={
          <div className="flex items-center gap-3">
            {userLimit && (
              <span className="text-xs text-muted-foreground">{users.length} / {userLimit} users</span>
            )}
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} disabled={atLimit} title={atLimit ? "User limit reached — upgrade to add more" : ""}>
              <Mail className="w-4 h-4 mr-1" /> Bulk Invite
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)} disabled={atLimit} title={atLimit ? "User limit reached — upgrade to add more" : ""}>
              <UserPlus className="w-4 h-4 mr-1" /> Invite User
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
          { label: "Admins", value: roleCounts.admin || 0, icon: Crown, color: "text-purple-500" },
          { label: "Compliance Officers", value: roleCounts.compliance_officer || 0, icon: Shield, color: "text-blue-500" },
          { label: "Risk Managers", value: roleCounts.risk_manager || 0, icon: User, color: "text-amber-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4">
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
            <SelectItem value="risk_manager">Risk Manager</SelectItem>
            <SelectItem value="auditor">Auditor</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User Table */}
      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" description="Invite your first team member to get started." actionLabel="Invite User" onAction={() => setInviteOpen(true)} />
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No users match your filters.</p>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Joined</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isMe = currentUser?.id === u.id;
                  const role = u.role || "user";
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {(u.full_name || u.email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{u.full_name || "—"}</p>
                            {isMe && <span className="text-[10px] text-primary font-semibold">You</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          {u.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${roleColors[role] || roleColors.user}`}>
                          {roleLabels[role] || role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isMe && (
                          <Select value={role} onValueChange={(v) => handleChangeRole(u.id, v)}>
                            <SelectTrigger className="w-[160px] h-8 text-xs ml-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                              <SelectItem value="risk_manager">Risk Manager</SelectItem>
                              <SelectItem value="auditor">Auditor</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Invite Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Bulk Invite Team Members</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Addresses</Label>
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[140px]"
                placeholder={"Paste emails, separated by commas or new lines:\nalice@company.com\nbob@company.com"}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Recipients are invited as basic users. They must accept the invite to receive platform emails.</p>
            </div>
            <Button className="w-full" onClick={handleBulkInvite} disabled={!bulkText.trim() || bulkSending}>
              {bulkSending ? "Sending invitations..." : `Send ${bulkText.split(/[\s,;]+/).filter(Boolean).length} Invitations`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full access</SelectItem>
                  <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                  <SelectItem value="risk_manager">Risk Manager</SelectItem>
                  <SelectItem value="auditor">Auditor — Read-only</SelectItem>
                  <SelectItem value="user">User — Basic access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleInvite} disabled={!inviteEmail || inviting}>
              {inviting ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Wrench, Plus, Loader2, CheckCircle, Clock, AlertTriangle, Filter } from 'lucide-react';

const SOURCE_TYPES = [
  { value: 'gap_analysis', label: 'Gap Analysis' }, { value: 'audit_finding', label: 'Audit Finding' },
  { value: 'control_failure', label: 'Control Failure' }, { value: 'risk_treatment', label: 'Risk Treatment' },
  { value: 'privacy_issue', label: 'Privacy Issue' }, { value: 'regulatory_obligation', label: 'Regulatory Obligation' },
  { value: 'vulnerability', label: 'Vulnerability' }, { value: 'incident_corrective', label: 'Incident Corrective Action' },
  { value: 'vendor_assessment', label: 'Vendor Assessment' }, { value: 'pen_test', label: 'Pen Test Finding' },
  { value: 'policy_exception', label: 'Policy Exception' }, { value: 'kri_breach', label: 'KRI Breach' },
];

export default function RemediationCenter() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({ title: '', description: '', source_type: 'gap_analysis', priority: 'medium', owner_name: '', due_date: '' });

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try {
      const data = await base44.entities.RemediationItem.list('-created_date', 100);
      setItems(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formData.title) return;
    try {
      await base44.entities.RemediationItem.create({
        ...formData,
        remediation_id: `REM-${Date.now().toString().slice(-6)}`,
        status: 'open',
        approval_required: true,
        escalation_level: 0,
      });
      setShowCreate(false);
      setFormData({ title: '', description: '', source_type: 'gap_analysis', priority: 'medium', owner_name: '', due_date: '' });
      await loadItems();
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (item, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'closed') {
      updates.closed_date = new Date().toISOString().split('T')[0];
    }
    await base44.entities.RemediationItem.update(item.id, updates);
    await loadItems();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter);
  const stats = {
    total: items.length,
    open: items.filter((i) => i.status === 'open').length,
    inProgress: items.filter((i) => i.status === 'in_progress').length,
    overdue: items.filter((i) => i.status === 'overdue' || (i.due_date && i.due_date < new Date().toISOString().split('T')[0] && i.status !== 'closed')).length,
    closed: items.filter((i) => i.status === 'closed').length,
  };
  const completionRate = stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Remediation Center"
        subtitle="Unified remediation management — every gap, finding, failure, and corrective action tracked in one place"
        actions={<Button onClick={() => setShowCreate(!showCreate)}><Plus className="w-4 h-4 mr-2" />New Item</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Wrench className="w-8 h-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion</p>
                <p className="text-2xl font-bold text-emerald-600">{completionRate}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500/30" />
            </div>
            <Progress value={completionRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>New Remediation Item</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Remediate MFA gap on admin accounts" />
              </div>
              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select value={formData.source_type} onValueChange={(v) => setFormData({ ...formData, source_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Owner</Label>
                <Input value={formData.owner_name} onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })} placeholder="Owner name" />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Create Item</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Wrench} title="No remediation items" description="Create remediation items for gaps, findings, failures, and corrective actions." />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isOverdue = item.due_date && item.due_date < new Date().toISOString().split('T')[0] && item.status !== 'closed';
            return (
              <Card key={item.id} className={isOverdue ? 'border-red-300' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{item.title}</h3>
                        <Badge variant="outline" className="text-xs">{item.remediation_id}</Badge>
                        {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                      </div>
                      {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-xs capitalize">{item.source_type?.replace(/_/g, ' ')}</Badge>
                        <Badge variant={item.priority === 'critical' ? 'destructive' : item.priority === 'high' ? 'default' : 'secondary'} className="text-xs capitalize">{item.priority}</Badge>
                        {item.owner_name && <span className="text-xs text-muted-foreground">Owner: {item.owner_name}</span>}
                        {item.due_date && <span className="text-xs text-muted-foreground">Due: {item.due_date}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={item.status} />
                      {item.status === 'open' && <Button size="sm" variant="outline" onClick={() => updateStatus(item, 'in_progress')}>Start</Button>}
                      {item.status === 'in_progress' && <Button size="sm" variant="outline" onClick={() => updateStatus(item, 'in_review')}>Submit for Review</Button>}
                      {item.status === 'in_review' && <Button size="sm" onClick={() => updateStatus(item, 'closed')}>Close</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Workflow, Plus, Play, Pause, Loader2, GitBranch, Clock, ArrowRight } from 'lucide-react';

const ENTITY_TYPES = [
  { value: 'risk', label: 'Risk' }, { value: 'control', label: 'Control' }, { value: 'policy', label: 'Policy' },
  { value: 'evidence', label: 'Evidence' }, { value: 'assessment', label: 'Assessment' }, { value: 'audit_finding', label: 'Audit Finding' },
  { value: 'incident', label: 'Incident' }, { value: 'vendor_assessment', label: 'Vendor Assessment' },
  { value: 'privacy_request', label: 'Privacy Request' }, { value: 'remediation', label: 'Remediation' },
  { value: 'control_test', label: 'Control Test' }, { value: 'regulatory_change', label: 'Regulatory Change' },
];

const TRIGGER_TYPES = [
  { value: 'on_create', label: 'On Create' }, { value: 'on_status_change', label: 'On Status Change' },
  { value: 'on_field_change', label: 'On Field Change' }, { value: 'on_schedule', label: 'On Schedule' },
  { value: 'on_threshold_breach', label: 'On Threshold Breach' }, { value: 'manual', label: 'Manual' },
];

export default function GrcWorkflowEngine() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', entity_type: 'risk', trigger_type: 'on_create', default_assignee_role: 'risk_manager', sla_hours: 48, escalation_after_hours: 24, escalation_to_role: 'compliance_officer' });

  useEffect(() => { loadWorkflows(); }, []);

  const loadWorkflows = async () => {
    try {
      const data = await base44.entities.GrcWorkflow.list('-created_date', 50);
      setWorkflows(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formData.name) return;
    try {
      await base44.entities.GrcWorkflow.create({
        ...formData,
        workflow_id: `WF-${Date.now().toString().slice(-6)}`,
        approval_required: true,
        approval_levels: 1,
        auto_assign_on_trigger: true,
        status: 'draft',
        version: '1.0',
        steps: JSON.stringify([
          { step: 1, name: 'Assignment', type: 'assignment', assignee_role: formData.default_assignee_role, sla_hours: formData.sla_hours },
          { step: 2, name: 'Review', type: 'approval', approver_role: formData.escalation_to_role, sla_hours: formData.sla_hours },
          { step: 3, name: 'Escalation', type: 'escalation', escalation_after_hours: formData.escalation_after_hours, escalation_to_role: formData.escalation_to_role },
        ]),
      });
      setShowCreate(false);
      setFormData({ name: '', description: '', entity_type: 'risk', trigger_type: 'on_create', default_assignee_role: 'risk_manager', sla_hours: 48, escalation_after_hours: 24, escalation_to_role: 'compliance_officer' });
      await loadWorkflows();
    } catch (e) { console.error(e); }
  };

  const toggleStatus = async (wf) => {
    const newStatus = wf.status === 'active' ? 'paused' : 'active';
    await base44.entities.GrcWorkflow.update(wf.id, { status: newStatus });
    await loadWorkflows();
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="GRC Workflow Engine" subtitle="Configurable workflow automation for risk approvals, control reviews, evidence reviews, policy approvals, and more" actions={<Button onClick={() => setShowCreate(!showCreate)}><Plus className="w-4 h-4 mr-2" />New Workflow</Button>} />

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Create Workflow</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Workflow Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Risk Approval Workflow" /></div>
              <div className="space-y-2"><Label>Entity Type</Label><Select value={formData.entity_type} onValueChange={(v) => setFormData({ ...formData, entity_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ENTITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Trigger</Label><Select value={formData.trigger_type} onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TRIGGER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Default Assignee Role</Label><Select value={formData.default_assignee_role} onValueChange={(v) => setFormData({ ...formData, default_assignee_role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="risk_manager">Risk Manager</SelectItem><SelectItem value="compliance_officer">Compliance Officer</SelectItem><SelectItem value="privacy_officer">Privacy Officer</SelectItem><SelectItem value="auditor">Auditor</SelectItem><SelectItem value="department_head">Department Head</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>SLA (hours)</Label><Input type="number" value={formData.sla_hours} onChange={(e) => setFormData({ ...formData, sla_hours: parseInt(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Escalation After (hours)</Label><Input type="number" value={formData.escalation_after_hours} onChange={(e) => setFormData({ ...formData, escalation_after_hours: parseInt(e.target.value) })} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} /></div>
            <div className="flex gap-2"><Button onClick={handleCreate}>Create Workflow</Button><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button></div>
          </CardContent>
        </Card>
      )}

      {workflows.length === 0 ? (
        <EmptyState icon={Workflow} title="No workflows configured" description="Create configurable workflows for risk approvals, control reviews, evidence reviews, policy approvals, assessments, and remediation." actionLabel="Create Workflow" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <Card key={wf.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1"><h3 className="font-semibold text-foreground">{wf.name}</h3><p className="text-xs text-muted-foreground mt-0.5">{wf.workflow_id}</p></div>
                  <StatusBadge status={wf.status} />
                </div>
                {wf.description && <p className="text-sm text-muted-foreground line-clamp-2">{wf.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs capitalize">{wf.entity_type?.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{wf.trigger_type?.replace(/_/g, ' ')}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{wf.approval_levels || 1} level{(wf.approval_levels || 1) > 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{wf.sla_hours || 0}h SLA</span>
                  <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" />{wf.execution_count || 0} runs</span>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => toggleStatus(wf)}>
                  {wf.status === 'active' ? <><Pause className="w-3 h-3 mr-1" />Pause</> : <><Play className="w-3 h-3 mr-1" />Activate</>}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
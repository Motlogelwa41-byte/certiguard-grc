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
import { Bell, Plus, Loader2, AlertTriangle, CheckCircle, Zap, Clock } from 'lucide-react';

const ALERT_TYPES = [
  { value: 'overdue_risk', label: 'Overdue Risk' }, { value: 'expired_evidence', label: 'Expired Evidence' },
  { value: 'failed_control', label: 'Failed Control' }, { value: 'policy_review_due', label: 'Policy Review Due' },
  { value: 'audit_finding_overdue', label: 'Audit Finding Overdue' }, { value: 'regulatory_deadline', label: 'Regulatory Deadline' },
  { value: 'privacy_obligation', label: 'Privacy Obligation' }, { value: 'vendor_reassessment', label: 'Vendor Reassessment' },
  { value: 'incident_open', label: 'Open Incident' }, { value: 'risk_appetite_breach', label: 'Risk Appetite Breach' },
  { value: 'kri_threshold_breach', label: 'KRI Threshold Breach' }, { value: 'compliance_deterioration', label: 'Compliance Deterioration' },
  { value: 'contract_expiring', label: 'Contract Expiring' }, { value: 'training_overdue', label: 'Training Overdue' },
  { value: 'certification_expiring', label: 'Certification Expiring' },
];

export default function GrcAlertCenter() {
  const [rules, setRules] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', alert_type: 'overdue_risk', entity_type: 'Risk', severity: 'high', escalation_after_hours: 24, escalation_to_role: 'compliance_officer' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [ruleData, alertData] = await Promise.all([
        base44.entities.GrcAlertRule.list('-created_date', 50),
        base44.entities.AnomalyAlert.filter({ status: 'open' }, '-created_date', 50),
      ]);
      setRules(ruleData || []);
      setAlerts(alertData || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formData.name) return;
    try {
      await base44.entities.GrcAlertRule.create({
        ...formData,
        rule_id: `AR-${Date.now().toString().slice(-6)}`,
        notification_channels: ['in_app'],
        dedup_window_hours: 24,
        auto_acknowledge_on_action: true,
        status: 'active',
        fire_count: 0,
        recipient_roles: [formData.escalation_to_role],
      });
      setShowCreate(false);
      setFormData({ name: '', description: '', alert_type: 'overdue_risk', entity_type: 'Risk', severity: 'high', escalation_after_hours: 24, escalation_to_role: 'compliance_officer' });
      await loadData();
    } catch (e) { console.error(e); }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      await base44.functions.invoke('generateGrcAlerts', { body: {} });
      await loadData();
    } catch (e) { console.error(e); } finally { setScanning(false); }
  };

  const acknowledge = async (alert) => {
    await base44.entities.AnomalyAlert.update(alert.id, { status: 'acknowledged', acknowledged_by_name: 'Current User', acknowledged_at: new Date().toISOString() });
    await loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  const stats = {
    total: alerts.length,
    critical: alerts.filter((a) => a.severity === 'critical').length,
    high: alerts.filter((a) => a.severity === 'high').length,
    medium: alerts.filter((a) => a.severity === 'medium').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="GRC Alert Center" subtitle="Centralized alert engine — configurable rules for overdue risks, expired evidence, failed controls, compliance deterioration, and more" actions={<div className="flex gap-2"><Button variant="outline" onClick={runScan} disabled={scanning}>{scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}Run Scan</Button><Button onClick={() => setShowCreate(!showCreate)}><Plus className="w-4 h-4 mr-2" />New Rule</Button></div>} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Open Alerts</p><p className="text-2xl font-bold">{stats.total}</p></div><Bell className="w-8 h-8 text-primary/30" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Critical</p><p className="text-2xl font-bold text-red-600">{stats.critical}</p></div><AlertTriangle className="w-8 h-8 text-red-500/30" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">High</p><p className="text-2xl font-bold text-amber-600">{stats.high}</p></div><AlertTriangle className="w-8 h-8 text-amber-500/30" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Rules</p><p className="text-2xl font-bold">{rules.filter((r) => r.status === 'active').length}</p></div><CheckCircle className="w-8 h-8 text-emerald-500/30" /></div></CardContent></Card>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Create Alert Rule</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Rule Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Overdue Risk Alert" /></div>
              <div className="space-y-2"><Label>Alert Type</Label><Select value={formData.alert_type} onValueChange={(v) => setFormData({ ...formData, alert_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ALERT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Entity Type</Label><Input value={formData.entity_type} onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })} placeholder="e.g., Risk, Evidence, Control" /></div>
              <div className="space-y-2"><Label>Severity</Label><Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Escalation After (hours)</Label><Input type="number" value={formData.escalation_after_hours} onChange={(e) => setFormData({ ...formData, escalation_after_hours: parseInt(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Escalation To Role</Label><Select value={formData.escalation_to_role} onValueChange={(v) => setFormData({ ...formData, escalation_to_role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compliance_officer">Compliance Officer</SelectItem><SelectItem value="risk_manager">Risk Manager</SelectItem><SelectItem value="privacy_officer">Privacy Officer</SelectItem><SelectItem value="executive">Executive</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} /></div>
            <div className="flex gap-2"><Button onClick={handleCreate}>Create Rule</Button><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button></div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Active Alerts</h2>
          {alerts.length === 0 ? <EmptyState icon={Bell} title="No open alerts" description="All clear — no active alerts at this time." /> : (
            <div className="space-y-3">
              {alerts.map((a) => (
                <Card key={a.id}><CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{a.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={a.severity === 'critical' ? 'destructive' : a.severity === 'high' ? 'default' : 'secondary'} className="text-xs capitalize">{a.severity}</Badge>
                        {a.entity_name && <Badge variant="outline" className="text-xs">{a.entity_name}</Badge>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => acknowledge(a)}>Acknowledge</Button>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Alert Rules</h2>
          {rules.length === 0 ? <EmptyState icon={Clock} title="No rules configured" description="Create alert rules to automatically detect GRC issues." /> : (
            <div className="space-y-3">
              {rules.map((r) => (
                <Card key={r.id}><CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1"><h3 className="font-medium text-sm">{r.name}</h3><p className="text-xs text-muted-foreground mt-1">{r.description}</p></div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs capitalize">{r.alert_type?.replace(/_/g, ' ')}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{r.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{r.fire_count || 0} fires</span>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
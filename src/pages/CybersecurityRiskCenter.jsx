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
import { Shield, Plus, Loader2, Server, Bug, AlertTriangle, TrendingDown } from 'lucide-react';

const RISK_DOMAINS = [
  { value: 'identity_access', label: 'Identity & Access' }, { value: 'network_security', label: 'Network Security' },
  { value: 'endpoint_security', label: 'Endpoint Security' }, { value: 'cloud_security', label: 'Cloud Security' },
  { value: 'data_protection', label: 'Data Protection' }, { value: 'application_security', label: 'Application Security' },
  { value: 'infrastructure', label: 'Infrastructure' }, { value: 'supply_chain', label: 'Supply Chain' },
  { value: 'human_factor', label: 'Human Factor' }, { value: 'governance', label: 'Governance' },
  { value: 'third_party', label: 'Third Party' },
];

const THREAT_TYPES = [
  { value: 'malware', label: 'Malware' }, { value: 'ransomware', label: 'Ransomware' },
  { value: 'phishing', label: 'Phishing' }, { value: 'unauthorized_access', label: 'Unauthorized Access' },
  { value: 'data_exfiltration', label: 'Data Exfiltration' }, { value: 'ddos', label: 'DDoS' },
  { value: 'insider_threat', label: 'Insider Threat' }, { value: 'supply_chain', label: 'Supply Chain' },
  { value: 'zero_day', label: 'Zero Day' }, { value: 'misconfiguration', label: 'Misconfiguration' },
  { value: 'credential_theft', label: 'Credential Theft' }, { value: 'social_engineering', label: 'Social Engineering' },
];

export default function CybersecurityRiskCenter() {
  const [risks, setRisks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', risk_domain: 'network_security', threat_type: 'malware', likelihood: 3, impact: 3, owner_name: '', treatment_strategy: 'mitigate' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [riskData, assetData] = await Promise.all([
        base44.entities.CybersecurityRisk.list('-created_date', 50),
        base44.entities.ITAsset.list('-created_date', 50),
      ]);
      setRisks(riskData || []);
      setAssets(assetData || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formData.title) return;
    try {
      const riskScore = formData.likelihood * formData.impact;
      await base44.entities.CybersecurityRisk.create({
        ...formData,
        csr_id: `CSR-${Date.now().toString().slice(-6)}`,
        risk_score: riskScore,
        inherent_risk_score: riskScore,
        status: 'identified',
        identified_date: new Date().toISOString().split('T')[0],
      });
      setShowCreate(false);
      setFormData({ title: '', description: '', risk_domain: 'network_security', threat_type: 'malware', likelihood: 3, impact: 3, owner_name: '', treatment_strategy: 'mitigate' });
      await loadData();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  const stats = {
    total: risks.length,
    critical: risks.filter((r) => r.risk_score >= 16).length,
    high: risks.filter((r) => r.risk_score >= 9 && r.risk_score < 16).length,
    open: risks.filter((r) => ['identified', 'assessing', 'treating'].includes(r.status)).length,
    resolved: risks.filter((r) => r.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Cybersecurity Risk Center" subtitle="Integrated cybersecurity risk management — linked to the unified control library, assets, vulnerabilities, and incidents" actions={<Button onClick={() => setShowCreate(!showCreate)}><Plus className="w-4 h-4 mr-2" />New Risk</Button>} />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Risks</p><p className="text-2xl font-bold">{stats.total}</p></div><Shield className="w-8 h-8 text-primary/30" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Critical</p><p className="text-2xl font-bold text-red-600">{stats.critical}</p></div><AlertTriangle className="w-8 h-8 text-red-500/30" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">High</p><p className="text-2xl font-bold text-amber-600">{stats.high}</p></div><TrendingDown className="w-8 h-8 text-amber-500/30" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Open</p><p className="text-2xl font-bold text-blue-600">{stats.open}</p></div><Bug className="w-8 h-8 text-blue-500/30" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Resolved</p><p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p></div><Server className="w-8 h-8 text-emerald-500/30" /></div></CardContent></Card>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>New Cybersecurity Risk</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Title</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Unpatched VPN gateway vulnerability" /></div>
              <div className="space-y-2"><Label>Risk Domain</Label><Select value={formData.risk_domain} onValueChange={(v) => setFormData({ ...formData, risk_domain: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RISK_DOMAINS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Threat Type</Label><Select value={formData.threat_type} onValueChange={(v) => setFormData({ ...formData, threat_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{THREAT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Treatment Strategy</Label><Select value={formData.treatment_strategy} onValueChange={(v) => setFormData({ ...formData, treatment_strategy: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mitigate">Mitigate</SelectItem><SelectItem value="accept">Accept</SelectItem><SelectItem value="transfer">Transfer</SelectItem><SelectItem value="avoid">Avoid</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Likelihood (1-5)</Label><Input type="number" min="1" max="5" value={formData.likelihood} onChange={(e) => setFormData({ ...formData, likelihood: parseInt(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Impact (1-5)</Label><Input type="number" min="1" max="5" value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Owner</Label><Input value={formData.owner_name} onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
            <div className="flex gap-2"><Button onClick={handleCreate}>Create Risk</Button><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button></div>
          </CardContent>
        </Card>
      )}

      {risks.length === 0 ? (
        <EmptyState icon={Shield} title="No cybersecurity risks" description="Identify and track cybersecurity risks linked to your assets, vulnerabilities, and security controls." actionLabel="Create Risk" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {risks.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1"><h3 className="font-semibold text-foreground line-clamp-2">{r.title}</h3><p className="text-xs text-muted-foreground mt-0.5">{r.csr_id}</p></div>
                  <StatusBadge status={r.status} />
                </div>
                {r.description && <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs capitalize">{r.risk_domain?.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{r.threat_type?.replace(/_/g, ' ')}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div className="text-center p-2 rounded-md bg-muted/50"><p className="text-xs text-muted-foreground">Score</p><p className="text-sm font-bold">{r.risk_score || 0}</p></div>
                  <div className="text-center p-2 rounded-md bg-muted/50"><p className="text-xs text-muted-foreground">L × I</p><p className="text-sm font-bold">{r.likelihood || 0} × {r.impact || 0}</p></div>
                  <div className="text-center p-2 rounded-md bg-muted/50"><p className="text-xs text-muted-foreground">Controls</p><p className="text-sm font-bold">{r.linked_control_ids?.length || 0}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
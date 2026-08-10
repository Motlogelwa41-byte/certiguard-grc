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
import { ClipboardList, Plus, Play, FileText, TrendingUp, Shield, Loader2, BarChart3 } from 'lucide-react';

export default function AssessmentEngine() {
  const [assessments, setAssessments] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assessment_type: 'framework',
    source_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assessData, fwData] = await Promise.all([
        base44.entities.Assessment.list('-created_date', 50),
        base44.entities.RegulatoryFramework.list('-created_date', 50),
      ]);
      setAssessments(assessData || []);
      setFrameworks(fwData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.title) return;
    setGenerating(true);
    try {
      await base44.functions.invoke('generateAssessment', {
        body: {
          title: formData.title,
          description: formData.description,
          assessment_type: formData.assessment_type,
          source_id: formData.source_id,
          source_type: formData.assessment_type === 'framework' ? 'RegulatoryFramework' : '',
        },
      });
      setShowCreate(false);
      setFormData({ title: '', description: '', assessment_type: 'framework', source_id: '' });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const getPostureColor = (state) => {
    const map = {
      compliant: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
      partially_compliant: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
      non_compliant: 'bg-red-500/15 text-red-700 border-red-500/30',
      unknown: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
      not_applicable: 'bg-slate-400/15 text-slate-500 border-slate-400/30',
    };
    return map[state] || map.unknown;
  };

  const stats = {
    total: assessments.length,
    inProgress: assessments.filter((a) => a.status === 'in_progress').length,
    completed: assessments.filter((a) => a.status === 'completed').length,
    avgCompliance: assessments.length > 0
      ? Math.round(assessments.filter((a) => a.compliance_score > 0).reduce((s, a) => s + a.compliance_score, 0) / Math.max(assessments.filter((a) => a.compliance_score > 0).length, 1))
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="GRC Assessment Engine"
        subtitle="Generate and manage assessments from any framework, regulation, control library, organization, or vendor"
        actions={
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4 mr-2" />
            New Assessment
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assessments</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <ClipboardList className="w-8 h-8 text-primary/30" />
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
              <Play className="w-8 h-8 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
              </div>
              <Shield className="w-8 h-8 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Compliance</p>
                <p className="text-2xl font-bold">{stats.avgCompliance}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Generate New Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assessment Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Q3 2026 SOC 2 Compliance Assessment"
                />
              </div>
              <div className="space-y-2">
                <Label>Assessment Type</Label>
                <Select
                  value={formData.assessment_type}
                  onValueChange={(v) => setFormData({ ...formData, assessment_type: v, source_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="framework">Framework Assessment</SelectItem>
                    <SelectItem value="control_library">Control Library Assessment</SelectItem>
                    <SelectItem value="vendor">Vendor Assessment</SelectItem>
                    <SelectItem value="organization">Organization Assessment</SelectItem>
                    <SelectItem value="department">Department Assessment</SelectItem>
                    <SelectItem value="business_unit">Business Unit Assessment</SelectItem>
                    <SelectItem value="site">Site Assessment</SelectItem>
                    <SelectItem value="maturity">Maturity Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.assessment_type === 'framework' && (
              <div className="space-y-2">
                <Label>Source Framework</Label>
                <Select
                  value={formData.source_id}
                  onValueChange={(v) => setFormData({ ...formData, source_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a framework..." />
                  </SelectTrigger>
                  <SelectContent>
                    {frameworks.map((fw) => (
                      <SelectItem key={fw.id} value={fw.id}>
                        {fw.name} {fw.version ? `(${fw.version})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose and scope of this assessment..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={generating || !formData.title}>
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Generate Assessment
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessments List */}
      {assessments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assessments yet"
          description="Generate your first assessment from a framework, control library, or vendor to get started."
          actionLabel="Create Assessment"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground line-clamp-2">{a.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{a.assessment_id || a.id.slice(-8)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>

                {a.source_name && (
                  <Badge variant="outline" className="text-xs">
                    <FileText className="w-3 h-3 mr-1" />
                    {a.source_name}
                  </Badge>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {a.assessment_type?.replace(/_/g, ' ')}
                  </Badge>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${getPostureColor(a.posture_state)}`}>
                    {a.posture_state?.replace(/_/g, ' ') || 'unknown'}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{a.answered_questions || 0} / {a.total_questions || 0}</span>
                  </div>
                  <Progress value={a.total_questions ? ((a.answered_questions || 0) / a.total_questions) * 100 : 0} className="h-1.5" />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Compliance</p>
                    <p className="text-sm font-bold">{a.compliance_score || 0}%</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Maturity</p>
                    <p className="text-sm font-bold">{(a.maturity_score || 0).toFixed(1)}/5</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Effectiveness</p>
                    <p className="text-sm font-bold">{a.control_effectiveness_score || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, ClipboardList, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MaturityLearn from "@/components/maturity/MaturityLearn";
import MaturityAssessmentForm from "@/components/maturity/MaturityAssessmentForm";
import AssessmentList from "@/components/maturity/AssessmentList";
import AssessmentDetail from "@/components/maturity/AssessmentDetail";

export default function GrcEducation() {
  const { toast } = useToast();
  const [tab, setTab] = useState("learn");
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [userName, setUserName] = useState("");

  const parseArr = (s) => {
    try {
      return JSON.parse(s || "[]");
    } catch {
      return [];
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.MaturityAssessment.list("-created_date", 50);
      setAssessments(list);
    } catch {
      toast({ title: "Failed to load assessments", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    base44.auth
      .me()
      .then((u) => setUserName(u?.full_name || ""))
      .catch(() => {});
  }, [load]);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const record = await base44.entities.MaturityAssessment.create({
        ...data,
        created_by_name: userName,
      });
      toast({
        title: "Assessment saved",
        description: `Overall maturity: Level ${data.overall_level}`,
      });
      setShowForm(false);
      await load();
      setSelected(record);
      setTab("assessment");
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateRoadmap = async (assessment, newRoadmap) => {
    try {
      const updated = await base44.entities.MaturityAssessment.update(assessment.id, {
        roadmap: JSON.stringify(newRoadmap),
      });
      setSelected({ ...assessment, ...updated });
      setAssessments((prev) =>
        prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
      );
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="GRC Education & Maturity Model"
        subtitle="Learn GRC fundamentals and assess your organization's GRC maturity with a generated improvement roadmap."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="learn">
            <GraduationCap className="w-4 h-4 mr-2" /> Learn
          </TabsTrigger>
          <TabsTrigger value="assessment">
            <ClipboardList className="w-4 h-4 mr-2" /> Assessments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="learn" className="mt-4">
          <MaturityLearn />
        </TabsContent>

        <TabsContent value="assessment" className="mt-4 space-y-4">
          {selected ? (
            <AssessmentDetail
              assessment={selected}
              onBack={() => setSelected(null)}
              onRoadmapChange={updateRoadmap}
              parseArr={parseArr}
            />
          ) : (
            <>
              <div className="flex justify-end">
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" /> New Assessment
                </Button>
              </div>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                </div>
              ) : assessments.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No assessments yet"
                  description="Run your first GRC maturity assessment to baseline your posture and generate an improvement roadmap."
                  actionLabel="New Assessment"
                  onAction={() => setShowForm(true)}
                />
              ) : (
                <AssessmentList
                  assessments={assessments}
                  onSelect={(a) => setSelected(a)}
                  parseArr={parseArr}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New GRC Maturity Assessment</DialogTitle>
          </DialogHeader>
          <MaturityAssessmentForm
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
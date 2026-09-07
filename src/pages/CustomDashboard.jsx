import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { Link } from "react-router-dom";
import {
  Shield, AlertTriangle, TrendingUp, Building, Bell, CheckCircle2,
  FileCheck, Activity, Plus, X, GripVertical, Save, RotateCcw, Loader2, ChevronRight
} from "lucide-react";
import {
  ComplianceScoreWidget, OverdueTasksWidget, OpenRisksWidget, VendorRiskWidget,
  RegulatoryAlertsWidget, ControlStatusWidget, EvidenceStatusWidget, RecentActivityWidget
} from "@/components/dashboard/CustomWidgets";

const WIDGET_CATALOG = [
  { id: "compliance_score", title: "Compliance Score", icon: Shield, component: ComplianceScoreWidget, size: "large", to: "/controls" },
  { id: "overdue_tasks", title: "Overdue Tasks", icon: AlertTriangle, component: OverdueTasksWidget, size: "small", to: "/tasks" },
  { id: "open_risks", title: "Open Risks", icon: TrendingUp, component: OpenRisksWidget, size: "small", to: "/risks" },
  { id: "vendor_risk", title: "Vendor Risk", icon: Building, component: VendorRiskWidget, size: "small", to: "/vendors" },
  { id: "regulatory_alerts", title: "Regulatory Alerts", icon: Bell, component: RegulatoryAlertsWidget, size: "small", to: "/regulatory-changes" },
  { id: "control_status", title: "Control Status", icon: CheckCircle2, component: ControlStatusWidget, size: "large", to: "/controls" },
  { id: "evidence_status", title: "Evidence Status", icon: FileCheck, component: EvidenceStatusWidget, size: "small", to: "/evidence" },
  { id: "recent_activity", title: "Recent Activity", icon: Activity, component: RecentActivityWidget, size: "large", to: "/audit-trail" },
];

const DEFAULT_LAYOUT = ["compliance_score", "overdue_tasks", "open_risks", "control_status"];

export default function CustomDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = user?.data?.custom_dashboard_layout;
    if (saved && Array.isArray(saved) && saved.length > 0) {
      setLayout(saved);
    }
    setLoading(false);
  }, [user]);

  const saveLayout = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        data: { ...(user?.data || {}), custom_dashboard_layout: layout },
      });
      toast({ title: "Dashboard layout saved", description: "Your custom widget arrangement will persist across sessions." });
    } catch (e) {
      toast({ title: "Failed to save layout", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    toast({ title: "Layout reset to default" });
  };

  const addWidget = (widgetId) => {
    if (!layout.includes(widgetId)) {
      setLayout([...layout, widgetId]);
    }
  };

  const removeWidget = (widgetId) => {
    setLayout(layout.filter((id) => id !== widgetId));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const newLayout = Array.from(layout);
    const [moved] = newLayout.splice(result.source.index, 1);
    newLayout.splice(result.destination.index, 0, moved);
    setLayout(newLayout);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const availableWidgets = WIDGET_CATALOG.filter((w) => !layout.includes(w.id));

  return (
    <div>
      <PageHeader
        title="My Dashboard"
        subtitle="Drag and drop to customize your compliance view — your layout saves to your profile"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetLayout}>
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </Button>
            <Button size="sm" onClick={saveLayout} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save Layout
            </Button>
          </div>
        }
      />

      {/* Widget catalog */}
      {availableWidgets.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-heading font-semibold text-foreground">Add Widgets</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableWidgets.map((w) => {
              const Icon = w.icon;
              return (
                <button
                  key={w.id}
                  onClick={() => addWidget(w.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors text-sm"
                >
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{w.title}</span>
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Draggable widget grid */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="dashboard-widgets">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {layout.map((widgetId, index) => {
                const widget = WIDGET_CATALOG.find((w) => w.id === widgetId);
                if (!widget) return null;
                const WidgetComponent = widget.component;
                const Icon = widget.icon;
                const isLarge = widget.size === "large";

                return (
                  <Draggable key={widgetId} draggableId={widgetId} index={index}>
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={isLarge ? "md:col-span-2 lg:col-span-2" : ""}
                      >
                        <Card className="group relative h-full">
                          <div className="flex items-center justify-between p-3 pb-0">
                            <div className="flex items-center gap-2">
                              <span {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                                <GripVertical className="w-4 h-4" />
                              </span>
                              <Icon className="w-4 h-4 text-primary" />
                              <h3 className="text-sm font-heading font-semibold text-foreground">{widget.title}</h3>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Link
                                to={widget.to}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                title="View all"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                onClick={() => removeWidget(widgetId)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <CardContent className="pt-2">
                            <WidgetComponent />
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {layout.length === 0 && (
        <div className="text-center py-16">
          <Plus className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Add widgets above to build your custom dashboard.</p>
        </div>
      )}
    </div>
  );
}
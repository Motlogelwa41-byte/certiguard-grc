import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, ArrowRight, Loader2, Wand2, CheckCircle2 } from "lucide-react";

const FRAMEWORK_COLORS = {
  "SOC 2": "bg-blue-100 text-blue-700",
  "ISO 27001": "bg-emerald-100 text-emerald-700",
  "NIST CSF": "bg-purple-100 text-purple-700",
  "HIPAA": "bg-red-100 text-red-700",
  "PCI-DSS": "bg-amber-100 text-amber-700",
  "GDPR": "bg-indigo-100 text-indigo-700",
  "POPIA": "bg-teal-100 text-teal-700",
};

export default function AiCrossMapping() {
  const [controls, setControls] = useState([]);
  const [selectedControl, setSelectedControl] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  const loadControls = useCallback(async () => {
    try {
      const data = await base44.entities.Control.list("-updated_date", 100);
      setControls(data || []);
    } catch (e) {
      toast({ title: "Failed to load controls", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadControls(); }, [loadControls]);

  const runMapping = async () => {
    if (!selectedControl) return;
    setAnalyzing(true);
    setMappings([]);
    try {
      const res = await base44.functions.invoke("aiCrossMapFrameworks", {
        control_title: selectedControl.title,
        control_description: selectedControl.description || "",
        control_category: selectedControl.category || "",
      });
      const data = res?.data || res;
      if (data.mappings) {
        setMappings(data.mappings);
        toast({ title: `Found ${data.mappings.length} cross-framework mappings` });
      } else {
        toast({ title: "Mapping failed", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "AI mapping failed", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const groupedByFramework = mappings.reduce((acc, m) => {
    if (!acc[m.framework]) acc[m.framework] = [];
    acc[m.framework].push(m);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="AI Cross-Framework Mapping"
        subtitle="Automatically map a single control implementation to SOC 2, ISO 27001, NIST CSF, HIPAA, PCI-DSS, GDPR & POPIA requirements"
      />

      {/* Control selector */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5" /> Select a Control to Map</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Control</label>
              <Select onValueChange={(id) => {
                const c = controls.find(c => c.id === id);
                setSelectedControl(c);
                setMappings([]);
              }}>
                <SelectTrigger><SelectValue placeholder="Choose a control..." /></SelectTrigger>
                <SelectContent>
                  {controls.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runMapping} disabled={!selectedControl || analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {analyzing ? "Analyzing..." : "Map to Frameworks"}
            </Button>
          </div>
          {selectedControl && (
            <div className="mt-4 p-3 rounded-lg border bg-muted/30">
              <div className="text-sm font-medium">{selectedControl.title}</div>
              {selectedControl.description && <div className="text-xs text-muted-foreground mt-1">{selectedControl.description}</div>}
              {selectedControl.category && <Badge variant="outline" className="mt-2 text-xs">{selectedControl.category}</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {analyzing && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground">AI is analyzing the control against 7 frameworks...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {mappings.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium">{mappings.length} framework mappings identified across {Object.keys(groupedByFramework).length} frameworks</span>
          </div>

          {Object.entries(groupedByFramework).map(([framework, items]) => (
            <Card key={framework}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge className={FRAMEWORK_COLORS[framework] || "bg-slate-100 text-slate-700"}>{framework}</Badge>
                  <span className="text-sm text-muted-foreground">{items.length} requirement(s) matched</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {items.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-md border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">{m.requirement_ref}</Badge>
                          <span className="text-sm font-medium">{m.requirement_title}</span>
                        </div>
                        {m.notes && <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${m.coverage_pct}%` }} />
                        </div>
                        <span className="text-xs font-mono w-10 text-right">{m.coverage_pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {!loading && controls.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No controls found. Create controls first to use cross-framework mapping.</CardContent></Card>
      )}
    </div>
  );
}
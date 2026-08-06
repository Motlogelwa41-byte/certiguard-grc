import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  AUTOMATED_TEST_LIBRARY, TEST_CATEGORIES, TEST_COUNT,
  FRAMEWORK_LABELS, testsByFramework,
} from "@/lib/automatedTestLibrary";
import {
  Search, Play, FlaskRound, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Library, Filter,
} from "lucide-react";

const SEVERITY_COLORS = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function AutomatedTestLibrary() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [framework, setFramework] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [running, setRunning] = useState(null);
  const [results, setResults] = useState({});
  const { toast } = useToast();

  const filtered = useMemo(() => {
    return AUTOMATED_TEST_LIBRARY.filter((t) => {
      if (search && !t.label.toLowerCase().includes(search.toLowerCase()) && !t.key.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "all" && t.category !== category) return false;
      if (framework !== "all" && !t.frameworks.includes(framework)) return false;
      if (severity !== "all" && t.severity !== severity) return false;
      return true;
    });
  }, [search, category, framework, severity]);

  const stats = useMemo(() => ({
    total: TEST_COUNT,
    filtered: filtered.length,
    critical: filtered.filter(t => t.severity === "critical").length,
    high: filtered.filter(t => t.severity === "high").length,
    categories: TEST_CATEGORIES.length,
  }), [filtered]);

  const runTest = async (test) => {
    setRunning(test.key);
    try {
      const res = await base44.functions.invoke("runAutomatedComplianceTest", {
        test_key: test.key,
        create_evidence: false,
      });
      setResults(prev => ({ ...prev, [test.key]: res.data }));
      toast({
        title: res.data.result === "pass" ? "Test Passed" : res.data.result === "fail" ? "Test Failed" : "Test Error",
        description: res.data.summary,
        variant: res.data.result === "pass" ? "default" : "destructive",
      });
    } catch (e) {
      toast({ title: "Test execution failed", description: e.message, variant: "destructive" });
    }
    setRunning(null);
  };

  const runBatch = async () => {
    const batch = filtered.slice(0, 25);
    toast({ title: `Running ${batch.length} tests...`, description: "Results will appear as they complete." });
    for (const test of batch) {
      await runTest(test);
    }
  };

  return (
    <div>
      <PageHeader
        title="Automated Compliance Test Library"
        subtitle={`${TEST_COUNT} pre-built automated tests mapped to SOC 2, ISO 27001, HIPAA, PCI-DSS, NIST CSF & CIS Controls`}
        actions={
          <Button onClick={runBatch} disabled={running !== null || filtered.length === 0}>
            <Play className="w-3.5 h-3.5 mr-1" /> Run Batch (25)
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard icon={Library} label="Total Tests" value={stats.total} color="text-blue-500" />
        <StatCard icon={Filter} label="Filtered" value={stats.filtered} color="text-primary" />
        <StatCard icon={AlertTriangle} label="Critical Severity" value={stats.critical} color="text-red-500" />
        <StatCard icon={AlertTriangle} label="High Severity" value={stats.high} color="text-orange-500" />
        <StatCard icon={FlaskRound} label="Categories" value={stats.categories} color="text-purple-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tests by name or key..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TEST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={framework} onValueChange={setFramework}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frameworks</SelectItem>
            {Object.entries(FRAMEWORK_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Test list */}
      <div className="space-y-1.5 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Library className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No tests match your filters.</p>
          </div>
        ) : (
          filtered.slice(0, 200).map((test) => {
            const result = results[test.key];
            const isRunning = running === test.key;
            return (
              <div key={test.key} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{test.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${SEVERITY_COLORS[test.severity]}`}>{test.severity}</span>
                    {test.cloudProvider && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase">{test.cloudProvider}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{test.key}</span>
                    <span className="text-[10px] text-muted-foreground">· {test.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {result && (
                    result.result === "pass" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                    result.result === "fail" ? <XCircle className="w-4 h-4 text-red-500" /> :
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  {result && (
                    <span className={`text-xs font-medium hidden md:inline ${result.result === "pass" ? "text-emerald-600" : result.result === "fail" ? "text-red-600" : "text-amber-600"}`}>
                      {result.summary?.slice(0, 40)}{result.summary?.length > 40 ? "…" : ""}
                    </span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => runTest(test)} disabled={isRunning} className="h-7 px-2">
                    {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            );
          })
        )}
        {filtered.length > 200 && (
          <p className="text-center text-xs text-muted-foreground py-3">Showing first 200 of {filtered.length} tests. Refine filters to see more.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <Icon className={`w-4 h-4 ${color} mb-1.5`} />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
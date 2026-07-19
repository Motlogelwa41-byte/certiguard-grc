import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { CONTROL_LIBRARIES } from "@/lib/controlLibraries";
import { Library, Check, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export default function ControlLibraries() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(null);

  useEffect(() => {
    (async () => {
      const fws = await base44.entities.Framework.list("-updated_date", 100);
      setFrameworks(fws || []);
      setLoading(false);
    })();
  }, []);

  const isImported = (lib) => frameworks.some((f) => f.name === lib.name);

  const doImport = async (lib) => {
    setImporting(lib.key);
    try {
      const res = await base44.functions.invoke("importControlLibrary", {
        library_key: lib.key,
        library_name: lib.name,
        library_version: lib.version,
        controls: lib.controls,
      });
      const data = res?.data || res;
      if (data?.ok) {
        toast({ title: `${lib.name} imported`, description: `${data.created} controls added (${data.skipped} already existed).` });
        const fws = await base44.entities.Framework.list("-updated_date", 100);
        setFrameworks(fws || []);
      } else toast({ title: "Import failed", description: data?.error, variant: "destructive" });
    } catch (e) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
    setImporting(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Control Libraries" subtitle="Pre-built authoritative frameworks — import with one click to accelerate onboarding" />

      <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3 mb-6">
        <ShieldCheck className="w-5 h-5 text-success mt-0.5" />
        <p className="text-sm text-muted-foreground">Importing a library creates a framework record and pre-maps all of its controls in your register. Re-running an import adds only missing controls — existing mappings are preserved.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CONTROL_LIBRARIES.map((lib) => {
          const imported = isImported(lib);
          return (
            <div key={lib.key} className="bg-card rounded-2xl border border-border p-6 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"><Library className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h3 className="font-heading font-bold text-foreground">{lib.name}</h3>
                    <p className="text-[11px] text-muted-foreground">v{lib.version} · {lib.controls.length} controls</p>
                  </div>
                </div>
                {imported && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Imported</span>}
              </div>
              <p className="text-sm text-muted-foreground mb-4 flex-1">{lib.description}</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {Array.from(new Set(lib.controls.map((c) => c.category))).slice(0, 6).map((c) => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border capitalize">{c.replace(/_/g, " ")}</span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {imported ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => doImport(lib)} disabled={importing === lib.key}>
                      {importing === lib.key ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Re-sync missing
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate("/controls")}>View controls <ArrowRight className="w-4 h-4 ml-1" /></Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => doImport(lib)} disabled={importing === lib.key}>
                    {importing === lib.key ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Library className="w-4 h-4 mr-1" />} Import {lib.controls.length} controls
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
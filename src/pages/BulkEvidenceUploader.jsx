import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X, CheckCircle2, AlertCircle, Link2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

const evidenceTypes = ["screenshot", "document", "report", "log", "certificate", "configuration", "other"];

export default function BulkEvidenceUploader() {
  const [controls, setControls] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [applyControlToAll, setApplyControlToAll] = useState("");
  const [applyTypeToAll, setApplyTypeToAll] = useState("");
  const [applyFrameworkToAll, setApplyFrameworkToAll] = useState("");
  const [applyRequirementToAll, setApplyRequirementToAll] = useState("");
  const dropRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Control.list().then(setControls).catch(() => {});
    base44.entities.Framework.list().then(setFrameworks).catch(() => {});
    base44.entities.FrameworkRequirement.list().then(setRequirements).catch(() => {});
  }, []);

  const reqsForFramework = (fwId) => (requirements || []).filter((r) => r.framework_id === fwId);

  const autoFillFramework = (controlId, fileObj) => {
    if (!controlId) return fileObj;
    const ctl = controls.find((c) => c.id === controlId);
    if (ctl?.framework_ids?.length) {
      const fwId = ctl.framework_ids[0];
      const fw = frameworks.find((f) => f.id === fwId);
      if (fw) return { ...fileObj, framework_id: fw.id, framework_name: fw.name };
    }
    return fileObj;
  };

  const addFiles = (rawFiles) => {
    const newEntries = Array.from(rawFiles).map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      name: f.name,
      size: f.size,
      title: f.name.replace(/\.[^/.]+$/, ""),
      type: "document",
      control_id: "",
      control_title: "",
      framework_id: "",
      framework_name: "",
      requirement_id: "",
      requirement_title: "",
      uploadStatus: null,
      error: null,
    }));
    setFiles(prev => [...prev, ...newEntries]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const updateFile = (id, patch) =>
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));

  const removeFile = (id) =>
    setFiles(prev => prev.filter(f => f.id !== id));

  const handleControlChange = (id, controlId) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== id) return f;
      const ctl = controls.find(c => c.id === controlId);
      const updated = { ...f, control_id: controlId === "__none__" ? "" : controlId, control_title: ctl?.title || "" };
      return autoFillFramework(controlId, updated);
    }));
  };

  const handleFrameworkChange = (id, fwId) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== id) return f;
      const fw = frameworks.find(x => x.id === fwId);
      return { ...f, framework_id: fwId === "__none__" ? "" : fwId, framework_name: fw?.name || "", requirement_id: "", requirement_title: "" };
    }));
  };

  const handleRequirementChange = (id, reqId) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== id) return f;
      const req = requirements.find(r => r.id === reqId);
      return { ...f, requirement_id: reqId === "__none__" ? "" : reqId, requirement_title: req?.title || "" };
    }));
  };

  const applyToAll = () => {
    setFiles(prev => prev.map(f => {
      let updated = { ...f };
      if (applyControlToAll && applyControlToAll !== "__none__") {
        const ctl = controls.find(c => c.id === applyControlToAll);
        updated.control_id = applyControlToAll;
        updated.control_title = ctl?.title || "";
        updated = autoFillFramework(applyControlToAll, updated);
      }
      if (applyTypeToAll) updated.type = applyTypeToAll;
      if (applyFrameworkToAll && applyFrameworkToAll !== "__none__") {
        const fw = frameworks.find(x => x.id === applyFrameworkToAll);
        updated.framework_id = applyFrameworkToAll;
        updated.framework_name = fw?.name || "";
        updated.requirement_id = "";
        updated.requirement_title = "";
      }
      if (applyRequirementToAll && applyRequirementToAll !== "__none__") {
        const req = requirements.find(r => r.id === applyRequirementToAll);
        updated.requirement_id = applyRequirementToAll;
        updated.requirement_title = req?.title || "";
        if (req?.framework_id && !updated.framework_id) {
          const fw = frameworks.find(x => x.id === req.framework_id);
          updated.framework_id = req.framework_id;
          updated.framework_name = fw?.name || "";
        }
      }
      return updated;
    }));
  };

  const handleUploadAll = async () => {
    const pending = files.filter(f => f.uploadStatus !== "done");
    if (!pending.length) return;
    setUploading(true);

    for (const f of pending) {
      updateFile(f.id, { uploadStatus: "uploading" });
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f.file });
        await base44.entities.Evidence.create({
          title: f.title || f.name,
          type: f.type,
          status: "pending_review",
          control_id: f.control_id || "",
          control_title: f.control_title || "",
          framework_id: f.framework_id || "",
          framework_name: f.framework_name || "",
          requirement_id: f.requirement_id || "",
          requirement_title: f.requirement_title || "",
          file_url,
          file_name: f.name,
          collected_date: new Date().toISOString().split("T")[0],
        });
        updateFile(f.id, { uploadStatus: "done" });
      } catch (err) {
        updateFile(f.id, { uploadStatus: "error", error: err.message });
      }
    }

    setUploading(false);
    const succeeded = pending.filter(f => f.uploadStatus !== "error").length;
    toast({ title: `Upload complete`, description: `${succeeded} of ${pending.length} file(s) linked and uploaded.` });
  };

  const doneCount = files.filter(f => f.uploadStatus === "done").length;
  const pendingCount = files.filter(f => f.uploadStatus !== "done").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Evidence Uploader"
        subtitle="Upload multiple files at once and link each to a control, framework, and compliance requirement"
        actions={
          files.length > 0 && (
            <Button onClick={handleUploadAll} disabled={uploading || pendingCount === 0}>
              {uploading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4 mr-1" /> Upload All ({pendingCount})</>}
            </Button>
          )
        }
      />

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-primary/60 hover:bg-muted/20 transition-all cursor-pointer"
        onClick={() => document.getElementById("bulk-file-input").click()}
      >
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold text-foreground">Drop files here or click to browse</p>
        <p className="text-sm text-muted-foreground mt-1">Supports any file type — PDFs, screenshots, logs, certificates</p>
        <input id="bulk-file-input" type="file" multiple data-testid="bulk-file-input" aria-label="Upload evidence files" className="sr-only" onChange={e => addFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <>
          {/* Bulk-apply bar */}
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-xs mb-1 block">Apply control to all</Label>
              <Select value={applyControlToAll} onValueChange={setApplyControlToAll}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Select control…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">— Clear —</SelectItem>
                  {controls.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.control_id ? `[${c.control_id}] ` : ""}{c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Apply framework to all</Label>
              <Select value={applyFrameworkToAll} onValueChange={v => { setApplyFrameworkToAll(v); setApplyRequirementToAll(""); }}>
                <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Select framework…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">— Clear —</SelectItem>
                  {frameworks.map(f => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Apply requirement to all</Label>
              <Select value={applyRequirementToAll} onValueChange={setApplyRequirementToAll}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Select requirement…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">— Clear —</SelectItem>
                  {(applyFrameworkToAll ? reqsForFramework(applyFrameworkToAll) : requirements).slice(0, 200).map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.requirement_id ? `[${r.requirement_id}] ` : ""}{r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Apply type to all</Label>
              <Select value={applyTypeToAll} onValueChange={setApplyTypeToAll}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent>
                  {evidenceTypes.map(t => <SelectItem key={t} value={t} className="text-xs">{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={applyToAll} className="h-8">Apply to all rows</Button>
            <div className="ml-auto text-xs text-muted-foreground self-center">
              {doneCount}/{files.length} uploaded
            </div>
          </div>

          {/* File rows */}
          <div className="space-y-2">
            {files.map(f => {
              const availReqs = f.framework_id ? reqsForFramework(f.framework_id) : requirements;
              return (
                <div key={f.id} className="p-4 bg-muted/20 rounded-xl border border-border space-y-2">
                  {/* Row 1: file + title + type + status */}
                  <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.4fr_1fr_auto] gap-3 items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Input placeholder="Evidence title" value={f.title} onChange={e => updateFile(f.id, { title: e.target.value })} className="text-xs h-8" />
                    <Select value={f.type} onValueChange={v => updateFile(f.id, { type: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {evidenceTypes.map(t => <SelectItem key={t} value={t} className="text-xs">{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      {f.uploadStatus === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                      {f.uploadStatus === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {f.uploadStatus === "error" && <AlertCircle className="w-4 h-4 text-destructive" title={f.error} />}
                      {!f.uploadStatus && (
                        <button onClick={() => removeFile(f.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Row 2: control + framework + requirement */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Select value={f.control_id || "__none__"} onValueChange={v => handleControlChange(f.id, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Map to control…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">— No control —</SelectItem>
                        {controls.map(c => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">{c.control_id ? `[${c.control_id}] ` : ""}{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={f.framework_id || "__none__"} onValueChange={v => handleFrameworkChange(f.id, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Framework…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">— No framework —</SelectItem>
                        {frameworks.map(fw => (
                          <SelectItem key={fw.id} value={fw.id} className="text-xs">{fw.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={f.requirement_id || "__none__"} onValueChange={v => handleRequirementChange(f.id, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Compliance requirement…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">— No requirement —</SelectItem>
                        {availReqs.slice(0, 200).map(r => (
                          <SelectItem key={r.id} value={r.id} className="text-xs">{r.requirement_id ? `[${r.requirement_id}] ` : ""}{r.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setFiles([])} disabled={uploading}>Clear all</Button>
            <Button onClick={handleUploadAll} disabled={uploading || pendingCount === 0}>
              {uploading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4 mr-1" />Upload {pendingCount} file(s)</>}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
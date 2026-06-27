import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X, CheckCircle2, AlertCircle, Link2, FileText, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

const evidenceTypes = ["screenshot", "document", "report", "log", "certificate", "configuration", "other"];

function FileRow({ file, controls, onUpdate, onRemove }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_2fr_auto] gap-3 items-center p-4 bg-muted/20 rounded-xl border border-border">
      {/* File info */}
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
          <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
      </div>

      {/* Title override */}
      <Input
        placeholder="Evidence title"
        value={file.title}
        onChange={e => onUpdate({ title: e.target.value })}
        className="text-xs h-8"
      />

      {/* Type */}
      <Select value={file.type} onValueChange={v => onUpdate({ type: v })}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {evidenceTypes.map(t => <SelectItem key={t} value={t} className="text-xs">{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Control mapping */}
      <Select value={file.control_id || "__none__"} onValueChange={v => {
        const ctl = controls.find(c => c.id === v);
        onUpdate({ control_id: v === "__none__" ? "" : v, control_title: ctl?.title || "" });
      }}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Map to control..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__" className="text-xs">— No control —</SelectItem>
          {controls.map(c => (
            <SelectItem key={c.id} value={c.id} className="text-xs">
              {c.control_id ? `[${c.control_id}] ` : ""}{c.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status / remove */}
      <div className="flex items-center gap-2">
        {file.uploadStatus === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        {file.uploadStatus === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        {file.uploadStatus === "error" && <AlertCircle className="w-4 h-4 text-destructive" title={file.error} />}
        {!file.uploadStatus && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function BulkEvidenceUploader() {
  const [controls, setControls] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [applyControlToAll, setApplyControlToAll] = useState("");
  const [applyTypeToAll, setApplyTypeToAll] = useState("");
  const dropRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Control.list().then(setControls);
  }, []);

  const addFiles = (rawFiles) => {
    const newEntries = Array.from(rawFiles).map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      name: f.name,
      size: f.size,
      title: f.name.replace(/\.[^/.]+$/, ""), // strip extension as default title
      type: "document",
      control_id: "",
      control_title: "",
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

  const applyToAll = () => {
    setFiles(prev => prev.map(f => ({
      ...f,
      ...(applyControlToAll && applyControlToAll !== "__none__"
        ? { control_id: applyControlToAll, control_title: controls.find(c => c.id === applyControlToAll)?.title || "" }
        : {}),
      ...(applyTypeToAll ? { type: applyTypeToAll } : {}),
    })));
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
    const done = files.filter(f => f.uploadStatus === "done").length + pending.filter(f => f.uploadStatus !== "error").length;
    toast({ title: `Upload complete`, description: `${pending.length} file(s) processed.` });
  };

  const doneCount = files.filter(f => f.uploadStatus === "done").length;
  const pendingCount = files.filter(f => f.uploadStatus !== "done").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Evidence Uploader"
        subtitle="Select multiple files at once and map each to its corresponding control"
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
        <input id="bulk-file-input" type="file" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <>
          {/* Bulk-apply bar */}
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-xs mb-1 block">Apply control to all</Label>
              <Select value={applyControlToAll} onValueChange={setApplyControlToAll}>
                <SelectTrigger className="w-56 h-8 text-xs"><SelectValue placeholder="Select control…" /></SelectTrigger>
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
              <Label className="text-xs mb-1 block">Apply type to all</Label>
              <Select value={applyTypeToAll} onValueChange={setApplyTypeToAll}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Select type…" /></SelectTrigger>
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

          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-3 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            <span>File</span><span>Title</span><span>Type</span><span>Map to Control</span><span></span>
          </div>

          {/* File rows */}
          <div className="space-y-2">
            {files.map(f => (
              <FileRow
                key={f.id}
                file={f}
                controls={controls}
                onUpdate={patch => updateFile(f.id, patch)}
                onRemove={() => removeFile(f.id)}
              />
            ))}
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
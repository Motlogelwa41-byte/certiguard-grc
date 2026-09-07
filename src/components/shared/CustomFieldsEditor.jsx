import React, { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes/No" },
  { value: "select", label: "Dropdown" },
];

export default function CustomFieldsEditor({ value, onChange, label = "Custom Fields" }) {
  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (!value) {
      setFields([]);
      return;
    }
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      setFields(Array.isArray(parsed) ? parsed : []);
    } catch {
      setFields([]);
    }
  }, [value]);

  const commit = (updated) => {
    setFields(updated);
    onChange?.(JSON.stringify(updated));
  };

  const addField = () => {
    commit([...fields, { key: `field_${Date.now()}`, label: "", value: "", type: "text" }]);
  };

  const updateField = (index, patch) => {
    commit(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const removeField = (index) => {
    commit(fields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Button type="button" size="sm" variant="outline" onClick={addField}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No custom fields defined. Click "Add Field" to create tenant-specific attributes.</p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-border bg-muted/30">
              <div className="grid grid-cols-12 gap-2 flex-1">
                <Input
                  className="col-span-4"
                  placeholder="Field label"
                  value={field.label || ""}
                  onChange={(e) => updateField(i, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                />
                <Select value={field.type || "text"} onValueChange={(v) => updateField(i, { type: v })}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {field.type === "boolean" ? (
                  <Select value={String(field.value === true || field.value === "true")} onValueChange={(v) => updateField(i, { value: v === "true" })}>
                    <SelectTrigger className="col-span-5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : field.type === "select" ? (
                  <Input
                    className="col-span-5"
                    placeholder="Option1, Option2, Option3"
                    value={field.value || ""}
                    onChange={(e) => updateField(i, { value: e.target.value, options: e.target.value.split(",").map((s) => s.trim()) })}
                  />
                ) : (
                  <Input
                    className="col-span-5"
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    placeholder="Field value"
                    value={field.value || ""}
                    onChange={(e) => updateField(i, { value: e.target.value })}
                  />
                )}
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => removeField(i)} className="text-destructive shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
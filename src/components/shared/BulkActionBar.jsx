import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BulkActionBar({ selectedCount, onClear, children }) {
  if (selectedCount === 0) return null;
  return (
    <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-3 bg-primary/10 border border-primary/30 rounded-lg p-3 shadow-sm">
      <span className="text-sm font-semibold text-foreground whitespace-nowrap">
        {selectedCount} selected
      </span>
      <div className="h-5 w-px bg-border" />
      <div className="flex flex-wrap items-center gap-2 flex-1">{children}</div>
      <Button variant="ghost" size="sm" onClick={onClear}>
        <X className="w-4 h-4 mr-1" /> Clear
      </Button>
    </div>
  );
}
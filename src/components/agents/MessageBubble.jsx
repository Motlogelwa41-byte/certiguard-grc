import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, AlertCircle, Wrench } from "lucide-react";

const STATUS_META = {
  pending: { icon: Loader2, className: "text-muted-foreground animate-spin", label: "Pending" },
  running: { icon: Loader2, className: "text-blue-500 animate-spin", label: "Running" },
  in_progress: { icon: Loader2, className: "text-blue-500 animate-spin", label: "In progress" },
  completed: { icon: CheckCircle2, className: "text-emerald-500", label: "Completed" },
  success: { icon: CheckCircle2, className: "text-emerald-500", label: "Success" },
  failed: { icon: XCircle, className: "text-red-500", label: "Failed" },
  error: { icon: AlertCircle, className: "text-red-500", label: "Error" },
};

function FunctionDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status || "pending";
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;

  let parsedArgs = toolCall.arguments_string;
  try {
    parsedArgs = JSON.parse(toolCall.arguments_string);
  } catch {
    /* keep raw */
  }
  let parsedResults = toolCall.results;
  if (typeof parsedResults === "string") {
    try {
      parsedResults = JSON.parse(parsedResults);
    } catch {
      /* keep raw */
    }
  }

  const isFailed = status === "failed" || status === "error" ||
    (typeof parsedResults === "string" && /error|failed/i.test(parsedResults)) ||
    (parsedResults && typeof parsedResults === "object" && parsedResults.success === false);

  const proj = toolCall.display_projection || {};
  const hideDetails = proj.hide_details && proj.details_redacted;
  const activeLabel = proj.active_label || meta.label;
  const errorLabel = proj.error_label || "Failed";
  const successLabel = proj.label || "Done";

  if (hideDetails) {
    const label = isFailed ? errorLabel : (status === "success" || status === "completed" ? successLabel : activeLabel);
    return (
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={`w-3.5 h-3.5 ${meta.className}`} />
        <Wrench className="w-3 h-3" />
        <span>{label}</span>
      </div>
    );
  }

  const fnName = (toolCall.name || "tool").replace(/_/g, " ");

  return (
    <div className="mt-2 text-xs rounded-lg border border-border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <Icon className={`w-3.5 h-3.5 ${meta.className}`} />
        <Wrench className="w-3 h-3 text-muted-foreground" />
        <span className="font-medium capitalize text-foreground">{fnName}</span>
        <span className={`ml-auto ${isFailed ? "text-red-500" : "text-muted-foreground"}`}>
          {isFailed ? errorLabel : (status === "success" || status === "completed" ? successLabel : activeLabel)}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border">
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Parameters</p>
            <pre className="text-xs bg-background/60 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
              {typeof parsedArgs === "object" ? JSON.stringify(parsedArgs, null, 2) : String(parsedArgs)}
            </pre>
          </div>
          {parsedResults !== undefined && parsedResults !== null && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Result</p>
              <pre className={`text-xs bg-background/60 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all ${isFailed ? "text-red-500" : ""}`}>
                {typeof parsedResults === "object" ? JSON.stringify(parsedResults, null, 2) : String(parsedResults)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>
        {message.content && (
          isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:bg-muted prose-pre:text-xs">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )
        )}
        {message.tool_calls?.map((tc, idx) => (
          <FunctionDisplay key={idx} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}
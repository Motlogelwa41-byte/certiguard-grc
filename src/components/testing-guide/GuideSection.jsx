import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, CheckCircle2, AlertCircle, Info } from "lucide-react";

export default function GuideSection({ id, icon: Icon, title, subtitle, children }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground pl-0 lg:pl-13 [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export function Steps({ children }) {
  return <ol className="space-y-3">{children}</ol>;
}

export function StepItem({ n, title, children, link }) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border p-3 bg-card/50">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">{n}</div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground text-sm">{title}</p>
        {children && <div className="text-sm text-muted-foreground mt-1 space-y-1">{children}</div>}
        {link && (
          <Link to={link.to} className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5">
            {link.label} <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </li>
  );
}

export function Expect({ label = "Expected Result", children }) {
  return (
    <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-2.5 mt-1">
      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> {label}
      </p>
      <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">{children}</p>
    </div>
  );
}

export function NoteBox({ label = "Note", children }) {
  return (
    <div className="rounded-md bg-blue-500/5 border border-blue-500/20 p-2.5 mt-1">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 mb-1">
        <Info className="w-3.5 h-3.5" /> {label}
      </p>
      <p className="text-xs text-blue-800/80 dark:text-blue-200/80">{children}</p>
    </div>
  );
}

export function FailExpect({ label = "Expected Failure", children }) {
  return (
    <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-2.5 mt-1">
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1">
        <AlertCircle className="w-3.5 h-3.5" /> {label}
      </p>
      <p className="text-xs text-amber-800/80 dark:text-amber-200/80">{children}</p>
    </div>
  );
}

export function Example({ title, children }) {
  return (
    <div className="rounded-md bg-slate-900 dark:bg-slate-950 p-3 mt-1.5 font-mono text-xs text-slate-300 overflow-x-auto">
      {title && <p className="text-slate-500 mb-1">{title}</p>}
      <pre className="whitespace-pre-wrap">{children}</pre>
    </div>
  );
}
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GRC_DOMAINS, MATURITY_LEVELS } from "@/lib/grcMaturity";

export default function MaturityLearn() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What is GRC?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3 text-foreground/80">
          <p>
            <b>Governance, Risk, and Compliance (GRC)</b> is an organization's integrated capability to
            reliably achieve objectives, address uncertainty, and act with integrity. It aligns strategy
            (Governance), uncertainty (Risk), and obligations (Compliance) so they reinforce rather than
            compete with each other.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <div className="font-semibold text-emerald-700">Governance</div>
              <p className="text-xs text-muted-foreground mt-1">
                The structures, accountability, and tone-from-the-top that direct the organization toward its objectives.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-semibold text-emerald-700">Risk</div>
              <p className="text-xs text-muted-foreground mt-1">
                Identifying, assessing, and treating uncertainty that could help or hinder objectives.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-semibold text-emerald-700">Compliance</div>
              <p className="text-xs text-muted-foreground mt-1">
                Conforming to laws, regulations, standards, and internal policies — with evidence to prove it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Why a Maturity Model?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-foreground/80">
          <p>
            A maturity model provides a structured path from reactive, ad-hoc practices to optimized,
            continuously-improving ones. It lets you baseline where you are, define a realistic target, and
            chart the steps to get there — making GRC an investment rather than a cost.
          </p>
          <p>
            Use the <b>Assessments</b> tab to score your organization across the domains below, then track your
            roadmap and re-assess periodically to measure improvement.
          </p>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-3">The 5 Maturity Levels</h3>
        <div className="grid gap-3 md:grid-cols-5">
          {MATURITY_LEVELS.map((l) => (
            <Card key={l.level}>
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: l.color }}
                  >
                    {l.level}
                  </span>
                  <span className="font-medium text-sm">{l.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{l.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">GRC Domains & Level Criteria</h3>
        <Accordion type="single" collapsible className="rounded-lg border">
          {GRC_DOMAINS.map((d) => (
            <AccordionItem key={d.key} value={d.key}>
              <AccordionTrigger className="text-sm px-4">{d.name}</AccordionTrigger>
              <AccordionContent className="space-y-1 px-4 pb-3">
                <p className="text-xs text-muted-foreground italic mb-2">{d.description}</p>
                {d.criteria.map((c, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="font-bold min-w-[20px]" style={{ color: MATURITY_LEVELS[i].color }}>
                      L{i + 1}
                    </span>
                    <span className="text-foreground/80">{c}</span>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
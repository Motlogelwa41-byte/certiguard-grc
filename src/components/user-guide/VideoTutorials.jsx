import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent
} from "@/components/ui/accordion";
import {
  PlayCircle, Video, Clock, CheckSquare, Mic, Camera, Clapperboard, Lock
} from "lucide-react";

// Placeholder URLs — replace with your recorded video links (YouTube/Vimeo/MP4)
// once each tutorial is recorded. Leave null to show a "Not recorded yet" state.
const TUTORIALS = [
  {
    id: "t1",
    title: "Tenant & Team Setup",
    duration: "~3 min",
    videoUrl: null,
    prep: [
      "Log in as the tenant admin",
      "Tenant profile fields ready (name, industry, size, country)",
      "Two team email addresses to invite (one user, one compliance officer)",
      "Close other tabs; use a clean browser at 1080p",
    ],
    steps: [
      { say: "Let's get your organisation set up and your team on board.", do: "Open Tenant Admin from the sidebar" },
      { say: "First, confirm your tenant profile — this drives your isolation key.", do: "Show name, industry, size fields filled" },
      { say: "Now we'll invite the team with role-based access.", do: "Go to User Management → Invite user → role: user → send" },
      { say: "Compliance officers get broader edit rights across evidence and certifications.", do: "Invite a second user as compliance_officer" },
      { say: "Each invitee receives an email and joins under your tenant — fully isolated from others.", do: "Show the invitation confirmation" },
    ],
    closing: "In under a minute, your team is provisioned with role-appropriate, tenant-isolated access.",
  },
  {
    id: "t2",
    title: "Adding a Framework & Mapping Controls",
    duration: "~3 min",
    videoUrl: null,
    prep: [
      "At least one framework in mind (we'll use SOC 2)",
      "Two or three sample controls ready to enter",
      "Be on the Frameworks page",
    ],
    steps: [
      { say: "Frameworks are the backbone of your program — let's add SOC 2.", do: "Frameworks → New framework → select SOC 2 → create" },
      { say: "Readiness starts at zero — that's expected. We'll raise it by adding controls.", do: "Show the 0% readiness card" },
      { say: "Now we create a control and map it to the framework.", do: "Controls → New → fill title, category, severity → map to SOC 2" },
      { say: "One control can map to multiple frameworks — tested once, counted everywhere.", do: "Also tick ISO 27001 on the same control" },
      { say: "As controls pass, your framework readiness updates automatically.", do: "Open Framework Progress to show the score moving" },
    ],
    closing: "One control, counted toward every framework it maps to — no duplicated effort.",
  },
  {
    id: "t3",
    title: "Evidence Upload & Automated Collection",
    duration: "~3 min",
    videoUrl: null,
    prep: [
      "A control with an owner assigned",
      "A screenshot or PDF file on hand",
      "(Optional) a connected source like Google Drive or Gmail",
    ],
    steps: [
      { say: "Evidence proves a control is operating — let's attach some.", do: "Open a control → Add evidence → upload file" },
      { say: "New evidence lands in pending review for your compliance manager.", do: "Open Evidence Manager → show pending status" },
      { say: "Once verified, approve it — it now counts toward your control.", do: "Approve the evidence → show control evidence count increment" },
      { say: "For scale, connect a source and CertiGuard collects evidence continuously.", do: "Open Connections → show a connected source" },
      { say: "You can even email evidence in — attachments auto-create pending records.", do: "Mention the Gmail ingestion flow" },
    ],
    closing: "Evidence collected continuously, not chased in a spreadsheet the week before audit.",
  },
  {
    id: "t4",
    title: "Scoring a Risk & Formal Acceptance",
    duration: "~3 min",
    videoUrl: null,
    prep: [
      "A risk scenario in mind (we'll use a third-party outage)",
      "Know your company's appetite thresholds",
    ],
    steps: [
      { say: "Let's register and score a risk.", do: "Risks → New → fill title and category" },
      { say: "Set likelihood and impact — the score and appetite band calculate automatically.", do: "Set 3 × 4 → show score 12 and tolerance_zone band" },
      { say: "Because this sits above appetite, accepting it requires a formal sign-off.", do: "Set treatment = accept" },
      { say: "Type your full name as signature and set an expiry — this is your audit trail.", do: "Fill signature + expiry → save" },
      { say: "The acceptance is recorded with signatory, date, and expiry for the auditor.", do: "Show the saved acceptance record" },
    ],
    closing: "Every above-appetite risk carries an auditable, time-bound executive sign-off.",
  },
  {
    id: "t5",
    title: "Sharing an Auditor Secure Link",
    duration: "~2 min",
    videoUrl: null,
    prep: [
      "An auditor scope ready (which controls are in scope)",
      "A passphrase and expiry date chosen",
    ],
    steps: [
      { say: "Let's give your auditor secure, restricted access.", do: "Open Auditor Scope Admin → create a scope" },
      { say: "Select the controls in scope and generate a secure link.", do: "Generate link → passphrase + expiry" },
      { say: "The link opens a passphrase-gated page — observation only, no export.", do: "Copy link → open the access page → enter passphrase" },
      { say: "You can revoke access at any time, and every access is logged.", do: "Show the revoke toggle and access count" },
    ],
    closing: "Your auditor sees exactly what you scoped, nothing more — and you stay in control.",
  },
  {
    id: "t6",
    title: "Generating a Board Report",
    duration: "~2 min",
    videoUrl: null,
    prep: [
      "Some data populated (a framework, a few risks, some controls)",
      "A recipient email for a scheduled report (optional)",
    ],
    steps: [
      { say: "Let's produce a board-ready compliance summary.", do: "Open Board Report" },
      { say: "It pulls readiness, risks, control health, and recommendations together.", do: "Click Generate → show the report sections" },
      { say: "Export to PDF for the board pack, or schedule it weekly or monthly.", do: "Show Export + Schedule options" },
      { say: "Scheduled reports email stakeholders automatically — no manual chasing.", do: "Show a scheduled report entry" },
    ],
    closing: "A board-ready summary, generated in seconds, delivered on a schedule.",
  },
];

export default function VideoTutorials() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground [&_strong]:text-foreground">
        <strong>Short, focused video walkthroughs</strong> for each part of CertiGuard. Recordings are coming soon —
        below each placeholder you'll find a <strong>ready-to-use recording script and checklist</strong> so every
        tutorial stays consistent and professional. Aim for 2–4 minutes per clip: short, scripted, and to the point.
      </div>

      <RecordingStandards />

      <div className="grid gap-4">
        {TUTORIALS.map((t, idx) => (
          <TutorialCard key={t.id} index={idx + 1} tutorial={t} />
        ))}
      </div>
    </div>
  );
}

function TutorialCard({ index, tutorial }) {
  const [url, setUrl] = useState(tutorial.videoUrl || "");
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">{index}</span>
            {tutorial.title}
          </CardTitle>
          <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> {tutorial.duration}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <VideoSlot url={url} setUrl={setUrl} />
        <Accordion type="single" collapsible>
          <AccordionItem value="script" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              <span className="flex items-center gap-2"><Clapperboard className="w-4 h-4 text-primary" /> Recording script & checklist</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" /> Before you record
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {tutorial.prep.map((p) => (
                    <li key={p} className="flex gap-2"><span className="text-primary">•</span> {p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" /> Script (narration → on-screen action)
                </p>
                <ol className="space-y-2 text-sm">
                  {tutorial.steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-muted text-muted-foreground text-[11px] flex items-center justify-center font-semibold mt-0.5">{i + 1}</span>
                      <div>
                        <p className="text-foreground"><span className="text-muted-foreground italic">Say:</span> "{s.say}"</p>
                        <p className="text-muted-foreground text-xs mt-0.5"><span className="font-medium">Do:</span> {s.do}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-lg bg-success/10 border border-success/20 p-3 text-sm">
                <p className="text-xs font-semibold text-success uppercase tracking-wide mb-1">Closing line</p>
                <p className="text-foreground">{tutorial.closing}</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function VideoSlot({ url, setUrl }) {
  if (url) {
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
    if (isYouTube) {
      const vid = url.includes("youtu.be/") ? url.split("youtu.be/")[1].split("?")[0] : url.split("v=")[1]?.split("&")[0];
      return (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${vid}`} title="Tutorial" allowFullScreen />
        </div>
      );
    }
    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-black">
        <video src={url} controls className="w-full h-full" />
      </div>
    );
  }
  return (
    <div className="aspect-video rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-center px-4">
      <Video className="w-8 h-8 text-muted-foreground mb-2" />
      <p className="text-sm font-medium text-foreground">Not recorded yet</p>
      <p className="text-xs text-muted-foreground max-w-xs mt-1">
        Record using the script below, then paste the video URL here to publish it.
      </p>
      <input
        type="url"
        placeholder="https://… (YouTube, Vimeo, or MP4 link)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="mt-3 w-full max-w-sm text-xs rounded-md border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

function RecordingStandards() {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" /> Recording standards (apply to every clip)
        </p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Standard icon={Camera} label="Resolution">1920×1080, 16:9 landscape, 30 fps</Standard>
          <Standard icon={Mic} label="Audio">Quiet room, USB mic, ~10 cm from mouth</Standard>
          <Standard icon={PlayCircle} label="Length">2–4 minutes per tutorial — short and focused</Standard>
          <Standard icon={Lock} label="Data">Use the sample/test workspace, never real client data</Standard>
          <Standard icon={CheckSquare} label="Intro">Title card: "CertiGuard — [Tutorial name]" (2 s)</Standard>
          <Standard icon={Clapperboard} label="Pace">One action per sentence; pause after each click</Standard>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Record in the published app (not the builder preview) so the URL bar and real layout appear. Tools that work well: Loom, OBS Studio, or macOS screen recording (Cmd+Shift+5).
        </p>
      </CardContent>
    </Card>
  );
}

function Standard({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <span><span className="font-medium text-foreground">{label}:</span> {children}</span>
    </div>
  );
}
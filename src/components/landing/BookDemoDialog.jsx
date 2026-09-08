import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Mail, Building2, User, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { openCalendlyPopup } from "@/components/landing/CalendlyEmbed";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const FRAMEWORK_OPTIONS = ["SOC 2", "ISO 27001", "NIST CSF", "POPIA", "Botswana DPA", "GDPR", "King IV", "SADC Model Law"];

export default function BookDemoDialog({ open, onOpenChange, source = "landing-page" }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    company_size: "",
    role: "",
    preferred_date: "",
    message: "",
  });
  const [frameworks, setFrameworks] = useState([]);
  const [calendlyUrl, setCalendlyUrl] = useState("");

  useEffect(() => {
    base44.entities.TenantSettings.list("-created_date", 1)
      .then((items) => {
        if (items?.[0]?.calendly_url) setCalendlyUrl(items[0].calendly_url);
      })
      .catch(() => {});
  }, []);

  const toggleFramework = (fw) => {
    setFrameworks((prev) => (prev.includes(fw) ? prev.filter((f) => f !== fw) : [...prev, fw]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.company) {
      toast({ title: "Please fill in your name, work email, and company.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Track the demo_requested event
      try { base44.analytics.track({ eventName: "demo_requested" }); } catch (e) { /* best-effort */ }

      const res = await base44.functions.invoke("createDemoRequest", {
        ...form,
        frameworks_of_interest: frameworks,
        source,
      });
      const data = res.data || res;
      if (data.error) throw new Error(data.error);

      setDone(true);
      toast({ title: "Demo request received", description: data.message || "We'll be in touch within one business day." });
    } catch (err) {
      toast({ title: "Something went wrong", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (done) {
      setDone(false);
      setForm({ name: "", email: "", company: "", company_size: "", role: "", preferred_date: "", message: "" });
      setFrameworks([]);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        {done ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">Request received</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Thank you for your interest in CertiGuard GRC. Our team will reach out within one business day to schedule your personalized demo.
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Book a Demo
              </DialogTitle>
              <DialogDescription>
                See CertiGuard GRC in action. We'll tailor the demo to your frameworks and compliance goals.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="demo-name">Full name *</Label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input id="demo-name" className="pl-9" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="demo-role">Job title</Label>
                  <Input id="demo-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="CISO" />
                </div>
              </div>

              <div>
                <Label htmlFor="demo-email">Work email *</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="demo-email" type="email" className="pl-9" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="demo-company">Company *</Label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input id="demo-company" className="pl-9" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="demo-size">Company size</Label>
                  <select
                    id="demo-size"
                    value={form.company_size}
                    onChange={(e) => setForm({ ...form, company_size: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">Select…</option>
                    {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label>Frameworks of interest</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {FRAMEWORK_OPTIONS.map((fw) => (
                    <label key={fw} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={frameworks.includes(fw)} onCheckedChange={() => toggleFramework(fw)} />
                      <span>{fw}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="demo-date">Preferred demo date</Label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="demo-date" type="date" className="pl-9" value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} />
                </div>
              </div>

              <div>
                <Label htmlFor="demo-message">Anything you'd like us to cover?</Label>
                <Textarea id="demo-message" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="e.g. We're preparing for SOC 2 Type II and need automated evidence collection." />
              </div>
            </div>

            {calendlyUrl && (
              <div className="flex items-center gap-3 mt-3 mb-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Submitting…</>) : "Request Demo"}
              </Button>
              {calendlyUrl && (
                <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => openCalendlyPopup(calendlyUrl)}>
                  <Calendar className="w-4 h-4 mr-1" /> Book on Calendly
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
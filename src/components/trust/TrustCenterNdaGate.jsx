import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lock, FileText, CheckCircle, User, Building2, Mail, Phone, Shield } from "lucide-react";

export default function TrustCenterNdaGate({ config, onAccessGranted }) {
  const [step, setStep] = useState("form"); // form → nda → signed
  const [form, setForm] = useState({ visitor_name: "", visitor_email: "", visitor_company: "", visitor_title: "", visitor_phone: "" });
  const [accessData, setAccessData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const accent = config.accent_color || "#2563eb";

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    if (!form.visitor_name || !form.visitor_email) {
      setError("Name and email are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("processNdaRequest", {
        action: "request_access",
        ...form,
        source: "trust_center"
      });
      const data = res.data;
      setAccessData(data);
      if (data.access_granted) {
        setStep("signed");
        onAccessGranted?.(data);
      } else if (data.nda_status === "requested" || data.nda_document_text) {
        setStep("nda");
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  const handleSignNda = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("processNdaRequest", {
        action: "sign_nda",
        access_request_id: accessData.access_request_id,
        access_token: accessData.access_token,
        visitor_ip: "unknown",
        visitor_user_agent: navigator.userAgent
      });
      const data = res.data;
      if (data.access_granted) {
        setStep("signed");
        onAccessGranted?.({ ...accessData, access_granted: true });
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  // ── Step 1: Access Request Form ──
  if (step === "form") {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: `${accent}15` }}>
            <Lock className="w-7 h-7" style={{ color: accent }} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Request Document Access</h2>
          <p className="text-sm text-slate-500 mt-1">
            {config.nda_required
              ? "This Trust Center requires a signed NDA before accessing compliance documents."
              : "Submit your details to access compliance documents."}
          </p>
        </div>

        <form onSubmit={handleRequestAccess} className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-slate-600">Full Name *</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Jane Doe"
                value={form.visitor_name}
                onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600">Work Email *</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="email"
                className="pl-9"
                placeholder="jane@company.com"
                value={form.visitor_email}
                onChange={(e) => setForm({ ...form, visitor_email: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600">Company</Label>
            <div className="relative mt-1">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Acme Inc."
                value={form.visitor_company}
                onChange={(e) => setForm({ ...form, visitor_company: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600">Title</Label>
              <Input
                className="mt-1"
                placeholder="CISO"
                value={form.visitor_title}
                onChange={(e) => setForm({ ...form, visitor_title: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600">Phone</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="+1 555..."
                  value={form.visitor_phone}
                  onChange={(e) => setForm({ ...form, visitor_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <Button type="submit" className="w-full" style={{ background: accent }} disabled={loading}>
            {loading ? "Processing..." : config.nda_required ? "Request Access & Review NDA" : "Request Access"}
          </Button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-4 flex items-center justify-center gap-1.5">
          <Shield className="w-3 h-3" />
          Your information is protected and used solely for access management.
        </p>
      </div>
    );
  }

  // ── Step 2: NDA Review & Sign ──
  if (step === "nda" && accessData?.nda_document_text) {
    return (
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: `${accent}15` }}>
            <FileText className="w-7 h-7" style={{ color: accent }} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Mutual Non-Disclosure Agreement</h2>
          <p className="text-sm text-slate-500 mt-1">Review and sign the NDA below to unlock document access</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 max-h-96 overflow-y-auto mb-6">
          <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
            {accessData.nda_document_text}
          </pre>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-xs text-amber-800">
            By clicking "Sign NDA & Get Access", you acknowledge that you have read, understood, and agree to be bound by the terms of this Non-Disclosure Agreement. Your signed copy and access token will be emailed to {form.visitor_email}.
          </p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setStep("form")} disabled={loading}>
            Back
          </Button>
          <Button className="flex-1" style={{ background: accent }} onClick={handleSignNda} disabled={loading}>
            {loading ? "Signing..." : "Sign NDA & Get Access"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 3: Signed / Access Granted ──
  if (step === "signed") {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-lg p-8 text-center">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 bg-emerald-100">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Granted</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          {config.nda_required
            ? "Your NDA has been signed. You now have access to compliance documents."
            : "You now have access to compliance documents."}
        </p>
        <Button className="w-full" style={{ background: accent }} onClick={() => onAccessGranted?.(accessData)}>
          View Trust Center
        </Button>
      </div>
    );
  }

  return null;
}
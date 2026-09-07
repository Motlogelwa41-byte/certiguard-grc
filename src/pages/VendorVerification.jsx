import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Shield, ShieldCheck, AlertCircle, Loader2, Calendar, Globe, TrendingUp } from "lucide-react";

const RISK_CONFIG = {
  low: { color: "#10B981", bg: "rgba(16,185,129,0.1)", label: "Low Risk", description: "Strong security posture with minimal risk exposure" },
  medium: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", label: "Medium Risk", description: "Adequate security posture with some areas for improvement" },
  high: { color: "#F97316", bg: "rgba(249,115,22,0.1)", label: "High Risk", description: "Security gaps identified that require attention" },
  critical: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", label: "Critical Risk", description: "Significant security concerns requiring immediate action" },
};

export default function VendorVerification() {
  const { vendor_id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vendor_id) {
      setError("No vendor ID provided.");
      setLoading(false);
      return;
    }
    base44.functions
      .invoke("vendorPortalAccess", { action: "verify", vendor_id })
      .then((res) => {
        if (res?.error) { setError(res.error); setLoading(false); return; }
        setData(res);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load verification data."); setLoading(false); });
  }, [vendor_id]);

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-white text-lg font-medium">{error}</p>
          <p className="text-slate-500 text-sm mt-2">This verification link may be invalid or expired.</p>
        </div>
      </div>
    );

  const risk = RISK_CONFIG[data?.risk_level] || RISK_CONFIG.medium;
  const assessmentDate = data?.assessment_date
    ? new Date(data.assessment_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Not assessed";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#0A2463] to-[#1E3A8A] p-8 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-[#3E92CC]" />
            </div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">Security Verification</p>
            <h1 className="text-2xl font-bold text-white">{data?.vendor_name || "Vendor"}</h1>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-center">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm"
                style={{ background: risk.bg, color: risk.color }}
              >
                <Shield className="w-4 h-4" />
                {risk.label}
              </div>
            </div>

            <p className="text-slate-400 text-sm text-center">{risk.description}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Risk Score
                </div>
                <p className="text-white text-lg font-bold">{data?.risk_score ?? "—"}<span className="text-slate-500 text-sm font-normal">/100</span></p>
              </div>
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5" /> Assessed
                </div>
                <p className="text-white text-sm font-semibold">{assessmentDate}</p>
              </div>
            </div>

            {data?.category && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Globe className="w-4 h-4 text-slate-600" />
                <span className="capitalize">{data.category.replace(/_/g, " ")}</span>
                {data?.website && (
                  <>
                    <span className="text-slate-700">·</span>
                    <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 truncate">
                      {data.website.replace(/^https?:\/\//, "")}
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 px-6 py-4 text-center">
            <Link to="/landing" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <Shield className="w-3.5 h-3.5 text-[#3E92CC]" />
              Powered by CertiGuard GRC
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          This verification confirms the vendor has completed a security assessment via the CertiGuard GRC platform.
        </p>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Lock, ShieldCheck, FileText, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AuditorLinkAccess() {
  const { token } = useParams();
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("resolveAuditorLink", { token, passphrase });
      if (res?.data?.error) {
        setError(res.data.error);
        setData(null);
      } else {
        setData(res.data);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Access failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="font-bold text-lg">CertiGuard — Auditor Evidence Portal</h1>
            <p className="text-xs text-slate-300">Scoped, view-only access to assigned evidence and framework mappings</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {!data ? (
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Enter access passphrase</h2>
                <p className="text-xs text-slate-500">This was shared with you by the engagement administrator.</p>
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Passphrase"
                className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
              <button
                type="submit"
                disabled={loading || !passphrase}
                className="w-full h-11 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Unlock access
              </button>
            </form>
            <p className="text-[11px] text-slate-400 mt-5 text-center">
              Links expire and are revocable. No administrative system access is granted.
            </p>
          </div>
        ) : (
          <AuditorView data={data} />
        )}
      </div>
    </div>
  );
}

function AuditorView({ data }) {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4" /> Access granted
            </div>
            <h2 className="font-bold text-slate-900 text-lg">Welcome, {data.auditor_name || "Auditor"}</h2>
            <p className="text-sm text-slate-500">{data.scope_notes || "Scoped engagement review."}</p>
          </div>
          <div className="text-xs text-slate-500">
            Access expires: <span className="font-medium text-slate-700">{data.expires_at || "—"}</span>
          </div>
        </div>
      </div>

      <Section title="Assigned frameworks" icon={ShieldCheck}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(data.frameworks || []).map((f) => (
            <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-900">{f.name}</div>
              <div className="text-xs text-slate-500 mt-1">Status: {f.status}</div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, f.readiness_score || 0)}%` }} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {f.passing_controls || 0}/{f.total_controls || 0} controls · {f.readiness_score || 0}%
              </div>
            </div>
          ))}
          {!data.frameworks?.length && <Empty />}
        </div>
      </Section>

      <Section title="Control-to-framework mapping" icon={FileText}>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Control</th>
                <th className="text-left px-4 py-2.5">Frameworks</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Owner</th>
                <th className="text-left px-4 py-2.5">Last tested</th>
              </tr>
            </thead>
            <tbody>
              {(data.controls || []).map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-900">{c.control_id}: {c.title}</div>
                    <div className="text-[11px] text-slate-400 capitalize">{c.automation_status}</div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">{(c.framework_names || []).join(", ") || "—"}</td>
                  <td className="px-4 py-2.5"><StatusPill status={c.status} /></td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">{c.owner_name || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{c.last_tested || "—"}</td>
                </tr>
              ))}
              {!data.controls?.length && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No mapped controls in scope</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Evidence folders" icon={FileText}>
        <div className="space-y-2">
          {(data.evidence || []).map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <div>
                <div className="font-medium text-slate-900 text-sm">{e.title}</div>
                <div className="text-[11px] text-slate-500">
                  {e.control_title || e.control_id || "—"} · {e.type} · collected {e.collected_date || "—"}
                  {e.expiry_date ? ` · expires ${e.expiry_date}` : ""}
                </div>
              </div>
              {e.file_url ? (
                <a
                  href={e.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50"
                >
                  View <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-xs text-slate-400">No file</span>
              )}
            </div>
          ))}
          {!data.evidence?.length && <Empty />}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 font-semibold text-slate-900 mb-3">
        <Icon className="w-4 h-4 text-slate-500" /> {title}
      </h3>
      {children}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    passing: "bg-emerald-100 text-emerald-700",
    failing: "bg-red-100 text-red-700",
    not_tested: "bg-slate-100 text-slate-600",
    not_applicable: "bg-slate-100 text-slate-500"
  };
  const cls = map[status] || "bg-slate-100 text-slate-600";
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${cls}`}>
      {(status || "").replace(/_/g, " ")}
    </span>
  );
}

function Empty() {
  return <div className="text-sm text-slate-400 italic">Nothing available in this scope.</div>;
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Shared data loader for role-based dashboard views. Fetches the entity sets
// each role dashboard needs in a single parallel batch.
export function useDashboardData() {
  const [data, setData] = useState({
    frameworks: [],
    controls: [],
    risks: [],
    tasks: [],
    vendors: [],
    assessments: [],
    auditFindings: [],
    incidents: [],
    evidence: [],
    training: [],
    accessReviews: [],
    policies: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      base44.entities.Framework.list(),
      base44.entities.Control.list(),
      base44.entities.Risk.list(),
      base44.entities.ComplianceTask.list(),
      base44.entities.Vendor.list(),
      base44.entities.VendorAssessment.list(),
      base44.entities.AuditFinding.list(),
      base44.entities.Incident.list(),
      base44.entities.Evidence.list(),
      base44.entities.Training.list(),
      base44.entities.AccessReviewCampaign.list(),
      base44.entities.Policy.list(),
    ])
      .then(([f, c, r, t, v, a, af, inc, ev, tr, ar, pol]) => {
        if (cancelled) return;
        setData({
          frameworks: f,
          controls: c,
          risks: r,
          tasks: t,
          vendors: v,
          assessments: a,
          auditFindings: af,
          incidents: inc,
          evidence: ev,
          training: tr,
          accessReviews: ar,
          policies: pol,
        });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...data, loading };
}

export default useDashboardData;
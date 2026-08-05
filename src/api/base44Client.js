import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// --- Multi-tenant isolation: auto-stamp tenant_id on creates ---
let _tenantId = null;
export function setTenantContext(tid) { _tenantId = tid || null; }
export function getTenantId() { return _tenantId; }

// Entities that carry tenant-scoped data and must be stamped on create.
const TENANT_SCOPED_ENTITIES = new Set([
  'Control', 'Risk', 'Policy', 'Vendor', 'ComplianceTask', 'Framework', 'Incident', 'Evidence',
  'Audit', 'VendorAssessment', 'ComplianceRun', 'GapAnalysis', 'TaskReminder', 'AuditFinding',
  'AuditChecklist', 'MitigationStep', 'Training', 'ComplianceEvent', 'ROPA', 'TrustCenter',
  'ReportSchedule', 'SecurityAlert', 'ManagementReport', 'Subscription',
  // Added 2026-07-30: these entities all have tenant_id + RLS but were missing from the auto-stamp set,
  // causing frontend creates to fail RLS or (if RLS were absent) leak across tenants.
  'Certification', 'CertificationMilestone', 'ControlTest', 'ControlTestResult',
  'SecurityQuestionnaire', 'QuestionnaireItem', 'PenTest', 'PenTestFinding',
  'RegulatoryChange', 'SecurityFinding', 'AccessReviewCampaign', 'AccessReviewItem',
  'DirectoryUser', 'DPIA', 'RiskQuantification', 'PrivacyRequest', 'PrivacyRequestTask',
  'IdentityProvider', 'Connection', 'TaskFeedback', 'AuditorScope', 'AuditorRequest', 'AuditorLink',
  // Added 2026-08-05: tenant-scoped entities missing from the auto-stamp set, causing create RLS rejections.
  'ComplianceBenchmark', 'Contract', 'EsgMetric', 'WebhookEndpoint'
]);

// AuditTrail is created server-side via the logAudit function; skip client logging for it.
const SKIP_AUDIT = new Set(['AuditTrail']);

// Entities whose updates/deletes capture a before → after diff for the user-facing activity log.
const DIFF_ENTITIES = new Set(['Risk', 'Policy', 'Control']);

const nameKeys = ['title', 'name', 'control_id', 'risk_id', 'incident_id', 'finding_id', 'vendor_name', 'processing_activity', 'company_name'];
const nameOf = (d) => {
  if (!d || typeof d !== 'object') return '';
  for (const k of nameKeys) { if (d[k]) return String(d[k]); }
  return '';
};

function safeChanges(data) {
  if (!data || typeof data !== 'object') return data;
  const out = {};
  for (const k of Object.keys(data)) {
    if (k === 'tenant_id') continue;
    const v = data[k];
    if (v && typeof v === 'object' && !(v instanceof File) && !Array.isArray(v)) out[k] = JSON.stringify(v);
    else out[k] = v;
  }
  return out;
}

function logAudit(payload) {
  // Fire-and-forget; never block or break the user action
  base44.functions.invoke('logAudit', payload).catch(() => {});
}

const _origEntities = base44.entities;
base44.entities = new Proxy(_origEntities, {
  get(target, entityName) {
    const entity = target[entityName];
    if (!entity) return entity;
    const stamp = TENANT_SCOPED_ENTITIES.has(entityName);
    const audit = !SKIP_AUDIT.has(entityName);
    if (!stamp && !audit) return entity;

    return new Proxy(entity, {
      get(e, key) {
        const fn = e[key];
        if (typeof fn !== 'function') return fn;

        if (key === 'create') {
          return async (data) => {
            const payload = stamp ? { tenant_id: _tenantId, ...data } : data;
            const result = await fn.call(e, payload);
            if (audit) {
              logAudit({
                action: 'create', entity_type: entityName,
                entity_id: result?.id || '', entity_name: nameOf(data),
                changes: JSON.stringify(safeChanges(data)), severity: 'info'
              });
            }
            return result;
          };
        }
        if (key === 'bulkCreate') {
          return async (arr) => {
            const payload = stamp ? (arr || []).map((d) => ({ tenant_id: _tenantId, ...d })) : arr;
            const result = await fn.call(e, payload);
            if (audit) {
              logAudit({ action: 'create', entity_type: entityName, entity_id: '', entity_name: `Bulk create ${(arr || []).length} ${entityName}`, changes: JSON.stringify({ count: (arr || []).length }), severity: 'info' });
            }
            return result;
          };
        }
        if (key === 'update') {
          return async (id, data) => {
            // Start the pre-fetch concurrently with the mutation — don't block the user on audit logging
            const getPromise = (audit && DIFF_ENTITIES.has(entityName)) ? e.get(id).catch(() => null) : null;
            const result = await fn.call(e, id, data);
            if (getPromise) {
              // Compute diff and fire audit log asynchronously
              getPromise.then(old => {
                const safeNew = safeChanges(data);
                const diff = {};
                for (const k of Object.keys(safeNew)) {
                  const ov = old && k in old ? (old[k] && typeof old[k] === 'object' && !Array.isArray(old[k]) ? JSON.stringify(old[k]) : old[k]) : '';
                  const nv = safeNew[k];
                  if (JSON.stringify(ov) !== JSON.stringify(nv)) diff[k] = { from: ov ?? '', to: nv ?? '' };
                }
                logAudit({ action: 'update', entity_type: entityName, entity_id: id, entity_name: nameOf(old) || nameOf(data), changes: JSON.stringify(diff), severity: 'info' });
              }).catch(() => {});
            } else if (audit) {
              logAudit({ action: 'update', entity_type: entityName, entity_id: id, entity_name: nameOf(data), changes: JSON.stringify(safeChanges(data)), severity: 'info' });
            }
            return result;
          };
        }
        if (key === 'bulkUpdate') {
          return async (arr) => {
            const result = await fn.call(e, arr);
            if (audit) logAudit({ action: 'update', entity_type: entityName, entity_id: '', entity_name: `Bulk update ${(arr || []).length} ${entityName}`, changes: JSON.stringify({ count: (arr || []).length }), severity: 'info' });
            return result;
          };
        }
        if (key === 'updateMany') {
          return async (query, update) => {
            const result = await fn.call(e, query, update);
            if (audit) logAudit({ action: 'update', entity_type: entityName, entity_id: '', entity_name: `Bulk updateMany ${entityName}`, changes: JSON.stringify({ query, update: safeChanges(update) }), severity: 'info' });
            return result;
          };
        }
        if (key === 'delete') {
          return async (id) => {
            const getPromise = (audit && DIFF_ENTITIES.has(entityName)) ? e.get(id).catch(() => null) : null;
            const result = await fn.call(e, id);
            if (getPromise) {
              getPromise.then(old => {
                logAudit({ action: 'delete', entity_type: entityName, entity_id: id, entity_name: nameOf(old), changes: null, severity: 'warning' });
              }).catch(() => {});
            } else if (audit) {
              logAudit({ action: 'delete', entity_type: entityName, entity_id: id, entity_name: '', changes: null, severity: 'warning' });
            }
            return result;
          };
        }
        if (key === 'deleteMany') {
          return async (query) => {
            const result = await fn.call(e, query);
            if (audit) logAudit({ action: 'delete', entity_type: entityName, entity_id: '', entity_name: `Bulk deleteMany ${entityName}`, changes: JSON.stringify({ query }), severity: 'warning' });
            return result;
          };
        }
        return fn.bind(e);
      }
    });
  }
});
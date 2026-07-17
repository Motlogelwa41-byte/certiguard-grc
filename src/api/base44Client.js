import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// --- Multi-tenant isolation: auto-stamp tenant_id on creates ---
// The current tenant id is injected by TenantProvider after auth resolves.
let _tenantId = null;
export function setTenantContext(tid) { _tenantId = tid || null; }
export function getTenantId() { return _tenantId; }

// Entities that carry tenant-scoped data and must be stamped on create.
const TENANT_SCOPED_ENTITIES = new Set([
  'Control', 'Risk', 'Policy', 'Vendor', 'ComplianceTask',
  'Framework', 'Incident', 'Evidence'
]);

const _origEntities = base44.entities;
base44.entities = new Proxy(_origEntities, {
  get(target, entityName) {
    const entity = target[entityName];
    if (!entity || !TENANT_SCOPED_ENTITIES.has(entityName)) return entity;
    return new Proxy(entity, {
      get(e, key) {
        const fn = e[key];
        if (typeof fn !== 'function') return fn;
        if (key === 'create') {
          return (data) => fn.call(e, { tenant_id: _tenantId, ...data });
        }
        if (key === 'bulkCreate') {
          return (arr) => fn.call(e, (arr || []).map((d) => ({ tenant_id: _tenantId, ...d })));
        }
        return fn.bind(e);
      }
    });
  }
});
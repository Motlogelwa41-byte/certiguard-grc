import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Fetches Google Search Console performance data (search analytics, top queries,
// top pages, sitemap status) via the SHARED google_search_console connector.
// The builder connects their GSC account once; all admin users view the same data.

const GSC_API = 'https://www.googleapis.com/webmasters/v3';

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // SHARED connector (builder's Google Search Console via platform OAuth)
    let accessToken: string;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('google_search_console');
      accessToken = conn.accessToken;
    } catch (e) {
      return Response.json({
        connected: false,
        message: 'Google Search Console not connected. Authorize the connector in the Base44 dashboard.',
      }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(body.days || 28, 1), 90);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // List sites to find the matching one
    const sitesRes = await fetch(`${GSC_API}/sites`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!sitesRes.ok) {
      const errText = await sitesRes.text();
      return Response.json({ error: `GSC API error: ${sitesRes.status} ${errText}` }, { status: 502 });
    }
    const sitesData = await sitesRes.json();

    if (!sitesData.siteEntry || sitesData.siteEntry.length === 0) {
      return Response.json({
        connected: true,
        message: 'No sites found in your Google Search Console. Add and verify your domain at https://search.google.com/search-console first.',
        sites: [],
      });
    }

    // Prefer a site matching our domain; fall back to the first available
    const targetDomain = 'ethicaledgegrcconsulting.com';
    let site = sitesData.siteEntry.find((s: any) => s.siteUrl.includes(targetDomain));
    if (!site) site = sitesData.siteEntry[0];

    const siteUrl = encodeURIComponent(site.siteUrl);

    // Search analytics by query (top search terms)
    const [analyticsRes, pagesRes] = await Promise.all([
      fetch(`${GSC_API}/sites/${siteUrl}/searchAnalytics/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: fmtDate(startDate),
          endDate: fmtDate(endDate),
          dimensions: ['query'],
          rowLimit: 50,
        }),
      }),
      fetch(`${GSC_API}/sites/${siteUrl}/searchAnalytics/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: fmtDate(startDate),
          endDate: fmtDate(endDate),
          dimensions: ['page'],
          rowLimit: 50,
        }),
      }),
    ]);

    const analyticsData = await analyticsRes.json();
    const pagesData = await pagesRes.json();

    // Sitemaps
    const sitemapsRes = await fetch(`${GSC_API}/sites/${siteUrl}/sitemaps`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const sitemapsData = await sitemapsRes.ok ? await sitemapsRes.json() : { sitemap: [] };

    // Aggregate totals from the query-level rows
    const queryRows = analyticsData.rows || [];
    const totalClicks = queryRows.reduce((sum: number, r: any) => sum + (r.clicks || 0), 0);
    const totalImpressions = queryRows.reduce((sum: number, r: any) => sum + (r.impressions || 0), 0);
    const avgCTR = totalImpressions > 0 ? +(totalClicks / totalImpressions * 100).toFixed(2) : 0;
    const avgPosition = queryRows.length > 0
      ? +(queryRows.reduce((sum: number, r: any) => sum + (r.position || 0), 0) / queryRows.length).toFixed(1)
      : 0;

    return Response.json({
      connected: true,
      site: site.siteUrl,
      period: { start: fmtDate(startDate), end: fmtDate(endDate), days },
      totals: { clicks: totalClicks, impressions: totalImpressions, ctr: avgCTR, avgPosition },
      topQueries: queryRows.slice(0, 20).map((r: any) => ({
        query: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: +(r.ctr * 100).toFixed(2),
        position: +r.position.toFixed(1),
      })),
      topPages: (pagesData.rows || []).slice(0, 20).map((r: any) => ({
        page: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: +(r.ctr * 100).toFixed(2),
        position: +r.position.toFixed(1),
      })),
      sitemaps: (sitemapsData.sitemap || []).map((s: any) => ({
        path: s.path,
        lastSubmitted: s.lastSubmitted,
        lastDownloaded: s.lastDownloaded,
        status: s.errors ? 'errors' : 'ok',
        submitted: s.submitted,
        indexed: s.indexed,
      })),
      allSites: sitesData.siteEntry.map((s: any) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
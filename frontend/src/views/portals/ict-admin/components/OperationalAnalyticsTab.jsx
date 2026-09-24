import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { fetchWithAuth } from '../../../../api';
import AnalyticsReportModal from '../../../shared/components/AnalyticsReportModal';

const GSOOperationalAnalyticsTab = lazy(() => import('../../gso-admin/components/OperationalAnalyticsTab'));

const EMPTY_ROUTE_PERFORMANCE = { document_routes: [], vehicle_scheduling: [] };
const EMPTY_SYSTEM_HEALTH = {
  database_connection: 'CHECKING',
  data_quality_audit: {
    status: 'PASS',
    integrity_score_percentage: 0,
    audit_details: { total_records_scanned: 0 }
  }
};
const EMPTY_INSIGHTS = { peak_traffic: [], frequent_documents: [], utilized_assets: [] };

export default function OperationalAnalyticsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [routePerf, setRoutePerf] = useState(EMPTY_ROUTE_PERFORMANCE);
  const [systemHealth, setSystemHealth] = useState(EMPTY_SYSTEM_HEALTH);
  const [administrativeInsights, setAdministrativeInsights] = useState(EMPTY_INSIGHTS);
  const [bottleneckData, setBottleneckData] = useState([]);
  const [bottleneckSearch, setBottleneckSearch] = useState('');
  const [bottleneckSort, setBottleneckSort] = useState('desc');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [showAnalyticsReport, setShowAnalyticsReport] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const responses = await Promise.all([
          fetchWithAuth('/api/analytics/bottlenecks'),
          fetchWithAuth('/api/analytics/route-performance'),
          fetchWithAuth('/api/analytics/system-health'),
          fetchWithAuth('/api/analytics/administrative-insights')
        ]);
        const payloads = await Promise.all(responses.map(response => (
          response.ok ? response.json() : Promise.resolve(null)
        )));
        if (cancelled) return;

        const [bottlenecks, routes, health, insights] = payloads;
        if (bottlenecks) setBottleneckData(bottlenecks);
        if (routes) setRoutePerf(routes);
        if (health) setSystemHealth(health);
        if (insights) setAdministrativeInsights(insights);

        const failedCount = responses.filter(response => !response.ok).length;
        if (failedCount) {
          setLoadError(`${failedCount} analytics source${failedCount === 1 ? '' : 's'} could not be loaded.`);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError('The analytics service could not be reached. Please try again.');
          console.error('Error connecting to analytics services:', error);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadAnalytics();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const processedBottleneckData = useMemo(() => [...bottleneckData]
    .filter(item => (item.office_name || '').toLowerCase().includes(bottleneckSearch.toLowerCase()))
    .sort((left, right) => bottleneckSort === 'desc'
      ? Number(right.dwell_time_hours || 0) - Number(left.dwell_time_hours || 0)
      : Number(left.dwell_time_hours || 0) - Number(right.dwell_time_hours || 0))
    .slice(0, 5), [bottleneckData, bottleneckSearch, bottleneckSort]);

  return (
    <div className="space-y-4">
      {loadError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={() => setRefreshKey(value => value + 1)} className="w-fit rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold hover:bg-amber-100">Retry analytics</button>
        </div>
      )}
      <Suspense fallback={<div className="flex min-h-96 items-center justify-center text-sm font-bold text-gray-500">Loading analytics workspace…</div>}>
        <GSOOperationalAnalyticsTab
          auditStartDate={auditStartDate}
          setAuditStartDate={setAuditStartDate}
          auditEndDate={auditEndDate}
          setAuditEndDate={setAuditEndDate}
          handleGenerateAuditReport={() => setShowAnalyticsReport(true)}
          isAnalyticsLoading={isLoading}
          bottleneckSearch={bottleneckSearch}
          setBottleneckSearch={setBottleneckSearch}
          bottleneckSort={bottleneckSort}
          setBottleneckSort={setBottleneckSort}
          processedBottleneckData={processedBottleneckData}
          equipmentInventory={[]}
          demandTimeFilter={3}
          setDemandTimeFilter={() => {}}
          chartReadyDemandData={[]}
          systemHealth={systemHealth}
          routePerf={routePerf}
          administrativeInsights={administrativeInsights}
          analyticsScope="ict"
        />
      </Suspense>
      <AnalyticsReportModal
        open={showAnalyticsReport}
        onClose={() => setShowAnalyticsReport(false)}
        scope="ict"
        startDate={auditStartDate}
        setStartDate={setAuditStartDate}
        endDate={auditEndDate}
        setEndDate={setAuditEndDate}
        data={{ systemHealth }}
      />
    </div>
  );
}

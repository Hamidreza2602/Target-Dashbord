import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { metricsByKey, categoryLabels } from '../../data/metricDefinitions';
import { formatMetricValue, formatCurrency, formatPercent } from '../../utils/format';
import { exportToCSV } from '../../utils/csv';
import { FrameType, SegmentType, MetricStatus } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Download, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function ReportsPage() {
  const { targetPlans, targetVersions, actuals } = useAppStore();
  const [selectedPlanId, setSelectedPlanId] = useState(targetPlans.find(p => p.status === 'active')?.id || '');
  const [frameFilter, setFrameFilter] = useState<FrameType>('30d');
  const [segmentFilter, setSegmentFilter] = useState<SegmentType>('all');
  const [statusFilter, setStatusFilter] = useState<MetricStatus | 'all'>('all');

  const selectedPlan = targetPlans.find(p => p.id === selectedPlanId);
  const activeVersion = targetVersions.find(v => v.id === selectedPlan?.activeVersionId);

  const reportCards = useMemo(() => {
    if (!activeVersion) return [];
    const now = new Date().toISOString().substring(0, 7);

    return activeVersion.metrics.map(tm => {
      const def = metricsByKey[tm.metricKey];
      const metricActuals = actuals
        .filter(a => a.metricKey === tm.metricKey && a.frameType === frameFilter && a.segmentType === segmentFilter)
        .sort((a, b) => a.date.localeCompare(b.date));

      const actual = metricActuals.length > 0 ? metricActuals[metricActuals.length - 1].value : tm.baselineValue;
      const periods = [...tm.periods].sort((a, b) => a.periodMonth.localeCompare(b.periodMonth));

      // Expected to date with interpolation
      let expectedToDate = tm.baselineValue;
      for (const p of periods) {
        if (p.periodMonth <= now) expectedToDate = p.targetValue;
      }

      const attainmentFinal = tm.finalTargetValue !== 0 ? (actual / tm.finalTargetValue) * 100 : 0;
      const attainmentExpected = expectedToDate !== 0 ? (actual / expectedToDate) * 100 : 0;
      const varianceToFinal = actual - tm.finalTargetValue;
      const varianceToExpected = actual - expectedToDate;
      const variancePctExpected = expectedToDate !== 0 ? (varianceToExpected / expectedToDate) * 100 : 0;

      // Status with directionality
      let adjustedAttainment = attainmentExpected;
      if (tm.directionality === 'lower_better') {
        adjustedAttainment = expectedToDate !== 0 ? (expectedToDate / actual) * 100 : 100;
      }
      let status: MetricStatus;
      if (adjustedAttainment > 105) status = 'ahead';
      else if (adjustedAttainment >= 95) status = 'on_track';
      else status = 'behind';

      // Simple projection: extrapolate from current trend
      const progress = periods.length > 0
        ? periods.findIndex(p => p.periodMonth > now) / periods.length
        : 0.5;
      const projectedEnd = actual + (actual - tm.baselineValue) * ((1 - progress) / Math.max(0.01, progress));

      return {
        metricKey: tm.metricKey,
        metricName: def?.name || tm.metricKey,
        category: def?.category || 'count',
        actual,
        finalTarget: tm.finalTargetValue,
        expectedToDate,
        attainmentVsFinal: attainmentFinal,
        attainmentVsExpected: attainmentExpected,
        varianceToFinal,
        varianceToExpected,
        variancePctExpected,
        status,
        projectedEndValue: projectedEnd,
        directionality: tm.directionality,
        unit: def?.unit || 'count',
        historicalData: metricActuals,
        targetPeriods: periods,
      };
    });
  }, [activeVersion, actuals, frameFilter, segmentFilter]);

  const filteredCards = statusFilter === 'all'
    ? reportCards
    : reportCards.filter(c => c.status === statusFilter);

  const ahead = reportCards.filter(c => c.status === 'ahead').length;
  const onTrack = reportCards.filter(c => c.status === 'on_track').length;
  const behind = reportCards.filter(c => c.status === 'behind').length;

  const pieData = [
    { name: 'Ahead', value: ahead, color: '#10b981' },
    { name: 'On Track', value: onTrack, color: '#3b82f6' },
    { name: 'Behind', value: behind, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const handleExport = () => {
    const data = filteredCards.map(c => ({
      Metric: c.metricName,
      Actual: c.actual,
      'Final Target': c.finalTarget,
      'Expected to Date': c.expectedToDate,
      'Variance to Final': c.varianceToFinal,
      'Variance to Expected (%)': c.variancePctExpected.toFixed(1),
      'Attainment (%)': c.attainmentVsFinal.toFixed(1),
      Status: c.status,
      Projection: c.projectedEndValue,
    }));
    exportToCSV(data, 'target-report.csv');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Report</h1>
          <p className="text-sm text-gray-500 mt-1">Track actual performance against targets</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex items-center gap-6 flex-wrap">
        <div>
          <label className="text-xs text-gray-500 font-medium">Target Plan</label>
          <select className="input-field block mt-1" value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)}>
            {targetPlans.filter(p => p.status === 'active' || p.status === 'draft').map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">Frame</label>
          <select className="input-field block mt-1" value={frameFilter} onChange={e => setFrameFilter(e.target.value as FrameType)}>
            <option value="7d">7 Day</option>
            <option value="30d">30 Day</option>
            <option value="90d">90 Day</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">Segment</label>
          <select className="input-field block mt-1" value={segmentFilter} onChange={e => setSegmentFilter(e.target.value as SegmentType)}>
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="old">Old</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">Status</label>
          <select className="input-field block mt-1" value={statusFilter} onChange={e => setStatusFilter(e.target.value as MetricStatus | 'all')}>
            <option value="all">All</option>
            <option value="ahead">Ahead</option>
            <option value="on_track">On Track</option>
            <option value="behind">Behind</option>
          </select>
        </div>
        {activeVersion && (
          <div className="ml-auto text-right text-xs text-gray-400">
            <p>Version: v{activeVersion.versionNumber}</p>
            <p>{activeVersion.startDate.substring(0, 7)} to {activeVersion.endDate.substring(0, 7)}</p>
            {activeVersion.revisionNote && <p className="text-blue-500">{activeVersion.revisionNote}</p>}
          </div>
        )}
      </div>

      {!activeVersion ? (
        <div className="card p-12 text-center text-gray-400">
          No active target plan selected
        </div>
      ) : (
        <>
          {/* Executive Summary */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-xs text-gray-500">Tracked Metrics</p>
              <p className="text-3xl font-bold">{reportCards.length}</p>
            </div>
            <div className="card p-4 cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('ahead')}>
              <p className="text-xs text-gray-500">Ahead</p>
              <p className="text-3xl font-bold text-emerald-600">{ahead}</p>
            </div>
            <div className="card p-4 cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('on_track')}>
              <p className="text-xs text-gray-500">On Track</p>
              <p className="text-3xl font-bold text-blue-600">{onTrack}</p>
            </div>
            <div className="card p-4 cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('behind')}>
              <p className="text-xs text-gray-500">Behind</p>
              <p className="text-3xl font-bold text-red-600">{behind}</p>
            </div>
            <div className="card p-4 flex items-center justify-center">
              <ResponsiveContainer width={100} height={80}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={20} outerRadius={35}>
                    {pieData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {filteredCards.map(card => (
              <div key={card.metricKey} className="metric-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">{card.metricName}</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatMetricValue(card.actual, card.unit)}
                    </p>
                  </div>
                  <StatusBadge status={card.status} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Final Target</span>
                    <p className="font-medium">{formatMetricValue(card.finalTarget, card.unit)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Expected Today</span>
                    <p className="font-medium">{formatMetricValue(card.expectedToDate, card.unit)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Attainment</span>
                    <p className="font-medium">{card.attainmentVsFinal.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Variance</span>
                    <p className={`font-medium flex items-center gap-1 ${
                      (card.directionality === 'higher_better' ? card.varianceToExpected >= 0 : card.varianceToExpected <= 0)
                        ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {card.variancePctExpected >= 0 ? '+' : ''}{card.variancePctExpected.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
                  <span className="text-gray-500">Projected End</span>
                  <p className="font-semibold">{formatMetricValue(card.projectedEndValue, card.unit)}</p>
                </div>

                {/* Mini chart: actual vs target */}
                {card.targetPeriods.length > 0 && (
                  <div className="mt-3">
                    <ResponsiveContainer width="100%" height={80}>
                      <LineChart data={card.targetPeriods.map(p => {
                        const actualObs = card.historicalData.find(a => a.date === p.periodMonth);
                        return {
                          month: p.periodMonth.substring(5),
                          target: p.targetValue,
                          actual: actualObs?.value ?? null,
                        };
                      })}>
                        <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                        <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Full Table */}
          <div className="card overflow-x-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Detailed Metric Table</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Metric</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Actual</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Final Target</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Expected</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Var. to Final</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Var. to Expected</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Attainment</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Projection</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map(c => (
                  <tr key={c.metricKey} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{c.metricName}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatMetricValue(c.actual, c.unit)}</td>
                    <td className="px-4 py-2.5 text-right">{formatMetricValue(c.finalTarget, c.unit)}</td>
                    <td className="px-4 py-2.5 text-right">{formatMetricValue(c.expectedToDate, c.unit)}</td>
                    <td className="px-4 py-2.5 text-right">{formatMetricValue(c.varianceToFinal, c.unit)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${
                      (c.directionality === 'higher_better' ? c.varianceToExpected >= 0 : c.varianceToExpected <= 0)
                        ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {c.variancePctExpected >= 0 ? '+' : ''}{c.variancePctExpected.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2.5 text-right">{c.attainmentVsFinal.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-center"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-2.5 text-right">{formatMetricValue(c.projectedEndValue, c.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            {filteredCards.slice(0, 4).map(card => (
              <div key={card.metricKey} className="card p-5">
                <h3 className="text-sm font-semibold mb-3">{card.metricName}: Actual vs Target</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={card.targetPeriods.map(p => {
                    const actualObs = card.historicalData.find(a => a.date === p.periodMonth);
                    return {
                      month: p.periodMonth.substring(5),
                      Target: p.targetValue,
                      Actual: actualObs?.value ?? null,
                    };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="Actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import { TargetVersion, TargetMetric, Objective, MetricStatus } from '../../../types';
import { formatMetricValue } from '../../../utils/format';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

interface MetricReport {
  metric: TargetMetric;
  actual: number | null;
  expectedToDate: number;
  variancePct: number;
  attainmentPct: number;
  status: MetricStatus;
}

function computeReport(metric: TargetMetric): MetricReport {
  const now = format(new Date(), 'yyyy-MM');
  const pastPeriods = metric.periods.filter(p => p.periodMonth <= now);
  const latestActualPeriod = [...pastPeriods].reverse().find(p => p.actualValue !== null);
  const actual = latestActualPeriod?.actualValue ?? null;

  // Expected = last target value up to now
  let expectedToDate = metric.baselineValue;
  for (const p of metric.periods) {
    if (p.periodMonth <= now) expectedToDate = p.targetValue;
  }

  const actualOrBaseline = actual ?? metric.baselineValue;
  let adjustedAttainment: number;
  if (metric.directionality === 'lower_better') {
    adjustedAttainment = actualOrBaseline !== 0 ? (expectedToDate / actualOrBaseline) * 100 : 100;
  } else {
    adjustedAttainment = expectedToDate !== 0 ? (actualOrBaseline / expectedToDate) * 100 : 100;
  }

  const variance = actualOrBaseline - expectedToDate;
  const variancePct = expectedToDate !== 0 ? (variance / expectedToDate) * 100 : 0;

  let status: MetricStatus;
  if (adjustedAttainment > 105) status = 'ahead';
  else if (adjustedAttainment >= 95) status = 'on_track';
  else status = 'behind';

  return { metric, actual, expectedToDate, variancePct, attainmentPct: adjustedAttainment, status };
}

function getObjectiveStatus(reports: MetricReport[]): { status: MetricStatus; pct: number } {
  if (reports.length === 0) return { status: 'on_track', pct: 100 };
  const good = reports.filter(r => r.status === 'ahead' || r.status === 'on_track').length;
  const pct = (good / reports.length) * 100;
  if (pct >= 90) return { status: 'ahead', pct };
  if (pct >= 70) return { status: 'on_track', pct };
  return { status: 'behind', pct };
}

const statusColors = {
  ahead: 'bg-emerald-100 text-emerald-700',
  on_track: 'bg-blue-100 text-blue-700',
  behind: 'bg-red-100 text-red-700',
};
const statusLabels = { ahead: 'Ahead', on_track: 'On Track', behind: 'Behind' };

export default function TargetReportTab({ version }: { version: TargetVersion }) {
  // Build reports for all metrics
  const allReports = version.metrics.map(computeReport);
  const reportsByObj: Record<string, MetricReport[]> = {};
  for (const r of allReports) {
    const objId = r.metric.objectiveId;
    if (!reportsByObj[objId]) reportsByObj[objId] = [];
    reportsByObj[objId].push(r);
  }

  // Overall stats
  const total = allReports.length;
  const ahead = allReports.filter(r => r.status === 'ahead').length;
  const onTrack = allReports.filter(r => r.status === 'on_track').length;
  const behind = allReports.filter(r => r.status === 'behind').length;

  return (
    <div className="space-y-6">
      {/* Objective Cards - Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {version.objectives.map(obj => {
          const reports = reportsByObj[obj.id] || [];
          const { status, pct } = getObjectiveStatus(reports);
          return (
            <div key={obj.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: obj.color }} />
                <h4 className="text-xs font-medium text-gray-600 line-clamp-1">{obj.name}</h4>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{Math.round(pct)}%</p>
                  <p className="text-[10px] text-gray-400">{reports.length} KRs on track</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[status]}`}>
                  {statusLabels[status]}
                </span>
              </div>
              {/* Mini progress bar */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${status === 'ahead' ? 'bg-emerald-500' : status === 'on_track' ? 'bg-blue-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">Total KRs</p>
          <p className="text-xl font-bold">{total}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">Ahead</p>
          <p className="text-xl font-bold text-emerald-600">{ahead}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">On Track</p>
          <p className="text-xl font-bold text-blue-600">{onTrack}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">Behind</p>
          <p className="text-xl font-bold text-red-600">{behind}</p>
        </div>
      </div>

      {/* Per-Objective Detail */}
      {version.objectives.map(obj => {
        const reports = reportsByObj[obj.id] || [];
        if (reports.length === 0) return null;
        const metrics = reports.map(r => r.metric);
        const now = format(new Date(), 'yyyy-MM');

        // Build chart data: actual vs target for each metric
        const chartData = metrics[0].periods.map((p, i) => {
          const point: Record<string, any> = { month: p.periodMonth.substring(5) };
          metrics.forEach(m => {
            point[`${m.displayName} Target`] = m.periods[i]?.targetValue;
            point[`${m.displayName} Actual`] = m.periods[i]?.actualValue ?? null;
          });
          return point;
        });

        return (
          <div key={obj.id} className="card overflow-hidden">
            <div className="p-4 border-b flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: obj.color }} />
              <h3 className="font-semibold text-sm">{obj.name}</h3>
            </div>

            {/* Chart */}
            <div className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {metrics.map((m, i) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                    const color = colors[i % colors.length];
                    return [
                      <Line
                        key={`${m.id}-target`}
                        type="monotone"
                        dataKey={`${m.displayName} Target`}
                        stroke={color}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                        connectNulls
                      />,
                      <Line
                        key={`${m.id}-actual`}
                        type="monotone"
                        dataKey={`${m.displayName} Actual`}
                        stroke={color}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        connectNulls
                      />,
                    ];
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Table */}
            <table className="w-full text-sm border-t">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Key Result</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Actual</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Expected</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Target</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Var %</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => {
                  const isGoodVariance = r.metric.directionality === 'higher_better'
                    ? r.variancePct >= 0
                    : r.variancePct <= 0;
                  return (
                    <tr key={r.metric.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{r.metric.displayName}</td>
                      <td className="px-4 py-2 text-right">
                        {r.actual !== null ? formatMetricValue(r.actual, r.metric.unit) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2 text-right">{formatMetricValue(r.expectedToDate, r.metric.unit)}</td>
                      <td className="px-4 py-2 text-right">{formatMetricValue(r.metric.finalTargetValue, r.metric.unit)}</td>
                      <td className={`px-4 py-2 text-right ${isGoodVariance ? 'text-emerald-600' : 'text-red-600'}`}>
                        {r.actual !== null ? `${r.variancePct >= 0 ? '+' : ''}${r.variancePct.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[r.status]}`}>
                          {statusLabels[r.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

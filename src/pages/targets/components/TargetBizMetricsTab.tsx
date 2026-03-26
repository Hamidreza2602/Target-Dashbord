import { TargetVersion } from '../../../types';
import { useAppStore } from '../../../store/appStore';
import { formatMetricValue } from '../../../utils/format';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertCircle } from 'lucide-react';

const BIZ_OBJ_ID = 'obj-biz-metrics';

export default function TargetBizMetricsTab({ version }: { version: TargetVersion }) {
  const { updateActualValue } = useAppStore();
  const bizObj = version.objectives.find(o => o.id === BIZ_OBJ_ID);
  const bizMetrics = version.metrics.filter(m => m.objectiveId === BIZ_OBJ_ID);
  const now = format(new Date(), 'yyyy-MM');

  if (!bizObj || bizMetrics.length === 0) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
        <h3 className="font-semibold text-gray-700 mb-1">No Business Metrics Yet</h3>
        <p className="text-sm text-gray-500">
          Go to <strong>Simulator</strong>, adjust drivers until you're happy with the forecast, then click <strong>"Convert to Target"</strong> to push the forecast here.
        </p>
      </div>
    );
  }

  // Build chart data
  const chartData = bizMetrics[0].periods.map((p, i) => {
    const point: Record<string, any> = { month: p.periodMonth.substring(5) };
    bizMetrics.forEach(m => {
      point[`${m.displayName} Target`] = m.periods[i]?.targetValue;
      if (m.periods[i]?.actualValue !== null) {
        point[`${m.displayName} Actual`] = m.periods[i]?.actualValue;
      }
    });
    return point;
  });

  // Split into revenue metrics and count metrics for separate charts
  const revenueMetrics = bizMetrics.filter(m => m.unit === 'currency');
  const countMetrics = bizMetrics.filter(m => m.unit === 'count');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {bizMetrics.slice(0, 5).map(m => {
          const last = m.periods[m.periods.length - 1];
          const currentPeriod = m.periods.find(p => p.periodMonth <= now);
          const latestActual = [...m.periods].reverse().find(p => p.actualValue !== null);
          return (
            <div key={m.id} className="card p-3">
              <p className="text-[10px] text-gray-500 font-medium">{m.displayName}</p>
              <p className="text-lg font-bold mt-0.5">
                {formatMetricValue(last?.targetValue || 0, m.unit)}
              </p>
              <p className="text-[10px] text-gray-400">
                {formatMetricValue(m.baselineValue, m.unit)} → {formatMetricValue(m.finalTargetValue, m.unit)}
              </p>
              {latestActual?.actualValue !== undefined && latestActual?.actualValue !== null && (
                <p className="text-[10px] text-blue-600 mt-0.5">
                  Actual: {formatMetricValue(latestActual.actualValue, m.unit)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      {revenueMetrics.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-3">Revenue Targets vs Actuals</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {revenueMetrics.map((m, i) => {
                const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];
                const color = colors[i % colors.length];
                return [
                  <Line key={`${m.id}-t`} type="monotone" dataKey={`${m.displayName} Target`} stroke={color} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />,
                  <Line key={`${m.id}-a`} type="monotone" dataKey={`${m.displayName} Actual`} stroke={color} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />,
                ];
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Count Chart */}
      {countMetrics.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-3">User & Growth Targets vs Actuals</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {countMetrics.map((m, i) => {
                const colors = ['#ef4444', '#06b6d4', '#f59e0b', '#8b5cf6'];
                const color = colors[i % colors.length];
                return [
                  <Line key={`${m.id}-t`} type="monotone" dataKey={`${m.displayName} Target`} stroke={color} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />,
                  <Line key={`${m.id}-a`} type="monotone" dataKey={`${m.displayName} Actual`} stroke={color} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />,
                ];
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Actuals Entry Grid */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-sm">Monthly Targets & Actuals</h3>
          <p className="text-xs text-gray-500">Enter actual values for past months</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-3 py-2 font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[70px]">Month</th>
                {bizMetrics.map(m => (
                  <th key={m.id} className="text-center px-2 py-2 font-medium text-gray-600 min-w-[110px]">
                    <div className="text-[10px]">{m.displayName}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bizMetrics[0]?.periods.map((_, pi) => {
                const periodMonth = bizMetrics[0].periods[pi].periodMonth;
                const isPast = periodMonth <= now;
                return (
                  <tr key={periodMonth} className={`border-t border-gray-100 ${periodMonth === now ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-3 py-1.5 font-medium sticky left-0 bg-white text-xs text-gray-600">
                      {periodMonth.substring(2).replace('-', '/')}
                    </td>
                    {bizMetrics.map(m => {
                      const period = m.periods[pi];
                      if (!period) return <td key={m.id} />;
                      const actual = period.actualValue;
                      const target = period.targetValue;
                      const isGood = actual !== null && actual >= target;
                      const isBad = actual !== null && actual < target;
                      return (
                        <td key={m.id} className="px-2 py-1 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <input
                              type="number"
                              disabled={!isPast}
                              className={`w-20 text-center text-xs border rounded px-1 py-0.5
                                ${!isPast ? 'bg-gray-50 text-gray-300 border-gray-100' :
                                  isBad ? 'border-red-300 bg-red-50 text-red-700' :
                                  isGood ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
                                  'border-gray-200'}`}
                              value={actual ?? ''}
                              placeholder={isPast ? '—' : ''}
                              onChange={e => {
                                const v = e.target.value === '' ? null : parseFloat(e.target.value);
                                updateActualValue(version.id, m.id, period.periodMonth, v);
                              }}
                            />
                            <span className="text-[9px] text-gray-400">{formatMetricValue(target, m.unit)}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

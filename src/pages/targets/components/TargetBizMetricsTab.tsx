import { TargetVersion, TargetMetric, MetricStatus } from '../../../types';
import { useAppStore } from '../../../store/appStore';
import { formatMetricValue, formatCurrency, formatNumber, formatPercent } from '../../../utils/format';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, Users, DollarSign, Target, BarChart3 } from 'lucide-react';

const BIZ_OBJ_ID = 'obj-biz-metrics';
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtMonth(yyyymm: string) {
  const [y, m] = yyyymm.split('-');
  return `${MONTH_SHORT[parseInt(m) - 1]} ${y.slice(2)}`;
}

// Status helpers (reused from TargetReportTab)
function computeMetricStatus(metric: TargetMetric): MetricStatus {
  const now = format(new Date(), 'yyyy-MM');
  const pastPeriods = metric.periods.filter(p => p.periodMonth <= now);
  const latestActual = [...pastPeriods].reverse().find(p => p.actualValue !== null);
  const actual = latestActual?.actualValue ?? metric.baselineValue;
  let expected = metric.baselineValue;
  for (const p of metric.periods) { if (p.periodMonth <= now) expected = p.targetValue; }
  const att = metric.directionality === 'lower_better'
    ? (actual !== 0 ? (expected / actual) * 100 : 100)
    : (expected !== 0 ? (actual / expected) * 100 : 100);
  if (att > 105) return 'ahead';
  if (att >= 95) return 'on_track';
  return 'behind';
}

const statusColors: Record<MetricStatus, string> = {
  ahead: 'bg-emerald-100 text-emerald-700',
  on_track: 'bg-blue-100 text-blue-700',
  behind: 'bg-red-100 text-red-700',
};
const statusLabels: Record<MetricStatus, string> = { ahead: 'Ahead', on_track: 'On Track', behind: 'Behind' };

export default function TargetBizMetricsTab({ version }: { version: TargetVersion }) {
  const { updateActualValue, forecastMonths } = useAppStore();
  const bizObj = version.objectives.find(o => o.id === BIZ_OBJ_ID);
  const bizMetrics = version.metrics.filter(m => m.objectiveId === BIZ_OBJ_ID);
  const allMetrics = version.metrics;
  const now = format(new Date(), 'yyyy-MM');
  const hasForecast = forecastMonths.length > 0;
  const first = forecastMonths[0];
  const last = forecastMonths[forecastMonths.length - 1];

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

  // ── OKR health ──
  const metricStatuses = allMetrics.map(m => computeMetricStatus(m));
  const aheadCount = metricStatuses.filter(s => s === 'ahead').length;
  const onTrackCount = metricStatuses.filter(s => s === 'on_track').length;
  const behindCount = metricStatuses.filter(s => s === 'behind').length;

  // ── Forecast chart data ──
  const pctChartData = hasForecast ? forecastMonths.map(m => ({
    month: fmtMonth(m.month),
    NRR: Math.round(m.nrr * 10) / 10,
    GRR: Math.round(m.grr * 10) / 10,
    'Conv New': Math.round(m.userConversionRateNew * 10) / 10,
    'Conv Old': Math.round(m.conversionRateOld * 10) / 10,
    'Churn Old': Math.round(m.paidChurnRateOld * 10) / 10,
    'Churn New': Math.round(m.paidChurnRateNew * 10) / 10,
  })) : [];

  const currChartData = hasForecast ? forecastMonths.map(m => ({
    month: fmtMonth(m.month),
    'MRR Recurring': m.mrrRecurring,
    'MRR Preorder': m.mrrPreorder,
    'MRR SMS': m.mrrSMS,
    'Total Revenue': m.totalRevenue,
  })) : [];

  const countChartData = hasForecast ? forecastMonths.map(m => ({
    month: fmtMonth(m.month),
    Customers: m.customers,
    'Free Users': m.freeUsers,
    Installs: m.installs,
    'New Paid': m.newCustomers,
    Churned: m.oldPaidChurned,
  })) : [];

  const pctChange = (a: number, b: number) => b !== 0 ? ((a - b) / Math.abs(b) * 100) : 0;

  return (
    <div className="space-y-6">

      {/* ════════════════════ SECTION 1: OVERVIEW ════════════════════ */}
      <div className="card p-5">
        <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-blue-600" /> Strategy Overview
        </h3>

        {/* Highlight cards */}
        {hasForecast && first && last && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <HighlightCard
              icon={<DollarSign size={16} />}
              label="Revenue Growth"
              value={formatCurrency(last.totalRevenue)}
              sub={`${formatCurrency(first.totalRevenue)} → ${formatCurrency(last.totalRevenue)}`}
              change={pctChange(last.totalRevenue, first.totalRevenue)}
            />
            <HighlightCard
              icon={<Users size={16} />}
              label="Customer Growth"
              value={formatNumber(last.customers)}
              sub={`${formatNumber(first.customers)} → ${formatNumber(last.customers)}`}
              change={pctChange(last.customers, first.customers)}
            />
            <HighlightCard
              icon={<TrendingUp size={16} />}
              label="End NRR"
              value={`${last.nrr.toFixed(1)}%`}
              sub={`${first.nrr.toFixed(1)}% → ${last.nrr.toFixed(1)}%`}
              change={last.nrr - first.nrr}
              isAbsolute
            />
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target size={16} className="text-gray-500" />
                <span className="text-[10px] text-gray-500 font-medium">OKR Health</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">{aheadCount} Ahead</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">{onTrackCount} On Track</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">{behindCount} Behind</span>
              </div>
              <p className="text-[9px] text-gray-400 mt-1">{allMetrics.length} Key Results across {version.objectives.length} objectives</p>
            </div>
          </div>
        )}

        {/* Two columns: OKR Targets + Business KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* OKR Targets at a glance — with KR targets and variance */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">OKR Targets</h4>
            <div className="space-y-3">
              {version.objectives.map(obj => {
                const objMetrics = allMetrics.filter(m => m.objectiveId === obj.id);
                const objStatuses = objMetrics.map(m => computeMetricStatus(m));
                const good = objStatuses.filter(s => s === 'ahead' || s === 'on_track').length;
                return (
                  <div key={obj.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: obj.color }} />
                      <span className="text-[10px] font-semibold text-gray-700 truncate">{obj.name}</span>
                      <span className="text-[9px] text-gray-400 shrink-0 ml-auto">{good}/{objMetrics.length}</span>
                    </div>
                    <div className="ml-4 space-y-0.5">
                      {objMetrics.map(m => {
                        const st = computeMetricStatus(m);
                        const latestActual = [...m.periods].reverse().find(p => p.actualValue !== null);
                        const actual = latestActual?.actualValue;
                        const expectedNow = (() => {
                          let exp = m.baselineValue;
                          for (const p of m.periods) { if (p.periodMonth <= now) exp = p.targetValue; }
                          return exp;
                        })();
                        const variance = actual != null && expectedNow !== 0
                          ? ((actual - expectedNow) / Math.abs(expectedNow)) * 100
                          : null;
                        return (
                          <div key={m.id} className="flex items-center gap-1 text-[9px]">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st === 'ahead' ? 'bg-emerald-500' : st === 'on_track' ? 'bg-blue-500' : 'bg-red-500'}`} />
                            <span className="text-gray-600 truncate flex-1">{m.displayName}</span>
                            <span className="text-gray-400 shrink-0">{formatMetricValue(m.baselineValue, m.unit)}</span>
                            <span className="text-gray-300 shrink-0">→</span>
                            <span className="text-gray-800 font-bold shrink-0">{formatMetricValue(m.finalTargetValue, m.unit)}</span>
                            {variance !== null && (
                              <span className={`font-bold shrink-0 ${variance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {variance >= 0 ? '+' : ''}{variance.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Business KPIs at a glance */}
          {hasForecast && first && last && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Business KPIs (Forecast)</h4>
              <div className="space-y-1.5">
                {[
                  { label: 'Total Revenue', start: first.totalRevenue, end: last.totalRevenue, fmt: formatCurrency },
                  { label: 'Customers', start: first.customers, end: last.customers, fmt: formatNumber },
                  { label: 'Free Users', start: first.freeUsers, end: last.freeUsers, fmt: formatNumber },
                  { label: 'NRR', start: first.nrr, end: last.nrr, fmt: (v: number) => `${v.toFixed(1)}%` },
                  { label: 'GRR', start: first.grr, end: last.grr, fmt: (v: number) => `${v.toFixed(1)}%` },
                  { label: 'ARPU', start: first.arpuRecurring, end: last.arpuRecurring, fmt: formatCurrency },
                ].map(kpi => {
                  const ch = pctChange(kpi.end, kpi.start);
                  return (
                    <div key={kpi.label} className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-600">{kpi.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{kpi.fmt(kpi.start)}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-800 font-bold">{kpi.fmt(kpi.end)}</span>
                        <span className={`font-bold ${ch >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {ch >= 0 ? '+' : ''}{ch.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════ SECTION 2: SUMMARY CARDS ════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {bizMetrics.slice(0, 5).map(m => {
          const lastP = m.periods[m.periods.length - 1];
          const latestActual = [...m.periods].reverse().find(p => p.actualValue !== null);
          return (
            <div key={m.id} className="card p-3">
              <p className="text-[10px] text-gray-500 font-medium">{m.displayName}</p>
              <p className="text-lg font-bold mt-0.5">
                {formatMetricValue(lastP?.targetValue || 0, m.unit)}
              </p>
              <p className="text-[10px] text-gray-400">
                {formatMetricValue(m.baselineValue, m.unit)} → {formatMetricValue(m.finalTargetValue, m.unit)}
              </p>
              {latestActual?.actualValue != null && (
                <p className="text-[10px] text-blue-600 mt-0.5">
                  Actual: {formatMetricValue(latestActual.actualValue, m.unit)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ════════════════════ SECTION 3: THREE TYPED CHARTS ════════════════════ */}
      {hasForecast && (
        <>
          {/* Percentage Chart */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Rates & Retention (%)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={pctChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="NRR" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="GRR" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Conv New" stroke="#10b981" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Conv Old" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Churn Old" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="Churn New" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Currency Chart */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Revenue Streams ($)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={currChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Total Revenue" stroke="#1e40af" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="MRR Recurring" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="MRR Preorder" stroke="#10b981" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="MRR SMS" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Count Chart */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Users & Growth (#)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={countChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatNumber(v)} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => formatNumber(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="Customers" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Free Users" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Installs" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="New Paid" stroke="#10b981" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Churned" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ════════════════════ SECTION 4: FORECAST OUTPUT TABLE ════════════════════ */}
      {hasForecast && (
        <div className="card overflow-x-auto">
          <div className="px-5 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold">Monthly Forecast Output</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-600 sticky left-0 bg-gray-50">Month</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Customers</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Free Users</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">MRR Rec</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Preorder</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">SMS</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Total Rev</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">ARPU</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">NRR</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">New Paid</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Churned</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600">Installs</th>
              </tr>
            </thead>
            <tbody>
              {forecastMonths.map(m => (
                <tr key={m.month} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium sticky left-0 bg-white">{fmtMonth(m.month)}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(m.customers)}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(m.freeUsers)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(m.mrrRecurring)}</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{formatCurrency(m.mrrPreorder)}</td>
                  <td className="px-4 py-2 text-right text-purple-600">{formatCurrency(m.mrrSMS)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(m.totalRevenue)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(m.arpuRecurring)}</td>
                  <td className="px-4 py-2 text-right">{m.nrr.toFixed(1)}%</td>
                  <td className="px-4 py-2 text-right text-emerald-600">{formatNumber(m.newCustomers)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatNumber(m.oldPaidChurned)}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(m.installs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ════════════════════ SECTION 5: ACTUALS ENTRY GRID ════════════════════ */}
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

// ── Helper sub-component ──
function HighlightCard({ icon, label, value, sub, change, isAbsolute }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  change: number; isAbsolute?: boolean;
}) {
  const isPositive = change >= 0;
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-gray-500">{icon}</span>
        <span className="text-[10px] text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-[9px] text-gray-400">{sub}</span>
        <span className={`text-[9px] font-bold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{isAbsolute ? `${change.toFixed(1)}pp` : `${change.toFixed(1)}%`}
        </span>
      </div>
    </div>
  );
}

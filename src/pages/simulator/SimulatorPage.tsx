import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { inputDrivers } from '../../data/metricDefinitions';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/format';
import { exportToCSV, forecastToCSVData } from '../../utils/csv';
import { categoryLabels } from '../../data/metricDefinitions';
import { DriverConfig, MetricCategory } from '../../types';
import { format, parse } from 'date-fns';
import { DRIVER_HISTORY, computeTrend } from '../../data/driverHistory';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Save, Copy, Download, RefreshCw, Target, AlertTriangle, ChevronDown, ChevronRight,
  RotateCcw,
} from 'lucide-react';

const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-');
  return `${MONTH_SHORT_NAMES[parseInt(m) - 1]} ${y.slice(2)}`;
}

export default function SimulatorPage() {
  const {
    forecastMonths, forecastWarnings, drivers, forecastStartDate, forecastEndDate,
    updateDriver, updateDriverMonth, batchUpdateDriverMonths, resetAllDrivers,
    resetDriverMonth, setForecastDates, runSimulation,
    scenarios, activeScenarioId, saveScenario, duplicateScenario, createTargetFromScenario,
    currentUser,
  } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['growth_adoption', 'conversion', 'retention_churn', 'monetization', 'expansion_contraction', 'cost'])
  );
  const [showMonthlyEditor, setShowMonthlyEditor] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCategories);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    setExpandedCategories(next);
  };

  // Group drivers by category
  const driversByCategory = useMemo(() => {
    const groups: Record<string, DriverConfig[]> = {};
    for (const d of Object.values(drivers)) {
      if (!groups[d.category]) groups[d.category] = [];
      groups[d.category].push(d);
    }
    return groups;
  }, [drivers]);

  const chartData = forecastMonths.map(m => ({
    month: formatMonthLabel(m.month),
    'MRR Recurring': m.mrrRecurring,
    'MRR Preorder': m.mrrPreorder,
    'MRR SMS': m.mrrSMS,
    'Total Revenue': m.totalRevenue,
    Customers: m.customers,
    'Free Users': m.freeUsers,
    NRR: m.nrr,
    GRR: m.grr,
    ARPU: m.arpuRecurring,
    'New Customers': m.newCustomers,
    'Old Customers': m.oldCustomers,
  }));

  const lastMonth = forecastMonths[forecastMonths.length - 1];
  const firstMonth = forecastMonths[0];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Simulator</h1>
          <p className="text-sm text-gray-500 mt-1">Model future outcomes by adjusting business drivers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => resetAllDrivers()} className="btn-secondary flex items-center gap-1.5">
            <RefreshCw size={15} /> Reset
          </button>
          <button onClick={() => setShowSaveModal(true)} className="btn-secondary flex items-center gap-1.5">
            <Save size={15} /> Save
          </button>
          <button onClick={() => activeScenarioId && duplicateScenario(activeScenarioId)} className="btn-secondary flex items-center gap-1.5">
            <Copy size={15} /> Duplicate
          </button>
          <button onClick={() => exportToCSV(forecastToCSVData(forecastMonths), 'forecast.csv')} className="btn-secondary flex items-center gap-1.5">
            <Download size={15} /> CSV
          </button>
          {isAdmin && (
            <button onClick={() => setShowTargetModal(true)} className="btn-primary flex items-center gap-1.5">
              <Target size={15} /> Convert to Target
            </button>
          )}
        </div>
      </div>

      {/* Date Controls */}
      <div className="card p-4 mb-5 flex items-center gap-6">
        <div>
          <label className="text-xs text-gray-500 font-medium">Start Date</label>
          <input type="month" value={forecastStartDate} onChange={e => setForecastDates(e.target.value, forecastEndDate)} className="input-field block mt-1" />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">End Date</label>
          <input type="month" value={forecastEndDate} onChange={e => setForecastDates(forecastStartDate, e.target.value)} className="input-field block mt-1" />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">Scenario</label>
          <select className="input-field block mt-1" value={activeScenarioId || ''} onChange={e => useAppStore.getState().setActiveScenario(e.target.value)}>
            {scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="ml-auto text-right">
          <span className="text-xs text-gray-500">{forecastMonths.length} months forecast</span>
          {forecastWarnings.length > 0 && (
            <div className="flex items-center gap-1 text-amber-600 text-xs mt-1">
              <AlertTriangle size={13} /> {forecastWarnings.length} warning(s)
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {lastMonth && firstMonth && (
        <div className="grid grid-cols-5 gap-4 mb-5">
          {/* Total MRR with stream breakdown */}
          <div className="card p-4">
            <p className="text-xs text-gray-500 font-medium">Total MRR</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(lastMonth.totalRevenue)}</p>
            <p className={`text-xs mt-1 ${((lastMonth.totalRevenue - firstMonth.totalRevenue) / Math.max(1, firstMonth.totalRevenue) * 100) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {((lastMonth.totalRevenue - firstMonth.totalRevenue) / Math.max(1, firstMonth.totalRevenue) * 100) >= 0 ? '+' : ''}
              {((lastMonth.totalRevenue - firstMonth.totalRevenue) / Math.max(1, firstMonth.totalRevenue) * 100).toFixed(1)}% over period
            </p>
            <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-0.5 text-[10px] text-gray-500">
              <div className="flex justify-between"><span>Recurring</span><span className="font-semibold text-gray-700">{formatCurrency(lastMonth.mrrRecurring)}</span></div>
              <div className="flex justify-between"><span>Preorder</span><span className="font-semibold text-emerald-600">{formatCurrency(lastMonth.mrrPreorder)}</span></div>
              <div className="flex justify-between"><span>SMS</span><span className="font-semibold text-purple-600">{formatCurrency(lastMonth.mrrSMS)}</span></div>
            </div>
          </div>
          <SummaryCard label="End Customers" value={formatNumber(lastMonth.customers)} change={((lastMonth.customers - firstMonth.customers) / Math.max(1, firstMonth.customers) * 100).toFixed(1)} />
          <SummaryCard label="End Free Users" value={formatNumber(lastMonth.freeUsers)} change={((lastMonth.freeUsers - firstMonth.freeUsers) / Math.max(1, firstMonth.freeUsers) * 100).toFixed(1)} />
          <SummaryCard label="End NRR" value={formatPercent(lastMonth.nrr)} />
          <SummaryCard label="End GRR" value={formatPercent(lastMonth.grr)} />
        </div>
      )}

      {/* Charts - sticky visible while editing drivers */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Total Revenue Trajectory</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="Total Revenue" stroke="#3b82f6" fill="#3b82f680" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Customer Composition</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="Old Customers" stackId="1" stroke="#8b5cf6" fill="#8b5cf680" />
              <Area type="monotone" dataKey="New Customers" stackId="1" stroke="#10b981" fill="#10b98180" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">Revenue Streams</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
              <Bar dataKey="MRR Recurring" fill="#3b82f6" stackId="stack" />
              <Bar dataKey="MRR Preorder" fill="#10b981" stackId="stack" />
              <Bar dataKey="MRR SMS" fill="#8b5cf6" stackId="stack" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3">NRR & GRR Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
              <Line type="monotone" dataKey="NRR" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="GRR" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Driver Control Deck - Grid Layout */}
      <div className="mb-5">
        <div className="mb-3">
          <h3 className="text-base font-semibold">Business Drivers</h3>
          <p className="text-xs text-gray-500 mt-0.5">Adjust drivers to see their impact on forecast outputs</p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {Object.entries(driversByCategory).map(([category, catDrivers]) => (
            <div key={category} className="card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <h4 className="font-bold text-sm text-gray-800">
                  {categoryLabels[category] || category}
                </h4>
              </div>
              <div>
                {catDrivers.map(driver => (
                  <CompactDriverRow
                    key={driver.key}
                    driver={driver}
                    months={forecastMonths.map(m => m.month)}
                    onGlobalChange={(val) => updateDriver(driver.key, val)}
                    onBatchMonthChange={vals => batchUpdateDriverMonths(driver.key, vals)}
                    isMonthlyOpen={showMonthlyEditor === driver.key}
                    onToggleMonthly={() => setShowMonthlyEditor(showMonthlyEditor === driver.key ? null : driver.key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Monthly editor - full width below grid */}
        {showMonthlyEditor && drivers[showMonthlyEditor] && (
          <div className="mt-3">
            <MonthlyEditorPanel
              driver={drivers[showMonthlyEditor]}
              months={forecastMonths.map(m => m.month)}
              onMonthChange={(month, val) => updateDriverMonth(showMonthlyEditor, month, val)}
              onBatchMonthChange={vals => batchUpdateDriverMonths(showMonthlyEditor, vals)}
              onResetMonth={(month) => resetDriverMonth(showMonthlyEditor, month)}
              onClose={() => setShowMonthlyEditor(null)}
              onGlobalChange={val => updateDriver(showMonthlyEditor, val)}
            />
          </div>
        )}
      </div>

      {/* Monthly Output Table */}
      <div className="card overflow-x-auto">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-semibold">Monthly Forecast Output</h3>
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
                <td className="px-4 py-2 font-medium sticky left-0 bg-white">{formatMonthLabel(m.month)}</td>
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

      {/* Save Modal */}
      {showSaveModal && (
        <Modal title="Save Scenario" onClose={() => setShowSaveModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input className="input-field w-full mt-1" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="My Scenario" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea className="input-field w-full mt-1" rows={3} value={saveDesc} onChange={e => setSaveDesc(e.target.value)} placeholder="Describe scenario assumptions..." />
            </div>
            <button className="btn-primary w-full" onClick={() => { saveScenario(saveName, saveDesc); setShowSaveModal(false); setSaveName(''); setSaveDesc(''); }}>
              Save Scenario
            </button>
          </div>
        </Modal>
      )}

      {/* Convert to Target Modal */}
      {showTargetModal && (
        <ConvertToTargetModal onClose={() => setShowTargetModal(false)} />
      )}
    </div>
  );
}

// ============ Sub-components ============

function SummaryCard({ label, value, change }: { label: string; value: string; change?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      {change && (
        <p className={`text-xs mt-1 ${parseFloat(change) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {parseFloat(change) >= 0 ? '+' : ''}{change}% over period
        </p>
      )}
    </div>
  );
}

function CompactDriverRow({
  driver, months, onGlobalChange, onBatchMonthChange, isMonthlyOpen, onToggleMonthly,
}: {
  driver: DriverConfig;
  months: string[];
  onGlobalChange: (val: number) => void;
  onBatchMonthChange: (vals: Record<string, number>) => void;
  isMonthlyOpen: boolean;
  onToggleMonthly: () => void;
}) {
  const hasOverrides = Object.keys(driver.monthlyValues).length > 0;

  const historyData = DRIVER_HISTORY[driver.key] ?? {};
  const isInteger = (driver.step ?? 0.01) >= 1;
  const unitLabel = driver.unit === 'percent' ? '%' : driver.unit === 'currency' ? '$' : '';

  // Lock baseline at mount so it doesn't change when defaultValue changes
  // (for drivers without history, defaultValue is the baseline)
  const [baseline] = useState(() => {
    const histMonths = Object.keys(historyData).sort();
    const trailing6 = histMonths.slice(-6);
    return trailing6.length > 0
      ? trailing6.reduce((sum, m) => sum + (historyData[m] ?? 0), 0) / trailing6.length
      : driver.defaultValue;
  });

  // Trailing 6M avg for display (same as baseline for drivers with history,
  // locked baseline for drivers without history)
  const histMonths = Object.keys(historyData).sort();
  const trailing6 = histMonths.slice(-6);
  const trailingAvg = trailing6.length > 0
    ? trailing6.reduce((sum, m) => sum + (historyData[m] ?? 0), 0) / trailing6.length
    : baseline;

  // Forward avg across forecast months (fallback to trailingAvg so untouched = 0%)
  const forwardAvg = useMemo(() => {
    if (months.length === 0) return trailingAvg;
    const vals = months.map(m => driver.monthlyValues[m] !== undefined ? driver.monthlyValues[m] : trailingAvg);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [months, driver.monthlyValues, trailingAvg]);
  const forwardDisplay = isInteger ? Math.round(forwardAvg) : Math.round(forwardAvg * 10) / 10;

  // Gauge: forward avg vs trailing 6M avg
  // Exponential mapping: center = precise, edges = fast
  const SLIDER_MIN = -500;
  const SLIDER_MAX = 500;
  const GAUGE_POWER = 2.5; // higher = more exponential
  const GAUGE_RANGE = 500;

  // Convert actual % → slider position (inverse power curve)
  const pctToSlider = (pct: number) => {
    const sign = pct >= 0 ? 1 : -1;
    return sign * Math.pow(Math.abs(pct) / GAUGE_RANGE, 1 / GAUGE_POWER) * GAUGE_RANGE;
  };
  // Convert slider position → actual % (power curve)
  const sliderToPct = (s: number) => {
    const sign = s >= 0 ? 1 : -1;
    return sign * Math.pow(Math.abs(s) / GAUGE_RANGE, GAUGE_POWER) * GAUGE_RANGE;
  };

  const pctChange = trailingAvg !== 0
    ? ((forwardAvg - trailingAvg) / Math.abs(trailingAvg)) * 100
    : 0;
  // Map actual % to slider position via inverse power curve
  const sliderPct = Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, pctToSlider(pctChange)));

  const pctLabel = Math.abs(pctChange) < 0.05
    ? '0%'
    : `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%`;
  const pctColor = pctChange > 0.05
    ? 'text-emerald-600'
    : pctChange < -0.05
      ? 'text-red-500'
      : 'text-gray-400';

  // Slider → map through power curve → set months
  const handleSliderChange = (rawSlider: number) => {
    const pct = sliderToPct(rawSlider);
    const desiredAvg = trailingAvg * (1 + pct / 100);
    const step = driver.step ?? 1;
    const snapped = step >= 1 ? Math.round(desiredAvg) : parseFloat(desiredAvg.toFixed(1));
    const clamped = Math.max(driver.min ?? -Infinity, Math.min(driver.max ?? Infinity, snapped));
    onGlobalChange(clamped);
    const newValues: Record<string, number> = {};
    months.forEach(m => { newValues[m] = clamped; });
    onBatchMonthChange(newValues);
  };

  // Track gradient: gray by default; color only the filled segment from center → thumb
  // thumbTrackPct maps sliderPct (-100..+100) to track position (0..100%)
  const thumbTrackPct = ((sliderPct - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
  const zeroPct = ((0 - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
  const trackBg = Math.abs(pctChange) < 0.05
    ? '#d1d5db'
    : pctChange > 0
      ? `linear-gradient(to right, #d1d5db 0%, #d1d5db ${zeroPct}%, #4ade80 ${zeroPct}%, #16a34a ${thumbTrackPct}%, #d1d5db ${thumbTrackPct}%, #d1d5db 100%)`
      : `linear-gradient(to right, #d1d5db 0%, #d1d5db ${thumbTrackPct}%, #dc2626 ${thumbTrackPct}%, #fca5a5 ${zeroPct}%, #d1d5db ${zeroPct}%, #d1d5db 100%)`;

  return (
    <div className={`py-2 px-3 border-b border-gray-50 hover:bg-gray-50/50 ${isMonthlyOpen ? 'bg-blue-50/50' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-[11px] font-medium text-gray-700">{driver.label}</span>
          {hasOverrides && <span className="text-[9px] ml-1 text-blue-500 font-bold">CUSTOM</span>}
        </div>
        <button
          onClick={onToggleMonthly}
          className={`text-[10px] whitespace-nowrap font-medium ${isMonthlyOpen ? 'text-blue-800' : 'text-blue-600 hover:text-blue-800'}`}>
          {isMonthlyOpen ? 'Close' : 'Monthly'}
        </button>
      </div>

      <div className="flex items-center gap-1">
        {/* Tags — fixed width container, joined */}
        <div className="flex shrink-0" style={{ width: '120px' }}>
          <span className="flex-1 text-[8px] px-1.5 py-1.5 bg-gray-50 border border-gray-200 rounded-l tabular-nums whitespace-nowrap text-center" title="Past 6 month average">
            <span className="text-gray-500">6M:</span> <span className="text-gray-800 font-bold">{unitLabel === '$' ? `$${(isInteger ? Math.round(trailingAvg) : Math.round(trailingAvg * 10) / 10)}` : `${(isInteger ? Math.round(trailingAvg) : Math.round(trailingAvg * 10) / 10)}${unitLabel}`}</span>
          </span>
          <span className="flex-1 text-[8px] px-1.5 py-1.5 bg-amber-50 border border-amber-200 border-l-0 rounded-r tabular-nums whitespace-nowrap text-center" title="Forward period average">
            <span className="text-amber-800 font-bold">Fwd {unitLabel === '$' ? `$${forwardDisplay}` : `${forwardDisplay}${unitLabel}`}</span>
          </span>
        </div>

        {/* Gauge — takes all remaining space */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex justify-center mb-0.5">
            <span className={`text-[8px] font-bold tabular-nums leading-none ${pctColor}`}>
              {pctLabel}
            </span>
          </div>
          <div className="relative h-5 flex items-center">
            <div className="absolute inset-x-0 h-2 rounded-full pointer-events-none"
              style={{ background: trackBg }} />
            <div className="absolute w-0.5 h-3 rounded-full bg-slate-400 pointer-events-none"
              style={{ left: `${zeroPct}%`, transform: 'translateX(-50%)' }} />
            <input
              type="range"
              value={sliderPct}
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={0.1}
              onChange={e => handleSliderChange(parseFloat(e.target.value))}
              className="delta-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthlyEditorPanel({
  driver, months, onMonthChange, onBatchMonthChange, onResetMonth, onClose, onGlobalChange,
}: {
  driver: DriverConfig;
  months: string[];
  onMonthChange: (month: string, val: number) => void;
  onBatchMonthChange: (vals: Record<string, number>) => void;
  onResetMonth: (month: string) => void;
  onClose: () => void;
  onGlobalChange: (val: number) => void;
}) {
  type HistWindow = '6' | '12' | 'all';
  type ProjType = 'linear' | 'curve' | 'seasonal' | 'immediate';

  const { driverProjTypes, setDriverProjType } = useAppStore();
  const storedProjType = (driverProjTypes[driver.key] as ProjType | undefined) ?? 'seasonal';

  const [histWindow, setHistWindow] = useState<HistWindow>('12');
  const [projType, setProjType] = useState<ProjType>(storedProjType);
  const [targetValue, setTargetValue] = useState<number>(driver.defaultValue);

  // Keep targetValue in sync with the top driver box (driver.defaultValue).
  // Do NOT re-run projection here — the card slider already sets monthlyValues directly.
  useEffect(() => {
    setTargetValue(driver.defaultValue);
  }, [driver.defaultValue]);

  const hasOverrides = Object.keys(driver.monthlyValues).length > 0;
  const unitLabel = driver.unit === 'percent' ? '%' : driver.unit === 'currency' ? '$' : '';
  const historyData = DRIVER_HISTORY[driver.key] ?? {};
  const hasHistory = Object.keys(historyData).length > 0;
  const isInteger = (driver.step ?? 0.01) >= 1;

  // ── Trailing avg (last 6 historical months) = "where we were" ──
  // Lock baseline at mount for drivers without history
  const [panelBaseline] = useState(() => {
    const hm = Object.keys(historyData).sort().slice(-6);
    return hm.length > 0
      ? hm.reduce((sum, m) => sum + (historyData[m] ?? 0), 0) / hm.length
      : driver.defaultValue;
  });

  const allHistMonthsSorted = Object.keys(historyData).sort();
  const trailing6 = allHistMonthsSorted.slice(-6);
  const trailingAvg = trailing6.length > 0
    ? trailing6.reduce((sum, m) => sum + (historyData[m] ?? 0), 0) / trailing6.length
    : panelBaseline;
  const trailingDisplay = isInteger ? Math.round(trailingAvg) : Math.round(trailingAvg * 10) / 10;

  // Effective monthly values: when monthlyValues are set, use them.
  // When empty, generate a default projection based on projType that
  // preserves avg = trailingAvg but follows the natural shape.
  const effectiveMonthlyValues = useMemo(() => {
    const hasOverridesForMonth = months.some(m => driver.monthlyValues[m] !== undefined);
    if (hasOverridesForMonth) {
      const result: Record<string, number> = {};
      months.forEach(m => {
        result[m] = driver.monthlyValues[m] !== undefined ? driver.monthlyValues[m] : trailingAvg;
      });
      return result;
    }

    // No overrides: generate default shape from last historical → endpoint
    // where endpoint is computed so avg of projection = trailingAvg
    const lastHKey = allHistMonthsSorted[allHistMonthsSorted.length - 1];
    const startVal = lastHKey !== undefined && historyData[lastHKey] !== undefined
      ? historyData[lastHKey] : trailingAvg;
    const n = months.length;

    if (n === 0 || projType === 'immediate' || Math.abs(startVal - trailingAvg) < 0.01) {
      // Flat — either immediate projection or start = avg (no shape needed)
      const result: Record<string, number> = {};
      months.forEach(m => { result[m] = trailingAvg; });
      return result;
    }

    // For linear: avg = (start + end) / 2 = trailingAvg → end = 2 * trailingAvg - start
    const endpoint = 2 * trailingAvg - startVal;
    const result: Record<string, number> = {};

    if (projType === 'curve') {
      months.forEach((m, i) => {
        const t = n > 1 ? i / (n - 1) : 1;
        result[m] = Math.round((startVal + (endpoint - startVal) * t * t) * 100) / 100;
      });
    } else if (projType === 'seasonal') {
      // Trend Learning: linear + seasonal offsets
      const allHistVals = Object.values(historyData);
      const overallAvg = allHistVals.length > 0 ? allHistVals.reduce((a, b) => a + b, 0) / allHistVals.length : startVal;
      const byMoY: Record<number, number[]> = {};
      Object.entries(historyData).forEach(([month, val]) => {
        const moy = parseInt(month.split('-')[1]) - 1;
        if (!byMoY[moy]) byMoY[moy] = [];
        byMoY[moy].push(val);
      });
      const seasonalAdj: Record<number, number> = {};
      for (let i = 0; i < 12; i++) {
        seasonalAdj[i] = byMoY[i] ? byMoY[i].reduce((a, b) => a + b, 0) / byMoY[i].length - overallAvg : 0;
      }
      const raw = months.map((m, i) => {
        const t = n > 1 ? i / (n - 1) : 1;
        const base = startVal + (endpoint - startVal) * t;
        const moy = parseInt(m.split('-')[1]) - 1;
        return base + (seasonalAdj[moy] ?? 0);
      });
      // Adjust so avg = trailingAvg
      const rawAvg = raw.reduce((a, b) => a + b, 0) / n;
      const offset = trailingAvg - rawAvg;
      months.forEach((m, i) => {
        result[m] = Math.round((raw[i] + offset) * 100) / 100;
      });
    } else {
      // Linear
      months.forEach((m, i) => {
        const t = n > 1 ? i / (n - 1) : 1;
        result[m] = Math.round((startVal + (endpoint - startVal) * t) * 100) / 100;
      });
    }
    return result;
  }, [driver.monthlyValues, months, trailingAvg, projType, allHistMonthsSorted, historyData]);

  // ── Forward avg (all forecast months) = "where we're heading" ──
  const allForecastVals = Object.values(effectiveMonthlyValues);
  const forwardAvg = allForecastVals.length > 0
    ? allForecastVals.reduce((a, b) => a + b, 0) / allForecastVals.length
    : driver.defaultValue;
  const forwardDisplay = isInteger ? Math.round(forwardAvg) : Math.round(forwardAvg * 10) / 10;

  // ── Gauge: forward avg vs trailing avg (exponential mapping) ──
  const GAUGE_MIN = -500;
  const GAUGE_MAX = 500;
  const G_POWER = 2.5;
  const G_RANGE = 500;
  const gPctToSlider = (pct: number) => {
    const sign = pct >= 0 ? 1 : -1;
    return sign * Math.pow(Math.abs(pct) / G_RANGE, 1 / G_POWER) * G_RANGE;
  };
  const gSliderToPct = (s: number) => {
    const sign = s >= 0 ? 1 : -1;
    return sign * Math.pow(Math.abs(s) / G_RANGE, G_POWER) * G_RANGE;
  };

  const gaugePct = trailingAvg !== 0
    ? ((forwardAvg - trailingAvg) / Math.abs(trailingAvg)) * 100
    : 0;
  const gaugeSliderVal = Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, gPctToSlider(gaugePct)));
  const centerTrackPct = ((0 - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100;
  const gaugeTrackPos = Math.max(0, Math.min(100,
    ((gaugeSliderVal - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100
  ));
  const gaugePctLabel = Math.abs(gaugePct) < 0.05 ? '0%' : `${gaugePct > 0 ? '+' : ''}${gaugePct.toFixed(1)}%`;
  const gaugePctColor = gaugePct > 0.05 ? 'text-emerald-600' : gaugePct < -0.05 ? 'text-red-500' : 'text-gray-400';
  const gaugeTrackBg = Math.abs(gaugePct) < 0.05
    ? '#d1d5db'
    : gaugePct > 0
      ? `linear-gradient(to right,#d1d5db 0%,#d1d5db ${centerTrackPct}%,#22c55e ${centerTrackPct}%,#16a34a ${gaugeTrackPos}%,#d1d5db ${gaugeTrackPos}%,#d1d5db 100%)`
      : `linear-gradient(to right,#d1d5db 0%,#d1d5db ${gaugeTrackPos}%,#dc2626 ${gaugeTrackPos}%,#fca5a5 ${centerTrackPct}%,#d1d5db ${centerTrackPct}%,#d1d5db 100%)`;

  // Gauge drag → find endpoint so that projection avg ≈ desired forward avg.
  // Uses binary search: run projection trial, compute avg, adjust endpoint.
  const handleTargetGauge = (rawSlider: number) => {
    const sliderVal = gSliderToPct(rawSlider);
    const desiredAvg = trailingAvg * (1 + sliderVal / 100);
    const step = driver.step ?? 1;
    const dMin = driver.min ?? 0;
    const dMax = driver.max ?? Infinity;

    // Helper: simulate projection for a given endpoint and return avg
    const lastHKey = allHistMonthsSorted[allHistMonthsSorted.length - 1];
    const startVal = lastHKey !== undefined && historyData[lastHKey] !== undefined
      ? historyData[lastHKey] : driver.defaultValue;
    const n = months.length;

    const computeProjectionAvg = (endVal: number): number => {
      if (n === 0) return endVal;
      let sum = 0;
      if (projType === 'immediate') {
        return endVal;
      } else if (projType === 'linear') {
        for (let i = 0; i < n; i++) {
          const t = n > 1 ? i / (n - 1) : 1;
          sum += startVal + (endVal - startVal) * t;
        }
      } else if (projType === 'curve') {
        for (let i = 0; i < n; i++) {
          const t = n > 1 ? i / (n - 1) : 1;
          sum += startVal + (endVal - startVal) * t * t;
        }
      } else {
        // seasonal: linear + seasonal offsets (same logic as runProjection)
        const allHistVals = Object.values(historyData);
        const overallAvg = allHistVals.length > 0 ? allHistVals.reduce((a, b) => a + b, 0) / allHistVals.length : startVal;
        const byMoY: Record<number, number[]> = {};
        Object.entries(historyData).forEach(([month, val]) => {
          const moy = parseInt(month.split('-')[1]) - 1;
          if (!byMoY[moy]) byMoY[moy] = [];
          byMoY[moy].push(val);
        });
        const seasonalAdj: Record<number, number> = {};
        for (let i = 0; i < 12; i++) {
          seasonalAdj[i] = byMoY[i] ? byMoY[i].reduce((a, b) => a + b, 0) / byMoY[i].length - overallAvg : 0;
        }
        const raw: number[] = [];
        for (let i = 0; i < n; i++) {
          const t = n > 1 ? i / (n - 1) : 1;
          const base = startVal + (endVal - startVal) * t;
          const moy = parseInt(months[i].split('-')[1]) - 1;
          raw.push(base + (seasonalAdj[moy] ?? 0));
        }
        const endOffset = endVal - raw[raw.length - 1];
        for (let i = 0; i < n; i++) sum += raw[i] + endOffset;
      }
      return sum / n;
    };

    // For immediate, endpoint = desiredAvg
    if (projType === 'immediate') {
      const snapped = step >= 1 ? Math.round(desiredAvg) : parseFloat(desiredAvg.toFixed(1));
      const clamped = Math.max(dMin, Math.min(dMax, snapped));
      setTargetValue(clamped);
      onGlobalChange(clamped);
      runProjection(projType, clamped);
      return;
    }

    // Binary search for endpoint — allow negative to find true minimum,
    // clamp result to driver min/max after
    let lo = -(Math.abs(startVal) * 12 + 10000);
    let hi = Math.abs(startVal) * 12 + 10000;
    for (let iter = 0; iter < 60; iter++) {
      const mid = (lo + hi) / 2;
      const avg = computeProjectionAvg(mid);
      if (Math.abs(avg - desiredAvg) < 0.5) break;
      if (avg < desiredAvg) lo = mid;
      else hi = mid;
    }
    const endpoint = (lo + hi) / 2;
    const snapped = step >= 1 ? Math.round(endpoint) : parseFloat(endpoint.toFixed(1));
    // Don't clamp endpoint — let projection produce values that get clamped per-month
    setTargetValue(snapped);
    onGlobalChange(Math.max(dMin, Math.min(dMax, snapped)));
    runProjection(projType, snapped);
  };

  const chartData = useMemo(() => {
    const allHistMonths = Object.keys(historyData).sort();
    const windowedHist = histWindow === 'all'
      ? allHistMonths
      : allHistMonths.slice(-(parseInt(histWindow)));

    const lastHistMonth = windowedHist[windowedHist.length - 1];

    // Historical points; the LAST one also gets a forecast value so the
    // dashed forecast line starts right at the historical end — no gap.
    const histPoints = windowedHist.map(m => ({
      month: formatMonthLabel(m),
      monthKey: null as string | null,
      historical: historyData[m],
      forecast: m === lastHistMonth ? (historyData[m] ?? null) : null,
      avg: null as number | null,
    }));

    // Forecast points start from the month AFTER the last historical month.
    // No bridge needed here — the bridge is already in histPoints above.
    const fVals = months.map(m => effectiveMonthlyValues[m]);
    const fAvg = fVals.length > 0 ? fVals.reduce((a, b) => a + b, 0) / fVals.length : null;
    const forecastPoints = months.map(m => ({
      month: formatMonthLabel(m),
      monthKey: m,
      historical: null as number | null,
      forecast: effectiveMonthlyValues[m],
      avg: fAvg,
    }));

    return [...histPoints, ...forecastPoints];
  }, [historyData, histWindow, months, effectiveMonthlyValues]);

  const round = useCallback((v: number) => isInteger ? Math.round(v) : Math.round(v * 100) / 100, [isInteger]);

  // ── Draggable chart dots ──────────────────────────────────────────────────
  const dragRef = useRef<{
    active: boolean;
    monthKey: string;
    startY: number;
    startVal: number;
    yMin: number;
    yMax: number;
  }>({ active: false, monthKey: '', startY: 0, startVal: 0, yMin: 0, yMax: 0 });

  // Keep a stable ref to handleMonthChange so the effect doesn't need to re-register
  const handleMonthChangeRef = useRef<(month: string, val: number) => void>(() => {});

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      const { monthKey, startY, startVal, yMin, yMax } = dragRef.current;
      const chartPlotHeight = 132; // 160px height − ~28px margins
      const valueRange = yMax - yMin || 1;
      const deltaY = e.clientY - startY;
      const deltaVal = -deltaY * (valueRange / chartPlotHeight);
      const newVal = isInteger
        ? Math.round(startVal + deltaVal)
        : Math.round((startVal + deltaVal) * 100) / 100;
      const clamped = Math.max(driver.min ?? -Infinity, Math.min(driver.max ?? Infinity, newVal));
      handleMonthChangeRef.current(monthKey, clamped);
    };
    const onMouseUp = () => { dragRef.current.active = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const runProjection = useCallback((type: ProjType, endVal: number) => {
    if (months.length === 0) return;
    // Start from last known historical value (not driver.defaultValue) so
    // the projection interpolates from current reality → target end value.
    const histMonths = Object.keys(historyData).sort();
    const lastHistKey = histMonths[histMonths.length - 1];
    const startVal = lastHistKey !== undefined && historyData[lastHistKey] !== undefined
      ? historyData[lastHistKey]
      : driver.defaultValue;
    const n = months.length;

    // Compute all values first, THEN batch-write in a single store operation
    // (prevents intermediate renders showing driver.defaultValue for un-written months)
    let newValues: Record<string, number> = {};

    if (type === 'immediate') {
      months.forEach(m => { newValues[m] = round(endVal); });
    } else if (type === 'linear') {
      months.forEach((m, i) => {
        const t = n > 1 ? i / (n - 1) : 1;
        newValues[m] = round(startVal + (endVal - startVal) * t);
      });
    } else if (type === 'curve') {
      months.forEach((m, i) => {
        const t = n > 1 ? i / (n - 1) : 1;
        newValues[m] = round(startVal + (endVal - startVal) * t * t);
      });
    } else {
      // Trend Learning: linear slope + additive seasonal fluctuations
      const allHistVals = Object.values(historyData);
      if (allHistVals.length === 0) {
        months.forEach((m, i) => {
          const t = n > 1 ? i / (n - 1) : 1;
          newValues[m] = round(startVal + (endVal - startVal) * t);
        });
      } else {
        const overallAvg = allHistVals.reduce((a, b) => a + b, 0) / allHistVals.length;
        const byMoY: Record<number, number[]> = {};
        Object.entries(historyData).forEach(([month, val]) => {
          const moy = parseInt(month.split('-')[1]) - 1;
          if (!byMoY[moy]) byMoY[moy] = [];
          byMoY[moy].push(val);
        });
        const seasonalAdj: Record<number, number> = {};
        for (let i = 0; i < 12; i++) {
          seasonalAdj[i] = byMoY[i]
            ? byMoY[i].reduce((a, b) => a + b, 0) / byMoY[i].length - overallAvg
            : 0;
        }
        const raw = months.map((m, i) => {
          const t = n > 1 ? i / (n - 1) : 1;
          const base = startVal + (endVal - startVal) * t;
          const moy = parseInt(m.split('-')[1]) - 1;
          return base + (seasonalAdj[moy] ?? 0);
        });
        const endOffset = endVal - raw[raw.length - 1];
        months.forEach((m, i) => { newValues[m] = round(raw[i] + endOffset); });
      }
    }
    // Clamp values to driver min/max
    const dMin = driver.min ?? -Infinity;
    const dMax = driver.max ?? Infinity;
    for (const m of Object.keys(newValues)) {
      newValues[m] = Math.max(dMin, Math.min(dMax, newValues[m]));
    }
    // Single atomic write → one simulation run → no flickering intermediate state
    onBatchMonthChange(newValues);
  }, [months, driver.defaultValue, driver.min, driver.max, driver.step, historyData, round, onBatchMonthChange]);

  // No auto-run on mount — opening the panel should NOT change any values.
  // Projection only runs when the user explicitly changes target, gauge, or projection type.

  const handleProjTypeChange = (type: ProjType) => {
    setProjType(type);
    setDriverProjType(driver.key, type);
    runProjection(type, targetValue);
  };

  const handleMonthChange = useCallback((month: string, val: number) => {
    onMonthChange(month, val);
  }, [onMonthChange]);

  // Keep drag ref in sync with latest handleMonthChange
  handleMonthChangeRef.current = handleMonthChange;

  // Y-domain for drag pixel→value conversion
  const chartYDomain = useMemo(() => {
    const allVals = chartData.flatMap(d =>
      [d.historical, d.forecast].filter((v): v is number => v !== null && v !== undefined)
    );
    if (allVals.length === 0) return { min: 0, max: 100 };
    const mn = Math.min(...allVals);
    const mx = Math.max(...allVals);
    const pad = (mx - mn) * 0.1 || 10;
    return { min: mn - pad, max: mx + pad };
  }, [chartData]);

  // Custom draggable dot for forecast line (render-function form for correct prop passing)
  const ForecastDot = useCallback((props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    if (!payload?.monthKey || payload.forecast == null) return null;
    return (
      <g key={payload.monthKey}>
        {/* Larger invisible hit area */}
        <circle
          cx={cx} cy={cy} r={10}
          fill="transparent"
          style={{ cursor: 'ns-resize' }}
          onMouseDown={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragRef.current = {
              active: true,
              monthKey: payload.monthKey,
              startY: e.clientY,
              startVal: payload.forecast,
              yMin: chartYDomain.min,
              yMax: chartYDomain.max,
            };
          }}
        />
        {/* Visual dot */}
        <circle cx={cx} cy={cy} r={5} fill="#8b5cf6" stroke="white" strokeWidth={2}
          style={{ pointerEvents: 'none' }} />
      </g>
    );
  }, [chartYDomain]);

  const resetAll = () => months.forEach(m => onResetMonth(m));
  const refLineLabel = months[0] ? formatMonthLabel(months[0]) : '';

  return (
    <div className="border-t-2 border-blue-400 bg-gradient-to-b from-blue-50/60 to-white px-6 py-4">
      {/* Header — no Save button, all changes auto-save */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <h4 className="text-sm font-semibold text-gray-900">{driver.label}</h4>
          {hasHistory && (
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-gray-400 mr-1">History:</span>
              {(['6', '12', 'all'] as HistWindow[]).map(w => (
                <button key={w} onClick={() => setHistWindow(w)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${histWindow === w ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {w === 'all' ? 'All' : `${w}M`}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasOverrides && (
            <button onClick={resetAll} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <RotateCcw size={11} /> Reset all
            </button>
          )}
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Close</button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="mb-4 bg-white rounded-lg border border-gray-100 p-3">
          <div className="flex items-center gap-4 mb-1 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block w-6 h-0.5 bg-blue-500" /> Historical (actual)</span>
            <span className="flex items-center gap-1"><span className="inline-block w-6 border-t-2 border-dashed border-purple-500" /> Forecast</span>
            <span className="flex items-center gap-1"><span className="inline-block w-6 border-t border-dashed border-amber-500" /> Fwd Avg ({unitLabel === '$' ? `$${forwardDisplay}` : `${forwardDisplay}${unitLabel}`})</span>
            <span className="ml-auto flex items-center gap-1 text-purple-400 italic">drag dots ↕</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} width={40}
                domain={[chartYDomain.min, chartYDomain.max]}
                tickFormatter={v => unitLabel === '$' ? `$${v}` : `${v}${unitLabel}`} />
              <Tooltip contentStyle={{ fontSize: 11 }}
                formatter={(v: any) => [`${unitLabel === '$' ? '$' : ''}${v}${unitLabel !== '$' ? unitLabel : ''}`, '']} />
              {refLineLabel && (
                <ReferenceLine x={refLineLabel} stroke="#cbd5e1" strokeDasharray="4 2"
                  label={{ value: 'Now', position: 'top', fontSize: 9, fill: '#94a3b8' }} />
              )}
              {/* Average reference line across forecast period */}
              {/* Forward average line */}
              <ReferenceLine y={forwardAvg} stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={1.5}
                label={{ value: `Fwd: ${isInteger ? Math.round(forwardAvg) : forwardAvg.toFixed(1)}`, position: 'right', fontSize: 9, fill: '#d97706' }}
                ifOverflow="extendDomain" />
              {/* Trailing 6M average line */}
              <ReferenceLine y={trailingAvg} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1}
                label={{ value: `6M: ${isInteger ? Math.round(trailingAvg) : trailingAvg.toFixed(1)}`, position: 'left', fontSize: 9, fill: '#64748b' }}
                ifOverflow="extendDomain" />
              <Line type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={2}
                dot={{ r: 2, fill: '#3b82f6' }} connectNulls={false} isAnimationActive={false} name="Historical" />
              <Line type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={2}
                strokeDasharray="5 4" dot={(p: any) => <ForecastDot {...p} />}
                activeDot={false} connectNulls={false} isAnimationActive={false} name="Forecast" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Projection Controls */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-white rounded-lg border border-gray-100">
        {/* Trailing 6M avg (read-only) */}
        <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 rounded-md border border-gray-200">
          <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">Past 6M:</span>
          <span className="text-xs text-gray-700 font-bold tabular-nums">
            {unitLabel === '$' ? `$${trailingDisplay}` : `${trailingDisplay}${unitLabel}`}
          </span>
        </div>

        {/* Forward avg (read-only, updates as user changes monthly values) */}
        <div className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 rounded-md border border-amber-200">
          <span className="text-[11px] text-amber-700 font-medium whitespace-nowrap">Fwd Avg:</span>
          <span className="text-xs text-amber-800 font-bold tabular-nums">
            {unitLabel === '$' ? `$${forwardDisplay}` : `${forwardDisplay}${unitLabel}`}
          </span>
        </div>

        {/* Gauge: forward avg vs trailing avg */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex justify-center mb-0.5">
            <span className={`text-[9px] font-bold tabular-nums ${gaugePctColor}`}>{gaugePctLabel}</span>
          </div>
          <div className="relative h-3.5 flex items-center">
            <div className="absolute inset-x-0 h-1.5 rounded-full pointer-events-none"
              style={{ background: gaugeTrackBg }} />
            <div className="absolute w-0.5 h-2.5 rounded-full bg-slate-400 pointer-events-none"
              style={{ left: `${centerTrackPct}%`, transform: 'translateX(-50%)' }} />
            <input
              type="range"
              value={gaugeSliderVal}
              min={GAUGE_MIN} max={GAUGE_MAX} step={isInteger ? 1 : 0.1}
              onChange={e => handleTargetGauge(parseFloat(e.target.value))}
              className="delta-slider"
            />
          </div>
        </div>

        <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">Projection:</span>
        <select value={projType} onChange={e => handleProjTypeChange(e.target.value as ProjType)}
          className="input-field text-xs py-1">
          <option value="linear">Linear</option>
          <option value="curve">Curve</option>
          <option value="seasonal">Trend Learning</option>
          <option value="immediate">Immediate</option>
        </select>
      </div>

      {/* Monthly grid: historical (gray, read-only) + forecast (editable) */}
      {(() => {
        const forecastSlices = [months.slice(0, 12), months.slice(12)].filter(s => s.length > 0);
        const histSorted = Object.keys(historyData).sort();
        // Show as many historical months as the first forecast row width
        const firstRowLen = forecastSlices[0]?.length ?? 12;
        const histSlice = histSorted.slice(-firstRowLen);

        return forecastSlices.map((slice, si) => (
          <div key={si} className={si > 0 ? 'mt-4' : ''}>
            {/* Historical row (only above the first forecast slice) */}
            {si === 0 && histSlice.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">Historical</span>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[9px] font-semibold text-blue-500 uppercase tracking-wide">Forecast</span>
                </div>
                <div className="grid gap-2 mb-1"
                  style={{ gridTemplateColumns: `repeat(${firstRowLen}, minmax(0, 1fr))` }}>
                  {/* Pad left if hist has fewer months than firstRowLen */}
                  {Array.from({ length: firstRowLen - histSlice.length }).map((_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {histSlice.map(hm => {
                    const hVal = historyData[hm];
                    const display = isInteger
                      ? Math.round(hVal).toLocaleString()
                      : hVal.toFixed(1);
                    return (
                      <div key={hm} className="flex flex-col items-center">
                        <span className="text-[9px] text-gray-400 mb-0.5 font-medium">{formatMonthLabel(hm)}</span>
                        <div className="w-full text-center text-xs py-1.5 px-1 rounded-md bg-gray-100 text-gray-400 font-medium select-none border border-gray-200">
                          {display}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Forecast row (editable) */}
            <div className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${slice.length}, minmax(0, 1fr))` }}>
              {slice.map(m => {
                const hasOverride = driver.monthlyValues[m] !== undefined;
                const val = effectiveMonthlyValues[m];
                return (
                  <div key={m} className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-500 mb-0.5 font-medium">{formatMonthLabel(m)}</span>
                    <input
                      type="number"
                      value={isInteger ? Math.round(val) : val}
                      onChange={e => handleMonthChange(m, isInteger
                        ? Math.round(parseFloat(e.target.value) || 0)
                        : (parseFloat(e.target.value) || 0))}
                      className={`input-field w-full text-xs text-center py-1.5 px-1 ${hasOverride ? 'border-blue-400 bg-blue-50 font-semibold' : ''}`}
                      step={isInteger ? 1 : driver.step}
                    />
                    {hasOverride && (
                      <button onClick={() => { onResetMonth(m); }}
                        className="text-[9px] text-red-400 mt-0.5 hover:text-red-600">reset</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ));
      })()}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ConvertToTargetModal({ onClose }: { onClose: () => void }) {
  const { targetPlans, targetVersions, setForecastAsTarget, forecastMonths } = useAppStore();

  // Active plans that have an active version
  const activePlans = targetPlans.filter(p => p.status === 'active' && p.activeVersionId);

  const handlePush = (planId: string) => {
    setForecastAsTarget(planId);
    onClose();
  };

  const first = forecastMonths[0];
  const last = forecastMonths[forecastMonths.length - 1];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">Set Forecast as Business Targets</h3>
        <p className="text-sm text-gray-500 mb-4">
          Push the current forecast ({forecastMonths.length} months) into an existing OKR plan as "Business Metrics" objective.
        </p>

        {/* Preview of what will be pushed */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs">
          <p className="font-medium text-gray-700 mb-2">Metrics that will be added:</p>
          <div className="grid grid-cols-2 gap-1 text-gray-600">
            <span>Customers: {formatNumber(first?.customers || 0)} → {formatNumber(last?.customers || 0)}</span>
            <span>Total Rev: {formatCurrency(first?.totalRevenue || 0)} → {formatCurrency(last?.totalRevenue || 0)}</span>
            <span>MRR Rec: {formatCurrency(first?.mrrRecurring || 0)} → {formatCurrency(last?.mrrRecurring || 0)}</span>
            <span>Free Users: {formatNumber(first?.freeUsers || 0)} → {formatNumber(last?.freeUsers || 0)}</span>
            <span>ARPU: {formatCurrency(first?.arpuRecurring || 0)} → {formatCurrency(last?.arpuRecurring || 0)}</span>
            <span>ARR: {formatCurrency(first?.arr || 0)} → {formatCurrency(last?.arr || 0)}</span>
          </div>
        </div>

        {activePlans.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Select target plan:</p>
            {activePlans.map(plan => {
              const version = targetVersions.find(v => v.id === plan.activeVersionId);
              const hasBiz = version?.objectives.some(o => o.id === 'obj-biz-metrics');
              return (
                <button
                  key={plan.id}
                  onClick={() => handlePush(plan.id)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{plan.name}</span>
                    {hasBiz && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Will update existing</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{version?.objectives.length || 0} objectives, {version?.metrics.length || 0} KRs</p>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No active target plans. Create one first in the Targets page.</p>
        )}

        <button onClick={onClose} className="btn-secondary w-full mt-4">Cancel</button>
      </div>
    </div>
  );
}

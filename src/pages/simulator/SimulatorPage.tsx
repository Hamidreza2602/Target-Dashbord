import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { inputDrivers } from '../../data/metricDefinitions';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/format';
import { exportToCSV, forecastToCSVData } from '../../utils/csv';
import { categoryLabels } from '../../data/metricDefinitions';
import { DriverConfig, MetricCategory } from '../../types';
import { format, parse } from 'date-fns';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart,
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
    updateDriver, updateDriverMonth, resetDriverMonth, setForecastDates, runSimulation,
    scenarios, activeScenarioId, saveScenario, duplicateScenario, createTargetFromScenario,
  } = useAppStore();

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
          <button onClick={() => runSimulation()} className="btn-secondary flex items-center gap-1.5">
            <RefreshCw size={15} /> Refresh
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
          <button onClick={() => setShowTargetModal(true)} className="btn-primary flex items-center gap-1.5">
            <Target size={15} /> Convert to Target
          </button>
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
          <SummaryCard label="End Total Rev" value={formatCurrency(lastMonth.totalRevenue)} change={((lastMonth.totalRevenue - firstMonth.totalRevenue) / Math.max(1, firstMonth.totalRevenue) * 100).toFixed(1)} />
          <SummaryCard label="End Customers" value={formatNumber(lastMonth.customers)} change={((lastMonth.customers - firstMonth.customers) / Math.max(1, firstMonth.customers) * 100).toFixed(1)} />
          <SummaryCard label="End NRR" value={formatPercent(lastMonth.nrr)} />
          <SummaryCard label="End ARPU" value={formatCurrency(lastMonth.arpuRecurring)} />
          <SummaryCard label="End CLV" value={formatCurrency(lastMonth.clv)} />
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

        <div className="grid grid-cols-5 gap-3">
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
                    onGlobalChange={(val) => updateDriver(driver.key, val)}
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
              onResetMonth={(month) => resetDriverMonth(showMonthlyEditor, month)}
              onClose={() => setShowMonthlyEditor(null)}
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
  driver, onGlobalChange, isMonthlyOpen, onToggleMonthly,
}: {
  driver: DriverConfig;
  onGlobalChange: (val: number) => void;
  isMonthlyOpen: boolean;
  onToggleMonthly: () => void;
}) {
  const hasOverrides = Object.keys(driver.monthlyValues).length > 0;

  return (
    <div className={`flex items-center gap-2 py-2 px-4 border-b border-gray-50 hover:bg-gray-50/50 ${isMonthlyOpen ? 'bg-blue-50/50' : ''}`}>
      <div className="w-32 shrink-0">
        <span className="text-xs font-medium text-gray-700">{driver.label}</span>
        {hasOverrides && <span className="text-[9px] ml-1 text-blue-500 font-bold">CUSTOM</span>}
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {driver.unit === 'currency' && <span className="text-gray-400 text-xs">$</span>}
        <input
          type="number"
          value={driver.defaultValue}
          onChange={e => onGlobalChange(parseFloat(e.target.value) || 0)}
          className="input-field w-20 text-xs py-1.5"
          step={driver.step}
          min={driver.min}
          max={driver.max}
        />
        {driver.unit === 'percent' && <span className="text-gray-400 text-xs">%</span>}
        <input
          type="range"
          value={driver.defaultValue}
          onChange={e => onGlobalChange(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-blue-500 min-w-[40px]"
          step={driver.step}
          min={driver.min}
          max={driver.max}
        />
      </div>
      <button onClick={onToggleMonthly} className={`text-[10px] whitespace-nowrap font-medium ${isMonthlyOpen ? 'text-blue-800' : 'text-blue-600 hover:text-blue-800'}`}>
        {isMonthlyOpen ? 'Close' : 'Monthly'}
      </button>
    </div>
  );
}

function MonthlyEditorPanel({
  driver, months, onMonthChange, onResetMonth, onClose,
}: {
  driver: DriverConfig;
  months: string[];
  onMonthChange: (month: string, val: number) => void;
  onResetMonth: (month: string) => void;
  onClose: () => void;
}) {
  const [targetValue, setTargetValue] = useState<number | null>(null);
  const hasOverrides = Object.keys(driver.monthlyValues).length > 0;
  const unitLabel = driver.unit === 'percent' ? '%' : driver.unit === 'currency' ? '$' : '';

  const effectiveMonthlyValues = useMemo(() => {
    const result: Record<string, number> = {};
    const n = months.length;
    const startVal = driver.defaultValue;
    const endVal = targetValue ?? driver.defaultValue;

    months.forEach((m, i) => {
      if (driver.monthlyValues[m] !== undefined) {
        result[m] = driver.monthlyValues[m];
      } else if (targetValue !== null) {
        result[m] = Math.round((startVal + ((i + 1) / n) * (endVal - startVal)) * 100) / 100;
      } else {
        result[m] = driver.defaultValue;
      }
    });
    return result;
  }, [driver.defaultValue, driver.monthlyValues, targetValue, months]);

  const applyLinearRamp = (target: number) => {
    setTargetValue(target);
    const n = months.length;
    const start = driver.defaultValue;
    months.forEach((m, i) => {
      if (driver.monthlyValues[m] === undefined) {
        const val = Math.round((start + ((i + 1) / n) * (target - start)) * 100) / 100;
        onMonthChange(m, val);
      }
    });
  };

  const resetAll = () => {
    setTargetValue(null);
    months.forEach(m => onResetMonth(m));
  };

  return (
    <div className="border-t-2 border-blue-400 bg-gradient-to-b from-blue-50/60 to-white px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <h4 className="text-sm font-semibold text-gray-900">{driver.label}</h4>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Start:</span>
              <span className="text-xs font-semibold text-gray-800">{driver.defaultValue}{unitLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Target:</span>
              <input
                type="number"
                value={targetValue ?? driver.defaultValue}
                onChange={e => applyLinearRamp(parseFloat(e.target.value) || 0)}
                className="input-field w-24 text-xs py-1"
                step={driver.step}
              />
              <span className="text-xs text-gray-400">{unitLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasOverrides && (
            <button onClick={resetAll} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <RotateCcw size={11} /> Reset all
            </button>
          )}
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Close</button>
        </div>
      </div>

      {/* Monthly grid - full width, well spaced */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(months.length, 12)}, minmax(0, 1fr))` }}>
        {months.slice(0, 12).map(m => {
          const hasOverride = driver.monthlyValues[m] !== undefined;
          const val = effectiveMonthlyValues[m];
          return (
            <div key={m} className="flex flex-col items-center">
              <span className="text-[10px] text-gray-500 mb-1 font-medium">{formatMonthLabel(m)}</span>
              <input
                type="number"
                value={val}
                onChange={e => onMonthChange(m, parseFloat(e.target.value) || 0)}
                className={`input-field w-full text-xs text-center py-1.5 px-1 ${
                  hasOverride ? 'border-blue-400 bg-blue-50 font-semibold' :
                  targetValue !== null ? 'border-purple-200 bg-purple-50/40' : ''
                }`}
                step={driver.step}
              />
              {hasOverride && (
                <button onClick={() => onResetMonth(m)} className="text-[9px] text-red-400 mt-0.5 hover:text-red-600">reset</button>
              )}
            </div>
          );
        })}
      </div>
      {months.length > 12 && (
        <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: `repeat(${months.length - 12}, minmax(0, 1fr))` }}>
          {months.slice(12).map(m => {
            const hasOverride = driver.monthlyValues[m] !== undefined;
            const val = effectiveMonthlyValues[m];
            return (
              <div key={m} className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 mb-1 font-medium">{formatMonthLabel(m)}</span>
                <input
                  type="number"
                  value={val}
                  onChange={e => onMonthChange(m, parseFloat(e.target.value) || 0)}
                  className={`input-field w-full text-xs text-center py-1.5 px-1 ${
                    hasOverride ? 'border-blue-400 bg-blue-50 font-semibold' :
                    targetValue !== null ? 'border-purple-200 bg-purple-50/40' : ''
                  }`}
                  step={driver.step}
                />
                {hasOverride && (
                  <button onClick={() => onResetMonth(m)} className="text-[9px] text-red-400 mt-0.5 hover:text-red-600">reset</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {targetValue !== null && (
        <p className="text-[10px] text-purple-500 mt-2">
          Linear ramp from {driver.defaultValue}{unitLabel} to {targetValue}{unitLabel} applied. Override individual months as needed.
        </p>
      )}
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

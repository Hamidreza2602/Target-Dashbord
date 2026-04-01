import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { categoryLabels } from '../../data/metricDefinitions';
import { runForecast } from '../../engine/forecastEngine';
import { runSensitivityAnalysis, SensitivityResult } from '../../engine/sensitivityAnalysis';
import { formatCurrency } from '../../utils/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';
import { ChevronDown, ChevronRight, Activity } from 'lucide-react';

const PERTURBATION_OPTIONS = [5, 10, 20];

export default function SensitivitySection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [perturbationPct, setPerturbationPct] = useState(10);

  const drivers = useAppStore(s => s.drivers);
  const forecastMonths = useAppStore(s => s.forecastMonths);
  const forecastStartDate = useAppStore(s => s.forecastStartDate);
  const forecastEndDate = useAppStore(s => s.forecastEndDate);
  const baselines = useAppStore(s => s.baselines);
  const activeBaselineId = useAppStore(s => s.activeBaselineId);

  const results = useMemo<SensitivityResult[]>(() => {
    if (!isExpanded || forecastMonths.length === 0) return [];

    const baseline = baselines.find(b => b.id === activeBaselineId);
    if (!baseline) return [];

    const [sy, sm] = forecastStartDate.split('-').map(Number);
    const [ey, em] = forecastEndDate.split('-').map(Number);
    const months = Math.max(1, (ey - sy) * 12 + (em - sm));

    const baseInput = { baseline, startDate: forecastStartDate + '-01', months, drivers };
    const baselineResult = runForecast(baseInput);

    return runSensitivityAnalysis(baseInput, baselineResult, perturbationPct);
  }, [isExpanded, drivers, forecastMonths, forecastStartDate, forecastEndDate, baselines, activeBaselineId, perturbationPct]);

  const chartData = useMemo(() =>
    results.map(r => ({
      name: r.driverLabel,
      mrrDelta: Math.round(r.mrrDelta),
      mrrDeltaPct: r.mrrDeltaPct,
      fill: r.mrrDelta >= 0 ? '#10b981' : '#ef4444',
    })),
  [results]);

  return (
    <div className="card mb-5 overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-3 border-b border-gray-200 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <Activity size={16} className="text-blue-500" />
          <h3 className="text-base font-semibold">Sensitivity Analysis</h3>
          <span className="text-xs text-gray-500">Which drivers matter most for MRR?</span>
        </div>
        {isExpanded && (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <label className="text-xs text-gray-500">Perturbation:</label>
            <select
              value={perturbationPct}
              onChange={e => setPerturbationPct(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
            >
              {PERTURBATION_OPTIONS.map(p => (
                <option key={p} value={p}>+{p}%</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Body */}
      {isExpanded && results.length > 0 && (
        <div>
          {/* Tornado Chart */}
          <div className="p-4">
            <ResponsiveContainer width="100%" height={results.length * 36 + 40}>
              <BarChart layout="vertical" data={chartData} margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => `$${v >= 0 ? '+' : ''}${v.toLocaleString()}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={180}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${value >= 0 ? '+' : ''}${formatCurrency(value)}`,
                    'MRR Impact',
                  ]}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ fontSize: 12 }}
                />
                <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={1} />
                <Bar dataKey="mrrDelta" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Equivalence Table */}
          <div className="px-5 pb-4">
            <h4 className="text-sm font-semibold mb-2 text-gray-700">
              Driver Impact Ranking & Equivalences
              <span className="text-xs font-normal text-gray-400 ml-2">
                with +{perturbationPct}% perturbation on each driver
              </span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Driver</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium text-right">MRR Impact</th>
                    <th className="px-3 py-2 font-medium text-right">MRR %</th>
                    <th className="px-3 py-2 font-medium text-right">Equivalence</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.driverKey} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{r.driverLabel}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {categoryLabels[r.category] || r.category}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${r.mrrDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {r.mrrDelta >= 0 ? '+' : ''}{formatCurrency(r.mrrDelta)}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${r.mrrDeltaPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {r.mrrDeltaPct >= 0 ? '+' : ''}{r.mrrDeltaPct.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {i === 0 ? (
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                            1.0x ref
                          </span>
                        ) : r.equivalenceRatio === Infinity ? (
                          <span className="text-xs text-gray-400">N/A</span>
                        ) : (
                          <span className="text-xs">{r.equivalenceRatio.toFixed(1)}x</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Equivalence: "3.0x" means you need 3x more perturbation on that driver to match the #1 driver's MRR impact.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

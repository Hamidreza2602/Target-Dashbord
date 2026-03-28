import { useState } from 'react';
import { useAppStore } from '../../../store/appStore';
import { TargetVersion, TargetMetric, Objective } from '../../../types';
import { formatMetricValue } from '../../../utils/format';
import { ChevronDown, ChevronRight, Zap } from 'lucide-react';

const PATH_TYPE_LABELS = { linear: 'Linear', front_loaded: 'Front-loaded', back_loaded: 'Back-loaded' } as const;

export default function TargetEditTab({ version }: { version: TargetVersion }) {
  const { regenerateTargetPath, updateMetricTargets } = useAppStore();
  const [expandedObj, setExpandedObj] = useState<Set<string>>(new Set(version.objectives.map(o => o.id)));
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const toggleObj = (id: string) => {
    const next = new Set(expandedObj);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedObj(next);
  };

  return (
    <div className="space-y-4">
      {version.objectives.map(obj => {
        const metrics = version.metrics.filter(m => m.objectiveId === obj.id);
        const isOpen = expandedObj.has(obj.id);

        return (
          <div key={obj.id} className="card overflow-hidden">
            {/* Objective Header */}
            <button
              onClick={() => toggleObj(obj.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: obj.color }} />
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">{obj.name}</h3>
                <p className="text-xs text-gray-500">{metrics.length} key results</p>
              </div>
              {metrics.some(m => m.simulatorDriverKey) && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  <Zap size={10} /> Simulator
                </span>
              )}
            </button>

            {isOpen && (
              <div className="border-t">
                {/* Metrics Table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 font-medium text-gray-600 w-1/4">Key Result</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600 w-24">Start</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600 w-24">Target</th>
                      <th className="text-center px-4 py-2 font-medium text-gray-600 w-28">Curve</th>
                      <th className="text-center px-4 py-2 font-medium text-gray-600 w-24">Direction</th>
                      <th className="text-center px-4 py-2 font-medium text-gray-600 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map(m => (
                      <MetricRow
                        key={m.id}
                        metric={m}
                        versionId={version.id}
                        isExpanded={expandedMetric === m.id}
                        onToggle={() => setExpandedMetric(expandedMetric === m.id ? null : m.id)}
                      />
                    ))}
                  </tbody>
                </table>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MetricRow({ metric, versionId, isExpanded, onToggle }: {
  metric: TargetMetric;
  versionId: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { regenerateTargetPath, updateMetricTargets, updateTargetPeriodValue } = useAppStore();
  const [editBaseline, setEditBaseline] = useState(metric.baselineValue.toString());
  const [editTarget, setEditTarget] = useState(metric.finalTargetValue.toString());

  const commitValues = () => {
    const b = parseFloat(editBaseline);
    const t = parseFloat(editTarget);
    if (!isNaN(b) && !isNaN(t) && (b !== metric.baselineValue || t !== metric.finalTargetValue)) {
      updateMetricTargets(versionId, metric.id, b, t);
    }
  };

  return (
    <>
      <tr className="border-t border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{metric.displayName}</span>
            {metric.simulatorDriverKey && (
              <Zap size={11} className="text-purple-500" />
            )}
          </div>
        </td>
        <td className="px-4 py-2.5 text-right">
          <input
            type="number"
            className="w-20 text-right text-sm border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            value={editBaseline}
            onChange={e => setEditBaseline(e.target.value)}
            onBlur={commitValues}
            step={metric.unit === 'percent' ? 0.1 : 1}
          />
        </td>
        <td className="px-4 py-2.5 text-right">
          <input
            type="number"
            className="w-20 text-right text-sm border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            value={editTarget}
            onChange={e => setEditTarget(e.target.value)}
            onBlur={commitValues}
            step={metric.unit === 'percent' ? 0.1 : 1}
          />
        </td>
        <td className="px-4 py-2.5 text-center">
          <select
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
            value={metric.targetPathType}
            onChange={e => regenerateTargetPath(versionId, metric.id, e.target.value as any)}
          >
            {Object.entries(PATH_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-2.5 text-center">
          <span className={`text-xs ${metric.directionality === 'higher_better' ? 'text-emerald-600' : 'text-red-600'}`}>
            {metric.directionality === 'higher_better' ? 'Higher' : 'Lower'}
          </span>
        </td>
        <td className="px-4 py-2.5 text-center">
          <button onClick={onToggle} className="text-xs text-blue-600 hover:underline">
            {isExpanded ? 'Hide' : 'Monthly'}
          </button>
        </td>
      </tr>

      {/* Expanded monthly breakdown */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-gray-50">
            <div className="flex gap-2 flex-wrap">
              {metric.periods.map(p => (
                <div key={p.periodMonth} className="text-center">
                  <div className="text-[10px] text-gray-400 mb-1">{p.periodMonth.substring(5)}</div>
                  <input
                    type="number"
                    className="w-16 text-center text-xs border border-gray-200 rounded px-1 py-1"
                    value={p.targetValue}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) updateTargetPeriodValue(versionId, metric.id, p.periodMonth, v);
                    }}
                    step={metric.unit === 'percent' ? 0.1 : 1}
                  />
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

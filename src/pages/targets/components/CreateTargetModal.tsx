import { useState } from 'react';
import { useAppStore } from '../../../store/appStore';
import { TargetPathType, Directionality, MetricUnit } from '../../../types';
import { SIMULATOR_DRIVER_MAPPING } from '../../../data/metricDefinitions';
import { Plus, Trash2, X } from 'lucide-react';

interface ObjInput {
  name: string;
  description: string;
  color: string;
  metrics: MetricInput[];
}

interface MetricInput {
  key: string;
  displayName: string;
  baseline: number;
  target: number;
  directionality: Directionality;
  unit: MetricUnit;
  simulatorDriverKey: string | null;
  pathType: TargetPathType;
}

const COLORS = ['#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4'];

export default function CreateTargetModal({ onClose }: { onClose: () => void }) {
  const { createTargetFromScratch } = useAppStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [owner, setOwner] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState('');

  const [objectives, setObjectives] = useState<ObjInput[]>([
    { name: '', description: '', color: COLORS[0], metrics: [emptyMetric()] },
  ]);

  function addObjective() {
    setObjectives([...objectives, {
      name: '', description: '', color: COLORS[objectives.length % COLORS.length],
      metrics: [emptyMetric()],
    }]);
  }

  function addMetric(objIdx: number) {
    const next = [...objectives];
    next[objIdx] = { ...next[objIdx], metrics: [...next[objIdx].metrics, emptyMetric()] };
    setObjectives(next);
  }

  function removeMetric(objIdx: number, mIdx: number) {
    const next = [...objectives];
    next[objIdx] = { ...next[objIdx], metrics: next[objIdx].metrics.filter((_, i) => i !== mIdx) };
    setObjectives(next);
  }

  function removeObjective(objIdx: number) {
    setObjectives(objectives.filter((_, i) => i !== objIdx));
  }

  function updateObj(objIdx: number, field: string, val: string) {
    const next = [...objectives];
    next[objIdx] = { ...next[objIdx], [field]: val };
    setObjectives(next);
  }

  function updateMetric(objIdx: number, mIdx: number, field: string, val: any) {
    const next = [...objectives];
    const metrics = [...next[objIdx].metrics];
    metrics[mIdx] = { ...metrics[mIdx], [field]: val };
    next[objIdx] = { ...next[objIdx], metrics };
    setObjectives(next);
  }

  const canSubmit = name && endDate && objectives.length > 0 && objectives.every(o => o.name && o.metrics.length > 0);

  function handleSubmit() {
    const objInputs = objectives.map(o => ({ name: o.name, description: o.description, color: o.color }));
    const metricInputs = objectives.flatMap((o, objIdx) =>
      o.metrics.map(m => ({
        objectiveIndex: objIdx,
        key: m.key || m.displayName.toLowerCase().replace(/\s+/g, '_'),
        displayName: m.displayName,
        baseline: m.baseline,
        target: m.target,
        directionality: m.directionality,
        unit: m.unit,
        simulatorDriverKey: m.simulatorDriverKey,
        pathType: m.pathType,
      }))
    );
    createTargetFromScratch(name, desc, owner, startDate, endDate, objInputs, metricInputs);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create New OKR Target</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium">Plan Name</label>
              <input className="input-field w-full mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Q2 2026 OKRs" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea className="input-field w-full mt-1" rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input type="date" className="input-field w-full mt-1" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input type="date" className="input-field w-full mt-1" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Owner</label>
              <input className="input-field w-full mt-1" value={owner} onChange={e => setOwner(e.target.value)} />
            </div>
          </div>

          {/* Objectives */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Objectives & Key Results</h4>
              <button onClick={addObjective} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus size={12} /> Add Objective
              </button>
            </div>

            {objectives.map((obj, objIdx) => (
              <div key={objIdx} className="border rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: obj.color }} />
                  <input
                    className="flex-1 input-field text-sm"
                    placeholder="Objective name"
                    value={obj.name}
                    onChange={e => updateObj(objIdx, 'name', e.target.value)}
                  />
                  {objectives.length > 1 && (
                    <button onClick={() => removeObjective(objIdx)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Metrics for this objective */}
                <div className="space-y-2 ml-6">
                  {obj.metrics.map((m, mIdx) => (
                    <div key={mIdx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        className="col-span-4 input-field text-xs"
                        placeholder="KR name"
                        value={m.displayName}
                        onChange={e => updateMetric(objIdx, mIdx, 'displayName', e.target.value)}
                      />
                      <input
                        type="number"
                        className="col-span-2 input-field text-xs text-center"
                        placeholder="Start"
                        value={m.baseline || ''}
                        onChange={e => updateMetric(objIdx, mIdx, 'baseline', parseFloat(e.target.value) || 0)}
                      />
                      <input
                        type="number"
                        className="col-span-2 input-field text-xs text-center"
                        placeholder="Target"
                        value={m.target || ''}
                        onChange={e => updateMetric(objIdx, mIdx, 'target', parseFloat(e.target.value) || 0)}
                      />
                      <select
                        className="col-span-2 input-field text-xs"
                        value={m.directionality}
                        onChange={e => updateMetric(objIdx, mIdx, 'directionality', e.target.value)}
                      >
                        <option value="higher_better">Higher</option>
                        <option value="lower_better">Lower</option>
                      </select>
                      <select
                        className="col-span-1 input-field text-xs"
                        value={m.pathType}
                        onChange={e => updateMetric(objIdx, mIdx, 'pathType', e.target.value)}
                      >
                        <option value="linear">Lin</option>
                        <option value="front_loaded">Frnt</option>
                        <option value="back_loaded">Back</option>
                      </select>
                      <button
                        onClick={() => removeMetric(objIdx, mIdx)}
                        className="col-span-1 text-red-400 hover:text-red-600 flex justify-center"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addMetric(objIdx)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus size={10} /> Add Key Result
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button className="btn-primary w-full" disabled={!canSubmit} onClick={handleSubmit}>
            Create OKR Target
          </button>
        </div>
      </div>
    </div>
  );
}

function emptyMetric(): MetricInput {
  return {
    key: '',
    displayName: '',
    baseline: 0,
    target: 0,
    directionality: 'higher_better',
    unit: 'count',
    simulatorDriverKey: null,
    pathType: 'linear',
  };
}

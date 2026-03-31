import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { Plus, Edit3, Archive, History, Zap } from 'lucide-react';
import { TargetVersion } from '../../types';
import TargetEditTab from './components/TargetEditTab';
import TargetActualsTab from './components/TargetActualsTab';
import TargetReportTab from './components/TargetReportTab';
import TargetBizMetricsTab from './components/TargetBizMetricsTab';
import CreateTargetModal from './components/CreateTargetModal';

export default function TargetsPage() {
  const { targetPlans, targetVersions, archiveTarget, activateTargetVersion, reviseTarget, syncTargetsToSimulator, currentUser } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(targetPlans[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'biz' | 'edit' | 'actuals' | 'report'>('biz');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [reviseNote, setReviseNote] = useState('');

  const selectedPlan = targetPlans.find(p => p.id === selectedPlanId);
  const planVersions = targetVersions.filter(v => v.targetPlanId === selectedPlanId);
  const activeVersion = planVersions.find(v => v.id === selectedPlan?.activeVersionId) || planVersions[0];

  // Count simulator-connected metrics
  const simMetricCount = activeVersion?.metrics.filter(m => m.simulatorDriverKey).length || 0;

  const hasBizMetrics = activeVersion?.objectives.some(o => o.id === 'obj-biz-metrics');

  const tabs = [
    { key: 'biz' as const, label: 'Business Metrics' },
    { key: 'edit' as const, label: 'OKR Targets' },
    { key: 'actuals' as const, label: 'Actuals' },
    { key: 'report' as const, label: 'Report' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OKR Targets</h1>
          <p className="text-sm text-gray-500 mt-1">Set objectives, track key results, enter actuals</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-1.5">
            <Plus size={15} /> New Target
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Plan List Sidebar */}
        <div className="w-72 shrink-0 space-y-2">
          {targetPlans.map(plan => {
            const isSelected = plan.id === selectedPlanId;
            const version = targetVersions.find(v => v.id === plan.activeVersionId);
            const objCount = version?.objectives?.length || 0;
            const metricCount = version?.metrics?.length || 0;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`card p-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    plan.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    plan.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {plan.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{plan.description}</p>
                {version && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    v{version.versionNumber} | {objCount} objectives | {metricCount} KRs
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail Area */}
        {selectedPlan && activeVersion ? (
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="card p-5 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedPlan.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedPlan.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Owner: {selectedPlan.owner}</span>
                    <span>v{activeVersion.versionNumber}</span>
                    <span>{activeVersion.startDate.substring(0, 7)} to {activeVersion.endDate.substring(0, 7)}</span>
                    <span>{activeVersion.objectives.length} objectives</span>
                    <span>{activeVersion.metrics.length} key results</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {simMetricCount > 0 && (
                    <button
                      onClick={() => syncTargetsToSimulator(activeVersion.id)}
                      className="btn-secondary flex items-center gap-1 text-xs text-purple-600 border-purple-200 hover:bg-purple-50"
                      title="Push target values to simulator drivers"
                    >
                      <Zap size={13} /> Sync to Sim ({simMetricCount})
                    </button>
                  )}
                  <button onClick={() => setShowVersionHistory(true)} className="btn-secondary flex items-center gap-1 text-xs">
                    <History size={13} /> History
                  </button>
                  {isAdmin && (
                    <>
                      <button onClick={() => { setReviseNote(''); setShowReviseModal(true); }} className="btn-secondary flex items-center gap-1 text-xs">
                        <Edit3 size={13} /> Revise
                      </button>
                      {selectedPlan.status !== 'active' && (
                        <button onClick={() => activateTargetVersion(selectedPlan.id, activeVersion.id)} className="btn-primary text-xs">
                          Activate
                        </button>
                      )}
                      <button onClick={() => archiveTarget(selectedPlan.id)} className="btn-secondary text-xs text-red-600 border-red-200 hover:bg-red-50">
                        <Archive size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 mt-4 border-t pt-3">
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`text-sm font-medium pb-1 ${activeTab === t.key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'biz' && <TargetBizMetricsTab version={activeVersion} isAdmin={isAdmin} />}
            {activeTab === 'edit' && <TargetEditTab version={activeVersion} isAdmin={isAdmin} />}
            {activeTab === 'actuals' && <TargetActualsTab version={activeVersion} isAdmin={isAdmin} />}
            {activeTab === 'report' && <TargetReportTab version={activeVersion} />}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a target plan or create a new one
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateTargetModal onClose={() => setShowCreateModal(false)} />}

      {showReviseModal && selectedPlan && activeVersion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowReviseModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Create Revision (v{activeVersion.versionNumber + 1})</h3>
            <p className="text-sm text-gray-500 mb-4">Current version becomes read-only.</p>
            <textarea className="input-field w-full" rows={3} value={reviseNote} onChange={e => setReviseNote(e.target.value)} placeholder="Revision note..." />
            <button className="btn-primary w-full mt-4" disabled={!reviseNote} onClick={() => {
              reviseTarget(selectedPlan.id, reviseNote);
              setShowReviseModal(false);
            }}>Create Revision</button>
          </div>
        </div>
      )}

      {showVersionHistory && selectedPlan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowVersionHistory(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Version History</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {targetVersions.filter(v => v.targetPlanId === selectedPlan.id).sort((a, b) => b.versionNumber - a.versionNumber).map(v => (
                <div key={v.id} className={`p-3 rounded-lg border ${v.status === 'active' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">v{v.versionNumber}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${v.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{v.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{v.revisionNote}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{v.objectives.length} objectives, {v.metrics.length} KRs</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowVersionHistory(false)} className="btn-secondary w-full mt-4">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

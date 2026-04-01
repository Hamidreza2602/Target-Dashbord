import { useState } from 'react';
import { metricDefinitions, categoryLabels } from '../../data/metricDefinitions';
import { formulaVersions } from '../../data/mockData';
import { MetricCategory } from '../../types';
import { BookOpen, Code, Database, Search } from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'formulas' | 'data'>('metrics');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MetricCategory | 'all'>('all');

  const filteredMetrics = metricDefinitions.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.key.includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin / Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Metric definitions, formula versions, and data settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        {[
          { key: 'metrics', label: 'Metric Library', icon: BookOpen },
          { key: 'formulas', label: 'Formula Versions', icon: Code },
          { key: 'data', label: 'Data Settings', icon: Database },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'metrics' && (
        <div>
          {/* Search & Filter */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field w-full pl-9"
                placeholder="Search metrics..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input-field"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as MetricCategory | 'all')}
            >
              <option value="all">All Categories</option>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Metric Table */}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Key</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Category</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600">Unit</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600">Type</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600">Direction</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.map(m => (
                  <tr key={m.key} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{m.key}</td>
                    <td className="px-4 py-2.5 font-medium">{m.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {categoryLabels[m.category] || m.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-500">{m.unit}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${m.isInput ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {m.isInput ? 'Input' : 'Derived'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs ${m.directionality === 'higher_better' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.directionality === 'higher_better' ? 'Higher better' : 'Lower better'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">{m.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-3">{filteredMetrics.length} of {metricDefinitions.length} metrics shown</p>
        </div>
      )}

      {activeTab === 'formulas' && (
        <div className="space-y-4">
          {/* Formula Version Cards */}
          {formulaVersions.map(fv => (
            <div key={fv.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{fv.versionName}</h3>
                  <p className="text-sm text-gray-500 mt-1">{fv.notes}</p>
                  <p className="text-xs text-gray-400 mt-2">Effective: {fv.effectiveDate}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${
                  fv.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {fv.status}
                </span>
              </div>
            </div>
          ))}

          {/* Complete Formula Reference */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Complete Formula Reference</h3>
            <div className="space-y-6">

              {/* 1. User State Transitions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">1</span>
                  User State Transitions
                </h4>
                <div className="space-y-2 text-xs font-mono bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-400 text-[11px] not-italic">— shared sub-expressions —</p>
                  <p><span className="text-blue-600">survivingNewInstalls</span> = install[m] × (1 − freeUserChurnNew)</p>
                  <p><span className="text-blue-600">newConvertedToPaid</span> = survivingNewInstalls × convFreeToPaidNew</p>
                  <p><span className="text-blue-600">oldFreeSurviving</span> = freeUser[m−1] × (1 − churnFreeUserOld)</p>
                  <p><span className="text-blue-600">oldFreeConvBase</span> = oldFreeSurviving × convFreeToPaidOld × ½</p>
                  <p className="mt-2 text-gray-400 text-[11px] not-italic">— FreeUser[m] (5 terms) —</p>
                  <p><span className="text-emerald-600">term1</span> = oldFreeSurviving</p>
                  <p><span className="text-emerald-600">term2</span> = survivingNewInstalls × (1 − convFreeToPaidNew)</p>
                  <p><span className="text-emerald-600">term3</span> = newConvertedToPaid × (1 − paidUserChurnNew) × backToFreeNew</p>
                  <p><span className="text-emerald-600">term4</span> = paidUser[m−1] × (1 − paidUserChurnOld) × backToFreeOld</p>
                  <p><span className="text-emerald-600">term5</span> = oldFreeConvBase × (1 − paidUserChurnNew) × ½ × backToFreeNew</p>
                  <p><span className="text-blue-600">freeUser[m]</span> = term1 + term2 + term3 + term4 + term5</p>
                  <p className="mt-2 text-gray-400 text-[11px] not-italic">— PaidUser[m] (3 terms) —</p>
                  <p><span className="text-blue-600">paidUser[m]</span> = paidUser[m−1] × (1 − paidUserChurnOld)</p>
                  <p className="pl-4 text-gray-600">+ install[m] × (1 − freeUserChurnNew) × convFreeToPaidNew</p>
                  <p className="pl-4 text-gray-600">+ oldFreeConvBase × (1 − paidUserChurnNew)</p>
                </div>
              </div>

              {/* 2. Revenue */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded">2</span>
                  Revenue
                </h4>
                <div className="space-y-1.5 text-xs font-mono bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-400 text-[11px] not-italic">— ARPURecurringOld is derived, not a driver input —</p>
                  <p><span className="text-blue-600">arpuRecurringOld</span> = MRRRecurring[m−1] / paidUser[m−1]</p>
                  <p className="mt-1 text-gray-400 text-[11px] not-italic">— MRRRecurring splits old vs new customers —</p>
                  <p><span className="text-blue-600">oldPaidCount</span> = paidUser[m−1] × (1 − paidUserChurnOld)</p>
                  <p><span className="text-blue-600">oldFreeConvCount</span> = oldFreeConvBase × (1 − paidUserChurnNew)</p>
                  <p><span className="text-blue-600">newInstallCount</span> = newConvertedToPaid × (1 − paidUserChurnNew)</p>
                  <p><span className="text-blue-600">mrrRecurring</span> = arpuRecurringOld × (oldPaidCount + oldFreeConvCount) + newInstallCount × arpuRecurringNew</p>
                  <p><span className="text-blue-600">mrrSMS</span> = paidUser[m] × smsCustomersPct × arpuSMS</p>
                  <p><span className="text-blue-600">preorderPayingUsers[0]</span> = baseline.customers × baseline.preorderPct</p>
                  <p><span className="text-blue-600">preorderPayingUsers[m]</span> = preorderPayingUsers[m-1] × (1 − paidChurnOld − backToFreeOld)</p>
                  <p><span className="text-blue-600">preorderPct[m]</span> = preorderPayingUsers[m] / paidUser[m]</p>
                  <p><span className="text-blue-600">mrrPreorder</span> = paidUser[m] × preorderPct[m] × arpuPreorder</p>
                  <p><span className="text-blue-600">MRR[m]</span> = mrrRecurring + mrrSMS + mrrPreorder</p>
                  <p><span className="text-blue-600">ARR</span> = MRR[m] × 12</p>
                  <p><span className="text-blue-600">derivedARPU</span> = mrrRecurring / paidUser[m]</p>
                </div>
              </div>

              {/* 3. Retention & Revenue Quality */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">3</span>
                  Retention &amp; Revenue Quality
                </h4>
                <div className="space-y-1.5 text-xs font-mono bg-gray-50 rounded-lg p-4">
                  <p><span className="text-blue-600">churnedMRR</span> = oldPaidChurned × arpuRecurring</p>
                  <p><span className="text-blue-600">backToFreeMRR</span> = oldBackToFree × arpuRecurring</p>
                  <p><span className="text-blue-600">GRR</span> = ((prevMRR − churnedMRR − backToFreeMRR) / prevMRR) × 100</p>
                  <p><span className="text-blue-600">NRR</span> = (currentMrrRecurring / prevMrrRecurring) × 100</p>
                  <p><span className="text-blue-600">CLV</span> = (derivedARPU × 12) / min(paidChurnRateOld × 12, 1)</p>
                </div>
              </div>

              {/* 4. Cost & Acquisition */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded">4</span>
                  Cost &amp; Acquisition
                </h4>
                <div className="space-y-1.5 text-xs font-mono bg-gray-50 rounded-lg p-4">
                  <p><span className="text-blue-600">CPL</span> = spend / visits</p>
                  <p><span className="text-blue-600">CPA</span> = spend / installs</p>
                  <p><span className="text-blue-600">CAC</span> = spend / newCustomers</p>
                </div>
              </div>

              {/* 5. Actuals from Real Data */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="bg-cyan-100 text-cyan-700 text-xs px-2 py-0.5 rounded">5</span>
                  Actuals from Real Data
                </h4>
                <div className="space-y-1.5 text-xs font-mono bg-gray-50 rounded-lg p-4">
                  <p><span className="text-blue-600">freeUsers</span> = active − paid</p>
                  <p><span className="text-blue-600">MRR</span> = arpuRecurring × paid</p>
                  <p><span className="text-blue-600">newMRR</span> = subscribe × arpuRecurring</p>
                  <p><span className="text-blue-600">expansionMRR</span> = upgrade × arpuRecurring × 0.4</p>
                  <p><span className="text-blue-600">contractionMRR</span> = downgrade × arpuRecurring × 0.3</p>
                  <p><span className="text-blue-600">churnMRR</span> = (paid × custChurnAll + deactive) × arpuRecurring</p>
                </div>
              </div>

              {/* 6. Target Path Interpolation */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded">6</span>
                  Target Path Interpolation
                </h4>
                <div className="space-y-1.5 text-xs font-mono bg-gray-50 rounded-lg p-4">
                  <p><span className="text-blue-600">linear</span> = baseline + diff × t</p>
                  <p><span className="text-blue-600">frontLoaded</span> = ln(1 + t × (e − 1))</p>
                  <p><span className="text-blue-600">backLoaded</span> = (e^t − 1) / (e − 1)</p>
                </div>
              </div>

              {/* 7. OKR Status */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded">7</span>
                  OKR Status
                </h4>
                <div className="space-y-1.5 text-xs font-mono bg-gray-50 rounded-lg p-4">
                  <p><span className="text-blue-600">attainment</span> (higher better) = (actual / expectedToDate) × 100</p>
                  <p><span className="text-blue-600">attainment</span> (lower better) = (expectedToDate / actual) × 100</p>
                  <p><span className="text-blue-600">variance</span> = (actual − expectedToDate) / expectedToDate × 100</p>
                  <p><span className="text-blue-600">projection</span> = actual + (actual − baseline) × ((1 − progress) / progress)</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Data Mode</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">Mock Data</span>
              <p className="text-sm text-gray-500">Using generated mock data. Live integrations not connected.</p>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Mock Data Coverage</h3>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Historical Months</p>
                <p className="text-xl font-bold">24</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Metrics Tracked</p>
                <p className="text-xl font-bold">{metricDefinitions.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Data Source</p>
                <p className="text-xl font-bold">Generated</p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Business Settings</h3>
            <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
              <div>
                <span className="text-gray-500">Currency</span>
                <p className="font-medium">USD ($)</p>
              </div>
              <div>
                <span className="text-gray-500">Timezone</span>
                <p className="font-medium">America/New_York</p>
              </div>
              <div>
                <span className="text-gray-500">NRR Denominator</span>
                <p className="font-medium">StartingARR (canonical)</p>
              </div>
              <div>
                <span className="text-gray-500">Default Frame</span>
                <p className="font-medium">30 days</p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Future Integrations</h3>
            <div className="space-y-2 text-sm text-gray-500">
              <p>Shopify Partner API (planned)</p>
              <p>Google Analytics 4 (planned)</p>
              <p>Ad Platform APIs (planned)</p>
              <p>Internal Database (planned)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
        <div>
          <div className="space-y-4">
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

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Core Formulas</h4>
                  <div className="space-y-2 text-xs font-mono bg-gray-50 rounded-lg p-4">
                    <p><span className="text-blue-600">MRR</span> = StartingMRR + NewMRR + RestartMRR + ExpansionMRR - ChurnMRR - ContractionMRR</p>
                    <p><span className="text-blue-600">ARR</span> = MRR * 12</p>
                    <p><span className="text-blue-600">GRR</span> = (StartingARR - ContractionARR - ChurnARR) / StartingARR</p>
                    <p><span className="text-blue-600">NRR</span> = (StartingARR + ExpansionARR - ContractionARR - ChurnARR) / StartingARR</p>
                    <p><span className="text-blue-600">CLV</span> = ARPU(Yearly) / CustomerChurnRate(Yearly)</p>
                    <p><span className="text-blue-600">ARPU</span> = MRR / Customers</p>
                    <p><span className="text-blue-600">CAC</span> = Spend / NewCustomers</p>
                    <p><span className="text-blue-600">CPA</span> = Spend / Installs</p>
                    <p><span className="text-blue-600">CPL</span> = Spend / Visits</p>
                  </div>
                </div>
              </div>
            ))}
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

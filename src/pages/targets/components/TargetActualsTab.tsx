import { useAppStore } from '../../../store/appStore';
import { TargetVersion } from '../../../types';
import { format } from 'date-fns';

export default function TargetActualsTab({ version, isAdmin = true }: { version: TargetVersion; isAdmin?: boolean }) {
  const { updateActualValue } = useAppStore();
  const now = format(new Date(), 'yyyy-MM');

  return (
    <div className="space-y-6">
      {version.objectives.map(obj => {
        const metrics = version.metrics.filter(m => m.objectiveId === obj.id);
        if (metrics.length === 0) return null;

        return (
          <div key={obj.id} className="card overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: obj.color }} />
              <h3 className="font-semibold text-sm text-gray-900">{obj.name}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-3 py-2 font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[80px]">Month</th>
                    {metrics.map(m => (
                      <th key={m.id} className="text-center px-2 py-2 font-medium text-gray-600 min-w-[120px]">
                        <div className="text-xs">{m.displayName}</div>
                        <div className="text-[10px] text-gray-400 font-normal">
                          {m.baselineValue} → {m.finalTargetValue}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics[0]?.periods.map((_, periodIdx) => {
                    const periodMonth = metrics[0].periods[periodIdx].periodMonth;
                    const isPast = periodMonth <= now;
                    const isCurrent = periodMonth === now;

                    return (
                      <tr key={periodMonth} className={`border-t border-gray-100 ${isCurrent ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-3 py-2 font-medium sticky left-0 bg-white text-xs text-gray-600">
                          {periodMonth.substring(2).replace('-', '/')}
                          {isCurrent && <span className="ml-1 text-blue-500 text-[10px]">now</span>}
                        </td>
                        {metrics.map(m => {
                          const period = m.periods[periodIdx];
                          if (!period) return <td key={m.id} />;

                          const target = period.targetValue;
                          const actual = period.actualValue;
                          const isGood = actual !== null && (
                            m.directionality === 'higher_better' ? actual >= target : actual <= target
                          );
                          const isBad = actual !== null && !isGood;

                          return (
                            <td key={m.id} className="px-2 py-1.5 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <input
                                  type="number"
                                  disabled={!isPast || !isAdmin}
                                  className={`w-20 text-center text-xs border rounded px-1.5 py-1
                                    ${(!isPast || !isAdmin) ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed' :
                                      isBad ? 'border-red-300 bg-red-50 text-red-700' :
                                      isGood ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
                                      'border-gray-200'}
                                    focus:ring-1 focus:ring-blue-400 focus:border-blue-400`}
                                  value={actual ?? ''}
                                  placeholder={isPast ? '—' : ''}
                                  onChange={e => {
                                    const v = e.target.value === '' ? null : parseFloat(e.target.value);
                                    updateActualValue(version.id, m.id, period.periodMonth, v);
                                  }}
                                  step={m.unit === 'percent' ? 0.1 : 1}
                                />
                                <span className="text-[10px] text-gray-400">{target}</span>
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
        );
      })}

      <p className="text-xs text-gray-400 text-center">
        Enter actual values for past and current months. Green = beating target, Red = behind target.
      </p>
    </div>
  );
}

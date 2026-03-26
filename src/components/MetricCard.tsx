import { MetricReportCard } from '../types';
import { formatMetricValue } from '../utils/format';
import StatusBadge from './StatusBadge';
import { metricsByKey } from '../data/metricDefinitions';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  card: MetricReportCard;
}

export default function MetricCard({ card }: Props) {
  const def = metricsByKey[card.metricKey];
  const isPositiveVariance =
    card.directionality === 'higher_better'
      ? card.varianceAmount >= 0
      : card.varianceAmount <= 0;

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{card.metricName}</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatMetricValue(card.actual, card.unit)}
          </p>
        </div>
        <StatusBadge status={card.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Final Target</span>
          <p className="font-medium">{formatMetricValue(card.finalTarget, card.unit)}</p>
        </div>
        <div>
          <span className="text-gray-500">Expected Today</span>
          <p className="font-medium">{formatMetricValue(card.expectedToDate, card.unit)}</p>
        </div>
        <div>
          <span className="text-gray-500">Attainment</span>
          <p className="font-medium">{card.attainmentVsFinal.toFixed(1)}%</p>
        </div>
        <div>
          <span className="text-gray-500">Variance</span>
          <p className={`font-medium flex items-center gap-1 ${isPositiveVariance ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositiveVariance ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {card.variancePercent >= 0 ? '+' : ''}{card.variancePercent.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
        <span className="text-gray-500">Projected End</span>
        <p className="font-semibold text-gray-900">
          {formatMetricValue(card.projectedEndValue, card.unit)}
        </p>
      </div>
    </div>
  );
}

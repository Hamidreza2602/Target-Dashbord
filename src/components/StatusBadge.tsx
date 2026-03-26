import { MetricStatus } from '../types';

interface Props {
  status: MetricStatus;
}

const statusConfig: Record<MetricStatus, { label: string; className: string }> = {
  ahead: { label: 'Ahead', className: 'status-ahead' },
  on_track: { label: 'On Track', className: 'status-on-track' },
  behind: { label: 'Behind', className: 'status-behind' },
};

export default function StatusBadge({ status }: Props) {
  const config = statusConfig[status];
  return <span className={config.className}>{config.label}</span>;
}

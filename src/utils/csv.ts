import { ForecastMonth } from '../types';

export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => {
    const val = row[h];
    if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
    return val;
  }).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function forecastToCSVData(months: ForecastMonth[]): Record<string, any>[] {
  return months.map(m => ({
    Month: m.month,
    Customers: m.customers,
    'Free Users': m.freeUsers,
    'New Customers': m.newCustomers,
    'Old Customers': m.oldCustomers,
    Installs: m.installs,
    'Surviving New Installs': m.survivingNewInstalls,
    'New Converted to Paid': m.newConvertedToPaid,
    'New Back to Free': m.newBackToFree,
    'Old Free Churned': m.oldFreeChurned,
    'Old Paid Churned': m.oldPaidChurned,
    'Old Back to Free': m.oldBackToFree,
    'MRR Recurring': m.mrrRecurring,
    'MRR Preorder': m.mrrPreorder,
    'MRR SMS': m.mrrSMS,
    'Total Revenue': m.totalRevenue,
    ARR: m.arr,
    'ARPU Recurring': m.arpuRecurring,
    'ARPU Preorder': m.arpuPreorder,
    'ARPU SMS': m.arpuSMS,
    'Preorder Customers %': m.preorderCustomersPct,
    'SMS Customers %': m.smsCustomersPct,
    GRR: m.grr,
    NRR: m.nrr,
    CLV: m.clv,
    'Free Churn Old %': m.freeChurnRateOld,
    'Free Churn New %': m.freeChurnRateNew,
    'Paid Churn Old %': m.paidChurnRateOld,
    'Paid Churn New %': m.paidChurnRateNew,
    'User Conv New %': m.userConversionRateNew,
    'Back to Free Old %': m.backToFreeRateOld,
    'Back to Free New %': m.backToFreeRateNew,
    Visits: m.visits,
    Spend: m.spend,
    CPA: m.cpa,
    CAC: m.cac,
  }));
}

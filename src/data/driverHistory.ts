/**
 * Historical monthly driver values sourced from Tableau / Core Other dashboards
 * Date range: April 2025 – March 2026
 * Values are the last-day-of-month reading (each day's value = rolling 30-day window).
 */
export const DRIVER_HISTORY: Record<string, Record<string, number>> = {
  installs: {
    '2025-04': 2199, '2025-05': 1923, '2025-06': 1808,
    '2025-07': 1882, '2025-08': 2396, '2025-09': 2714,
    '2025-10': 2491, '2025-11': 2710, '2025-12': 2151,
    '2026-01': 2363, '2026-02': 2196, '2026-03': 1689,
  },
  user_conv_rate_new: {
    '2025-04': 13.2, '2025-05': 11.5, '2025-06': 12.2,
    '2025-07': 11.0, '2025-08': 9.8,  '2025-09': 8.9,
    '2025-10': 9.9,  '2025-11': 9.8,  '2025-12': 7.5,
    '2026-01': 9.4,  '2026-02': 7.6,  '2026-03': 13.9,
  },
  conv_rate_old: {
    '2025-04': 1.3, '2025-05': 1.2, '2025-06': 1.3,
    '2025-07': 1.2, '2025-08': 1.0, '2025-09': 1.4,
    '2025-10': 0.8, '2025-11': 1.2, '2025-12': 0.9,
    '2026-01': 0.6, '2026-02': 0.8, '2026-03': 0.9,
  },
  free_churn_rate_old: {
    '2025-04': 5.4, '2025-05': 5.0, '2025-06': 4.9,
    '2025-07': 4.6, '2025-08': 4.4, '2025-09': 5.0,
    '2025-10': 4.4, '2025-11': 4.6, '2025-12': 4.7,
    '2026-01': 5.6, '2026-02': 5.1, '2026-03': 4.8,
  },
  free_churn_rate_new: {
    '2025-04': 32, '2025-05': 32, '2025-06': 36,
    '2025-07': 35, '2025-08': 35, '2025-09': 37,
    '2025-10': 35, '2025-11': 36, '2025-12': 36,
    '2026-01': 36, '2026-02': 35, '2026-03': 30,
  },
  paid_churn_rate_old: {
    '2025-04': 5.6, '2025-05': 4.5, '2025-06': 4.6,
    '2025-07': 4.2, '2025-08': 4.5, '2025-09': 3.8,
    '2025-10': 5.3, '2025-11': 5.5, '2025-12': 4.3,
    '2026-01': 4.9, '2026-02': 4.9, '2026-03': 4.6,
  },
  paid_churn_rate_new: {
    '2025-04': 7.5,  '2025-05': 7.4,  '2025-06': 4.9,
    '2025-07': 7.1,  '2025-08': 9.4,  '2025-09': 10.1,
    '2025-10': 7.9,  '2025-11': 8.3,  '2025-12': 13.9,
    '2026-01': 6.9,  '2026-02': 12.1, '2026-03': 7.0,
  },
  back_to_free_rate_old: {
    '2025-04': 1.5, '2025-05': 1.3, '2025-06': 1.3,
    '2025-07': 1.4, '2025-08': 1.5, '2025-09': 1.1,
    '2025-10': 1.3, '2025-11': 0.9, '2025-12': 1.0,
    '2026-01': 1.1, '2026-02': 1.3, '2026-03': 1.1,
  },
  back_to_free_rate_new: {
    '2025-04': 0.9, '2025-05': 1.3, '2025-06': 0.2,
    '2025-07': 0.7, '2025-08': 1.5, '2025-09': 1.0,
    '2025-10': 1.1, '2025-11': 1.4, '2025-12': 2.9,
    '2026-01': 1.8, '2026-02': 2.6, '2026-03': 1.1,
  },
  preorder_customers_pct: {
    '2025-04': 13.9, '2025-05': 13.8, '2025-06': 13.6,
    '2025-07': 13.1, '2025-08': 13.2, '2025-09': 13.7,
    '2025-10': 14.1, '2025-11': 15.0, '2025-12': 13.6,
    '2026-01': 12.8, '2026-02': 12.1, '2026-03': 11.3,
  },
  sms_customers_pct: {
    '2025-04': 29.7, '2025-05': 29.8, '2025-06': 30.5,
    '2025-07': 31.6, '2025-08': 31.7, '2025-09': 32.0,
    '2025-10': 32.6, '2025-11': 35.9, '2025-12': 34.6,
    '2026-01': 33.9, '2026-02': 33.9, '2026-03': 33.8,
  },
};

/** Linear regression extrapolation of historical data into future months. */
export function computeTrend(
  driverKey: string,
  futureMonths: string[],
  historyWindow = 6,
): Record<string, number> {
  const history = DRIVER_HISTORY[driverKey];
  if (!history || futureMonths.length === 0) return {};

  const allMonths = Object.keys(history).sort();
  const window = allMonths.slice(-historyWindow);
  const vals = window.map(m => history[m]);
  const n = vals.length;
  if (n < 2) return {};

  const sumX = (n * (n - 1)) / 2;
  const sumY = vals.reduce((a, b) => a + b, 0);
  const sumXY = vals.reduce((acc, y, i) => acc + i * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return {};
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const result: Record<string, number> = {};
  futureMonths.forEach((m, i) => {
    result[m] = Math.round((intercept + slope * (n + i)) * 100) / 100;
  });
  return result;
}

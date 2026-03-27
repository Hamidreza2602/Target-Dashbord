/**
 * Historical monthly driver values sourced from Tableau / Core Other dashboards
 * Date range: April 2025 – March 2026
 * Values are monthly averages of daily readings.
 */
export const DRIVER_HISTORY: Record<string, Record<string, number>> = {
  installs: {
    '2025-04': 2202, '2025-05': 2045, '2025-06': 1874,
    '2025-07': 1761, '2025-08': 2144, '2025-09': 2690,
    '2025-10': 2575, '2025-11': 2520, '2025-12': 2602,
    '2026-01': 2123, '2026-02': 2324, '2026-03': 1958,
  },
  user_conv_rate_new: {
    '2025-04': 12.62, '2025-05': 12.06, '2025-06': 11.81,
    '2025-07': 13.20, '2025-08': 10.32, '2025-09': 10.21,
    '2025-10': 9.04,  '2025-11': 9.72,  '2025-12': 9.55,
    '2026-01': 7.60,  '2026-02': 8.60,  '2026-03': 10.47,
  },
  conv_rate_old: {
    '2025-04': 1.41, '2025-05': 1.27, '2025-06': 1.23,
    '2025-07': 1.21, '2025-08': 1.03, '2025-09': 1.18,
    '2025-10': 0.97, '2025-11': 1.11, '2025-12': 1.08,
    '2026-01': 0.63, '2026-02': 0.75, '2026-03': 0.83,
  },
  free_churn_rate_old: {
    '2025-04': 5.60, '2025-05': 5.19, '2025-06': 5.00,
    '2025-07': 4.64, '2025-08': 4.51, '2025-09': 4.55,
    '2025-10': 4.96, '2025-11': 4.34, '2025-12': 4.69,
    '2026-01': 5.31, '2026-02': 5.38, '2026-03': 4.92,
  },
  paid_churn_rate_old: {
    '2025-04': 5.93, '2025-05': 4.90, '2025-06': 4.90,
    '2025-07': 4.18, '2025-08': 4.34, '2025-09': 4.17,
    '2025-10': 4.34, '2025-11': 5.72, '2025-12': 4.98,
    '2026-01': 4.75, '2026-02': 4.95, '2026-03': 4.69,
  },
  paid_churn_rate_new: {
    '2025-04': 8.49, '2025-05': 7.34, '2025-06': 5.85,
    '2025-07': 6.91, '2025-08': 8.87, '2025-09': 9.00,
    '2025-10': 8.94, '2025-11': 8.47, '2025-12': 11.57,
    '2026-01': 10.26, '2026-02': 9.75, '2026-03': 8.96,
  },
  back_to_free_rate_old: {
    '2025-04': 1.57, '2025-05': 1.40, '2025-06': 1.39,
    '2025-07': 1.17, '2025-08': 1.41, '2025-09': 1.36,
    '2025-10': 1.17, '2025-11': 1.12, '2025-12': 0.95,
    '2026-01': 1.19, '2026-02': 1.20, '2026-03': 1.18,
  },
  back_to_free_rate_new: {
    '2025-04': 1.06, '2025-05': 0.97, '2025-06': 1.15,
    '2025-07': 1.05, '2025-08': 1.18, '2025-09': 0.84,
    '2025-10': 1.49, '2025-11': 1.12, '2025-12': 2.11,
    '2026-01': 1.74, '2026-02': 2.43, '2026-03': 1.60,
  },
  preorder_customers_pct: {
    '2025-04': 13.73, '2025-05': 13.75, '2025-06': 13.66,
    '2025-07': 13.45, '2025-08': 13.08, '2025-09': 13.41,
    '2025-10': 14.03, '2025-11': 14.27, '2025-12': 15.00,
    '2026-01': 12.66, '2026-02': 12.51, '2026-03': 11.78,
  },
  sms_customers_pct: {
    '2025-04': 29.75, '2025-05': 29.75, '2025-06': 30.49,
    '2025-07': 30.81, '2025-08': 31.89, '2025-09': 31.69,
    '2025-10': 32.43, '2025-11': 34.13, '2025-12': 36.09,
    '2026-01': 33.66, '2026-02': 34.27, '2026-03': 33.65,
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

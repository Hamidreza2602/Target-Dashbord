import { BaselineSnapshot, ForecastMonth, DriverConfig } from '../types';
import { addMonths, format } from 'date-fns';

export interface ForecastInput {
  baseline: BaselineSnapshot;
  startDate: string;
  months: number;
  drivers: Record<string, DriverConfig>;
}

export interface ForecastWarning {
  month: string;
  metric: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface ForecastResult {
  months: ForecastMonth[];
  warnings: ForecastWarning[];
}

function drv(drivers: Record<string, DriverConfig>, key: string, month: string, fallback: number): number {
  const d = drivers[key];
  if (!d) return fallback;
  if (d.monthlyValues[month] !== undefined) return d.monthlyValues[month];
  return d.defaultValue;
}

/**
 * ## Forecast Engine v2 — Old/New Segmented Model
 *
 * ### Free Users:
 *   freeUsers[m] =
 *     (freeUsers[m-1] × (1 - freeChurnRateOld))                                              ← old free surviving
 *     + (Installs × (1 - freeChurnRateNew) × (1 - UserConvRateNew))                          ← new free surviving & not converting
 *     + (Customers[m-1] × BackToFreeRateOld)                                                  ← old paid → free
 *     + (Installs × (1 - freeChurnRateNew) × UserConvRateNew × BackToFreeRateNew)             ← new paid → free
 *
 * ### Customers:
 *   customers[m] =
 *     (customers[m-1] × (1 - paidChurnRateOld))                                              ← old paid surviving
 *     + (Installs × (1 - freeChurnRateNew) × UserConvRateNew × (1 - paidChurnRateNew) × (1 - BackToFreeRateNew))  ← new paid surviving
 *     - (Customers[m-1] × BackToFreeRateOld)                                                  ← old paid → free
 *
 * ### Revenue:
 *   MRR Recurring     = Customers[m] × ARPU Recurring
 *   MRR Preorder      = Customers[m] × PreorderPct × ARPU Preorder
 *   MRR SMS           = Customers[m] × SMS Pct × ARPU SMS
 *   Total Revenue     = MRR Recurring + MRR Preorder + MRR SMS
 *
 * ### Notes:
 *   - Transaction Fee = Preorder feature
 *   - ARPU Recurring is INPUT (driven); derived ARPU = MRR / Customers for validation
 *   - Old/New split applies to churn, conversion, and back-to-free rates
 */
export function runForecast(input: ForecastInput): ForecastResult {
  const { baseline, startDate, months: numMonths, drivers } = input;
  const results: ForecastMonth[] = [];
  const warnings: ForecastWarning[] = [];

  let freeUsers = baseline.metricValues.free_users || 0;
  let customers = baseline.metricValues.customers || 0;
  let arpuRec = baseline.metricValues.arpu_recurring || 22;

  for (let m = 0; m < numMonths; m++) {
    const monthDate = addMonths(new Date(startDate), m);
    const month = format(monthDate, 'yyyy-MM');

    // ═══════════════════════════════════════
    // 1. READ DRIVERS
    // ═══════════════════════════════════════
    const installs       = drv(drivers, 'installs', month, baseline.metricValues.installs || 1800);
    const visits         = drv(drivers, 'visits', month, baseline.metricValues.visits || 51000);
    const spend          = drv(drivers, 'spend', month, baseline.metricValues.spend || 5000);

    // Churn rates (old = existing users, new = from this month's installs)
    const freeChurnRateOld  = drv(drivers, 'free_churn_rate_old', month, 4.8) / 100;
    const freeChurnRateNew  = drv(drivers, 'free_churn_rate_new', month, 30) / 100;
    const paidChurnRateOld  = drv(drivers, 'paid_churn_rate_old', month, 4.5) / 100;
    const paidChurnRateNew  = drv(drivers, 'paid_churn_rate_new', month, 12) / 100;

    // Conversion & back-to-free
    const userConvRateNew    = drv(drivers, 'user_conv_rate_new', month, 2.3) / 100;
    const backToFreeRateOld  = drv(drivers, 'back_to_free_rate_old', month, 1.1) / 100;
    const backToFreeRateNew  = drv(drivers, 'back_to_free_rate_new', month, 1.5) / 100;

    // Revenue drivers
    const arpuRecInput       = drv(drivers, 'arpu_recurring', month, arpuRec);
    const preorderPct        = drv(drivers, 'preorder_customers_pct', month, 20) / 100;
    const arpuPreorder       = drv(drivers, 'arpu_preorder', month, 5.0);
    const smsPct             = drv(drivers, 'sms_customers_pct', month, 10) / 100;
    const arpuSMS            = drv(drivers, 'arpu_sms', month, 3.5);

    // ═══════════════════════════════════════
    // 2. VALIDATE
    // ═══════════════════════════════════════
    for (const [key, val, label] of [
      ['freeChurnRateOld', freeChurnRateOld, 'Free churn old'],
      ['freeChurnRateNew', freeChurnRateNew, 'Free churn new'],
      ['paidChurnRateOld', paidChurnRateOld, 'Paid churn old'],
      ['paidChurnRateNew', paidChurnRateNew, 'Paid churn new'],
      ['userConvRateNew', userConvRateNew, 'User conv new'],
    ] as [string, number, string][]) {
      if (val > 1) warnings.push({ month, metric: key, message: `${label} exceeds 100%`, severity: 'error' });
    }

    // ═══════════════════════════════════════
    // 3. USER STATE TRANSITIONS
    // ═══════════════════════════════════════
    const prevFreeUsers = freeUsers;
    const prevCustomers = customers;
    const prevMrrRec = prevCustomers * arpuRec;

    // --- New users funnel (from this month's installs) ---
    const survivingNewInstalls = installs * (1 - freeChurnRateNew);
    const newConvertedToPaid = survivingNewInstalls * userConvRateNew;
    const newBackToFree = newConvertedToPaid * backToFreeRateNew;
    const newPaidSurviving = newConvertedToPaid * (1 - paidChurnRateNew) * (1 - backToFreeRateNew);
    const newFreeStaying = survivingNewInstalls * (1 - userConvRateNew);

    // --- Old users ---
    const oldFreeSurviving = prevFreeUsers * (1 - freeChurnRateOld);
    const oldFreeChurned = prevFreeUsers * freeChurnRateOld;
    const oldPaidSurviving = prevCustomers * (1 - paidChurnRateOld);
    const oldPaidChurned = prevCustomers * paidChurnRateOld;
    const oldBackToFree = prevCustomers * backToFreeRateOld;

    // --- Compute final counts ---
    // Free Users = old free surviving + new free staying + old back-to-free + new back-to-free
    freeUsers = Math.max(0, Math.round(
      oldFreeSurviving
      + newFreeStaying
      + oldBackToFree
      + newBackToFree
    ));

    // Customers = old paid surviving + new paid surviving - old back-to-free
    customers = Math.max(0, Math.round(
      oldPaidSurviving
      + newPaidSurviving
      - oldBackToFree
    ));

    if (customers < 0) {
      warnings.push({ month, metric: 'customers', message: 'Customers went negative, clamped to 0', severity: 'error' });
      customers = 0;
    }

    // ═══════════════════════════════════════
    // 4. REVENUE
    // ═══════════════════════════════════════
    arpuRec = arpuRecInput;

    // MRR Recurring = customers × ARPU Recurring
    const mrrRecurring = customers * arpuRec;

    // MRR Preorder (= Transaction Fee) = customers × preorderPct × arpuPreorder
    const mrrPreorder = customers * preorderPct * arpuPreorder;

    // MRR SMS = customers × smsPct × arpuSMS
    const mrrSMS = customers * smsPct * arpuSMS;

    // Total Revenue
    const totalRevenue = mrrRecurring + mrrPreorder + mrrSMS;
    const arr = totalRevenue * 12;

    // ═══════════════════════════════════════
    // 5. DERIVED METRICS
    // ═══════════════════════════════════════
    const derivedArpu = customers > 0 ? mrrRecurring / customers : 0;

    // GRR = (prevMRR - churnMRR) / prevMRR (no expansion in this model)
    const churnedMrr = oldPaidChurned * arpuRec;
    const backToFreeMrr = oldBackToFree * arpuRec;
    const prevTotalMrr = prevMrrRec;
    const grr = prevTotalMrr > 0
      ? ((prevTotalMrr - churnedMrr - backToFreeMrr) / prevTotalMrr) * 100
      : 100;

    // NRR = endingMRR / startingMRR (captures all changes including new adds)
    const nrr = prevTotalMrr > 0 ? (mrrRecurring / prevTotalMrr) * 100 : 100;

    // CLV
    const yearlyChurn = Math.min(paidChurnRateOld * 12, 1);
    const clv = yearlyChurn > 0 ? (derivedArpu * 12) / yearlyChurn : 0;

    // Cost metrics
    const newCustomersThisMonth = Math.round(newPaidSurviving);
    const cpl = visits > 0 ? spend / visits : 0;
    const cpa = installs > 0 ? spend / installs : 0;
    const cac = newCustomersThisMonth > 0 ? spend / newCustomersThisMonth : 0;

    // ═══════════════════════════════════════
    // 6. PUSH RESULT
    // ═══════════════════════════════════════
    results.push({
      month,
      freeUsers,
      customers,
      newFreeUsers: Math.round(newFreeStaying + newBackToFree),
      oldFreeUsers: Math.round(oldFreeSurviving + oldBackToFree),
      newCustomers: Math.round(newPaidSurviving),
      oldCustomers: Math.round(oldPaidSurviving - oldBackToFree),

      installs,
      survivingNewInstalls: Math.round(survivingNewInstalls),
      newConvertedToPaid: Math.round(newConvertedToPaid),
      newPaidSurviving: Math.round(newPaidSurviving),
      newBackToFree: Math.round(newBackToFree),

      oldFreeChurned: Math.round(oldFreeChurned),
      oldPaidChurned: Math.round(oldPaidChurned),
      oldBackToFree: Math.round(oldBackToFree),

      mrrRecurring: Math.round(mrrRecurring),
      arpuRecurring: Math.round(arpuRec * 100) / 100,

      mrrPreorder: Math.round(mrrPreorder),
      preorderCustomersPct: Math.round(preorderPct * 10000) / 100,
      arpuPreorder: Math.round(arpuPreorder * 100) / 100,

      mrrSMS: Math.round(mrrSMS),
      smsCustomersPct: Math.round(smsPct * 10000) / 100,
      arpuSMS: Math.round(arpuSMS * 100) / 100,

      totalRevenue: Math.round(totalRevenue),
      arr: Math.round(arr),

      freeChurnRateNew: Math.round(freeChurnRateNew * 10000) / 100,
      freeChurnRateOld: Math.round(freeChurnRateOld * 10000) / 100,
      paidChurnRateNew: Math.round(paidChurnRateNew * 10000) / 100,
      paidChurnRateOld: Math.round(paidChurnRateOld * 10000) / 100,
      userConversionRateNew: Math.round(userConvRateNew * 10000) / 100,
      backToFreeRateNew: Math.round(backToFreeRateNew * 10000) / 100,
      backToFreeRateOld: Math.round(backToFreeRateOld * 10000) / 100,

      grr: Math.round(grr * 100) / 100,
      nrr: Math.round(nrr * 100) / 100,
      clv: Math.round(clv),

      visits,
      spend,
      cpl: Math.round(cpl * 100) / 100,
      cpa: Math.round(cpa * 100) / 100,
      cac: Math.round(cac * 100) / 100,
    });
  }

  return { months: results, warnings };
}

export function createDefaultDrivers(baseline: BaselineSnapshot): Record<string, DriverConfig> {
  const defs: Array<{
    key: string; label: string; category: string; unit: string;
    baselineKey: string; fallback: number; min?: number; max?: number; step?: number;
  }> = [
    // === Growth ===
    { key: 'installs', label: 'Installations', category: 'growth_adoption', unit: 'count', baselineKey: 'installs', fallback: 1800, min: 0, max: 10000, step: 10 },
    { key: 'visits', label: 'Visits', category: 'growth_adoption', unit: 'count', baselineKey: 'visits', fallback: 51000, min: 0, max: 500000, step: 100 },

    // === Conversion ===
    { key: 'user_conv_rate_new', label: 'User Conv. Rate (New)', category: 'conversion', unit: 'percent', baselineKey: '_', fallback: 2.3, min: 0, max: 100, step: 0.1 },

    // === Free User Churn ===
    { key: 'free_churn_rate_old', label: 'Free Churn Rate (Old)', category: 'retention_churn', unit: 'percent', baselineKey: 'free_user_churn_rate', fallback: 4.8, min: 0, max: 100, step: 0.1 },
    { key: 'free_churn_rate_new', label: 'Free Churn Rate (New)', category: 'retention_churn', unit: 'percent', baselineKey: '_', fallback: 30, min: 0, max: 100, step: 0.1 },

    // === Paid Churn ===
    { key: 'paid_churn_rate_old', label: 'Paid Churn Rate (Old)', category: 'retention_churn', unit: 'percent', baselineKey: 'customer_churn_rate', fallback: 4.5, min: 0, max: 100, step: 0.1 },
    { key: 'paid_churn_rate_new', label: 'Paid Churn Rate (New)', category: 'retention_churn', unit: 'percent', baselineKey: '_', fallback: 12, min: 0, max: 100, step: 0.1 },

    // === Back to Free ===
    { key: 'back_to_free_rate_old', label: 'Back to Free Rate (Old)', category: 'retention_churn', unit: 'percent', baselineKey: 'back_to_free_rate', fallback: 1.1, min: 0, max: 50, step: 0.1 },
    { key: 'back_to_free_rate_new', label: 'Back to Free Rate (New)', category: 'retention_churn', unit: 'percent', baselineKey: '_', fallback: 1.5, min: 0, max: 50, step: 0.1 },

    // === Monetization: Recurring ===
    { key: 'arpu_recurring', label: 'ARPU Recurring', category: 'monetization', unit: 'currency', baselineKey: 'arpu_recurring', fallback: 41, min: 0, max: 500, step: 0.5 },

    // === Monetization: Preorder (= Transaction Fee) ===
    { key: 'preorder_customers_pct', label: 'Preorder Customers %', category: 'monetization', unit: 'percent', baselineKey: '_', fallback: 20, min: 0, max: 100, step: 0.5 },
    { key: 'arpu_preorder', label: 'ARPU Preorder', category: 'monetization', unit: 'currency', baselineKey: 'arpu_transaction_fee', fallback: 5.0, min: 0, max: 100, step: 0.1 },

    // === Monetization: SMS ===
    { key: 'sms_customers_pct', label: 'SMS Customers %', category: 'monetization', unit: 'percent', baselineKey: '_', fallback: 10, min: 0, max: 100, step: 0.5 },
    { key: 'arpu_sms', label: 'ARPU SMS', category: 'monetization', unit: 'currency', baselineKey: '_', fallback: 3.5, min: 0, max: 100, step: 0.1 },

    // === Cost ===
    { key: 'spend', label: 'Marketing Spend', category: 'cost', unit: 'currency', baselineKey: 'spend', fallback: 5000, min: 0, max: 100000, step: 100 },
  ];

  const result: Record<string, DriverConfig> = {};
  for (const d of defs) {
    result[d.key] = {
      key: d.key,
      label: d.label,
      category: d.category as any,
      unit: d.unit as any,
      defaultValue: baseline.metricValues[d.baselineKey] ?? d.fallback,
      min: d.min,
      max: d.max,
      step: d.step,
      monthlyValues: {},
    };
  }
  return result;
}

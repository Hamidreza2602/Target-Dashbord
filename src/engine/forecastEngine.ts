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
 * ## Forecast Engine v3 — Old/New Segmented Model with Old-Free Conversion
 *
 * ### FreeUser[m] (5 terms):
 *   term1 = freeUser[m-1] × (1 − churnFreeUserOld)                                                        ← old free surviving
 *   term2 = install[m] × (1 − freeUserChurnNew) × (1 − convFreeToPaidNew)                                 ← new installs staying free
 *   term3 = install[m] × (1 − freeUserChurnNew) × convFreeToPaidNew × (1 − paidUserChurnNew) × backToFreeNew  ← new converts back to free
 *   term4 = paidUser[m-1] × (1 − paidUserChurnOld) × backToFreeOld                                        ← old paid back to free
 *   term5 = freeUser[m-1] × (1 − churnFreeUserOld) × convFreeToPaidOld × ½ × (1 − paidUserChurnNew) × ½ × backToFreeNew  ← old free mid-month converts back to free
 *   FreeUser[m] = term1 + term2 + term3 + term4 + term5
 *
 * ### PaidUser[m] (3 terms):
 *   term1 = paidUser[m-1] × (1 − paidUserChurnOld)                                                        ← old paid surviving
 *   term2 = install[m] × (1 − freeUserChurnNew) × convFreeToPaidNew                                       ← new installs converted
 *   term3 = freeUser[m-1] × (1 − churnFreeUserOld) × convFreeToPaidOld × ½ × (1 − paidUserChurnNew)      ← old free mid-month converts
 *   PaidUser[m] = term1 + term2 + term3
 *
 * ### ARPURecurringOld (derived, not a driver):
 *   ARPURecurringOld = MRRRecurring[m-1] / PaidUser[m-1]
 *
 * ### MRRRecurring[m]:
 *   oldPaidCount      = paidUser[m-1] × (1 − paidUserChurnOld)
 *   oldFreeConvCount  = freeUser[m-1] × (1 − churnFreeUserOld) × convFreeToPaidOld × ½ × (1 − paidUserChurnNew)
 *   newInstallCount   = install[m] × (1 − freeUserChurnNew) × convFreeToPaidNew × (1 − paidUserChurnNew)
 *   MRRRecurring[m]   = ARPURecurringOld × (oldPaidCount + oldFreeConvCount) + newInstallCount × ARPURecurringNew
 *
 * ### MRR SMS / Preorder:
 *   MRRSMS[m]      = PaidUser[m] × SMSPercentage × ARPUSMS
 *   MRRPreorder[m] = PaidUser[m] × PreorderPercentage × ARPUPreorder
 *   MRR[m]         = MRRRecurring[m] + MRRSMS[m] + MRRPreorder[m]
 *
 * ### Notes:
 *   - ARPURecurringOld is DERIVED each month (MRRRecurring[m-1] / PaidUser[m-1]), not a driver input
 *   - ARPURecurringNew IS a driver input — the ARPU earned from brand-new customers
 *   - The ½ factors in old-free conversion terms represent mid-month average timing
 */
export function runForecast(input: ForecastInput): ForecastResult {
  const { baseline, startDate, months: numMonths, drivers } = input;
  const results: ForecastMonth[] = [];
  const warnings: ForecastWarning[] = [];

  let freeUsers = baseline.metricValues.free_users || 0;
  let customers = baseline.metricValues.customers || 0;
  // Track MRRRecurring[m-1] for ARPURecurringOld derivation
  let prevMrrRecurring = baseline.metricValues.mrr
    || (customers * (baseline.metricValues.arpu_recurring || 22));
  const arpuFallback = baseline.metricValues.arpu_recurring || 22;

  for (let m = 0; m < numMonths; m++) {
    const monthDate = addMonths(new Date(startDate), m);
    const month = format(monthDate, 'yyyy-MM');

    // ═══════════════════════════════════════
    // 1. SNAPSHOT PREVIOUS STATE
    // ═══════════════════════════════════════
    const prevFreeUsers = freeUsers;
    const prevCustomers = customers;
    const prevMrr = prevMrrRecurring;

    // ═══════════════════════════════════════
    // 2. READ DRIVERS
    // ═══════════════════════════════════════
    const installs          = drv(drivers, 'installs', month, baseline.metricValues.installs || 1800);
    const visits            = drv(drivers, 'visits', month, baseline.metricValues.visits || 51000);
    const spend             = drv(drivers, 'spend', month, baseline.metricValues.spend || 5000);

    // Churn rates
    const freeChurnRateOld  = drv(drivers, 'free_churn_rate_old', month, 4.8) / 100;
    const freeChurnRateNew  = drv(drivers, 'free_churn_rate_new', month, 30) / 100;
    const paidChurnRateOld  = drv(drivers, 'paid_churn_rate_old', month, 4.5) / 100;
    const paidChurnRateNew  = drv(drivers, 'paid_churn_rate_new', month, 12) / 100;

    // Conversion rates
    const userConvRateNew   = drv(drivers, 'user_conv_rate_new', month, 2.3) / 100;   // new installs → paid
    const convRateOld       = drv(drivers, 'conv_rate_old', month, 0.5) / 100;        // old free → paid (mid-month, ½ factor)

    // Back-to-free rates
    const backToFreeRateOld = drv(drivers, 'back_to_free_rate_old', month, 1.1) / 100;
    const backToFreeRateNew = drv(drivers, 'back_to_free_rate_new', month, 1.5) / 100;

    // Revenue drivers
    const arpuRecurringNew  = drv(drivers, 'arpu_recurring_new', month, arpuFallback * 1.05);
    const preorderPct       = drv(drivers, 'preorder_customers_pct', month, 20) / 100;
    const arpuPreorder      = drv(drivers, 'arpu_preorder', month, 5.0);
    const smsPct            = drv(drivers, 'sms_customers_pct', month, 10) / 100;
    const arpuSMS           = drv(drivers, 'arpu_sms', month, 3.5);

    // ═══════════════════════════════════════
    // 3. VALIDATE
    // ═══════════════════════════════════════
    for (const [key, val, label] of [
      ['freeChurnRateOld', freeChurnRateOld, 'Free churn old'],
      ['freeChurnRateNew', freeChurnRateNew, 'Free churn new'],
      ['paidChurnRateOld', paidChurnRateOld, 'Paid churn old'],
      ['paidChurnRateNew', paidChurnRateNew, 'Paid churn new'],
      ['userConvRateNew', userConvRateNew, 'User conv new'],
      ['convRateOld', convRateOld, 'Conv rate old'],
    ] as [string, number, string][]) {
      if (val > 1) warnings.push({ month, metric: key, message: `${label} exceeds 100%`, severity: 'error' });
    }

    // ═══════════════════════════════════════
    // 4. ARPURecurringOld — derived from previous month
    // ═══════════════════════════════════════
    const arpuRecurringOld = prevCustomers > 0 && prevMrr > 0
      ? prevMrr / prevCustomers
      : arpuFallback;

    // ═══════════════════════════════════════
    // 5. USER STATE TRANSITIONS
    // ═══════════════════════════════════════

    // --- Shared sub-expressions ---
    const survivingNewInstalls  = installs * (1 - freeChurnRateNew);
    const newConvertedToPaid    = survivingNewInstalls * userConvRateNew;
    const oldFreeSurviving      = prevFreeUsers * (1 - freeChurnRateOld);
    const oldFreeConvBase       = oldFreeSurviving * convRateOld * 0.5; // mid-month conversion, ½ factor

    // --- FreeUser[m] — 5 terms ---
    const term1Free = oldFreeSurviving;                                                               // old free surviving (incl. those who haven't converted)
    const term2Free = survivingNewInstalls * (1 - userConvRateNew);                                   // new installs staying free
    const term3Free = newConvertedToPaid * (1 - paidChurnRateNew) * backToFreeRateNew;               // new converts → paid → back to free
    const term4Free = prevCustomers * (1 - paidChurnRateOld) * backToFreeRateOld;                    // old paid → back to free
    const term5Free = oldFreeConvBase * (1 - paidChurnRateNew) * 0.5 * backToFreeRateNew;           // old free mid-month converts → back to free

    freeUsers = Math.max(0, Math.round(term1Free + term2Free + term3Free + term4Free + term5Free));

    // --- PaidUser[m] — 3 terms ---
    const term1Paid = prevCustomers * (1 - paidChurnRateOld);                                        // old paid surviving
    const term2Paid = newConvertedToPaid;                                                             // new installs → paid
    const term3Paid = oldFreeConvBase * (1 - paidChurnRateNew);                                      // old free mid-month converts to paid, surviving paid churn

    customers = Math.max(0, Math.round(term1Paid + term2Paid + term3Paid));

    if (customers < 0) {
      warnings.push({ month, metric: 'customers', message: 'Customers went negative, clamped to 0', severity: 'error' });
      customers = 0;
    }

    // ═══════════════════════════════════════
    // 6. REVENUE
    // ═══════════════════════════════════════

    // --- MRRRecurring[m] ---
    // Existing customers (old paid + old-free mid-month converts) earn at ARPURecurringOld
    // New customers from installs earn at ARPURecurringNew
    const oldPaidCount      = term1Paid;                                                              // = prevCustomers * (1 - paidChurnRateOld)
    const oldFreeConvCount  = term3Paid;                                                              // = oldFreeConvBase * (1 - paidChurnRateNew)
    const newInstallCount   = newConvertedToPaid * (1 - paidChurnRateNew);                           // installs that converted & survived paid churn
    const mrrRecurring      = arpuRecurringOld * (oldPaidCount + oldFreeConvCount)
                            + newInstallCount * arpuRecurringNew;

    // --- MRRSMS & MRRPreorder applied to end-of-month paid users ---
    const mrrPreorder = customers * preorderPct * arpuPreorder;
    const mrrSMS      = customers * smsPct * arpuSMS;
    const totalRevenue = mrrRecurring + mrrPreorder + mrrSMS;
    const arr = totalRevenue * 12;

    // Advance state for next month
    prevMrrRecurring = mrrRecurring;

    // ═══════════════════════════════════════
    // 7. DERIVED METRICS
    // ═══════════════════════════════════════

    // Blended ARPU for display
    const derivedArpu = customers > 0 ? mrrRecurring / customers : 0;

    // Old user attrition (for GRR)
    const oldFreeChurned  = Math.round(prevFreeUsers * freeChurnRateOld);
    const oldPaidChurned  = Math.round(prevCustomers * paidChurnRateOld);
    const oldBackToFree   = Math.round(prevCustomers * (1 - paidChurnRateOld) * backToFreeRateOld);

    const churnedMrr    = oldPaidChurned * arpuRecurringOld;
    const backToFreeMrr = oldBackToFree * arpuRecurringOld;
    const grr = prevMrr > 0
      ? ((prevMrr - churnedMrr - backToFreeMrr) / prevMrr) * 100
      : 100;
    const nrr = prevMrr > 0
      ? (mrrRecurring / prevMrr) * 100
      : 100;

    // CLV
    const yearlyChurn = Math.min(paidChurnRateOld * 12, 1);
    const clv = yearlyChurn > 0 ? (derivedArpu * 12) / yearlyChurn : 0;

    // Cost metrics
    const newCustomersCount = Math.round(term2Paid + term3Paid);
    const cpl = visits > 0 ? spend / visits : 0;
    const cpa = installs > 0 ? spend / installs : 0;
    const cac = newCustomersCount > 0 ? spend / newCustomersCount : 0;

    // ═══════════════════════════════════════
    // 8. PUSH RESULT
    // ═══════════════════════════════════════
    results.push({
      month,
      freeUsers,
      customers,

      newFreeUsers:  Math.round(term2Free + term3Free + term5Free),
      oldFreeUsers:  Math.round(term1Free),
      newCustomers:  newCustomersCount,
      oldCustomers:  Math.round(term1Paid),

      installs,
      survivingNewInstalls: Math.round(survivingNewInstalls),
      newConvertedToPaid:   Math.round(newConvertedToPaid),
      newPaidSurviving:     Math.round(newInstallCount),
      newBackToFree:        Math.round(term3Free),

      oldFreeChurned,
      oldPaidChurned,
      oldBackToFree,

      mrrRecurring:     Math.round(mrrRecurring),
      arpuRecurring:    Math.round(derivedArpu * 100) / 100,       // blended, for display
      arpuRecurringOld: Math.round(arpuRecurringOld * 100) / 100,  // derived from prev month
      arpuRecurringNew: Math.round(arpuRecurringNew * 100) / 100,  // driver input

      mrrPreorder:            Math.round(mrrPreorder),
      preorderCustomersPct:   Math.round(preorderPct * 10000) / 100,
      arpuPreorder:           Math.round(arpuPreorder * 100) / 100,

      mrrSMS:           Math.round(mrrSMS),
      smsCustomersPct:  Math.round(smsPct * 10000) / 100,
      arpuSMS:          Math.round(arpuSMS * 100) / 100,

      totalRevenue: Math.round(totalRevenue),
      arr:          Math.round(arr),

      freeChurnRateNew:      Math.round(freeChurnRateNew * 10000) / 100,
      freeChurnRateOld:      Math.round(freeChurnRateOld * 10000) / 100,
      paidChurnRateNew:      Math.round(paidChurnRateNew * 10000) / 100,
      paidChurnRateOld:      Math.round(paidChurnRateOld * 10000) / 100,
      userConversionRateNew: Math.round(userConvRateNew * 10000) / 100,
      conversionRateOld:     Math.round(convRateOld * 10000) / 100,
      backToFreeRateNew:     Math.round(backToFreeRateNew * 10000) / 100,
      backToFreeRateOld:     Math.round(backToFreeRateOld * 10000) / 100,

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
    { key: 'installs',          label: 'Installations',               category: 'growth_adoption',   unit: 'count',    baselineKey: 'installs',          fallback: 1800,  min: 0, max: 10000,  step: 10 },
    { key: 'visits',            label: 'Visits',                      category: 'growth_adoption',   unit: 'count',    baselineKey: 'visits',            fallback: 51000, min: 0, max: 500000, step: 100 },

    // === Conversion ===
    { key: 'user_conv_rate_new', label: 'Conv. Rate New Free→Paid',   category: 'conversion',        unit: 'percent',  baselineKey: '_',                 fallback: 2.3,   min: 0, max: 100,    step: 0.1 },
    { key: 'conv_rate_old',      label: 'Conv. Rate Old Free→Paid',   category: 'conversion',        unit: 'percent',  baselineKey: '_',                 fallback: 0.5,   min: 0, max: 20,     step: 0.1 },

    // === Free User Churn ===
    { key: 'free_churn_rate_old', label: 'Free Churn Rate (Old)',     category: 'retention_churn',   unit: 'percent',  baselineKey: 'free_user_churn_rate', fallback: 4.8, min: 0, max: 100,   step: 0.1 },
    { key: 'free_churn_rate_new', label: 'Free Churn Rate (New)',     category: 'retention_churn',   unit: 'percent',  baselineKey: '_',                 fallback: 30,    min: 0, max: 100,    step: 0.1 },

    // === Paid Churn ===
    { key: 'paid_churn_rate_old', label: 'Paid Churn Rate (Old)',     category: 'retention_churn',   unit: 'percent',  baselineKey: 'customer_churn_rate', fallback: 4.5, min: 0, max: 100,    step: 0.1 },
    { key: 'paid_churn_rate_new', label: 'Paid Churn Rate (New)',     category: 'retention_churn',   unit: 'percent',  baselineKey: '_',                 fallback: 12,    min: 0, max: 100,    step: 0.1 },

    // === Back to Free ===
    { key: 'back_to_free_rate_old', label: 'Back to Free Rate (Old)', category: 'retention_churn',   unit: 'percent',  baselineKey: 'back_to_free_rate', fallback: 1.1,   min: 0, max: 50,     step: 0.1 },
    { key: 'back_to_free_rate_new', label: 'Back to Free Rate (New)', category: 'retention_churn',   unit: 'percent',  baselineKey: '_',                 fallback: 1.5,   min: 0, max: 50,     step: 0.1 },

    // === Monetization: Recurring (new customers only — old derived from prevMRR/prevCustomers) ===
    { key: 'arpu_recurring_new',  label: 'ARPU Recurring (New Cust)', category: 'monetization',      unit: 'currency', baselineKey: 'arpu_recurring',    fallback: 43,    min: 0, max: 500,    step: 0.5 },

    // === Monetization: Preorder ===
    { key: 'preorder_customers_pct', label: 'Preorder Customers %',   category: 'monetization',      unit: 'percent',  baselineKey: '_',                 fallback: 20,    min: 0, max: 100,    step: 0.5 },
    { key: 'arpu_preorder',          label: 'ARPU Preorder',          category: 'monetization',      unit: 'currency', baselineKey: 'arpu_transaction_fee', fallback: 5.0, min: 0, max: 100,   step: 0.1 },

    // === Monetization: SMS ===
    { key: 'sms_customers_pct',   label: 'SMS Customers %',           category: 'monetization',      unit: 'percent',  baselineKey: '_',                 fallback: 10,    min: 0, max: 100,    step: 0.5 },
    { key: 'arpu_sms',            label: 'ARPU SMS',                  category: 'monetization',      unit: 'currency', baselineKey: '_',                 fallback: 3.5,   min: 0, max: 100,    step: 0.1 },

    // === Cost ===
    { key: 'spend',               label: 'Marketing Spend',           category: 'cost',              unit: 'currency', baselineKey: 'spend',             fallback: 5000,  min: 0, max: 100000, step: 100 },
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

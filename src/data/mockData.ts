import { App, BaselineSnapshot, Scenario, ScenarioVersion, TargetPlan, TargetVersion, TargetMetric, TargetMetricPeriod, ActualMetricObservation, FormulaVersion, Objective, TargetPathType, Directionality, MetricUnit } from '../types';
import { generateTargetPath } from '../utils/targetPaths';
import { format, subMonths, addMonths } from 'date-fns';

const TODAY = new Date();
const FV_ID = 'fv-1';

export const formulaVersions: FormulaVersion[] = [
  { id: FV_ID, versionName: 'v1.0', effectiveDate: '2024-01-01', notes: 'Initial formula set based on internal metrics catalogue.', status: 'active' },
];

export const mockApp: App = {
  id: 'app-1',
  name: 'NotifyMe',
  currency: 'USD',
  timezone: 'America/Toronto',
  status: 'active',
};

// ===================== Real NotifyMe Data (crawled from Tableau dashboards) =====================
// Source: insight.hengam.me/tableau & insight.notify-me.io/tableau

interface MonthlyRealData {
  month: string;
  // From Revenue Dashboard (hengam)
  paid: number;
  active: number;
  installs: number;
  uninstalls: number;
  subscribe: number;
  backToFree: number;
  reactive: number;
  deactive: number;
  upgrade: number;
  downgrade: number;
  // From Core Other (notify-me) - rates as decimals
  freeChurnAll: number;
  freeChurnNew: number;
  freeChurnOld: number;
  custChurnAll: number;
  custChurnNew: number;
  custChurnOld: number;
  trialChurnRate: number;
  userToTrialConv: number;
  upgradeRate: number;
  downgradeRate: number;
  backToFreeRate: number;
  // Revenue - from Separated Recurring view (Unlimited cumulative)
  recurringRevenue: number;
  // ARPU (from Core Other)
  arpuRecurring: number;
  arpuTotal: number;
}

const REAL_MONTHLY_DATA: MonthlyRealData[] = [
  {
    month: '2025-04', paid: 6871, active: 21914, installs: 1972, uninstalls: 1138,
    subscribe: 502, backToFree: 121, reactive: 328, deactive: 756, upgrade: 90, downgrade: 33,
    freeChurnAll: 0.082, freeChurnNew: 0.34, freeChurnOld: 0.048, custChurnAll: 0.048, custChurnNew: 0.12, custChurnOld: 0.044,
    trialChurnRate: 0.26, userToTrialConv: 0.020, upgradeRate: 0.013, downgradeRate: 0.005, backToFreeRate: 0.018,
    recurringRevenue: 276041, arpuRecurring: 40.18, arpuTotal: 50.44,
  },
  {
    month: '2025-05', paid: 7000, active: 22330, installs: 1759, uninstalls: 1004,
    subscribe: 454, backToFree: 105, reactive: 332, deactive: 770, upgrade: 101, downgrade: 32,
    freeChurnAll: 0.080, freeChurnNew: 0.33, freeChurnOld: 0.047, custChurnAll: 0.047, custChurnNew: 0.11, custChurnOld: 0.043,
    trialChurnRate: 0.25, userToTrialConv: 0.021, upgradeRate: 0.014, downgradeRate: 0.005, backToFreeRate: 0.015,
    recurringRevenue: 278367, arpuRecurring: 39.77, arpuTotal: 50.06,
  },
  {
    month: '2025-06', paid: 7120, active: 22587, installs: 2112, uninstalls: 1326,
    subscribe: 560, backToFree: 119, reactive: 438, deactive: 912, upgrade: 111, downgrade: 43,
    freeChurnAll: 0.083, freeChurnNew: 0.35, freeChurnOld: 0.049, custChurnAll: 0.049, custChurnNew: 0.13, custChurnOld: 0.044,
    trialChurnRate: 0.27, userToTrialConv: 0.022, upgradeRate: 0.016, downgradeRate: 0.006, backToFreeRate: 0.017,
    recurringRevenue: 279808, arpuRecurring: 39.30, arpuTotal: 50.35,
  },
  {
    month: '2025-07', paid: 7238, active: 22951, installs: 1645, uninstalls: 944,
    subscribe: 417, backToFree: 101, reactive: 354, deactive: 773, upgrade: 88, downgrade: 31,
    freeChurnAll: 0.079, freeChurnNew: 0.32, freeChurnOld: 0.046, custChurnAll: 0.046, custChurnNew: 0.11, custChurnOld: 0.042,
    trialChurnRate: 0.24, userToTrialConv: 0.020, upgradeRate: 0.012, downgradeRate: 0.004, backToFreeRate: 0.014,
    recurringRevenue: 281810, arpuRecurring: 38.94, arpuTotal: 49.82,
  },
  {
    month: '2025-08', paid: 7331, active: 23690, installs: 2139, uninstalls: 1153,
    subscribe: 420, backToFree: 114, reactive: 342, deactive: 739, upgrade: 70, downgrade: 31,
    freeChurnAll: 0.078, freeChurnNew: 0.33, freeChurnOld: 0.046, custChurnAll: 0.045, custChurnNew: 0.10, custChurnOld: 0.042,
    trialChurnRate: 0.25, userToTrialConv: 0.019, upgradeRate: 0.010, downgradeRate: 0.004, backToFreeRate: 0.016,
    recurringRevenue: 286607, arpuRecurring: 39.10, arpuTotal: 50.15,
  },
  {
    month: '2025-09', paid: 7520, active: 24410, installs: 3053, uninstalls: 1631,
    subscribe: 601, backToFree: 121, reactive: 377, deactive: 818, upgrade: 88, downgrade: 34,
    freeChurnAll: 0.081, freeChurnNew: 0.34, freeChurnOld: 0.047, custChurnAll: 0.047, custChurnNew: 0.12, custChurnOld: 0.043,
    trialChurnRate: 0.26, userToTrialConv: 0.021, upgradeRate: 0.012, downgradeRate: 0.005, backToFreeRate: 0.016,
    recurringRevenue: 290215, arpuRecurring: 38.59, arpuTotal: 49.64,
  },
  {
    month: '2025-10', paid: 7622, active: 25165, installs: 2716, uninstalls: 1521,
    subscribe: 570, backToFree: 142, reactive: 380, deactive: 835, upgrade: 95, downgrade: 38,
    freeChurnAll: 0.082, freeChurnNew: 0.35, freeChurnOld: 0.048, custChurnAll: 0.048, custChurnNew: 0.13, custChurnOld: 0.043,
    trialChurnRate: 0.27, userToTrialConv: 0.022, upgradeRate: 0.012, downgradeRate: 0.005, backToFreeRate: 0.019,
    recurringRevenue: 291543, arpuRecurring: 38.25, arpuTotal: 49.48,
  },
  {
    month: '2025-11', paid: 7780, active: 25980, installs: 2803, uninstalls: 1474,
    subscribe: 621, backToFree: 148, reactive: 412, deactive: 860, upgrade: 102, downgrade: 40,
    freeChurnAll: 0.084, freeChurnNew: 0.36, freeChurnOld: 0.049, custChurnAll: 0.049, custChurnNew: 0.14, custChurnOld: 0.044,
    trialChurnRate: 0.28, userToTrialConv: 0.023, upgradeRate: 0.013, downgradeRate: 0.005, backToFreeRate: 0.019,
    recurringRevenue: 297412, arpuRecurring: 38.23, arpuTotal: 49.10,
  },
  {
    month: '2025-12', paid: 7850, active: 26350, installs: 2461, uninstalls: 1381,
    subscribe: 578, backToFree: 155, reactive: 395, deactive: 810, upgrade: 110, downgrade: 42,
    freeChurnAll: 0.079, freeChurnNew: 0.36, freeChurnOld: 0.047, custChurnAll: 0.047, custChurnNew: 0.139, custChurnOld: 0.043,
    trialChurnRate: 0.27, userToTrialConv: 0.020, upgradeRate: 0.014, downgradeRate: 0.005, backToFreeRate: 0.020,
    recurringRevenue: 305725, arpuRecurring: 38.94, arpuTotal: 52.60,
  },
  {
    month: '2026-01', paid: 7920, active: 26700, installs: 2070, uninstalls: 1240,
    subscribe: 510, backToFree: 140, reactive: 368, deactive: 790, upgrade: 98, downgrade: 38,
    freeChurnAll: 0.090, freeChurnNew: 0.364, freeChurnOld: 0.056, custChurnAll: 0.050, custChurnNew: 0.069, custChurnOld: 0.049,
    trialChurnRate: 0.259, userToTrialConv: 0.023, upgradeRate: 0.012, downgradeRate: 0.005, backToFreeRate: 0.018,
    recurringRevenue: 310799, arpuRecurring: 39.24, arpuTotal: 52.17,
  },
  {
    month: '2026-02', paid: 7960, active: 26900, installs: 2044, uninstalls: 1199,
    subscribe: 480, backToFree: 130, reactive: 350, deactive: 770, upgrade: 85, downgrade: 35,
    freeChurnAll: 0.081, freeChurnNew: 0.347, freeChurnOld: 0.051, custChurnAll: 0.053, custChurnNew: 0.121, custChurnOld: 0.049,
    trialChurnRate: 0.237, userToTrialConv: 0.023, upgradeRate: 0.011, downgradeRate: 0.004, backToFreeRate: 0.016,
    recurringRevenue: 324733, arpuRecurring: 40.79, arpuTotal: 55.39,
  },
  {
    month: '2026-03', paid: 7980, active: 27050, installs: 1555, uninstalls: 967,
    subscribe: 440, backToFree: 120, reactive: 320, deactive: 750, upgrade: 90, downgrade: 36,
    freeChurnAll: 0.066, freeChurnNew: 0.298, freeChurnOld: 0.048, custChurnAll: 0.046, custChurnNew: 0.064, custChurnOld: 0.045,
    trialChurnRate: 0.210, userToTrialConv: 0.025, upgradeRate: 0.011, downgradeRate: 0.005, backToFreeRate: 0.015,
    recurringRevenue: 326789, arpuRecurring: 40.95, arpuTotal: 54.72,
  },
];

// Generate actuals from real data
function generateActuals(): ActualMetricObservation[] {
  const actuals: ActualMetricObservation[] = [];

  for (const d of REAL_MONTHLY_DATA) {
    const freeUsers = d.active - d.paid;
    const activeTrials = Math.round(freeUsers * d.userToTrialConv);
    const mrr = d.arpuRecurring * d.paid;
    const arr = mrr * 12;
    const visits = Math.round(d.installs / 0.035);
    const spend = Math.round(3500 + (REAL_MONTHLY_DATA.indexOf(d)) * 120);

    const addObs = (key: string, val: number) => {
      actuals.push({
        id: `actual-${d.month}-${key}`,
        appId: 'app-1',
        metricKey: key,
        date: d.month,
        frameType: '30d',
        segmentType: 'all',
        cohortType: 'none',
        value: val,
        sourceSystem: 'tableau',
      });
    };

    addObs('visits', visits);
    addObs('installs', d.installs);
    addObs('free_users', freeUsers);
    addObs('active_trials', activeTrials);
    addObs('customers', d.paid);
    addObs('mrr', Math.round(mrr));
    addObs('arr', Math.round(arr));
    addObs('arpu_recurring', d.arpuRecurring);
    addObs('arpu_non_recurring', Math.round((d.arpuTotal - d.arpuRecurring) * 100) / 100);
    addObs('arpu_transaction_fee', Math.round((d.arpuTotal - d.arpuRecurring) * 0.15 * 100) / 100);
    addObs('new_mrr', Math.round(d.subscribe * d.arpuRecurring));
    addObs('restart_mrr', Math.round(d.reactive * d.arpuRecurring));
    addObs('expansion_mrr', Math.round(d.upgrade * d.arpuRecurring * 0.4));
    addObs('contraction_mrr', Math.round(d.downgrade * d.arpuRecurring * 0.3));
    addObs('churn_mrr', Math.round((d.paid * d.custChurnAll + d.deactive) * d.arpuRecurring));
    addObs('customer_churn_rate', Math.round(d.custChurnAll * 10000) / 100);
    addObs('free_user_churn_rate', Math.round(d.freeChurnAll * 10000) / 100);
    addObs('trial_churn_rate', Math.round(d.trialChurnRate * 10000) / 100);
    addObs('trial_conversion_rate', Math.round((1 - d.trialChurnRate) * 10000) / 100);
    addObs('back_to_free_rate', Math.round(d.backToFreeRate * 10000) / 100);
    addObs('reactivation_rate', Math.round((d.reactive / Math.max(1, freeUsers)) * 10000) / 100);
    addObs('upgrade_rate', Math.round(d.upgradeRate * 10000) / 100);
    addObs('downgrade_rate', Math.round(d.downgradeRate * 10000) / 100);
    addObs('deactivation_rate', Math.round((d.deactive / Math.max(1, d.paid)) * 10000) / 100);
    addObs('spend', spend);
    addObs('user_to_trial_conversion', Math.round(d.userToTrialConv * 10000) / 100);
    addObs('uninstalls', d.uninstalls);
    addObs('deactivations', d.deactive);
    addObs('reactivation_count', d.reactive);
  }

  return actuals;
}

export const mockActuals = generateActuals();

// Get latest values for baseline
function getLatestActual(key: string): number {
  const obs = mockActuals.filter(a => a.metricKey === key);
  return obs.length > 0 ? obs[obs.length - 1].value : 0;
}

export const mockBaseline: BaselineSnapshot = {
  id: 'baseline-1',
  appId: 'app-1',
  referenceDate: format(subMonths(TODAY, 1), 'yyyy-MM-dd'),
  metricValues: {
    free_users: getLatestActual('free_users'),
    active_trials: getLatestActual('active_trials'),
    customers: getLatestActual('customers'),
    mrr: getLatestActual('mrr'),
    arr: getLatestActual('arr'),
    arpu_recurring: getLatestActual('arpu_recurring'),
    arpu_non_recurring: getLatestActual('arpu_non_recurring'),
    arpu_transaction_fee: getLatestActual('arpu_transaction_fee'),
    installs: getLatestActual('installs'),
    visits: getLatestActual('visits'),
    spend: getLatestActual('spend'),
    customer_churn_rate: getLatestActual('customer_churn_rate'),
    free_user_churn_rate: getLatestActual('free_user_churn_rate'),
    trial_churn_rate: getLatestActual('trial_churn_rate'),
    trial_conversion_rate: getLatestActual('trial_conversion_rate'),
    back_to_free_rate: getLatestActual('back_to_free_rate'),
    reactivation_rate: getLatestActual('reactivation_rate'),
    upgrade_rate: getLatestActual('upgrade_rate'),
    downgrade_rate: getLatestActual('downgrade_rate'),
    deactivation_rate: getLatestActual('deactivation_rate'),
    user_to_trial_conversion: getLatestActual('user_to_trial_conversion'),
  },
  formulaVersionId: FV_ID,
  sourceType: 'mock',
};

export const mockScenario: Scenario = {
  id: 'scenario-1',
  appId: 'app-1',
  name: 'Base Growth Plan',
  description: 'Baseline scenario with current growth trajectory.',
  createdBy: 'admin',
  createdAt: format(subMonths(TODAY, 1), 'yyyy-MM-dd'),
  baselineSnapshotId: 'baseline-1',
  status: 'saved',
};

export const mockScenarioImprovedChurn: Scenario = {
  id: 'scenario-2',
  appId: 'app-1',
  name: 'Improved Churn Scenario',
  description: 'Scenario with reduced customer churn from 4.5% to 3%.',
  createdBy: 'admin',
  createdAt: format(subMonths(TODAY, 0), 'yyyy-MM-dd'),
  baselineSnapshotId: 'baseline-1',
  status: 'saved',
};

// ==================== OKR Target Plan ====================

const OKR_START = format(subMonths(TODAY, 2), 'yyyy-MM-01');
const OKR_MONTHS = 12;
const OKR_END = format(addMonths(new Date(OKR_START), OKR_MONTHS), 'yyyy-MM-dd');
const VID = 'tv-okr-1';

// Helper to build periods with optional sample actuals for past months
function buildPeriods(
  metricId: string,
  baseline: number,
  target: number,
  pathType: TargetPathType,
  addActuals: boolean = false,
): TargetMetricPeriod[] {
  const pathValues = generateTargetPath(baseline, target, OKR_MONTHS, pathType);
  const periods: TargetMetricPeriod[] = [];
  for (let m = 0; m < OKR_MONTHS; m++) {
    const d = addMonths(new Date(OKR_START), m + 1);
    const month = format(d, 'yyyy-MM');
    const isPast = d <= TODAY;
    // Add realistic actuals for past months (±15% variance from target path)
    let actualValue: number | null = null;
    let actualEnteredAt: string | null = null;
    if (addActuals && isPast) {
      const variance = 0.85 + Math.random() * 0.30; // 85% to 115%
      actualValue = Math.round(pathValues[m] * variance * 100) / 100;
      actualEnteredAt = format(d, 'yyyy-MM-dd');
    }
    periods.push({
      id: `tp-${metricId}-${m}`,
      targetMetricId: metricId,
      periodMonth: month,
      targetValue: pathValues[m],
      actualValue,
      actualEnteredAt,
    });
  }
  return periods;
}

function mkMetric(
  id: string, objId: string, key: string, displayName: string,
  baseline: number, target: number, dir: Directionality,
  unit: MetricUnit, simKey: string | null = null,
  pathType: TargetPathType = 'linear',
): TargetMetric {
  return {
    id, targetVersionId: VID, objectiveId: objId,
    metricKey: key, displayName, baselineValue: baseline, finalTargetValue: target,
    directionality: dir, targetPathType: pathType,
    simulatorDriverKey: simKey, unit, includeInSummary: true,
    periods: buildPeriods(id, baseline, target, pathType, true),
  };
}

// Objectives
const objectives: Objective[] = [
  { id: 'obj-1', targetVersionId: VID, name: 'Reduce churn by delivering high-quality service', description: 'Improve retention rates and conversion', sortOrder: 1, color: '#ef4444' },
  { id: 'obj-2', targetVersionId: VID, name: 'Reach a new peak in organic installs', description: 'Grow organic acquisition channels', sortOrder: 2, color: '#10b981' },
  { id: 'obj-3', targetVersionId: VID, name: 'Reach a new peak in non-organic installs', description: 'Scale paid and partner channels', sortOrder: 3, color: '#3b82f6' },
  { id: 'obj-4', targetVersionId: VID, name: 'Be recognized in the market', description: 'Build brand awareness and authority', sortOrder: 4, color: '#8b5cf6' },
];

const okrMetrics: TargetMetric[] = [
  // Objective 1 — Churn (simulator-connected) - based on real NotifyMe data
  mkMetric('tm-1', 'obj-1', 'free_churn_rate_new', 'Free Churn - New', 35, 25, 'lower_better', 'percent', 'free_churn_rate_new'),
  mkMetric('tm-2', 'obj-1', 'paid_churn_rate_new', 'Paid Churn - New', 12, 7, 'lower_better', 'percent', 'paid_churn_rate_new'),
  mkMetric('tm-3', 'obj-1', 'paid_churn_rate_old', 'Paid Churn - Old', 4.5, 3, 'lower_better', 'percent', 'paid_churn_rate_old'),
  mkMetric('tm-4', 'obj-1', 'user_conv_rate_new', 'Conversion - New', 2.3, 4, 'higher_better', 'percent', 'user_conv_rate_new'),

  // Objective 2 — Organic installs
  mkMetric('tm-5', 'obj-2', 'okr_installs_organic_new_channels', '# Install from New Organic Channels', 0, 50, 'higher_better', 'count', null, 'back_loaded'),
  mkMetric('tm-6', 'obj-2', 'okr_installs_social_listening', '# Install by Social Listening', 10, 60, 'higher_better', 'count', null, 'back_loaded'),
  mkMetric('tm-7', 'obj-2', 'okr_installs_agencies', '# Install by Agencies', 20, 80, 'higher_better', 'count'),
  mkMetric('tm-8', 'obj-2', 'okr_installs_sales', '# Install by Sales', 5, 30, 'higher_better', 'count'),
  mkMetric('tm-9', 'obj-2', 'okr_app_score', 'App Score', 4.2, 4.7, 'higher_better', 'ratio'),

  // Objective 3 — Non-organic installs
  mkMetric('tm-10', 'obj-3', 'okr_installs_inorganic_total', '# Inorganic Install (Total)', 200, 500, 'higher_better', 'count'),
  mkMetric('tm-11', 'obj-3', 'okr_installs_shopify', '# Install from Shopify', 80, 180, 'higher_better', 'count'),
  mkMetric('tm-12', 'obj-3', 'okr_installs_google', '# Install from Google', 50, 120, 'higher_better', 'count'),
  mkMetric('tm-13', 'obj-3', 'okr_installs_affiliate', '# Install from Affiliate', 15, 50, 'higher_better', 'count'),
  mkMetric('tm-14', 'obj-3', 'okr_installs_linkedin', '# Install from LinkedIn', 10, 30, 'higher_better', 'count'),
  mkMetric('tm-15', 'obj-3', 'okr_installs_youtube', '# Install from YouTube', 5, 25, 'higher_better', 'count'),
  mkMetric('tm-16', 'obj-3', 'okr_installs_facebook', '# Install from Facebook', 20, 45, 'higher_better', 'count'),
  mkMetric('tm-17', 'obj-3', 'okr_installs_instagram', '# Install from Instagram', 15, 35, 'higher_better', 'count'),
  mkMetric('tm-18', 'obj-3', 'okr_installs_tiktok', '# Install from TikTok', 5, 15, 'higher_better', 'count', null, 'back_loaded'),

  // Objective 4 — Brand recognition
  mkMetric('tm-19', 'obj-4', 'okr_active_agencies', '# Active Agencies', 3, 12, 'higher_better', 'count'),
  mkMetric('tm-20', 'obj-4', 'okr_integrations', '# Integrations', 5, 15, 'higher_better', 'count'),
  mkMetric('tm-21', 'obj-4', 'okr_posts_published', '# Posts Published', 8, 30, 'higher_better', 'count'),
  mkMetric('tm-22', 'obj-4', 'okr_case_studies', '# Case Studies', 1, 6, 'higher_better', 'count', null, 'back_loaded'),
  mkMetric('tm-23', 'obj-4', 'okr_guest_posts', '# Guest Posts', 0, 8, 'higher_better', 'count', null, 'back_loaded'),
  mkMetric('tm-24', 'obj-4', 'okr_contents_shared_team', '# Contents Shared by Team', 10, 40, 'higher_better', 'count'),
  mkMetric('tm-25', 'obj-4', 'okr_search_in_llms', 'Search in LLMs', 0, 20, 'higher_better', 'count', null, 'back_loaded'),
  mkMetric('tm-26', 'obj-4', 'okr_events_participated', '# Events Participated', 1, 8, 'higher_better', 'count'),
  mkMetric('tm-27', 'obj-4', 'okr_events_held', '# Events Held', 0, 4, 'higher_better', 'count', null, 'back_loaded'),
  mkMetric('tm-28', 'obj-4', 'okr_awareness_metric', 'Awareness Metric', 100, 500, 'higher_better', 'count', null, 'front_loaded'),
];

export const mockTargetVersion1: TargetVersion = {
  id: VID,
  targetPlanId: 'target-1',
  versionNumber: 1,
  createdFromScenarioVersionId: null,
  startDate: OKR_START,
  endDate: OKR_END,
  revisionNote: 'Initial OKR targets for 12-month plan.',
  formulaVersionId: FV_ID,
  status: 'active',
  createdAt: format(subMonths(TODAY, 2), 'yyyy-MM-dd'),
  objectives,
  metrics: okrMetrics,
};

export const mockTargetPlan: TargetPlan = {
  id: 'target-1',
  appId: 'app-1',
  name: '2026 Annual OKR Targets',
  description: 'Company-wide OKR targets for product, growth, and brand.',
  owner: 'Leadership',
  status: 'active',
  activeVersionId: VID,
  createdAt: format(subMonths(TODAY, 2), 'yyyy-MM-dd'),
};

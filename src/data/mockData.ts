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
  name: 'ShopFlow Pro',
  currency: 'USD',
  timezone: 'America/New_York',
  status: 'active',
};

// Generate 24 months of historical actuals
function generateActuals(): ActualMetricObservation[] {
  const actuals: ActualMetricObservation[] = [];
  let freeUsers = 8500;
  let activeTrials = 420;
  let customers = 1850;
  let mrr = 42500;
  let arpuRecurring = 22.97;

  for (let i = 23; i >= 0; i--) {
    const date = format(subMonths(TODAY, i), 'yyyy-MM');
    const monthIndex = 23 - i;

    // Simulate growth with some variance
    const growthFactor = 1 + (0.02 + Math.sin(monthIndex * 0.5) * 0.01);
    const seasonality = 1 + Math.sin(monthIndex * Math.PI / 6) * 0.05;

    const installs = Math.round((350 + monthIndex * 12) * seasonality + (Math.random() - 0.5) * 40);
    const visits = Math.round(installs / (0.035 + Math.random() * 0.01));
    const trialStarts = Math.round(freeUsers * (0.045 + Math.random() * 0.005));
    const trialConversions = Math.round(activeTrials * (0.28 + Math.random() * 0.04));
    const freeChurns = Math.round(freeUsers * (0.06 + Math.random() * 0.01));
    const customerChurns = Math.round(customers * (0.045 + Math.random() * 0.008));
    const backToFree = Math.round(customers * (0.01 + Math.random() * 0.005));
    const reactivations = Math.round(freeUsers * (0.005 + Math.random() * 0.002));
    const upgrades = Math.round(customers * (0.03 + Math.random() * 0.01));
    const downgrades = Math.round(customers * (0.015 + Math.random() * 0.005));
    const deactivations = Math.round(customers * (0.008 + Math.random() * 0.004));
    const spend = Math.round(3500 + monthIndex * 80 + (Math.random() - 0.5) * 500);

    freeUsers = Math.max(0, freeUsers + installs - freeChurns - trialConversions + backToFree - reactivations);
    activeTrials = Math.max(0, Math.round(activeTrials * 0.3 + trialStarts * 0.7));
    customers = Math.max(0, customers + trialConversions + reactivations - customerChurns - backToFree - deactivations);

    const newMrr = trialConversions * arpuRecurring;
    const restartMrr = reactivations * arpuRecurring;
    const expansionMrr = upgrades * arpuRecurring * 0.4;
    const contractionMrr = downgrades * arpuRecurring * 0.3;
    const churnMrr = (customerChurns + deactivations) * arpuRecurring;

    mrr = Math.max(0, mrr + newMrr + restartMrr + expansionMrr - contractionMrr - churnMrr);
    arpuRecurring = customers > 0 ? mrr / customers : 22.97;

    const addObs = (key: string, val: number) => {
      actuals.push({
        id: `actual-${date}-${key}`,
        appId: 'app-1',
        metricKey: key,
        date,
        frameType: '30d',
        segmentType: 'all',
        cohortType: 'none',
        value: val,
        sourceSystem: 'mock',
      });
    };

    addObs('visits', visits);
    addObs('installs', installs);
    addObs('free_users', freeUsers);
    addObs('active_trials', activeTrials);
    addObs('customers', customers);
    addObs('mrr', Math.round(mrr));
    addObs('arr', Math.round(mrr * 12));
    addObs('arpu_recurring', Math.round(arpuRecurring * 100) / 100);
    addObs('arpu_non_recurring', Math.round((1.5 + Math.random()) * 100) / 100);
    addObs('arpu_transaction_fee', Math.round((0.8 + Math.random() * 0.3) * 100) / 100);
    addObs('new_mrr', Math.round(newMrr));
    addObs('restart_mrr', Math.round(restartMrr));
    addObs('expansion_mrr', Math.round(expansionMrr));
    addObs('contraction_mrr', Math.round(contractionMrr));
    addObs('churn_mrr', Math.round(churnMrr));
    addObs('customer_churn_rate', Math.round((customerChurns / Math.max(1, customers + customerChurns)) * 10000) / 100);
    addObs('free_user_churn_rate', Math.round((freeChurns / Math.max(1, freeUsers + freeChurns)) * 10000) / 100);
    addObs('trial_churn_rate', Math.round(((trialStarts - trialConversions) / Math.max(1, trialStarts)) * 10000) / 100);
    addObs('trial_conversion_rate', Math.round((trialConversions / Math.max(1, activeTrials)) * 10000) / 100);
    addObs('back_to_free_rate', Math.round((backToFree / Math.max(1, customers + backToFree)) * 10000) / 100);
    addObs('reactivation_rate', Math.round((reactivations / Math.max(1, freeUsers)) * 10000) / 100);
    addObs('upgrade_rate', Math.round((upgrades / Math.max(1, customers)) * 10000) / 100);
    addObs('downgrade_rate', Math.round((downgrades / Math.max(1, customers)) * 10000) / 100);
    addObs('deactivation_rate', Math.round((deactivations / Math.max(1, customers)) * 10000) / 100);
    addObs('spend', spend);
    addObs('user_to_trial_conversion', Math.round((trialStarts / Math.max(1, freeUsers)) * 10000) / 100);
    addObs('uninstalls', freeChurns);
    addObs('deactivations', deactivations);
    addObs('reactivation_count', reactivations);
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
  // Objective 1 — Churn (simulator-connected)
  mkMetric('tm-1', 'obj-1', 'free_churn_rate_new', 'Free Churn - New', 15, 10, 'lower_better', 'percent', 'free_churn_rate_new'),
  mkMetric('tm-2', 'obj-1', 'paid_churn_rate_new', 'Paid Churn - New', 8, 5, 'lower_better', 'percent', 'paid_churn_rate_new'),
  mkMetric('tm-3', 'obj-1', 'paid_churn_rate_old', 'Paid Churn - Old', 4.5, 3, 'lower_better', 'percent', 'paid_churn_rate_old'),
  mkMetric('tm-4', 'obj-1', 'user_conv_rate_new', 'Conversion - New', 5, 8, 'higher_better', 'percent', 'user_conv_rate_new'),

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

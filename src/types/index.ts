// ==================== Core Entity Types ====================

export interface App {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  status: 'active' | 'inactive';
}

export interface FormulaVersion {
  id: string;
  versionName: string;
  effectiveDate: string;
  notes: string;
  status: 'active' | 'archived';
}

export type MetricCategory =
  | 'growth_adoption'
  | 'conversion'
  | 'retention_churn'
  | 'expansion_contraction'
  | 'revenue'
  | 'monetization'
  | 'cost'
  | 'count'
  | 'okr';

export type MetricUnit = 'count' | 'percent' | 'currency' | 'ratio';
export type Directionality = 'higher_better' | 'lower_better';
export type FrameType = '7d' | '30d' | '90d';
export type SegmentType = 'all' | 'new' | 'old';

export interface MetricDefinition {
  key: string;
  name: string;
  category: MetricCategory;
  unit: MetricUnit;
  isInput: boolean;
  directionality: Directionality;
  description: string;
  formulaVersionId: string;
}

// ==================== Baseline ====================

export interface BaselineSnapshot {
  id: string;
  appId: string;
  referenceDate: string;
  metricValues: Record<string, number>;
  formulaVersionId: string;
  sourceType: 'mock' | 'imported' | 'manual';
}

// ==================== Scenario ====================

export interface Scenario {
  id: string;
  appId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  baselineSnapshotId: string;
  status: 'draft' | 'saved' | 'archived';
}

export interface ScenarioVersion {
  id: string;
  scenarioId: string;
  versionNumber: number;
  startDate: string;
  endDate: string;
  formulaVersionId: string;
  notes: string;
  createdAt: string;
  driverValues: ScenarioDriverValue[];
}

export interface ScenarioDriverValue {
  id: string;
  scenarioVersionId: string;
  metricKey: string;
  periodMonth: string; // YYYY-MM
  segmentKey: SegmentType;
  value: number;
  inputType: 'global_default' | 'period_override';
}

// ==================== Target ====================

export type TargetPathType = 'linear' | 'front_loaded' | 'back_loaded' | 'immediate';

export interface TargetPlan {
  id: string;
  appId: string;
  name: string;
  description: string;
  owner: string;
  status: 'draft' | 'active' | 'archived' | 'deleted';
  activeVersionId: string | null;
  createdAt: string;
}

export interface Objective {
  id: string;
  targetVersionId: string;
  name: string;
  description: string;
  sortOrder: number;
  color: string;
}

export interface TargetVersion {
  id: string;
  targetPlanId: string;
  versionNumber: number;
  createdFromScenarioVersionId: string | null;
  startDate: string;
  endDate: string;
  revisionNote: string;
  formulaVersionId: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  objectives: Objective[];
  metrics: TargetMetric[];
}

export interface TargetMetric {
  id: string;
  targetVersionId: string;
  objectiveId: string;
  metricKey: string;
  displayName: string;
  baselineValue: number;
  finalTargetValue: number;
  directionality: Directionality;
  targetPathType: TargetPathType;
  simulatorDriverKey: string | null;
  unit: MetricUnit;
  includeInSummary: boolean;
  periods: TargetMetricPeriod[];
}

export interface TargetMetricPeriod {
  id: string;
  targetMetricId: string;
  periodMonth: string; // YYYY-MM
  targetValue: number;
  actualValue: number | null;
  actualEnteredAt: string | null;
}

// ==================== Actuals ====================

export interface ActualMetricObservation {
  id: string;
  appId: string;
  metricKey: string;
  date: string;
  frameType: FrameType;
  segmentType: SegmentType;
  cohortType: 'installation' | 'subscription' | 'none';
  value: number;
  sourceSystem: string;
}

// ==================== Forecast Engine ====================

export interface ForecastMonth {
  month: string; // YYYY-MM

  // === User Counts ===
  freeUsers: number;
  customers: number;        // = paid users
  newFreeUsers: number;     // surviving new installs that stayed free
  oldFreeUsers: number;     // old free users that survived
  newCustomers: number;     // new installs that converted to paid
  oldCustomers: number;     // old customers that survived

  // === Funnel Steps (new users, from this month's installs) ===
  installs: number;
  survivingNewInstalls: number;     // installs * (1 - freeChurnRateNew)
  newConvertedToPaid: number;       // survivingNew * userConvRateNew
  newPaidSurviving: number;         // newConverted * (1 - paidChurnRateNew) * (1 - backToFreeRateNew)
  newBackToFree: number;            // newConverted * backToFreeRateNew

  // === Funnel Steps (old users, from previous month) ===
  oldFreeChurned: number;           // freeUsers[m-1] * freeChurnRateOld
  oldPaidChurned: number;           // customers[m-1] * paidChurnRateOld
  oldBackToFree: number;            // customers[m-1] * backToFreeRateOld

  // === Revenue ===
  mrrRecurring: number;             // ARPURecurringOld × (oldPaid + oldFreeConverts) + newInstalls × ARPURecurringNew
  arpuRecurring: number;            // mrrRecurring / customers (blended, for display)
  arpuRecurringOld: number;         // MRRRecurring[m-1] / PaidUser[m-1] (derived, not a driver)
  arpuRecurringNew: number;         // ARPU for new customers from installs (driver input)

  mrrPreorder: number;              // PaidUser[m] * preorderPct * arpuPreorder
  preorderCustomersPct: number;
  arpuPreorder: number;

  mrrSMS: number;                   // PaidUser[m] * smsPct * arpuSMS
  smsCustomersPct: number;
  arpuSMS: number;

  totalRevenue: number;             // mrrRecurring + mrrPreorder + mrrSMS
  arr: number;                      // totalRevenue * 12

  // === Rates (for display) ===
  freeChurnRateNew: number;
  freeChurnRateOld: number;
  paidChurnRateNew: number;
  paidChurnRateOld: number;
  userConversionRateNew: number;
  conversionRateOld: number;        // old free → paid conversion rate (mid-month ½ factor)
  backToFreeRateNew: number;
  backToFreeRateOld: number;

  // === Derived ===
  grr: number;
  nrr: number;
  clv: number;

  // === Cost Metrics ===
  visits: number;
  spend: number;
  cpl: number;
  cpa: number;
  cac: number;
}

export interface DriverConfig {
  key: string;
  label: string;
  category: MetricCategory;
  unit: MetricUnit;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  monthlyValues: Record<string, number>; // month -> value
}

// ==================== Report ====================

export type MetricStatus = 'ahead' | 'on_track' | 'behind';

export interface MetricReportCard {
  metricKey: string;
  metricName: string;
  actual: number;
  finalTarget: number;
  expectedToDate: number;
  attainmentVsFinal: number;
  attainmentVsExpected: number;
  varianceAmount: number;
  variancePercent: number;
  status: MetricStatus;
  projectedEndValue: number;
  directionality: Directionality;
  unit: MetricUnit;
}

import { create } from 'zustand';
import { Scenario, TargetPlan, TargetVersion, TargetMetric, TargetMetricPeriod, ActualMetricObservation, BaselineSnapshot, DriverConfig, ForecastMonth, Objective, TargetPathType, Directionality, MetricUnit } from '../types';
import { mockApp, mockBaseline, mockScenario, mockScenarioImprovedChurn, mockTargetPlan, mockTargetVersion1, mockActuals } from '../data/mockData';
import { runForecast, createDefaultDrivers, ForecastWarning } from '../engine/forecastEngine';
import { generateTargetPath } from '../utils/targetPaths';
import { SIMULATOR_DRIVER_MAPPING } from '../data/metricDefinitions';
import { addMonths, format } from 'date-fns';

interface AppState {
  // App
  app: typeof mockApp;

  // Baseline
  baselines: BaselineSnapshot[];
  activeBaselineId: string;

  // Scenarios
  scenarios: Scenario[];
  activeScenarioId: string | null;
  drivers: Record<string, DriverConfig>;
  forecastMonths: ForecastMonth[];
  forecastWarnings: ForecastWarning[];
  forecastStartDate: string;
  forecastEndDate: string;

  // Targets
  targetPlans: TargetPlan[];
  targetVersions: TargetVersion[];

  // Actuals
  actuals: ActualMetricObservation[];

  // Scenario Actions
  setActiveScenario: (id: string) => void;
  updateDriver: (key: string, value: number) => void;
  updateDriverMonth: (key: string, month: string, value: number) => void;
  resetDriverMonth: (key: string, month: string) => void;
  runSimulation: () => void;
  setForecastDates: (start: string, end: string) => void;
  saveScenario: (name: string, description: string) => void;
  duplicateScenario: (id: string) => void;

  // Target Actions
  createTargetFromScenario: (name: string, description: string, owner: string, metricKeys: string[]) => void;
  createTargetFromScratch: (
    name: string, description: string, owner: string,
    startDate: string, endDate: string,
    objectives: Array<{ name: string; description: string; color: string }>,
    metrics: Array<{
      objectiveIndex: number; key: string; displayName: string;
      baseline: number; target: number; directionality: Directionality;
      unit: MetricUnit; simulatorDriverKey: string | null; pathType: TargetPathType;
    }>
  ) => void;
  reviseTarget: (targetPlanId: string, note: string) => void;
  archiveTarget: (targetPlanId: string) => void;
  activateTargetVersion: (targetPlanId: string, versionId: string) => void;

  // OKR Actions
  updateActualValue: (versionId: string, metricId: string, month: string, value: number | null) => void;
  updateTargetPeriodValue: (versionId: string, metricId: string, month: string, value: number) => void;
  regenerateTargetPath: (versionId: string, metricId: string, pathType: TargetPathType) => void;
  updateMetricTargets: (versionId: string, metricId: string, baseline: number, target: number) => void;
  syncTargetsToSimulator: (versionId: string) => void;
  setForecastAsTarget: (targetPlanId: string) => void;
}

// Forecast starts the month AFTER the current month so it never overlaps history
const defaultStart = format(addMonths(new Date(), 1), 'yyyy-MM');
const defaultEnd   = format(addMonths(new Date(), 13), 'yyyy-MM'); // 12 months of forecast

export const useAppStore = create<AppState>((set, get) => {
  const initialDrivers = createDefaultDrivers(mockBaseline);
  const initialForecast = runForecast({
    baseline: mockBaseline,
    startDate: defaultStart + '-01',
    months: 12,
    drivers: initialDrivers,
  });

  return {
    app: mockApp,
    baselines: [mockBaseline],
    activeBaselineId: mockBaseline.id,
    scenarios: [mockScenario, mockScenarioImprovedChurn],
    activeScenarioId: mockScenario.id,
    drivers: initialDrivers,
    forecastMonths: initialForecast.months,
    forecastWarnings: initialForecast.warnings,
    forecastStartDate: defaultStart,
    forecastEndDate: defaultEnd,
    targetPlans: [mockTargetPlan],
    targetVersions: [mockTargetVersion1],
    actuals: mockActuals,

    setActiveScenario: (id) => set({ activeScenarioId: id }),

    updateDriver: (key, value) => {
      const { drivers } = get();
      const updated = { ...drivers, [key]: { ...drivers[key], defaultValue: value } };
      set({ drivers: updated });
      get().runSimulation();
    },

    updateDriverMonth: (key, month, value) => {
      const { drivers } = get();
      const driver = drivers[key];
      set({
        drivers: {
          ...drivers,
          [key]: { ...driver, monthlyValues: { ...driver.monthlyValues, [month]: value } },
        },
      });
      get().runSimulation();
    },

    resetDriverMonth: (key, month) => {
      const { drivers } = get();
      const driver = drivers[key];
      const mv = { ...driver.monthlyValues };
      delete mv[month];
      set({ drivers: { ...drivers, [key]: { ...driver, monthlyValues: mv } } });
      get().runSimulation();
    },

    runSimulation: () => {
      const { drivers, forecastStartDate, forecastEndDate } = get();
      const baseline = get().baselines.find(b => b.id === get().activeBaselineId)!;
      const start = new Date(forecastStartDate + '-01');
      const end = new Date(forecastEndDate + '-01');
      const months = Math.max(1, Math.round((end.getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
      const result = runForecast({ baseline, startDate: forecastStartDate + '-01', months, drivers });
      set({ forecastMonths: result.months, forecastWarnings: result.warnings });
    },

    setForecastDates: (start, end) => {
      set({ forecastStartDate: start, forecastEndDate: end });
      get().runSimulation();
    },

    saveScenario: (name, description) => {
      const { scenarios } = get();
      const newScenario: Scenario = {
        id: `scenario-${Date.now()}`,
        appId: 'app-1',
        name,
        description,
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        baselineSnapshotId: get().activeBaselineId,
        status: 'saved',
      };
      set({ scenarios: [...scenarios, newScenario], activeScenarioId: newScenario.id });
    },

    duplicateScenario: (id) => {
      const { scenarios } = get();
      const source = scenarios.find(s => s.id === id);
      if (!source) return;
      const dup: Scenario = {
        ...source,
        id: `scenario-${Date.now()}`,
        name: `${source.name} (Copy)`,
        createdAt: new Date().toISOString(),
        status: 'draft',
      };
      set({ scenarios: [...scenarios, dup], activeScenarioId: dup.id });
    },

    createTargetFromScenario: (name, description, owner, metricKeys) => {
      const { forecastMonths, targetPlans, targetVersions } = get();
      const baseline = get().baselines.find(b => b.id === get().activeBaselineId)!;
      const planId = `target-${Date.now()}`;
      const versionId = `tv-${Date.now()}`;
      const startDate = get().forecastStartDate;
      const endDate = get().forecastEndDate;
      const numMonths = forecastMonths.length;

      const objId = `obj-${Date.now()}`;
      const objectives: Objective[] = [{
        id: objId, targetVersionId: versionId,
        name: 'Scenario Targets', description: 'Targets from forecast scenario',
        sortOrder: 1, color: '#3b82f6',
      }];

      const metrics = metricKeys.map((key, i) => {
        const baseVal = baseline.metricValues[key] || (forecastMonths[0] as any)?.[key] || 0;
        const finalVal = (forecastMonths[numMonths - 1] as any)?.[key] || baseVal;
        const dir: Directionality = baseVal <= finalVal ? 'higher_better' : 'lower_better';
        const metricId = `tm-${versionId}-${i}`;
        const pathValues = generateTargetPath(baseVal, finalVal, numMonths, 'linear');

        const periods: TargetMetricPeriod[] = pathValues.map((val, m) => ({
          id: `tp-${metricId}-${m}`,
          targetMetricId: metricId,
          periodMonth: format(addMonths(new Date(startDate + '-01'), m + 1), 'yyyy-MM'),
          targetValue: val,
          actualValue: null,
          actualEnteredAt: null,
        }));

        return {
          id: metricId,
          targetVersionId: versionId,
          objectiveId: objId,
          metricKey: key,
          displayName: key,
          baselineValue: baseVal,
          finalTargetValue: finalVal,
          directionality: dir,
          targetPathType: 'linear' as const,
          simulatorDriverKey: SIMULATOR_DRIVER_MAPPING[key] || null,
          unit: 'count' as const,
          includeInSummary: true,
          periods,
        };
      });

      const version: TargetVersion = {
        id: versionId, targetPlanId: planId, versionNumber: 1,
        createdFromScenarioVersionId: get().activeScenarioId,
        startDate: startDate + '-01', endDate: endDate + '-01',
        revisionNote: 'Created from scenario.', formulaVersionId: 'fv-1',
        status: 'draft', createdAt: new Date().toISOString(),
        objectives, metrics,
      };

      const plan: TargetPlan = {
        id: planId, appId: 'app-1', name, description, owner,
        status: 'draft', activeVersionId: versionId,
        createdAt: new Date().toISOString(),
      };

      set({
        targetPlans: [...targetPlans, plan],
        targetVersions: [...targetVersions, version],
      });
    },

    createTargetFromScratch: (name, description, owner, startDate, endDate, objectivesInput, metricsInput) => {
      const { targetPlans, targetVersions } = get();
      const planId = `target-${Date.now()}`;
      const versionId = `tv-${Date.now()}`;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const numMonths = Math.max(1, Math.round((end.getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));

      const objectives: Objective[] = objectivesInput.map((o, i) => ({
        id: `obj-${versionId}-${i}`,
        targetVersionId: versionId,
        name: o.name,
        description: o.description,
        sortOrder: i + 1,
        color: o.color,
      }));

      const metrics: TargetMetric[] = metricsInput.map((m, i) => {
        const metricId = `tm-${versionId}-${i}`;
        const objId = objectives[m.objectiveIndex]?.id || objectives[0].id;
        const pathValues = generateTargetPath(m.baseline, m.target, numMonths, m.pathType);

        const periods: TargetMetricPeriod[] = pathValues.map((val, mon) => ({
          id: `tp-${metricId}-${mon}`,
          targetMetricId: metricId,
          periodMonth: format(addMonths(start, mon + 1), 'yyyy-MM'),
          targetValue: val,
          actualValue: null,
          actualEnteredAt: null,
        }));

        return {
          id: metricId, targetVersionId: versionId, objectiveId: objId,
          metricKey: m.key, displayName: m.displayName,
          baselineValue: m.baseline, finalTargetValue: m.target,
          directionality: m.directionality, targetPathType: m.pathType,
          simulatorDriverKey: m.simulatorDriverKey, unit: m.unit,
          includeInSummary: true, periods,
        };
      });

      const version: TargetVersion = {
        id: versionId, targetPlanId: planId, versionNumber: 1,
        createdFromScenarioVersionId: null,
        startDate, endDate, revisionNote: 'Created from scratch.',
        formulaVersionId: 'fv-1', status: 'draft',
        createdAt: new Date().toISOString(), objectives, metrics,
      };

      const plan: TargetPlan = {
        id: planId, appId: 'app-1', name, description, owner,
        status: 'draft', activeVersionId: versionId,
        createdAt: new Date().toISOString(),
      };

      set({
        targetPlans: [...targetPlans, plan],
        targetVersions: [...targetVersions, version],
      });
    },

    reviseTarget: (targetPlanId, note) => {
      const { targetVersions, targetPlans } = get();
      const planVersions = targetVersions.filter(v => v.targetPlanId === targetPlanId);
      const currentActive = planVersions.find(v => v.status === 'active');
      if (!currentActive) return;
      const maxVersion = Math.max(...planVersions.map(v => v.versionNumber), 0);
      const newVersionId = `tv-${Date.now()}`;

      const updatedVersions = targetVersions.map(v =>
        v.targetPlanId === targetPlanId && v.status === 'active'
          ? { ...v, status: 'archived' as const }
          : v
      );

      const newVersion: TargetVersion = {
        ...currentActive,
        id: newVersionId,
        versionNumber: maxVersion + 1,
        revisionNote: note,
        status: 'active',
        createdAt: new Date().toISOString(),
        objectives: currentActive.objectives.map(o => ({ ...o, targetVersionId: newVersionId })),
        metrics: currentActive.metrics.map(m => ({
          ...m,
          targetVersionId: newVersionId,
          periods: m.periods.map(p => ({ ...p })),
        })),
      };

      set({
        targetVersions: [...updatedVersions, newVersion],
        targetPlans: targetPlans.map(p =>
          p.id === targetPlanId ? { ...p, activeVersionId: newVersionId, status: 'active' } : p
        ),
      });
    },

    archiveTarget: (targetPlanId) => {
      set({
        targetPlans: get().targetPlans.map(p =>
          p.id === targetPlanId ? { ...p, status: 'archived' } : p
        ),
      });
    },

    activateTargetVersion: (targetPlanId, versionId) => {
      const { targetVersions, targetPlans } = get();
      const updatedVersions = targetVersions.map(v => {
        if (v.targetPlanId !== targetPlanId) return v;
        if (v.id === versionId) return { ...v, status: 'active' as const };
        if (v.status === 'active') return { ...v, status: 'archived' as const };
        return v;
      });
      set({
        targetVersions: updatedVersions,
        targetPlans: targetPlans.map(p =>
          p.id === targetPlanId ? { ...p, activeVersionId: versionId, status: 'active' } : p
        ),
      });
    },

    // ═══════════════════════════════════════
    // OKR-specific actions
    // ═══════════════════════════════════════

    updateActualValue: (versionId, metricId, month, value) => {
      set({
        targetVersions: get().targetVersions.map(v => {
          if (v.id !== versionId) return v;
          return {
            ...v,
            metrics: v.metrics.map(m => {
              if (m.id !== metricId) return m;
              return {
                ...m,
                periods: m.periods.map(p => {
                  if (p.periodMonth !== month) return p;
                  return { ...p, actualValue: value, actualEnteredAt: value !== null ? new Date().toISOString() : null };
                }),
              };
            }),
          };
        }),
      });
    },

    updateTargetPeriodValue: (versionId, metricId, month, value) => {
      set({
        targetVersions: get().targetVersions.map(v => {
          if (v.id !== versionId) return v;
          return {
            ...v,
            metrics: v.metrics.map(m => {
              if (m.id !== metricId) return m;
              return {
                ...m,
                periods: m.periods.map(p => {
                  if (p.periodMonth !== month) return p;
                  return { ...p, targetValue: value };
                }),
              };
            }),
          };
        }),
      });
    },

    regenerateTargetPath: (versionId, metricId, pathType) => {
      set({
        targetVersions: get().targetVersions.map(v => {
          if (v.id !== versionId) return v;
          return {
            ...v,
            metrics: v.metrics.map(m => {
              if (m.id !== metricId) return m;
              const newPath = generateTargetPath(m.baselineValue, m.finalTargetValue, m.periods.length, pathType);
              return {
                ...m,
                targetPathType: pathType,
                periods: m.periods.map((p, i) => ({
                  ...p,
                  targetValue: newPath[i],
                })),
              };
            }),
          };
        }),
      });
    },

    updateMetricTargets: (versionId, metricId, baseline, target) => {
      set({
        targetVersions: get().targetVersions.map(v => {
          if (v.id !== versionId) return v;
          return {
            ...v,
            metrics: v.metrics.map(m => {
              if (m.id !== metricId) return m;
              const newPath = generateTargetPath(baseline, target, m.periods.length, m.targetPathType);
              return {
                ...m,
                baselineValue: baseline,
                finalTargetValue: target,
                periods: m.periods.map((p, i) => ({
                  ...p,
                  targetValue: newPath[i],
                })),
              };
            }),
          };
        }),
      });
    },

    syncTargetsToSimulator: (versionId) => {
      const version = get().targetVersions.find(v => v.id === versionId);
      if (!version) return;

      const { drivers } = get();
      const updatedDrivers = { ...drivers };

      for (const metric of version.metrics) {
        if (!metric.simulatorDriverKey || !updatedDrivers[metric.simulatorDriverKey]) continue;

        const driver = updatedDrivers[metric.simulatorDriverKey];
        const newMonthlyValues = { ...driver.monthlyValues };

        for (const period of metric.periods) {
          newMonthlyValues[period.periodMonth] = period.targetValue;
        }

        updatedDrivers[metric.simulatorDriverKey] = {
          ...driver,
          monthlyValues: newMonthlyValues,
        };
      }

      set({ drivers: updatedDrivers });
      get().runSimulation();
    },

    setForecastAsTarget: (targetPlanId) => {
      const { forecastMonths } = get();
      if (forecastMonths.length === 0) return;

      const version = get().targetVersions.find(v => v.targetPlanId === targetPlanId && v.status === 'active');
      if (!version) return;

      const BIZ_OBJ_ID = 'obj-biz-metrics';

      // Business metrics we extract from the forecast
      const bizMetricDefs = [
        { key: 'biz_customers', name: 'Customers', field: 'customers' as const, unit: 'count' as const, dir: 'higher_better' as const },
        { key: 'biz_free_users', name: 'Free Users', field: 'freeUsers' as const, unit: 'count' as const, dir: 'higher_better' as const },
        { key: 'biz_mrr_recurring', name: 'MRR Recurring', field: 'mrrRecurring' as const, unit: 'currency' as const, dir: 'higher_better' as const },
        { key: 'biz_mrr_preorder', name: 'MRR Preorder', field: 'mrrPreorder' as const, unit: 'currency' as const, dir: 'higher_better' as const },
        { key: 'biz_mrr_sms', name: 'MRR SMS', field: 'mrrSMS' as const, unit: 'currency' as const, dir: 'higher_better' as const },
        { key: 'biz_total_revenue', name: 'Total Revenue', field: 'totalRevenue' as const, unit: 'currency' as const, dir: 'higher_better' as const },
        { key: 'biz_arpu', name: 'ARPU Recurring', field: 'arpuRecurring' as const, unit: 'currency' as const, dir: 'higher_better' as const },
        { key: 'biz_arr', name: 'ARR', field: 'arr' as const, unit: 'currency' as const, dir: 'higher_better' as const },
        { key: 'biz_new_customers', name: 'New Customers / Month', field: 'newCustomers' as const, unit: 'count' as const, dir: 'higher_better' as const },
        { key: 'biz_installs', name: 'Installs', field: 'installs' as const, unit: 'count' as const, dir: 'higher_better' as const },
      ];

      const first = forecastMonths[0];
      const last = forecastMonths[forecastMonths.length - 1];

      // Remove existing biz metrics from this version
      const existingNonBiz = version.metrics.filter(m => m.objectiveId !== BIZ_OBJ_ID);
      const existingObjs = version.objectives.filter(o => o.id !== BIZ_OBJ_ID);

      // Create biz objective
      const bizObj: Objective = {
        id: BIZ_OBJ_ID,
        targetVersionId: version.id,
        name: 'Business Metrics (from Simulator)',
        description: 'Auto-generated from simulator forecast output',
        sortOrder: 0, // First
        color: '#0ea5e9',
      };

      // Create biz metrics from forecast
      const bizMetrics: TargetMetric[] = bizMetricDefs.map((def, i) => {
        const metricId = `tm-biz-${version.id}-${i}`;
        const baseline = (first as any)[def.field] as number;
        const target = (last as any)[def.field] as number;

        const periods: TargetMetricPeriod[] = forecastMonths.map((fm, mi) => ({
          id: `tp-biz-${metricId}-${mi}`,
          targetMetricId: metricId,
          periodMonth: fm.month,
          targetValue: Math.round(((fm as any)[def.field] as number) * 100) / 100,
          actualValue: null,
          actualEnteredAt: null,
        }));

        return {
          id: metricId,
          targetVersionId: version.id,
          objectiveId: BIZ_OBJ_ID,
          metricKey: def.key,
          displayName: def.name,
          baselineValue: Math.round(baseline * 100) / 100,
          finalTargetValue: Math.round(target * 100) / 100,
          directionality: def.dir,
          targetPathType: 'linear' as const,
          simulatorDriverKey: null,
          unit: def.unit,
          includeInSummary: true,
          periods,
        };
      });

      // Update the version with biz objective + metrics prepended
      const updatedVersions = get().targetVersions.map(v => {
        if (v.id !== version.id) return v;
        return {
          ...v,
          objectives: [bizObj, ...existingObjs],
          metrics: [...bizMetrics, ...existingNonBiz],
        };
      });
      set({ targetVersions: updatedVersions });
    },
  };
});

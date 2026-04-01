import { DriverConfig } from '../types';
import { runForecast, ForecastInput, ForecastResult } from './forecastEngine';

export interface SensitivityResult {
  driverKey: string;
  driverLabel: string;
  category: string;
  mrrDelta: number;
  mrrDeltaPct: number;
  perturbationPct: number;
  equivalenceRatio: number;
}

const AUTO_CALCULATED_DRIVERS = ['preorder_customers_pct'];

export function runSensitivityAnalysis(
  baseInput: ForecastInput,
  baselineResult: ForecastResult,
  perturbationPct: number,
): SensitivityResult[] {
  if (baselineResult.months.length === 0) return [];

  const baselineEndMrr = baselineResult.months[baselineResult.months.length - 1].totalRevenue;
  if (baselineEndMrr === 0) return [];

  const results: SensitivityResult[] = [];

  for (const [key, driver] of Object.entries(baseInput.drivers)) {
    if (AUTO_CALCULATED_DRIVERS.includes(key)) continue;

    // Clone drivers with perturbation on this single driver
    const perturbedDrivers: Record<string, DriverConfig> = {};
    for (const [k, d] of Object.entries(baseInput.drivers)) {
      if (k === key) {
        const mult = 1 + perturbationPct / 100;
        const newDefault = clamp(d.defaultValue * mult, d.min, d.max);
        const newMonthly: Record<string, number> = {};
        for (const [m, v] of Object.entries(d.monthlyValues)) {
          newMonthly[m] = clamp(v * mult, d.min, d.max);
        }
        perturbedDrivers[k] = { ...d, defaultValue: newDefault, monthlyValues: newMonthly };
      } else {
        perturbedDrivers[k] = d;
      }
    }

    const perturbedResult = runForecast({ ...baseInput, drivers: perturbedDrivers });
    const perturbedEndMrr = perturbedResult.months[perturbedResult.months.length - 1].totalRevenue;
    const mrrDelta = perturbedEndMrr - baselineEndMrr;

    results.push({
      driverKey: key,
      driverLabel: driver.label,
      category: driver.category,
      mrrDelta,
      mrrDeltaPct: (mrrDelta / baselineEndMrr) * 100,
      perturbationPct,
      equivalenceRatio: 1,
    });
  }

  // Sort by absolute impact descending
  results.sort((a, b) => Math.abs(b.mrrDelta) - Math.abs(a.mrrDelta));

  // Compute equivalence ratios relative to top driver
  if (results.length > 0 && Math.abs(results[0].mrrDelta) > 0) {
    const topAbs = Math.abs(results[0].mrrDelta);
    for (const r of results) {
      r.equivalenceRatio = Math.abs(r.mrrDelta) > 0.01 ? topAbs / Math.abs(r.mrrDelta) : Infinity;
    }
  }

  return results;
}

function clamp(value: number, min?: number, max?: number): number {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}

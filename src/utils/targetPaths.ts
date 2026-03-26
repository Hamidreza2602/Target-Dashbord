import { TargetPathType } from '../types';

/**
 * Generate a monthly target path from baseline to target.
 * Returns an array of length `months` with interpolated values.
 *
 * - linear: equal increments
 * - front_loaded: steep early growth, flattening later (log curve)
 * - back_loaded: slow start, steep late growth (exponential curve)
 */
export function generateTargetPath(
  baseline: number,
  target: number,
  months: number,
  pathType: TargetPathType
): number[] {
  if (months <= 0) return [];
  if (months === 1) return [target];

  const values: number[] = [];
  const diff = target - baseline;

  for (let i = 0; i < months; i++) {
    const t = (i + 1) / months; // 0..1 progress through the period
    let factor: number;

    switch (pathType) {
      case 'front_loaded':
        // Logarithmic: steep early, flattening later
        factor = Math.log(1 + t * (Math.E - 1));
        break;
      case 'back_loaded':
        // Exponential: slow start, steep late
        factor = (Math.exp(t) - 1) / (Math.E - 1);
        break;
      case 'linear':
      default:
        factor = t;
        break;
    }

    values.push(Math.round((baseline + diff * factor) * 100) / 100);
  }

  // Ensure last value exactly equals target
  values[values.length - 1] = target;

  return values;
}

/**
 * Shared gauge helpers — exponential slider mapping used by both
 * CompactDriverRow (small gauge) and MonthlyEditorPanel (big gauge).
 */

const GAUGE_POWER = 2.5;
const GAUGE_RANGE = 500;
export const SLIDER_MIN = -500;
export const SLIDER_MAX = 500;

/** Convert actual percentage change → slider position (inverse power curve) */
export function pctToSlider(pct: number): number {
  const sign = pct >= 0 ? 1 : -1;
  return sign * Math.pow(Math.abs(pct) / GAUGE_RANGE, 1 / GAUGE_POWER) * GAUGE_RANGE;
}

/** Convert slider position → actual percentage change (power curve) */
export function sliderToPct(s: number): number {
  const sign = s >= 0 ? 1 : -1;
  return sign * Math.pow(Math.abs(s) / GAUGE_RANGE, GAUGE_POWER) * GAUGE_RANGE;
}

/** Compute slider position from forward avg vs trailing avg */
export function computeSliderFromAvgs(forwardAvg: number, trailingAvg: number, driverMin: number): number {
  if (forwardAvg <= driverMin) return SLIDER_MIN;
  const pctChange = trailingAvg !== 0 ? ((forwardAvg - trailingAvg) / Math.abs(trailingAvg)) * 100 : 0;
  return Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, pctToSlider(pctChange)));
}

/** Compute projection average for a given endpoint, respecting projection type */
export function computeProjectionAvg(
  endVal: number,
  startVal: number,
  months: string[],
  projType: 'linear' | 'curve' | 'seasonal' | 'immediate',
  dMin: number,
  dMax: number,
  seasonalAdj: Record<number, number>,
): number {
  const n = months.length;
  if (n === 0) return Math.max(dMin, Math.min(dMax, endVal));
  if (projType === 'immediate') return Math.max(dMin, Math.min(dMax, endVal));

  let sum = 0;
  if (projType === 'curve') {
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 1;
      sum += Math.max(dMin, Math.min(dMax, startVal + (endVal - startVal) * t * t));
    }
  } else if (projType === 'seasonal') {
    const raw: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 1;
      const base = startVal + (endVal - startVal) * t;
      const moy = parseInt(months[i].split('-')[1]) - 1;
      raw.push(base + (seasonalAdj[moy] ?? 0));
    }
    const endOffset = endVal - raw[raw.length - 1];
    for (let i = 0; i < n; i++) sum += Math.max(dMin, Math.min(dMax, raw[i] + endOffset));
  } else {
    // Linear
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 1;
      sum += Math.max(dMin, Math.min(dMax, startVal + (endVal - startVal) * t));
    }
  }
  return sum / n;
}

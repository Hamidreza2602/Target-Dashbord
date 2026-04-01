import { describe, it, expect } from 'vitest';
import {
  pctToSlider,
  sliderToPct,
  computeSliderFromAvgs,
  computeProjectionAvg,
  SLIDER_MIN,
  SLIDER_MAX,
} from './gaugeHelpers';

describe('pctToSlider / sliderToPct round-trip', () => {
  it('center (0%) maps to slider 0', () => {
    expect(pctToSlider(0)).toBe(0);
    expect(sliderToPct(0)).toBe(0);
  });

  it('round-trip: pctToSlider → sliderToPct returns original pct', () => {
    for (const pct of [-200, -100, -50, -10, -1, 0, 1, 10, 50, 100, 200, 500]) {
      const slider = pctToSlider(pct);
      const recovered = sliderToPct(slider);
      expect(recovered).toBeCloseTo(pct, 5);
    }
  });

  it('slider extremes map to ±500% change', () => {
    expect(sliderToPct(SLIDER_MAX)).toBeCloseTo(500, 1);
    expect(sliderToPct(SLIDER_MIN)).toBeCloseTo(-500, 1);
  });

  it('positive slider produces positive pct, negative produces negative', () => {
    expect(sliderToPct(100)).toBeGreaterThan(0);
    expect(sliderToPct(-100)).toBeLessThan(0);
  });
});

describe('computeSliderFromAvgs', () => {
  it('forward == trailing → slider at center (0)', () => {
    expect(computeSliderFromAvgs(2267, 2267, 0)).toBe(0);
  });

  it('forward > trailing → slider positive', () => {
    expect(computeSliderFromAvgs(2800, 2267, 0)).toBeGreaterThan(0);
  });

  it('forward < trailing → slider negative', () => {
    expect(computeSliderFromAvgs(1500, 2267, 0)).toBeLessThan(0);
  });

  it('forward at driverMin → slider at SLIDER_MIN', () => {
    expect(computeSliderFromAvgs(0, 2267, 0)).toBe(SLIDER_MIN);
  });

  it('forward below driverMin → slider at SLIDER_MIN', () => {
    expect(computeSliderFromAvgs(-100, 2267, 0)).toBe(SLIDER_MIN);
  });
});

describe('computeProjectionAvg', () => {
  const months12 = [
    '2026-04', '2026-05', '2026-06', '2026-07',
    '2026-08', '2026-09', '2026-10', '2026-11',
    '2026-12', '2027-01', '2027-02', '2027-03',
  ];
  const noSeasonal: Record<number, number> = {};

  it('immediate: avg = clamped endpoint', () => {
    expect(computeProjectionAvg(100, 1689, months12, 'immediate', 0, 100000, noSeasonal)).toBe(100);
  });

  it('linear from startVal to same value → avg = startVal', () => {
    const avg = computeProjectionAvg(1689, 1689, months12, 'linear', 0, 100000, noSeasonal);
    expect(avg).toBeCloseTo(1689, 0);
  });

  it('linear from 1689 to 2845 → avg ≈ 2267 (midpoint)', () => {
    const avg = computeProjectionAvg(2845, 1689, months12, 'linear', 0, 100000, noSeasonal);
    expect(avg).toBeCloseTo(2267, 0);
  });

  it('linear with all months clamped to 0 → avg = startVal/n', () => {
    const avg = computeProjectionAvg(-1e9, 1689, months12, 'linear', 0, 100000, noSeasonal);
    // Only month 0 contributes (= 1689), rest clamped to 0
    expect(avg).toBeCloseTo(1689 / 12, 0);
  });

  it('0 months → returns clamped endpoint', () => {
    expect(computeProjectionAvg(500, 1689, [], 'linear', 0, 100000, noSeasonal)).toBe(500);
  });

  it('seasonal with zero adjustments behaves like linear', () => {
    const linAvg = computeProjectionAvg(2500, 1689, months12, 'linear', 0, 100000, noSeasonal);
    const seaAvg = computeProjectionAvg(2500, 1689, months12, 'seasonal', 0, 100000, noSeasonal);
    expect(seaAvg).toBeCloseTo(linAvg, 0);
  });
});

describe('gauge sync: both gauges must show same value for same store state', () => {
  it('same forwardAvg & trailingAvg → same slider position', () => {
    const pos1 = computeSliderFromAvgs(2788, 2267, 0);
    const pos2 = computeSliderFromAvgs(2788, 2267, 0);
    expect(pos1).toBe(pos2);
  });

  it('slider position → pct → desired avg → projection endpoint → projection avg ≈ desired avg (no drift)', () => {
    const trailingAvg = 2267;
    const startVal = 1689;
    const months = [
      '2026-04', '2026-05', '2026-06', '2026-07',
      '2026-08', '2026-09', '2026-10', '2026-11',
      '2026-12', '2027-01', '2027-02', '2027-03',
    ];

    // Simulate slider drag to position 150
    const sliderPos = 150;
    const pct = sliderToPct(sliderPos);
    const desiredAvg = trailingAvg * (1 + pct / 100);

    // Binary search for endpoint (same as handleSliderChange)
    let lo = -30000, hi = 30000;
    for (let iter = 0; iter < 60; iter++) {
      const mid = (lo + hi) / 2;
      const avg = computeProjectionAvg(mid, startVal, months, 'seasonal', 0, 100000, {});
      if (Math.abs(avg - desiredAvg) < 0.5) break;
      if (avg < desiredAvg) lo = mid; else hi = mid;
    }
    const endpoint = (lo + hi) / 2;
    const actualAvg = computeProjectionAvg(endpoint, startVal, months, 'seasonal', 0, 100000, {});

    // Actual avg should match desired avg (no drift → no jump)
    expect(actualAvg).toBeCloseTo(desiredAvg, 0);

    // Reverse: compute slider position from actual avg
    const recoveredSlider = computeSliderFromAvgs(actualAvg, trailingAvg, 0);
    // Should be very close to original slider position (no jump)
    expect(recoveredSlider).toBeCloseTo(sliderPos, 0);
  });
});

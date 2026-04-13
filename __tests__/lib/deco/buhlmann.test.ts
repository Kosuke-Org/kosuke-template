import { describe, expect, it } from 'vitest';

import { planDive, validatePlannerInput } from '@/lib/deco/buhlmann';

const air = {
  id: 'air',
  label: 'Air',
  oxygenFraction: 0.21,
  heliumFraction: 0,
  switchDepthMeters: 999,
};

const trimix2135 = {
  id: 'tx21/35',
  label: 'Trimix 21/35',
  oxygenFraction: 0.21,
  heliumFraction: 0.35,
  switchDepthMeters: 999,
};

const ean50 = {
  id: 'ean50',
  label: 'EAN50',
  oxygenFraction: 0.5,
  heliumFraction: 0,
  switchDepthMeters: 21,
};

const oxygen = {
  id: 'oxygen',
  label: 'Oxygen',
  oxygenFraction: 1,
  heliumFraction: 0,
  switchDepthMeters: 6,
};

const config = {
  gradientFactorLow: 0.3,
  gradientFactorHigh: 0.85,
  descentRateMetersPerMinute: 20,
  ascentRateMetersPerMinute: 10,
};

describe('validatePlannerInput', () => {
  it('returns user-facing errors for invalid gas fractions and gradient factors', () => {
    const errors = validatePlannerInput(
      [{ depthMeters: 30, durationMinutes: 20 }],
      {
        ...air,
        oxygenFraction: 0.7,
        heliumFraction: 0.4,
      },
      [],
      {
        ...config,
        gradientFactorLow: 0.95,
        gradientFactorHigh: 0.8,
      }
    );

    expect(errors).toContain('Air fractions add up to more than 100%.');
    expect(errors).toContain('GF low cannot be greater than GF high.');
  });
});

describe('planDive', () => {
  it('returns a direct ascent for a simple no-decompression dive', () => {
    const result = planDive([{ depthMeters: 12, durationMinutes: 25 }], air, [], config);

    expect(result.firstStopMeters).toBeNull();
    expect(result.stops).toHaveLength(0);
    expect(result.timeToSurfaceMinutes).toBeGreaterThan(0);
    expect(result.plan.some((entry) => entry.type === 'travel' && entry.toDepthMeters === 0)).toBe(true);
  });

  it('creates decompression stops and gas switches for a staged trimix ascent', () => {
    const result = planDive(
      [
        { depthMeters: 45, durationMinutes: 25 },
        { depthMeters: 30, durationMinutes: 5 },
      ],
      trimix2135,
      [ean50, oxygen],
      config
    );

    expect(result.firstStopMeters).not.toBeNull();
    expect(result.stops.length).toBeGreaterThan(0);
    expect(result.gasSwitches.map((entry) => entry.gasLabel)).toContain('EAN50');
    expect(result.totalRuntimeMinutes).toBeGreaterThan(30);
  });

  it('uses deco gases to reduce total runtime compared with staying on back gas', () => {
    const withDecoGases = planDive(
      [{ depthMeters: 48, durationMinutes: 30 }],
      trimix2135,
      [ean50, oxygen],
      config
    );

    const backGasOnly = planDive([{ depthMeters: 48, durationMinutes: 30 }], trimix2135, [], config);

    expect(withDecoGases.totalRuntimeMinutes).toBeLessThan(backGasOnly.totalRuntimeMinutes);
    expect(withDecoGases.stops.length).toBeGreaterThan(0);
  });
});

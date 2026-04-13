const WATER_VAPOR_PRESSURE_BAR = 0.0627;
const SURFACE_PRESSURE_BAR = 1;

const N2_HALF_TIMES = [
  5, 8, 12.5, 18.5, 27, 38.3, 54.3, 77, 109, 146, 187, 239, 305, 390, 498, 635,
] as const;

const N2_A = [
  1.1696, 1, 0.8618, 0.7562, 0.62, 0.5043, 0.441, 0.4, 0.375, 0.35, 0.3295, 0.3065,
  0.2835, 0.261, 0.248, 0.2327,
] as const;

const N2_B = [
  0.5578, 0.6514, 0.7222, 0.7825, 0.8126, 0.8434, 0.8693, 0.891, 0.9092, 0.9222,
  0.9319, 0.9403, 0.9477, 0.9544, 0.9602, 0.9653,
] as const;

const HE_HALF_TIMES = [
  1.88, 3.02, 4.72, 6.99, 10.21, 14.48, 20.53, 29.11, 41.2, 55.19, 70.69, 90.34,
  115.29, 147.42, 188.24, 240.03,
] as const;

const HE_A = [
  1.6189, 1.383, 1.1919, 1.0458, 0.922, 0.8205, 0.7305, 0.6502, 0.595, 0.5545, 0.5333,
  0.5189, 0.5181, 0.5176, 0.5172, 0.5119,
] as const;

const HE_B = [
  0.477, 0.5747, 0.6527, 0.7223, 0.7582, 0.7957, 0.8279, 0.8553, 0.8757, 0.8903, 0.8997,
  0.9073, 0.9122, 0.9171, 0.9217, 0.9267,
] as const;

const STOP_STEP_METERS = 3;
const STOP_TIME_INCREMENT_MINUTES = 1;

export type DecoGas = {
  id: string;
  label: string;
  oxygenFraction: number;
  heliumFraction: number;
  switchDepthMeters: number;
};

export type DiveSegment = {
  depthMeters: number;
  durationMinutes: number;
};

export type PlannerConfig = {
  gradientFactorLow: number;
  gradientFactorHigh: number;
  descentRateMetersPerMinute: number;
  ascentRateMetersPerMinute: number;
  stopIntervalMeters?: number;
};

export type DecoStop = {
  depthMeters: number;
  durationMinutes: number;
  gasId: string;
  gasLabel: string;
  gradientFactor: number;
};

export type TravelSegment = {
  type: 'travel';
  fromDepthMeters: number;
  toDepthMeters: number;
  durationMinutes: number;
  gasId: string;
  gasLabel: string;
};

export type StopSegment = {
  type: 'stop';
  depthMeters: number;
  durationMinutes: number;
  gasId: string;
  gasLabel: string;
  gradientFactor: number;
};

export type GasSwitch = {
  depthMeters: number;
  gasId: string;
  gasLabel: string;
};

export type PlannerResult = {
  ceilingMeters: number;
  firstStopMeters: number | null;
  totalRuntimeMinutes: number;
  timeToSurfaceMinutes: number;
  maxDepthMeters: number;
  plan: Array<TravelSegment | StopSegment>;
  stops: DecoStop[];
  gasSwitches: GasSwitch[];
  warnings: string[];
};

type TissueState = {
  nitrogenPressure: number;
  heliumPressure: number;
};

function depthToAmbientPressureBar(depthMeters: number) {
  return SURFACE_PRESSURE_BAR + Math.max(depthMeters, 0) / 10;
}

function ambientPressureToDepthMeters(ambientPressureBar: number) {
  return Math.max(0, (ambientPressureBar - SURFACE_PRESSURE_BAR) * 10);
}

function roundUpToStep(depthMeters: number, stepMeters: number) {
  return Math.ceil(depthMeters / stepMeters) * stepMeters;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getNitrogenFraction(gas: Pick<DecoGas, 'oxygenFraction' | 'heliumFraction'>) {
  return 1 - gas.oxygenFraction - gas.heliumFraction;
}

function alveolarInertPressureBar(ambientPressureBar: number, fraction: number) {
  return Math.max(0, (ambientPressureBar - WATER_VAPOR_PRESSURE_BAR) * fraction);
}

function schreinerPressureBar(
  initialInspiredPressureBar: number,
  rateBarPerMinute: number,
  timeMinutes: number,
  halfTimeMinutes: number,
  initialTissuePressureBar: number
) {
  const k = Math.log(2) / halfTimeMinutes;

  return (
    initialInspiredPressureBar +
    rateBarPerMinute * (timeMinutes - 1 / k) -
    (initialInspiredPressureBar - initialTissuePressureBar - rateBarPerMinute / k) *
      Math.exp(-k * timeMinutes)
  );
}

function haldanePressureBar(
  inspiredPressureBar: number,
  timeMinutes: number,
  halfTimeMinutes: number,
  initialTissuePressureBar: number
) {
  const k = Math.log(2) / halfTimeMinutes;
  return inspiredPressureBar + (initialTissuePressureBar - inspiredPressureBar) * Math.exp(-k * timeMinutes);
}

function initialTissues(surfaceGas: DecoGas) {
  const surfacePressure = depthToAmbientPressureBar(0);
  const inspiredNitrogen = alveolarInertPressureBar(
    surfacePressure,
    getNitrogenFraction(surfaceGas)
  );
  const inspiredHelium = alveolarInertPressureBar(surfacePressure, surfaceGas.heliumFraction);

  return N2_HALF_TIMES.map(() => ({
    nitrogenPressure: inspiredNitrogen,
    heliumPressure: inspiredHelium,
  }));
}

function updateTissuesAtConstantDepth(
  tissues: TissueState[],
  ambientPressureBar: number,
  gas: DecoGas,
  durationMinutes: number
) {
  const inspiredNitrogen = alveolarInertPressureBar(ambientPressureBar, getNitrogenFraction(gas));
  const inspiredHelium = alveolarInertPressureBar(ambientPressureBar, gas.heliumFraction);

  return tissues.map((tissue, index) => ({
    nitrogenPressure: haldanePressureBar(
      inspiredNitrogen,
      durationMinutes,
      N2_HALF_TIMES[index],
      tissue.nitrogenPressure
    ),
    heliumPressure: haldanePressureBar(
      inspiredHelium,
      durationMinutes,
      HE_HALF_TIMES[index],
      tissue.heliumPressure
    ),
  }));
}

function updateTissuesDuringTravel(
  tissues: TissueState[],
  fromDepthMeters: number,
  toDepthMeters: number,
  gas: DecoGas,
  rateMetersPerMinute: number
) {
  if (fromDepthMeters === toDepthMeters) {
    return { tissues, durationMinutes: 0 };
  }

  const durationMinutes = Math.abs(toDepthMeters - fromDepthMeters) / rateMetersPerMinute;
  const fromAmbient = depthToAmbientPressureBar(fromDepthMeters);
  const toAmbient = depthToAmbientPressureBar(toDepthMeters);
  const nitrogenFraction = getNitrogenFraction(gas);
  const heliumFraction = gas.heliumFraction;
  const inspiredNitrogen = alveolarInertPressureBar(fromAmbient, nitrogenFraction);
  const inspiredHelium = alveolarInertPressureBar(fromAmbient, heliumFraction);
  const nitrogenRateBarPerMinute =
    ((toAmbient - fromAmbient) / durationMinutes) * nitrogenFraction;
  const heliumRateBarPerMinute = ((toAmbient - fromAmbient) / durationMinutes) * heliumFraction;

  return {
    durationMinutes,
    tissues: tissues.map((tissue, index) => ({
      nitrogenPressure: schreinerPressureBar(
        inspiredNitrogen,
        nitrogenRateBarPerMinute,
        durationMinutes,
        N2_HALF_TIMES[index],
        tissue.nitrogenPressure
      ),
      heliumPressure: schreinerPressureBar(
        inspiredHelium,
        heliumRateBarPerMinute,
        durationMinutes,
        HE_HALF_TIMES[index],
        tissue.heliumPressure
      ),
    })),
  };
}

function tissueCoefficients(tissue: TissueState, index: number) {
  const totalInertPressure = tissue.nitrogenPressure + tissue.heliumPressure;

  if (totalInertPressure <= 0) {
    return { a: N2_A[index], b: N2_B[index], totalInertPressure };
  }

  const heliumRatio = tissue.heliumPressure / totalInertPressure;

  return {
    totalInertPressure,
    a: N2_A[index] * (1 - heliumRatio) + HE_A[index] * heliumRatio,
    b: N2_B[index] * (1 - heliumRatio) + HE_B[index] * heliumRatio,
  };
}

function ceilingAmbientPressureBar(tissues: TissueState[], gradientFactor: number) {
  return tissues.reduce((maxAmbientPressure, tissue, index) => {
    const { a, b, totalInertPressure } = tissueCoefficients(tissue, index);
    const ambientPressure =
      (totalInertPressure - gradientFactor * a) /
      (gradientFactor / b + (1 - gradientFactor));

    return Math.max(maxAmbientPressure, ambientPressure);
  }, SURFACE_PRESSURE_BAR);
}

function ceilingMeters(tissues: TissueState[], gradientFactor: number) {
  return ambientPressureToDepthMeters(ceilingAmbientPressureBar(tissues, gradientFactor));
}

function pickGas(depthMeters: number, gases: DecoGas[]) {
  const availableGases = gases
    .filter((gas) => depthMeters <= gas.switchDepthMeters)
    .sort((a, b) => {
      if (b.oxygenFraction !== a.oxygenFraction) {
        return b.oxygenFraction - a.oxygenFraction;
      }

      return a.heliumFraction - b.heliumFraction;
    });

  return availableGases[0] ?? gases[0];
}

function maxOperatingDepthMeters(gas: DecoGas, maxPpo2: number) {
  if (gas.oxygenFraction <= 0) {
    return Infinity;
  }

  return Math.max(0, (maxPpo2 / gas.oxygenFraction - SURFACE_PRESSURE_BAR) * 10);
}

export function validatePlannerInput(
  profile: DiveSegment[],
  backGas: DecoGas,
  decoGases: DecoGas[],
  config: PlannerConfig
) {
  const errors: string[] = [];
  const gases = [backGas, ...decoGases];

  if (!profile.length) {
    errors.push('Add at least one dive segment.');
  }

  profile.forEach((segment, index) => {
    if (segment.depthMeters <= 0) {
      errors.push(`Segment ${index + 1} depth must be greater than 0 meters.`);
    }

    if (segment.durationMinutes <= 0) {
      errors.push(`Segment ${index + 1} duration must be greater than 0 minutes.`);
    }
  });

  gases.forEach((gas) => {
    const nitrogenFraction = getNitrogenFraction(gas);

    if (gas.oxygenFraction <= 0 || gas.oxygenFraction > 1) {
      errors.push(`${gas.label} oxygen fraction must be between 0 and 1.`);
    }

    if (gas.heliumFraction < 0 || gas.heliumFraction > 1) {
      errors.push(`${gas.label} helium fraction must be between 0 and 1.`);
    }

    if (nitrogenFraction < 0) {
      errors.push(`${gas.label} fractions add up to more than 100%.`);
    }
  });

  if (config.gradientFactorLow <= 0 || config.gradientFactorLow > 1) {
    errors.push('GF low must be between 1% and 100%.');
  }

  if (config.gradientFactorHigh <= 0 || config.gradientFactorHigh > 1) {
    errors.push('GF high must be between 1% and 100%.');
  }

  if (config.gradientFactorLow > config.gradientFactorHigh) {
    errors.push('GF low cannot be greater than GF high.');
  }

  if (config.descentRateMetersPerMinute <= 0 || config.ascentRateMetersPerMinute <= 0) {
    errors.push('Ascent and descent rates must be greater than 0.');
  }

  return errors;
}

export function planDive(
  profile: DiveSegment[],
  backGas: DecoGas,
  decoGases: DecoGas[],
  config: PlannerConfig
): PlannerResult {
  const errors = validatePlannerInput(profile, backGas, decoGases, config);

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const stopIntervalMeters = config.stopIntervalMeters ?? STOP_STEP_METERS;
  const gases = [backGas, ...decoGases].sort((a, b) => b.switchDepthMeters - a.switchDepthMeters);
  const warnings: string[] = [];
  const plan: Array<TravelSegment | StopSegment> = [];
  const gasSwitches: GasSwitch[] = [];
  let tissues = initialTissues(backGas);
  let runtimeMinutes = 0;
  let currentDepthMeters = 0;
  let currentGas = backGas;

  for (const gas of gases) {
    const modAt14 = maxOperatingDepthMeters(gas, 1.4);
    const modAt16 = maxOperatingDepthMeters(gas, 1.6);

    if (gas.switchDepthMeters > modAt16) {
      warnings.push(
        `${gas.label} switch depth exceeds a 1.6 ata oxygen limit (MOD ${modAt16.toFixed(0)} m).`
      );
    } else if (gas.switchDepthMeters > modAt14) {
      warnings.push(
        `${gas.label} switch depth exceeds a 1.4 ata working oxygen limit (MOD ${modAt14.toFixed(0)} m).`
      );
    }
  }

  for (const segment of profile) {
    if (segment.depthMeters !== currentDepthMeters) {
      const travel = updateTissuesDuringTravel(
        tissues,
        currentDepthMeters,
        segment.depthMeters,
        currentGas,
        segment.depthMeters > currentDepthMeters
          ? config.descentRateMetersPerMinute
          : config.ascentRateMetersPerMinute
      );

      tissues = travel.tissues;
      runtimeMinutes += travel.durationMinutes;
      plan.push({
        type: 'travel',
        fromDepthMeters: currentDepthMeters,
        toDepthMeters: segment.depthMeters,
        durationMinutes: travel.durationMinutes,
        gasId: currentGas.id,
        gasLabel: currentGas.label,
      });
      currentDepthMeters = segment.depthMeters;
    }

    tissues = updateTissuesAtConstantDepth(
      tissues,
      depthToAmbientPressureBar(segment.depthMeters),
      currentGas,
      segment.durationMinutes
    );
    runtimeMinutes += segment.durationMinutes;
    currentDepthMeters = segment.depthMeters;
  }

  const decoStartRuntime = runtimeMinutes;
  const ceilingAtGfLow = ceilingMeters(tissues, config.gradientFactorLow);
  const firstStopMeters =
    ceilingAtGfLow > 0 ? roundUpToStep(ceilingAtGfLow, stopIntervalMeters) : null;

  if (firstStopMeters === null) {
    const travelToSurface = updateTissuesDuringTravel(
      tissues,
      currentDepthMeters,
      0,
      currentGas,
      config.ascentRateMetersPerMinute
    );

    plan.push({
      type: 'travel',
      fromDepthMeters: currentDepthMeters,
      toDepthMeters: 0,
      durationMinutes: travelToSurface.durationMinutes,
      gasId: currentGas.id,
      gasLabel: currentGas.label,
    });

    return {
      ceilingMeters: 0,
      firstStopMeters: null,
      totalRuntimeMinutes: runtimeMinutes + travelToSurface.durationMinutes,
      timeToSurfaceMinutes: travelToSurface.durationMinutes,
      maxDepthMeters: Math.max(...profile.map((segment) => segment.depthMeters)),
      plan,
      stops: [],
      gasSwitches: [],
      warnings,
    };
  }

  const firstStopAmbient = depthToAmbientPressureBar(firstStopMeters);
  const surfaceAmbient = depthToAmbientPressureBar(0);

  const gradientFactorAtDepth = (depthMeters: number) => {
    const currentAmbient = depthToAmbientPressureBar(depthMeters);

    if (firstStopAmbient <= surfaceAmbient) {
      return config.gradientFactorHigh;
    }

    const progress = (firstStopAmbient - currentAmbient) / (firstStopAmbient - surfaceAmbient);
    return clamp(
      config.gradientFactorLow +
        progress * (config.gradientFactorHigh - config.gradientFactorLow),
      config.gradientFactorLow,
      config.gradientFactorHigh
    );
  };

  while (currentDepthMeters > 0) {
    const targetDepthMeters =
      currentDepthMeters > firstStopMeters
        ? firstStopMeters
        : Math.max(0, currentDepthMeters - stopIntervalMeters);

    const targetGas = pickGas(targetDepthMeters, gases);

    if (targetGas.id !== currentGas.id && currentDepthMeters <= targetGas.switchDepthMeters) {
      currentGas = targetGas;
      gasSwitches.push({
        depthMeters: currentDepthMeters,
        gasId: currentGas.id,
        gasLabel: currentGas.label,
      });
    }

    const travel = updateTissuesDuringTravel(
      tissues,
      currentDepthMeters,
      targetDepthMeters,
      currentGas,
      config.ascentRateMetersPerMinute
    );
    const targetGf = gradientFactorAtDepth(targetDepthMeters);
    const targetCeiling = ceilingMeters(travel.tissues, targetGf);

    if (targetCeiling <= targetDepthMeters + 0.01) {
      plan.push({
        type: 'travel',
        fromDepthMeters: currentDepthMeters,
        toDepthMeters: targetDepthMeters,
        durationMinutes: travel.durationMinutes,
        gasId: currentGas.id,
        gasLabel: currentGas.label,
      });
      tissues = travel.tissues;
      runtimeMinutes += travel.durationMinutes;
      currentDepthMeters = targetDepthMeters;
      continue;
    }

    const stopDepthMeters = currentDepthMeters;
    const stopGf = gradientFactorAtDepth(stopDepthMeters);
    let stopMinutes = 0;

    while (true) {
      tissues = updateTissuesAtConstantDepth(
        tissues,
        depthToAmbientPressureBar(stopDepthMeters),
        currentGas,
        STOP_TIME_INCREMENT_MINUTES
      );
      runtimeMinutes += STOP_TIME_INCREMENT_MINUTES;
      stopMinutes += STOP_TIME_INCREMENT_MINUTES;

      const reassessedTravel = updateTissuesDuringTravel(
        tissues,
        stopDepthMeters,
        targetDepthMeters,
        currentGas,
        config.ascentRateMetersPerMinute
      );
      const reassessedCeiling = ceilingMeters(reassessedTravel.tissues, targetGf);

      if (reassessedCeiling <= targetDepthMeters + 0.01) {
        break;
      }
    }

    plan.push({
      type: 'stop',
      depthMeters: stopDepthMeters,
      durationMinutes: stopMinutes,
      gasId: currentGas.id,
      gasLabel: currentGas.label,
      gradientFactor: stopGf,
    });
  }

  const stops = plan.filter((entry): entry is StopSegment => entry.type === 'stop').map((stop) => ({
    depthMeters: stop.depthMeters,
    durationMinutes: stop.durationMinutes,
    gasId: stop.gasId,
    gasLabel: stop.gasLabel,
    gradientFactor: stop.gradientFactor,
  }));

  return {
    ceilingMeters: Math.max(0, ceilingMeters(tissues, config.gradientFactorHigh)),
    firstStopMeters,
    totalRuntimeMinutes: runtimeMinutes,
    timeToSurfaceMinutes: runtimeMinutes - decoStartRuntime,
    maxDepthMeters: Math.max(...profile.map((segment) => segment.depthMeters)),
    plan,
    stops,
    gasSwitches,
    warnings,
  };
}

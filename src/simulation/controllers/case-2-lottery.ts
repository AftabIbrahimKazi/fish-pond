/**
 * Case 2: Hybrid S1 (The Intuitive Preset Lottery).
 * Evaluates telemetry array, calculates probability distribution over designer presets,
 * runs a weighted lottery, and lerps parameters with organic momentum.
 */

import {
  BenchmarkCase,
  BehaviorTelemetry,
  ControllerFrame,
  FishControlOutputs,
  FishKinematics,
  PresetKey,
  PresetParameters,
  SimulationController,
  SimulationInputs,
  Vector3D,
} from '../../types/benchmark';
import { calculateEffectiveDistance } from '../fish-mesh';
import { buildSeededRandom } from '../prng';

export const DESIGNER_PRESETS: Record<PresetKey, PresetParameters> = {
  [PresetKey.GLIDE]: {
    speed: 1.8,
    tailFrequency: 1.9,
    spineCurveAmplitude: 0.22,
    finResistance: 0.35,
    bodyColorHue: 0.45,
    turnResponsiveness: 1.5,
  },
  [PresetKey.STARTLE_DART]: {
    speed: 6.2,
    tailFrequency: 5.8,
    spineCurveAmplitude: 0.78,
    finResistance: 0.8,
    bodyColorHue: 0.1,
    turnResponsiveness: 4.5,
  },
  [PresetKey.CURIOUS_HOVER]: {
    speed: 2.1,
    tailFrequency: 2.3,
    spineCurveAmplitude: 0.3,
    finResistance: 0.45,
    bodyColorHue: 0.7,
    turnResponsiveness: 2.0,
  },
  [PresetKey.ANXIOUS_FREEZE]: {
    speed: 0.4,
    tailFrequency: 4.2,
    spineCurveAmplitude: 0.6,
    finResistance: 0.95,
    bodyColorHue: 0.2,
    turnResponsiveness: 0.8,
  },
};

const LOTTERY_RANDOM_SEED = 202 as const;
const LOTTERY_INTERVAL_MS = 600 as const;
const LERP_SPEED = 3.2 as const;
const NO_TARGET_DISTANCE = 999.0 as const;
const THREAT_NEAR_DISTANCE = 5.5 as const;
const FOOD_NEAR_DISTANCE = 9.0 as const;
const PANIC_TRIGGER_DISTANCE = 2.5 as const;
const HIGH_TENSION = 0.9 as const;
const LOW_TENSION = 0.1 as const;
const DART_PITCH = -0.3 as const;
const MS_PER_SECOND = 1000 as const;

const BASE_GLIDE = 0.35 as const;
const BASE_DART = 0.05 as const;
const BASE_HOVER = 0.1 as const;
const BASE_FREEZE = 0.05 as const;
const CONFLICT_DART = 0.45 as const;
const CONFLICT_DART_VELOCITY_GAIN = 0.1 as const;
const CONFLICT_FREEZE = 0.35 as const;
const CONFLICT_FREEZE_TIME_GAIN = 0.05 as const;
const CONFLICT_HOVER = 0.15 as const;
const CONFLICT_GLIDE = 0.05 as const;
const THREAT_DART = 0.75 as const;
const THREAT_DART_VELOCITY_GAIN = 0.15 as const;
const THREAT_FREEZE = 0.15 as const;
const THREAT_GLIDE = 0.08 as const;
const THREAT_HOVER = 0.02 as const;
const FOOD_HOVER = 0.7 as const;
const FOOD_GLIDE = 0.25 as const;
const FOOD_DART = 0.03 as const;
const FOOD_FREEZE = 0.02 as const;

const WANDER_HEADING_RATE = 0.0008 as const;
const WANDER_PITCH_RATE = 0.0005 as const;
const WANDER_PITCH_AMPLITUDE = 0.25 as const;

export function createSystem1LotteryController(): SimulationController {
  const random = buildSeededRandom(LOTTERY_RANDOM_SEED);
  let activePresetKey: PresetKey = PresetKey.GLIDE;
  let lastLotteryTime = 0;

  // Active interpolated parameters
  const currentParams: PresetParameters = { ...DESIGNER_PRESETS[PresetKey.GLIDE] };
  let currentTension = 0.0;
  const currentDirection: Vector3D = { x: 0, y: 0, z: 1 };

  function calculateProbabilities(
    threatDist: number,
    foodDist: number,
    inputs: SimulationInputs
  ): Record<PresetKey, number> {
    const isThreatNear = inputs.threatActive && threatDist < THREAT_NEAR_DISTANCE;
    const isFoodNear = inputs.foodActive && foodDist < FOOD_NEAR_DISTANCE;
    const isConflict = isThreatNear && isFoodNear;

    let pGlide: number = BASE_GLIDE;
    let pDart: number = BASE_DART;
    let pHover: number = BASE_HOVER;
    let pFreeze: number = BASE_FREEZE;

    if (isConflict) {
      // Conflict: balancing threat avoidance and hunger
      pDart = CONFLICT_DART + (inputs.threatVelocity * CONFLICT_DART_VELOCITY_GAIN);
      pFreeze = CONFLICT_FREEZE + (inputs.timeElapsedConflict * CONFLICT_FREEZE_TIME_GAIN);
      pHover = CONFLICT_HOVER;
      pGlide = CONFLICT_GLIDE;
    } else if (isThreatNear) {
      pDart = THREAT_DART + (inputs.threatVelocity * THREAT_DART_VELOCITY_GAIN);
      pFreeze = THREAT_FREEZE;
      pGlide = THREAT_GLIDE;
      pHover = THREAT_HOVER;
    } else if (isFoodNear) {
      pHover = FOOD_HOVER;
      pGlide = FOOD_GLIDE;
      pDart = FOOD_DART;
      pFreeze = FOOD_FREEZE;
    }

    // Normalize probabilities to sum to 1.0
    const total = pGlide + pDart + pHover + pFreeze;
    return {
      [PresetKey.GLIDE]: pGlide / total,
      [PresetKey.STARTLE_DART]: pDart / total,
      [PresetKey.CURIOUS_HOVER]: pHover / total,
      [PresetKey.ANXIOUS_FREEZE]: pFreeze / total,
    };
  }

  function runWeightedLottery(probabilities: Record<PresetKey, number>): PresetKey {
    const rand = random();
    let cumulative = 0;
    const keys = Object.keys(probabilities) as PresetKey[];

    for (const key of keys) {
      cumulative += probabilities[key];
      if (rand <= cumulative) {
        return key;
      }
    }

    return PresetKey.GLIDE;
  }

  function update(
    kinematics: FishKinematics,
    inputs: SimulationInputs,
    deltaTime: number
  ): ControllerFrame {
    const threatDist = inputs.threatActive
      ? calculateEffectiveDistance(kinematics.position, inputs.threatPos)
      : NO_TARGET_DISTANCE;

    const foodDist = inputs.foodActive && inputs.foodPos
      ? calculateEffectiveDistance(kinematics.position, inputs.foodPos)
      : NO_TARGET_DISTANCE;

    const probabilities = calculateProbabilities(threatDist, foodDist, inputs);

    // Periodically run weighted lottery or trigger immediately on sudden threat
    const isPanicTrigger = inputs.threatActive
      && threatDist < PANIC_TRIGGER_DISTANCE
      && activePresetKey !== PresetKey.STARTLE_DART;
    if (inputs.timestamp - lastLotteryTime > LOTTERY_INTERVAL_MS || isPanicTrigger) {
      activePresetKey = runWeightedLottery(probabilities);
      lastLotteryTime = inputs.timestamp;
    }

    const targetPreset = DESIGNER_PRESETS[activePresetKey];

    // Smooth organic lerping with inertia
    const lerpFactor = Math.min(1.0, deltaTime * LERP_SPEED);
    currentParams.speed += (targetPreset.speed - currentParams.speed) * lerpFactor;
    currentParams.tailFrequency += (targetPreset.tailFrequency - currentParams.tailFrequency) * lerpFactor;
    currentParams.spineCurveAmplitude += (targetPreset.spineCurveAmplitude - currentParams.spineCurveAmplitude) * lerpFactor;
    currentParams.finResistance += (targetPreset.finResistance - currentParams.finResistance) * lerpFactor;
    currentParams.bodyColorHue += (targetPreset.bodyColorHue - currentParams.bodyColorHue) * lerpFactor;

    const isTense = activePresetKey === PresetKey.STARTLE_DART || activePresetKey === PresetKey.ANXIOUS_FREEZE;
    const targetTension = isTense ? HIGH_TENSION : LOW_TENSION;
    currentTension += (targetTension - currentTension) * lerpFactor;

    // Calculate heading direction according to selected preset
    const desiredDir: Vector3D = { x: 0, y: 0, z: 0 };
    if (activePresetKey === PresetKey.STARTLE_DART && inputs.threatActive) {
      const dx = kinematics.position.x - inputs.threatPos.x;
      const dz = kinematics.position.z - inputs.threatPos.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1.0;
      desiredDir.x = dx / len;
      desiredDir.y = DART_PITCH;
      desiredDir.z = dz / len;
    } else if (activePresetKey === PresetKey.CURIOUS_HOVER && inputs.foodPos) {
      const dx = inputs.foodPos.x - kinematics.position.x;
      const dy = inputs.foodPos.y - kinematics.position.y;
      const dz = inputs.foodPos.z - kinematics.position.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;
      desiredDir.x = dx / len;
      desiredDir.y = dy / len;
      desiredDir.z = dz / len;
    } else {
      desiredDir.x = Math.cos(inputs.timestamp * WANDER_HEADING_RATE);
      desiredDir.y = Math.sin(inputs.timestamp * WANDER_PITCH_RATE) * WANDER_PITCH_AMPLITUDE;
      desiredDir.z = Math.sin(inputs.timestamp * WANDER_HEADING_RATE);
    }

    currentDirection.x += (desiredDir.x - currentDirection.x) * lerpFactor * targetPreset.turnResponsiveness;
    currentDirection.y += (desiredDir.y - currentDirection.y) * lerpFactor * targetPreset.turnResponsiveness;
    currentDirection.z += (desiredDir.z - currentDirection.z) * lerpFactor * targetPreset.turnResponsiveness;

    const outputs: FishControlOutputs = {
      targetSpeed: currentParams.speed,
      targetDirection: currentDirection,
      tailFrequency: currentParams.tailFrequency,
      spineCurveAmplitude: currentParams.spineCurveAmplitude,
      finResistance: currentParams.finResistance,
      bodyColorHue: currentParams.bodyColorHue,
      tensionLevel: currentTension,
    };

    const telemetry: BehaviorTelemetry = {
      caseType: BenchmarkCase.SYSTEM_1_LOTTERY,
      stateLabel: activePresetKey,
      probabilities: {
        Glide: probabilities[PresetKey.GLIDE],
        'Startle-Dart': probabilities[PresetKey.STARTLE_DART],
        'Curious-Hover': probabilities[PresetKey.CURIOUS_HOVER],
        'Anxious-Freeze': probabilities[PresetKey.ANXIOUS_FREEZE],
      },
      fps: 0,
      frameTimeMs: deltaTime * MS_PER_SECOND,
      threatDistance: threatDist,
      foodDistance: foodDist,
      tailFrequencyHz: currentParams.tailFrequency,
      spineCurvature: currentParams.spineCurveAmplitude,
      finResistance: currentParams.finResistance,
      tensionScore: currentTension,
      isSnapping: false,
    };

    return { outputs, telemetry };
  }

  return { update };
}


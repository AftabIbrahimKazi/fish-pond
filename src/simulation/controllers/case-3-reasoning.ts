/**
 * Case 3: Dual-Process (The Autonomous Organism).
 * Implements System 1 intent extraction + System 2 continuous multi-axis reasoning
 * with zero pre-baked presets and strict physical boundary safety clamping.
 */

import {
  BenchmarkCase,
  BehaviorTelemetry,
  ControllerFrame,
  FishControlOutputs,
  FishKinematics,
  SimulationController,
  SimulationInputs,
  Vector3D,
} from '../../types/benchmark';
import { calculateEffectiveDistance, FISH_SAFETY_LIMITS } from '../fish-mesh';
import { buildSeededRandom } from '../prng';

const REASONING_RANDOM_SEED = 303 as const;
const NO_TARGET_DISTANCE = 999.0 as const;
const FULL_TURN = Math.PI * 2;
const MS_PER_SECOND = 1000 as const;
const HALF = 0.5 as const;

const THREAT_RANGE = 14.0 as const;
const FOOD_RANGE = 16.0 as const;
const CONFLICT_INTENT_THRESHOLD = 0.25 as const;
const THREAT_INTENT_THRESHOLD = 0.4 as const;
const FOOD_INTENT_THRESHOLD = 0.35 as const;
const EVASION_MIN_INTENSITY = 0.01 as const;
const FORAGE_MIN_ATTRACTION = 0.01 as const;

const SPINE_BASE = 0.2 as const;
const SPINE_THREAT_GAIN = 0.58 as const;
const SPINE_CONFLICT_GAIN = 0.22 as const;
const SPINE_PULSE_RATE = 0.003 as const;
const SPINE_PULSE_AMPLITUDE = 0.06 as const;
const TAIL_BASE = 1.8 as const;
const TAIL_THREAT_GAIN = 5.0 as const;
const TAIL_CONFLICT_GAIN = 1.5 as const;
const TAIL_VELOCITY_GAIN = 0.3 as const;
const FIN_BASE = 0.3 as const;
const FIN_CONFLICT_GAIN = 0.55 as const;
const FIN_THREAT_GAIN = 0.25 as const;
const SPEED_BASE = 2.4 as const;
const SPEED_FOOD_GAIN = 2.6 as const;
const SPEED_THREAT_GAIN = 4.8 as const;
const HESITATION_BRAKE = 0.7 as const;
const HUE_BASE = 0.4 as const;
const HUE_THREAT_DROP = 0.35 as const;
const HUE_FOOD_GAIN = 0.4 as const;

const WANDER_SWAY_RATE = 0.001 as const;
const WANDER_SWAY_GAIN = 0.03 as const;
const WANDER_JITTER_GAIN = 0.05 as const;
const WANDER_FRAME_SCALE = 30.0 as const;
const WANDER_THREAT_DAMP = 0.85 as const;
const WANDER_FOOD_DAMP = 0.8 as const;
const WANDER_MIN_WEIGHT = 0.12 as const;
const WANDER_PITCH_RATE = 0.0006 as const;
const WANDER_PITCH_AMPLITUDE = 0.25 as const;
const EVASION_GAIN = 2.8 as const;
const EVASION_PITCH = 0.3 as const;
const FOOD_GAIN = 2.2 as const;
const FOOD_THREAT_DAMP = 0.65 as const;
const FOOD_PITCH_FACTOR = 0.6 as const;

const SMOOTHING_RATE = 8.0 as const;
const DIRECTION_SMOOTHING_BOOST = 2.0 as const;

export function createSystem2ReasoningController(): SimulationController {
  const random = buildSeededRandom(REASONING_RANDOM_SEED);
  let smoothSpeed = 2.4;
  let smoothTailFreq = 2.2;
  let smoothSpineCurve = 0.25;
  let smoothFinResistance = 0.4;
  let smoothHue = 0.45;
  let smoothTension = 0.0;
  let wanderAngle = random() * FULL_TURN;
  const smoothDirection: Vector3D = { x: 0, y: 0, z: 1 };

  function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
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

    // --- System 1: High-Level Intent Classification ---
    // Continuous emotional drives (normalized 0.0 - 1.0)
    const threatIntensity = inputs.threatActive
      ? clamp((THREAT_RANGE - threatDist) / THREAT_RANGE, 0.0, 1.0)
      : 0.0;

    const foodAttraction = (inputs.foodActive && inputs.foodPos)
      ? clamp((FOOD_RANGE - foodDist) / FOOD_RANGE, 0.0, 1.0)
      : 0.0;

    const conflictTension = threatIntensity * foodAttraction;

    let emotionalIntent = 'Autonomous Exploration';
    if (conflictTension > CONFLICT_INTENT_THRESHOLD) {
      emotionalIntent = 'Ambivalent Hesitation (Conflict)';
    } else if (threatIntensity > THREAT_INTENT_THRESHOLD) {
      emotionalIntent = 'Evasive Threat Response';
    } else if (foodAttraction > FOOD_INTENT_THRESHOLD) {
      emotionalIntent = 'Targeted Foraging';
    }

    // --- System 2: Real-time Multi-Axis Mathematical Reasoning ---
    // Instead of discrete presets, System 2 computes continuous proportional muscle stresses
    // 1. Spine Tension: Curvature scales non-linearly with threat velocity and conflict
    const rawSpineCurve = SPINE_BASE + (threatIntensity * SPINE_THREAT_GAIN) + (conflictTension * SPINE_CONFLICT_GAIN) + (Math.sin(inputs.timestamp * SPINE_PULSE_RATE) * SPINE_PULSE_AMPLITUDE);

    // 2. Tail Frequency: High vibration in conflict/threat, relaxed cadence in drift
    const rawTailFreq = TAIL_BASE + (threatIntensity * TAIL_THREAT_GAIN) + (conflictTension * TAIL_CONFLICT_GAIN) + (inputs.threatVelocity * TAIL_VELOCITY_GAIN);

    // 3. Fin Resistance: Stabilizes posture during tense hesitation
    const rawFinResistance = FIN_BASE + (conflictTension * FIN_CONFLICT_GAIN) + (threatIntensity * FIN_THREAT_GAIN);

    // 4. Locomotion Speed: In conflict, speed drops while muscular tail vibration stays high
    let rawSpeed = SPEED_BASE + (foodAttraction * SPEED_FOOD_GAIN) + (threatIntensity * SPEED_THREAT_GAIN);
    if (conflictTension > CONFLICT_INTENT_THRESHOLD) {
      rawSpeed *= (1.0 - (conflictTension * HESITATION_BRAKE)); // Hesitation brake
    }

    // 5. Chromatic Tension: Subtly alters skin pigmentation based on stress levels
    const rawHue = clamp(HUE_BASE - (threatIntensity * HUE_THREAT_DROP) + (foodAttraction * HUE_FOOD_GAIN), 0.0, 1.0);

    // 6. Vector Navigation Field Reasoning
    const reasonedDir: Vector3D = { x: 0, y: 0, z: 0 };

    // Autonomous wandering field (ALWAYS active as living baseline)
    wanderAngle += (Math.sin(inputs.timestamp * WANDER_SWAY_RATE) * WANDER_SWAY_GAIN + (random() - HALF) * WANDER_JITTER_GAIN) * (deltaTime * WANDER_FRAME_SCALE);
    const wanderWeight = clamp(1.0 - threatIntensity * WANDER_THREAT_DAMP - foodAttraction * WANDER_FOOD_DAMP, WANDER_MIN_WEIGHT, 1.0);
    reasonedDir.x += Math.cos(wanderAngle) * wanderWeight;
    reasonedDir.y += Math.sin(inputs.timestamp * WANDER_PITCH_RATE) * WANDER_PITCH_AMPLITUDE * wanderWeight;
    reasonedDir.z += Math.sin(wanderAngle) * wanderWeight;

    // Threat Evasion Vector
    if (inputs.threatActive && threatIntensity > EVASION_MIN_INTENSITY) {
      const escapeX = kinematics.position.x - inputs.threatPos.x;
      const escapeZ = kinematics.position.z - inputs.threatPos.z;
      const escapeLen = Math.sqrt(escapeX * escapeX + escapeZ * escapeZ) || 1.0;
      
      const evasionWeight = threatIntensity * EVASION_GAIN;
      reasonedDir.x += (escapeX / escapeLen) * evasionWeight;
      reasonedDir.y += (kinematics.position.y > 0 ? -EVASION_PITCH : EVASION_PITCH) * threatIntensity;
      reasonedDir.z += (escapeZ / escapeLen) * evasionWeight;
    }

    // Food Attraction Vector
    if (inputs.foodActive && inputs.foodPos && foodAttraction > FORAGE_MIN_ATTRACTION) {
      const foodX = inputs.foodPos.x - kinematics.position.x;
      const foodY = inputs.foodPos.y - kinematics.position.y;
      const foodZ = inputs.foodPos.z - kinematics.position.z;
      const foodLen = Math.sqrt(foodX * foodX + foodY * foodY + foodZ * foodZ) || 1.0;

      // Weight food approach (damped by threat)
      const effectiveFoodWeight = foodAttraction * (1.0 - threatIntensity * FOOD_THREAT_DAMP) * FOOD_GAIN;
      reasonedDir.x += (foodX / foodLen) * effectiveFoodWeight;
      reasonedDir.y += (foodY / foodLen) * effectiveFoodWeight * FOOD_PITCH_FACTOR;
      reasonedDir.z += (foodZ / foodLen) * effectiveFoodWeight;
    }

    // Normalize reasoned navigation direction
    const totalLen = Math.sqrt(
      reasonedDir.x * reasonedDir.x +
      reasonedDir.y * reasonedDir.y +
      reasonedDir.z * reasonedDir.z
    ) || 1.0;
    reasonedDir.x /= totalLen;
    reasonedDir.y /= totalLen;
    reasonedDir.z /= totalLen;

    // Safety Boundary Clamping (System 2 invariants)
    const targetSpineCurve = clamp(rawSpineCurve, FISH_SAFETY_LIMITS.MIN_SPINE_CURVE, FISH_SAFETY_LIMITS.MAX_SPINE_CURVE);
    const targetTailFreq = clamp(rawTailFreq, FISH_SAFETY_LIMITS.MIN_TAIL_FREQ, FISH_SAFETY_LIMITS.MAX_TAIL_FREQ);
    const targetFinRes = clamp(rawFinResistance, FISH_SAFETY_LIMITS.MIN_FIN_RESISTANCE, FISH_SAFETY_LIMITS.MAX_FIN_RESISTANCE);
    const targetSpeed = clamp(rawSpeed, FISH_SAFETY_LIMITS.MIN_SPEED, FISH_SAFETY_LIMITS.MAX_SPEED);

    // Continuous dynamic muscular smoothing (no snapping, zero discontinuities)
    const smoothingRate = Math.min(1.0, SMOOTHING_RATE * deltaTime);
    const directionRate = Math.min(1.0, smoothingRate * DIRECTION_SMOOTHING_BOOST);
    smoothSpeed += (targetSpeed - smoothSpeed) * smoothingRate;
    smoothTailFreq += (targetTailFreq - smoothTailFreq) * smoothingRate;
    smoothSpineCurve += (targetSpineCurve - smoothSpineCurve) * smoothingRate;
    smoothFinResistance += (targetFinRes - smoothFinResistance) * smoothingRate;
    smoothHue += (rawHue - smoothHue) * smoothingRate;
    smoothTension += (threatIntensity - smoothTension) * smoothingRate;

    smoothDirection.x += (reasonedDir.x - smoothDirection.x) * directionRate;
    smoothDirection.y += (reasonedDir.y - smoothDirection.y) * directionRate;
    smoothDirection.z += (reasonedDir.z - smoothDirection.z) * directionRate;

    const outputs: FishControlOutputs = {
      targetSpeed: smoothSpeed,
      targetDirection: smoothDirection,
      tailFrequency: smoothTailFreq,
      spineCurveAmplitude: smoothSpineCurve,
      finResistance: smoothFinResistance,
      bodyColorHue: smoothHue,
      tensionLevel: smoothTension,
    };

    const telemetry: BehaviorTelemetry = {
      caseType: BenchmarkCase.SYSTEM_2_DUAL_PROCESS,
      stateLabel: emotionalIntent,
      probabilities: {
        'Threat Evasion': threatIntensity,
        'Food Attraction': foodAttraction,
        'Internal Conflict': conflictTension,
        'Autonomous Drive': clamp(1.0 - (threatIntensity + foodAttraction) * HALF, 0.0, 1.0),
      },
      fps: 0,
      frameTimeMs: deltaTime * MS_PER_SECOND,
      threatDistance: threatDist,
      foodDistance: foodDist,
      tailFrequencyHz: smoothTailFreq,
      spineCurvature: smoothSpineCurve,
      finResistance: smoothFinResistance,
      tensionScore: smoothTension,
      isSnapping: false,
    };

    return { outputs, telemetry };
  }

  return { update };
}

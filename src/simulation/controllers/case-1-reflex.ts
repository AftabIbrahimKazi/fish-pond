/**
 * Case 1: System 0 (The Programmed Reflex).
 * Implements rigid binary threshold logic and discrete mechanical transitions.
 * Eliminates frame-jitter by locking the reflex burst vector and applying boundary avoidance.
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
import { calculateEffectiveDistance, POND_BOUNDS } from '../fish-mesh';
import { buildSeededRandom } from '../prng';

type ReflexState = 'IDLE' | 'DART' | 'APPROACH';

const REFLEX_RANDOM_SEED = 101 as const;
const THREAT_TRIGGER_DISTANCE = 7.0 as const;
const FOOD_TRIGGER_DISTANCE = 10.0 as const;
const DART_HOLD_MIN_SECONDS = 0.9 as const;
const NO_TARGET_DISTANCE = 999.0 as const;
const FULL_TURN = Math.PI * 2;
const DART_ESCAPE_PITCH = 0.2 as const;

const DART_SPEED = 7.2 as const;
const DART_TAIL_FREQ = 6.8 as const;
const DART_SPINE_CURVE = 0.88 as const;
const DART_FIN_RESISTANCE = 0.9 as const;
const DART_HUE = 0.02 as const;
const DART_TENSION = 1.0 as const;

const APPROACH_SPEED = 4.2 as const;
const APPROACH_TAIL_FREQ = 3.8 as const;
const APPROACH_SPINE_CURVE = 0.35 as const;
const APPROACH_FIN_RESISTANCE = 0.4 as const;
const APPROACH_HUE = 0.8 as const;
const APPROACH_TENSION = 0.2 as const;

const IDLE_SPEED = 2.4 as const;
const IDLE_TAIL_FREQ = 1.8 as const;
const IDLE_SPINE_CURVE = 0.16 as const;
const IDLE_FIN_RESISTANCE = 0.25 as const;
const IDLE_HUE = 0.45 as const;
const IDLE_TENSION = 0.0 as const;
const IDLE_TURN_RATE = 0.35 as const;
const IDLE_PITCH_RATE = 0.5 as const;
const IDLE_PITCH_AMPLITUDE = 0.15 as const;

const WALL_PUSH_HORIZONTAL = 2.5 as const;
const WALL_PUSH_VERTICAL = 1.5 as const;
const WALL_MARGIN_X = 2.2 as const;
const WALL_MARGIN_Z = 2.0 as const;
const WALL_MARGIN_Y = 1.2 as const;
const MS_PER_SECOND = 1000 as const;

export function createSystem0Controller(): SimulationController {
  const random = buildSeededRandom(REFLEX_RANDOM_SEED);
  let currentState: ReflexState = 'IDLE';
  let isSnappingFrame = false;
  let dartHoldTimer = 0.0;
  let idleHeadingAngle = random() * FULL_TURN;
  let lockedDartDirection: Vector3D | null = null;

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

    const previousState = currentState;

    if (dartHoldTimer > 0) {
      dartHoldTimer -= deltaTime;
    }

    // Strict Binary Logic Boundaries (Spec Rule: Case 1)
    if (inputs.threatActive && threatDist < THREAT_TRIGGER_DISTANCE) {
      currentState = 'DART';
      dartHoldTimer = DART_HOLD_MIN_SECONDS;
    } else if (dartHoldTimer > 0) {
      currentState = 'DART';
    } else if (inputs.foodActive && foodDist < FOOD_TRIGGER_DISTANCE) {
      currentState = 'APPROACH';
    } else {
      currentState = 'IDLE';
    }

    isSnappingFrame = currentState !== previousState;

    let targetSpeed: number = IDLE_SPEED;
    let tailFrequency: number = IDLE_TAIL_FREQ;
    let spineCurve: number = IDLE_SPINE_CURVE;
    let finResistance: number = IDLE_FIN_RESISTANCE;
    let bodyColorHue: number = IDLE_HUE;
    let tensionLevel: number = IDLE_TENSION;
    const targetDirection: Vector3D = { x: 0, y: 0, z: 0 };

    // Rigid values snap instantly from one preset array to another (No organic easing)
    if (currentState === 'DART') {
      targetSpeed = DART_SPEED;
      tailFrequency = DART_TAIL_FREQ;
      spineCurve = DART_SPINE_CURVE;
      finResistance = DART_FIN_RESISTANCE;
      bodyColorHue = DART_HUE;
      tensionLevel = DART_TENSION;

      // Lock escape vector upon trigger so cursor movement doesn't cause frame jitter
      if (previousState !== 'DART' || !lockedDartDirection) {
        const dx = kinematics.position.x - inputs.threatPos.x;
        const dz = kinematics.position.z - inputs.threatPos.z;
        const length = Math.sqrt(dx * dx + dz * dz) || 1.0;
        lockedDartDirection = {
          x: dx / length,
          y: kinematics.position.y > 0 ? -DART_ESCAPE_PITCH : DART_ESCAPE_PITCH,
          z: dz / length,
        };
      }

      targetDirection.x = lockedDartDirection.x;
      targetDirection.y = lockedDartDirection.y;
      targetDirection.z = lockedDartDirection.z;
    } else {
      lockedDartDirection = null;

      if (currentState === 'APPROACH' && inputs.foodPos) {
        targetSpeed = APPROACH_SPEED;
        tailFrequency = APPROACH_TAIL_FREQ;
        spineCurve = APPROACH_SPINE_CURVE;
        finResistance = APPROACH_FIN_RESISTANCE;
        bodyColorHue = APPROACH_HUE;
        tensionLevel = APPROACH_TENSION;

        // Rigid straight-line vector directly to food
        const dx = inputs.foodPos.x - kinematics.position.x;
        const dy = inputs.foodPos.y - kinematics.position.y;
        const dz = inputs.foodPos.z - kinematics.position.z;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;
        targetDirection.x = dx / length;
        targetDirection.y = dy / length;
        targetDirection.z = dz / length;
      } else {
        // Idle mechanical patrol
        targetSpeed = IDLE_SPEED;
        tailFrequency = IDLE_TAIL_FREQ;
        spineCurve = IDLE_SPINE_CURVE;
        finResistance = IDLE_FIN_RESISTANCE;
        bodyColorHue = IDLE_HUE;
        tensionLevel = IDLE_TENSION;

        idleHeadingAngle += deltaTime * IDLE_TURN_RATE;
        targetDirection.x = Math.cos(idleHeadingAngle);
        targetDirection.y = Math.sin(idleHeadingAngle * IDLE_PITCH_RATE) * IDLE_PITCH_AMPLITUDE;
        targetDirection.z = Math.sin(idleHeadingAngle);
      }
    }

    // Pond wall avoidance (steer smoothly away from boundaries to prevent wall stutter)
    if (kinematics.position.x > POND_BOUNDS.MAX_X - WALL_MARGIN_X) {
      targetDirection.x -= WALL_PUSH_HORIZONTAL;
    } else if (kinematics.position.x < POND_BOUNDS.MIN_X + WALL_MARGIN_X) {
      targetDirection.x += WALL_PUSH_HORIZONTAL;
    }
    if (kinematics.position.z > POND_BOUNDS.MAX_Z - WALL_MARGIN_Z) {
      targetDirection.z -= WALL_PUSH_HORIZONTAL;
    } else if (kinematics.position.z < POND_BOUNDS.MIN_Z + WALL_MARGIN_Z) {
      targetDirection.z += WALL_PUSH_HORIZONTAL;
    }
    if (kinematics.position.y > POND_BOUNDS.MAX_Y - WALL_MARGIN_Y) {
      targetDirection.y -= WALL_PUSH_VERTICAL;
    } else if (kinematics.position.y < POND_BOUNDS.MIN_Y + WALL_MARGIN_Y) {
      targetDirection.y += WALL_PUSH_VERTICAL;
    }

    const dirLen = Math.sqrt(
      targetDirection.x * targetDirection.x +
      targetDirection.y * targetDirection.y +
      targetDirection.z * targetDirection.z
    ) || 1.0;
    targetDirection.x /= dirLen;
    targetDirection.y /= dirLen;
    targetDirection.z /= dirLen;

    const outputs: FishControlOutputs = {
      targetSpeed,
      targetDirection,
      tailFrequency,
      spineCurveAmplitude: spineCurve,
      finResistance,
      bodyColorHue,
      tensionLevel,
    };

    const telemetry: BehaviorTelemetry = {
      caseType: BenchmarkCase.SYSTEM_0_REFLEX,
      stateLabel: currentState,
      probabilities: {
        [currentState]: 1.0,
      },
      fps: 0,
      frameTimeMs: deltaTime * MS_PER_SECOND,
      threatDistance: threatDist,
      foodDistance: foodDist,
      tailFrequencyHz: tailFrequency,
      spineCurvature: spineCurve,
      finResistance,
      tensionScore: tensionLevel,
      isSnapping: isSnappingFrame,
    };

    return { outputs, telemetry };
  }

  return { update };
}

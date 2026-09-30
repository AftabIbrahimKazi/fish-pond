/**
 * Shared Type Definitions for the Fish Pond Visual Telemetry Benchmark.
 * Follows Rule TS-TY-01 through TS-TY-05 (types and interfaces only, no runtime code).
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export enum BenchmarkCase {
  SYSTEM_0_REFLEX = 'SYSTEM_0_REFLEX',
  SYSTEM_1_LOTTERY = 'SYSTEM_1_LOTTERY',
  SYSTEM_2_DUAL_PROCESS = 'SYSTEM_2_DUAL_PROCESS',
}

export interface PondBoundsConfig {
  MIN_X: number;
  MAX_X: number;
  MIN_Y: number;
  MAX_Y: number;
  MIN_Z: number;
  MAX_Z: number;
}

export type InputMode = 'INTERACTIVE' | 'AUTOMATED_BENCHMARK';

export enum PresetKey {
  GLIDE = 'GLIDE',
  STARTLE_DART = 'STARTLE_DART',
  CURIOUS_HOVER = 'CURIOUS_HOVER',
  ANXIOUS_FREEZE = 'ANXIOUS_FREEZE',
}

export interface PresetParameters {
  speed: number;
  tailFrequency: number;
  spineCurveAmplitude: number;
  finResistance: number;
  bodyColorHue: number;
  turnResponsiveness: number;
}

export interface SimulationInputs {
  threatPos: Vector3D;
  threatActive: boolean;
  threatVelocity: number;
  foodPos: Vector3D | null;
  foodActive: boolean;
  timeElapsedConflict: number;
  foodId: number;
  timestamp: number;
}

export interface FishKinematics {
  position: Vector3D;
  velocity: Vector3D;
  headingAngle: number;
  pitchAngle: number;
  speed: number;
}

export interface FishControlOutputs {
  targetSpeed: number;
  targetDirection: Vector3D;
  tailFrequency: number;
  spineCurveAmplitude: number;
  finResistance: number;
  bodyColorHue: number;
  tensionLevel: number;
}

export interface BehaviorTelemetry {
  caseType: BenchmarkCase;
  stateLabel: string;
  probabilities: Record<string, number>;
  fps: number;
  frameTimeMs: number;
  threatDistance: number;
  foodDistance: number;
  tailFrequencyHz: number;
  spineCurvature: number;
  finResistance: number;
  tensionScore: number;
  isSnapping: boolean;
}

export interface ControllerFrame {
  outputs: FishControlOutputs;
  telemetry: BehaviorTelemetry;
}

export interface SimulationController {
  update: (
    kinematics: FishKinematics,
    inputs: SimulationInputs,
    deltaTime: number
  ) => ControllerFrame;
}

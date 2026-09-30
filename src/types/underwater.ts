import type { Vector3 } from 'three';

/**
 * Shared types for the Underwater scene (Scene 03).
 */

export enum FishSpecies {
  JIKIN = 'JIKIN',
  TOSAKIN = 'TOSAKIN',
}

export enum UnderwaterLoadState {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
}

export enum FishMode {
  CRUISE = 'CRUISE',
  SEEK_FOOD = 'SEEK_FOOD',
  FLEE = 'FLEE',
}

/** Everything that differs between species: model, size, speeds and social temperament. */
export interface SpeciesProfile {
  species: FishSpecies;
  label: string;
  url: string;
  count: number;
  targetLength: number;
  clipSpeed: number;
  cruiseSpeed: number;
  seekSpeed: number;
  fleeSpeed: number;
  maxAccel: number;
  perceptionRadius: number;
  threatRadius: number;
  preferredDepth: number;
  cohesionWeight: number;
  alignmentWeight: number;
  separationWeight: number;
  personalSpace: number;
}

/** Individual personality: multiplies the species profile so no two fish behave alike. */
export interface Temperament {
  label: string;
  boldness: number;
  greed: number;
  sociability: number;
  speedScale: number;
  wanderRate: number;
  depthOffset: number;
}

/** One fish's simulation state. Position and velocity are mutated in place every frame. */
export interface FishAgent {
  id: number;
  profile: SpeciesProfile;
  temperament: Temperament;
  position: Vector3;
  velocity: Vector3;
  fleeDirection: Vector3;
  waypoint: Vector3;
  waypointAge: number;
  dwell: number;
  entryDelay: number;
  feedPitch: number;
  heading: number;
  pitch: number;
  roll: number;
  mode: FishMode;
  satiety: number;
  panic: number;
  gulp: number;
  wanderPhase: number;
}

/** The cursor as a ray through the scene; only fish close to the ray are threatened. */
export interface CursorThreat {
  origin: Vector3;
  direction: Vector3;
}

/** A read-only snapshot of one fish for the on-screen behaviour readout. */
export interface FishTelemetry {
  id: number;
  label: string;
  temperament: string;
  mode: FishMode;
  isEntering: boolean;
  isResting: boolean;
  isEating: boolean;
  speed: number;
  depth: number;
  appetite: number;
  panic: number;
  waypointDistance: number;
}

export interface UnderwaterEngineCallbacks {
  onLoadStateChange: (state: UnderwaterLoadState) => void;
  onFishTelemetry: (fish: FishTelemetry[]) => void;
}

/** Every graphics value the settings sidebar can tune. Defaults live in `underwater-settings.ts`. */
export interface SceneSettings {
  fogColor: string;
  fogDensity: number;
  absorptionRed: number;
  absorptionGreen: number;
  absorptionBlue: number;
  exposure: number;
  sunIntensity: number;
  sunColor: string;
  hemiIntensity: number;
  hemiSkyColor: string;
  environmentIntensity: number;
  rimIntensity: number;
  rimColor: string;
  fillIntensity: number;
  fillColor: string;
  dappleAmount: number;
  dappleSpeed: number;
  causticStrength: number;
  causticScaleA: number;
  causticScaleB: number;
  causticSpeedA: number;
  causticSpeedB: number;
  causticDepthFalloff: number;
  causticColor: string;
  shaftIntensity: number;
  shaftCount: number;
  shaftWidthScale: number;
  particleCount: number;
  particleSize: number;
  particleOpacity: number;
  particleDriftSpeed: number;
  cameraFov: number;
  cameraDriftRadius: number;
  cameraDriftSpeed: number;
  cameraBobAmplitude: number;
  cameraParallaxX: number;
  cameraParallaxY: number;
  cameraParallaxDamping: number;
  bloomThreshold: number;
  bloomStrength: number;
  bloomRadius: number;
  vignetteDarkness: number;
  vignetteOffset: number;
  grainIntensity: number;
  gradeLiftR: number;
  gradeLiftG: number;
  gradeLiftB: number;
  gradeGainR: number;
  gradeGainG: number;
  gradeGainB: number;
  gradeSaturation: number;
  seagrassSwaySpeed: number;
  seagrassSwayAmplitude: number;
  fishShadowOpacity: number;
  fishShadowSize: number;
  fishShadowSpread: number;
  surfaceBrightness: number;
  domeGlowGain: number;
  seabedBump: number;
  seabedCausticGain: number;
  rockBump: number;
  rockCausticGain: number;
}

export type SettingKey = keyof SceneSettings;

export enum SettingGroup {
  WATER = 'WATER',
  LIGHT = 'LIGHT',
  CAUSTICS = 'CAUSTICS',
  SHAFTS = 'SHAFTS',
  SNOW = 'SNOW',
  CAMERA = 'CAMERA',
  POST = 'POST',
  PLANTS = 'PLANTS',
  SHADOW = 'SHADOW',
  SURFACES = 'SURFACES',
}

export enum SettingKind {
  NUMBER = 'NUMBER',
  COLOR = 'COLOR',
}

/** How a change reaches the screen: straight away, by rebuilding Triforge materials, or by rebuilding the compositor. */
export enum SettingApply {
  LIVE = 'LIVE',
  GRAPH = 'GRAPH',
  POST = 'POST',
}

export interface SettingDefinition {
  key: SettingKey;
  group: SettingGroup;
  kind: SettingKind;
  label: string;
  min: number;
  max: number;
  step: number;
  apply: SettingApply;
}

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

export interface UnderwaterEngineCallbacks {
  onLoadStateChange: (state: UnderwaterLoadState) => void;
}

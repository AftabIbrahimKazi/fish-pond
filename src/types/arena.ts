/**
 * Shared type definitions for the Cognitive Arena (System 1 vs System 1+2 test).
 * Types, interfaces and enums only, no runtime code.
 */

import { FishControlOutputs, Vector3D } from './benchmark';

export enum StimulusKind {
  SHADOW = 'SHADOW',
  TAP = 'TAP',
  FLASH = 'FLASH',
  PELLET = 'PELLET',
  ROCK = 'ROCK',
  NOVEL_FOOD = 'NOVEL_FOOD',
  LEAF = 'LEAF',
  LURE = 'LURE',
}

export enum StimulusClass {
  KNOWN_THREAT = 'KNOWN_THREAT',
  KNOWN_FOOD = 'KNOWN_FOOD',
  UNKNOWN = 'UNKNOWN',
}

export enum Valence {
  FOOD = 'FOOD',
  SAFE = 'SAFE',
  THREAT = 'THREAT',
}

export enum ArenaMode {
  IDLE = 'IDLE',
  S1_REFLEX = 'S1_REFLEX',
  S2_DELIBERATING = 'S2_DELIBERATING',
  S1_OVERRIDE = 'S1_OVERRIDE',
  LOCKOUT = 'LOCKOUT',
}

export enum AppraisalPhase {
  NOTICE = 'NOTICE',
  APPROACH = 'APPROACH',
  INSPECT = 'INSPECT',
  PROBE = 'PROBE',
  VERDICT = 'VERDICT',
}

export enum ArenaPreset {
  GLIDE = 'GLIDE',
  DART = 'DART',
  FREEZE = 'FREEZE',
  STRIKE = 'STRIKE',
  HOVER = 'HOVER',
  CAUTIOUS = 'CAUTIOUS',
  INSPECT = 'INSPECT',
  SHELTER = 'SHELTER',
}

export enum ArenaChannel {
  S1 = 'S1',
  S2 = 'S2',
  ARBITER = 'ARBITER',
  WORLD = 'WORLD',
}

export interface StimulusDefinition {
  kind: StimulusKind;
  label: string;
  hotkey: string;
  icon: string;
  stimulusClass: StimulusClass;
  trueValence: Valence;
  lifetimeSeconds: number;
  summary: string;
}

export interface StimulusInstance {
  id: number;
  kind: StimulusKind;
  position: Vector3D;
  velocity: Vector3D;
  ageSeconds: number;
  lifetimeSeconds: number;
  isResolved: boolean;
}

export interface MemoryEntry {
  kind: StimulusKind;
  familiarity: number;
  valence: number;
  remainingSeconds: number;
  spanSeconds: number;
}

export interface ArenaEvent {
  id: number;
  timeSeconds: number;
  channel: ArenaChannel;
  message: string;
}

export interface ReflexDecision {
  preset: ArenaPreset;
  direction: Vector3D;
  sourceId: number;
  label: string;
  isThreat: boolean;
  latencyMs: number;
}

export interface AppraisalStatus {
  phase: AppraisalPhase | null;
  targetId: number | null;
  targetKind: StimulusKind | null;
  progress: number;
  remainingSeconds: number;
  verdict: Valence | null;
  confidence: number;
}

export interface ArenaTelemetry {
  mode: ArenaMode;
  timeSeconds: number;
  hunger: number;
  fear: number;
  curiosity: number;
  lockoutSeconds: number;
  s1Label: string;
  s1LatencyMs: number;
  appraisal: AppraisalStatus;
  memory: MemoryEntry[];
  events: ArenaEvent[];
  stimulusCount: number;
}

export interface ArenaFrame {
  outputs: FishControlOutputs;
  telemetry: ArenaTelemetry;
  stimuli: readonly StimulusInstance[];
}

export interface ScenarioStep {
  atSeconds: number;
  kind: StimulusKind;
  position: Vector3D;
}

export interface ScenarioDefinition {
  id: string;
  label: string;
  summary: string;
  steps: ScenarioStep[];
}

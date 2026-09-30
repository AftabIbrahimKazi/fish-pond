/**
 * Shared tuning values for the Cognitive Arena simulation.
 */

import { PondBoundsConfig, Vector3D } from '../../types/benchmark';

export const ARENA_BOUNDS: PondBoundsConfig = {
  MIN_X: -16.0,
  MAX_X: 16.0,
  MIN_Y: -3.5,
  MAX_Y: 3.5,
  MIN_Z: -8.0,
  MAX_Z: 8.0,
};

export const REFUGE_POSITION: Vector3D = { x: -13.0, y: -2.6, z: -5.0 };
export const REFUGE_REACH_DISTANCE = 1.6 as const;

export const NO_TARGET_DISTANCE = 999.0 as const;
export const ARENA_SEED = 424242 as const;
export const MAX_EVENT_LOG = 8 as const;
export const FULL_TURN = Math.PI * 2;
export const HALF = 0.5 as const;
export const MS_PER_SECOND = 1000 as const;

// Fish internal state
export const HUNGER_RISE_PER_SECOND = 0.012 as const;
export const HUNGER_START = 0.45 as const;
export const HUNGER_EAT_RELIEF = 0.5 as const;
export const FEAR_DECAY_PER_SECOND = 0.3 as const;
export const FEAR_S2_BLOCK = 0.45 as const;
export const FEAR_FOOD_BLOCK = 0.35 as const;
export const FEAR_PEAK = 1.0 as const;
export const FEAR_THREAT_VERDICT = 0.5 as const;
export const HUNGER_FORAGE_THRESHOLD = 0.5 as const;
export const HUNGER_STRIKE_THRESHOLD = 0.12 as const;

// Arbitration
export const S2_LOCKOUT_SECONDS = 2.5 as const;
export const OVERRIDE_VALENCE_PENALTY = 0.35 as const;
export const OVERRIDE_FAMILIARITY_GAIN = 0.1 as const;

// Memory
export const DEFAULT_MEMORY_SPAN_SECONDS = 30 as const;
export const MIN_MEMORY_SPAN_SECONDS = 5 as const;
export const MAX_MEMORY_SPAN_SECONDS = 120 as const;
export const FAMILIARITY_GAIN_PER_VERDICT = 0.5 as const;
export const LEARNED_AVERSION_THRESHOLD = -0.3 as const;
export const FOOD_ACCEPT_VALENCE = 0.4 as const;
export const AVOID_VALENCE = -0.4 as const;
export const AVOID_DISTANCE = 6.0 as const;
export const VERDICT_VALENCE_FOOD = 0.6 as const;
export const VERDICT_VALENCE_SAFE = 0.1 as const;
export const VERDICT_VALENCE_THREAT = -0.8 as const;

// Movement
export const RESPONSE_RATE_REFLEX = 9.0 as const;
export const RESPONSE_RATE_NORMAL = 3.2 as const;
export const EAT_DISTANCE = 0.8 as const;
export const WALL_PUSH = 2.5 as const;
export const WALL_MARGIN_X = 2.4 as const;
export const WALL_MARGIN_Y = 1.2 as const;
export const WALL_MARGIN_Z = 2.0 as const;
export const WANDER_SWAY_RATE = 0.001 as const;
export const WANDER_SWAY_GAIN = 0.03 as const;
export const WANDER_JITTER_GAIN = 0.05 as const;
export const WANDER_FRAME_SCALE = 30.0 as const;
export const WANDER_PITCH_RATE = 0.0006 as const;
export const WANDER_PITCH_AMPLITUDE = 0.25 as const;
export const FORAGE_PITCH_FACTOR = 0.6 as const;

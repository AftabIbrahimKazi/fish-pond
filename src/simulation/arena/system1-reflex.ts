/**
 * System 1: instinctive, split-second reactions to KNOWN stimuli.
 * Extends the Case 2 flow (designer presets, weighted lottery). It never deliberates:
 * a known stimulus is perceived, a short reaction latency elapses, and a committed
 * reflex fires. Threat reflexes always preempt food strikes.
 */

import {
  ArenaPreset,
  ReflexDecision,
  StimulusClass,
  StimulusInstance,
  StimulusKind,
} from '../../types/arena';
import { Vector3D } from '../../types/benchmark';
import { calculateEffectiveDistance } from '../fish-mesh';
import {
  FEAR_FOOD_BLOCK,
  HUNGER_STRIKE_THRESHOLD,
  MS_PER_SECOND,
  REFUGE_POSITION,
} from './arena-constants';
import { getStimulusDefinition } from './stimulus-catalog';

export interface System1Context {
  fishPosition: Vector3D;
  stimuli: readonly StimulusInstance[];
  deltaTime: number;
  timeSeconds: number;
  fear: number;
  hunger: number;
}

export interface System1Reflex {
  updateReflex: (context: System1Context) => ReflexDecision | null;
  resetReflex: () => void;
}

interface ActiveReflex {
  decision: ReflexDecision;
  remainingSeconds: number;
  isFoodStrike: boolean;
}

interface WeightedPreset {
  preset: ArenaPreset;
  weight: number;
}

const LATENCY_MIN_SECONDS = 0.08 as const;
const LATENCY_JITTER_SECONDS = 0.04 as const;
const SHADOW_PERCEPTION_RANGE = 16.0 as const;
const PELLET_PERCEPTION_RANGE = 12.0 as const;
const GLOBAL_RANGE = 999.0 as const;
const ESCAPE_PITCH = 0.25 as const;
const STRIKE_HOLD_SECONDS = 6.0 as const;

const HOLD_SECONDS: Record<ArenaPreset, number> = {
  [ArenaPreset.DART]: 1.1,
  [ArenaPreset.FREEZE]: 1.3,
  [ArenaPreset.SHELTER]: 1.8,
  [ArenaPreset.STRIKE]: STRIKE_HOLD_SECONDS,
  [ArenaPreset.GLIDE]: 1.0,
  [ArenaPreset.HOVER]: 1.0,
  [ArenaPreset.CAUTIOUS]: 1.0,
  [ArenaPreset.INSPECT]: 1.0,
};

const THREAT_WEIGHTS: Partial<Record<StimulusKind, WeightedPreset[]>> = {
  [StimulusKind.SHADOW]: [
    { preset: ArenaPreset.DART, weight: 0.55 },
    { preset: ArenaPreset.SHELTER, weight: 0.3 },
    { preset: ArenaPreset.FREEZE, weight: 0.15 },
  ],
  [StimulusKind.TAP]: [
    { preset: ArenaPreset.FREEZE, weight: 0.6 },
    { preset: ArenaPreset.DART, weight: 0.4 },
  ],
  [StimulusKind.FLASH]: [
    { preset: ArenaPreset.DART, weight: 0.5 },
    { preset: ArenaPreset.FREEZE, weight: 0.5 },
  ],
};

function normalizeDirection(direction: Vector3D): Vector3D {
  const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z) || 1.0;
  return { x: direction.x / length, y: direction.y / length, z: direction.z / length };
}

function getPerceptionRange(kind: StimulusKind): number {
  if (kind === StimulusKind.SHADOW) return SHADOW_PERCEPTION_RANGE;
  if (kind === StimulusKind.PELLET) return PELLET_PERCEPTION_RANGE;
  return GLOBAL_RANGE;
}

export function buildSystem1Reflex(random: () => number): System1Reflex {
  const perceivedAt: Map<number, { time: number; latency: number }> = new Map();
  const handledIds: Set<number> = new Set();
  let active: ActiveReflex | null = null;

  function pickWeightedPreset(kind: StimulusKind): ArenaPreset {
    const weights = THREAT_WEIGHTS[kind] ?? [{ preset: ArenaPreset.DART, weight: 1 }];
    const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = random() * total;
    for (const entry of weights) {
      cursor -= entry.weight;
      if (cursor <= 0) return entry.preset;
    }
    return weights[weights.length - 1].preset;
  }

  function buildThreatDecision(stimulus: StimulusInstance, fishPosition: Vector3D, latency: number): ReflexDecision {
    const preset = pickWeightedPreset(stimulus.kind);
    const label = `${getStimulusDefinition(stimulus.kind).label}: ${preset.toLowerCase()}`;

    let direction: Vector3D;
    if (preset === ArenaPreset.SHELTER) {
      direction = normalizeDirection({
        x: REFUGE_POSITION.x - fishPosition.x,
        y: REFUGE_POSITION.y - fishPosition.y,
        z: REFUGE_POSITION.z - fishPosition.z,
      });
    } else {
      direction = normalizeDirection({
        x: fishPosition.x - stimulus.position.x,
        y: fishPosition.y > 0 ? -ESCAPE_PITCH : ESCAPE_PITCH,
        z: fishPosition.z - stimulus.position.z,
      });
    }

    return {
      preset,
      direction,
      sourceId: stimulus.id,
      label,
      isThreat: true,
      latencyMs: Math.round(latency * MS_PER_SECOND),
    };
  }

  function buildStrikeDecision(stimulus: StimulusInstance, fishPosition: Vector3D, latency: number): ReflexDecision {
    return {
      preset: ArenaPreset.STRIKE,
      direction: normalizeDirection({
        x: stimulus.position.x - fishPosition.x,
        y: stimulus.position.y - fishPosition.y,
        z: stimulus.position.z - fishPosition.z,
      }),
      sourceId: stimulus.id,
      label: `${getStimulusDefinition(stimulus.kind).label}: strike`,
      isThreat: false,
      latencyMs: Math.round(latency * MS_PER_SECOND),
    };
  }

  function updateActiveReflex(context: System1Context): void {
    if (!active) return;

    active.remainingSeconds -= context.deltaTime;
    if (active.isFoodStrike) {
      const target = context.stimuli.find((stimulus) => stimulus.id === active?.decision.sourceId);
      if (!target || context.fear > FEAR_FOOD_BLOCK) {
        active = null;
        return;
      }
      active.decision = buildStrikeDecision(target, context.fishPosition, active.decision.latencyMs / MS_PER_SECOND);
    }
    if (active && active.remainingSeconds <= 0) {
      active = null;
    }
  }

  function updateReflex(context: System1Context): ReflexDecision | null {
    updateActiveReflex(context);

    const liveIds = new Set(context.stimuli.map((stimulus) => stimulus.id));
    for (const id of perceivedAt.keys()) {
      if (!liveIds.has(id)) perceivedAt.delete(id);
    }

    let pendingThreat: { stimulus: StimulusInstance; latency: number } | null = null;
    let pendingFood: { stimulus: StimulusInstance; latency: number } | null = null;

    for (const stimulus of context.stimuli) {
      const definition = getStimulusDefinition(stimulus.kind);
      if (definition.stimulusClass === StimulusClass.UNKNOWN || handledIds.has(stimulus.id)) continue;

      const distance = calculateEffectiveDistance(context.fishPosition, stimulus.position);
      if (distance > getPerceptionRange(stimulus.kind)) continue;

      if (!perceivedAt.has(stimulus.id)) {
        perceivedAt.set(stimulus.id, {
          time: context.timeSeconds,
          latency: LATENCY_MIN_SECONDS + random() * LATENCY_JITTER_SECONDS,
        });
      }
      const perception = perceivedAt.get(stimulus.id);
      if (!perception || context.timeSeconds - perception.time < perception.latency) continue;

      if (definition.stimulusClass === StimulusClass.KNOWN_THREAT) {
        pendingThreat = pendingThreat ?? { stimulus, latency: perception.latency };
      } else if (
        !active
        && context.fear <= FEAR_FOOD_BLOCK
        && context.hunger > HUNGER_STRIKE_THRESHOLD
      ) {
        pendingFood = pendingFood ?? { stimulus, latency: perception.latency };
      }
    }

    if (pendingThreat) {
      handledIds.add(pendingThreat.stimulus.id);
      const decision = buildThreatDecision(pendingThreat.stimulus, context.fishPosition, pendingThreat.latency);
      active = { decision, remainingSeconds: HOLD_SECONDS[decision.preset], isFoodStrike: false };
    } else if (pendingFood && !active) {
      active = {
        decision: buildStrikeDecision(pendingFood.stimulus, context.fishPosition, pendingFood.latency),
        remainingSeconds: HOLD_SECONDS[ArenaPreset.STRIKE],
        isFoodStrike: true,
      };
    }

    return active ? active.decision : null;
  }

  function resetReflex(): void {
    perceivedAt.clear();
    handledIds.clear();
    active = null;
  }

  return { updateReflex, resetReflex };
}

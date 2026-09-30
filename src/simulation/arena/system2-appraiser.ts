/**
 * System 2: slow, deliberate appraisal of UNKNOWN stimuli (System 1+2).
 * A per-object state machine (notice, cautious approach, inspect, probe, verdict)
 * whose duration scales with novelty: unfamiliar objects take seconds, remembered
 * ones are settled almost immediately. The verdict is written to memory by the caller.
 * A System 1 reflex can abort an appraisal at any time.
 */

import {
  AppraisalPhase,
  AppraisalStatus,
  ArenaPreset,
  StimulusClass,
  StimulusInstance,
  Valence,
} from '../../types/arena';
import { Vector3D } from '../../types/benchmark';
import { FishMemory } from './fish-memory';
import { LEARNED_AVERSION_THRESHOLD, NO_TARGET_DISTANCE } from './arena-constants';
import { getStimulusDefinition } from './stimulus-catalog';

export interface System2Context {
  fishPosition: Vector3D;
  stimuli: readonly StimulusInstance[];
  deltaTime: number;
  fear: number;
}

export interface Appraisal {
  target: StimulusInstance;
  verdict: Valence;
  confidence: number;
}

export interface System2Result {
  isActive: boolean;
  preset: ArenaPreset;
  direction: Vector3D;
  label: string;
  completed: Appraisal | null;
}

export interface System2Appraiser {
  updateAppraisal: (context: System2Context) => System2Result;
  abortAppraisal: () => StimulusInstance | null;
  getStatus: () => AppraisalStatus;
  resetAppraisal: () => void;
}

interface ActiveAppraisal {
  target: StimulusInstance;
  elapsedSeconds: number;
  totalSeconds: number;
  familiarityAtStart: number;
}

const BASE_DELIBERATION_SECONDS = 4.5 as const;
const MIN_DELIBERATION_SECONDS = 0.7 as const;
const VERDICT_DISPLAY_SECONDS = 2.5 as const;
const NOTICE_END = 0.15 as const;
const APPROACH_END = 0.5 as const;
const INSPECT_END = 0.85 as const;
const APPROACH_START_RADIUS = 5.2 as const;
const APPROACH_END_RADIUS = 2.4 as const;
const APPROACH_WOBBLE_PERIOD = 1.8 as const;
const APPROACH_WOBBLE_RADIUS = 1.1 as const;
const FEAR_STANDOFF_GAIN = 2.0 as const;
const INSPECT_RADIUS = 2.0 as const;
const INSPECT_RADIAL_GAIN = 0.8 as const;
const INSPECT_CIRCLE_GAIN = 1.0 as const;
const PROBE_RADIUS = 0.55 as const;
const RADIAL_GAIN = 1.4 as const;
const VERTICAL_FACTOR = 0.6 as const;
const BASE_CONFIDENCE = 0.55 as const;
const CONFIDENCE_FAMILIARITY_GAIN = 0.4 as const;
const CONFIDENCE_PROGRESS_GAIN = 0.05 as const;
const FULL_PROGRESS = 1.0 as const;

const PHASE_PRESET: Record<AppraisalPhase, ArenaPreset> = {
  [AppraisalPhase.NOTICE]: ArenaPreset.HOVER,
  [AppraisalPhase.APPROACH]: ArenaPreset.CAUTIOUS,
  [AppraisalPhase.INSPECT]: ArenaPreset.INSPECT,
  [AppraisalPhase.PROBE]: ArenaPreset.CAUTIOUS,
  [AppraisalPhase.VERDICT]: ArenaPreset.HOVER,
};

const IDLE_STATUS: AppraisalStatus = {
  phase: null,
  targetId: null,
  targetKind: null,
  progress: 0,
  remainingSeconds: 0,
  verdict: null,
  confidence: 0,
};

function resolvePhase(progress: number): AppraisalPhase {
  if (progress < NOTICE_END) return AppraisalPhase.NOTICE;
  if (progress < APPROACH_END) return AppraisalPhase.APPROACH;
  if (progress < INSPECT_END) return AppraisalPhase.INSPECT;
  return AppraisalPhase.PROBE;
}

export function buildSystem2Appraiser(memory: FishMemory): System2Appraiser {
  let active: ActiveAppraisal | null = null;
  let lastStatus: AppraisalStatus = { ...IDLE_STATUS };
  let verdictHoldSeconds = 0;

  function isCandidate(stimulus: StimulusInstance): boolean {
    if (getStimulusDefinition(stimulus.kind).stimulusClass !== StimulusClass.UNKNOWN) return false;
    if (stimulus.isResolved && memory.getFamiliarity(stimulus.kind) <= 0) {
      stimulus.isResolved = false;
    }
    return !stimulus.isResolved;
  }

  function measureDistance(from: Vector3D, to: Vector3D): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    return Math.sqrt(dx * dx + dy * dy * VERTICAL_FACTOR + dz * dz) || 1.0;
  }

  function pickTarget(context: System2Context): StimulusInstance | null {
    let best: StimulusInstance | null = null;
    let bestDistance: number = NO_TARGET_DISTANCE;
    for (const stimulus of context.stimuli) {
      if (!isCandidate(stimulus)) continue;
      const distance = measureDistance(context.fishPosition, stimulus.position);
      if (distance < bestDistance) {
        best = stimulus;
        bestDistance = distance;
      }
    }
    return best;
  }

  function buildTotalSeconds(target: StimulusInstance): number {
    const novelty = 1 - memory.getFamiliarity(target.kind);
    return MIN_DELIBERATION_SECONDS + (BASE_DELIBERATION_SECONDS - MIN_DELIBERATION_SECONDS) * novelty;
  }

  function buildDirection(
    phase: AppraisalPhase,
    progress: number,
    context: System2Context,
    active: ActiveAppraisal
  ): Vector3D {
    const { fishPosition } = context;
    const target = active.target.position;
    const distance = measureDistance(fishPosition, target);
    const toward: Vector3D = {
      x: (target.x - fishPosition.x) / distance,
      y: ((target.y - fishPosition.y) / distance) * VERTICAL_FACTOR,
      z: (target.z - fishPosition.z) / distance,
    };
    const tangent: Vector3D = { x: -toward.z, y: 0, z: toward.x };

    let desiredRadius: number = INSPECT_RADIUS;
    if (phase === AppraisalPhase.APPROACH) {
      const approachProgress = (progress - NOTICE_END) / (APPROACH_END - NOTICE_END);
      const novelty = 1 - active.familiarityAtStart;
      const wobble = Math.sin((active.elapsedSeconds / APPROACH_WOBBLE_PERIOD) * Math.PI * 2) * APPROACH_WOBBLE_RADIUS * novelty;
      desiredRadius = APPROACH_START_RADIUS + (APPROACH_END_RADIUS - APPROACH_START_RADIUS) * approachProgress + wobble + context.fear * FEAR_STANDOFF_GAIN;
    } else if (phase === AppraisalPhase.PROBE) {
      desiredRadius = PROBE_RADIUS;
    } else if (phase === AppraisalPhase.NOTICE) {
      return { x: toward.x * 0.2, y: 0, z: toward.z * 0.2 };
    }

    const radial = (distance - desiredRadius) * (phase === AppraisalPhase.INSPECT ? INSPECT_RADIAL_GAIN : RADIAL_GAIN);
    const circle = phase === AppraisalPhase.INSPECT ? INSPECT_CIRCLE_GAIN : 0;
    return {
      x: toward.x * radial + tangent.x * circle,
      y: toward.y * radial,
      z: toward.z * radial + tangent.z * circle,
    };
  }

  function buildVerdict(target: StimulusInstance, familiarity: number, progress: number): Appraisal {
    const remembered = memory.getValence(target.kind);
    const truth = getStimulusDefinition(target.kind).trueValence;
    const verdict = remembered <= LEARNED_AVERSION_THRESHOLD ? Valence.THREAT : truth;
    const confidence = Math.min(
      FULL_PROGRESS,
      BASE_CONFIDENCE + familiarity * CONFIDENCE_FAMILIARITY_GAIN + progress * CONFIDENCE_PROGRESS_GAIN
    );
    return { target, verdict, confidence };
  }

  function updateAppraisal(context: System2Context): System2Result {
    if (verdictHoldSeconds > 0) {
      verdictHoldSeconds -= context.deltaTime;
      if (verdictHoldSeconds <= 0) lastStatus = { ...IDLE_STATUS };
    }

    if (!active) {
      const target = pickTarget(context);
      if (!target) {
        return { isActive: false, preset: ArenaPreset.GLIDE, direction: { x: 0, y: 0, z: 0 }, label: '', completed: null };
      }
      active = {
        target,
        elapsedSeconds: 0,
        totalSeconds: buildTotalSeconds(target),
        familiarityAtStart: memory.getFamiliarity(target.kind),
      };
    }

    const stillExists = context.stimuli.some((stimulus) => stimulus.id === active?.target.id);
    if (!stillExists) {
      active = null;
      lastStatus = { ...IDLE_STATUS };
      return { isActive: false, preset: ArenaPreset.GLIDE, direction: { x: 0, y: 0, z: 0 }, label: '', completed: null };
    }

    active.elapsedSeconds += context.deltaTime;
    const progress = Math.min(FULL_PROGRESS, active.elapsedSeconds / active.totalSeconds);
    const phase = resolvePhase(progress);
    const direction = buildDirection(phase, progress, context, active);

    lastStatus = {
      phase,
      targetId: active.target.id,
      targetKind: active.target.kind,
      progress,
      remainingSeconds: Math.max(0, active.totalSeconds - active.elapsedSeconds),
      verdict: null,
      confidence: 0,
    };

    if (progress >= FULL_PROGRESS) {
      const completed = buildVerdict(active.target, active.familiarityAtStart, progress);
      active.target.isResolved = true;
      lastStatus = {
        phase: AppraisalPhase.VERDICT,
        targetId: completed.target.id,
        targetKind: completed.target.kind,
        progress: FULL_PROGRESS,
        remainingSeconds: 0,
        verdict: completed.verdict,
        confidence: completed.confidence,
      };
      verdictHoldSeconds = VERDICT_DISPLAY_SECONDS;
      active = null;
      return { isActive: false, preset: ArenaPreset.HOVER, direction, label: 'Verdict reached', completed };
    }

    return {
      isActive: true,
      preset: PHASE_PRESET[phase],
      direction,
      label: `${getStimulusDefinition(active.target.kind).label}: ${phase.toLowerCase()}`,
      completed: null,
    };
  }

  function abortAppraisal(): StimulusInstance | null {
    if (!active) return null;
    const interrupted = active.target;
    interrupted.isResolved = false;
    lastStatus = { ...IDLE_STATUS };
    active = null;
    return interrupted;
  }

  function getStatus(): AppraisalStatus {
    return lastStatus;
  }

  function resetAppraisal(): void {
    active = null;
    verdictHoldSeconds = 0;
    lastStatus = { ...IDLE_STATUS };
  }

  return { updateAppraisal, abortAppraisal, getStatus, resetAppraisal };
}

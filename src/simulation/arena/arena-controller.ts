/**
 * Arena controller: wires the world, memory, System 1, System 2 and the arbiter
 * into one per-frame update that produces fish control outputs and HUD telemetry.
 */

import {
  ArenaChannel,
  ArenaEvent,
  ArenaFrame,
  ArenaMode,
  ArenaPreset,
  ArenaTelemetry,
  MemoryEntry,
  ScenarioStep,
  StimulusClass,
  StimulusInstance,
  StimulusKind,
  Valence,
} from '../../types/arena';
import { FishControlOutputs, FishKinematics, PresetParameters, Vector3D } from '../../types/benchmark';
import { buildSeededRandom } from '../prng';
import { resolveArbitration } from './arbiter';
import * as TUNING from './arena-constants';
import { ARENA_PRESETS } from './arena-presets';
import { ArenaWorld } from './arena-world';
import { FishMemory } from './fish-memory';
import { SCENARIOS } from './scenarios';
import { getStimulusDefinition } from './stimulus-catalog';
import { buildSystem1Reflex } from './system1-reflex';
import { buildSystem2Appraiser } from './system2-appraiser';

export interface ArenaController {
  updateArena: (kinematics: FishKinematics, deltaTime: number) => ArenaFrame;
  spawnStimulus: (kind: StimulusKind, position: Vector3D) => void;
  startScenario: (scenarioId: string) => void;
  setMemorySpan: (spanSeconds: number) => void;
  getMemorySpan: () => number;
  clearMemory: () => void;
  resetArena: () => void;
}

const CURIOSITY_SMOOTHING = 3.0 as const;
const MAX_UNIT = 1.0 as const;
const SATED_HUNGER = 0.05 as const;
const TENSION_SMOOTHING = 6.0 as const;

function clampUnit(value: number): number {
  return Math.max(0, Math.min(MAX_UNIT, value));
}

function distanceBetween(a: Vector3D, b: Vector3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function directionToward(from: Vector3D, to: Vector3D, verticalFactor: number): Vector3D {
  const distance = distanceBetween(from, to) || 1.0;
  return {
    x: (to.x - from.x) / distance,
    y: ((to.y - from.y) / distance) * verticalFactor,
    z: (to.z - from.z) / distance,
  };
}

export function buildArenaController(seed: number = TUNING.ARENA_SEED): ArenaController {
  const random = buildSeededRandom(seed);
  const world = new ArenaWorld(TUNING.ARENA_BOUNDS);
  const memory = new FishMemory();
  const system1 = buildSystem1Reflex(random);
  const system2 = buildSystem2Appraiser(memory);

  let timeSeconds = 0;
  let hunger: number = TUNING.HUNGER_START;
  let fear = 0;
  let curiosity = 0;
  let lockoutSeconds = 0;
  let mode: ArenaMode = ArenaMode.IDLE;
  let wanderAngle = random() * TUNING.FULL_TURN;
  let lastThreatPosition: Vector3D | null = null;
  let lastReflexSourceId = -1;
  let s1Label = 'Idle';
  let s1LatencyMs = 0;
  let eventCounter = 0;
  let events: ArenaEvent[] = [];
  let scenarioClock = 0;
  let pendingSteps: ScenarioStep[] = [];

  const currentParams: PresetParameters = { ...ARENA_PRESETS[ArenaPreset.GLIDE] };
  const currentDirection: Vector3D = { x: 0, y: 0, z: 1 };
  let currentTension = 0;

  function logEvent(channel: ArenaChannel, message: string): void {
    eventCounter += 1;
    events = [{ id: eventCounter, timeSeconds, channel, message }, ...events].slice(0, TUNING.MAX_EVENT_LOG);
  }

  function spawnStimulus(kind: StimulusKind, position: Vector3D): void {
    world.spawnStimulus(kind, position);
    logEvent(ArenaChannel.WORLD, `${getStimulusDefinition(kind).label} appeared`);
    if (getStimulusDefinition(kind).stimulusClass === StimulusClass.UNKNOWN && memory.getFamiliarity(kind) > 0) {
      logEvent(ArenaChannel.WORLD, `Fish remembers ${getStimulusDefinition(kind).label.toLowerCase()}`);
    }
  }

  function isEdible(stimulus: StimulusInstance): boolean {
    const definition = getStimulusDefinition(stimulus.kind);
    if (definition.stimulusClass === StimulusClass.KNOWN_FOOD) return true;
    return definition.stimulusClass === StimulusClass.UNKNOWN
      && definition.trueValence === Valence.FOOD
      && memory.getValence(stimulus.kind) >= TUNING.FOOD_ACCEPT_VALENCE;
  }

  function runScenarioSteps(deltaTime: number): void {
    if (pendingSteps.length === 0) return;
    scenarioClock += deltaTime;
    const due = pendingSteps.filter((step) => step.atSeconds <= scenarioClock);
    if (due.length === 0) return;
    pendingSteps = pendingSteps.filter((step) => step.atSeconds > scenarioClock);
    for (const step of due) {
      spawnStimulus(step.kind, step.position);
    }
    if (pendingSteps.length === 0) {
      logEvent(ArenaChannel.WORLD, 'Scenario finished');
    }
  }

  function tryEat(fishPosition: Vector3D): void {
    if (hunger <= SATED_HUNGER) return;
    for (const stimulus of world.getStimuli()) {
      if (!isEdible(stimulus)) continue;
      if (distanceBetween(fishPosition, stimulus.position) > TUNING.EAT_DISTANCE) continue;
      world.removeStimulus(stimulus.id);
      hunger = clampUnit(hunger - TUNING.HUNGER_EAT_RELIEF);
      logEvent(ArenaChannel.S1, `Ate ${getStimulusDefinition(stimulus.kind).label.toLowerCase()}`);
      return;
    }
  }

  function buildIdleBehaviour(kinematics: FishKinematics, deltaTime: number): { preset: ArenaPreset; direction: Vector3D } {
    const fishPosition = kinematics.position;

    // Remembered dangers repel
    for (const stimulus of world.getStimuli()) {
      if (getStimulusDefinition(stimulus.kind).stimulusClass !== StimulusClass.UNKNOWN) continue;
      if (memory.getValence(stimulus.kind) > TUNING.AVOID_VALENCE) continue;
      if (distanceBetween(fishPosition, stimulus.position) < TUNING.AVOID_DISTANCE) {
        const away = directionToward(stimulus.position, fishPosition, 1.0);
        return { preset: ArenaPreset.CAUTIOUS, direction: away };
      }
    }

    // Foraging toward accepted food
    if (hunger > TUNING.HUNGER_FORAGE_THRESHOLD || memory.getSnapshot().some((entry) => entry.valence >= TUNING.FOOD_ACCEPT_VALENCE)) {
      let nearest: StimulusInstance | null = null;
      let nearestDistance: number = TUNING.NO_TARGET_DISTANCE;
      for (const stimulus of world.getStimuli()) {
        if (!isEdible(stimulus)) continue;
        const distance = distanceBetween(fishPosition, stimulus.position);
        if (distance < nearestDistance) {
          nearest = stimulus;
          nearestDistance = distance;
        }
      }
      if (nearest) {
        return { preset: ArenaPreset.HOVER, direction: directionToward(fishPosition, nearest.position, TUNING.FORAGE_PITCH_FACTOR) };
      }
    }

    // Wander
    const timeMs = timeSeconds * TUNING.MS_PER_SECOND;
    wanderAngle += (Math.sin(timeMs * TUNING.WANDER_SWAY_RATE) * TUNING.WANDER_SWAY_GAIN + (random() - TUNING.HALF) * TUNING.WANDER_JITTER_GAIN) * (deltaTime * TUNING.WANDER_FRAME_SCALE);
    return {
      preset: ArenaPreset.GLIDE,
      direction: {
        x: Math.cos(wanderAngle),
        y: Math.sin(timeMs * TUNING.WANDER_PITCH_RATE) * TUNING.WANDER_PITCH_AMPLITUDE,
        z: Math.sin(wanderAngle),
      },
    };
  }

  function buildLockoutBehaviour(kinematics: FishKinematics, deltaTime: number): { preset: ArenaPreset; direction: Vector3D } {
    if (lastThreatPosition) {
      const away = directionToward(lastThreatPosition, kinematics.position, 0);
      return { preset: ArenaPreset.CAUTIOUS, direction: away };
    }
    return buildIdleBehaviour(kinematics, deltaTime);
  }

  function applyWallAvoidance(position: Vector3D, direction: Vector3D): void {
    const b = TUNING.ARENA_BOUNDS;
    if (position.x > b.MAX_X - TUNING.WALL_MARGIN_X) direction.x -= TUNING.WALL_PUSH;
    else if (position.x < b.MIN_X + TUNING.WALL_MARGIN_X) direction.x += TUNING.WALL_PUSH;
    if (position.z > b.MAX_Z - TUNING.WALL_MARGIN_Z) direction.z -= TUNING.WALL_PUSH;
    else if (position.z < b.MIN_Z + TUNING.WALL_MARGIN_Z) direction.z += TUNING.WALL_PUSH;
    if (position.y > b.MAX_Y - TUNING.WALL_MARGIN_Y) direction.y -= TUNING.WALL_PUSH;
    else if (position.y < b.MIN_Y + TUNING.WALL_MARGIN_Y) direction.y += TUNING.WALL_PUSH;
  }

  function buildTelemetry(): ArenaTelemetry {
    const appraisal = system2.getStatus();
    const memorySnapshot: MemoryEntry[] = memory.getSnapshot();
    return {
      mode,
      timeSeconds,
      hunger,
      fear,
      curiosity,
      lockoutSeconds: Math.max(0, lockoutSeconds),
      s1Label,
      s1LatencyMs,
      appraisal: { ...appraisal },
      memory: memorySnapshot,
      events,
      stimulusCount: world.getStimuli().length,
    };
  }

  function updateArena(kinematics: FishKinematics, deltaTime: number): ArenaFrame {
    timeSeconds += deltaTime;
    runScenarioSteps(deltaTime);
    world.updateWorld(deltaTime);

    for (const kind of memory.updateMemory(deltaTime)) {
      logEvent(ArenaChannel.S2, `Memory of ${getStimulusDefinition(kind).label.toLowerCase()} faded`);
    }

    hunger = clampUnit(hunger + TUNING.HUNGER_RISE_PER_SECOND * deltaTime);
    fear = Math.max(0, fear - TUNING.FEAR_DECAY_PER_SECOND * deltaTime);
    lockoutSeconds -= deltaTime;

    const stimuli = world.getStimuli();

    // System 1: instinct
    const reflex = system1.updateReflex({
      fishPosition: kinematics.position,
      stimuli,
      deltaTime,
      timeSeconds,
      fear,
      hunger,
    });

    const isNewReflex = reflex !== null && reflex.sourceId !== lastReflexSourceId;
    if (reflex && isNewReflex) {
      lastReflexSourceId = reflex.sourceId;
      s1Label = reflex.label;
      s1LatencyMs = reflex.latencyMs;
      logEvent(ArenaChannel.S1, `${reflex.label} (${reflex.latencyMs} ms)`);
      if (reflex.isThreat) {
        fear = TUNING.FEAR_PEAK;
        const source = stimuli.find((stimulus) => stimulus.id === reflex.sourceId);
        lastThreatPosition = source ? { ...source.position } : lastThreatPosition;
      }
    }
    if (!reflex) {
      s1Label = 'Idle';
    }

    // Arbitration: System 1 always trumps System 1+2
    const appraisalBefore = system2.getStatus();
    const isS2Running = appraisalBefore.phase !== null && appraisalBefore.verdict === null;
    const decision = resolveArbitration({
      hasReflex: reflex !== null,
      isS2Running,
      lockoutSeconds,
      fear,
    });
    mode = decision.mode;

    if (decision.shouldAbortS2) {
      const interrupted = system2.abortAppraisal();
      if (interrupted) {
        memory.adjustValence(interrupted.kind, -TUNING.OVERRIDE_VALENCE_PENALTY, TUNING.OVERRIDE_FAMILIARITY_GAIN);
        logEvent(
          ArenaChannel.ARBITER,
          `S1 OVERRIDE: dropped ${getStimulusDefinition(interrupted.kind).label.toLowerCase()} inspection, linked it with danger`
        );
      }
    }
    if (decision.shouldStartLockout && isNewReflex) {
      lockoutSeconds = TUNING.S2_LOCKOUT_SECONDS;
    }

    // Behaviour for this frame
    let preset: ArenaPreset;
    let direction: Vector3D;
    let responseRate: number = TUNING.RESPONSE_RATE_NORMAL;

    if (reflex) {
      preset = reflex.preset;
      direction = { ...reflex.direction };
      responseRate = TUNING.RESPONSE_RATE_REFLEX;
    } else if (mode === ArenaMode.LOCKOUT) {
      const behaviour = buildLockoutBehaviour(kinematics, deltaTime);
      preset = behaviour.preset;
      direction = behaviour.direction;
    } else {
      const appraisal = system2.updateAppraisal({
        fishPosition: kinematics.position,
        stimuli,
        deltaTime,
        fear,
      });
      if (appraisal.completed) {
        const { target, verdict, confidence } = appraisal.completed;
        const valence = verdict === Valence.FOOD ? TUNING.VERDICT_VALENCE_FOOD
          : verdict === Valence.THREAT ? TUNING.VERDICT_VALENCE_THREAT
          : TUNING.VERDICT_VALENCE_SAFE;
        memory.recordAppraisal(target.kind, valence, TUNING.FAMILIARITY_GAIN_PER_VERDICT);
        if (verdict === Valence.THREAT) {
          fear = Math.max(fear, TUNING.FEAR_THREAT_VERDICT);
          lastThreatPosition = { ...target.position };
        }
        logEvent(
          ArenaChannel.S2,
          `Verdict on ${getStimulusDefinition(target.kind).label.toLowerCase()}: ${verdict} (${Math.round(confidence * 100)}% sure)`
        );
      }
      if (appraisal.isActive) {
        mode = ArenaMode.S2_DELIBERATING;
        preset = appraisal.preset;
        direction = appraisal.direction;
      } else {
        mode = ArenaMode.IDLE;
        const behaviour = buildIdleBehaviour(kinematics, deltaTime);
        preset = behaviour.preset;
        direction = behaviour.direction;
      }
    }

    // Curiosity follows the novelty of whatever System 2 is looking at
    const status = system2.getStatus();
    const curiosityTarget = status.targetKind !== null && status.verdict === null
      ? 1 - memory.getFamiliarity(status.targetKind)
      : 0;
    curiosity += (curiosityTarget - curiosity) * Math.min(1, deltaTime * CURIOSITY_SMOOTHING);

    tryEat(kinematics.position);

    // Smooth towards the chosen preset (Case 2 flow) and steer
    const target = ARENA_PRESETS[preset];
    const lerpFactor = Math.min(1.0, deltaTime * responseRate);
    currentParams.speed += (target.speed - currentParams.speed) * lerpFactor;
    currentParams.tailFrequency += (target.tailFrequency - currentParams.tailFrequency) * lerpFactor;
    currentParams.spineCurveAmplitude += (target.spineCurveAmplitude - currentParams.spineCurveAmplitude) * lerpFactor;
    currentParams.finResistance += (target.finResistance - currentParams.finResistance) * lerpFactor;
    currentParams.bodyColorHue += (target.bodyColorHue - currentParams.bodyColorHue) * lerpFactor;

    const turnFactor = Math.min(1.0, lerpFactor * target.turnResponsiveness);
    applyWallAvoidance(kinematics.position, direction);
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z) || 1.0;
    currentDirection.x += (direction.x / length - currentDirection.x) * turnFactor;
    currentDirection.y += (direction.y / length - currentDirection.y) * turnFactor;
    currentDirection.z += (direction.z / length - currentDirection.z) * turnFactor;

    currentTension += (fear - currentTension) * Math.min(1, deltaTime * TENSION_SMOOTHING);

    const outputs: FishControlOutputs = {
      targetSpeed: currentParams.speed,
      targetDirection: { ...currentDirection },
      tailFrequency: currentParams.tailFrequency,
      spineCurveAmplitude: currentParams.spineCurveAmplitude,
      finResistance: currentParams.finResistance,
      bodyColorHue: currentParams.bodyColorHue,
      tensionLevel: currentTension,
    };

    return { outputs, telemetry: buildTelemetry(), stimuli: world.getStimuli() };
  }

  function startScenario(id: string): void {
    const scenario = SCENARIOS.find((entry) => entry.id === id);
    if (!scenario) return;
    scenarioClock = 0;
    pendingSteps = scenario.steps.map((step) => ({ ...step, position: { ...step.position } }));
    logEvent(ArenaChannel.WORLD, `Scenario: ${scenario.label}`);
  }

  function setMemorySpan(spanSeconds: number): void {
    memory.setSpanSeconds(spanSeconds);
  }

  function getMemorySpan(): number {
    return memory.getSpanSeconds();
  }

  function clearMemory(): void {
    memory.resetMemory();
    system2.resetAppraisal();
    logEvent(ArenaChannel.S2, 'Memory cleared');
  }

  function resetArena(): void {
    world.clearStimuli();
    memory.resetMemory();
    system1.resetReflex();
    system2.resetAppraisal();
    timeSeconds = 0;
    hunger = TUNING.HUNGER_START;
    fear = 0;
    curiosity = 0;
    lockoutSeconds = 0;
    mode = ArenaMode.IDLE;
    lastThreatPosition = null;
    lastReflexSourceId = -1;
    s1Label = 'Idle';
    s1LatencyMs = 0;
    events = [];
    pendingSteps = [];
    scenarioClock = 0;
    currentTension = 0;
  }

  return { updateArena, spawnStimulus, startScenario, setMemorySpan, getMemorySpan, clearMemory, resetArena };
}

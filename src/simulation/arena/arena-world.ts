/**
 * Arena world: owns the live stimuli, moves them and expires them.
 * Contains no fish logic; the controller reads the stimulus list each frame.
 */

import { StimulusInstance, StimulusKind } from '../../types/arena';
import { PondBoundsConfig, Vector3D } from '../../types/benchmark';
import { ARENA_BOUNDS } from './arena-constants';
import { getStimulusDefinition } from './stimulus-catalog';

const SHADOW_SPEED = 7.0 as const;
const PELLET_SINK_SPEED = 1.0 as const;
const NOVEL_FOOD_SINK_SPEED = 0.6 as const;
const LEAF_DRIFT_SPEED = 0.35 as const;
const LEAF_SURFACE_OFFSET = 0.4 as const;
const LURE_HEIGHT = 0.5 as const;
const LURE_BOB_RATE = 2.4 as const;
const LURE_BOB_AMPLITUDE = 0.6 as const;
const FLOOR_OFFSET = 0.35 as const;
const ROCK_FLOOR_OFFSET = 0.5 as const;
const SURFACE_OFFSET = 0.2 as const;
const SHADOW_SPAWN_MARGIN = 1.0 as const;
const SHADOW_EXIT_MARGIN = 4.0 as const;
const CENTER_ORIGIN = 0 as const;

export class ArenaWorld {
  private _bounds: PondBoundsConfig;
  private _stimuli: StimulusInstance[] = [];
  private _nextId = 1;

  public constructor(bounds: PondBoundsConfig = ARENA_BOUNDS) {
    this._bounds = bounds;
  }

  public getStimuli(): readonly StimulusInstance[] {
    return this._stimuli;
  }

  public spawnStimulus(kind: StimulusKind, position: Vector3D): StimulusInstance {
    const definition = getStimulusDefinition(kind);
    const spawnPosition = this._resolveSpawnPosition(kind, position);
    const stimulus: StimulusInstance = {
      id: this._nextId,
      kind,
      position: spawnPosition,
      velocity: this._resolveVelocity(kind, spawnPosition),
      ageSeconds: 0,
      lifetimeSeconds: definition.lifetimeSeconds,
      isResolved: false,
    };
    this._nextId += 1;
    this._stimuli.push(stimulus);
    return stimulus;
  }

  public removeStimulus(stimulusId: number): void {
    this._stimuli = this._stimuli.filter((stimulus) => stimulus.id !== stimulusId);
  }

  public clearStimuli(): void {
    this._stimuli = [];
  }

  public updateWorld(deltaTime: number): StimulusInstance[] {
    const expired: StimulusInstance[] = [];

    for (const stimulus of this._stimuli) {
      stimulus.ageSeconds += deltaTime;
      stimulus.position.x += stimulus.velocity.x * deltaTime;
      stimulus.position.y += stimulus.velocity.y * deltaTime;
      stimulus.position.z += stimulus.velocity.z * deltaTime;
      this._applyKindMotion(stimulus);

      const isExpired = stimulus.ageSeconds >= stimulus.lifetimeSeconds || this._isOutOfBounds(stimulus);
      if (isExpired) {
        expired.push(stimulus);
      }
    }

    if (expired.length > 0) {
      const expiredIds = new Set(expired.map((stimulus) => stimulus.id));
      this._stimuli = this._stimuli.filter((stimulus) => !expiredIds.has(stimulus.id));
    }
    return expired;
  }

  private _resolveSpawnPosition(kind: StimulusKind, requested: Vector3D): Vector3D {
    const x = this._clampAxis(requested.x, this._bounds.MIN_X, this._bounds.MAX_X);
    const z = this._clampAxis(requested.z, this._bounds.MIN_Z, this._bounds.MAX_Z);

    switch (kind) {
      case StimulusKind.SHADOW:
        return { x: x >= CENTER_ORIGIN ? this._bounds.MAX_X + SHADOW_SPAWN_MARGIN : this._bounds.MIN_X - SHADOW_SPAWN_MARGIN, y: this._bounds.MAX_Y - SURFACE_OFFSET, z };
      case StimulusKind.PELLET:
      case StimulusKind.NOVEL_FOOD:
        return { x, y: this._bounds.MAX_Y - SURFACE_OFFSET, z };
      case StimulusKind.ROCK:
        return { x, y: this._bounds.MIN_Y + ROCK_FLOOR_OFFSET, z };
      case StimulusKind.LEAF:
        return { x, y: this._bounds.MAX_Y - LEAF_SURFACE_OFFSET, z };
      case StimulusKind.LURE:
        return { x, y: LURE_HEIGHT, z };
      case StimulusKind.TAP:
        return { x, y: this._bounds.MIN_Y + ROCK_FLOOR_OFFSET, z };
      default:
        return { x: CENTER_ORIGIN, y: CENTER_ORIGIN, z: CENTER_ORIGIN };
    }
  }

  private _resolveVelocity(kind: StimulusKind, position: Vector3D): Vector3D {
    switch (kind) {
      case StimulusKind.SHADOW:
        return { x: position.x > CENTER_ORIGIN ? -SHADOW_SPEED : SHADOW_SPEED, y: 0, z: 0 };
      case StimulusKind.PELLET:
        return { x: 0, y: -PELLET_SINK_SPEED, z: 0 };
      case StimulusKind.NOVEL_FOOD:
        return { x: 0, y: -NOVEL_FOOD_SINK_SPEED, z: 0 };
      case StimulusKind.LEAF:
        return { x: LEAF_DRIFT_SPEED, y: 0, z: LEAF_DRIFT_SPEED * -0.5 };
      default:
        return { x: 0, y: 0, z: 0 };
    }
  }

  private _applyKindMotion(stimulus: StimulusInstance): void {
    const floorY = this._bounds.MIN_Y + FLOOR_OFFSET;

    if (stimulus.kind === StimulusKind.PELLET || stimulus.kind === StimulusKind.NOVEL_FOOD) {
      if (stimulus.position.y <= floorY) {
        stimulus.position.y = floorY;
        stimulus.velocity.y = 0;
      }
    }
    if (stimulus.kind === StimulusKind.LURE) {
      stimulus.position.y = LURE_HEIGHT + Math.sin(stimulus.ageSeconds * LURE_BOB_RATE) * LURE_BOB_AMPLITUDE;
    }
  }

  private _isOutOfBounds(stimulus: StimulusInstance): boolean {
    if (stimulus.kind !== StimulusKind.SHADOW) return false;
    return stimulus.position.x > this._bounds.MAX_X + SHADOW_EXIT_MARGIN || stimulus.position.x < this._bounds.MIN_X - SHADOW_EXIT_MARGIN;
  }

  private _clampAxis(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

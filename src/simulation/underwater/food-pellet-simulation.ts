/**
 * Fish-food pellet particle simulation.
 * A click drops a cluster that scatters, sinks through water with drag and a faint current,
 * settles on the sand, and is eaten (or slowly dissolves). One InstancedMesh draws them all.
 */

import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Scene,
  SphereGeometry,
  Vector3,
} from 'three';

import { buildSeededRandom } from '../prng';
import { HeightSampler } from './scene-geometry';
import {
  PELLETS_PER_DROP,
  PELLET_CAPACITY,
  PELLET_COLOR,
  PELLET_DRAG,
  PELLET_DRIFT,
  PELLET_DRIFT_SPEED,
  PELLET_DROP_SPREAD,
  PELLET_FADE_SECONDS,
  PELLET_GRAVITY,
  PELLET_JITTER,
  PELLET_RADIUS,
  PELLET_SEGMENTS,
  PELLET_SETTLED_LIFE,
  SCENERY_SEED,
} from './underwater-constants';

const HALF = 0.5 as const;
const TWO_PI = Math.PI * 2;
const INITIAL_SINK_SPEED = 0.25 as const;
const INITIAL_SCATTER_SPEED = 0.35 as const;
const EMISSIVE_STRENGTH = 0.22 as const;
const PELLET_ROUGHNESS = 0.62 as const;

enum PelletState {
  INACTIVE = 0,
  SINKING = 1,
  SETTLED = 2,
}

export class FoodPelletSimulation {
  private readonly _scene: Scene;
  private readonly _sampleHeight: HeightSampler;
  private readonly _random = buildSeededRandom(SCENERY_SEED + 1);
  private readonly _positions = new Float32Array(PELLET_CAPACITY * 3);
  private readonly _velocities = new Float32Array(PELLET_CAPACITY * 3);
  private readonly _ages = new Float32Array(PELLET_CAPACITY);
  private readonly _phases = new Float32Array(PELLET_CAPACITY);
  private readonly _states = new Uint8Array(PELLET_CAPACITY);
  private readonly _matrix = new Matrix4();
  private readonly _scale = new Vector3();
  private readonly _point = new Vector3();
  private _mesh: InstancedMesh | null = null;
  private _geometry: SphereGeometry | null = null;
  private _material: MeshStandardMaterial | null = null;
  private _elapsed = 0;

  constructor(scene: Scene, sampleHeight: HeightSampler) {
    this._scene = scene;
    this._sampleHeight = sampleHeight;
  }

  public init(): void {
    this._geometry = new SphereGeometry(PELLET_RADIUS, PELLET_SEGMENTS, PELLET_SEGMENTS);
    this._material = new MeshStandardMaterial({
      color: new Color(PELLET_COLOR),
      emissive: new Color(PELLET_COLOR),
      emissiveIntensity: EMISSIVE_STRENGTH,
      roughness: PELLET_ROUGHNESS,
    });
    this._mesh = new InstancedMesh(this._geometry, this._material, PELLET_CAPACITY);
    this._mesh.frustumCulled = false;
    this._mesh.count = 0;
    this._scene.add(this._mesh);
  }

  /** Scatters a fresh cluster of pellets around a point in the water. */
  public setDrop(x: number, y: number, z: number): void {
    for (let dropped = 0; dropped < PELLETS_PER_DROP; dropped += 1) {
      const slot = this._findFreeSlot();
      if (slot < 0) return;
      const angle = this._random() * TWO_PI;
      const radius = Math.sqrt(this._random()) * PELLET_DROP_SPREAD;
      const base = slot * 3;
      this._positions[base] = x + Math.cos(angle) * radius;
      this._positions[base + 1] = y + (this._random() - HALF) * PELLET_DROP_SPREAD;
      this._positions[base + 2] = z + Math.sin(angle) * radius;
      this._velocities[base] = Math.cos(angle) * INITIAL_SCATTER_SPEED * this._random();
      this._velocities[base + 1] = -INITIAL_SINK_SPEED * this._random();
      this._velocities[base + 2] = Math.sin(angle) * INITIAL_SCATTER_SPEED * this._random();
      this._ages[slot] = 0;
      this._phases[slot] = this._random() * TWO_PI;
      this._states[slot] = PelletState.SINKING;
      if (this._mesh && slot >= this._mesh.count) this._mesh.count = slot + 1;
    }
  }

  /** Finds the closest edible pellet within a radius; returns its slot or -1. */
  public getNearest(from: Vector3, radius: number, out: Vector3): number {
    let best = -1;
    let bestDistance = radius * radius;
    for (let slot = 0; slot < PELLET_CAPACITY; slot += 1) {
      if (this._states[slot] === PelletState.INACTIVE) continue;
      const base = slot * 3;
      const dx = this._positions[base] - from.x;
      const dy = this._positions[base + 1] - from.y;
      const dz = this._positions[base + 2] - from.z;
      const distance = dx * dx + dy * dy + dz * dz;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = slot;
      }
    }
    if (best >= 0) out.set(this._positions[best * 3], this._positions[best * 3 + 1], this._positions[best * 3 + 2]);
    return best;
  }

  public setEaten(slot: number): void {
    this._states[slot] = PelletState.INACTIVE;
    this._writeInstance(slot, 0);
  }

  public update(deltaSeconds: number): void {
    const mesh = this._mesh;
    if (!mesh) return;
    this._elapsed += deltaSeconds;
    for (let slot = 0; slot < mesh.count; slot += 1) {
      const state = this._states[slot];
      if (state === PelletState.INACTIVE) continue;
      if (state === PelletState.SINKING) this._updateSinking(slot, deltaSeconds);
      else this._updateSettled(slot, deltaSeconds);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  public destroy(): void {
    if (this._mesh) this._scene.remove(this._mesh);
    this._mesh?.dispose();
    this._geometry?.dispose();
    this._material?.dispose();
    this._mesh = null;
    this._geometry = null;
    this._material = null;
  }

  private _findFreeSlot(): number {
    for (let slot = 0; slot < PELLET_CAPACITY; slot += 1) {
      if (this._states[slot] === PelletState.INACTIVE) return slot;
    }
    return -1;
  }

  private _updateSinking(slot: number, deltaSeconds: number): void {
    const base = slot * 3;
    const phase = this._phases[slot];
    const drag = Math.max(0, 1 - PELLET_DRAG * deltaSeconds);
    this._velocities[base] = this._velocities[base] * drag
      + Math.sin(this._elapsed * PELLET_DRIFT_SPEED + phase) * PELLET_DRIFT * deltaSeconds
      + (this._random() - HALF) * PELLET_JITTER * deltaSeconds;
    this._velocities[base + 1] = this._velocities[base + 1] * drag - PELLET_GRAVITY * deltaSeconds;
    this._velocities[base + 2] = this._velocities[base + 2] * drag
      + Math.cos(this._elapsed * PELLET_DRIFT_SPEED * HALF + phase) * PELLET_DRIFT * deltaSeconds
      + (this._random() - HALF) * PELLET_JITTER * deltaSeconds;

    this._positions[base] += this._velocities[base] * deltaSeconds;
    this._positions[base + 1] += this._velocities[base + 1] * deltaSeconds;
    this._positions[base + 2] += this._velocities[base + 2] * deltaSeconds;

    const ground = this._sampleHeight(this._positions[base], this._positions[base + 2]) + PELLET_RADIUS;
    if (this._positions[base + 1] <= ground) {
      this._positions[base + 1] = ground;
      this._ages[slot] = 0;
      this._states[slot] = PelletState.SETTLED;
    }
    this._writeInstance(slot, 1);
  }

  private _updateSettled(slot: number, deltaSeconds: number): void {
    this._ages[slot] += deltaSeconds;
    const remaining = PELLET_SETTLED_LIFE - this._ages[slot];
    if (remaining <= 0) {
      this.setEaten(slot);
      return;
    }
    this._writeInstance(slot, Math.min(1, remaining / PELLET_FADE_SECONDS));
  }

  private _writeInstance(slot: number, scale: number): void {
    const mesh = this._mesh;
    if (!mesh) return;
    const base = slot * 3;
    this._scale.setScalar(scale);
    this._matrix.compose(
      this._point.set(this._positions[base], this._positions[base + 1], this._positions[base + 2]),
      mesh.quaternion,
      this._scale,
    );
    mesh.setMatrixAt(slot, this._matrix);
  }
}

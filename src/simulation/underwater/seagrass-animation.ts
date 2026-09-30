/**
 * Seagrass meadow: every blade of every patch is merged into one geometry and bent on the CPU
 * each frame, so a single draw call carries the whole swaying field.
 */

import { BufferAttribute, BufferGeometry, DynamicDrawUsage } from 'three';

import { buildSeededRandom } from '../prng';
import {
  SCENERY_SEED,
  SEAGRASS_BLADE_WIDTH,
  SEAGRASS_SEGMENTS,
  SEAGRASS_UP_NORMAL_BIAS,
  SeagrassPatch,
} from './underwater-constants';
import { HeightSampler } from './scene-geometry';

const TWO_PI = Math.PI * 2;
const VERTICES_PER_ROW = 2 as const;
const TRIANGLE_INDICES_PER_ROW = 6 as const;
const LENGTH_MIN_FACTOR = 0.55 as const;
const LENGTH_RANGE_FACTOR = 0.6 as const;
const LEAN_MAX = 0.32 as const;
const TAPER_POWER = 1.2 as const;
const TAPER_STRENGTH = 0.82 as const;
const BEND_POWER = 2 as const;
const WIND_X = 0.92 as const;
const WIND_Z = 0.38 as const;
const WIND_SPATIAL_X = 0.35 as const;
const WIND_SPATIAL_Z = 0.2 as const;
const SWAY_HARMONIC_SPEED = 1.9 as const;
const SWAY_HARMONIC_WEIGHT = 0.4 as const;
const SWAY_HARMONIC_PHASE = 1.7 as const;
const CROSS_SWAY_WEIGHT = 0.35 as const;
const BASE_SINK = 0.04 as const;

interface Blade {
  baseX: number;
  baseY: number;
  baseZ: number;
  azimuth: number;
  length: number;
  leanX: number;
  leanZ: number;
  phase: number;
}

export class SeagrassAnimation {
  private readonly _patches: readonly SeagrassPatch[];
  private readonly _sampleHeight: HeightSampler;
  private _blades: Blade[] = [];
  private _positions: Float32Array | null = null;
  private _geometry: BufferGeometry | null = null;

  constructor(patches: readonly SeagrassPatch[], sampleHeight: HeightSampler) {
    this._patches = patches;
    this._sampleHeight = sampleHeight;
  }

  public init(swaySpeed: number, swayAmplitude: number): BufferGeometry {
    const random = buildSeededRandom(SCENERY_SEED);
    this._blades = this._buildBlades(random);

    const rows = SEAGRASS_SEGMENTS + 1;
    const verticesPerBlade = rows * VERTICES_PER_ROW;
    const bladeCount = this._blades.length;
    this._positions = new Float32Array(bladeCount * verticesPerBlade * 3);
    const normals = new Float32Array(bladeCount * verticesPerBlade * 3);
    const uvs = new Float32Array(bladeCount * verticesPerBlade * 2);
    const indices = new Uint32Array(bladeCount * SEAGRASS_SEGMENTS * TRIANGLE_INDICES_PER_ROW);

    this._blades.forEach((blade, bladeIndex) => {
      const vertexStart = bladeIndex * verticesPerBlade;
      const normalX = Math.cos(blade.azimuth);
      const normalZ = Math.sin(blade.azimuth);
      const bias = SEAGRASS_UP_NORMAL_BIAS;
      const length = Math.hypot(normalX * (1 - bias), bias, normalZ * (1 - bias));
      for (let row = 0; row < rows; row += 1) {
        for (let side = 0; side < VERTICES_PER_ROW; side += 1) {
          const vertex = vertexStart + row * VERTICES_PER_ROW + side;
          normals.set([normalX * (1 - bias) / length, bias / length, normalZ * (1 - bias) / length], vertex * 3);
          uvs.set([side, row / SEAGRASS_SEGMENTS], vertex * 2);
        }
      }
      for (let row = 0; row < SEAGRASS_SEGMENTS; row += 1) {
        const lowerLeft = vertexStart + row * VERTICES_PER_ROW;
        const lowerRight = lowerLeft + 1;
        const upperLeft = lowerLeft + VERTICES_PER_ROW;
        const upperRight = upperLeft + 1;
        indices.set(
          [lowerLeft, lowerRight, upperLeft, lowerRight, upperRight, upperLeft],
          (bladeIndex * SEAGRASS_SEGMENTS + row) * TRIANGLE_INDICES_PER_ROW,
        );
      }
    });

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this._positions, 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute('normal', new BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setIndex(new BufferAttribute(indices, 1));
    this._geometry = geometry;
    this.update(0, swaySpeed, swayAmplitude);
    geometry.computeBoundingSphere();
    return geometry;
  }

  public update(timeSeconds: number, swaySpeed: number, swayAmplitude: number): void {
    const positions = this._positions;
    const geometry = this._geometry;
    if (!positions || !geometry) return;

    const rows = SEAGRASS_SEGMENTS + 1;
    this._blades.forEach((blade, bladeIndex) => {
      const wind = timeSeconds * swaySpeed + blade.phase + blade.baseX * WIND_SPATIAL_X + blade.baseZ * WIND_SPATIAL_Z;
      const primary = Math.sin(wind) + Math.sin(wind * SWAY_HARMONIC_SPEED + blade.phase * SWAY_HARMONIC_PHASE) * SWAY_HARMONIC_WEIGHT;
      const cross = Math.cos(wind * SWAY_HARMONIC_SPEED) * CROSS_SWAY_WEIGHT;
      const swayX = (WIND_X * primary - WIND_Z * cross) * swayAmplitude * blade.length;
      const swayZ = (WIND_Z * primary + WIND_X * cross) * swayAmplitude * blade.length;
      const sideX = -Math.sin(blade.azimuth);
      const sideZ = Math.cos(blade.azimuth);

      for (let row = 0; row < rows; row += 1) {
        const t = row / SEAGRASS_SEGMENTS;
        const bend = Math.pow(t, BEND_POWER);
        const halfWidth = SEAGRASS_BLADE_WIDTH * 0.5 * (1 - TAPER_STRENGTH * Math.pow(t, TAPER_POWER));
        const centreX = blade.baseX + (blade.leanX * blade.length + swayX) * bend;
        const centreY = blade.baseY - BASE_SINK + blade.length * t;
        const centreZ = blade.baseZ + (blade.leanZ * blade.length + swayZ) * bend;
        for (let side = 0; side < VERTICES_PER_ROW; side += 1) {
          const direction = side === 0 ? -1 : 1;
          const vertex = (bladeIndex * rows + row) * VERTICES_PER_ROW + side;
          positions[vertex * 3] = centreX + sideX * halfWidth * direction;
          positions[vertex * 3 + 1] = centreY;
          positions[vertex * 3 + 2] = centreZ + sideZ * halfWidth * direction;
        }
      }
    });
    geometry.attributes.position.needsUpdate = true;
  }

  public destroy(): void {
    this._geometry?.dispose();
    this._geometry = null;
    this._positions = null;
    this._blades = [];
  }

  private _buildBlades(random: () => number): Blade[] {
    const blades: Blade[] = [];
    for (const patch of this._patches) {
      for (let count = 0; count < patch.bladeCount; count += 1) {
        const angle = random() * TWO_PI;
        const distance = Math.sqrt(random()) * patch.radius;
        const baseX = patch.x + Math.cos(angle) * distance;
        const baseZ = patch.z + Math.sin(angle) * distance;
        const leanAngle = random() * TWO_PI;
        const lean = random() * LEAN_MAX;
        blades.push({
          baseX,
          baseY: this._sampleHeight(baseX, baseZ),
          baseZ,
          azimuth: random() * TWO_PI,
          length: patch.height * (LENGTH_MIN_FACTOR + random() * LENGTH_RANGE_FACTOR),
          leanX: Math.cos(leanAngle) * lean,
          leanZ: Math.sin(leanAngle) * lean,
          phase: random() * TWO_PI,
        });
      }
    }
    return blades;
  }
}

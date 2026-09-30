/**
 * CPU-built geometry for the underwater scenery: dune-sculpted seabed, noise-displaced rocks
 * and the terrain height sampler that everything is grounded on.
 */

import { BufferGeometry, IcosahedronGeometry, PlaneGeometry, Vector3 } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { buildSeededRandom } from '../prng';
import {
  BASIN_RISE_END,
  BASIN_RISE_HEIGHT,
  BASIN_RISE_START,
  DUNE_AMPLITUDE,
  DUNE_FREQUENCY,
  RIPPLE_AMPLITUDE,
  RIPPLE_FREQUENCY,
  ROCK_DETAIL_AMPLITUDE,
  ROCK_DETAIL_SCALE,
  ROCK_NOISE_AMPLITUDE,
  ROCK_NOISE_SCALE,
  ROCK_SEGMENTS,
  RockPlacement,
  SEABED_SEGMENTS,
  SEABED_SIZE,
  SCENERY_SEED,
} from './underwater-constants';
import { buildFractalNoise2D, buildFractalNoise3D } from './underwater-noise';

const DUNE_OCTAVES = 3 as const;
const RIPPLE_OCTAVES = 2 as const;
const RIPPLE_SEED_OFFSET = 101 as const;
const ROCK_OCTAVES = 4 as const;
const ROCK_NOISE_OFFSET = 7.3 as const;
const ROCK_FLATTEN_START = -0.25 as const;
const ROCK_FLATTEN_STRENGTH = 0.55 as const;
const ROCK_MERGE_TOLERANCE = 1e-4 as const;
const QUARTER_TURN = Math.PI / 2;

export type HeightSampler = (x: number, z: number) => number;

function getSmoothRange(value: number, start: number, end: number): number {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

/** Seabed elevation at a world position: dunes, fine ripples and a rising basin rim. */
export function buildTerrainSampler(): HeightSampler {
  const dunes = buildFractalNoise2D(SCENERY_SEED, DUNE_OCTAVES);
  const ripples = buildFractalNoise2D(SCENERY_SEED + RIPPLE_SEED_OFFSET, RIPPLE_OCTAVES);
  return (x: number, z: number): number => {
    const radius = Math.hypot(x, z);
    const rim = getSmoothRange(radius, BASIN_RISE_START, BASIN_RISE_END) * BASIN_RISE_HEIGHT;
    return dunes(x * DUNE_FREQUENCY, z * DUNE_FREQUENCY) * DUNE_AMPLITUDE
      + ripples(x * RIPPLE_FREQUENCY, z * RIPPLE_FREQUENCY) * RIPPLE_AMPLITUDE
      + rim;
  };
}

export function buildSeabedGeometry(sampleHeight: HeightSampler): BufferGeometry {
  const geometry = new PlaneGeometry(SEABED_SIZE, SEABED_SIZE, SEABED_SEGMENTS, SEABED_SEGMENTS);
  geometry.rotateX(-QUARTER_TURN);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    positions.setY(index, sampleHeight(positions.getX(index), positions.getZ(index)));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A boulder: a subdivided icosphere pushed around by 3D noise, flattened on its underside. */
export function buildRockGeometry(placement: RockPlacement): BufferGeometry {
  const noise = buildFractalNoise3D(SCENERY_SEED + placement.seed, ROCK_OCTAVES);
  const random = buildSeededRandom(placement.seed);
  const offset = new Vector3(random(), random(), random()).multiplyScalar(ROCK_NOISE_OFFSET);
  const source = new IcosahedronGeometry(1, ROCK_SEGMENTS);
  source.deleteAttribute('normal');
  source.deleteAttribute('uv');
  const geometry = mergeVertices(source, ROCK_MERGE_TOLERANCE);
  source.dispose();

  const positions = geometry.attributes.position;
  const direction = new Vector3();
  for (let index = 0; index < positions.count; index += 1) {
    direction.fromBufferAttribute(positions, index).normalize();
    const shape = noise(
      direction.x * ROCK_NOISE_SCALE * 2 + offset.x,
      direction.y * ROCK_NOISE_SCALE * 2 + offset.y,
      direction.z * ROCK_NOISE_SCALE * 2 + offset.z,
    );
    const crags = noise(
      direction.x * ROCK_DETAIL_SCALE + offset.z,
      direction.y * ROCK_DETAIL_SCALE + offset.x,
      direction.z * ROCK_DETAIL_SCALE + offset.y,
    );
    const bulge = 1 + shape * ROCK_NOISE_AMPLITUDE + crags * ROCK_DETAIL_AMPLITUDE;
    const flatten = direction.y < ROCK_FLATTEN_START
      ? 1 - (ROCK_FLATTEN_START - direction.y) * ROCK_FLATTEN_STRENGTH
      : 1;
    positions.setXYZ(
      index,
      direction.x * bulge * placement.radius,
      direction.y * bulge * flatten * placement.radius * placement.squash,
      direction.z * bulge * placement.radius,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

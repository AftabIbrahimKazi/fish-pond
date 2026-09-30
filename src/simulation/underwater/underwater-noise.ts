/**
 * Deterministic value noise used to sculpt the seabed and rocks on the CPU.
 * Pure functions only: the same seed always produces the same terrain.
 */

const HASH_X = 374761393 as const;
const HASH_Y = 668265263 as const;
const HASH_Z = 2147483647 as const;
const HASH_MIX = 1274126177 as const;
const HASH_SHIFT = 13 as const;
const UINT32_RANGE = 4294967296 as const;
const FBM_LACUNARITY = 2 as const;
const FBM_GAIN = 0.5 as const;
const SMOOTH_A = 3 as const;
const SMOOTH_B = 2 as const;
const SIGNED_SCALE = 2 as const;

export type NoiseSampler2D = (x: number, z: number) => number;
export type NoiseSampler3D = (x: number, y: number, z: number) => number;

function getLatticeHash(seed: number, ix: number, iy: number, iz: number): number {
  let hash = Math.imul(ix, HASH_X) ^ Math.imul(iy, HASH_Y) ^ Math.imul(iz, HASH_Z) ^ Math.imul(seed, HASH_MIX);
  hash = Math.imul(hash ^ (hash >>> HASH_SHIFT), HASH_MIX);
  hash ^= hash >>> HASH_SHIFT;
  return (hash >>> 0) / UINT32_RANGE;
}

function getSmoothStep(value: number): number {
  return value * value * (SMOOTH_A - SMOOTH_B * value);
}

function getMix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

/** Single-octave value noise in the range [-1, 1]. */
export function buildValueNoise3D(seed: number): NoiseSampler3D {
  return (x: number, y: number, z: number): number => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const fx = getSmoothStep(x - ix);
    const fy = getSmoothStep(y - iy);
    const fz = getSmoothStep(z - iz);

    const corner = (dx: number, dy: number, dz: number): number => getLatticeHash(seed, ix + dx, iy + dy, iz + dz);
    const lowerZ = getMix(getMix(corner(0, 0, 0), corner(1, 0, 0), fx), getMix(corner(0, 1, 0), corner(1, 1, 0), fx), fy);
    const upperZ = getMix(getMix(corner(0, 0, 1), corner(1, 0, 1), fx), getMix(corner(0, 1, 1), corner(1, 1, 1), fx), fy);
    return getMix(lowerZ, upperZ, fz) * SIGNED_SCALE - 1;
  };
}

/** Fractal sum of value noise, normalised back into [-1, 1]. */
export function buildFractalNoise2D(seed: number, octaves: number): NoiseSampler2D {
  const base = buildValueNoise3D(seed);
  return (x: number, z: number): number => {
    let sum = 0;
    let amplitude = 1;
    let frequency = 1;
    let total = 0;
    for (let octave = 0; octave < octaves; octave += 1) {
      sum += base(x * frequency, octave * FBM_LACUNARITY, z * frequency) * amplitude;
      total += amplitude;
      amplitude *= FBM_GAIN;
      frequency *= FBM_LACUNARITY;
    }
    return sum / total;
  };
}

export function buildFractalNoise3D(seed: number, octaves: number): NoiseSampler3D {
  const base = buildValueNoise3D(seed);
  return (x: number, y: number, z: number): number => {
    let sum = 0;
    let amplitude = 1;
    let frequency = 1;
    let total = 0;
    for (let octave = 0; octave < octaves; octave += 1) {
      sum += base(x * frequency, y * frequency, z * frequency) * amplitude;
      total += amplitude;
      amplitude *= FBM_GAIN;
      frequency *= FBM_LACUNARITY;
    }
    return sum / total;
  };
}

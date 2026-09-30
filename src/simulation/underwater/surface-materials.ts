/**
 * Triforge node-graph materials for solid scenery: sand, rock and seagrass.
 * Each graph is albedo -> Principled BSDF -> caustic light -> water column -> display decode.
 */

import {
  Bump,
  ColorRamp,
  Emission,
  Geometry,
  MaterialOutput,
  NoiseTexture,
  PrincipledBSDF,
  ShaderToRGB,
  TextureCoordinate,
} from '@triforge/shader-core';
import type { OutputSocket } from '@triforge/shader-core';
import { DoubleSide, ShaderMaterial } from 'three';

import { SceneSettings } from '../../types/underwater';
import {
  TriforgeClock,
  buildCausticLight,
  buildChannel,
  buildDisplayToLinear,
  buildGreyColor,
  buildMath,
  buildMix,
  buildRange,
  buildWaterColumn,
  finaliseMaterial,
} from './triforge-graph';

const NEUTRAL_FAC = 1 as const;
const NOISE_LOW = 0.3 as const;
const NOISE_HIGH = 0.7 as const;
const GRAIN_DETAIL = 3 as const;
const MACRO_ROUGHNESS = 0.55 as const;
const GRAIN_ROUGHNESS = 0.6 as const;
const SAND_IOR = 1.4 as const;
const BUMP_DISTANCE = 0.05 as const;
const MOSS_NORMAL_MIN = 0.6 as const;
const MOSS_NORMAL_MAX = 0.95 as const;
const MOSS_NOISE_SCALE = 1.7 as const;
const MOSS_COVERAGE_LOW = 0.35 as const;
const MOSS_COVERAGE_HIGH = 0.62 as const;
const BLADE_IOR = 1.35 as const;
const BLADE_ROUGHNESS = 0.55 as const;
const BLADE_GLOW = 0.16 as const;

interface SurfaceMaterialConfig {
  palette: string[];
  macroScale: number;
  macroDetail: number;
  grainScale: number;
  grainAmount: number;
  bumpStrength: number;
  roughness: number;
  causticGain: number;
  mossColor: string | null;
}

export const SEABED_CONFIG: SurfaceMaterialConfig = {
  palette: ['#75664a', '#a08c62', '#c7b283', '#e4d3a2'],
  macroScale: 0.16,
  macroDetail: 4,
  grainScale: 34,
  grainAmount: 0.55,
  bumpStrength: 0.85,
  roughness: 0.94,
  causticGain: 1,
  mossColor: null,
};

export const ROCK_CONFIG: SurfaceMaterialConfig = {
  palette: ['#2e3a39', '#55605a', '#8b8f80', '#bdb8a2'],
  macroScale: 1.1,
  macroDetail: 5,
  grainScale: 11,
  grainAmount: 0.75,
  bumpStrength: 2.2,
  roughness: 0.86,
  causticGain: 0.9,
  mossColor: '#3f6a34',
};

function buildAlbedo(geometry: Geometry, config: SurfaceMaterialConfig): { albedo: OutputSocket; grain: OutputSocket } {
  const position = geometry.output('Position');
  const macro = new NoiseTexture({
    vector: position,
    scale: config.macroScale,
    detail: config.macroDetail,
    roughness: MACRO_ROUGHNESS,
  }).output('Fac');
  const ramp = new ColorRamp({ fac: buildRange(macro, NOISE_LOW, NOISE_HIGH), stops: config.palette }).output('Color');
  const grain = new NoiseTexture({
    vector: position,
    scale: config.grainScale,
    detail: GRAIN_DETAIL,
    roughness: GRAIN_ROUGHNESS,
  }).output('Fac');
  const grained = buildMix('OVERLAY', config.grainAmount, ramp, buildGreyColor(grain));

  if (config.mossColor === null) return { albedo: grained, grain };

  const facingUp = buildRange(buildChannel(geometry.output('Normal'), 'G'), MOSS_NORMAL_MIN, MOSS_NORMAL_MAX);
  const patches = buildRange(
    new NoiseTexture({ vector: position, scale: MOSS_NOISE_SCALE, detail: 3, roughness: MACRO_ROUGHNESS }).output('Fac'),
    MOSS_COVERAGE_LOW,
    MOSS_COVERAGE_HIGH,
  );
  const mossMask = buildMath('MULTIPLY', facingUp, patches);
  return { albedo: buildMix('MIX', mossMask, grained, config.mossColor), grain };
}

function buildLitSurface(
  albedo: OutputSocket,
  bsdf: OutputSocket,
  geometry: Geometry,
  causticGain: number,
  settings: SceneSettings,
): OutputSocket {
  const shaded = new ShaderToRGB({ shader: bsdf }).output('Color');
  const causticTint = buildMix('MULTIPLY', NEUTRAL_FAC, albedo, buildCausticLight(geometry, settings));
  return buildMix('ADD', causticGain, shaded, causticTint);
}

function buildFinishedOutput(lit: OutputSocket, settings: SceneSettings): MaterialOutput {
  const display = buildDisplayToLinear(buildWaterColumn(lit, settings));
  return new MaterialOutput({ surface: new Emission({ color: display }).output('BSDF') });
}

export function buildSurfaceMaterial(config: SurfaceMaterialConfig, clock: TriforgeClock, settings: SceneSettings): ShaderMaterial {
  const geometry = new Geometry();
  const { albedo, grain } = buildAlbedo(geometry, config);
  const normal = new Bump({ height: grain, strength: config.bumpStrength, distance: BUMP_DISTANCE }).output('Normal');
  const bsdf = new PrincipledBSDF({ baseColor: albedo, roughness: config.roughness, ior: SAND_IOR, normal }).output('BSDF');
  return finaliseMaterial(buildFinishedOutput(buildLitSurface(albedo, bsdf, geometry, config.causticGain, settings), settings), clock);
}

/** Seagrass: dark rooted base to sun-bright tip, with a little transmitted glow on the blade. */
export function buildFoliageMaterial(clock: TriforgeClock, settings: SceneSettings): ShaderMaterial {
  const geometry = new Geometry();
  const uv = new TextureCoordinate().output('UV');
  const height = buildChannel(uv, 'G');
  const albedo = new ColorRamp({ fac: height, stops: ['#0d2a1a', '#1f5b2c', '#4f8f36', '#a4b84a'] }).output('Color');
  const bsdf = new PrincipledBSDF({ baseColor: albedo, roughness: BLADE_ROUGHNESS, ior: BLADE_IOR }).output('BSDF');
  const shaded = new ShaderToRGB({ shader: bsdf }).output('Color');
  const glow = buildMix('MULTIPLY', NEUTRAL_FAC, albedo, buildGreyColor(buildMath('MULTIPLY', height, BLADE_GLOW)));
  const causticTint = buildMix('MULTIPLY', NEUTRAL_FAC, albedo, buildCausticLight(geometry, settings));
  const lit = buildMix('ADD', NEUTRAL_FAC, buildMix('ADD', NEUTRAL_FAC, shaded, causticTint), glow);
  const material = finaliseMaterial(buildFinishedOutput(lit, settings), clock);
  material.side = DoubleSide;
  return material;
}

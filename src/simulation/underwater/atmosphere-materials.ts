/**
 * Triforge node-graph materials for the water volume itself: the backdrop dome, the rippled
 * surface seen from below, volumetric light shafts and the soft contact shadow under each fish.
 */

import {
  AnimatedNoiseTexture,
  CameraData,
  ColorRamp,
  Emission,
  Geometry,
  MaterialOutput,
  MixShader,
  RGB,
  TextureCoordinate,
  TransparentBSDF,
  VectorMath,
} from '@triforge/shader-core';
import type { OutputSocket } from '@triforge/shader-core';
import { AdditiveBlending, BackSide, DoubleSide, ShaderMaterial } from 'three';

import {
  TriforgeClock,
  buildChannel,
  buildDisplayToLinear,
  buildGreyColor,
  buildMath,
  buildMix,
  buildRange,
  buildWaterColumn,
  finaliseMaterial,
} from './triforge-graph';
import {
  FOG_COLOR,
  FISH_SHADOW_OPACITY,
  SHAFT_INTENSITY,
  SUN_DIRECTION,
} from './underwater-constants';

const NEUTRAL_FAC = 1 as const;
const HALF = 0.5 as const;
const DOUBLE = 2 as const;

/* Dome */
const DOME_ELEVATION_MIN = -0.5 as const;
const DOME_ELEVATION_MAX = 0.74 as const;
const DOME_STOPS: string[] = ['#02141c', '#05343f', FOG_COLOR, '#2a9bad', '#8adbe4'];
const SUN_GLOW_COLOR = '#9fe8ef' as const;
const SUN_GLOW_MIN = 0.55 as const;
const SUN_GLOW_MAX = 1 as const;
const SUN_GLOW_POWER = 2.4 as const;
const SUN_GLOW_GAIN = 0.55 as const;

/* Water surface */
const SWELL_SCALE = 210 as const;
const SWELL_SPEED = 22 as const;
const RIPPLE_SCALE = 520 as const;
const RIPPLE_SPEED = 40 as const;
const SWELL_TILT = 3.2 as const;
const RIPPLE_TILT = 1.4 as const;
const WINDOW_COS_MIN = 0.5 as const;
const WINDOW_COS_MAX = 0.84 as const;
const WINDOW_COLOR = '#a6ebf2' as const;
const WINDOW_BASE_BRIGHTNESS = 0.7 as const;
const WINDOW_SWELL_BRIGHTNESS = 1.1 as const;
const MIRROR_DARK = '#0d4457' as const;
const MIRROR_LIGHT = '#1f7a8c' as const;
const SURFACE_EMISSION = 1.15 as const;
const NOISE_LOW = 0.42 as const;
const NOISE_HIGH = 0.58 as const;

/* Light shafts */
const SHAFT_COLOR = '#b6f3f0' as const;
const SHAFT_STREAK_SCALE_A = 420 as const;
const SHAFT_STREAK_SPEED_A = 12 as const;
const SHAFT_STREAK_SCALE_B = 760 as const;
const SHAFT_STREAK_SPEED_B = 16 as const;
const SHAFT_STREAK_LOW = 0.44 as const;
const SHAFT_STREAK_HIGH = 0.55 as const;
const SHAFT_STREAK_FLOOR = 0.06 as const;
const SHAFT_EDGE_POWER = 1.4 as const;
const SHAFT_LENGTH_POWER = 1.3 as const;
const SHAFT_TOP_FADE_START = 0.9 as const;
const SHAFT_NEAR_FADE_MIN = 1.2 as const;
const SHAFT_NEAR_FADE_MAX = 5.5 as const;

/* Fish shadow */
const SHADOW_OFFSET_FACTOR = -2 as const;

function buildEmissive(color: OutputSocket, strength: number = NEUTRAL_FAC): MaterialOutput {
  return new MaterialOutput({ surface: new Emission({ color, strength }).output('BSDF') });
}

/** Vertical gradient from abyss to the bright surface, matching the fog colour at the horizon. */
export function buildDomeMaterial(clock: TriforgeClock): ShaderMaterial {
  const incoming = new Geometry().output('Incoming');
  const elevation = buildRange(buildChannel(incoming, 'G'), DOME_ELEVATION_MIN, DOME_ELEVATION_MAX);
  const gradient = new ColorRamp({ fac: elevation, stops: DOME_STOPS }).output('Color');

  const towardSun = new VectorMath({ mode: 'DOT_PRODUCT', vector: incoming, vectorB: [...SUN_DIRECTION] }).output('Value');
  const glowMask = buildMath('POWER', buildRange(towardSun, SUN_GLOW_MIN, SUN_GLOW_MAX), SUN_GLOW_POWER);
  const glow = buildMix('MULTIPLY', NEUTRAL_FAC, SUN_GLOW_COLOR, buildGreyColor(buildMath('MULTIPLY', glowMask, SUN_GLOW_GAIN)));

  const material = finaliseMaterial(buildEmissive(buildDisplayToLinear(buildMix('ADD', NEUTRAL_FAC, gradient, glow))), clock);
  material.side = BackSide;
  material.depthWrite = false;
  return material;
}

/** The mirror ceiling: a bright Snell's window straight up, total internal reflection beyond it. */
export function buildWaterSurfaceMaterial(clock: TriforgeClock): ShaderMaterial {
  const geometry = new Geometry();
  const position = geometry.output('Position');
  const swell = new AnimatedNoiseTexture({ vector: position, scale: SWELL_SCALE, speed: SWELL_SPEED, detail: 1 }).output('Fac');
  const ripples = new AnimatedNoiseTexture({ vector: position, scale: RIPPLE_SCALE, speed: RIPPLE_SPEED, detail: 1 }).output('Fac');
  const tilt = buildMath(
    'ADD',
    buildMath('MULTIPLY', buildMath('SUBTRACT', swell, HALF), SWELL_TILT),
    buildMath('MULTIPLY', buildMath('SUBTRACT', ripples, HALF), RIPPLE_TILT),
  );
  const vertical = buildMath('ABSOLUTE', buildChannel(geometry.output('Incoming'), 'G'));
  const windowMask = buildRange(buildMath('ADD', vertical, tilt), WINDOW_COS_MIN, WINDOW_COS_MAX);

  const glitter = buildMath('ADD', WINDOW_BASE_BRIGHTNESS, buildMath('MULTIPLY', buildMath('SUBTRACT', swell, HALF), WINDOW_SWELL_BRIGHTNESS));
  const brightWindow = buildMix('MULTIPLY', NEUTRAL_FAC, WINDOW_COLOR, buildGreyColor(glitter));
  const mirror = buildMix('MIX', buildRange(swell, NOISE_LOW, NOISE_HIGH), MIRROR_DARK, MIRROR_LIGHT);
  const surface = buildMix('MIX', windowMask, mirror, brightWindow);

  const material = finaliseMaterial(buildEmissive(buildDisplayToLinear(buildWaterColumn(surface)), SURFACE_EMISSION), clock);
  material.side = DoubleSide;
  return material;
}

/** God-ray shaft: streaked noise along its width, brightest at the surface end, additive. */
export function buildLightShaftMaterial(clock: TriforgeClock): ShaderMaterial {
  const position = new Geometry().output('Position');
  const uv = new TextureCoordinate().output('UV');
  const across = buildChannel(uv, 'R');
  const along = buildChannel(uv, 'G');

  const edge = buildMath('POWER', buildMath('SINE', buildMath('MULTIPLY', across, Math.PI)), SHAFT_EDGE_POWER);
  const topFade = buildMath('SUBTRACT', NEUTRAL_FAC, buildRange(along, SHAFT_TOP_FADE_START, NEUTRAL_FAC));
  const lengthFade = buildMath('MULTIPLY', buildMath('POWER', along, SHAFT_LENGTH_POWER), topFade);
  const streakA = new AnimatedNoiseTexture({ vector: position, scale: SHAFT_STREAK_SCALE_A, speed: SHAFT_STREAK_SPEED_A, detail: 1 }).output('Fac');
  const streakB = new AnimatedNoiseTexture({ vector: position, scale: SHAFT_STREAK_SCALE_B, speed: SHAFT_STREAK_SPEED_B, detail: 1 }).output('Fac');
  const streaks = buildRange(buildMath('MULTIPLY', buildMath('ADD', streakA, streakB), HALF), SHAFT_STREAK_LOW, SHAFT_STREAK_HIGH);
  const streakGain = buildMath('ADD', SHAFT_STREAK_FLOOR, buildMath('MULTIPLY', streaks, NEUTRAL_FAC - SHAFT_STREAK_FLOOR));
  const nearFade = buildRange(new CameraData().output('ViewDistance'), SHAFT_NEAR_FADE_MIN, SHAFT_NEAR_FADE_MAX);

  const alpha = buildMath(
    'MULTIPLY',
    buildMath('MULTIPLY', buildMath('MULTIPLY', edge, lengthFade), buildMath('MULTIPLY', streakGain, nearFade)),
    SHAFT_INTENSITY,
  );
  const glow = new Emission({ color: buildDisplayToLinear(new RGB(SHAFT_COLOR).output('Color')) }).output('BSDF');
  const surface = new MixShader({ fac: alpha, shader1: new TransparentBSDF().output('BSDF'), shader2: glow }).output('BSDF');

  const material = finaliseMaterial(new MaterialOutput({ surface }), clock);
  material.side = DoubleSide;
  material.blending = AdditiveBlending;
  material.depthWrite = false;
  return material;
}

/** Soft radial contact shadow: black, alpha falls off from the centre of a unit quad. */
export function buildFishShadowMaterial(clock: TriforgeClock): ShaderMaterial {
  const uv = new TextureCoordinate().output('UV');
  const offsetU = buildMath('SUBTRACT', buildChannel(uv, 'R'), HALF);
  const offsetV = buildMath('SUBTRACT', buildChannel(uv, 'G'), HALF);
  const radius = buildMath(
    'MULTIPLY',
    buildMath('SQRT', buildMath('ADD', buildMath('MULTIPLY', offsetU, offsetU), buildMath('MULTIPLY', offsetV, offsetV))),
    DOUBLE,
  );
  const density = buildMath('SUBTRACT', NEUTRAL_FAC, buildRange(radius, 0, NEUTRAL_FAC));
  const alpha = buildMath('MULTIPLY', density, FISH_SHADOW_OPACITY);
  const dark = new Emission({ color: new RGB('#010b10').output('Color') }).output('BSDF');
  const surface = new MixShader({ fac: alpha, shader1: new TransparentBSDF().output('BSDF'), shader2: dark }).output('BSDF');

  const material = finaliseMaterial(new MaterialOutput({ surface }), clock);
  material.depthWrite = false;
  material.polygonOffset = true;
  material.polygonOffsetFactor = SHADOW_OFFSET_FACTOR;
  return material;
}

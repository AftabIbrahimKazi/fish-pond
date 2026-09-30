/**
 * Reusable Triforge shader-core node-graph fragments shared by every underwater material.
 * All shading is expressed as Triforge nodes; no hand-written GLSL lives in this project.
 */

import {
  AnimatedNoiseTexture,
  CameraData,
  CombineRGB,
  Gamma,
  Geometry,
  MapRange,
  MixRGB,
  SeparateRGB,
  ShaderMath,
} from '@triforge/shader-core';
import type { MaterialOutput, MathMode, OutputSocket } from '@triforge/shader-core';
import { ShaderMaterial, Vector3 } from 'three';

import {
  ABSORPTION_BLUE,
  ABSORPTION_GREEN,
  ABSORPTION_RED,
  CAUSTIC_COLOR,
  CAUSTIC_DEPTH_FALLOFF,
  CAUSTIC_SCALE_A,
  CAUSTIC_SCALE_B,
  CAUSTIC_SPEED_A,
  CAUSTIC_SPEED_B,
  CAUSTIC_STRENGTH,
  DISPLAY_GAMMA,
  FOG_COLOR,
  SUN_DIRECTION,
  SURFACE_Y,
  TRIFORGE_AMBIENT_COLOR,
  TRIFORGE_SUN_COLOR,
} from './underwater-constants';

const WHITE = '#ffffff' as const;
const RIDGE_GAIN = 13 as const;
const RIDGE_POWER = 3 as const;
const NOISE_CENTRE = 0.5 as const;
const NOISE_DETAIL = 1 as const;
const NOISE_ROUGHNESS = 0.5 as const;
const NEUTRAL_FAC = 1 as const;
const SMOOTH_A = 3 as const;
const SMOOTH_B = 2 as const;
const MOSTLY_UPRIGHT_MIN = 0.35 as const;
const MOSTLY_UPRIGHT_MAX = 0.9 as const;
const FRAGMENT_PRECISION_FROM = 'precision mediump float;' as const;
const FRAGMENT_PRECISION_TO = 'precision highp float;' as const;

/** Uniform object shared by every material so one write animates all Triforge time nodes. */
export interface TriforgeClock {
  time: { value: number };
}

export function buildClock(): TriforgeClock {
  return { time: { value: 0 } };
}

export function buildMath(
  mode: MathMode,
  a: OutputSocket | number,
  b: OutputSocket | number = 0,
): OutputSocket {
  return new ShaderMath({ mode, a, b }).output('Value');
}

/**
 * Smoothstep remap built from Math nodes. Triforge's own SMOOTHSTEP map-range mode applies the
 * polynomial before clamping, which folds values outside the range back to zero.
 */
export function buildRange(
  value: OutputSocket,
  fromMin: number,
  fromMax: number,
): OutputSocket {
  const linear = new MapRange({ value, fromMin, fromMax, toMin: 0, toMax: 1, mode: 'LINEAR', clamp: true }).output('Result');
  const squared = buildMath('MULTIPLY', linear, linear);
  const easing = buildMath('SUBTRACT', SMOOTH_A, buildMath('MULTIPLY', linear, SMOOTH_B));
  return buildMath('MULTIPLY', squared, easing);
}

export function buildChannel(source: OutputSocket, channel: 'R' | 'G' | 'B'): OutputSocket {
  return new SeparateRGB({ color: source }).output(channel);
}

export function buildGreyColor(value: OutputSocket): OutputSocket {
  return new CombineRGB({ r: value, g: value, b: value }).output('Color');
}

export function buildMix(
  mode: 'MIX' | 'MULTIPLY' | 'ADD' | 'SUBTRACT' | 'OVERLAY' | 'SCREEN',
  fac: OutputSocket | number,
  colorA: OutputSocket | string,
  colorB: OutputSocket | string,
): OutputSocket {
  return new MixRGB({ mode, fac, colorA, colorB }).output('Color');
}

/** Decodes display-referred colour to the linear values the compositor expects. */
export function buildDisplayToLinear(color: OutputSocket): OutputSocket {
  return new Gamma({ color, gamma: DISPLAY_GAMMA }).output('Color');
}

/**
 * Beer-Lambert absorption plus in-scattering: red dies first, blue survives,
 * and distant surfaces dissolve into the fog colour.
 */
export function buildWaterColumn(surface: OutputSocket): OutputSocket {
  const distance = new CameraData().output('ViewDistance');
  const channel = (absorption: number): OutputSocket => buildMath('POWER', Math.exp(-absorption), distance);
  const transmittance = new CombineRGB({
    r: channel(ABSORPTION_RED),
    g: channel(ABSORPTION_GREEN),
    b: channel(ABSORPTION_BLUE),
  }).output('Color');

  const attenuated = buildMix('MULTIPLY', NEUTRAL_FAC, surface, transmittance);
  const lost = buildMix('SUBTRACT', NEUTRAL_FAC, WHITE, transmittance);
  const scattered = buildMix('MULTIPLY', NEUTRAL_FAC, lost, FOG_COLOR);
  return buildMix('ADD', NEUTRAL_FAC, attenuated, scattered);
}

/** Sunlight focused by surface waves: two ridged animated-noise layers multiplied together. */
export function buildCausticPattern(position: OutputSocket): OutputSocket {
  const ridgeLayer = (scale: number, speed: number): OutputSocket => {
    const noise = new AnimatedNoiseTexture({
      vector: position,
      scale,
      speed,
      detail: NOISE_DETAIL,
      roughness: NOISE_ROUGHNESS,
    }).output('Fac');
    const offCentre = buildMath('ABSOLUTE', buildMath('SUBTRACT', noise, NOISE_CENTRE));
    const ridge = buildMath('SUBTRACT', 1, buildMath('MULTIPLY', offCentre, RIDGE_GAIN));
    return buildMath('POWER', ridge, RIDGE_POWER);
  };
  return buildMath('MULTIPLY', ridgeLayer(CAUSTIC_SCALE_A, CAUSTIC_SPEED_A), ridgeLayer(CAUSTIC_SCALE_B, CAUSTIC_SPEED_B));
}

/** Caustic light as a colour: fades with depth below the surface and on surfaces facing away from the sun. */
export function buildCausticLight(geometry: Geometry): OutputSocket {
  const position = geometry.output('Position');
  const facingUp = buildRange(buildChannel(geometry.output('Normal'), 'G'), MOSTLY_UPRIGHT_MIN, MOSTLY_UPRIGHT_MAX);
  const depthBelowSurface = buildMath('SUBTRACT', SURFACE_Y, buildChannel(position, 'G'));
  const depthFade = buildMath('POWER', Math.exp(-CAUSTIC_DEPTH_FALLOFF), depthBelowSurface);
  const intensity = buildMath(
    'MULTIPLY',
    buildMath('MULTIPLY', buildCausticPattern(position), facingUp),
    buildMath('MULTIPLY', depthFade, CAUSTIC_STRENGTH),
  );
  return buildMix('MULTIPLY', NEUTRAL_FAC, CAUSTIC_COLOR, buildGreyColor(intensity));
}

/**
 * Finishes a compiled Triforge material: wires the shared clock, matches its sun and ambient to
 * the scene, and raises fragment precision so hash-based noise stays stable on mobile GPUs.
 */
export function finaliseMaterial(output: MaterialOutput, clock: TriforgeClock): ShaderMaterial {
  const material = output.compile();
  material.uniforms.time = clock.time;
  material.uniforms.uSunDirection = { value: new Vector3(...SUN_DIRECTION).normalize() };
  material.uniforms.uSunColor = { value: new Vector3(...TRIFORGE_SUN_COLOR) };
  material.uniforms.uAmbientColor = { value: new Vector3(...TRIFORGE_AMBIENT_COLOR) };
  material.fragmentShader = material.fragmentShader.replace(FRAGMENT_PRECISION_FROM, FRAGMENT_PRECISION_TO);
  material.needsUpdate = true;
  return material;
}

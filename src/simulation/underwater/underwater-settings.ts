/**
 * Tunable graphics settings for the Underwater scene: the defaults, the slider definitions the
 * settings sidebar renders, and the JSON export. Exported JSON files replace SCENE_DEFAULTS.
 */

import {
  SceneSettings,
  SettingApply,
  SettingDefinition,
  SettingGroup,
  SettingKey,
  SettingKind,
} from '../../types/underwater';

export const SCENE_DEFAULTS: SceneSettings = {
  fogColor: '#4b5658',
  fogDensity: 0.015,
  absorptionRed: 0.5,
  absorptionGreen: 0.1,
  absorptionBlue: 0.05,
  exposure: 0.75,
  sunIntensity: 5.75,
  sunColor: '#c8e1e1',
  hemiIntensity: 1.5,
  hemiSkyColor: '#64c8c8',
  environmentIntensity: 0.75,
  rimIntensity: 2.75,
  rimColor: '#96afc8',
  fillIntensity: 2.75,
  fillColor: '#c86432',
  dappleAmount: 0.25,
  dappleSpeed: 2,
  causticStrength: 1.75,
  causticScaleA: 340,
  causticScaleB: 120,
  causticSpeedA: 20,
  causticSpeedB: 55,
  causticDepthFalloff: 0.11,
  causticColor: '#c8fafa',
  shaftIntensity: 0.25,
  shaftCount: 10,
  shaftWidthScale: 1,
  particleCount: 1150,
  particleSize: 0.15,
  particleOpacity: 0.25,
  particleDriftSpeed: 0.225,
  cameraFov: 50,
  cameraDriftRadius: 2.5,
  cameraDriftSpeed: 0.1,
  cameraBobAmplitude: 0.5,
  cameraParallaxX: 2,
  cameraParallaxY: 2,
  cameraParallaxDamping: 1.5,
  bloomThreshold: 0.25,
  bloomStrength: 0.75,
  bloomRadius: 0.75,
  vignetteDarkness: 0.75,
  vignetteOffset: 0.25,
  grainIntensity: 0.225,
  gradeLiftR: -0.06,
  gradeLiftG: 0.04,
  gradeLiftB: 0.08,
  gradeGainR: 1.25,
  gradeGainG: 1,
  gradeGainB: 1.175,
  gradeSaturation: 1.15,
  seagrassSwaySpeed: 1.5,
  seagrassSwayAmplitude: 0.5,
  fishShadowOpacity: 0.75,
  fishShadowSize: 0.75,
  fishShadowSpread: 0.35,
  surfaceBrightness: 1,
  domeGlowGain: 0.5,
  seabedBump: 2.25,
  seabedCausticGain: 1.75,
  rockBump: 3.25,
  rockCausticGain: 1.55,
};

export const SETTING_GROUP_ORDER: readonly SettingGroup[] = [
  SettingGroup.WATER,
  SettingGroup.LIGHT,
  SettingGroup.CAUSTICS,
  SettingGroup.SHAFTS,
  SettingGroup.SNOW,
  SettingGroup.CAMERA,
  SettingGroup.POST,
  SettingGroup.PLANTS,
  SettingGroup.SHADOW,
  SettingGroup.SURFACES,
];

export const SETTING_GROUP_LABELS: Record<SettingGroup, string> = {
  [SettingGroup.WATER]: 'Water',
  [SettingGroup.LIGHT]: 'Light',
  [SettingGroup.CAUSTICS]: 'Caustics',
  [SettingGroup.SHAFTS]: 'Shafts',
  [SettingGroup.SNOW]: 'Snow',
  [SettingGroup.CAMERA]: 'Camera',
  [SettingGroup.POST]: 'Grade',
  [SettingGroup.PLANTS]: 'Plants',
  [SettingGroup.SHADOW]: 'Shadow',
  [SettingGroup.SURFACES]: 'Surfaces',
};

const EXPORT_SCENE_NAME = 'underwater' as const;
const EXPORT_VERSION = 1 as const;
const EXPORT_INDENT = 2 as const;
const COLOR_STEP = 0 as const;

function buildNumber(
  key: SettingKey,
  group: SettingGroup,
  label: string,
  min: number,
  max: number,
  step: number,
  apply: SettingApply,
): SettingDefinition {
  return { key, group, kind: SettingKind.NUMBER, label, min, max, step, apply };
}

function buildColor(key: SettingKey, group: SettingGroup, label: string, apply: SettingApply): SettingDefinition {
  return { key, group, kind: SettingKind.COLOR, label, min: COLOR_STEP, max: COLOR_STEP, step: COLOR_STEP, apply };
}

const { WATER, LIGHT, CAUSTICS, SHAFTS, SNOW, CAMERA, POST, PLANTS, SHADOW, SURFACES } = SettingGroup;
const { LIVE, GRAPH } = SettingApply;

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  buildColor('fogColor', WATER, 'Water colour', GRAPH),
  buildNumber('fogDensity', WATER, 'Fog density', 0, 0.12, 0.001, LIVE),
  buildNumber('absorptionRed', WATER, 'Red absorption', 0, 0.6, 0.005, GRAPH),
  buildNumber('absorptionGreen', WATER, 'Green absorption', 0, 0.6, 0.005, GRAPH),
  buildNumber('absorptionBlue', WATER, 'Blue absorption', 0, 0.6, 0.005, GRAPH),
  buildNumber('exposure', WATER, 'Exposure', 0.3, 2.5, 0.01, LIVE),
  buildNumber('surfaceBrightness', WATER, 'Surface brightness', 0, 3, 0.05, GRAPH),
  buildNumber('domeGlowGain', WATER, 'Sun glow', 0, 2, 0.05, GRAPH),

  buildNumber('sunIntensity', LIGHT, 'Sun intensity', 0, 8, 0.05, LIVE),
  buildColor('sunColor', LIGHT, 'Sun colour', LIVE),
  buildNumber('hemiIntensity', LIGHT, 'Ambient intensity', 0, 3, 0.05, LIVE),
  buildColor('hemiSkyColor', LIGHT, 'Ambient colour', LIVE),
  buildNumber('environmentIntensity', LIGHT, 'Reflections', 0, 3, 0.05, LIVE),
  buildNumber('rimIntensity', LIGHT, 'Rim intensity', 0, 4, 0.05, LIVE),
  buildColor('rimColor', LIGHT, 'Rim colour', LIVE),
  buildNumber('fillIntensity', LIGHT, 'Fill intensity', 0, 3, 0.05, LIVE),
  buildColor('fillColor', LIGHT, 'Fill colour', LIVE),
  buildNumber('dappleAmount', LIGHT, 'Dappling amount', 0, 0.6, 0.01, LIVE),
  buildNumber('dappleSpeed', LIGHT, 'Dappling speed', 0, 4, 0.05, LIVE),

  buildNumber('causticStrength', CAUSTICS, 'Strength', 0, 6, 0.05, GRAPH),
  buildNumber('causticScaleA', CAUSTICS, 'Scale A', 20, 400, 1, GRAPH),
  buildNumber('causticScaleB', CAUSTICS, 'Scale B', 20, 400, 1, GRAPH),
  buildNumber('causticSpeedA', CAUSTICS, 'Speed A', 0, 80, 0.5, GRAPH),
  buildNumber('causticSpeedB', CAUSTICS, 'Speed B', 0, 80, 0.5, GRAPH),
  buildNumber('causticDepthFalloff', CAUSTICS, 'Depth falloff', 0, 0.3, 0.005, GRAPH),
  buildColor('causticColor', CAUSTICS, 'Colour', GRAPH),

  buildNumber('shaftIntensity', SHAFTS, 'Intensity', 0, 1.5, 0.01, GRAPH),
  buildNumber('shaftCount', SHAFTS, 'Count', 0, 24, 1, LIVE),
  buildNumber('shaftWidthScale', SHAFTS, 'Width', 0.3, 3, 0.05, LIVE),

  buildNumber('particleCount', SNOW, 'Count', 0, 1800, 10, LIVE),
  buildNumber('particleSize', SNOW, 'Size', 0.01, 0.2, 0.005, LIVE),
  buildNumber('particleOpacity', SNOW, 'Opacity', 0, 1, 0.01, LIVE),
  buildNumber('particleDriftSpeed', SNOW, 'Drift speed', 0, 0.5, 0.005, LIVE),

  buildNumber('cameraFov', CAMERA, 'Field of view', 20, 90, 0.5, LIVE),
  buildNumber('cameraDriftRadius', CAMERA, 'Drift radius', 0, 3, 0.05, LIVE),
  buildNumber('cameraDriftSpeed', CAMERA, 'Drift speed', 0, 0.4, 0.005, LIVE),
  buildNumber('cameraBobAmplitude', CAMERA, 'Bob amount', 0, 0.6, 0.01, LIVE),
  buildNumber('cameraParallaxX', CAMERA, 'Parallax X', 0, 4, 0.05, LIVE),
  buildNumber('cameraParallaxY', CAMERA, 'Parallax Y', 0, 3, 0.05, LIVE),
  buildNumber('cameraParallaxDamping', CAMERA, 'Parallax damping', 0.3, 6, 0.05, LIVE),

  buildNumber('bloomThreshold', POST, 'Bloom threshold', 0, 1.5, 0.01, SettingApply.POST),
  buildNumber('bloomStrength', POST, 'Bloom strength', 0, 2, 0.01, SettingApply.POST),
  buildNumber('bloomRadius', POST, 'Bloom radius', 0, 1, 0.01, SettingApply.POST),
  buildNumber('vignetteDarkness', POST, 'Vignette darkness', 0, 1, 0.01, SettingApply.POST),
  buildNumber('vignetteOffset', POST, 'Vignette offset', 0.05, 1, 0.01, SettingApply.POST),
  buildNumber('grainIntensity', POST, 'Film grain', 0, 0.3, 0.005, SettingApply.POST),
  buildNumber('gradeLiftR', POST, 'Shadows red', -0.1, 0.1, 0.002, SettingApply.POST),
  buildNumber('gradeLiftG', POST, 'Shadows green', -0.1, 0.1, 0.002, SettingApply.POST),
  buildNumber('gradeLiftB', POST, 'Shadows blue', -0.1, 0.1, 0.002, SettingApply.POST),
  buildNumber('gradeGainR', POST, 'Highlights red', 0.6, 1.4, 0.005, SettingApply.POST),
  buildNumber('gradeGainG', POST, 'Highlights green', 0.6, 1.4, 0.005, SettingApply.POST),
  buildNumber('gradeGainB', POST, 'Highlights blue', 0.6, 1.4, 0.005, SettingApply.POST),
  buildNumber('gradeSaturation', POST, 'Saturation', 0, 2, 0.01, SettingApply.POST),

  buildNumber('seagrassSwaySpeed', PLANTS, 'Sway speed', 0, 3, 0.05, LIVE),
  buildNumber('seagrassSwayAmplitude', PLANTS, 'Sway amount', 0, 1, 0.01, LIVE),

  buildNumber('fishShadowOpacity', SHADOW, 'Opacity', 0, 1, 0.01, GRAPH),
  buildNumber('fishShadowSize', SHADOW, 'Size', 0.3, 3, 0.05, LIVE),
  buildNumber('fishShadowSpread', SHADOW, 'Spread with height', 0, 0.4, 0.005, LIVE),

  buildNumber('seabedBump', SURFACES, 'Sand bump', 0, 3, 0.05, GRAPH),
  buildNumber('seabedCausticGain', SURFACES, 'Sand caustics', 0, 2, 0.05, GRAPH),
  buildNumber('rockBump', SURFACES, 'Rock bump', 0, 5, 0.05, GRAPH),
  buildNumber('rockCausticGain', SURFACES, 'Rock caustics', 0, 2, 0.05, GRAPH),
];

function getKeysFor(apply: SettingApply): readonly SettingKey[] {
  return SETTING_DEFINITIONS.filter((definition) => definition.apply === apply).map((definition) => definition.key);
}

export const GRAPH_SETTING_KEYS: readonly SettingKey[] = getKeysFor(SettingApply.GRAPH);
export const POST_SETTING_KEYS: readonly SettingKey[] = getKeysFor(SettingApply.POST);

/** True when any of the given settings differ between two snapshots. */
export function hasSettingChanged(keys: readonly SettingKey[], previous: SceneSettings, next: SceneSettings): boolean {
  return keys.some((key) => previous[key] !== next[key]);
}

/** The JSON file the sidebar exports; its `settings` object can be pasted over SCENE_DEFAULTS. */
export function buildSettingsExport(settings: SceneSettings): string {
  return JSON.stringify({ scene: EXPORT_SCENE_NAME, version: EXPORT_VERSION, settings }, null, EXPORT_INDENT);
}

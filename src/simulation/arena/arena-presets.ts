/**
 * Motion presets for the arena. System 1 reuses the Case 2 designer presets;
 * the extra presets cover behaviours only the arena needs.
 */

import { ArenaPreset } from '../../types/arena';
import { PresetKey, PresetParameters } from '../../types/benchmark';
import { DESIGNER_PRESETS } from '../controllers/case-2-lottery';

export const ARENA_PRESETS: Record<ArenaPreset, PresetParameters> = {
  [ArenaPreset.GLIDE]: DESIGNER_PRESETS[PresetKey.GLIDE],
  [ArenaPreset.DART]: DESIGNER_PRESETS[PresetKey.STARTLE_DART],
  [ArenaPreset.FREEZE]: DESIGNER_PRESETS[PresetKey.ANXIOUS_FREEZE],
  [ArenaPreset.HOVER]: DESIGNER_PRESETS[PresetKey.CURIOUS_HOVER],
  [ArenaPreset.STRIKE]: {
    speed: 5.6,
    tailFrequency: 5.0,
    spineCurveAmplitude: 0.5,
    finResistance: 0.6,
    bodyColorHue: 0.8,
    turnResponsiveness: 4.0,
  },
  [ArenaPreset.CAUTIOUS]: {
    speed: 1.3,
    tailFrequency: 2.6,
    spineCurveAmplitude: 0.35,
    finResistance: 0.5,
    bodyColorHue: 0.6,
    turnResponsiveness: 1.8,
  },
  [ArenaPreset.INSPECT]: {
    speed: 1.7,
    tailFrequency: 2.4,
    spineCurveAmplitude: 0.3,
    finResistance: 0.45,
    bodyColorHue: 0.65,
    turnResponsiveness: 2.4,
  },
  [ArenaPreset.SHELTER]: {
    speed: 4.2,
    tailFrequency: 4.4,
    spineCurveAmplitude: 0.5,
    finResistance: 0.7,
    bodyColorHue: 0.15,
    turnResponsiveness: 3.4,
  },
};

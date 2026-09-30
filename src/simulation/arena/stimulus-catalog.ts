/**
 * Stimulus catalog for the Cognitive Arena.
 * Known stimuli are handled by System 1; unknown stimuli need System 1+2 appraisal.
 */

import { StimulusClass, StimulusDefinition, StimulusKind, Valence } from '../../types/arena';

export const STIMULUS_DEFINITIONS: StimulusDefinition[] = [
  {
    kind: StimulusKind.SHADOW,
    label: 'Looming shadow',
    hotkey: '1',
    icon: '🌑',
    stimulusClass: StimulusClass.KNOWN_THREAT,
    trueValence: Valence.THREAT,
    lifetimeSeconds: 6,
    summary: 'A fast overhead sweep. Instinct triggers a startle or a dash for cover.',
  },
  {
    kind: StimulusKind.TAP,
    label: 'Glass tap',
    hotkey: '2',
    icon: '👆',
    stimulusClass: StimulusClass.KNOWN_THREAT,
    trueValence: Valence.THREAT,
    lifetimeSeconds: 0.6,
    summary: 'A sudden vibration through the water. Instinct freezes or bolts.',
  },
  {
    kind: StimulusKind.FLASH,
    label: 'Light flash',
    hotkey: '3',
    icon: '⚡',
    stimulusClass: StimulusClass.KNOWN_THREAT,
    trueValence: Valence.THREAT,
    lifetimeSeconds: 0.4,
    summary: 'A sudden bright flash across the whole scene.',
  },
  {
    kind: StimulusKind.PELLET,
    label: 'Food pellet',
    hotkey: '4',
    icon: '🍤',
    stimulusClass: StimulusClass.KNOWN_FOOD,
    trueValence: Valence.FOOD,
    lifetimeSeconds: 22,
    summary: 'A familiar sinking pellet. Instinct strikes at it when the fish is hungry and calm.',
  },
  {
    kind: StimulusKind.ROCK,
    label: 'Novel rock',
    hotkey: '5',
    icon: '🪨',
    stimulusClass: StimulusClass.UNKNOWN,
    trueValence: Valence.SAFE,
    lifetimeSeconds: 90,
    summary: 'A never-seen object on the floor. Expect cautious approach and inspection.',
  },
  {
    kind: StimulusKind.NOVEL_FOOD,
    label: 'Novel food',
    hotkey: '6',
    icon: '🟣',
    stimulusClass: StimulusClass.UNKNOWN,
    trueValence: Valence.FOOD,
    lifetimeSeconds: 28,
    summary: 'Food in a form the fish has never seen. Tested with a cautious nibble.',
  },
  {
    kind: StimulusKind.LEAF,
    label: 'Drifting leaf',
    hotkey: '7',
    icon: '🍃',
    stimulusClass: StimulusClass.UNKNOWN,
    trueValence: Valence.SAFE,
    lifetimeSeconds: 45,
    summary: 'A slow ambiguous drifter. Is it alive? Is it food?',
  },
  {
    kind: StimulusKind.LURE,
    label: 'Lure',
    hotkey: '8',
    icon: '🎣',
    stimulusClass: StimulusClass.UNKNOWN,
    trueValence: Valence.THREAT,
    lifetimeSeconds: 35,
    summary: 'Looks a little like food but is a trap. The fish must work that out.',
  },
];

export function getStimulusDefinition(kind: StimulusKind): StimulusDefinition {
  const definition = STIMULUS_DEFINITIONS.find((entry) => entry.kind === kind);
  if (!definition) {
    throw new Error(`Unknown stimulus kind: ${kind}`);
  }
  return definition;
}

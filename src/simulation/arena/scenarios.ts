/**
 * One-click scripted scenarios that exercise the System 1 / System 2 arbitration.
 */

import { ScenarioDefinition, StimulusKind } from '../../types/arena';

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'rock-then-shadow',
    label: 'Interrupted inspection',
    summary: 'A novel rock draws the fish in, then a shadow sweeps over mid-inspection. Instinct should abort the appraisal.',
    steps: [
      { atSeconds: 0, kind: StimulusKind.ROCK, position: { x: 4, y: 0, z: 1 } },
      { atSeconds: 2.8, kind: StimulusKind.SHADOW, position: { x: 12, y: 0, z: 0 } },
    ],
  },
  {
    id: 'pellet-under-shadow',
    label: 'Hunger vs fear',
    summary: 'A familiar pellet drops, then a shadow passes above it. Fear wins, and the strike resumes once the fish calms.',
    steps: [
      { atSeconds: 0, kind: StimulusKind.PELLET, position: { x: -10, y: 0, z: 0 } },
      { atSeconds: 0.2, kind: StimulusKind.SHADOW, position: { x: 12, y: 0, z: 0 } },
    ],
  },
  {
    id: 'novel-plus-threat',
    label: 'Novelty meets threat',
    summary: 'A novel leaf and a shadow arrive together. The fish flees first, then returns to appraise the leaf.',
    steps: [
      { atSeconds: 0, kind: StimulusKind.LEAF, position: { x: 2, y: 0, z: 2 } },
      { atSeconds: 0.2, kind: StimulusKind.SHADOW, position: { x: -12, y: 0, z: 1 } },
    ],
  },
  {
    id: 'learned-aversion',
    label: 'Learned aversion',
    summary: 'Novel food is repeatedly paired with a shadow. Within the memory span the fish learns to distrust it.',
    steps: [
      { atSeconds: 0, kind: StimulusKind.NOVEL_FOOD, position: { x: 1, y: 0, z: 0 } },
      { atSeconds: 1.5, kind: StimulusKind.SHADOW, position: { x: 12, y: 0, z: 0 } },
      { atSeconds: 8, kind: StimulusKind.NOVEL_FOOD, position: { x: -2, y: 0, z: 1 } },
      { atSeconds: 9.5, kind: StimulusKind.SHADOW, position: { x: -12, y: 0, z: 0 } },
      { atSeconds: 16, kind: StimulusKind.NOVEL_FOOD, position: { x: 3, y: 0, z: -1 } },
      { atSeconds: 17.5, kind: StimulusKind.SHADOW, position: { x: 12, y: 0, z: 0 } },
    ],
  },
];

'use client';

/**
 * Stimulus palette: the dock of things the viewer can put in the water.
 * Grouped by which system handles them, with hotkeys and short descriptions.
 */

import React from 'react';

import { StimulusClass, StimulusDefinition, StimulusKind } from '../../types/arena';
import { STIMULUS_DEFINITIONS } from '../../simulation/arena/stimulus-catalog';

import styles from './arena.module.css';

interface StimulusPaletteProps {
  armedKind: StimulusKind | null;
  onSelect: (kind: StimulusKind) => void;
}

const INSTANT_KINDS: StimulusKind[] = [StimulusKind.TAP, StimulusKind.FLASH];

interface PaletteGroup {
  heading: string;
  system: 'S1' | 'S2';
  isUnknown: boolean;
}

const PALETTE_GROUPS: PaletteGroup[] = [
  { heading: 'Instinct · System 1', system: 'S1', isUnknown: false },
  { heading: 'Unknown · System 1+2', system: 'S2', isUnknown: true },
];

function renderButton(
  definition: StimulusDefinition,
  armedKind: StimulusKind | null,
  onSelect: (kind: StimulusKind) => void
): React.ReactNode {
  const isArmed = armedKind === definition.kind;
  const isInstant = INSTANT_KINDS.includes(definition.kind);

  return (
    <button
      key={definition.kind}
      type="button"
      className={`${styles['fp-arena-stim-button-ts']} d-flex align-items-center gap-[var(--fp-space-default)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`}
      data-state={isArmed ? 'armed' : 'idle'}
      data-class={definition.stimulusClass}
      aria-pressed={isArmed}
      aria-keyshortcuts={definition.hotkey}
      title={`${definition.summary}${isInstant ? ' Fires instantly.' : ' Click, then click the water to place it.'}`}
      onClick={() => onSelect(definition.kind)}
    >
      <span className={styles['fp-arena-stim-icon']} aria-hidden="true">{definition.icon}</span>
      <span className={`${styles['fp-arena-stim-name']} flex-grow-1`}>
        {definition.label}
        {isInstant && <span className={styles['fp-arena-stim-note']}> · instant</span>}
      </span>
      <kbd className={styles['fp-arena-keycap']}>{definition.hotkey}</kbd>
    </button>
  );
}

export const StimulusPalette: React.FC<StimulusPaletteProps> = ({ armedKind, onSelect }) => {
  return (
    <nav
      aria-label="Stimulus palette"
      className={`${styles['fp-arena-panel']} ${styles['fp-arena-dock']} d-flex flex-column gap-[var(--fp-space-default)] p-[var(--fp-space-default)]`}
      data-panel="palette"
    >
      {PALETTE_GROUPS.map((group) => {
        const definitions = STIMULUS_DEFINITIONS.filter((definition) =>
          group.isUnknown
            ? definition.stimulusClass === StimulusClass.UNKNOWN
            : definition.stimulusClass !== StimulusClass.UNKNOWN
        );
        return (
          <div key={group.system} className="d-flex flex-column gap-[var(--fp-space-xxs)]">
            <h2 className={styles['fp-arena-panel-title']} data-system={group.system}>{group.heading}</h2>
            {definitions.map((definition) => renderButton(definition, armedKind, onSelect))}
          </div>
        );
      })}
    </nav>
  );
};

'use client';

/**
 * Fish Telemetry Readout.
 * Compact bottom-right text laid straight over the scene (no card behind it): one short block per fish with its
 * state, appetite, panic and the model's latest flee and eat answers. Hovering a block raises that fish's tooltip.
 */

import React from 'react';

import { INTENT_COMMIT } from '../../simulation/underwater/ai/fish-intent-constants';
import { FishMode, FishTelemetry } from '../../types/underwater';
import { FishIcon } from '../HudIcons';

import styles from './underwater.module.css';

const PERCENT = 100 as const;
const PANIC_ACTIVE_MIN = 0.05 as const;
const HUNGRY_MIN = 0.5 as const;
const NO_ANSWER = '–' as const;

interface FishTelemetryReadoutProps {
  fish: FishTelemetry[];
  focusedId: number | null;
  onFishHover: (id: number) => void;
}

/** Unique marker shown on the fish tooltip and on its readout block, so the two can be matched at a glance. */
export function getFishMarker(id: number): string {
  return `#${id + 1}`;
}

interface FishStateSource {
  isEntering: boolean;
  isEating: boolean;
  mode: FishMode;
  isResting?: boolean;
  isWaitingForDestination?: boolean;
}

export function getStateText(fish: FishStateSource): string {
  if (fish.isEntering) return 'Entering the tank';
  if (fish.isEating) return 'Eating';
  if (fish.mode === FishMode.FLEE) return 'Fleeing the cursor';
  if (fish.mode === FishMode.SEEK_FOOD) return 'Chasing food';
  return fish.isResting || fish.isWaitingForDestination ? 'Waiting for Laya' : 'Swimming to its chosen spot';
}

type ReadoutTone = 'threat' | 'food' | 'info' | 'calm' | 'idle';

export function getStateTone(fish: FishStateSource): ReadoutTone {
  if (fish.isEntering) return 'info';
  if (fish.isEating || fish.mode === FishMode.SEEK_FOOD) return 'food';
  if (fish.mode === FishMode.FLEE) return 'threat';
  return 'calm';
}

function formatPercent(value: number): string {
  return `${Math.round(value * PERCENT)}%`;
}

export const FishTelemetryReadout: React.FC<FishTelemetryReadoutProps> = ({ fish, focusedId, onFishHover }) => (
  <section
    className={`${styles['fp-underwater-telemetry']} position-absolute d-flex flex-column align-items-end gap-[var(--fp-space-md)]`}
    aria-label="Fish behaviour"
  >
    {fish.map((entry) => (
      <article
        key={entry.id}
        data-focus={focusedId === entry.id ? 'true' : 'false'}
        className={`${styles['fp-underwater-telemetry-fish']} d-flex flex-column align-items-end gap-[var(--fp-space-xxxs)]`}
        onPointerEnter={() => onFishHover(entry.id)}
      >
        <h2 className={`${styles['fp-underwater-telemetry-name']} d-flex align-items-center gap-[var(--fp-space-xs)]`}>
          <span className={styles['fp-underwater-telemetry-marker']}>{getFishMarker(entry.id)}</span>
          {entry.label}
          <FishIcon />
        </h2>
        <p className={styles['fp-underwater-telemetry-state']}>
          {entry.temperament} · <span data-tone={getStateTone(entry)}>{getStateText(entry)}</span>
        </p>
        <dl className={`${styles['fp-underwater-telemetry-grid']} d-grid`}>
          <dt>Appetite</dt>
          <dd data-tone={entry.appetite >= HUNGRY_MIN ? 'food' : 'idle'}>{formatPercent(entry.appetite)}</dd>
          <dt>Panic</dt>
          <dd data-tone={entry.panic >= PANIC_ACTIVE_MIN ? 'threat' : 'idle'}>{formatPercent(entry.panic)}</dd>
          <dt>Flee</dt>
          <dd data-tone={entry.intent.hasAnswer && entry.intent.danger >= INTENT_COMMIT ? 'threat' : 'idle'}>{entry.intent.hasAnswer ? formatPercent(entry.intent.danger) : NO_ANSWER}</dd>
          <dt>Eat</dt>
          <dd data-tone={entry.intent.hasAnswer && entry.intent.eat >= INTENT_COMMIT ? 'food' : 'idle'}>{entry.intent.hasAnswer ? formatPercent(entry.intent.eat) : NO_ANSWER}</dd>
        </dl>
      </article>
    ))}
  </section>
);

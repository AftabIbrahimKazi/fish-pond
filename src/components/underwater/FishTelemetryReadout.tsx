/**
 * Fish Telemetry Readout.
 * Bottom-right text laid straight over the scene (no card behind it) showing how each fish is
 * behaving right now.
 */

import React from 'react';

import { FishMode, FishTelemetry } from '../../types/underwater';
import { FishIcon } from '../HudIcons';

import styles from './underwater.module.css';

const PERCENT = 100 as const;
const SPEED_DECIMALS = 2 as const;
const DEPTH_DECIMALS = 1 as const;
const PANIC_ACTIVE_MIN = 0.05 as const;
const HUNGRY_MIN = 0.5 as const;

interface FishTelemetryReadoutProps {
  fish: FishTelemetry[];
}

function getStateText(fish: FishTelemetry): string {
  if (fish.isEntering) return 'Entering the tank';
  if (fish.isEating) return 'Eating';
  if (fish.mode === FishMode.FLEE) return 'Fleeing the cursor';
  if (fish.mode === FishMode.SEEK_FOOD) return 'Chasing food';
  return fish.isResting ? 'Resting' : 'Cruising';
}

type ReadoutTone = 'threat' | 'food' | 'info' | 'calm' | 'idle';

function getStateTone(fish: FishTelemetry): ReadoutTone {
  if (fish.isEntering) return 'info';
  if (fish.isEating || fish.mode === FishMode.SEEK_FOOD) return 'food';
  if (fish.mode === FishMode.FLEE) return 'threat';
  return 'calm';
}

function formatPercent(value: number): string {
  return `${Math.round(value * PERCENT)}%`;
}

export const FishTelemetryReadout: React.FC<FishTelemetryReadoutProps> = ({ fish }) => (
  <section
    className={`${styles['fp-underwater-telemetry']} position-absolute d-flex flex-column align-items-end gap-[var(--fp-space-md)]`}
    aria-label="Fish behaviour"
  >
    {fish.map((entry) => (
      <article key={entry.id} className="d-flex flex-column align-items-end gap-[var(--fp-space-xxs)]">
        <h2 className={`${styles['fp-underwater-telemetry-name']} d-flex align-items-center gap-[var(--fp-space-xs)]`}>
          {entry.label}
          <FishIcon />
        </h2>
        <p className={styles['fp-underwater-telemetry-state']}>
          {entry.temperament} · <span data-tone={getStateTone(entry)}>{getStateText(entry)}</span>
        </p>
        <dl className={`${styles['fp-underwater-telemetry-grid']} d-grid`}>
          <dt>Speed</dt>
          <dd>{entry.speed.toFixed(SPEED_DECIMALS)} m/s</dd>
          <dt>Depth</dt>
          <dd>{entry.depth.toFixed(DEPTH_DECIMALS)} m</dd>
          <dt>Appetite</dt>
          <dd data-tone={entry.appetite >= HUNGRY_MIN ? 'food' : 'idle'}>{formatPercent(entry.appetite)}</dd>
          <dt>Panic</dt>
          <dd data-tone={entry.panic >= PANIC_ACTIVE_MIN ? 'threat' : 'idle'}>{formatPercent(entry.panic)}</dd>
          <dt>Target</dt>
          <dd>{entry.waypointDistance.toFixed(DEPTH_DECIMALS)} m</dd>
        </dl>
      </article>
    ))}
  </section>
);

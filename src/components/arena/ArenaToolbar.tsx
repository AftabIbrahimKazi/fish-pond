'use client';

/**
 * Arena toolbar: navigation, simulation clock and playback controls.
 */

import React from 'react';
import Link from 'next/link';

import styles from './arena.module.css';

interface ArenaToolbarProps {
  timeSeconds: number;
  isPaused: boolean;
  simSpeed: number;
  onTogglePause: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 2] as const;

function formatClock(seconds: number): string {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

export const ArenaToolbar: React.FC<ArenaToolbarProps> = ({
  timeSeconds,
  isPaused,
  simSpeed,
  onTogglePause,
  onSpeedChange,
  onReset,
}) => {
  return (
    <header
      className={`${styles['fp-arena-toolbar']} d-flex align-items-center justify-content-between gap-[var(--fp-space-md)] px-[var(--fp-space-md)] py-[var(--fp-space-sm)]`}
    >
      <div className="d-flex align-items-center gap-[var(--fp-space-md)]">
        <Link href="/" className={`${styles['fp-arena-button']} px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`}>
          <span aria-hidden="true">←</span> Home
        </Link>
        <h1 className={styles['fp-arena-title']}>Cognitive Arena</h1>
      </div>

      <div className="d-flex align-items-center gap-[var(--fp-space-sm)]">
        <span className={styles['fp-arena-clock']} aria-label="Simulation time">{formatClock(timeSeconds)}</span>
        <button
          type="button"
          className={`${styles['fp-arena-button']} px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`}
          data-state={isPaused ? 'armed' : 'idle'}
          aria-pressed={isPaused}
          aria-keyshortcuts="Space"
          onClick={onTogglePause}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <label className="d-flex align-items-center gap-[var(--fp-space-xs)]">
          <span className={styles['fp-arena-meter-label']}>Speed</span>
          <select
            className={`${styles['fp-arena-select']} px-[var(--fp-space-sm)] py-[var(--fp-space-xs)]`}
            value={simSpeed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          >
            {SPEED_OPTIONS.map((speed) => (
              <option key={speed} value={speed}>{speed}×</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`${styles['fp-arena-button']} px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`}
          aria-keyshortcuts="R"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </header>
  );
};

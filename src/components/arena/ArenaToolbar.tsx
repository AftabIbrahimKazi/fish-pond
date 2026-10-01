'use client';

/**
 * Arena toolbar: navigation, simulation clock and playback controls.
 */

import React from 'react';
import Link from 'next/link';

import { AiNotice } from '../AiNotice';
import { GlassSelect, GlassSelectOption } from '../GlassSelect';
import { ArrowLeftIcon, PauseIcon, PlayIcon, ResetIcon } from '../HudIcons';

import styles from './arena.module.css';

interface ArenaToolbarProps {
  timeSeconds: number;
  isPaused: boolean;
  simSpeed: number;
  onTogglePause: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

const SPEED_OPTIONS: readonly GlassSelectOption[] = [
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
];
const SECONDS_PER_MINUTE = 60 as const;
const BUTTON_LAYOUT = 'd-inline-flex align-items-center justify-content-center gap-[var(--fp-space-xs)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]' as const;

function formatClock(seconds: number): string {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / SECONDS_PER_MINUTE);
  return `${minutes}:${String(whole % SECONDS_PER_MINUTE).padStart(2, '0')}`;
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
      className={`${styles['fp-arena-toolbar']} position-absolute d-flex align-items-center justify-content-between gap-[var(--fp-space-sm)] px-[var(--fp-space-md)] py-[var(--fp-space-sm)]`}
    >
      <div className="d-flex align-items-center gap-[var(--fp-space-md)]">
        <Link href="/" className={`${styles['fp-arena-button']} ${BUTTON_LAYOUT}`} aria-label="Home">
          <ArrowLeftIcon />
          <span className={styles['fp-arena-button-label']}>Home</span>
        </Link>
        <div className="d-flex flex-column">
          <h1 className={styles['fp-arena-title']}>Cognitive Arena</h1>
          <AiNotice kind="scripted" isShort />
        </div>
      </div>

      <div className="d-flex align-items-center gap-[var(--fp-space-sm)]">
        <span className={styles['fp-arena-clock']} aria-label="Simulation time">{formatClock(timeSeconds)}</span>
        <button
          type="button"
          className={`${styles['fp-arena-button']} ${BUTTON_LAYOUT}`}
          data-state={isPaused ? 'armed' : 'idle'}
          aria-label={isPaused ? 'Resume' : 'Pause'}
          aria-pressed={isPaused}
          aria-keyshortcuts="Space"
          onClick={onTogglePause}
        >
          {isPaused ? <PlayIcon /> : <PauseIcon />}
          <span className={styles['fp-arena-button-label']}>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>
        <GlassSelect label="Speed" value={simSpeed} options={SPEED_OPTIONS} onChange={onSpeedChange} />
        <button
          type="button"
          className={`${styles['fp-arena-button']} ${BUTTON_LAYOUT}`}
          aria-label="Reset"
          aria-keyshortcuts="R"
          onClick={onReset}
        >
          <ResetIcon />
          <span className={styles['fp-arena-button-label']}>Reset</span>
        </button>
      </div>
    </header>
  );
};

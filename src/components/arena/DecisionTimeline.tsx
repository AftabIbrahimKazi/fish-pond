'use client';

/**
 * Decision timeline: which system is in control right now, a loud "S1 OVERRIDE" flag
 * when instinct cuts off deliberation, and a rolling log of recent decisions.
 */

import React from 'react';

import { ArenaChannel, ArenaMode, ArenaTelemetry } from '../../types/arena';

import styles from './arena.module.css';

interface DecisionTimelineProps {
  telemetry: ArenaTelemetry | null;
}

const OVERRIDE_FLAG_SECONDS = 3.0 as const;

const CHANNEL_LABEL: Record<ArenaChannel, string> = {
  [ArenaChannel.S1]: 'S1',
  [ArenaChannel.S2]: 'S2',
  [ArenaChannel.ARBITER]: 'ARB',
  [ArenaChannel.WORLD]: 'ENV',
};

function formatClock(seconds: number): string {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

export const DecisionTimeline: React.FC<DecisionTimelineProps> = ({ telemetry }) => {
  const mode = telemetry?.mode ?? ArenaMode.IDLE;
  const events = telemetry?.events ?? [];
  const latestOverride = events.find((event) => event.channel === ArenaChannel.ARBITER);
  const isOverrideVisible = Boolean(
    telemetry && latestOverride && telemetry.timeSeconds - latestOverride.timeSeconds < OVERRIDE_FLAG_SECONDS
  );

  const s1State = mode === ArenaMode.S1_REFLEX || mode === ArenaMode.S1_OVERRIDE ? 'active' : 'idle';
  const s2State = mode === ArenaMode.S2_DELIBERATING ? 'active' : mode === ArenaMode.LOCKOUT ? 'locked' : 'idle';

  return (
    <section
      aria-labelledby="fp-arena-timeline-title"
      className={`${styles['fp-arena-panel']} ${styles['fp-arena-timeline']} d-flex flex-column gap-[var(--fp-space-default)] p-[var(--fp-space-md)]`}
      data-panel="log"
    >
      <header className="d-flex align-items-center justify-content-between gap-[var(--fp-space-md)]">
        <h2 id="fp-arena-timeline-title" className={styles['fp-arena-panel-title']}>Who is in control</h2>
        <span
          className={styles['fp-arena-override-ts']}
          data-override-state={isOverrideVisible ? 'active' : 'idle'}
          role="status"
        >
          S1 OVERRIDE · instinct trumps deliberation
        </span>
      </header>

      <div className={`${styles['fp-arena-lanes']} d-grid gap-[var(--fp-space-sm)]`}>
        <div className={`${styles['fp-arena-lane']} d-flex align-items-center gap-[var(--fp-space-sm)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`} data-system="S1">
          <span className={styles['fp-arena-lane-dot-ts']} data-lane-state={s1State} aria-hidden="true" />
          <span className={styles['fp-arena-line']}>System 1 · instinct</span>
          <span className={styles['fp-arena-line-note']}>{s1State === 'active' ? telemetry?.s1Label : 'standing by'}</span>
        </div>
        <div className={`${styles['fp-arena-lane']} d-flex align-items-center gap-[var(--fp-space-sm)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`} data-system="S2">
          <span className={styles['fp-arena-lane-dot-ts']} data-lane-state={s2State} aria-hidden="true" />
          <span className={styles['fp-arena-line']}>System 1+2 · deliberation</span>
          <span className={styles['fp-arena-line-note']}>
            {s2State === 'active' ? 'appraising' : s2State === 'locked' ? `locked out ${telemetry?.lockoutSeconds.toFixed(1)} s` : 'standing by'}
          </span>
        </div>
      </div>

      <ol className={`${styles['fp-arena-list']} ${styles['fp-arena-log']} d-flex flex-column`} aria-label="Recent decisions">
        {events.length === 0 && <li className={styles['fp-arena-memory-empty']}>Place a stimulus to begin.</li>}
        {events.map((event) => (
          <li key={event.id} className={`${styles['fp-arena-log-item']} d-flex gap-[var(--fp-space-sm)]`} data-channel={event.channel}>
            <span className={styles['fp-arena-log-time']}>{formatClock(event.timeSeconds)}</span>
            <span className={styles['fp-arena-log-channel']}>{CHANNEL_LABEL[event.channel]}</span>
            <span>{event.message}</span>
          </li>
        ))}
      </ol>
    </section>
  );
};

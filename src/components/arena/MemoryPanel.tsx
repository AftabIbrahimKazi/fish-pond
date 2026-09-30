'use client';

/**
 * Memory panel: the fish's short-term memory with a visible countdown per entry,
 * a memory-span control and a clear button.
 */

import React from 'react';

import { ArenaTelemetry } from '../../types/arena';
import {
  AVOID_VALENCE,
  FOOD_ACCEPT_VALENCE,
  MAX_MEMORY_SPAN_SECONDS,
  MIN_MEMORY_SPAN_SECONDS,
} from '../../simulation/arena/arena-constants';
import { getStimulusDefinition } from '../../simulation/arena/stimulus-catalog';

import styles from './arena.module.css';

interface MemoryPanelProps {
  telemetry: ArenaTelemetry | null;
  spanSeconds: number;
  onSpanChange: (spanSeconds: number) => void;
  onClear: () => void;
}

const MEMORY_SPAN_STEP = 1 as const;
const PERCENT = 100 as const;

function resolveValenceTone(valence: number): 'food' | 'threat' | 'neutral' {
  if (valence >= FOOD_ACCEPT_VALENCE) return 'food';
  if (valence <= AVOID_VALENCE) return 'threat';
  return 'neutral';
}

const VALENCE_LABEL: Record<'food' | 'threat' | 'neutral', string> = {
  food: 'trusted',
  threat: 'feared',
  neutral: 'harmless',
};

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ telemetry, spanSeconds, onSpanChange, onClear }) => {
  const entries = telemetry?.memory ?? [];

  return (
    <section
      aria-labelledby="fp-arena-memory-title"
      className={`${styles['fp-arena-panel']} d-flex flex-column gap-[var(--fp-space-default)] p-[var(--fp-space-md)]`}
      data-surface="flat"
      data-panel="memory"
    >
      <header className="d-flex align-items-center justify-content-between">
        <h2 id="fp-arena-memory-title" className={styles['fp-arena-panel-title']}>Short-term memory</h2>
        <button type="button" className={`${styles['fp-arena-button']} px-[var(--fp-space-sm)] py-[var(--fp-space-xxs)]`} onClick={onClear}>
          Clear
        </button>
      </header>

      <label className="d-flex flex-column gap-[var(--fp-space-xxs)]">
        <span className={styles['fp-arena-meter-label']}>Memory span: {spanSeconds} s</span>
        <input
          type="range"
          className={styles['fp-arena-range']}
          min={MIN_MEMORY_SPAN_SECONDS}
          max={MAX_MEMORY_SPAN_SECONDS}
          step={MEMORY_SPAN_STEP}
          value={spanSeconds}
          onChange={(event) => onSpanChange(Number(event.target.value))}
        />
      </label>

      {entries.length === 0 ? (
        <p className={styles['fp-arena-memory-empty']}>Nothing remembered. Every object is new to the fish.</p>
      ) : (
        <ul className={`${styles['fp-arena-list']} d-flex flex-column gap-[var(--fp-space-sm)]`}>
          {entries.map((entry) => {
            const definition = getStimulusDefinition(entry.kind);
            const tone = resolveValenceTone(entry.valence);
            return (
              <li key={entry.kind} className={`${styles['fp-arena-memory-item']} d-flex flex-column gap-[var(--fp-space-xxs)] p-[var(--fp-space-sm)]`}>
                <div className="d-flex align-items-center justify-content-between">
                  <span className={styles['fp-arena-line']}>
                    <span aria-hidden="true">{definition.icon}</span> {definition.label}
                  </span>
                  <span className={styles['fp-arena-memory-tag-ts']} data-tone={tone}>{VALENCE_LABEL[tone]}</span>
                </div>
                <progress
                  className={styles['fp-arena-gauge']}
                  data-tone="telemetry"
                  max={entry.spanSeconds}
                  value={Math.max(0, entry.remainingSeconds)}
                  aria-label={`${definition.label} memory time left`}
                />
                <span className={styles['fp-arena-line-note']}>
                  forgotten in {Math.ceil(entry.remainingSeconds)} s · familiarity {Math.round(entry.familiarity * PERCENT)}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

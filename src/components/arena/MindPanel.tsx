'use client';

/**
 * Mind panel: the fish's internal state (hunger, fear, curiosity), what System 1 is
 * doing, and how far System 2's deliberation has got.
 */

import React from 'react';

import { AppraisalPhase, ArenaMode, ArenaTelemetry } from '../../types/arena';
import { getStimulusDefinition } from '../../simulation/arena/stimulus-catalog';

import styles from './arena.module.css';

interface MindPanelProps {
  telemetry: ArenaTelemetry | null;
}

interface MeterSpec {
  key: string;
  label: string;
  tone: string;
  value: number;
}

const PHASE_ORDER: AppraisalPhase[] = [
  AppraisalPhase.NOTICE,
  AppraisalPhase.APPROACH,
  AppraisalPhase.INSPECT,
  AppraisalPhase.PROBE,
  AppraisalPhase.VERDICT,
];

const MODE_LABEL: Record<ArenaMode, string> = {
  [ArenaMode.IDLE]: 'Idle',
  [ArenaMode.S1_REFLEX]: 'Instinct',
  [ArenaMode.S2_DELIBERATING]: 'Deliberating',
  [ArenaMode.S1_OVERRIDE]: 'Instinct override',
  [ArenaMode.LOCKOUT]: 'Recovering',
};

const PERCENT = 100 as const;

function resolveStepState(phase: AppraisalPhase | null, step: AppraisalPhase): 'done' | 'active' | 'todo' {
  if (!phase) return 'todo';
  const current = PHASE_ORDER.indexOf(phase);
  const index = PHASE_ORDER.indexOf(step);
  if (index < current) return 'done';
  return index === current ? 'active' : 'todo';
}

export const MindPanel: React.FC<MindPanelProps> = ({ telemetry }) => {
  const mode = telemetry?.mode ?? ArenaMode.IDLE;
  const appraisal = telemetry?.appraisal;
  const meters: MeterSpec[] = [
    { key: 'hunger', label: 'Hunger', tone: 'food', value: telemetry?.hunger ?? 0 },
    { key: 'fear', label: 'Fear', tone: 'threat', value: telemetry?.fear ?? 0 },
    { key: 'curiosity', label: 'Curiosity', tone: 'calm', value: telemetry?.curiosity ?? 0 },
  ];
  const targetLabel = appraisal?.targetKind ? getStimulusDefinition(appraisal.targetKind).label : null;

  return (
    <section
      aria-labelledby="fp-arena-mind-title"
      className={`${styles['fp-arena-panel']} d-flex flex-column gap-[var(--fp-space-default)] p-[var(--fp-space-md)]`}
      data-surface="flat"
      data-panel="mind"
    >
      <header className="d-flex align-items-center justify-content-between">
        <h2 id="fp-arena-mind-title" className={styles['fp-arena-panel-title']}>Fish mind</h2>
        <span className={styles['fp-arena-chip-ts']} data-mode={mode}>{MODE_LABEL[mode]}</span>
      </header>

      <div className="d-flex flex-column gap-[var(--fp-space-xs)]">
        {meters.map((meter) => (
          <label key={meter.key} className={`${styles['fp-arena-meter-row']} d-grid gap-[var(--fp-space-xs)]`}>
            <span className={styles['fp-arena-meter-label']}>{meter.label}</span>
            <progress
              className={styles['fp-arena-gauge']}
              data-tone={meter.tone}
              max={1}
              value={meter.value}
              aria-label={meter.label}
            />
            <span className={styles['fp-arena-meter-value']}>{Math.round(meter.value * PERCENT)}%</span>
          </label>
        ))}
      </div>

      <div className={`${styles['fp-arena-block']} d-flex flex-column gap-[var(--fp-space-xxs)] p-[var(--fp-space-default)]`} data-system="S1">
        <h3 className={styles['fp-arena-block-title']}>System 1 · instinct</h3>
        <p className={styles['fp-arena-line']}>
          {telemetry?.s1Label ?? 'Idle'}
          {telemetry && telemetry.s1LatencyMs > 0 && (
            <span className={styles['fp-arena-line-note']}> · reacted in {telemetry.s1LatencyMs} ms</span>
          )}
        </p>
      </div>

      <div className={`${styles['fp-arena-block']} d-flex flex-column gap-[var(--fp-space-xs)] p-[var(--fp-space-default)]`} data-system="S2">
        <h3 className={styles['fp-arena-block-title']}>System 1+2 · deliberation</h3>
        {appraisal?.phase ? (
          <>
            <p className={styles['fp-arena-line']}>
              {targetLabel}
              {appraisal.verdict === null && (
                <span className={styles['fp-arena-line-note']}> · {appraisal.remainingSeconds.toFixed(1)} s left</span>
              )}
            </p>
            <progress
              className={styles['fp-arena-gauge']}
              data-tone="telemetry"
              max={1}
              value={appraisal.progress}
              aria-label="Deliberation progress"
            />
            <ol className={`${styles['fp-arena-list']} ${styles['fp-arena-steps']} d-flex flex-wrap justify-content-between gap-[var(--fp-space-xxs)]`}>
              {PHASE_ORDER.map((step) => (
                <li
                  key={step}
                  className={styles['fp-arena-step-ts']}
                  data-step-state={resolveStepState(appraisal.phase, step)}
                >
                  {step.toLowerCase()}
                </li>
              ))}
            </ol>
            {appraisal.verdict && (
              <p className={styles['fp-arena-verdict-ts']} data-verdict={appraisal.verdict} aria-live="polite">
                Verdict: {appraisal.verdict} · {Math.round(appraisal.confidence * PERCENT)}% sure
              </p>
            )}
          </>
        ) : (
          <p className={styles['fp-arena-line']}>Nothing unfamiliar in sight</p>
        )}
      </div>
    </section>
  );
};

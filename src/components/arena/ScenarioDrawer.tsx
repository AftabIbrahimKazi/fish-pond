'use client';

/**
 * Scenario drawer: one-click scripted scenarios that exercise the System 1 / System 2 arbitration.
 */

import React from 'react';

import { SCENARIOS } from '../../simulation/arena/scenarios';

import styles from './arena.module.css';

interface ScenarioDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  onRun: (scenarioId: string) => void;
}

export const ScenarioDrawer: React.FC<ScenarioDrawerProps> = ({ isOpen, onToggle, onRun }) => {
  return (
    <section
      aria-labelledby="fp-arena-scenarios-title"
      className={`${styles['fp-arena-panel']} d-flex flex-column gap-[var(--fp-space-default)] p-[var(--fp-space-md)]`}
      data-panel="scenarios"
    >
      <h2 id="fp-arena-scenarios-title" className={styles['fp-arena-panel-title']}>
        <button
          type="button"
          className={`${styles['fp-arena-disclosure-ts']} d-flex align-items-center justify-content-between w-100`}
          aria-expanded={isOpen}
          aria-controls="fp-arena-scenario-list"
          onClick={onToggle}
        >
          <span>Scenarios</span>
          <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
        </button>
      </h2>
      <ul
        id="fp-arena-scenario-list"
        className={`${styles['fp-arena-list']} ${styles['fp-arena-scenario-list-ts']} d-flex flex-column gap-[var(--fp-space-sm)]`}
        data-open-state={isOpen ? 'open' : 'closed'}
      >
        {SCENARIOS.map((scenario) => (
          <li key={scenario.id}>
            <button
              type="button"
              className={`${styles['fp-arena-scenario-button']} d-flex flex-column w-100 gap-[var(--fp-space-xxs)] px-[var(--fp-space-default)] py-[var(--fp-space-sm)]`}
              onClick={() => onRun(scenario.id)}
            >
              <span className={styles['fp-arena-line']}>▶ {scenario.label}</span>
              <span className={styles['fp-arena-line-note']}>{scenario.summary}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

'use client';

/**
 * Fish Pond: Architectural Benchmark Specification Runner.
 * File 4: The Side-by-Side Combined Benchmark Interface.
 * Orchestrates synchronized telemetry streams across 3 control architectures.
 */

import React, { useCallback, useRef, useState } from 'react';

import { BenchmarkViewport } from '../../components/BenchmarkViewport';
import { telemetryBus } from '../../simulation/telemetry-bus';
import { BenchmarkCase, InputMode } from '../../types/benchmark';

import styles from './dashboard.module.css';

const NDC_SPAN = 2 as const;

interface MatrixRow {
  feature: string;
  reflex: string;
  lottery: string;
  organism: string;
}

const MATRIX_ROWS: MatrixRow[] = [
  {
    feature: 'Decision Mechanism',
    reflex: 'Binary threshold tree (if/else)',
    lottery: 'Weighted lottery over preset dictionary',
    organism: 'Continuous multi-axis mathematical reasoning',
  },
  {
    feature: 'Transition Fidelity',
    reflex: 'Instant snapping, jagged discontinuities',
    lottery: 'Smooth lerping between fixed designer presets',
    organism: 'Dynamic continuous posturing & organic muscular tension',
  },
  {
    feature: 'Hand + Food Conflict State',
    reflex: 'Rigid threat override (no nuance)',
    lottery: 'Anxious-Freeze mood selection',
    organism: 'Ambivalent hesitation balancing hunger vs. survival',
  },
  {
    feature: 'Main-Thread Performance',
    reflex: '60 FPS (Zero CPU deformation)',
    lottery: '60 FPS (GPU vertex deform)',
    organism: '60 FPS (Sandboxed multi-axis vector solver)',
  },
];

function describeBanner(inputMode: InputMode, isThreatActive: boolean): string {
  if (inputMode !== 'INTERACTIVE') {
    return 'Automated Benchmark Running: Pre-recorded coordinate sequence piped concurrently to all viewports';
  }
  return isThreatActive
    ? 'Hand Threat Active: Move cursor to steer threat vector. Use the Drop Food Pellet button, or click a pond, to drop food'
    : 'Interactive Telemetry Area: Move mouse here to simulate descending hand threat';
}

export default function BenchmarkDashboard() {
  const [inputMode, setInputMode] = useState<InputMode>('INTERACTIVE');
  const [isThreatActive, setIsThreatActive] = useState(false);
  const interactionAreaRef = useRef<HTMLDivElement | null>(null);

  const handleModeChange = useCallback((newMode: InputMode): void => {
    setInputMode(newMode);
    telemetryBus.setMode(newMode);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>): void => {
    if (inputMode !== 'INTERACTIVE') return;
    const target = interactionAreaRef.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const xNorm = ((event.clientX - rect.left) / rect.width) * NDC_SPAN - 1;
    const yNorm = ((event.clientY - rect.top) / rect.height) * NDC_SPAN - 1;

    setIsThreatActive(true);
    telemetryBus.setInteractiveThreat(xNorm, yNorm, true);
  }, [inputMode]);

  const handleMouseLeave = useCallback((): void => {
    if (inputMode !== 'INTERACTIVE') return;
    setIsThreatActive(false);
    telemetryBus.setInteractiveThreat(0, 0, false);
  }, [inputMode]);

  const handleDropFood = useCallback((): void => {
    telemetryBus.dropFood();
  }, []);

  const handleClearFood = useCallback((): void => {
    telemetryBus.clearFood();
  }, []);

  const modeButtonClass = `${styles['fp-dashboard-mode-button-ts']} px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`;
  const actionButtonClass = `${styles['fp-dashboard-action-button']} px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`;

  return (
    <div className={`${styles['fp-dashboard']} d-flex flex-column`}>
      {/* Benchmark Header */}
      <header className={`${styles['fp-dashboard-header']} px-[var(--fp-space-xl)] py-[var(--fp-space-md)]`}>
        <div
          className={`${styles['fp-dashboard-header-inner']} d-flex flex-wrap justify-content-between align-items-center gap-[var(--fp-space-md)] mx-auto`}
        >
          <div>
            <div className="d-flex align-items-center gap-[var(--fp-space-default)]">
              <span className={styles['fp-dashboard-icon']} aria-hidden="true">🐟</span>
              <h1 className={styles['fp-dashboard-title']}>
                Fish in a Pond — Visual Telemetry Benchmark
              </h1>
            </div>
            <p className={`${styles['fp-dashboard-tagline']} mt-[var(--fp-space-xxxs)]`}>
              Empirical visual comparison of 3 control architectures running identical procedural scenes via Triforge & Strata CSS.
            </p>
          </div>

          {/* Centralized Telemetry Injection Toolbar */}
          <div className="d-flex align-items-center flex-wrap gap-[var(--fp-space-default)]">
            <div className={`${styles['fp-dashboard-toggle']} d-flex`}>
              <button
                type="button"
                className={modeButtonClass}
                data-mode="INTERACTIVE"
                data-mode-state={inputMode === 'INTERACTIVE' ? 'active' : 'idle'}
                aria-pressed={inputMode === 'INTERACTIVE'}
                onClick={() => handleModeChange('INTERACTIVE')}
              >
                <span aria-hidden="true">🎮</span> Interactive Cursor
              </button>
              <button
                type="button"
                className={modeButtonClass}
                data-mode="AUTOMATED_BENCHMARK"
                data-mode-state={inputMode === 'AUTOMATED_BENCHMARK' ? 'active' : 'idle'}
                aria-pressed={inputMode === 'AUTOMATED_BENCHMARK'}
                onClick={() => handleModeChange('AUTOMATED_BENCHMARK')}
              >
                <span aria-hidden="true">⏱️</span> Synchronized Test Cycle
              </button>
            </div>

            <button
              type="button"
              className={actionButtonClass}
              data-action="food"
              onClick={handleDropFood}
            >
              <span aria-hidden="true">🍤</span> Drop Food Pellet
            </button>

            <button
              type="button"
              className={actionButtonClass}
              data-action="clear"
              onClick={handleClearFood}
            >
              Clear
            </button>
          </div>
        </div>
      </header>

      {/* Main Benchmark Comparison Area */}
      <main
        className={`${styles['fp-dashboard-main']} d-flex flex-column flex-grow-1 w-100 mx-auto p-[var(--fp-space-lg)] gap-[var(--fp-space-lg)]`}
      >
        {/* Synchronized Interaction Surface Banner */}
        <div
          ref={interactionAreaRef}
          className={`${styles['fp-dashboard-banner-ts']} d-flex align-items-center justify-content-between px-[var(--fp-space-md)] py-[var(--fp-space-default)]`}
          data-input-mode={inputMode}
          data-threat-state={isThreatActive ? 'active' : 'idle'}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="d-flex align-items-center gap-[var(--fp-space-sm)]">
            <span aria-hidden="true">{isThreatActive ? '🖐️' : '🎯'}</span>
            <span className={styles['fp-dashboard-banner-text']}>
              {describeBanner(inputMode, isThreatActive)}
            </span>
          </div>
          <span className={styles['fp-dashboard-pipeline']}>PIPELINE: BUS BROADCAST (3 VIEWPORTS)</span>
        </div>

        {/* 3-Viewport Synchronized Side-by-Side Comparison Grid */}
        <div className={`${styles['fp-dashboard-grid']} d-grid gap-[var(--fp-space-lg)]`}>
          {/* Viewport 1: Case 1 System 0 Reflex */}
          <BenchmarkViewport
            caseType={BenchmarkCase.SYSTEM_0_REFLEX}
            title="Case 1: Programmed Reflex"
            architectureSubtitle="Static Threshold Tree (Binary Snapping)"
            badgeLabel="System 0"
          />

          {/* Viewport 2: Case 2 Hybrid S1 Lottery */}
          <BenchmarkViewport
            caseType={BenchmarkCase.SYSTEM_1_LOTTERY}
            title="Case 2: Intuitive Preset Lottery"
            architectureSubtitle="Laya-AI (System 1) + Dynamic Preset Lerp"
            badgeLabel="System 1"
          />

          {/* Viewport 3: Case 3 Dual-Process Autonomous Organism */}
          <BenchmarkViewport
            caseType={BenchmarkCase.SYSTEM_2_DUAL_PROCESS}
            title="Case 3: Autonomous Organism"
            architectureSubtitle="Dual-Process: System 1 Intent + ReasonLite Multi-Axis"
            badgeLabel="Dual-Process"
          />
        </div>

        {/* Empirical Comparison Analysis Card */}
        <section className={`${styles['fp-dashboard-matrix']} p-[var(--fp-space-lg)]`}>
          <h2 className={`${styles['fp-dashboard-matrix-title']} mb-[var(--fp-space-default)]`}>
            Empirical Architecture Comparison Matrix
          </h2>
          <div className="overflow-x-auto">
            <table className={styles['fp-dashboard-table']}>
              <thead>
                <tr>
                  <th scope="col">Feature / Characteristic</th>
                  <th scope="col" data-case={BenchmarkCase.SYSTEM_0_REFLEX}>Case 1: System 0 (Reflex)</th>
                  <th scope="col" data-case={BenchmarkCase.SYSTEM_1_LOTTERY}>Case 2: System 1 (Preset Lottery)</th>
                  <th scope="col" data-case={BenchmarkCase.SYSTEM_2_DUAL_PROCESS}>Case 3: Dual-Process (Organism)</th>
                </tr>
              </thead>
              <tbody>
                {MATRIX_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <td>{row.feature}</td>
                    <td>{row.reflex}</td>
                    <td>{row.lottery}</td>
                    <td>{row.organism}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className={`${styles['fp-dashboard-footer']} d-flex justify-content-between align-items-center px-[var(--fp-space-xl)] py-[var(--fp-space-default)]`}
      >
        <span>Fish Pond Benchmark Suite — Next.js 16 + Triforge + Strata CSS</span>
        <span>Physical Safety Clamping: ACTIVE (All Viewports)</span>
      </footer>
    </div>
  );
}

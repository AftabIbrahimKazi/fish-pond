'use client';

/**
 * Fish Pond: Architectural Benchmark Specification Runner.
 * File 4: The Side-by-Side Combined Benchmark Interface.
 * Orchestrates synchronized telemetry streams across 3 control architectures.
 */

import React, { useCallback, useRef, useState } from 'react';

import { BenchmarkViewport } from '../../components/BenchmarkViewport';
import {
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  FishIcon,
  FoodIcon,
  PointerIcon,
  TableIcon,
  TimerIcon,
  TrashIcon,
} from '../../components/HudIcons';
import { AiNotice } from '../../components/AiNotice';
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
    organism: 'Continuous multi-axis blending of threat and food intent',
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
  if (inputMode !== 'INTERACTIVE') return 'Test cycle running · every pond gets the same inputs';
  return isThreatActive ? 'Threat active · click a pond to drop food' : 'Move the cursor over the ponds to steer a threat';
}

export default function BenchmarkDashboard() {
  const [inputMode, setInputMode] = useState<InputMode>('INTERACTIVE');
  const [isThreatActive, setIsThreatActive] = useState(false);
  const [isHudHidden, setIsHudHidden] = useState(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const interactionAreaRef = useRef<HTMLElement | null>(null);

  const handleModeChange = useCallback((newMode: InputMode): void => {
    setInputMode(newMode);
    telemetryBus.setMode(newMode);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLElement>): void => {
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

  const modeButtonClass = `${styles['fp-dashboard-mode-button-ts']} d-inline-flex align-items-center gap-[var(--fp-space-xs)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`;
  const actionButtonClass = `${styles['fp-dashboard-action-button']} d-inline-flex align-items-center gap-[var(--fp-space-xs)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`;

  return (
    <div className={`${styles['fp-dashboard']} d-flex flex-column position-relative`} data-hud-state={isHudHidden ? 'hidden' : 'visible'}>
      {/* Floating header: title, live hint and controls, straight on the scene */}
      <header className={`${styles['fp-dashboard-header']} d-flex justify-content-between align-items-center gap-[var(--fp-space-md)] px-[var(--fp-space-md)]`}>
        <div className={`${styles['fp-dashboard-heading']} d-flex flex-column gap-[var(--fp-space-xxs)]`}>
          <div className={`${styles['fp-dashboard-title-row']} d-flex align-items-center gap-[var(--fp-space-sm)]`}>
            <span className={styles['fp-dashboard-icon']}><FishIcon /></span>
            <h1 className={styles['fp-dashboard-title']}>Fish in a Pond — Visual Telemetry Benchmark</h1>
            <AiNotice kind="scripted" isShort />
          </div>
          <p
            className={styles['fp-dashboard-hint-ts']}
            data-threat-state={isThreatActive ? 'active' : 'idle'}
            role="status"
          >
            {describeBanner(inputMode, isThreatActive)}
          </p>
        </div>

        <div className={`${styles['fp-dashboard-controls']} d-flex align-items-center gap-[var(--fp-space-sm)]`}>
          <div className={`${styles['fp-dashboard-toggle']} d-flex`}>
            <button
              type="button"
              className={modeButtonClass}
              data-mode="INTERACTIVE"
              data-mode-state={inputMode === 'INTERACTIVE' ? 'active' : 'idle'}
              aria-label="Interactive cursor"
              aria-pressed={inputMode === 'INTERACTIVE'}
              onClick={() => handleModeChange('INTERACTIVE')}
            >
              <PointerIcon />
              <span className={styles['fp-dashboard-chip-label']}>Cursor</span>
            </button>
            <button
              type="button"
              className={modeButtonClass}
              data-mode="AUTOMATED_BENCHMARK"
              data-mode-state={inputMode === 'AUTOMATED_BENCHMARK' ? 'active' : 'idle'}
              aria-label="Synchronized test cycle"
              aria-pressed={inputMode === 'AUTOMATED_BENCHMARK'}
              onClick={() => handleModeChange('AUTOMATED_BENCHMARK')}
            >
              <TimerIcon />
              <span className={styles['fp-dashboard-chip-label']}>Test cycle</span>
            </button>
          </div>

          <button type="button" className={actionButtonClass} data-action="food" aria-label="Drop food" onClick={handleDropFood}>
            <FoodIcon />
            <span className={styles['fp-dashboard-chip-label']}>Drop food</span>
          </button>

          <button type="button" className={actionButtonClass} data-action="clear" aria-label="Clear food" onClick={handleClearFood}>
            <TrashIcon />
            <span className={styles['fp-dashboard-chip-label']}>Clear</span>
          </button>

          <button
            type="button"
            className={actionButtonClass}
            data-action="compare"
            aria-label="Compare architectures"
            aria-expanded={isMatrixOpen}
            aria-controls="fp-dashboard-matrix"
            onClick={() => setIsMatrixOpen((current) => !current)}
          >
            {isMatrixOpen ? <CloseIcon /> : <TableIcon />}
            <span className={styles['fp-dashboard-chip-label']}>Compare</span>
          </button>
        </div>
      </header>

      {/* Three full-bleed viewports; the whole surface steers the interactive threat */}
      <main
        ref={interactionAreaRef}
        className={`${styles['fp-dashboard-grid']} d-grid w-100`}
        data-input-mode={inputMode}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <BenchmarkViewport
          caseType={BenchmarkCase.SYSTEM_0_REFLEX}
          title="Case 1: Programmed Reflex"
          architectureSubtitle="Static Threshold Tree (no AI)"
          badgeLabel="System 0"
          isHudHidden={isHudHidden}
        />
        <BenchmarkViewport
          caseType={BenchmarkCase.SYSTEM_1_LOTTERY}
          title="Case 2: Intuitive Preset Lottery"
          architectureSubtitle="Weighted Preset Lottery + Lerp (no AI)"
          badgeLabel="System 1"
          isHudHidden={isHudHidden}
        />
        <BenchmarkViewport
          caseType={BenchmarkCase.SYSTEM_2_DUAL_PROCESS}
          title="Case 3: Autonomous Organism"
          architectureSubtitle="Blended Threat / Food Intent (no AI)"
          badgeLabel="Dual-Process"
          isHudHidden={isHudHidden}
        />
      </main>

      {/* Comparison matrix: a glass pane that opens on demand */}
      <aside
        id="fp-dashboard-matrix"
        className={`${styles['fp-dashboard-matrix-ts']} d-flex flex-column gap-[var(--fp-space-md)] p-[var(--fp-space-xl)]`}
        data-state={isMatrixOpen ? 'open' : 'closed'}
        aria-label="Architecture comparison"
      >
        <h2 className={styles['fp-dashboard-matrix-title']}>Empirical Architecture Comparison Matrix</h2>
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
        <p className={styles['fp-dashboard-note']}>
          Fish Pond Benchmark Suite — Next.js 16 + Triforge + Strata CSS · all three controllers are scripted code, no AI model · Physical Safety Clamping: ACTIVE (all viewports)
        </p>
      </aside>

      <button
        type="button"
        className={`${styles['fp-dashboard-hud-toggle']} d-inline-flex align-items-center justify-content-center gap-[var(--fp-space-xs)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`}
        aria-pressed={isHudHidden}
        onClick={() => setIsHudHidden((current) => !current)}
      >
        {isHudHidden ? <EyeIcon /> : <EyeOffIcon />}
        {isHudHidden ? 'Show HUD' : 'Hide HUD'}
      </button>
    </div>
  );
}

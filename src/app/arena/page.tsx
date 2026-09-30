'use client';

/**
 * Cognitive Arena page.
 * One full-screen pond, one fish. System 1 (instinct) handles known stimuli in a
 * heartbeat; System 1+2 deliberates about unknown ones. System 1 always wins a conflict.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { ArenaScene } from '../../components/arena/ArenaScene';
import { ArenaToolbar } from '../../components/arena/ArenaToolbar';
import { DecisionTimeline } from '../../components/arena/DecisionTimeline';
import { MemoryPanel } from '../../components/arena/MemoryPanel';
import { MindPanel } from '../../components/arena/MindPanel';
import { ScenarioDrawer } from '../../components/arena/ScenarioDrawer';
import { StimulusPalette } from '../../components/arena/StimulusPalette';
import { buildArenaController } from '../../simulation/arena/arena-controller';
import { STIMULUS_DEFINITIONS, getStimulusDefinition } from '../../simulation/arena/stimulus-catalog';
import { ArenaTelemetry, StimulusKind } from '../../types/arena';

import styles from '../../components/arena/arena.module.css';

type ArenaTab = 'palette' | 'scenarios' | 'mind' | 'memory' | 'log';

interface TabSpec {
  key: ArenaTab;
  label: string;
}

const TABS: TabSpec[] = [
  { key: 'palette', label: 'Stimuli' },
  { key: 'scenarios', label: 'Scenarios' },
  { key: 'mind', label: 'Mind' },
  { key: 'memory', label: 'Memory' },
  { key: 'log', label: 'Log' },
];

const INSTANT_KINDS: StimulusKind[] = [StimulusKind.TAP, StimulusKind.FLASH];
const INSTANT_POSITION = { x: 0, y: 0, z: 0 } as const;

export default function ArenaPage() {
  const [controller] = useState(() => buildArenaController());
  const [telemetry, setTelemetry] = useState<ArenaTelemetry | null>(null);
  const [armedKind, setArmedKind] = useState<StimulusKind | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [isFlashing, setIsFlashing] = useState(false);
  const [memorySpan, setMemorySpan] = useState(() => controller.getMemorySpan());
  const [activeTab, setActiveTab] = useState<ArenaTab>('palette');
  const [isScenariosOpen, setIsScenariosOpen] = useState(false);

  const handleSelectStimulus = useCallback((kind: StimulusKind): void => {
    if (INSTANT_KINDS.includes(kind)) {
      controller.spawnStimulus(kind, { ...INSTANT_POSITION });
      return;
    }
    setArmedKind((current) => (current === kind ? null : kind));
  }, [controller]);

  const handlePlace = useCallback((kind: StimulusKind, x: number, z: number): void => {
    controller.spawnStimulus(kind, { x, y: 0, z });
  }, [controller]);

  const handleReset = useCallback((): void => {
    controller.resetArena();
    setArmedKind(null);
    setTelemetry(null);
  }, [controller]);

  const handleSpanChange = useCallback((spanSeconds: number): void => {
    setMemorySpan(spanSeconds);
    controller.setMemorySpan(spanSeconds);
  }, [controller]);

  const handleRunScenario = useCallback((scenarioId: string): void => {
    controller.startScenario(scenarioId);
    setActiveTab('log');
  }, [controller]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement; // keydown always originates from an element
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

      if (event.key === 'Escape') {
        setArmedKind(null);
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        setIsPaused((current) => !current);
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        handleReset();
        return;
      }
      const definition = STIMULUS_DEFINITIONS.find((entry) => entry.hotkey === event.key);
      if (definition) {
        handleSelectStimulus(definition.kind);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleReset, handleSelectStimulus]);

  return (
    <div
      className={`${styles['fp-arena']} position-relative w-100 overflow-hidden`}
      data-active-tab={activeTab}
    >
      <ArenaScene
        controller={controller}
        armedKind={armedKind}
        isPaused={isPaused}
        simSpeed={simSpeed}
        onTelemetry={setTelemetry}
        onFlashChange={setIsFlashing}
        onPlace={handlePlace}
      />

      <div
        className={`${styles['fp-arena-flash-ts']} position-absolute`}
        data-flash-state={isFlashing ? 'active' : 'idle'}
        aria-hidden="true"
      />

      <ArenaToolbar
        timeSeconds={telemetry?.timeSeconds ?? 0}
        isPaused={isPaused}
        simSpeed={simSpeed}
        onTogglePause={() => setIsPaused((current) => !current)}
        onSpeedChange={setSimSpeed}
        onReset={handleReset}
      />

      <p
        className={`${styles['fp-arena-hint-ts']} position-absolute px-[var(--fp-space-md)] py-[var(--fp-space-xs)]`}
        data-armed-state={armedKind ? 'armed' : 'idle'}
        role="status"
      >
        {armedKind
          ? `Placing ${getStimulusDefinition(armedKind).label.toLowerCase()}: click the water · Esc to cancel`
          : ''}
      </p>

      <div className={`${styles['fp-arena-left']} position-absolute d-flex flex-column gap-[var(--fp-space-default)]`}>
        <StimulusPalette armedKind={armedKind} onSelect={handleSelectStimulus} />
        <ScenarioDrawer
          isOpen={isScenariosOpen}
          onToggle={() => setIsScenariosOpen((current) => !current)}
          onRun={handleRunScenario}
        />
      </div>

      <div className={`${styles['fp-arena-right']} position-absolute d-flex flex-column gap-[var(--fp-space-default)]`}>
        <MindPanel telemetry={telemetry} />
        <MemoryPanel
          telemetry={telemetry}
          spanSeconds={memorySpan}
          onSpanChange={handleSpanChange}
          onClear={() => controller.clearMemory()}
        />
      </div>

      <div className={`${styles['fp-arena-bottom']} position-absolute`}>
        <DecisionTimeline telemetry={telemetry} />
      </div>

      <nav
        aria-label="Panels"
        className={`${styles['fp-arena-tabs']} position-absolute justify-content-around`}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles['fp-arena-tab-ts']} px-[var(--fp-space-sm)] py-[var(--fp-space-default)]`}
            data-tab-state={activeTab === tab.key ? 'active' : 'idle'}
            aria-pressed={activeTab === tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === 'scenarios') setIsScenariosOpen(true);
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

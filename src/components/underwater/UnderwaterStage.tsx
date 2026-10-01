'use client';

/**
 * Underwater Stage.
 * Full-viewport underwater scene with its HUD: title, settings sidebar, fish behaviour readout,
 * hints and a button that hides or shows the whole HUD.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { LAYA_DOWNLOAD_MEGABYTES } from '../../simulation/underwater/ai/laya-constants';
import { SCENE_DEFAULTS } from '../../simulation/underwater/underwater-settings';
import { LayaStatus } from '../../types/laya';
import { FishFocusInfo, FishTelemetry, SceneSettings, SettingKey, UnderwaterLoadState } from '../../types/underwater';
import { FishTelemetryReadout } from './FishTelemetryReadout';
import { FishTooltip, FishTooltipHandle } from './FishTooltip';
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, FishIcon } from '../HudIcons';
import { UnderwaterCanvas } from './UnderwaterCanvas';
import { UnderwaterNavPad } from './UnderwaterNavPad';
import { UnderwaterSettingsPanel } from './UnderwaterSettingsPanel';
import { getStoredSettings, setStoredSettings } from './settings-storage';

import styles from './underwater.module.css';

const STATUS_COPY: Record<UnderwaterLoadState, string> = {
  [UnderwaterLoadState.LOADING]: 'Filling the tank…',
  [UnderwaterLoadState.READY]: '',
  [UnderwaterLoadState.ERROR]: 'This scene needs WebGL 2, which the browser could not start.',
};
const PERCENT = 100 as const;
const MS_PER_SECOND = 1000 as const;
const AI_STORAGE_KEY = 'fp-laya-enabled' as const;
const CHIP_CLASS = 'd-inline-flex align-items-center justify-content-center gap-[var(--fp-space-xs)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]' as const;

export const UnderwaterStage: React.FC = () => {
  const [loadState, setLoadState] = useState<UnderwaterLoadState>(UnderwaterLoadState.LOADING);
  const [settings, setSettings] = useState<SceneSettings>(SCENE_DEFAULTS);
  const [fish, setFish] = useState<FishTelemetry[]>([]);
  const [isHudHidden, setIsHudHidden] = useState(false);
  const [virtualKeys, setVirtualKeys] = useState<string[]>([]);
  const [isRestored, setIsRestored] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [aiStatus, setAiStatus] = useState<LayaStatus>(LayaStatus.OFF);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiDecisionMs, setAiDecisionMs] = useState(0);
  const [focus, setFocus] = useState<FishFocusInfo | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: number; nonce: number } | null>(null);
  const tooltipRef = useRef<FishTooltipHandle | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = getStoredSettings();
      if (stored) setSettings(stored);
      try {
        setIsAiEnabled(window.localStorage.getItem(AI_STORAGE_KEY) === 'on');
      } catch {
        // blocked storage: Laya-AI simply starts off
      }
      setIsRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isRestored) setStoredSettings(settings);
  }, [isRestored, settings]);

  const handleChange = (key: SettingKey, value: number | string): void => {
    setSettings((current) => ({ ...current, [key]: value }) as SceneSettings); // the panel passes a value of the kind the key's definition declares
  };

  const handleReset = (): void => setSettings(SCENE_DEFAULTS);

  const handleAiStatusChange = (status: LayaStatus, downloadFraction: number, decisionMs: number): void => {
    setAiStatus(status);
    setAiProgress(downloadFraction);
    setAiDecisionMs(decisionMs);
  };

  const handleFishHover = (id: number): void => setFocusRequest((current) => ({ id, nonce: (current?.nonce ?? 0) + 1 }));

  const handleFocusMove = (x: number, y: number): void => tooltipRef.current?.place(x, y);

  const handleAiToggle = (): void => {
    const next = !isAiEnabled || aiStatus === LayaStatus.FAILED;
    setIsAiEnabled(next);
    try {
      window.localStorage.setItem(AI_STORAGE_KEY, next ? 'on' : 'off');
    } catch {
      // blocked storage: the choice only lasts for this visit
    }
  };

  const getAiLabel = (): string => {
    if (!isAiEnabled) return `Enable Laya-AI · ${LAYA_DOWNLOAD_MEGABYTES} MB download`;
    if (aiStatus === LayaStatus.DOWNLOADING) return `Laya-AI · downloading ${Math.round(aiProgress * PERCENT)}%`;
    if (aiStatus === LayaStatus.STARTING) return 'Laya-AI · starting…';
    if (aiStatus === LayaStatus.FAILED) return 'Laya-AI failed · retry';
    return aiDecisionMs > 0 ? `Laya-AI on · ${(aiDecisionMs / MS_PER_SECOND).toFixed(1)} s per decision` : 'Laya-AI on · thinking…';
  };

  return (
    <main
      className={`${styles['fp-underwater']} position-relative w-100 overflow-hidden`}
      data-hud-state={isHudHidden ? 'hidden' : 'visible'}
    >
      <UnderwaterCanvas onLoadStateChange={setLoadState} onFishTelemetry={setFish} settings={settings} isNavigable virtualKeys={virtualKeys} isAiEnabled={isAiEnabled} onAiStatusChange={handleAiStatusChange} onFishFocus={setFocus} onFishFocusMove={handleFocusMove} focusRequest={focusRequest} />

      <header className={`${styles['fp-underwater-header']} position-absolute d-flex align-items-start justify-content-between gap-[var(--fp-space-md)] p-[var(--fp-space-md)]`}>
        <div className="d-flex flex-column gap-[var(--fp-space-xxs)]">
          <h1 className={styles['fp-underwater-title']}>Underwater</h1>
          <p className={styles['fp-underwater-subtitle']}>Scene 03 · shaded and graded with Triforge</p>
        </div>
        <Link href="/" className={`${styles['fp-underwater-back']} ${CHIP_CLASS}`}>
          <ArrowLeftIcon />
          All experiments
        </Link>
      </header>

      <UnderwaterNavPad onKeysChange={setVirtualKeys} />

      <UnderwaterSettingsPanel settings={settings} onChange={handleChange} onReset={handleReset} />

      <FishTelemetryReadout fish={fish} focusedId={focus?.id ?? null} onFishHover={handleFishHover} />

      <FishTooltip ref={tooltipRef} info={focus} />

      <p className={`${styles['fp-underwater-hint']} position-absolute px-[var(--fp-space-md)] py-[var(--fp-space-xs)]`}>
        {isAiEnabled ? 'Click to drop fish food · Laya-AI decides what each fish does' : 'The fish only drift until Laya-AI is enabled · click to drop fish food'}
        <span className={styles['fp-underwater-keys-hint']}> · WASD to move · arrow keys to look</span>
      </p>

      <button
        type="button"
        className={`${styles['fp-underwater-chip-button']} ${styles['fp-underwater-ai-toggle']} ${CHIP_CLASS} position-absolute`}
        data-ai-status={isAiEnabled ? aiStatus : LayaStatus.OFF}
        aria-pressed={isAiEnabled}
        onClick={handleAiToggle}
      >
        <FishIcon />
        {getAiLabel()}
      </button>

      <button
        type="button"
        className={`${styles['fp-underwater-chip-button']} ${styles['fp-underwater-hud-toggle']} ${CHIP_CLASS} position-absolute`}
        aria-pressed={isHudHidden}
        onClick={() => setIsHudHidden((current) => !current)}
      >
        {isHudHidden ? <EyeIcon /> : <EyeOffIcon />}
        {isHudHidden ? 'Show HUD' : 'Hide HUD'}
      </button>

      <p
        className={`${styles['fp-underwater-status']} position-absolute px-[var(--fp-space-md)] py-[var(--fp-space-xs)]`}
        data-load-state={loadState}
        role="status"
      >
        {STATUS_COPY[loadState]}
      </p>
    </main>
  );
};

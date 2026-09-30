'use client';

/**
 * Underwater Stage.
 * Full-viewport underwater scene with its HUD: title, settings sidebar, fish behaviour readout,
 * hints and a button that hides or shows the whole HUD.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { SCENE_DEFAULTS } from '../../simulation/underwater/underwater-settings';
import { FishTelemetry, SceneSettings, SettingKey, UnderwaterLoadState } from '../../types/underwater';
import { FishTelemetryReadout } from './FishTelemetryReadout';
import { ArrowLeftIcon, EyeIcon, EyeOffIcon } from '../HudIcons';
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
const CHIP_CLASS = 'd-inline-flex align-items-center justify-content-center gap-[var(--fp-space-xs)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]' as const;

export const UnderwaterStage: React.FC = () => {
  const [loadState, setLoadState] = useState<UnderwaterLoadState>(UnderwaterLoadState.LOADING);
  const [settings, setSettings] = useState<SceneSettings>(SCENE_DEFAULTS);
  const [fish, setFish] = useState<FishTelemetry[]>([]);
  const [isHudHidden, setIsHudHidden] = useState(false);
  const [virtualKeys, setVirtualKeys] = useState<string[]>([]);
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = getStoredSettings();
      if (stored) setSettings(stored);
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

  return (
    <main
      className={`${styles['fp-underwater']} position-relative w-100 overflow-hidden`}
      data-hud-state={isHudHidden ? 'hidden' : 'visible'}
    >
      <UnderwaterCanvas onLoadStateChange={setLoadState} onFishTelemetry={setFish} settings={settings} isNavigable virtualKeys={virtualKeys} />

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

      <FishTelemetryReadout fish={fish} />

      <p className={`${styles['fp-underwater-hint']} position-absolute px-[var(--fp-space-md)] py-[var(--fp-space-xs)]`}>
        Click to drop fish food · keep the pointer away from a fish or it will dart off
        <span className={styles['fp-underwater-keys-hint']}> · WASD to move · arrow keys to look</span>
      </p>

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

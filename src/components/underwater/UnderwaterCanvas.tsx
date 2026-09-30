'use client';

/**
 * Underwater Canvas.
 * Hosts the WebGL canvas and ties the UnderwaterEngine lifecycle to the React lifecycle.
 */

import React, { useEffect, useRef, useState } from 'react';

import { UnderwaterEngine } from '../../simulation/underwater/underwater-engine';
import { FishTelemetry, SceneSettings, UnderwaterLoadState } from '../../types/underwater';

import styles from './underwater.module.css';

const NO_KEYS: readonly string[] = [];

interface UnderwaterCanvasProps {
  onLoadStateChange: (state: UnderwaterLoadState) => void;
  onFishTelemetry: (fish: FishTelemetry[]) => void;
  settings: SceneSettings;
  isNavigable?: boolean;
  isRevealedEarly?: boolean;
  virtualKeys?: readonly string[];
}

export const UnderwaterCanvas: React.FC<UnderwaterCanvasProps> = ({ onLoadStateChange, onFishTelemetry, settings, isNavigable = false, isRevealedEarly = false, virtualKeys = NO_KEYS }) => {
  const [isReady, setIsReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<UnderwaterEngine | null>(null);
  const callbackRef = useRef(onLoadStateChange);
  const telemetryRef = useRef(onFishTelemetry);
  const settingsRef = useRef(settings);

  useEffect(() => {
    callbackRef.current = onLoadStateChange;
    telemetryRef.current = onFishTelemetry;
  }, [onLoadStateChange, onFishTelemetry]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new UnderwaterEngine(
      canvas,
      {
        onLoadStateChange: (state: UnderwaterLoadState): void => {
          setIsReady(state === UnderwaterLoadState.READY);
          callbackRef.current(state);
        },
        onFishTelemetry: (fish: FishTelemetry[]): void => telemetryRef.current(fish),
      },
      settingsRef.current,
      { isNavigable, isRevealedEarly },
    );
    engineRef.current = engine;
    void engine.init();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [isNavigable, isRevealedEarly]);

  useEffect(() => {
    engineRef.current?.setVirtualKeys(virtualKeys);
  }, [virtualKeys]);

  useEffect(() => {
    settingsRef.current = settings;
    engineRef.current?.applySettings(settings);
  }, [settings]);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles['fp-underwater-canvas']} d-block position-absolute w-100 h-100`}
      data-ready-state={isReady ? 'ready' : 'loading'}
      role="img"
      aria-label="Underwater scene: two goldfish swimming above a sandy seabed with rocks, seagrass and shafts of sunlight"
    />
  );
};

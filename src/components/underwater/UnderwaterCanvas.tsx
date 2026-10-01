'use client';

/**
 * Underwater Canvas.
 * Hosts the WebGL canvas and ties the UnderwaterEngine lifecycle to the React lifecycle.
 */

import React, { useEffect, useRef, useState } from 'react';

import { UnderwaterEngine } from '../../simulation/underwater/underwater-engine';
import { LayaStatus } from '../../types/laya';
import { FishFocusInfo, FishTelemetry, SceneSettings, UnderwaterLoadState } from '../../types/underwater';

import styles from './underwater.module.css';

const NO_KEYS: readonly string[] = [];
const NO_AI_STATUS = (): void => undefined;
const NO_FOCUS_HANDLER = (): void => undefined;

interface UnderwaterCanvasProps {
  onLoadStateChange: (state: UnderwaterLoadState) => void;
  onFishTelemetry: (fish: FishTelemetry[]) => void;
  settings: SceneSettings;
  isNavigable?: boolean;
  isRevealedEarly?: boolean;
  virtualKeys?: readonly string[];
  isAiEnabled?: boolean;
  onAiStatusChange?: (status: LayaStatus, downloadFraction: number, decisionMs: number) => void;
  onFishFocus?: (info: FishFocusInfo | null) => void;
  onFishFocusMove?: (x: number, y: number) => void;
  focusRequest?: { id: number; nonce: number } | null;
}

export const UnderwaterCanvas: React.FC<UnderwaterCanvasProps> = ({ onLoadStateChange, onFishTelemetry, settings, isNavigable = false, isRevealedEarly = false, virtualKeys = NO_KEYS, isAiEnabled = false, onAiStatusChange = NO_AI_STATUS, onFishFocus = NO_FOCUS_HANDLER, onFishFocusMove = NO_FOCUS_HANDLER, focusRequest = null }) => {
  const [isReady, setIsReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<UnderwaterEngine | null>(null);
  const callbackRef = useRef(onLoadStateChange);
  const telemetryRef = useRef(onFishTelemetry);
  const settingsRef = useRef(settings);
  const aiStatusRef = useRef(onAiStatusChange);
  const focusRef = useRef(onFishFocus);
  const focusMoveRef = useRef(onFishFocusMove);
  const isAiEnabledRef = useRef(isAiEnabled);

  useEffect(() => {
    callbackRef.current = onLoadStateChange;
    telemetryRef.current = onFishTelemetry;
    aiStatusRef.current = onAiStatusChange;
    focusRef.current = onFishFocus;
    focusMoveRef.current = onFishFocusMove;
  }, [onLoadStateChange, onFishTelemetry, onAiStatusChange, onFishFocus, onFishFocusMove]);

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
        onAiStatusChange: (status, downloadFraction, decisionMs): void => aiStatusRef.current(status, downloadFraction, decisionMs),
        onFishFocus: (info: FishFocusInfo | null): void => focusRef.current(info),
        onFishFocusMove: (x: number, y: number): void => focusMoveRef.current(x, y),
      },
      settingsRef.current,
      { isNavigable, isRevealedEarly },
    );
    engineRef.current = engine;
    engine.setAiEnabled(isAiEnabledRef.current);
    void engine.init();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [isNavigable, isRevealedEarly]);

  useEffect(() => {
    isAiEnabledRef.current = isAiEnabled;
    engineRef.current?.setAiEnabled(isAiEnabled);
  }, [isAiEnabled]);

  useEffect(() => {
    if (focusRequest) engineRef.current?.focusFish(focusRequest.id);
  }, [focusRequest]);

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

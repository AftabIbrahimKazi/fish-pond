'use client';

/**
 * Underwater Canvas.
 * Hosts the WebGL canvas and ties the UnderwaterEngine lifecycle to the React lifecycle.
 */

import React, { useEffect, useRef } from 'react';

import { UnderwaterEngine } from '../../simulation/underwater/underwater-engine';
import { UnderwaterLoadState } from '../../types/underwater';

import styles from './underwater.module.css';

interface UnderwaterCanvasProps {
  onLoadStateChange: (state: UnderwaterLoadState) => void;
}

export const UnderwaterCanvas: React.FC<UnderwaterCanvasProps> = ({ onLoadStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const callbackRef = useRef(onLoadStateChange);

  useEffect(() => {
    callbackRef.current = onLoadStateChange;
  }, [onLoadStateChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new UnderwaterEngine(canvas, {
      onLoadStateChange: (state: UnderwaterLoadState): void => callbackRef.current(state),
    });
    void engine.init();

    return () => engine.destroy();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles['fp-underwater-canvas']} d-block position-absolute w-100 h-100`}
      role="img"
      aria-label="Underwater scene: two goldfish swimming above a sandy seabed with rocks, seagrass and shafts of sunlight"
    />
  );
};

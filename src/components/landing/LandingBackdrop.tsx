'use client';

/**
 * Landing Backdrop.
 * Runs the Underwater scene (with its tuned default settings) behind the landing page so every
 * route shares the same look.
 */

import React from 'react';

import { SCENE_DEFAULTS } from '../../simulation/underwater/underwater-settings';
import { UnderwaterCanvas } from '../underwater/UnderwaterCanvas';

import styles from './landing-backdrop.module.css';

const IGNORE_LOAD_STATE = (): void => undefined;
const IGNORE_TELEMETRY = (): void => undefined;

export const LandingBackdrop: React.FC = () => (
  <div className={`${styles['fp-landing-backdrop']} position-fixed`} aria-hidden="true">
    <UnderwaterCanvas onLoadStateChange={IGNORE_LOAD_STATE} onFishTelemetry={IGNORE_TELEMETRY} settings={SCENE_DEFAULTS} isRevealedEarly />
  </div>
);

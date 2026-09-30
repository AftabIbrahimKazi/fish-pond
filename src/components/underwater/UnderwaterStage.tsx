'use client';

/**
 * Underwater Stage.
 * Full-viewport underwater scene with a minimal title overlay and a loading status.
 */

import React, { useState } from 'react';
import Link from 'next/link';

import { UnderwaterLoadState } from '../../types/underwater';
import { UnderwaterCanvas } from './UnderwaterCanvas';

import styles from './underwater.module.css';

const STATUS_COPY: Record<UnderwaterLoadState, string> = {
  [UnderwaterLoadState.LOADING]: 'Filling the tank…',
  [UnderwaterLoadState.READY]: '',
  [UnderwaterLoadState.ERROR]: 'This scene needs WebGL 2, which the browser could not start.',
};

export const UnderwaterStage: React.FC = () => {
  const [loadState, setLoadState] = useState<UnderwaterLoadState>(UnderwaterLoadState.LOADING);

  return (
    <div className={`${styles['fp-underwater']} position-relative w-100 overflow-hidden`}>
      <UnderwaterCanvas onLoadStateChange={setLoadState} />

      <header className={`${styles['fp-underwater-header']} position-absolute d-flex align-items-start justify-content-between gap-[var(--fp-space-md)] p-[var(--fp-space-md)]`}>
        <div className="d-flex flex-column gap-[var(--fp-space-xxs)]">
          <h1 className={styles['fp-underwater-title']}>Underwater</h1>
          <p className={styles['fp-underwater-subtitle']}>Scene 03 · shaded and graded with Triforge</p>
        </div>
        <Link href="/" className={`${styles['fp-underwater-back']} px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`}>
          All experiments
        </Link>
      </header>

      <p className={`${styles['fp-underwater-hint']} position-absolute px-[var(--fp-space-md)] py-[var(--fp-space-xs)]`}>
        Click to drop fish food · keep the pointer away from a fish or it will dart off
      </p>

      <p
        className={`${styles['fp-underwater-status']} position-absolute px-[var(--fp-space-md)] py-[var(--fp-space-xs)]`}
        data-load-state={loadState}
        role="status"
      >
        {STATUS_COPY[loadState]}
      </p>
    </div>
  );
};

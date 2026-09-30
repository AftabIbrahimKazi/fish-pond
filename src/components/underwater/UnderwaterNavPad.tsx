'use client';

/**
 * Underwater Nav Pad.
 * Touch buttons that press the same keys as the keyboard: a Move pad (W A S D) bottom-left and a
 * Look pad (arrow keys) bottom-right. Shown only on phones and touch screens.
 */

import React, { useState } from 'react';

import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon } from '../HudIcons';

import styles from './underwater.module.css';

interface UnderwaterNavPadProps {
  onKeysChange: (codes: string[]) => void;
}

interface PadButton {
  code: string;
  label: string;
  icon: React.ReactNode;
  area: 'up' | 'left' | 'down' | 'right';
}

const MOVE_BUTTONS: readonly PadButton[] = [
  { code: 'KeyW', label: 'Move forward', icon: <ArrowUpIcon />, area: 'up' },
  { code: 'KeyA', label: 'Move left', icon: <ArrowLeftIcon />, area: 'left' },
  { code: 'KeyS', label: 'Move back', icon: <ArrowDownIcon />, area: 'down' },
  { code: 'KeyD', label: 'Move right', icon: <ArrowRightIcon />, area: 'right' },
];

const LOOK_BUTTONS: readonly PadButton[] = [
  { code: 'ArrowUp', label: 'Look up', icon: <ArrowUpIcon />, area: 'up' },
  { code: 'ArrowLeft', label: 'Turn left', icon: <ArrowLeftIcon />, area: 'left' },
  { code: 'ArrowDown', label: 'Look down', icon: <ArrowDownIcon />, area: 'down' },
  { code: 'ArrowRight', label: 'Turn right', icon: <ArrowRightIcon />, area: 'right' },
];

export const UnderwaterNavPad: React.FC<UnderwaterNavPadProps> = ({ onKeysChange }) => {
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());

  const setKey = (code: string, isActive: boolean): void => {
    setPressed((current) => {
      if (current.has(code) === isActive) return current;
      const next = new Set(current);
      if (isActive) next.add(code);
      else next.delete(code);
      onKeysChange([...next]);
      return next;
    });
  };

  const renderPad = (title: string, buttons: readonly PadButton[]): React.ReactNode => (
    <div className="d-flex flex-column align-items-center gap-[var(--fp-space-xs)]">
      <span className={styles['fp-underwater-pad-title']}>{title}</span>
      <div className={`${styles['fp-underwater-pad-grid']} d-grid`}>
        {buttons.map((button) => (
          <button
            key={button.code}
            type="button"
            className={styles['fp-underwater-pad-button-ts']}
            data-area={button.area}
            data-press-state={pressed.has(button.code) ? 'down' : 'up'}
            aria-label={button.label}
            onPointerDown={(event) => {
              setKey(button.code, true);
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerUp={() => setKey(button.code, false)}
            onPointerCancel={() => setKey(button.code, false)}
            onLostPointerCapture={() => setKey(button.code, false)}
            onContextMenu={(event) => event.preventDefault()}
          >
            {button.icon}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`${styles['fp-underwater-pads']} position-absolute d-flex justify-content-between align-items-end px-[var(--fp-space-md)] pb-[var(--fp-space-md)]`}>
      {renderPad('Move', MOVE_BUTTONS)}
      {renderPad('Look', LOOK_BUTTONS)}
    </div>
  );
};

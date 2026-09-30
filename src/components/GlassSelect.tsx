'use client';

/**
 * Glass Select.
 * A dropdown that matches the glass theme (the native one cannot be styled). Keyboard: arrow
 * keys move, Enter or Space picks, Escape closes.
 */

import React, { useEffect, useId, useRef, useState } from 'react';

import { ChevronDownIcon } from './HudIcons';

import styles from './glass-select.module.css';

export interface GlassSelectOption {
  value: number;
  label: string;
}

interface GlassSelectProps {
  label: string;
  value: number;
  options: readonly GlassSelectOption[];
  onChange: (value: number) => void;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false); // target is always a DOM node for pointer events
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const step = (direction: number): void => {
    const index = options.findIndex((option) => option.value === value);
    const next = options[Math.min(options.length - 1, Math.max(0, index + direction))];
    onChange(next.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') setIsOpen(false);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      step(1);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      step(-1);
    }
  };

  return (
    <div ref={rootRef} className={`${styles['fp-select']} position-relative`} data-state={isOpen ? 'open' : 'closed'} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={`${styles['fp-select-button']} d-inline-flex align-items-center justify-content-between gap-[var(--fp-space-xs)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={`${label}: ${current.label}`}
        onClick={() => setIsOpen((open) => !open)}
      >
        {current.label}
        <ChevronDownIcon />
      </button>
      <ul id={listId} role="listbox" aria-label={label} className={`${styles['fp-select-list']} position-absolute p-[var(--fp-space-xxs)]`}>
        {options.map((option) => (
          <li key={option.value} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`${styles['fp-select-option-ts']} d-flex w-100 px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`}
              data-option-state={option.value === value ? 'selected' : 'idle'}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

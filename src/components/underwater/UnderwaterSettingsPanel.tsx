'use client';

/**
 * Underwater Settings Panel.
 * Left-hand glass sidebar that shows and hides. One tab per graphics group, a slider plus typed
 * value (or a colour picker) per setting, and reset and JSON export.
 */

import React, { useState } from 'react';

import { SceneSettings, SettingDefinition, SettingGroup, SettingKey, SettingKind } from '../../types/underwater';
import {
  SETTING_DEFINITIONS,
  SETTING_GROUP_LABELS,
  SETTING_GROUP_ORDER,
  buildSettingsExport,
} from '../../simulation/underwater/underwater-settings';
import { CloseIcon, DownloadIcon, ResetIcon, SlidersIcon } from '../HudIcons';

import styles from './underwater.module.css';

const PANE_ID = 'fp-underwater-settings-pane' as const;
const EXPORT_FILE_NAME = 'fish-pond-underwater-settings.json' as const;
const EXPORT_MIME_TYPE = 'application/json' as const;
const DECIMAL_SEPARATOR = '.' as const;
const CHIP_CLASS = 'd-inline-flex align-items-center justify-content-center gap-[var(--fp-space-xs)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]' as const;

interface UnderwaterSettingsPanelProps {
  settings: SceneSettings;
  onChange: (key: SettingKey, value: number | string) => void;
  onReset: () => void;
}

interface SettingNumberFieldProps {
  id: string;
  definition: SettingDefinition;
  value: number;
  onChange: (value: number) => void;
}

function getDecimals(step: number): number {
  return String(step).split(DECIMAL_SEPARATOR)[1]?.length ?? 0;
}

function downloadSettings(settings: SceneSettings): void {
  const blob = new Blob([buildSettingsExport(settings)], { type: EXPORT_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = EXPORT_FILE_NAME;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Typed value box: keeps what is being typed until focus leaves, applies every valid number as it goes. */
const SettingNumberField: React.FC<SettingNumberFieldProps> = ({ id, definition, value, onChange }) => {
  const [draft, setDraft] = useState<string | null>(null);

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setDraft(event.target.value);
    const typed = event.target.valueAsNumber;
    if (Number.isFinite(typed)) onChange(Math.min(definition.max, Math.max(definition.min, typed)));
  };

  return (
    <input
      id={`${id}-value`}
      type="number"
      className={styles['fp-underwater-setting-number']}
      aria-label={`${definition.label} value`}
      min={definition.min}
      max={definition.max}
      step={definition.step}
      value={draft ?? value.toFixed(getDecimals(definition.step))}
      onChange={handleInput}
      onBlur={() => setDraft(null)}
    />
  );
};

export const UnderwaterSettingsPanel: React.FC<UnderwaterSettingsPanelProps> = ({ settings, onChange, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<SettingGroup>(SETTING_GROUP_ORDER[0]);

  const visibleDefinitions = SETTING_DEFINITIONS.filter((definition) => definition.group === activeGroup);

  const renderControl = (definition: SettingDefinition): React.ReactNode => {
    const id = `fp-underwater-setting-${definition.key}`;
    const value = settings[definition.key];
    const isColor = definition.kind === SettingKind.COLOR;
    return (
      <div key={definition.key} className="d-flex flex-column">
        <div className="d-flex align-items-center justify-content-between gap-[var(--fp-space-sm)]">
          <label htmlFor={id} className={styles['fp-underwater-setting-label']}>{definition.label}</label>
          {isColor ? (
            <output htmlFor={id} className={styles['fp-underwater-setting-value']}>{String(value)}</output>
          ) : (
            <SettingNumberField
              id={id}
              definition={definition}
              value={Number(value)}
              onChange={(next) => onChange(definition.key, next)}
            />
          )}
        </div>
        {isColor ? (
          <input
            id={id}
            type="color"
            className={styles['fp-underwater-setting-color']}
            value={String(value)}
            onChange={(event) => onChange(definition.key, event.target.value)}
          />
        ) : (
          <input
            id={id}
            type="range"
            className={styles['fp-underwater-setting-range']}
            min={definition.min}
            max={definition.max}
            step={definition.step}
            value={Number(value)}
            onChange={(event) => onChange(definition.key, event.target.valueAsNumber)}
          />
        )}
      </div>
    );
  };

  return (
    <aside
      className={`${styles['fp-underwater-settings-ts']} position-absolute d-flex flex-column gap-[var(--fp-space-sm)]`}
      data-state={isOpen ? 'open' : 'closed'}
    >
      <button
        type="button"
        className={`${styles['fp-underwater-chip-button']} ${CHIP_CLASS} align-self-start`}
        aria-expanded={isOpen}
        aria-controls={PANE_ID}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <CloseIcon /> : <SlidersIcon />}
        {isOpen ? 'Hide settings' : 'Scene settings'}
      </button>

      <section
        id={PANE_ID}
        className={`${styles['fp-underwater-settings-pane']} d-flex flex-column gap-[var(--fp-space-md)] p-[var(--fp-space-xl)]`}
        aria-label="Scene settings"
      >
        <h2 className={`${styles['fp-underwater-settings-title']} d-flex align-items-center gap-[var(--fp-space-sm)]`}>
          <SlidersIcon />
          Scene settings
        </h2>

        <div role="tablist" aria-label="Setting groups" className={`${styles['fp-underwater-settings-tabs']} d-flex flex-wrap`}>
          {SETTING_GROUP_ORDER.map((group) => (
            <button
              key={group}
              type="button"
              role="tab"
              aria-selected={group === activeGroup}
              className={styles['fp-underwater-settings-tab-ts']}
              data-tab-state={group === activeGroup ? 'active' : 'idle'}
              onClick={() => setActiveGroup(group)}
            >
              {SETTING_GROUP_LABELS[group]}
            </button>
          ))}
        </div>

        <div role="tabpanel" className={`${styles['fp-underwater-settings-list']} d-flex flex-column gap-[var(--fp-space-xs)]`}>
          {visibleDefinitions.map(renderControl)}
        </div>

        <div className="d-flex gap-[var(--fp-space-sm)]">
          <button type="button" className={`${styles['fp-underwater-chip-button']} ${CHIP_CLASS}`} onClick={onReset}>
            <ResetIcon />
            Reset all
          </button>
          <button type="button" className={`${styles['fp-underwater-chip-button']} ${CHIP_CLASS}`} onClick={() => downloadSettings(settings)}>
            <DownloadIcon />
            Export JSON
          </button>
        </div>
      </section>
    </aside>
  );
};

/**
 * Remembers the sidebar's tuning between reloads. The stored copy is ignored once SCENE_DEFAULTS
 * change, so an exported JSON adopted as the new defaults is never shadowed by old browser data.
 */

import { SceneSettings } from '../../types/underwater';
import { SCENE_DEFAULTS } from '../../simulation/underwater/underwater-settings';

const STORAGE_KEY = 'fp-underwater-settings' as const;

interface StoredSettings {
  defaults: string;
  settings: Partial<SceneSettings>;
}

export function getStoredSettings(): SceneSettings | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredSettings; // written by setStoredSettings below; checked against the defaults signature next
    if (stored.defaults !== JSON.stringify(SCENE_DEFAULTS)) return null;
    return { ...SCENE_DEFAULTS, ...stored.settings };
  } catch {
    return null;
  }
}

export function setStoredSettings(settings: SceneSettings): void {
  try {
    const stored: StoredSettings = { defaults: JSON.stringify(SCENE_DEFAULTS), settings };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // storage can be blocked or full; tuning still works for the current visit
  }
}

/**
 * Short-term memory of the fish. Each stimulus kind it has appraised is remembered
 * for a limited span; re-encountering it refreshes the timer, and expiry makes the
 * kind novel again. Exposed to the HUD with the remaining seconds.
 */

import { MemoryEntry, StimulusKind } from '../../types/arena';
import {
  DEFAULT_MEMORY_SPAN_SECONDS,
  MAX_MEMORY_SPAN_SECONDS,
  MIN_MEMORY_SPAN_SECONDS,
} from './arena-constants';

const MAX_FAMILIARITY = 1.0 as const;
const MAX_VALENCE = 1.0 as const;

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class FishMemory {
  private _entries: Map<StimulusKind, MemoryEntry> = new Map();
  private _spanSeconds: number = DEFAULT_MEMORY_SPAN_SECONDS;

  public getSpanSeconds(): number {
    return this._spanSeconds;
  }

  public setSpanSeconds(spanSeconds: number): void {
    this._spanSeconds = clampValue(spanSeconds, MIN_MEMORY_SPAN_SECONDS, MAX_MEMORY_SPAN_SECONDS);
    for (const entry of this._entries.values()) {
      entry.spanSeconds = this._spanSeconds;
      entry.remainingSeconds = Math.min(entry.remainingSeconds, this._spanSeconds);
    }
  }

  public updateMemory(deltaTime: number): StimulusKind[] {
    const expired: StimulusKind[] = [];
    for (const [kind, entry] of this._entries) {
      entry.remainingSeconds -= deltaTime;
      if (entry.remainingSeconds <= 0) {
        this._entries.delete(kind);
        expired.push(kind);
      }
    }
    return expired;
  }

  public getFamiliarity(kind: StimulusKind): number {
    return this._entries.get(kind)?.familiarity ?? 0;
  }

  public getValence(kind: StimulusKind): number {
    return this._entries.get(kind)?.valence ?? 0;
  }

  public hasEntry(kind: StimulusKind): boolean {
    return this._entries.has(kind);
  }

  public recordAppraisal(kind: StimulusKind, valence: number, familiarityGain: number): void {
    const existing = this._entries.get(kind);
    this._entries.set(kind, {
      kind,
      familiarity: clampValue((existing?.familiarity ?? 0) + familiarityGain, 0, MAX_FAMILIARITY),
      valence: clampValue(valence, -MAX_VALENCE, MAX_VALENCE),
      remainingSeconds: this._spanSeconds,
      spanSeconds: this._spanSeconds,
    });
  }

  public adjustValence(kind: StimulusKind, valenceDelta: number, familiarityGain: number): void {
    const existing = this._entries.get(kind);
    this.recordAppraisal(kind, (existing?.valence ?? 0) + valenceDelta, familiarityGain);
  }

  public getSnapshot(): MemoryEntry[] {
    return [...this._entries.values()]
      .map((entry) => ({ ...entry }))
      .sort((a, b) => b.remainingSeconds - a.remainingSeconds);
  }

  public resetMemory(): void {
    this._entries.clear();
  }
}

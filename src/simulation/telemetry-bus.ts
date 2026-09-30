/**
 * Telemetry Bus and Benchmark Scenario Runner.
 * Coordinates synchronized input distribution and automated telemetry recording.
 * Follows Rule TS-05 (event listeners cleaned up) and Rule TS-06 (designated module for shared state).
 */

import { BenchmarkCase, InputMode, SimulationInputs, Vector3D } from '../types/benchmark';
import { POND_BOUNDS } from './fish-mesh';
import { buildSeededRandom } from './prng';

type TelemetrySubscriber = (inputs: SimulationInputs) => void;

const MS_TO_SECONDS = 0.001 as const;
const MAX_TICK_SECONDS = 0.1 as const;
const MIN_DELTA_SECONDS = 0.001 as const;
const BUS_RANDOM_SEED = 20260930 as const;
const TOTAL_CASE_COUNT = Object.keys(BenchmarkCase).length;

const THREAT_HEIGHT_OFFSET = 0.2 as const;
const THREAT_RANGE_FACTOR = 0.85 as const;
const FOOD_HEIGHT_OFFSET = 0.3 as const;
const FOOD_SPAWN_SPREAD = 1.2 as const;
const FOOD_FALL_SPEED = 1.2 as const;
const FOOD_REST_MARGIN = 0.3 as const;
const FOOD_REST_DESPAWN_MS = 6000 as const;
const HALF = 0.5 as const;

const BENCHMARK_CYCLE_SECONDS = 16.0 as const;
const PHASE_APPROACH_END_SECONDS = 6.0 as const;
const PHASE_CONFLICT_END_SECONDS = 11.0 as const;
const PHASE_ORBIT_RATE = 1.5 as const;
const PHASE_ORBIT_RADIUS_X = 5.0 as const;
const PHASE_ORBIT_RADIUS_Z = 3.5 as const;
const PHASE_APPROACH_VELOCITY = 3.5 as const;
const CONFLICT_FOOD_X = 1.5 as const;
const CONFLICT_ORBIT_RATE = 3.0 as const;
const CONFLICT_CENTER_X = 2.2 as const;
const CONFLICT_CENTER_Z = 0.8 as const;
const CONFLICT_ORBIT_RADIUS_X = 1.2 as const;
const CONFLICT_ORBIT_RADIUS_Z = 1.2 as const;
const CONFLICT_VELOCITY = 2.0 as const;

class TelemetryCoordinator {
  private _subscribers: Set<TelemetrySubscriber> = new Set();
  private _mode: InputMode = 'INTERACTIVE';
  private _random: () => number = buildSeededRandom(BUS_RANDOM_SEED);
  private _threatPos: Vector3D = { x: 0, y: POND_BOUNDS.MAX_Y, z: 0 };
  private _isThreatActive = false;
  private _threatVelocity = 0;
  private _lastThreatPos: Vector3D = { x: 0, y: POND_BOUNDS.MAX_Y, z: 0 };
  private _lastThreatTime = 0;

  private _foodPos: Vector3D | null = null;
  private _isFoodActive = false;
  private _foodDropTime = 0;
  private _foodId = 0;
  private _foodEatenBy: Set<BenchmarkCase> = new Set();
  private _conflictStartTime = 0;

  private _isRunning = false;
  private _animationFrameId: number | null = null;

  public subscribe(callback: TelemetrySubscriber): () => void {
    this._subscribers.add(callback);
    if (!this._isRunning) {
      this._startLoop();
    }
    return () => {
      this._subscribers.delete(callback);
      if (this._subscribers.size === 0) {
        this._stopLoop();
      }
    };
  }

  public setMode(newMode: InputMode): void {
    this._mode = newMode;
  }

  public getMode(): InputMode {
    return this._mode;
  }

  public setInteractiveThreat(xNorm: number, yNorm: number, isActive: boolean): void {
    if (this._mode !== 'INTERACTIVE') return;

    this._isThreatActive = isActive;
    const now = performance.now();
    const dt = Math.max(MIN_DELTA_SECONDS, (now - this._lastThreatTime) * MS_TO_SECONDS);

    // Map normalized [-1, 1] screen coords to pond bounds
    const mappedX = xNorm * (POND_BOUNDS.MAX_X * THREAT_RANGE_FACTOR);
    const mappedZ = -yNorm * (POND_BOUNDS.MAX_Z * THREAT_RANGE_FACTOR);

    const dx = mappedX - this._lastThreatPos.x;
    const dz = mappedZ - this._lastThreatPos.z;
    this._threatVelocity = Math.sqrt(dx * dx + dz * dz) / dt;

    this._threatPos = {
      x: mappedX,
      y: POND_BOUNDS.MAX_Y - THREAT_HEIGHT_OFFSET,
      z: mappedZ,
    };

    this._lastThreatPos = { ...this._threatPos };
    this._lastThreatTime = now;
  }

  public dropFood(targetPos?: Vector3D): void {
    const x = targetPos?.x ?? (this._random() - HALF) * (POND_BOUNDS.MAX_X * FOOD_SPAWN_SPREAD);
    const z = targetPos?.z ?? (this._random() - HALF) * (POND_BOUNDS.MAX_Z * FOOD_SPAWN_SPREAD);

    this._foodPos = { x, y: POND_BOUNDS.MAX_Y - FOOD_HEIGHT_OFFSET, z };
    this._isFoodActive = true;
    this._foodDropTime = performance.now();
    this._foodId += 1;
    this._foodEatenBy.clear();
  }

  public clearFood(): void {
    this._isFoodActive = false;
    this._foodPos = null;
  }

  /**
   * A viewport reports that its fish reached the current pellet. The pellet is only
   * removed for everyone once every viewport has eaten it, so no architecture
   * cancels the test for the others.
   */
  public reportFoodEaten(caseType: BenchmarkCase, eatenFoodId: number): void {
    if (eatenFoodId !== this._foodId) return;

    this._foodEatenBy.add(caseType);
    if (this._foodEatenBy.size >= TOTAL_CASE_COUNT) {
      this.clearFood();
    }
  }

  private _startLoop(): void {
    this._isRunning = true;
    let lastTick = performance.now();

    const tick = (now: number): void => {
      const dt = Math.min(MAX_TICK_SECONDS, (now - lastTick) * MS_TO_SECONDS);
      lastTick = now;

      this._updateFoodPhysics(dt, now);
      this._updateAutomatedScenario(now);

      const currentInputs = this._buildInputs(now);

      for (const subscriber of this._subscribers) {
        subscriber(currentInputs);
      }

      if (this._isRunning) {
        this._animationFrameId = requestAnimationFrame(tick);
      }
    };

    this._animationFrameId = requestAnimationFrame(tick);
  }

  private _updateFoodPhysics(deltaTime: number, now: number): void {
    if (!this._isFoodActive || !this._foodPos) return;

    this._foodPos.y -= deltaTime * FOOD_FALL_SPEED;
    if (this._foodPos.y <= POND_BOUNDS.MIN_Y + FOOD_REST_MARGIN) {
      this._foodPos.y = POND_BOUNDS.MIN_Y + FOOD_REST_MARGIN;
      // Despawn after resting on bottom
      if (now - this._foodDropTime > FOOD_REST_DESPAWN_MS) {
        this.clearFood();
      }
    }
  }

  private _updateAutomatedScenario(now: number): void {
    if (this._mode !== 'AUTOMATED_BENCHMARK') return;

    const timeSec = now * MS_TO_SECONDS;
    const cycle = timeSec % BENCHMARK_CYCLE_SECONDS;
    const threatY = POND_BOUNDS.MAX_Y - THREAT_HEIGHT_OFFSET;

    // Threat swoops down, lingers, retreats, loops
    if (cycle < PHASE_APPROACH_END_SECONDS) {
      this._isThreatActive = true;
      this._threatPos = {
        x: Math.sin(timeSec * PHASE_ORBIT_RATE) * PHASE_ORBIT_RADIUS_X,
        y: threatY,
        z: Math.cos(timeSec * PHASE_ORBIT_RATE) * PHASE_ORBIT_RADIUS_Z,
      };
      this._threatVelocity = PHASE_APPROACH_VELOCITY;
    } else if (cycle < PHASE_CONFLICT_END_SECONDS) {
      // Simultaneous food drop + looming threat (Conflict State)
      if (!this._isFoodActive) {
        this.dropFood({ x: CONFLICT_FOOD_X, y: threatY, z: 0 });
      }
      this._isThreatActive = true;
      this._threatPos = {
        x: CONFLICT_CENTER_X + Math.sin(timeSec * CONFLICT_ORBIT_RATE) * CONFLICT_ORBIT_RADIUS_X,
        y: threatY,
        z: CONFLICT_CENTER_Z + Math.cos(timeSec * CONFLICT_ORBIT_RATE) * CONFLICT_ORBIT_RADIUS_Z,
      };
      this._threatVelocity = CONFLICT_VELOCITY;
    } else {
      // Threat retreats, calm feeding
      this._isThreatActive = false;
      this._threatVelocity = 0;
    }
  }

  private _buildInputs(now: number): SimulationInputs {
    // Conflict duration timer
    if (this._isThreatActive && this._isFoodActive) {
      if (this._conflictStartTime === 0) {
        this._conflictStartTime = now;
      }
    } else {
      this._conflictStartTime = 0;
    }

    const timeElapsedConflict = this._conflictStartTime > 0
      ? (now - this._conflictStartTime) * MS_TO_SECONDS
      : 0;

    return {
      threatPos: { ...this._threatPos },
      threatActive: this._isThreatActive,
      threatVelocity: this._threatVelocity,
      foodPos: this._foodPos ? { ...this._foodPos } : null,
      foodActive: this._isFoodActive,
      timeElapsedConflict,
      foodId: this._foodId,
      timestamp: now,
    };
  }

  private _stopLoop(): void {
    this._isRunning = false;
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }
}

export const telemetryBus = new TelemetryCoordinator();

'use client';

/**
 * Benchmark Viewport Component.
 * Encapsulates a self-contained WebGL simulation canvas and live telemetry HUD overlay.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import {
  BehaviorTelemetry,
  BenchmarkCase,
  FishKinematics,
  SimulationController,
  SimulationInputs,
} from '../types/benchmark';
import { createSystem0Controller } from '../simulation/controllers/case-1-reflex';
import { createSystem1LotteryController } from '../simulation/controllers/case-2-lottery';
import { createSystem2ReasoningController } from '../simulation/controllers/case-3-reasoning';
import { clampFishToPondBounds, createProceduralFishMesh } from '../simulation/fish-mesh';
import { createPondEnvironment, PondSceneEnvironment } from '../simulation/pond-environment';
import { telemetryBus } from '../simulation/telemetry-bus';

import styles from './BenchmarkViewport.module.css';

interface BenchmarkViewportProps {
  caseType: BenchmarkCase;
  title: string;
  architectureSubtitle: string;
  badgeLabel: string;
  onTelemetryUpdate?: (telemetry: BehaviorTelemetry) => void;
}

type SegmentKind = 'threat' | 'food' | 'conflict' | 'neutral';

interface BarSegment {
  key: string;
  label: string;
  kind: SegmentKind;
  x: number;
  width: number;
}

const MS_TO_SECONDS = 0.001 as const;
const MAX_FRAME_SECONDS = 0.05 as const;
const MIN_FRAME_SECONDS = 0.001 as const;
const FPS_WINDOW_MS = 500 as const;
const MS_PER_SECOND = 1000 as const;
const UI_UPDATE_INTERVAL_MS = 100 as const;
const INITIAL_SPEED = 1.5 as const;
const SPEED_LERP_RATE = 3.5 as const;
const TURN_LERP_RATE = 5.0 as const;
const DIRECTION_EPSILON = 0.0001 as const;
const MOVEMENT_EPSILON = 0.01 as const;
const FOOD_EAT_DISTANCE = 0.9 as const;
const HIGH_TENSION_THRESHOLD = 0.5 as const;
const PERCENT = 100 as const;
const NDC_SPAN = 2 as const;
const CLICK_SPAN_X = 8.5 as const;
const CLICK_SPAN_Z = 5.0 as const;
const CLICK_FOOD_HEIGHT = 3.2 as const;
const BAR_MIN_SEGMENT_UNITS = 2 as const;
const BAR_HEIGHT_UNITS = 6 as const;
const DEFAULT_TENSION_STATE = 'low' as const;

function resolveSegmentKind(key: string): SegmentKind {
  if (key.includes('Dart') || key.includes('Threat')) return 'threat';
  if (key.includes('Food') || key.includes('Curious')) return 'food';
  if (key.includes('Freeze') || key.includes('Conflict')) return 'conflict';
  return 'neutral';
}

function buildBarSegments(probabilities: Record<string, number>): BarSegment[] {
  const entries = Object.entries(probabilities);
  const rawWidths = entries.map(([, value]) => Math.max(BAR_MIN_SEGMENT_UNITS, value * PERCENT));
  const total = rawWidths.reduce((sum, width) => sum + width, 0);
  const scale = total > PERCENT ? PERCENT / total : 1;

  let cursor = 0;
  return entries.map(([key, value], index) => {
    const width = rawWidths[index] * scale;
    const segment: BarSegment = {
      key,
      label: `${key}: ${(value * PERCENT).toFixed(1)}%`,
      kind: resolveSegmentKind(key),
      x: cursor,
      width,
    };
    cursor += width;
    return segment;
  });
}

function buildController(caseType: BenchmarkCase): SimulationController {
  if (caseType === BenchmarkCase.SYSTEM_0_REFLEX) return createSystem0Controller();
  if (caseType === BenchmarkCase.SYSTEM_1_LOTTERY) return createSystem1LotteryController();
  return createSystem2ReasoningController();
}

function resolveTensionState(telemetry: BehaviorTelemetry | null): 'low' | 'high' {
  return telemetry && telemetry.tensionScore > HIGH_TENSION_THRESHOLD ? 'high' : DEFAULT_TENSION_STATE;
}

function normalizePointer(event: React.MouseEvent<HTMLDivElement>): { xNorm: number; yNorm: number } {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    xNorm: ((event.clientX - rect.left) / rect.width) * NDC_SPAN - 1,
    yNorm: ((event.clientY - rect.top) / rect.height) * NDC_SPAN - 1,
  };
}

export const BenchmarkViewport: React.FC<BenchmarkViewportProps> = ({
  caseType,
  title,
  architectureSubtitle,
  badgeLabel,
  onTelemetryUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const telemetryCallbackRef = useRef<BenchmarkViewportProps['onTelemetryUpdate']>(onTelemetryUpdate);
  const [telemetry, setTelemetry] = useState<BehaviorTelemetry | null>(null);

  useEffect(() => {
    telemetryCallbackRef.current = onTelemetryUpdate;
  }, [onTelemetryUpdate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let env: PondSceneEnvironment | null = null;
    let animId: number | null = null;
    let isDisposed = false;
    let isVisible = true;

    try {
      env = createPondEnvironment(canvas);
    } catch {
      return;
    }

    const { mesh: fishMesh, material: fishMaterial, geometry: fishGeometry } = createProceduralFishMesh();
    env.scene.add(fishMesh);

    const controller = buildController(caseType);

    // Kinematics State
    const fishPos = new THREE.Vector3(0, 0, 0);
    const fishVel = new THREE.Vector3(0, 0, 0);
    const targetLookAt = new THREE.Vector3(0, 0, 1);
    let currentSpeed: number = INITIAL_SPEED;

    // Scratch objects to avoid allocations in rAF loop (per threejs-scene discipline)
    const scratchTargetVec = new THREE.Vector3();
    const scratchDirVec = new THREE.Vector3();
    const scratchFoodVec = new THREE.Vector3();

    let latestInputs: SimulationInputs = {
      threatPos: { x: 0, y: 0, z: 0 },
      threatActive: false,
      threatVelocity: 0,
      foodPos: null,
      foodActive: false,
      timeElapsedConflict: 0,
      foodId: 0,
      timestamp: performance.now(),
    };

    // Each fish eats the shared pellet independently; the bus removes it once all have.
    let eatenFoodId = -1;

    const unsubscribeTelemetry = telemetryBus.subscribe((inputs) => {
      latestInputs = inputs.foodId === eatenFoodId
        ? { ...inputs, foodPos: null, foodActive: false }
        : inputs;
    });

    let lastTime = performance.now();
    let frameCounter = 0;
    let lastFpsUpdate = performance.now();
    let lastUiUpdate = 0;
    let computedFps = 0;
    let elapsedTimeTotal = 0;

    const tick = (now: number): void => {
      if (isDisposed || !env) return;

      if (!isVisible) {
        lastTime = now;
        animId = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(MAX_FRAME_SECONDS, Math.max(MIN_FRAME_SECONDS, (now - lastTime) * MS_TO_SECONDS));
      lastTime = now;
      elapsedTimeTotal += dt;

      frameCounter++;
      if (now - lastFpsUpdate >= FPS_WINDOW_MS) {
        computedFps = Math.round((frameCounter * MS_PER_SECOND) / (now - lastFpsUpdate));
        frameCounter = 0;
        lastFpsUpdate = now;
      }

      const kinematics: FishKinematics = {
        position: { x: fishPos.x, y: fishPos.y, z: fishPos.z },
        velocity: { x: fishVel.x, y: fishVel.y, z: fishVel.z },
        headingAngle: fishMesh.rotation.y,
        pitchAngle: fishMesh.rotation.x,
        speed: currentSpeed,
      };

      const { outputs, telemetry: frameTelemetry } = controller.update(kinematics, latestInputs, dt);

      frameTelemetry.fps = computedFps;
      frameTelemetry.frameTimeMs = dt * MS_PER_SECOND;

      // Update shader uniforms
      fishMaterial.uniforms.uTime.value = elapsedTimeTotal;
      fishMaterial.uniforms.uTailFrequency.value = outputs.tailFrequency;
      fishMaterial.uniforms.uSpineCurve.value = outputs.spineCurveAmplitude;
      fishMaterial.uniforms.uFinResistance.value = outputs.finResistance;
      fishMaterial.uniforms.uColorHue.value = outputs.bodyColorHue;
      fishMaterial.uniforms.uTension.value = outputs.tensionLevel;

      // Kinematic locomotion
      if (caseType === BenchmarkCase.SYSTEM_0_REFLEX) {
        // System 0: Programmed Reflex (instant snapping, NO muscular inertia)
        currentSpeed = outputs.targetSpeed;
      } else {
        // System 1 & 2: Organic muscular momentum
        currentSpeed = THREE.MathUtils.lerp(currentSpeed, outputs.targetSpeed, dt * SPEED_LERP_RATE);
      }

      scratchDirVec.set(
        outputs.targetDirection.x,
        outputs.targetDirection.y,
        outputs.targetDirection.z
      );
      if (scratchDirVec.lengthSq() > DIRECTION_EPSILON) {
        scratchDirVec.normalize();
      }

      fishVel.copy(scratchDirVec).multiplyScalar(currentSpeed);
      fishPos.addScaledVector(fishVel, dt);

      // Enforce physical boundary safety clamping
      clampFishToPondBounds(fishPos, fishVel);
      fishMesh.position.copy(fishPos);

      // Orientation facing movement direction
      scratchTargetVec.copy(fishPos).add(fishVel);
      if (fishVel.lengthSq() > MOVEMENT_EPSILON) {
        if (caseType === BenchmarkCase.SYSTEM_0_REFLEX) {
          // Rigid instant orientation snap
          fishMesh.lookAt(scratchTargetVec);
        } else {
          // Organic damped turn
          targetLookAt.lerp(scratchTargetVec, dt * TURN_LERP_RATE);
          fishMesh.lookAt(targetLookAt);
        }
      }

      // Check food consumption (this fish only)
      if (latestInputs.foodActive && latestInputs.foodPos) {
        scratchFoodVec.set(latestInputs.foodPos.x, latestInputs.foodPos.y, latestInputs.foodPos.z);
        if (fishPos.distanceTo(scratchFoodVec) < FOOD_EAT_DISTANCE) {
          eatenFoodId = latestInputs.foodId;
          latestInputs = { ...latestInputs, foodPos: null, foodActive: false };
          telemetryBus.reportFoodEaten(caseType, eatenFoodId);
        }
      }

      // Update environment shaders & indicators
      env.updateEnvironment(
        dt,
        latestInputs.threatPos,
        latestInputs.threatActive,
        latestInputs.foodPos
      );

      env.renderer.render(env.scene, env.camera);

      // Dispatch telemetry update (React state throttled; callback gets every frame)
      if (now - lastUiUpdate >= UI_UPDATE_INTERVAL_MS) {
        lastUiUpdate = now;
        setTelemetry(frameTelemetry);
      }
      telemetryCallbackRef.current?.(frameTelemetry);

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    // Responsive canvas: follows the container, not just the window
    const handleResize = (): void => {
      if (isDisposed || !env) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      env.resize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    // Skip rendering while the viewport is scrolled out of view
    const visibilityObserver = new IntersectionObserver((entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
    });
    visibilityObserver.observe(canvas);

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
      unsubscribeTelemetry();
      if (env) {
        env.scene.remove(fishMesh);
        fishGeometry.dispose();
        fishMaterial.dispose();
        env.dispose();
      }
    };
  }, [caseType]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (telemetryBus.getMode() !== 'INTERACTIVE') return;
    const { xNorm, yNorm } = normalizePointer(event);
    telemetryBus.setInteractiveThreat(xNorm, yNorm, true);
  };

  const handlePointerLeave = (): void => {
    if (telemetryBus.getMode() !== 'INTERACTIVE') return;
    telemetryBus.setInteractiveThreat(0, 0, false);
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    const { xNorm, yNorm } = normalizePointer(event);
    telemetryBus.dropFood({ x: xNorm * CLICK_SPAN_X, y: CLICK_FOOD_HEIGHT, z: -yNorm * CLICK_SPAN_Z });
  };

  const tensionState = resolveTensionState(telemetry);
  const barSegments = telemetry?.probabilities ? buildBarSegments(telemetry.probabilities) : [];

  return (
    <div
      className={`${styles['fp-viewport']} d-flex flex-column position-relative overflow-hidden h-100`}
      data-case={caseType}
    >
      {/* Viewport Top Header */}
      <div
        className={`${styles['fp-viewport-header']} d-flex align-items-center justify-content-between px-[var(--fp-space-md)] py-[var(--fp-space-default)]`}
      >
        <div>
          <h2 className={styles['fp-viewport-title']}>{title}</h2>
          <span className={styles['fp-viewport-subtitle']}>{architectureSubtitle}</span>
        </div>
        <span className={styles['fp-viewport-badge']}>{badgeLabel}</span>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div
        className={`${styles['fp-viewport-stage']} position-relative w-100 flex-grow-1`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        <canvas
          ref={canvasRef}
          className={`${styles['fp-viewport-canvas-ts']} d-block position-absolute w-100 h-100`}
          role="img"
          aria-label={`${title} — live simulation of the ${architectureSubtitle} controller`}
        />

        {/* Live Snapping Alert for System 0 */}
        <div
          className={`${styles['fp-viewport-snap-alert-ts']} position-absolute`}
          data-snap-state={telemetry?.isSnapping ? 'active' : 'idle'}
          role="status"
        >
          DISCONTINUITY SNAP
        </div>

        {/* State Floating Pill */}
        <div
          className={`${styles['fp-viewport-pill']} d-flex align-items-center gap-[var(--fp-space-xs)] position-absolute`}
        >
          <span
            className={`${styles['fp-viewport-pill-dot-ts']} d-inline-block`}
            data-tension-state={tensionState}
            aria-hidden="true"
          />
          <span className={styles['fp-viewport-pill-label-ts']}>
            {telemetry?.stateLabel ?? 'INITIALIZING'}
          </span>
        </div>

        {/* Live FPS Counter */}
        <div className={`${styles['fp-viewport-fps-ts']} position-absolute`}>
          {telemetry ? `${telemetry.fps} FPS (${telemetry.frameTimeMs.toFixed(1)}ms)` : '-- FPS'}
        </div>
      </div>

      {/* Telemetry Metrics HUD Footer */}
      <div className={`${styles['fp-viewport-hud']} d-grid gap-[var(--fp-space-sm)]`}>
        <div>
          <div className={styles['fp-viewport-metric-label']}>TAIL FREQ</div>
          <div className={styles['fp-viewport-metric-value-ts']}>
            {telemetry?.tailFrequencyHz.toFixed(2) ?? '0.00'} Hz
          </div>
        </div>
        <div>
          <div className={styles['fp-viewport-metric-label']}>SPINE CURVE</div>
          <div className={styles['fp-viewport-metric-value-ts']}>
            {((telemetry?.spineCurvature ?? 0) * PERCENT).toFixed(0)}%
          </div>
        </div>
        <div>
          <div className={styles['fp-viewport-metric-label']}>TENSION</div>
          <div className={styles['fp-viewport-metric-value-ts']} data-tension-state={tensionState}>
            {((telemetry?.tensionScore ?? 0) * PERCENT).toFixed(0)}%
          </div>
        </div>

        {/* Probability Distribution or Intent Vector */}
        {barSegments.length > 0 && (
          <div className={styles['fp-viewport-probabilities']}>
            <div className={styles['fp-viewport-probabilities-label']}>
              PROBABILITY MATRIX / VECTOR CONFIDENCE
            </div>
            <svg
              className={`${styles['fp-viewport-bar-ts']} d-block w-100`}
              viewBox={`0 0 ${PERCENT} ${BAR_HEIGHT_UNITS}`}
              preserveAspectRatio="none"
              role="img"
              aria-label="Behaviour probability distribution"
            >
              <rect className={styles['fp-viewport-bar-track']} x={0} y={0} width={PERCENT} height={BAR_HEIGHT_UNITS} />
              {barSegments.map((segment) => (
                <rect
                  key={segment.key}
                  className={styles['fp-viewport-bar-segment-ts']}
                  data-segment={segment.kind}
                  x={segment.x}
                  y={0}
                  width={segment.width}
                  height={BAR_HEIGHT_UNITS}
                >
                  <title>{segment.label}</title>
                </rect>
              ))}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

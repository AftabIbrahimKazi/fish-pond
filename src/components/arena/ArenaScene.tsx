'use client';

/**
 * Arena Scene.
 * Full-viewport WebGL canvas: one fish in a wide pond, the arena controller driving it,
 * stimulus visuals, and click-to-place with a hover ghost.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { ArenaTelemetry, StimulusKind } from '../../types/arena';
import { FishKinematics } from '../../types/benchmark';
import { ArenaController } from '../../simulation/arena/arena-controller';
import { ARENA_BOUNDS } from '../../simulation/arena/arena-constants';
import { buildStimulusMeshManager } from '../../simulation/arena/stimulus-meshes';
import { clampFishToPondBounds, createProceduralFishMesh } from '../../simulation/fish-mesh';
import { createPondEnvironment, PondSceneEnvironment } from '../../simulation/pond-environment';

import styles from './arena.module.css';

interface ArenaSceneProps {
  controller: ArenaController;
  armedKind: StimulusKind | null;
  isPaused: boolean;
  simSpeed: number;
  onTelemetry: (telemetry: ArenaTelemetry) => void;
  onFlashChange: (isFlashing: boolean) => void;
  onPlace: (kind: StimulusKind, x: number, z: number) => void;
}

const MS_TO_SECONDS = 0.001 as const;
const MAX_FRAME_SECONDS = 0.05 as const;
const MIN_FRAME_SECONDS = 0.001 as const;
const UI_UPDATE_INTERVAL_MS = 100 as const;
const INITIAL_SPEED = 1.5 as const;
const SPEED_LERP_RATE = 3.5 as const;
const TURN_LERP_RATE = 5.0 as const;
const DIRECTION_EPSILON = 0.0001 as const;
const MOVEMENT_EPSILON = 0.01 as const;
const NDC_SPAN = 2 as const;
const GHOST_INNER = 0.5 as const;
const GHOST_OUTER = 0.7 as const;
const GHOST_SEGMENTS = 40 as const;
const GHOST_HEIGHT = 0.1 as const;

export const ArenaScene: React.FC<ArenaSceneProps> = ({
  controller,
  armedKind,
  isPaused,
  simSpeed,
  onTelemetry,
  onFlashChange,
  onPlace,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const envRef = useRef<PondSceneEnvironment | null>(null);
  const ghostRef = useRef<THREE.Mesh | null>(null);
  const pausedRef = useRef(isPaused);
  const speedRef = useRef(simSpeed);
  const armedRef = useRef(armedKind);
  const callbacksRef = useRef({ onTelemetry, onFlashChange });

  useEffect(() => {
    pausedRef.current = isPaused;
    speedRef.current = simSpeed;
    armedRef.current = armedKind;
    callbacksRef.current = { onTelemetry, onFlashChange };
    if (!armedKind && ghostRef.current) {
      ghostRef.current.visible = false;
    }
  }, [isPaused, simSpeed, armedKind, onTelemetry, onFlashChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let env: PondSceneEnvironment;
    try {
      env = createPondEnvironment(canvas, ARENA_BOUNDS);
    } catch {
      return;
    }
    envRef.current = env;

    const { mesh: fishMesh, material: fishMaterial, geometry: fishGeometry } = createProceduralFishMesh();
    env.scene.add(fishMesh);
    const stimulusMeshes = buildStimulusMeshManager(env.scene, ARENA_BOUNDS);

    const ghostGeometry = new THREE.RingGeometry(GHOST_INNER, GHOST_OUTER, GHOST_SEGMENTS);
    ghostGeometry.rotateX(-Math.PI / 2);
    const ghostMaterial = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
    const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
    ghost.visible = false;
    env.scene.add(ghost);
    ghostRef.current = ghost;

    const fishPos = new THREE.Vector3(0, 0, 0);
    const fishVel = new THREE.Vector3(0, 0, 0);
    const targetLookAt = new THREE.Vector3(0, 0, 1);
    const scratchTargetVec = new THREE.Vector3();
    const scratchDirVec = new THREE.Vector3();
    let currentSpeed: number = INITIAL_SPEED;
    let elapsedTotal = 0;
    let lastTime = performance.now();
    let lastUiUpdate = 0;
    let isFlashing = false;
    let isDisposed = false;
    let isVisible = true;
    let animId: number | null = null;

    const tick = (now: number): void => {
      if (isDisposed) return;

      if (!isVisible) {
        lastTime = now;
        animId = requestAnimationFrame(tick);
        return;
      }

      const realDt = Math.min(MAX_FRAME_SECONDS, Math.max(MIN_FRAME_SECONDS, (now - lastTime) * MS_TO_SECONDS));
      lastTime = now;
      const dt = pausedRef.current ? 0 : realDt * speedRef.current;

      if (dt > 0) {
        elapsedTotal += dt;

        const kinematics: FishKinematics = {
          position: { x: fishPos.x, y: fishPos.y, z: fishPos.z },
          velocity: { x: fishVel.x, y: fishVel.y, z: fishVel.z },
          headingAngle: fishMesh.rotation.y,
          pitchAngle: fishMesh.rotation.x,
          speed: currentSpeed,
        };
        const frame = controller.updateArena(kinematics, dt);
        const { outputs } = frame;

        fishMaterial.uniforms.uTime.value = elapsedTotal;
        fishMaterial.uniforms.uTailFrequency.value = outputs.tailFrequency;
        fishMaterial.uniforms.uSpineCurve.value = outputs.spineCurveAmplitude;
        fishMaterial.uniforms.uFinResistance.value = outputs.finResistance;
        fishMaterial.uniforms.uColorHue.value = outputs.bodyColorHue;
        fishMaterial.uniforms.uTension.value = outputs.tensionLevel;

        currentSpeed = THREE.MathUtils.lerp(currentSpeed, outputs.targetSpeed, Math.min(1, dt * SPEED_LERP_RATE));
        scratchDirVec.set(outputs.targetDirection.x, outputs.targetDirection.y, outputs.targetDirection.z);
        if (scratchDirVec.lengthSq() > DIRECTION_EPSILON) {
          scratchDirVec.normalize();
        }
        fishVel.copy(scratchDirVec).multiplyScalar(currentSpeed);
        fishPos.addScaledVector(fishVel, dt);
        clampFishToPondBounds(fishPos, fishVel, ARENA_BOUNDS);
        fishMesh.position.copy(fishPos);

        scratchTargetVec.copy(fishPos).add(fishVel);
        if (fishVel.lengthSq() > MOVEMENT_EPSILON) {
          targetLookAt.lerp(scratchTargetVec, Math.min(1, dt * TURN_LERP_RATE));
          fishMesh.lookAt(targetLookAt);
        }

        stimulusMeshes.syncStimuli(frame.stimuli, frame.telemetry.timeSeconds);

        const flashing = frame.stimuli.some((stimulus) => stimulus.kind === StimulusKind.FLASH);
        if (flashing !== isFlashing) {
          isFlashing = flashing;
          callbacksRef.current.onFlashChange(flashing);
        }

        if (now - lastUiUpdate >= UI_UPDATE_INTERVAL_MS) {
          lastUiUpdate = now;
          callbacksRef.current.onTelemetry(frame.telemetry);
        }
      }

      env.updateEnvironment(realDt, { x: 0, y: 0, z: 0 }, false, null);
      env.renderer.render(env.scene, env.camera);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    const resizeObserver = new ResizeObserver(() => {
      if (isDisposed) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      env.resize(width, height);
    });
    resizeObserver.observe(canvas);

    const visibilityObserver = new IntersectionObserver((entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
    });
    visibilityObserver.observe(canvas);

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      if (animId !== null) cancelAnimationFrame(animId);
      stimulusMeshes.disposeStimuli();
      env.scene.remove(fishMesh, ghost);
      fishGeometry.dispose();
      fishMaterial.dispose();
      ghostGeometry.dispose();
      ghostMaterial.dispose();
      env.dispose();
      envRef.current = null;
      ghostRef.current = null;
    };
  }, [controller]);

  const raycaster = useRef(new THREE.Raycaster());
  const waterPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const hitPoint = useRef(new THREE.Vector3());
  const pointer = useRef(new THREE.Vector2());

  function locateWaterPoint(event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>): THREE.Vector3 | null {
    const env = envRef.current;
    if (!env) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current.set(
      ((event.clientX - rect.left) / rect.width) * NDC_SPAN - 1,
      -(((event.clientY - rect.top) / rect.height) * NDC_SPAN - 1)
    );
    raycaster.current.setFromCamera(pointer.current, env.camera);
    const hit = raycaster.current.ray.intersectPlane(waterPlane.current, hitPoint.current);
    if (!hit) return null;
    hit.x = Math.max(ARENA_BOUNDS.MIN_X, Math.min(ARENA_BOUNDS.MAX_X, hit.x));
    hit.z = Math.max(ARENA_BOUNDS.MIN_Z, Math.min(ARENA_BOUNDS.MAX_Z, hit.z));
    return hit;
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const ghost = ghostRef.current;
    if (!ghost) return;
    if (!armedRef.current) {
      ghost.visible = false;
      return;
    }
    const point = locateWaterPoint(event);
    if (!point) return;
    ghost.visible = true;
    ghost.position.set(point.x, ARENA_BOUNDS.MAX_Y - GHOST_HEIGHT, point.z);
  };

  const handlePointerLeave = (): void => {
    if (ghostRef.current) ghostRef.current.visible = false;
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    const kind = armedRef.current;
    if (!kind) return;
    const point = locateWaterPoint(event);
    if (!point) return;
    onPlace(kind, point.x, point.z);
  };

  return (
    <div
      className={`${styles['fp-arena-stage']} position-absolute w-100 h-100`}
      data-armed-state={armedKind ? 'armed' : 'idle'}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className={`${styles['fp-arena-canvas-ts']} d-block w-100 h-100`}
        role="img"
        aria-label="Wide pond with one fish reacting to stimuli placed by the viewer"
      />
    </div>
  );
};

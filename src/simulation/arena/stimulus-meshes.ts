/**
 * Visuals for arena stimuli and the permanent refuge.
 * The manager mirrors the world's stimulus list into Three.js meshes each frame
 * and disposes everything it creates.
 */

import * as THREE from 'three';

import { StimulusInstance, StimulusKind } from '../../types/arena';
import { PondBoundsConfig } from '../../types/benchmark';
import { REFUGE_POSITION } from './arena-constants';

export interface StimulusMeshManager {
  syncStimuli: (stimuli: readonly StimulusInstance[], timeSeconds: number) => void;
  disposeStimuli: () => void;
}

interface MeshEntry {
  object: THREE.Object3D;
  materials: THREE.Material[];
}

const SHADOW_RADIUS = 1.0 as const;
const SHADOW_SCALE_X = 7.0 as const;
const SHADOW_SCALE_Z = 4.0 as const;
const SHADOW_MAX_OPACITY = 0.8 as const;
const SHADOW_FADE_SECONDS = 0.6 as const;
const SHADOW_HEIGHT_OFFSET = 0.05 as const;
const TAP_RING_INNER = 0.6 as const;
const TAP_RING_OUTER = 0.8 as const;
const TAP_RING_GROWTH = 9.0 as const;
const PELLET_RADIUS = 0.18 as const;
const ROCK_RADIUS = 0.85 as const;
const ROCK_NOISE = 0.22 as const;
const ROCK_SCALE_Y = 0.7 as const;
const KNOT_RADIUS = 0.24 as const;
const KNOT_TUBE = 0.08 as const;
const KNOT_SPIN_RATE = 1.6 as const;
const LEAF_SCALE_X = 0.9 as const;
const LEAF_SCALE_Z = 0.5 as const;
const LEAF_TURN_RATE = 0.3 as const;
const LURE_LENGTH = 0.5 as const;
const LURE_RADIUS = 0.11 as const;
const LURE_GLINT_RATE = 6.0 as const;
const RING_SEGMENTS = 40 as const;
const CIRCLE_SEGMENTS = 32 as const;
const KNOT_TUBULAR = 48 as const;
const KNOT_RADIAL = 8 as const;
const ROCK_DETAIL = 1 as const;
const CAPSULE_SEGMENTS = 6 as const;
const REFUGE_PLANT_COUNT = 7 as const;
const REFUGE_SPREAD = 2.4 as const;
const REFUGE_PLANT_HEIGHT = 2.8 as const;
const REFUGE_PLANT_RADIUS = 0.16 as const;
const FLOOR_ROCK_RADIUS = 1.5 as const;
const HALF = 0.5 as const;

function buildRockGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(ROCK_RADIUS, ROCK_DETAIL);
  const positions = geometry.attributes.position;
  // Deterministic lumpy noise from the vertex index keeps every rock identical between runs
  for (let i = 0; i < positions.count; i++) {
    const noise = 1 + (Math.sin(i * 12.9898) * HALF) * ROCK_NOISE;
    positions.setXYZ(i, positions.getX(i) * noise, positions.getY(i) * noise * ROCK_SCALE_Y, positions.getZ(i) * noise);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function buildStimulusMeshManager(scene: THREE.Scene, bounds: PondBoundsConfig): StimulusMeshManager {
  const entries: Map<number, MeshEntry> = new Map();
  const geometries: THREE.BufferGeometry[] = [];
  const staticMaterials: THREE.Material[] = [];

  function track<T extends THREE.BufferGeometry>(geometry: T): T {
    geometries.push(geometry);
    return geometry;
  }

  const shadowGeometry = track(new THREE.CircleGeometry(SHADOW_RADIUS, CIRCLE_SEGMENTS));
  shadowGeometry.rotateX(-Math.PI / 2);
  const tapGeometry = track(new THREE.RingGeometry(TAP_RING_INNER, TAP_RING_OUTER, RING_SEGMENTS));
  tapGeometry.rotateX(-Math.PI / 2);
  const pelletGeometry = track(new THREE.SphereGeometry(PELLET_RADIUS, 16, 16));
  const rockGeometry = track(buildRockGeometry());
  const knotGeometry = track(new THREE.TorusKnotGeometry(KNOT_RADIUS, KNOT_TUBE, KNOT_TUBULAR, KNOT_RADIAL));
  const leafGeometry = track(new THREE.CircleGeometry(HALF, CIRCLE_SEGMENTS));
  leafGeometry.rotateX(-Math.PI / 2);
  const lureGeometry = track(new THREE.CapsuleGeometry(LURE_RADIUS, LURE_LENGTH, CAPSULE_SEGMENTS, CAPSULE_SEGMENTS * 2));

  const pelletMaterial = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.6 });
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x6b6f78, roughness: 0.95, flatShading: true });
  const knotMaterial = new THREE.MeshStandardMaterial({ color: 0xc026d3, emissive: 0x86198f, emissiveIntensity: 0.7 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, side: THREE.DoubleSide });
  staticMaterials.push(pelletMaterial, rockMaterial, knotMaterial, leafMaterial);

  function buildEntry(stimulus: StimulusInstance): MeshEntry | null {
    switch (stimulus.kind) {
      case StimulusKind.SHADOW: {
        const material = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false });
        const mesh = new THREE.Mesh(shadowGeometry, material);
        mesh.scale.set(SHADOW_SCALE_X, 1, SHADOW_SCALE_Z);
        return { object: mesh, materials: [material] };
      }
      case StimulusKind.TAP: {
        const material = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        return { object: new THREE.Mesh(tapGeometry, material), materials: [material] };
      }
      case StimulusKind.PELLET:
        return { object: new THREE.Mesh(pelletGeometry, pelletMaterial), materials: [] };
      case StimulusKind.ROCK:
        return { object: new THREE.Mesh(rockGeometry, rockMaterial), materials: [] };
      case StimulusKind.NOVEL_FOOD:
        return { object: new THREE.Mesh(knotGeometry, knotMaterial), materials: [] };
      case StimulusKind.LEAF: {
        const mesh = new THREE.Mesh(leafGeometry, leafMaterial);
        mesh.scale.set(LEAF_SCALE_X, 1, LEAF_SCALE_Z);
        return { object: mesh, materials: [] };
      }
      case StimulusKind.LURE: {
        const material = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.25, emissive: 0x38bdf8, emissiveIntensity: 0.2 });
        const mesh = new THREE.Mesh(lureGeometry, material);
        mesh.rotation.z = Math.PI / 2;
        return { object: mesh, materials: [material] };
      }
      default:
        return null;
    }
  }

  function animateEntry(entry: MeshEntry, stimulus: StimulusInstance, timeSeconds: number): void {
    const { object } = entry;
    object.position.set(stimulus.position.x, stimulus.position.y, stimulus.position.z);

    switch (stimulus.kind) {
      case StimulusKind.SHADOW: {
        const material = entry.materials[0] as THREE.MeshBasicMaterial;
        const fadeIn = Math.min(1, stimulus.ageSeconds / SHADOW_FADE_SECONDS);
        const fadeOut = Math.min(1, (stimulus.lifetimeSeconds - stimulus.ageSeconds) / SHADOW_FADE_SECONDS);
        material.opacity = SHADOW_MAX_OPACITY * Math.max(0, Math.min(fadeIn, fadeOut));
        object.position.y += SHADOW_HEIGHT_OFFSET;
        break;
      }
      case StimulusKind.TAP: {
        const material = entry.materials[0] as THREE.MeshBasicMaterial;
        const progress = stimulus.ageSeconds / stimulus.lifetimeSeconds;
        const scale = 1 + stimulus.ageSeconds * TAP_RING_GROWTH;
        object.scale.set(scale, 1, scale);
        material.opacity = 0.8 * (1 - progress);
        break;
      }
      case StimulusKind.NOVEL_FOOD:
        object.rotation.y = timeSeconds * KNOT_SPIN_RATE;
        object.rotation.x = timeSeconds * KNOT_SPIN_RATE * HALF;
        break;
      case StimulusKind.LEAF:
        object.rotation.y = timeSeconds * LEAF_TURN_RATE + stimulus.id;
        break;
      case StimulusKind.LURE: {
        const material = entry.materials[0] as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.3 + Math.abs(Math.sin(timeSeconds * LURE_GLINT_RATE)) * 0.7;
        object.rotation.y = timeSeconds;
        break;
      }
      default:
        break;
    }
  }

  function syncStimuli(stimuli: readonly StimulusInstance[], timeSeconds: number): void {
    const liveIds = new Set<number>();

    for (const stimulus of stimuli) {
      if (stimulus.kind === StimulusKind.FLASH) continue;
      liveIds.add(stimulus.id);

      let entry = entries.get(stimulus.id);
      if (!entry) {
        const created = buildEntry(stimulus);
        if (!created) continue;
        entry = created;
        entries.set(stimulus.id, entry);
        scene.add(entry.object);
      }
      animateEntry(entry, stimulus, timeSeconds);
    }

    for (const [id, entry] of entries) {
      if (liveIds.has(id)) continue;
      scene.remove(entry.object);
      entry.materials.forEach((material) => material.dispose());
      entries.delete(id);
    }
  }

  // Permanent refuge: a stand of reeds against a rock arch, the fish's known shelter
  const refuge = new THREE.Group();
  refuge.position.set(REFUGE_POSITION.x, bounds.MIN_Y, REFUGE_POSITION.z);
  const reedGeometry = track(new THREE.CylinderGeometry(REFUGE_PLANT_RADIUS * HALF, REFUGE_PLANT_RADIUS, REFUGE_PLANT_HEIGHT, 6));
  const reedMaterial = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });
  const refugeRockGeometry = track(new THREE.IcosahedronGeometry(FLOOR_ROCK_RADIUS, 1));
  const refugeRockMaterial = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 1, flatShading: true });
  staticMaterials.push(reedMaterial, refugeRockMaterial);
  for (let i = 0; i < REFUGE_PLANT_COUNT; i++) {
    const angle = (i / REFUGE_PLANT_COUNT) * Math.PI * 2;
    const reed = new THREE.Mesh(reedGeometry, reedMaterial);
    reed.position.set(Math.cos(angle) * REFUGE_SPREAD * HALF, REFUGE_PLANT_HEIGHT * HALF, Math.sin(angle) * REFUGE_SPREAD * HALF);
    reed.rotation.z = Math.sin(i * 3.1) * 0.15;
    refuge.add(reed);
  }
  const shelterRock = new THREE.Mesh(refugeRockGeometry, refugeRockMaterial);
  shelterRock.scale.set(1.3, 0.6, 1);
  shelterRock.position.set(REFUGE_SPREAD * HALF, 0, 0);
  refuge.add(shelterRock);
  scene.add(refuge);

  function disposeStimuli(): void {
    for (const entry of entries.values()) {
      scene.remove(entry.object);
      entry.materials.forEach((material) => material.dispose());
    }
    entries.clear();
    scene.remove(refuge);
    geometries.forEach((geometry) => geometry.dispose());
    staticMaterials.forEach((material) => material.dispose());
  }

  return { syncStimuli, disposeStimuli };
}

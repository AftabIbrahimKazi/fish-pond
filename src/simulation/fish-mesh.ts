/**
 * Procedural Fish Mesh and Deformation Shaders.
 * Implements GPU vertex deformation and physical boundary clamping per benchmark spec.
 */

import * as THREE from 'three';
import { PondBoundsConfig, Vector3D } from '../types/benchmark';

export const POND_BOUNDS = {
  MIN_X: -10.0,
  MAX_X: 10.0,
  MIN_Y: -3.5,
  MAX_Y: 3.5,
  MIN_Z: -6.0,
  MAX_Z: 6.0,
} as const;

export const FISH_SAFETY_LIMITS = {
  MIN_TAIL_FREQ: 0.8,
  MAX_TAIL_FREQ: 7.5,
  MIN_SPINE_CURVE: 0.05,
  MAX_SPINE_CURVE: 0.95,
  MIN_FIN_RESISTANCE: 0.1,
  MAX_FIN_RESISTANCE: 1.0,
  MAX_SPEED: 8.0,
  MIN_SPEED: 0.2,
} as const;

const FISH_BODY_LENGTH = 3.2 as const;
const FISH_BODY_RADIUS = 0.55 as const;
const FISH_RADIAL_SEGMENTS = 24 as const;
const FISH_TUBULAR_SEGMENTS = 32 as const;

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uTailFrequency;
  uniform float uSpineCurve;
  uniform float uFinResistance;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vWaveFactor;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec3 transformed = position;

    // Normalize z position: head at positive z, tail at negative z
    float tailWeight = smoothstep(1.5, -1.8, transformed.z);
    float wavePhase = (transformed.z * 1.8) - (uTime * uTailFrequency * 6.28318);
    float lateralOffset = sin(wavePhase) * uSpineCurve * tailWeight * 0.45;
    
    // Fin resistance dampens forward velocity response and creates drag flexion
    transformed.x += lateralOffset;
    transformed.y += cos(wavePhase * 0.5) * uSpineCurve * tailWeight * 0.08 * uFinResistance;

    vWaveFactor = tailWeight;
    vPosition = (modelViewMatrix * vec4(transformed, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float uColorHue;
  uniform float uTension;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vWaveFactor;

  void main() {
    vec3 lightDir = normalize(vec3(0.3, 1.0, 0.5));
    float diff = max(dot(vNormal, lightDir), 0.0);
    float rim = 1.0 - max(dot(vNormal, normalize(-vPosition)), 0.0);
    rim = pow(rim, 2.5);

    // Dynamic coloration between serene aqua, inquisitive gold, and agitated crimson
    vec3 sereneColor = vec3(0.12, 0.55, 0.75);
    vec3 anxiousColor = vec3(0.92, 0.22, 0.18);
    vec3 feedingColor = vec3(0.95, 0.65, 0.15);

    vec3 activeMoodColor = mix(sereneColor, anxiousColor, clamp(uTension, 0.0, 1.0));
    if (uColorHue > 0.6) {
      activeMoodColor = mix(activeMoodColor, feedingColor, (uColorHue - 0.6) * 2.5);
    }

    vec3 finalColor = mix(activeMoodColor * 0.4, activeMoodColor * 1.2, diff);
    finalColor += vec3(0.3, 0.6, 0.8) * rim * 0.6;
    
    // Dorsal pattern stripes
    float stripe = sin(vUv.y * 35.0) * 0.5 + 0.5;
    finalColor = mix(finalColor, vec3(1.0, 0.95, 0.85), stripe * 0.25 * (1.0 - vWaveFactor));

    gl_FragColor = vec4(finalColor, 0.96);
  }
`;

export function createProceduralFishMesh(): {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  geometry: THREE.BufferGeometry;
} {
  const geometry = new THREE.ConeGeometry(
    FISH_BODY_RADIUS,
    FISH_BODY_LENGTH,
    FISH_RADIAL_SEGMENTS,
    FISH_TUBULAR_SEGMENTS
  );

  // Rotate geometry so nose points along positive Z
  geometry.rotateX(Math.PI / 2);

  // Tail fin geometry attachment
  const tailGeometry = new THREE.BoxGeometry(0.04, 0.9, 0.7);
  tailGeometry.translate(0, 0, -FISH_BODY_LENGTH * 0.55);

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uTailFrequency: { value: 2.0 },
      uSpineCurve: { value: 0.2 },
      uFinResistance: { value: 0.5 },
      uColorHue: { value: 0.2 },
      uTension: { value: 0.0 },
    },
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Add tail fin child mesh
  const tailMesh = new THREE.Mesh(tailGeometry, material);
  mesh.add(tailMesh);

  return { mesh, material, geometry };
}

export function clampFishToPondBounds(
  pos: THREE.Vector3,
  velocity: THREE.Vector3,
  bounds: PondBoundsConfig = POND_BOUNDS
): void {
  const MARGIN = 0.6 as const;
  const BOUNCE_FACTOR = -0.5 as const;

  if (pos.x < bounds.MIN_X + MARGIN) {
    pos.x = bounds.MIN_X + MARGIN;
    velocity.x *= BOUNCE_FACTOR;
  } else if (pos.x > bounds.MAX_X - MARGIN) {
    pos.x = bounds.MAX_X - MARGIN;
    velocity.x *= BOUNCE_FACTOR;
  }

  if (pos.y < bounds.MIN_Y + MARGIN) {
    pos.y = bounds.MIN_Y + MARGIN;
    velocity.y *= BOUNCE_FACTOR;
  } else if (pos.y > bounds.MAX_Y - MARGIN) {
    pos.y = bounds.MAX_Y - MARGIN;
    velocity.y *= BOUNCE_FACTOR;
  }

  if (pos.z < bounds.MIN_Z + MARGIN) {
    pos.z = bounds.MIN_Z + MARGIN;
    velocity.z *= BOUNCE_FACTOR;
  } else if (pos.z > bounds.MAX_Z - MARGIN) {
    pos.z = bounds.MAX_Z - MARGIN;
    velocity.z *= BOUNCE_FACTOR;
  }
}

export function calculateEffectiveDistance(a: Vector3D, b: Vector3D): number {
  const dx = a.x - b.x;
  const dy = (a.y - b.y) * 0.35;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}


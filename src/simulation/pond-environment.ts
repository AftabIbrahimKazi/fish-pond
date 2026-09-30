/**
 * Volumetric Pond Scene Environment.
 * Implements ray-marched water lighting, caustic floor shaders, and scene hygiene.
 */

import * as THREE from 'three';
import { POND_BOUNDS } from './fish-mesh';
import { PondBoundsConfig, Vector3D } from '../types/benchmark';

const CAUSTIC_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const CAUSTIC_FRAGMENT_SHADER = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  // Simple procedural simplex/voronoi approximation for water caustics
  float causticPattern(vec2 p, float time) {
    vec2 p1 = p * 1.8 + vec2(time * 0.25, time * 0.15);
    vec2 p2 = p * 2.4 - vec2(time * 0.18, time * 0.32);
    float c1 = sin(p1.x * 4.0 + sin(p1.y * 3.5)) * 0.5 + 0.5;
    float c2 = cos(p2.x * 5.0 + cos(p2.y * 4.0)) * 0.5 + 0.5;
    return pow(c1 * c2, 1.8) * 1.7;
  }

  void main() {
    float caustics = causticPattern(vWorldPosition.xz, uTime);
    vec3 floorColor = vec3(0.04, 0.09, 0.16);
    vec3 causticLight = vec3(0.12, 0.45, 0.65) * caustics;
    
    // Depth fog attenuation (simulate light absorption through water column)
    float depthFactor = clamp((vWorldPosition.y + 4.0) / 8.0, 0.0, 1.0);
    vec3 finalColor = mix(floorColor * 0.6, floorColor + causticLight, depthFactor);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export interface PondSceneEnvironment {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  updateEnvironment: (deltaTime: number, threatPos: Vector3D, threatActive: boolean, foodPos: Vector3D | null) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

const CAMERA_FOV_DEGREES = 48 as const;
const CAMERA_BASE_DISTANCE = 14.0 as const;
const CAMERA_BASE_HEIGHT = 5.0 as const;
const CAMERA_FRAME_MARGIN = 1.5 as const;
const CAMERA_LOOK_Y = -0.5 as const;
const FOG_DENSITY = 0.03 as const;
const DEGREES_TO_RADIANS = Math.PI / 180;
const HALF = 0.5 as const;

/**
 * Pulls the camera back until the full pond width fits the viewport aspect ratio,
 * so the fish can never swim out of frame in narrow viewports.
 */
function frameCameraToPond(camera: THREE.PerspectiveCamera, aspect: number, bounds: PondBoundsConfig): void {
  const halfTanVertical = Math.tan(CAMERA_FOV_DEGREES * DEGREES_TO_RADIANS * HALF);
  const halfTanHorizontal = halfTanVertical * aspect;
  const halfPondWidth = bounds.MAX_X + CAMERA_FRAME_MARGIN;
  const requiredDistance = halfPondWidth / halfTanHorizontal;
  const cameraZ = Math.max(CAMERA_BASE_DISTANCE, bounds.MAX_Z + requiredDistance);

  camera.position.set(0, CAMERA_BASE_HEIGHT * (cameraZ / CAMERA_BASE_DISTANCE), cameraZ);
  camera.lookAt(0, CAMERA_LOOK_Y, 0);
}

export function createPondEnvironment(
  canvas: HTMLCanvasElement,
  bounds: PondBoundsConfig = POND_BOUNDS
): PondSceneEnvironment {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040813);
  scene.fog = new THREE.FogExp2(0x040813, FOG_DENSITY);

  const initialAspect = canvas.clientWidth / (canvas.clientHeight || 1);
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEGREES, initialAspect, 0.1, 80);
  frameCameraToPond(camera, initialAspect, bounds);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Ambient aquatic lighting
  const ambientLight = new THREE.AmbientLight(0x133854, 1.4);
  scene.add(ambientLight);

  // Directional sun beam light
  const sunLight = new THREE.DirectionalLight(0x78d9fc, 2.2);
  sunLight.position.set(4, 12, 6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  scene.add(sunLight);

  // Caustic Pond Floor
  const floorWidth = (bounds.MAX_X - bounds.MIN_X) * 1.5;
  const floorDepth = (bounds.MAX_Z - bounds.MIN_Z) * 1.5;
  const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorDepth, 32, 32);
  floorGeometry.rotateX(-Math.PI / 2);
  floorGeometry.translate(0, bounds.MIN_Y - 0.2, 0);

  const floorMaterial = new THREE.ShaderMaterial({
    vertexShader: CAUSTIC_VERTEX_SHADER,
    fragmentShader: CAUSTIC_FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
    },
  });
  const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // Pond Boundary Wireframe Cage (subtle container guide)
  const cageGeometry = new THREE.BoxGeometry(
    bounds.MAX_X - bounds.MIN_X,
    bounds.MAX_Y - bounds.MIN_Y,
    bounds.MAX_Z - bounds.MIN_Z
  );
  const cageMaterial = new THREE.MeshBasicMaterial({
    color: 0x184265,
    wireframe: true,
    transparent: true,
    opacity: 0.18,
  });
  const cageMesh = new THREE.Mesh(cageGeometry, cageMaterial);
  cageMesh.position.set(0, 0, 0);
  scene.add(cageMesh);

  // Floating Micro-particles (Pond plankton/dust)
  const particleCount = 120;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * (bounds.MAX_X - bounds.MIN_X);
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * (bounds.MAX_Y - bounds.MIN_Y);
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * (bounds.MAX_Z - bounds.MIN_Z);
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x4ac7e8,
    size: 0.08,
    transparent: true,
    opacity: 0.45,
  });
  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particleSystem);

  // Threat Indicator (Cursor Hand projection ring)
  const threatRingGeo = new THREE.RingGeometry(0.5, 0.7, 32);
  threatRingGeo.rotateX(-Math.PI / 2);
  const threatRingMat = new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
  });
  const threatMesh = new THREE.Mesh(threatRingGeo, threatRingMat);
  scene.add(threatMesh);

  // Food Pellet Particle
  const foodGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const foodMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.6,
  });
  const foodMesh = new THREE.Mesh(foodGeo, foodMat);
  foodMesh.visible = false;
  scene.add(foodMesh);

  let elapsedTime = 0;

  function updateEnvironment(
    deltaTime: number,
    threatPos: Vector3D,
    threatActive: boolean,
    foodPos: Vector3D | null
  ): void {
    elapsedTime += deltaTime;
    floorMaterial.uniforms.uTime.value = elapsedTime;

    // Animate subtle plankton drift
    const positions = particleGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 1] -= deltaTime * 0.15;
      if (positions[i * 3 + 1] < bounds.MIN_Y) {
        positions[i * 3 + 1] = bounds.MAX_Y;
      }
    }
    particleGeometry.attributes.position.needsUpdate = true;

    // Threat ring visibility and position
    if (threatActive) {
      threatMesh.position.set(threatPos.x, bounds.MAX_Y - 0.1, threatPos.z);
      threatRingMat.opacity = THREE.MathUtils.lerp(threatRingMat.opacity, 0.75, 0.15);
      const pulse = 1.0 + Math.sin(elapsedTime * 8.0) * 0.15;
      threatMesh.scale.set(pulse, pulse, pulse);
    } else {
      threatRingMat.opacity = THREE.MathUtils.lerp(threatRingMat.opacity, 0.0, 0.1);
    }

    // Food pellet positioning
    if (foodPos) {
      foodMesh.visible = true;
      foodMesh.position.set(foodPos.x, foodPos.y, foodPos.z);
    } else {
      foodMesh.visible = false;
    }
  }

  function resize(width: number, height: number): void {
    const aspect = width / height;
    camera.aspect = aspect;
    frameCameraToPond(camera, aspect, bounds);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function dispose(): void {
    floorGeometry.dispose();
    floorMaterial.dispose();
    cageGeometry.dispose();
    cageMaterial.dispose();
    particleGeometry.dispose();
    particleMaterial.dispose();
    threatRingGeo.dispose();
    threatRingMat.dispose();
    foodGeo.dispose();
    foodMat.dispose();
    renderer.dispose();
  }

  return {
    scene,
    camera,
    renderer,
    updateEnvironment,
    resize,
    dispose,
  };
}


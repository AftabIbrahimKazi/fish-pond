/**
 * Underwater Engine.
 * Owns the whole Scene 03 render stack: WebGL renderer, Triforge-shaded scenery, real goldfish
 * models, and the Triforge compositor chain that grades the final frame.
 */

import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  Matrix4,
  MathUtils,
  Mesh,
  PMREMGenerator,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  Raycaster,
  Scene,
  SphereGeometry,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {
  Bloom,
  ColorBalance,
  CompositorOutput,
  FilmGrain,
  HueSaturation,
  Vignette,
} from '@triforge/compositor-core';

import { CursorThreat, FishAgent, FishMode, UnderwaterEngineCallbacks, UnderwaterLoadState } from '../../types/underwater';
import { buildSeededRandom } from '../prng';
import { buildDomeMaterial, buildFishShadowMaterial, buildLightShaftMaterial, buildWaterSurfaceMaterial } from './atmosphere-materials';
import { FishBodyAnimation } from './fish-body-animation';
import { FishModelLoader, FishTemplate } from './fish-loader';
import { FishSchoolController } from './fish-school-controller';
import { FoodPelletSimulation } from './food-pellet-simulation';
import { HeightSampler, buildRockGeometry, buildSeabedGeometry, buildTerrainSampler } from './scene-geometry';
import { SeagrassAnimation } from './seagrass-animation';
import { ROCK_CONFIG, SEABED_CONFIG, buildFoliageMaterial, buildSurfaceMaterial } from './surface-materials';
import { buildClock } from './triforge-graph';
import {
  BLOOM_RADIUS,
  BLOOM_STRENGTH,
  BLOOM_THRESHOLD,
  CAMERA_BASE_POSITION,
  CAMERA_BOB_AMPLITUDE,
  CAMERA_BOB_SPEED,
  CAMERA_DRIFT_RADIUS,
  CAMERA_DRIFT_SPEED,
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_LOOK_X,
  CAMERA_LOOK_Y,
  CAMERA_PARALLAX_DAMPING,
  CAMERA_PARALLAX_X,
  CAMERA_PARALLAX_Y,
  CAMERA_TARGET,
  DOME_RADIUS,
  DAPPLE_AMOUNT,
  ENTRY_DELAYS,
  ENTRY_EDGE_X,
  ENTRY_TARGET_X,
  DAPPLE_SPEED,
  ENVIRONMENT_INTENSITY,
  FILL_COLOR,
  FILL_INTENSITY,
  FILL_POSITION,
  FISH_CEILING_Y,
  FISH_DOMAIN_MAX_X,
  FISH_DOMAIN_MAX_Z,
  FISH_DOMAIN_MIN_X,
  FISH_DOMAIN_MIN_Z,
  FOOD_MIN_Y,
  FOOD_PLANE_Z,
  TEMPERAMENTS,
  SPECIES_PROFILES,
  RIM_COLOR,
  RIM_INTENSITY,
  RIM_POSITION,
  FISH_SHADOW_BASE_SIZE,
  FISH_SHADOW_LIFT,
  FISH_SHADOW_SPREAD,
  FOG_COLOR,
  FOG_DENSITY,
  GRADE_GAIN_B,
  GRADE_GAIN_G,
  GRADE_GAIN_R,
  GRADE_LIFT_B,
  GRADE_LIFT_G,
  GRADE_LIFT_R,
  GRADE_SATURATION,
  GRAIN_INTENSITY,
  HEMI_GROUND_COLOR,
  HEMI_INTENSITY,
  HEMI_SKY_COLOR,
  HUE_NEUTRAL,
  MAX_FRAME_SECONDS,
  MAX_PIXEL_RATIO,
  MIN_PIXEL_RATIO,
  MS_TO_SECONDS,
  MULTISAMPLE_COUNT,
  PARTICLE_COUNT,
  QUALITY_RATIO_STEP,
  QUALITY_SAMPLE_FRAMES,
  QUALITY_SLOW_FRAME_SECONDS,
  PARTICLE_DRIFT_SPEED,
  PARTICLE_EXTENT_X,
  PARTICLE_EXTENT_Y,
  PARTICLE_EXTENT_Z,
  PARTICLE_OPACITY,
  PARTICLE_SIZE,
  PARTICLE_SPRITE_SIZE,
  ROCK_BURY_FRACTION,
  ROCK_PLACEMENTS,
  SEAGRASS_PATCHES,
  SCENERY_SEED,
  SHAFT_COUNT,
  SHAFT_LENGTH,
  SHAFT_SPREAD_X,
  SHAFT_SPREAD_Z,
  SHAFT_WIDTH_MAX,
  SHAFT_WIDTH_MIN,
  SUN_COLOR,
  SUN_DIRECTION,
  SUN_DISTANCE,
  SUN_INTENSITY,
  SURFACE_SIZE,
  SURFACE_Y,
  TONE_MAPPING_EXPOSURE,
  VIGNETTE_DARKNESS,
  VIGNETTE_OFFSET,
} from './underwater-constants';

const QUARTER_TURN = Math.PI / 2;
const TWO_PI = Math.PI * 2;
const HALF = 0.5 as const;
const NDC_SPAN = 2 as const;
const WIDE_ASPECT = 1.6 as const;
const NARROW_PULLBACK = 0.55 as const;
const DOME_WIDTH_SEGMENTS = 48 as const;
const DOME_HEIGHT_SEGMENTS = 24 as const;
const ENVIRONMENT_DOME_RADIUS = 50 as const;
const ENVIRONMENT_SIGMA = 0.03 as const;
const ENVIRONMENT_NEAR = 0.1 as const;
const ENVIRONMENT_FAR = 100 as const;
const CAMERA_DRIFT_DEPTH_FACTOR = 0.5 as const;
const CAMERA_DRIFT_DEPTH_SPEED = 0.8 as const;
const PARTICLE_COLOR = '#d9f4f2' as const;
const PARTICLE_FLOOR = 0.4 as const;
const PARTICLE_WOBBLE = 0.12 as const;
const PARTICLE_WOBBLE_SPEED = 0.6 as const;
const PARTICLE_SPEED_MIN = 0.4 as const;
const PARTICLE_SPEED_RANGE = 1.2 as const;
const SPRITE_STOP_CORE = 0.25 as const;
const SPRITE_STOP_EDGE = 1 as const;
const SHAFT_YAW_SEED = 9137 as const;
const SHAFT_PRIORITY = 2 as const;
const SHAFT_YAW_JITTER = 1.1 as const;
const SHADOW_WIDTH_RATIO = 0.4 as const;
const SHADOW_PRIORITY = 1 as const;
const DAPPLE_SECOND_RATE = 2.3 as const;
const DAPPLE_SECOND_WEIGHT = 0.6 as const;
const DAPPLE_THIRD_RATE = 4.1 as const;
const DAPPLE_THIRD_WEIGHT = 0.3 as const;
const DAPPLE_NORMALISER = 1.9 as const;

interface DriftParticles {
  points: Points;
  speeds: Float32Array;
  phases: Float32Array;
}

export class UnderwaterEngine {
  private readonly _canvas: HTMLCanvasElement;
  private readonly _callbacks: UnderwaterEngineCallbacks;
  private readonly _clock = buildClock();
  private readonly _sunDirection = new Vector3(...SUN_DIRECTION).normalize();
  private readonly _lookTarget = new Vector3(...CAMERA_TARGET);
  private readonly _baseCameraPosition = new Vector3(...CAMERA_BASE_POSITION);
  private readonly _pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 };
  private readonly _disposables: Array<{ dispose: () => void }> = [];

  private _renderer: WebGLRenderer | null = null;
  private _scene: Scene | null = null;
  private _camera: PerspectiveCamera | null = null;
  private _compositor: CompositorOutput | null = null;
  private _sampleHeight: HeightSampler | null = null;
  private _dome: Mesh | null = null;
  private _seagrass: SeagrassAnimation | null = null;
  private _particles: DriftParticles | null = null;
  private _agents: FishAgent[] = [];
  private _bodies: FishBodyAnimation[] = [];
  private _school: FishSchoolController | null = null;
  private _pellets: FoodPelletSimulation | null = null;
  private _sun: DirectionalLight | null = null;
  private _sunBaseIntensity = SUN_INTENSITY;
  private readonly _raycaster = new Raycaster();
  private readonly _ndc = new Vector2();
  private readonly _foodPlane = new Plane(new Vector3(0, 0, 1), -FOOD_PLANE_Z);
  private readonly _dropPoint = new Vector3();
  private readonly _cursorThreat: CursorThreat = { origin: new Vector3(), direction: new Vector3() };
  private readonly _cursor = { x: 0, y: 0, isActive: false };
  private _shadows: Mesh[] = [];
  private _resizeObserver: ResizeObserver | null = null;
  private _visibilityObserver: IntersectionObserver | null = null;
  private _frameId: number | null = null;
  private _lastFrameTime = 0;
  private _elapsed = 0;
  private _pullback = 1;
  private _pixelRatio = 1;
  private _sampledFrames = 0;
  private _sampledSeconds = 0;
  private readonly _lookScratch = new Vector3();
  private _isVisible = true;
  private _isDestroyed = false;

  constructor(canvas: HTMLCanvasElement, callbacks: UnderwaterEngineCallbacks) {
    this._canvas = canvas;
    this._callbacks = callbacks;
  }

  public async init(): Promise<void> {
    try {
      this._buildRenderer();
      this._buildScene();
      await this._buildCompositor();
      this._bindObservers();
      this._startLoop();
      const templates = await this._buildFishTemplates();
      if (this._isDestroyed) return;
      this._setupFish(templates);
      this._callbacks.onLoadStateChange(UnderwaterLoadState.READY);
    } catch {
      if (!this._isDestroyed) this._callbacks.onLoadStateChange(UnderwaterLoadState.ERROR);
    }
  }

  public destroy(): void {
    this._isDestroyed = true;
    if (this._frameId !== null) cancelAnimationFrame(this._frameId);
    this._frameId = null;
    this._resizeObserver?.disconnect();
    this._visibilityObserver?.disconnect();
    window.removeEventListener('pointermove', this._onPointerMove);
    this._canvas.removeEventListener('pointerdown', this._onPointerDown);
    this._bodies.forEach((body) => body.destroy());
    this._pellets?.destroy();
    this._seagrass?.destroy();
    this._compositor?.dispose();
    this._disposables.forEach((entry) => entry.dispose());
    this._disposables.length = 0;
    this._renderer?.dispose();
    this._renderer = null;
    this._scene = null;
    this._camera = null;
    this._compositor = null;
  }

  private _setDisposable<T extends { dispose: () => void }>(resource: T): T {
    this._disposables.push(resource);
    return resource;
  }

  private _buildRenderer(): void {
    const renderer = new WebGLRenderer({ canvas: this._canvas, antialias: false, powerPreference: 'high-performance' });
    this._pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    renderer.setPixelRatio(this._pixelRatio);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = TONE_MAPPING_EXPOSURE;
    this._renderer = renderer;
  }

  private _buildScene(): void {
    const scene = new Scene();
    scene.fog = new FogExp2(new Color(FOG_COLOR), FOG_DENSITY);
    this._scene = scene;

    this._camera = new PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
    this._camera.position.copy(this._baseCameraPosition);

    this._buildLights(scene);
    this._buildBackdrop(scene);
    this._buildTerrain(scene);
    this._buildAtmosphere(scene);
  }

  private _buildLights(scene: Scene): void {
    const sun = new DirectionalLight(new Color(SUN_COLOR), SUN_INTENSITY);
    sun.position.copy(this._sunDirection).multiplyScalar(SUN_DISTANCE);
    scene.add(sun, sun.target);
    this._sun = sun;
    this._sunBaseIntensity = SUN_INTENSITY;
    const rim = new DirectionalLight(new Color(RIM_COLOR), RIM_INTENSITY);
    rim.position.set(...RIM_POSITION);
    const fill = new DirectionalLight(new Color(FILL_COLOR), FILL_INTENSITY);
    fill.position.set(...FILL_POSITION);
    scene.add(rim, fill);
    scene.add(new HemisphereLight(new Color(HEMI_SKY_COLOR), new Color(HEMI_GROUND_COLOR), HEMI_INTENSITY));
  }

  private _buildBackdrop(scene: Scene): void {
    const renderer = this._renderer;
    if (!renderer) return;
    const domeMaterial = this._setDisposable(buildDomeMaterial(this._clock));
    const domeGeometry = this._setDisposable(new SphereGeometry(DOME_RADIUS, DOME_WIDTH_SEGMENTS, DOME_HEIGHT_SEGMENTS));
    this._dome = new Mesh(domeGeometry, domeMaterial);
    this._dome.frustumCulled = false;
    this._dome.renderOrder = -1;
    scene.add(this._dome);

    const surfaceGeometry = this._setDisposable(new PlaneGeometry(SURFACE_SIZE, SURFACE_SIZE));
    surfaceGeometry.rotateX(QUARTER_TURN);
    const surface = new Mesh(surfaceGeometry, this._setDisposable(buildWaterSurfaceMaterial(this._clock)));
    surface.position.y = SURFACE_Y;
    scene.add(surface);

    const envScene = new Scene();
    const envGeometry = new SphereGeometry(ENVIRONMENT_DOME_RADIUS, DOME_WIDTH_SEGMENTS, DOME_HEIGHT_SEGMENTS);
    envScene.add(new Mesh(envGeometry, domeMaterial));
    const generator = new PMREMGenerator(renderer);
    const target = generator.fromScene(envScene, ENVIRONMENT_SIGMA, ENVIRONMENT_NEAR, ENVIRONMENT_FAR);
    scene.environment = target.texture;
    scene.environmentIntensity = ENVIRONMENT_INTENSITY;
    this._setDisposable(target);
    generator.dispose();
    envGeometry.dispose();
  }

  private _buildTerrain(scene: Scene): void {
    const sampleHeight = buildTerrainSampler();
    this._sampleHeight = sampleHeight;

    const seabed = new Mesh(
      this._setDisposable(buildSeabedGeometry(sampleHeight)),
      this._setDisposable(buildSurfaceMaterial(SEABED_CONFIG, this._clock)),
    );
    scene.add(seabed);

    const rockMaterial = this._setDisposable(buildSurfaceMaterial(ROCK_CONFIG, this._clock));
    const rocks = new Group();
    ROCK_PLACEMENTS.forEach((placement) => {
      const rock = new Mesh(this._setDisposable(buildRockGeometry(placement)), rockMaterial);
      const buried = placement.radius * placement.squash * ROCK_BURY_FRACTION;
      rock.position.set(placement.x, sampleHeight(placement.x, placement.z) - buried, placement.z);
      rock.rotation.y = placement.rotation;
      rocks.add(rock);
    });
    scene.add(rocks);

    const seagrass = new SeagrassAnimation(SEAGRASS_PATCHES, sampleHeight);
    const blades = new Mesh(this._setDisposable(seagrass.init()), this._setDisposable(buildFoliageMaterial(this._clock)));
    blades.frustumCulled = false;
    scene.add(blades);
    this._seagrass = seagrass;
  }

  private _buildAtmosphere(scene: Scene): void {
    const shaftMaterial = this._setDisposable(buildLightShaftMaterial(this._clock));
    const random = buildSeededRandom(SHAFT_YAW_SEED);
    const upright = new Vector3(0, 1, 0);
    for (let index = 0; index < SHAFT_COUNT; index += 1) {
      const width = SHAFT_WIDTH_MIN + random() * (SHAFT_WIDTH_MAX - SHAFT_WIDTH_MIN);
      const geometry = this._setDisposable(new PlaneGeometry(width, SHAFT_LENGTH));
      const shaft = new Mesh(geometry, shaftMaterial);
      const top = new Vector3((random() - HALF) * SHAFT_SPREAD_X, SURFACE_Y, (random() - HALF) * SHAFT_SPREAD_Z);
      shaft.position.copy(top).addScaledVector(this._sunDirection, -SHAFT_LENGTH * HALF);
      shaft.quaternion.copy(this._buildShaftFacing(shaft.position));
      shaft.rotateOnAxis(upright, (random() - HALF) * SHAFT_YAW_JITTER);
      shaft.renderOrder = SHAFT_PRIORITY;
      scene.add(shaft);
    }
    this._buildParticles(scene);
  }

  /** Shafts run along the sun direction and turn their face toward the viewer, like a billboard on one axis. */
  private _buildShaftFacing(centre: Vector3): Quaternion {
    const toCamera = this._baseCameraPosition.clone().sub(centre);
    toCamera.addScaledVector(this._sunDirection, -toCamera.dot(this._sunDirection)).normalize();
    const across = new Vector3().crossVectors(this._sunDirection, toCamera).normalize();
    const basis = new Matrix4().makeBasis(across, this._sunDirection, toCamera);
    return new Quaternion().setFromRotationMatrix(basis);
  }

  private _buildParticles(scene: Scene): void {
    const random = buildSeededRandom(SCENERY_SEED);
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const speeds = new Float32Array(PARTICLE_COUNT);
    const phases = new Float32Array(PARTICLE_COUNT);
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      positions[index * 3] = (random() - HALF) * PARTICLE_EXTENT_X * 2;
      positions[index * 3 + 1] = PARTICLE_FLOOR + random() * PARTICLE_EXTENT_Y;
      positions[index * 3 + 2] = (random() - HALF) * PARTICLE_EXTENT_Z * 2;
      speeds[index] = PARTICLE_SPEED_MIN + random() * PARTICLE_SPEED_RANGE;
      phases[index] = random() * TWO_PI;
    }
    const geometry = this._setDisposable(new BufferGeometry());
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    const material = this._setDisposable(new PointsMaterial({
      color: new Color(PARTICLE_COLOR),
      size: PARTICLE_SIZE,
      sizeAttenuation: true,
      map: this._setDisposable(this._buildParticleSprite()),
      transparent: true,
      opacity: PARTICLE_OPACITY,
      depthWrite: false,
      blending: AdditiveBlending,
    }));
    const points = new Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    this._particles = { points, speeds, phases };
  }

  private _buildParticleSprite(): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = PARTICLE_SPRITE_SIZE;
    canvas.height = PARTICLE_SPRITE_SIZE;
    const context = canvas.getContext('2d');
    if (context) {
      const centre = PARTICLE_SPRITE_SIZE * HALF;
      const gradient = context.createRadialGradient(centre, centre, 0, centre, centre, centre);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(SPRITE_STOP_CORE, 'rgba(255,255,255,0.55)');
      gradient.addColorStop(SPRITE_STOP_EDGE, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, PARTICLE_SPRITE_SIZE, PARTICLE_SPRITE_SIZE);
    }
    return new CanvasTexture(canvas);
  }

  private async _buildCompositor(): Promise<void> {
    const renderer = this._renderer;
    const scene = this._scene;
    const camera = this._camera;
    if (!renderer || !scene || !camera) return;

    const compositor = new CompositorOutput({ renderer, scene, camera });
    compositor
      .add(new Bloom({ threshold: BLOOM_THRESHOLD, strength: BLOOM_STRENGTH, radius: BLOOM_RADIUS }))
      .add(new ColorBalance({
        liftR: GRADE_LIFT_R,
        liftG: GRADE_LIFT_G,
        liftB: GRADE_LIFT_B,
        gainR: GRADE_GAIN_R,
        gainG: GRADE_GAIN_G,
        gainB: GRADE_GAIN_B,
      }))
      .add(new HueSaturation({ hue: HUE_NEUTRAL, saturation: GRADE_SATURATION }))
      .add(new Vignette({ darkness: VIGNETTE_DARKNESS, offset: VIGNETTE_OFFSET }))
      .add(new FilmGrain({ intensity: GRAIN_INTENSITY }));
    await compositor.compile();
    this._setMultisampling(compositor);
    this._compositor = compositor;
    this._updateSize();
  }

  /** Triforge keeps its composer private and exposes neither sampling nor pixel-ratio options. */
  private _getComposer(compositor: CompositorOutput): EffectComposer | null {
    return (compositor as unknown as { _composer: EffectComposer | null })._composer; // private field, present after compile()
  }

  /** Compositor render targets are not multisampled by default, so edges would alias badly. */
  private _setMultisampling(compositor: CompositorOutput): void {
    const composer = this._getComposer(compositor);
    if (!composer) return;
    composer.renderTarget1.samples = MULTISAMPLE_COUNT;
    composer.renderTarget2.samples = MULTISAMPLE_COUNT;
  }

  private _bindObservers(): void {
    const stage = this._canvas.parentElement ?? this._canvas;
    this._resizeObserver = new ResizeObserver(this._onStageResize);
    this._resizeObserver.observe(stage);
    this._visibilityObserver = new IntersectionObserver(this._onVisibilityChange);
    this._visibilityObserver.observe(this._canvas);
    window.addEventListener('pointermove', this._onPointerMove);
    this._canvas.addEventListener('pointerdown', this._onPointerDown);
  }

  private _startLoop(): void {
    this._lastFrameTime = performance.now();
    this._frameId = requestAnimationFrame(this._onFrame);
  }

  private async _buildFishTemplates(): Promise<FishTemplate[]> {
    const loader = new FishModelLoader();
    return Promise.all(SPECIES_PROFILES.map((profile) => loader.buildTemplate(profile)));
  }

  private _setupFish(templates: FishTemplate[]): void {
    const scene = this._scene;
    const sampleHeight = this._sampleHeight;
    if (!scene || !sampleHeight) return;

    const pellets = new FoodPelletSimulation(scene, sampleHeight);
    pellets.init();
    this._pellets = pellets;

    const loader = new FishModelLoader();
    const random = Math.random; // entrances differ on every visit
    const totalFish = templates.reduce((sum, template) => sum + template.profile.count, 0);
    const sides = this._buildEntrySides(totalFish, random);
    const delays = this._buildShuffled(ENTRY_DELAYS, random);
    const shadowGeometry = this._setDisposable(new PlaneGeometry(1, 1));
    shadowGeometry.rotateX(-QUARTER_TURN);
    const shadowMaterial = this._setDisposable(buildFishShadowMaterial(this._clock));

    templates.forEach((template) => {
      for (let copy = 0; copy < template.profile.count; copy += 1) {
        const asset = loader.buildFish(template);
        const agent = this._buildAgent(this._agents.length, template, random, sides[this._agents.length], delays[this._agents.length % delays.length]);
        scene.add(asset.root);
        this._agents.push(agent);
        this._bodies.push(new FishBodyAnimation(asset, agent));

        const shadow = new Mesh(shadowGeometry, shadowMaterial);
        shadow.renderOrder = SHADOW_PRIORITY;
        shadow.frustumCulled = false;
        scene.add(shadow);
        this._shadows.push(shadow);
      }
    });
    this._school = new FishSchoolController(this._agents, pellets, sampleHeight);
    this._bodies.forEach((body) => body.update(0));
  }

  /** Alternating left/right entrances (so both edges are used evenly), shuffled and randomly started. */
  private _buildEntrySides(count: number, random: () => number): number[] {
    const first = random() < HALF ? -1 : 1;
    const sides = Array.from({ length: count }, (_, index) => (index % 2 === 0 ? first : -first));
    return this._buildShuffled(sides, random);
  }

  private _buildShuffled<T>(items: readonly T[], random: () => number): T[] {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    return shuffled;
  }

  private _buildAgent(id: number, template: FishTemplate, random: () => number, side: number, entryDelay: number): FishAgent {
    const { profile } = template;
    const heading = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    const position = new Vector3(
      side * ENTRY_EDGE_X,
      MathUtils.lerp(profile.preferredDepth - 0.6, Math.min(FISH_CEILING_Y, profile.preferredDepth + 0.6), random()),
      MathUtils.lerp(FISH_DOMAIN_MIN_Z, FISH_DOMAIN_MAX_Z, random()),
    );
    const waypoint = position.clone();
    waypoint.x = -side * random() * ENTRY_TARGET_X;
    return {
      id,
      profile,
      temperament: TEMPERAMENTS[id % TEMPERAMENTS.length],
      position,
      velocity: new Vector3(Math.sin(heading), 0, Math.cos(heading)).multiplyScalar(profile.cruiseSpeed),
      fleeDirection: new Vector3(0, 0, 1),
      waypoint,
      waypointAge: 0,
      dwell: 0,
      entryDelay,
      feedPitch: 0,
      heading,
      pitch: 0,
      roll: 0,
      mode: FishMode.CRUISE,
      satiety: 0,
      panic: 0,
      gulp: 0,
      wanderPhase: random() * TWO_PI,
    };
  }

  private _updateSize(): void {
    const camera = this._camera;
    const stage = this._canvas.parentElement ?? this._canvas;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!camera || width === 0 || height === 0) return;
    const aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    this._pullback = aspect < WIDE_ASPECT ? 1 + (WIDE_ASPECT - aspect) * NARROW_PULLBACK : 1;
    const compositor = this._compositor;
    if (!compositor) return;
    this._getComposer(compositor)?.setPixelRatio(this._pixelRatio);
    compositor.setSize(width, height);
  }

  /** Sheds resolution in steps when frames run slow, so weaker GPUs keep the scene fluid. */
  private _updateQuality(deltaSeconds: number): void {
    const renderer = this._renderer;
    if (!renderer || this._pixelRatio <= MIN_PIXEL_RATIO) return;
    this._sampledFrames += 1;
    this._sampledSeconds += deltaSeconds;
    if (this._sampledFrames < QUALITY_SAMPLE_FRAMES) return;

    const averageSeconds = this._sampledSeconds / this._sampledFrames;
    this._sampledFrames = 0;
    this._sampledSeconds = 0;
    if (averageSeconds <= QUALITY_SLOW_FRAME_SECONDS) return;

    this._pixelRatio = Math.max(MIN_PIXEL_RATIO, this._pixelRatio - QUALITY_RATIO_STEP);
    renderer.setPixelRatio(this._pixelRatio);
    this._updateSize();
  }

  private _updateCamera(deltaSeconds: number): void {
    const camera = this._camera;
    if (!camera) return;
    const follow = Math.min(1, deltaSeconds * CAMERA_PARALLAX_DAMPING);
    this._pointer.smoothX += (this._pointer.x - this._pointer.smoothX) * follow;
    this._pointer.smoothY += (this._pointer.y - this._pointer.smoothY) * follow;

    const driftAngle = this._elapsed * CAMERA_DRIFT_SPEED * TWO_PI;
    const bob = Math.sin(this._elapsed * CAMERA_BOB_SPEED) * CAMERA_BOB_AMPLITUDE;
    camera.position.set(
      this._baseCameraPosition.x + Math.sin(driftAngle) * CAMERA_DRIFT_RADIUS + this._pointer.smoothX * CAMERA_PARALLAX_X,
      this._baseCameraPosition.y + bob + this._pointer.smoothY * CAMERA_PARALLAX_Y,
      this._baseCameraPosition.z * this._pullback
        + Math.cos(driftAngle * CAMERA_DRIFT_DEPTH_SPEED) * CAMERA_DRIFT_RADIUS * CAMERA_DRIFT_DEPTH_FACTOR,
    );
    this._lookScratch.copy(this._lookTarget);
    this._lookScratch.x += this._pointer.smoothX * CAMERA_LOOK_X;
    this._lookScratch.y += this._pointer.smoothY * CAMERA_LOOK_Y;
    camera.lookAt(this._lookScratch);
    this._dome?.position.copy(camera.position);
  }

  private _updateParticles(deltaSeconds: number): void {
    const particles = this._particles;
    if (!particles) return;
    const positions = particles.points.geometry.attributes.position as BufferAttribute; // set as a BufferAttribute in _buildParticles
    const array = positions.array as Float32Array; // built as a Float32Array in _buildParticles
    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const wobble = Math.sin(this._elapsed * PARTICLE_WOBBLE_SPEED + particles.phases[index]) * PARTICLE_WOBBLE;
      array[index * 3] += wobble * deltaSeconds;
      array[index * 3 + 1] -= particles.speeds[index] * PARTICLE_DRIFT_SPEED * deltaSeconds;
      array[index * 3 + 2] += Math.cos(particles.phases[index] + this._elapsed * PARTICLE_WOBBLE_SPEED) * PARTICLE_WOBBLE * deltaSeconds;
      if (array[index * 3 + 1] < PARTICLE_FLOOR) array[index * 3 + 1] += PARTICLE_EXTENT_Y;
    }
    positions.needsUpdate = true;
  }

  private _updateFish(deltaSeconds: number): void {
    const sampleHeight = this._sampleHeight;
    const school = this._school;
    if (!sampleHeight || !school) return;
    this._pellets?.update(deltaSeconds);
    school.update(deltaSeconds, this._elapsed, this._getCursorThreat());

    this._agents.forEach((agent, index) => {
      this._bodies[index].update(deltaSeconds);
      const shadow = this._shadows[index];
      const length = agent.profile.targetLength;
      const { position } = agent;
      const height = Math.max(0, position.y - sampleHeight(position.x, position.z));
      const shiftX = position.x - (this._sunDirection.x / this._sunDirection.y) * height;
      const shiftZ = position.z - (this._sunDirection.z / this._sunDirection.y) * height;
      const spread = 1 + FISH_SHADOW_SPREAD * height;
      shadow.position.set(shiftX, sampleHeight(shiftX, shiftZ) + FISH_SHADOW_LIFT, shiftZ);
      shadow.rotation.y = agent.heading;
      shadow.scale.set(length * SHADOW_WIDTH_RATIO * spread, 1, length * FISH_SHADOW_BASE_SIZE * spread);
    });
  }

  /** Sunlight refracted through moving waves reaches the fish as slow, soft dappling. */
  private _updateLighting(): void {
    const sun = this._sun;
    if (!sun) return;
    const t = this._elapsed * DAPPLE_SPEED;
    const flicker = (
      Math.sin(t)
      + Math.sin(t * DAPPLE_SECOND_RATE + 1.3) * DAPPLE_SECOND_WEIGHT
      + Math.sin(t * DAPPLE_THIRD_RATE + 2.1) * DAPPLE_THIRD_WEIGHT
    ) / DAPPLE_NORMALISER;
    sun.intensity = this._sunBaseIntensity * (1 + flicker * DAPPLE_AMOUNT);
  }

  private _getCursorThreat(): CursorThreat | null {
    const camera = this._camera;
    if (!camera || !this._cursor.isActive) return null;
    this._raycaster.setFromCamera(this._ndc.set(this._cursor.x, this._cursor.y), camera);
    this._cursorThreat.origin.copy(this._raycaster.ray.origin);
    this._cursorThreat.direction.copy(this._raycaster.ray.direction);
    return this._cursorThreat;
  }

  private readonly _onFrame = (now: number): void => {
    if (this._isDestroyed) return;
    this._frameId = requestAnimationFrame(this._onFrame);
    if (!this._isVisible || document.hidden) {
      this._lastFrameTime = now;
      return;
    }
    const deltaSeconds = Math.min(MAX_FRAME_SECONDS, (now - this._lastFrameTime) * MS_TO_SECONDS);
    this._lastFrameTime = now;
    this._elapsed += deltaSeconds;
    this._clock.time.value = this._elapsed;

    this._updateCamera(deltaSeconds);
    this._seagrass?.update(this._elapsed);
    this._updateParticles(deltaSeconds);
    this._updateFish(deltaSeconds);
    this._updateLighting();
    this._compositor?.render();
    this._updateQuality(deltaSeconds);
  };

  private readonly _onStageResize = (): void => {
    if (this._isDestroyed) return;
    this._updateSize();
  };

  private readonly _onVisibilityChange = (entries: IntersectionObserverEntry[]): void => {
    this._isVisible = entries.some((entry) => entry.isIntersecting);
  };

  private readonly _onPointerMove = (event: PointerEvent): void => {
    this._pointer.x = (event.clientX / window.innerWidth) * NDC_SPAN - 1;
    this._pointer.y = -((event.clientY / window.innerHeight) * NDC_SPAN - 1);

    const rect = this._canvas.getBoundingClientRect();
    const isInside = event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    this._cursor.isActive = isInside && event.pointerType !== 'touch';
    this._cursor.x = ((event.clientX - rect.left) / rect.width) * NDC_SPAN - 1;
    this._cursor.y = -(((event.clientY - rect.top) / rect.height) * NDC_SPAN - 1);
  };

  /** A click sprinkles a cluster of food pellets where the pointer ray crosses the fish plane. */
  private readonly _onPointerDown = (event: PointerEvent): void => {
    const camera = this._camera;
    const pellets = this._pellets;
    if (!camera || !pellets) return;
    const rect = this._canvas.getBoundingClientRect();
    this._raycaster.setFromCamera(
      this._ndc.set(
        ((event.clientX - rect.left) / rect.width) * NDC_SPAN - 1,
        -(((event.clientY - rect.top) / rect.height) * NDC_SPAN - 1),
      ),
      camera,
    );
    const hit = this._raycaster.ray.intersectPlane(this._foodPlane, this._dropPoint);
    if (!hit) return;
    const x = MathUtils.clamp(hit.x, FISH_DOMAIN_MIN_X, FISH_DOMAIN_MAX_X);
    const y = MathUtils.clamp(hit.y, FOOD_MIN_Y, SURFACE_Y - 1);
    pellets.setDrop(x, y, hit.z);
  };
}

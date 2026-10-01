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
  ShaderMaterial,
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

import {
  CursorThreat,
  FishAgent,
  FishFocusInfo,
  FishMode,
  FishTelemetry,
  SceneSettings,
  UnderwaterEngineCallbacks,
  UnderwaterLoadState,
} from '../../types/underwater';
import { buildSeededRandom } from '../prng';
import { buildDomeMaterial, buildFishShadowMaterial, buildLightShaftMaterial, buildWaterSurfaceMaterial } from './atmosphere-materials';
import { FishBodyAnimation } from './fish-body-animation';
import { FishModelLoader, FishTemplate } from './fish-loader';
import { FishIntentController } from './ai/fish-intent-controller';
import { FishSchoolController } from './fish-school-controller';
import { FoodPelletSimulation } from './food-pellet-simulation';
import { HeightSampler, buildRockGeometry, buildSeabedGeometry, buildTerrainSampler } from './scene-geometry';
import { SeagrassAnimation } from './seagrass-animation';
import { ROCK_CONFIG, SEABED_CONFIG, buildFoliageMaterial, buildSurfaceMaterial } from './surface-materials';
import { buildClock } from './triforge-graph';
import {
  CAMERA_BASE_POSITION,
  CAMERA_BOB_SPEED,
  CAMERA_FAR,
  CAMERA_NEAR,
  CAMERA_LOOK_X,
  CAMERA_LOOK_Y,
  CAMERA_TARGET,
  DOME_RADIUS,
  ENTRY_DELAYS,
  ENTRY_EDGE_X,
  ENTRY_TARGET_X,
  FILL_POSITION,
  FISH_CEILING_Y,
  FISH_DOMAIN_MAX_X,
  FISH_DOMAIN_MAX_Z,
  FISH_DOMAIN_MIN_X,
  FISH_DOMAIN_MIN_Z,
  FISH_SHADOW_LIFT,
  FOOD_MIN_Y,
  FOOD_PLANE_Z,
  HEMI_GROUND_COLOR,
  HUE_NEUTRAL,
  MAX_FRAME_SECONDS,
  MAX_PIXEL_RATIO,
  MIN_PIXEL_RATIO,
  MS_TO_SECONDS,
  MULTISAMPLE_COUNT,
  NAV_BOUNDS_X,
  NAV_GROUND_CLEARANCE,
  NAV_KEY_CODES,
  NAV_MAX_Z,
  NAV_MIN_Z,
  NAV_PITCH_LIMIT,
  NAV_SMOOTHING,
  NAV_SPEED,
  NAV_SURFACE_CLEARANCE,
  NAV_TURN_SPEED,
  PARTICLE_EXTENT_X,
  PARTICLE_EXTENT_Y,
  PARTICLE_EXTENT_Z,
  PARTICLE_MAX_COUNT,
  PARTICLE_SPRITE_SIZE,
  QUALITY_RATIO_STEP,
  QUALITY_SAMPLE_FRAMES,
  QUALITY_SLOW_FRAME_SECONDS,
  RIM_POSITION,
  ROCK_BURY_FRACTION,
  ROCK_PLACEMENTS,
  SCENERY_SEED,
  SEAGRASS_PATCHES,
  SHAFT_LENGTH,
  SHAFT_MAX_COUNT,
  SHAFT_SPREAD_X,
  SHAFT_SPREAD_Z,
  SHAFT_WIDTH_MAX,
  SHAFT_WIDTH_MIN,
  SPECIES_PROFILES,
  SUN_DIRECTION,
  SUN_DISTANCE,
  SURFACE_SIZE,
  SURFACE_Y,
  TEMPERAMENTS,
  TRIFORGE_AMBIENT_COLOR,
  TRIFORGE_AMBIENT_REFERENCE_INTENSITY,
  TRIFORGE_SUN_COLOR,
  TRIFORGE_SUN_REFERENCE_INTENSITY,
} from './underwater-constants';
import { GRAPH_SETTING_KEYS, POST_SETTING_KEYS, hasSettingChanged } from './underwater-settings';

const QUARTER_TURN = Math.PI / 2;
const TWO_PI = Math.PI * 2;
const HALF = 0.5 as const;
const NDC_SPAN = 2 as const;
const MIN_FRAME_SECONDS = 1e-3 as const;
const NO_FOCUS = -1 as const;
const TOOLTIP_SECONDS = 4 as const;
const FOCUS_INFO_INTERVAL = 0.25 as const;
const HOVER_MIN_RADIUS_PX = 34 as const;
const HOVER_RADIUS_FACTOR = 0.55 as const;
const TOOLTIP_LIFT_FACTOR = 0.45 as const;
const CURSOR_SPEED_SMOOTHING = 0.2 as const;
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
const REBUILD_DELAY_MS = 250 as const;
const NO_SCALE = 1 as const;
const WORLD_UP = new Vector3(0, 1, 0);
const MIN_DIRECTION_LENGTH = 0.0001 as const;
const TYPING_TAGS: readonly string[] = ['INPUT', 'TEXTAREA', 'SELECT'];
const TELEMETRY_INTERVAL_SECONDS = 0.25 as const;

interface MaterialEntry {
  material: ShaderMaterial;
  build: (settings: SceneSettings) => ShaderMaterial;
}

export interface UnderwaterEngineOptions {
  isNavigable: boolean;
  /** Report READY as soon as the water is drawn; the fish models keep loading in the background. */
  isRevealedEarly?: boolean;
}

interface DriftParticles {
  points: Points;
  speeds: Float32Array;
  phases: Float32Array;
}

export class UnderwaterEngine {
  private readonly _canvas: HTMLCanvasElement;
  private readonly _callbacks: UnderwaterEngineCallbacks;
  private readonly _materialEntries: MaterialEntry[] = [];
  private readonly _isNavigable: boolean;
  private readonly _isRevealedEarly: boolean;
  private readonly _navKeys = new Set<string>();
  private readonly _virtualKeys = new Set<string>();
  private readonly _navOffset = new Vector3();
  private readonly _navVelocity = new Vector3();
  private readonly _navForward = new Vector3();
  private readonly _navRight = new Vector3();
  private readonly _navWish = new Vector3();
  private _navYaw = 0;
  private _navPitch = 0;
  private _settings: SceneSettings;
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
  private _intent: FishIntentController | null = null;
  private readonly _focus = { id: NO_FOCUS as number, hideAt: 0, infoClock: 0, isDirty: false };
  private readonly _focusPoint = new Vector3();
  private _isAiWanted = false;
  private _pellets: FoodPelletSimulation | null = null;
  private _sun: DirectionalLight | null = null;
  private _rim: DirectionalLight | null = null;
  private _fill: DirectionalLight | null = null;
  private _hemi: HemisphereLight | null = null;
  private _fog: FogExp2 | null = null;
  private _shafts: Mesh[] = [];
  private _sunBaseIntensity = 0;
  private _rebuildTimer: number | null = null;
  private _isGraphDirty = false;
  private _isPostDirty = false;
  private _isPostBusy = false;
  private _telemetryClock = 0;
  private readonly _raycaster = new Raycaster();
  private readonly _ndc = new Vector2();
  private readonly _foodPlane = new Plane(new Vector3(0, 0, 1), -FOOD_PLANE_Z);
  private readonly _dropPoint = new Vector3();
  private readonly _cursorThreat: CursorThreat = { origin: new Vector3(), direction: new Vector3(), speed: 0 };
  private readonly _cursor = { x: 0, y: 0, isActive: false, previousX: 0, previousY: 0, speed: 0 };
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

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: UnderwaterEngineCallbacks,
    settings: SceneSettings,
    options: UnderwaterEngineOptions = { isNavigable: false },
  ) {
    this._isNavigable = options.isNavigable;
    this._isRevealedEarly = options.isRevealedEarly ?? false;
    this._canvas = canvas;
    this._callbacks = callbacks;
    this._settings = settings;
  }

  public async init(): Promise<void> {
    try {
      this._buildRenderer();
      this._buildScene();
      await this._buildCompositor();
      this._bindObservers();
      this._startLoop();
      if (this._isRevealedEarly) this._callbacks.onLoadStateChange(UnderwaterLoadState.READY);
      const templates = await this._buildFishTemplates();
      if (this._isDestroyed) return;
      this._setupFish(templates);
      if (!this._isRevealedEarly) this._callbacks.onLoadStateChange(UnderwaterLoadState.READY);
    } catch {
      if (!this._isDestroyed && !this._isRevealedEarly) this._callbacks.onLoadStateChange(UnderwaterLoadState.ERROR);
    }
  }

  public destroy(): void {
    this._isDestroyed = true;
    if (this._rebuildTimer !== null) window.clearTimeout(this._rebuildTimer);
    this._rebuildTimer = null;
    if (this._frameId !== null) cancelAnimationFrame(this._frameId);
    this._frameId = null;
    this._resizeObserver?.disconnect();
    this._visibilityObserver?.disconnect();
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onWindowBlur);
    this._canvas.removeEventListener('pointerdown', this._onPointerDown);
    this._bodies.forEach((body) => body.destroy());
    this._intent?.destroy();
    this._pellets?.destroy();
    this._seagrass?.destroy();
    this._compositor?.dispose();
    this._disposables.forEach((entry) => entry.dispose());
    this._disposables.length = 0;
    this._materialEntries.forEach((entry) => entry.material.dispose());
    this._materialEntries.length = 0;
    this._renderer?.dispose();
    this._renderer = null;
    this._scene = null;
    this._camera = null;
    this._compositor = null;
  }

  /** Shows the tooltip for one fish for a few seconds (used when its readout is hovered). */
  public focusFish(id: number): void {
    this._focus.id = id;
    this._focus.hideAt = this._elapsed + TOOLTIP_SECONDS;
    this._focus.isDirty = true;
  }

  /** Switches Laya-AI on or off. Off, the fish make no decisions and only drift. */
  public setAiEnabled(isEnabled: boolean): void {
    this._isAiWanted = isEnabled;
    if (!this._intent) return;
    if (isEnabled) void this._intent.enable();
    else this._intent.disable();
  }

  /** Keys held down by the on-screen touch pads; they act exactly like the matching keyboard keys. */
  public setVirtualKeys(codes: readonly string[]): void {
    this._virtualKeys.clear();
    codes.filter((code) => NAV_KEY_CODES.includes(code)).forEach((code) => this._virtualKeys.add(code));
  }

  /** Applies a settings snapshot: live values at once, shader and compositor rebuilds after a short pause. */
  public applySettings(next: SceneSettings): void {
    const previous = this._settings;
    this._settings = next;
    if (!this._scene) return;
    this._applyLiveSettings();
    if (hasSettingChanged(GRAPH_SETTING_KEYS, previous, next)) this._isGraphDirty = true;
    if (hasSettingChanged(POST_SETTING_KEYS, previous, next)) this._isPostDirty = true;
    if (this._isGraphDirty || this._isPostDirty) this._scheduleRebuild();
  }

  private _applyLiveSettings(): void {
    const settings = this._settings;
    const camera = this._camera;
    if (this._renderer) this._renderer.toneMappingExposure = settings.exposure;
    if (this._scene) this._scene.environmentIntensity = settings.environmentIntensity;
    if (this._fog) {
      this._fog.color.set(settings.fogColor);
      this._fog.density = settings.fogDensity;
    }
    if (this._sun) {
      this._sun.color.set(settings.sunColor);
      this._sunBaseIntensity = settings.sunIntensity;
    }
    if (this._rim) {
      this._rim.color.set(settings.rimColor);
      this._rim.intensity = settings.rimIntensity;
    }
    if (this._fill) {
      this._fill.color.set(settings.fillColor);
      this._fill.intensity = settings.fillIntensity;
    }
    if (this._hemi) {
      this._hemi.color.set(settings.hemiSkyColor);
      this._hemi.intensity = settings.hemiIntensity;
    }
    if (camera) {
      camera.fov = settings.cameraFov;
      camera.updateProjectionMatrix();
    }
    this._shafts.forEach((shaft, index) => {
      shaft.visible = index < settings.shaftCount;
      shaft.scale.x = settings.shaftWidthScale;
    });
    this._applyParticleSettings();
    this._applyTriforgeLight();
  }

  private _applyParticleSettings(): void {
    const particles = this._particles;
    if (!particles) return;
    const material = particles.points.material as PointsMaterial; // built as a PointsMaterial in _buildParticles
    material.size = this._settings.particleSize;
    material.opacity = this._settings.particleOpacity;
    particles.points.geometry.setDrawRange(0, this._settings.particleCount);
  }

  /** Triforge materials do their own lighting, so the sun and ambient sliders scale their light uniforms too. */
  private _applyTriforgeLight(): void {
    const sunScale = this._getScaleAgainstDefault(this._settings.sunIntensity, TRIFORGE_SUN_REFERENCE_INTENSITY);
    const ambientScale = this._getScaleAgainstDefault(this._settings.hemiIntensity, TRIFORGE_AMBIENT_REFERENCE_INTENSITY);
    this._materialEntries.forEach(({ material }) => {
      material.uniforms.uSunColor?.value.set(...TRIFORGE_SUN_COLOR).multiplyScalar(sunScale);
      material.uniforms.uAmbientColor?.value.set(...TRIFORGE_AMBIENT_COLOR).multiplyScalar(ambientScale);
    });
  }

  private _getScaleAgainstDefault(value: number, reference: number): number {
    return reference > 0 ? value / reference : NO_SCALE;
  }

  private _scheduleRebuild(): void {
    if (this._rebuildTimer !== null) window.clearTimeout(this._rebuildTimer);
    this._rebuildTimer = window.setTimeout(this._onRebuildTimer, REBUILD_DELAY_MS);
  }

  private readonly _onRebuildTimer = (): void => {
    this._rebuildTimer = null;
    if (this._isDestroyed) return;
    if (this._isGraphDirty) {
      this._isGraphDirty = false;
      this._rebuildGraphMaterials();
    }
    if (this._isPostDirty) {
      this._isPostDirty = false;
      void this._rebuildCompositor();
    }
  };

  /** Recompiles every Triforge material from the current settings and swaps it onto the meshes that use it. */
  private _rebuildGraphMaterials(): void {
    const scene = this._scene;
    if (!scene) return;
    this._materialEntries.forEach((entry) => {
      const previous = entry.material;
      const next = entry.build(this._settings);
      scene.traverse((object) => {
        if (object instanceof Mesh && object.material === previous) object.material = next;
      });
      previous.dispose();
      entry.material = next;
    });
    this._applyTriforgeLight();
  }

  private async _rebuildCompositor(): Promise<void> {
    if (this._isPostBusy) {
      this._isPostDirty = true;
      return;
    }
    this._isPostBusy = true;
    try {
      await this._buildCompositor();
    } catch {
      // the previous compositor stays in place when a rebuild fails
    } finally {
      this._isPostBusy = false;
    }
    if (this._isPostDirty && !this._isDestroyed) this._scheduleRebuild();
  }

  private _registerMaterial(build: (settings: SceneSettings) => ShaderMaterial): ShaderMaterial {
    const material = build(this._settings);
    this._materialEntries.push({ material, build });
    this._applyTriforgeLight();
    return material;
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
    renderer.toneMappingExposure = this._settings.exposure;
    this._renderer = renderer;
  }

  private _buildScene(): void {
    const scene = new Scene();
    this._fog = new FogExp2(new Color(this._settings.fogColor), this._settings.fogDensity);
    scene.fog = this._fog;
    this._scene = scene;

    this._camera = new PerspectiveCamera(this._settings.cameraFov, 1, CAMERA_NEAR, CAMERA_FAR);
    this._camera.position.copy(this._baseCameraPosition);

    this._buildLights(scene);
    this._buildBackdrop(scene);
    this._buildTerrain(scene);
    this._buildAtmosphere(scene);
  }

  private _buildLights(scene: Scene): void {
    const settings = this._settings;
    const sun = new DirectionalLight(new Color(settings.sunColor), settings.sunIntensity);
    sun.position.copy(this._sunDirection).multiplyScalar(SUN_DISTANCE);
    scene.add(sun, sun.target);
    this._sun = sun;
    this._sunBaseIntensity = settings.sunIntensity;
    const rim = new DirectionalLight(new Color(settings.rimColor), settings.rimIntensity);
    rim.position.set(...RIM_POSITION);
    const fill = new DirectionalLight(new Color(settings.fillColor), settings.fillIntensity);
    fill.position.set(...FILL_POSITION);
    const hemi = new HemisphereLight(new Color(settings.hemiSkyColor), new Color(HEMI_GROUND_COLOR), settings.hemiIntensity);
    scene.add(rim, fill, hemi);
    this._rim = rim;
    this._fill = fill;
    this._hemi = hemi;
  }

  private _buildBackdrop(scene: Scene): void {
    const renderer = this._renderer;
    if (!renderer) return;
    const domeMaterial = this._registerMaterial((settings) => buildDomeMaterial(this._clock, settings));
    const domeGeometry = this._setDisposable(new SphereGeometry(DOME_RADIUS, DOME_WIDTH_SEGMENTS, DOME_HEIGHT_SEGMENTS));
    this._dome = new Mesh(domeGeometry, domeMaterial);
    this._dome.frustumCulled = false;
    this._dome.renderOrder = -1;
    scene.add(this._dome);

    const surfaceGeometry = this._setDisposable(new PlaneGeometry(SURFACE_SIZE, SURFACE_SIZE));
    surfaceGeometry.rotateX(QUARTER_TURN);
    const surface = new Mesh(surfaceGeometry, this._registerMaterial((settings) => buildWaterSurfaceMaterial(this._clock, settings)));
    surface.position.y = SURFACE_Y;
    scene.add(surface);

    const envScene = new Scene();
    const envGeometry = new SphereGeometry(ENVIRONMENT_DOME_RADIUS, DOME_WIDTH_SEGMENTS, DOME_HEIGHT_SEGMENTS);
    envScene.add(new Mesh(envGeometry, domeMaterial));
    const generator = new PMREMGenerator(renderer);
    const target = generator.fromScene(envScene, ENVIRONMENT_SIGMA, ENVIRONMENT_NEAR, ENVIRONMENT_FAR);
    scene.environment = target.texture;
    scene.environmentIntensity = this._settings.environmentIntensity;
    this._setDisposable(target);
    generator.dispose();
    envGeometry.dispose();
  }

  private _buildTerrain(scene: Scene): void {
    const sampleHeight = buildTerrainSampler();
    this._sampleHeight = sampleHeight;

    const seabed = new Mesh(
      this._setDisposable(buildSeabedGeometry(sampleHeight)),
      this._registerMaterial((settings) => buildSurfaceMaterial(
        { ...SEABED_CONFIG, bumpStrength: settings.seabedBump, causticGain: settings.seabedCausticGain },
        this._clock,
        settings,
      )),
    );
    scene.add(seabed);

    const rockMaterial = this._registerMaterial((settings) => buildSurfaceMaterial(
      { ...ROCK_CONFIG, bumpStrength: settings.rockBump, causticGain: settings.rockCausticGain },
      this._clock,
      settings,
    ));
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
    const blades = new Mesh(
      this._setDisposable(seagrass.init(this._settings.seagrassSwaySpeed, this._settings.seagrassSwayAmplitude)),
      this._registerMaterial((settings) => buildFoliageMaterial(this._clock, settings)),
    );
    blades.frustumCulled = false;
    scene.add(blades);
    this._seagrass = seagrass;
  }

  private _buildAtmosphere(scene: Scene): void {
    const shaftMaterial = this._registerMaterial((settings) => buildLightShaftMaterial(this._clock, settings));
    const random = buildSeededRandom(SHAFT_YAW_SEED);
    const upright = new Vector3(0, 1, 0);
    for (let index = 0; index < SHAFT_MAX_COUNT; index += 1) {
      const width = SHAFT_WIDTH_MIN + random() * (SHAFT_WIDTH_MAX - SHAFT_WIDTH_MIN);
      const geometry = this._setDisposable(new PlaneGeometry(width, SHAFT_LENGTH));
      const shaft = new Mesh(geometry, shaftMaterial);
      const top = new Vector3((random() - HALF) * SHAFT_SPREAD_X, SURFACE_Y, (random() - HALF) * SHAFT_SPREAD_Z);
      shaft.position.copy(top).addScaledVector(this._sunDirection, -SHAFT_LENGTH * HALF);
      shaft.quaternion.copy(this._buildShaftFacing(shaft.position));
      shaft.rotateOnAxis(upright, (random() - HALF) * SHAFT_YAW_JITTER);
      shaft.renderOrder = SHAFT_PRIORITY;
      scene.add(shaft);
      this._shafts.push(shaft);
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
    const positions = new Float32Array(PARTICLE_MAX_COUNT * 3);
    const speeds = new Float32Array(PARTICLE_MAX_COUNT);
    const phases = new Float32Array(PARTICLE_MAX_COUNT);
    for (let index = 0; index < PARTICLE_MAX_COUNT; index += 1) {
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
      size: this._settings.particleSize,
      sizeAttenuation: true,
      map: this._setDisposable(this._buildParticleSprite()),
      transparent: true,
      opacity: this._settings.particleOpacity,
      depthWrite: false,
      blending: AdditiveBlending,
    }));
    const points = new Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    this._particles = { points, speeds, phases };
    this._applyParticleSettings();
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

    const settings = this._settings;
    const previous = this._compositor;
    const compositor = new CompositorOutput({ renderer, scene, camera });
    compositor
      .add(new Bloom({ threshold: settings.bloomThreshold, strength: settings.bloomStrength, radius: settings.bloomRadius }))
      .add(new ColorBalance({
        liftR: settings.gradeLiftR,
        liftG: settings.gradeLiftG,
        liftB: settings.gradeLiftB,
        gainR: settings.gradeGainR,
        gainG: settings.gradeGainG,
        gainB: settings.gradeGainB,
      }))
      .add(new HueSaturation({ hue: HUE_NEUTRAL, saturation: settings.gradeSaturation }))
      .add(new Vignette({ darkness: settings.vignetteDarkness, offset: settings.vignetteOffset }))
      .add(new FilmGrain({ intensity: settings.grainIntensity }));
    await compositor.compile();
    if (this._isDestroyed) {
      compositor.dispose();
      return;
    }
    this._setMultisampling(compositor);
    this._compositor = compositor;
    previous?.dispose();
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
    if (!this._isNavigable) return;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onWindowBlur);
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
    const shadowMaterial = this._registerMaterial((settings) => buildFishShadowMaterial(this._clock, settings));

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
    const school = new FishSchoolController(this._agents, pellets, sampleHeight);
    this._school = school;
    this._intent = new FishIntentController(
      this._agents,
      (agent, threat) => school.getPerception(agent, threat),
      (agent) => school.getDestinationCandidates(agent),
      (agent, candidate) => school.setDestination(agent, candidate),
      this._callbacks.onAiStatusChange,
    );
    if (this._isAiWanted) void this._intent.enable();
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
      needsDestination: false,
      hasEntered: false,
      intent: { danger: 0, eat: 0, hasAnswer: false, ageSeconds: 0 },
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
    this._updateNavigation(camera, deltaSeconds);
    const settings = this._settings;
    const follow = Math.min(1, deltaSeconds * settings.cameraParallaxDamping);
    this._pointer.smoothX += (this._pointer.x - this._pointer.smoothX) * follow;
    this._pointer.smoothY += (this._pointer.y - this._pointer.smoothY) * follow;

    const driftAngle = this._elapsed * settings.cameraDriftSpeed * TWO_PI;
    const bob = Math.sin(this._elapsed * CAMERA_BOB_SPEED) * settings.cameraBobAmplitude;
    camera.position.set(
      this._baseCameraPosition.x + Math.sin(driftAngle) * settings.cameraDriftRadius + this._pointer.smoothX * settings.cameraParallaxX,
      this._baseCameraPosition.y + bob + this._pointer.smoothY * settings.cameraParallaxY,
      this._baseCameraPosition.z * this._pullback
        + Math.cos(driftAngle * CAMERA_DRIFT_DEPTH_SPEED) * settings.cameraDriftRadius * CAMERA_DRIFT_DEPTH_FACTOR,
    );
    this._lookScratch.copy(this._lookTarget);
    this._lookScratch.x += this._pointer.smoothX * CAMERA_LOOK_X;
    this._lookScratch.y += this._pointer.smoothY * CAMERA_LOOK_Y;
    camera.lookAt(this._lookScratch);
    if (this._isNavigable) this._applyNavigation(camera);
    this._dome?.position.copy(camera.position);
  }

  /** WASD accelerates the camera along its heading; arrow keys turn and tilt the view. */
  private _updateNavigation(camera: PerspectiveCamera, deltaSeconds: number): void {
    if (!this._isNavigable) return;
    const keys = this._navKeys;
    const isDown = (code: string): boolean => keys.has(code) || this._virtualKeys.has(code);
    const axis = (positive: string, negative: string): number => Number(isDown(positive)) - Number(isDown(negative));
    this._navYaw += axis('ArrowLeft', 'ArrowRight') * NAV_TURN_SPEED * deltaSeconds;
    this._navPitch = MathUtils.clamp(this._navPitch + axis('ArrowUp', 'ArrowDown') * NAV_TURN_SPEED * deltaSeconds, -NAV_PITCH_LIMIT, NAV_PITCH_LIMIT);

    camera.getWorldDirection(this._navForward);
    this._navForward.y = 0;
    if (this._navForward.lengthSq() < MIN_DIRECTION_LENGTH) return;
    this._navForward.normalize();
    this._navRight.crossVectors(this._navForward, WORLD_UP);
    this._navWish.set(0, 0, 0)
      .addScaledVector(this._navForward, axis('KeyW', 'KeyS'))
      .addScaledVector(this._navRight, axis('KeyD', 'KeyA'));
    if (this._navWish.lengthSq() > 0) this._navWish.normalize().multiplyScalar(NAV_SPEED);
    this._navVelocity.lerp(this._navWish, Math.min(1, deltaSeconds * NAV_SMOOTHING));
    this._navOffset.addScaledVector(this._navVelocity, deltaSeconds);
  }

  /** Adds the navigation offset and rotation on top of the automatic camera, keeping it inside the tank. */
  private _applyNavigation(camera: PerspectiveCamera): void {
    const position = camera.position;
    position.add(this._navOffset);
    const x = MathUtils.clamp(position.x, -NAV_BOUNDS_X, NAV_BOUNDS_X);
    const z = MathUtils.clamp(position.z, NAV_MIN_Z, NAV_MAX_Z);
    const floor = (this._sampleHeight?.(x, z) ?? 0) + NAV_GROUND_CLEARANCE;
    const y = MathUtils.clamp(position.y, floor, SURFACE_Y - NAV_SURFACE_CLEARANCE);
    this._navOffset.add(this._lookScratch.set(x - position.x, y - position.y, z - position.z));
    position.set(x, y, z);
    camera.rotateOnWorldAxis(WORLD_UP, this._navYaw);
    camera.rotateX(this._navPitch);
  }

  private _isTypingTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && (TYPING_TAGS.includes(target.tagName) || target.isContentEditable);
  }

  private readonly _onKeyDown = (event: KeyboardEvent): void => {
    if (!NAV_KEY_CODES.includes(event.code) || event.metaKey || event.ctrlKey || event.altKey) return;
    if (this._isTypingTarget(event.target)) return;
    this._navKeys.add(event.code);
    if (event.code.startsWith('Arrow')) event.preventDefault();
  };

  private readonly _onKeyUp = (event: KeyboardEvent): void => {
    this._navKeys.delete(event.code);
  };

  private readonly _onWindowBlur = (): void => {
    this._navKeys.clear();
  };

  private _updateParticles(deltaSeconds: number): void {
    const particles = this._particles;
    if (!particles) return;
    const positions = particles.points.geometry.attributes.position as BufferAttribute; // set as a BufferAttribute in _buildParticles
    const array = positions.array as Float32Array; // built as a Float32Array in _buildParticles
    const driftSpeed = this._settings.particleDriftSpeed;
    for (let index = 0; index < this._settings.particleCount; index += 1) {
      const wobble = Math.sin(this._elapsed * PARTICLE_WOBBLE_SPEED + particles.phases[index]) * PARTICLE_WOBBLE;
      array[index * 3] += wobble * deltaSeconds;
      array[index * 3 + 1] -= particles.speeds[index] * driftSpeed * deltaSeconds;
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
    const threat = this._getCursorThreat(deltaSeconds);
    this._intent?.update(deltaSeconds, threat);
    school.update(deltaSeconds, this._elapsed, threat);

    this._agents.forEach((agent, index) => {
      this._bodies[index].update(deltaSeconds);
      const shadow = this._shadows[index];
      const length = agent.profile.targetLength;
      const { position } = agent;
      const height = Math.max(0, position.y - sampleHeight(position.x, position.z));
      const shiftX = position.x - (this._sunDirection.x / this._sunDirection.y) * height;
      const shiftZ = position.z - (this._sunDirection.z / this._sunDirection.y) * height;
      const spread = 1 + this._settings.fishShadowSpread * height;
      shadow.position.set(shiftX, sampleHeight(shiftX, shiftZ) + FISH_SHADOW_LIFT, shiftZ);
      shadow.rotation.y = agent.heading;
      shadow.scale.set(length * SHADOW_WIDTH_RATIO * spread, 1, length * this._settings.fishShadowSize * spread);
    });
  }

  /** The fish under the pointer on screen, found by projecting each fish and comparing in pixels. */
  private _findHoveredFish(camera: PerspectiveCamera, width: number, height: number): FishAgent | null {
    if (!this._cursor.isActive) return null;
    const halfFov = MathUtils.degToRad(camera.fov) * HALF;
    let best: FishAgent | null = null;
    let bestDistance = Infinity;
    for (const agent of this._agents) {
      if (agent.entryDelay > 0) continue;
      this._focusPoint.copy(agent.position).project(camera);
      if (this._focusPoint.z > 1) continue;
      const deltaX = (this._focusPoint.x - this._cursor.x) * width * HALF;
      const deltaY = (this._focusPoint.y - this._cursor.y) * height * HALF;
      const pointerDistance = Math.hypot(deltaX, deltaY);
      const sizePixels = (agent.profile.targetLength * height) / (NDC_SPAN * Math.max(camera.position.distanceTo(agent.position), MIN_FRAME_SECONDS) * Math.tan(halfFov));
      if (pointerDistance < Math.max(HOVER_MIN_RADIUS_PX, sizePixels * HOVER_RADIUS_FACTOR) && pointerDistance < bestDistance) {
        best = agent;
        bestDistance = pointerDistance;
      }
    }
    return best;
  }

  /** Keeps the hover tooltip on the focused fish: position every frame, content a few times a second. */
  private _updateFocus(deltaSeconds: number): void {
    const camera = this._camera;
    const width = this._canvas.clientWidth;
    const height = this._canvas.clientHeight;
    if (!camera || width === 0 || height === 0) return;
    camera.updateMatrixWorld();
    const hovered = this._findHoveredFish(camera, width, height);
    if (hovered && hovered.id !== this._focus.id) this.focusFish(hovered.id);
    else if (hovered) this._focus.hideAt = this._elapsed + TOOLTIP_SECONDS;
    const focus = this._focus;
    if (focus.id === NO_FOCUS) return;
    const agent = this._agents.find((entry) => entry.id === focus.id);
    if (!agent || this._elapsed >= focus.hideAt) {
      focus.id = NO_FOCUS;
      this._callbacks.onFishFocus(null);
      return;
    }
    this._focusPoint.copy(agent.position);
    this._focusPoint.y += agent.profile.targetLength * TOOLTIP_LIFT_FACTOR;
    this._focusPoint.project(camera);
    this._callbacks.onFishFocusMove((this._focusPoint.x + 1) * HALF * width, (1 - this._focusPoint.y) * HALF * height);
    focus.infoClock += deltaSeconds;
    if (focus.isDirty || focus.infoClock >= FOCUS_INFO_INTERVAL) {
      focus.isDirty = false;
      focus.infoClock = 0;
      this._callbacks.onFishFocus(this._buildFocusInfo(agent));
    }
  }

  private _buildFocusInfo(agent: FishAgent): FishFocusInfo {
    return {
      id: agent.id,
      label: agent.profile.label,
      temperament: agent.temperament.label,
      mode: agent.mode,
      isEntering: agent.entryDelay > 0,
      isEating: agent.gulp > 0,
      isWaitingForDestination: agent.needsDestination,
    };
  }

  /** A few times a second, hands the UI a plain snapshot of every fish's state. */
  private _updateTelemetry(deltaSeconds: number): void {
    this._telemetryClock += deltaSeconds;
    if (this._telemetryClock < TELEMETRY_INTERVAL_SECONDS || this._agents.length === 0) return;
    this._telemetryClock = 0;
    this._callbacks.onFishTelemetry(this._agents.map((agent): FishTelemetry => ({
      id: agent.id,
      label: agent.profile.label,
      temperament: agent.temperament.label,
      mode: agent.mode,
      isEntering: agent.entryDelay > 0,
      isResting: agent.needsDestination,
      intent: { ...agent.intent },
      isEating: agent.gulp > 0,
      speed: agent.velocity.length(),
      depth: agent.position.y,
      appetite: MathUtils.clamp(1 - agent.satiety, 0, 1),
      panic: agent.panic,
      waypointDistance: agent.position.distanceTo(agent.waypoint),
    })));
  }

  /** Sunlight refracted through moving waves reaches the fish as slow, soft dappling. */
  private _updateLighting(): void {
    const sun = this._sun;
    if (!sun) return;
    const t = this._elapsed * this._settings.dappleSpeed;
    const flicker = (
      Math.sin(t)
      + Math.sin(t * DAPPLE_SECOND_RATE + 1.3) * DAPPLE_SECOND_WEIGHT
      + Math.sin(t * DAPPLE_THIRD_RATE + 2.1) * DAPPLE_THIRD_WEIGHT
    ) / DAPPLE_NORMALISER;
    sun.intensity = this._sunBaseIntensity * (1 + flicker * this._settings.dappleAmount);
  }

  private _getCursorThreat(deltaSeconds: number): CursorThreat | null {
    const camera = this._camera;
    const cursor = this._cursor;
    const travel = Math.hypot(cursor.x - cursor.previousX, cursor.y - cursor.previousY) / NDC_SPAN;
    cursor.speed = MathUtils.lerp(cursor.speed, travel / Math.max(deltaSeconds, MIN_FRAME_SECONDS), CURSOR_SPEED_SMOOTHING);
    cursor.previousX = cursor.x;
    cursor.previousY = cursor.y;
    if (!camera || !cursor.isActive) return null;
    // navigation moves and turns the camera after the last render, so refresh its matrices before casting the ray
    camera.updateMatrixWorld();
    this._cursorThreat.speed = cursor.speed;
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
    this._seagrass?.update(this._elapsed, this._settings.seagrassSwaySpeed, this._settings.seagrassSwayAmplitude);
    this._updateParticles(deltaSeconds);
    this._updateFish(deltaSeconds);
    this._updateFocus(deltaSeconds);
    this._updateLighting();
    this._updateTelemetry(deltaSeconds);
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
    this._cursor.isActive = isInside && event.target === this._canvas && event.pointerType !== 'touch';
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

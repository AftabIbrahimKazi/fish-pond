/**
 * Tunable constants for the Underwater scene. Colours are authored in sRGB hex;
 * Triforge node graphs treat them as display-referred and gamma-decode at the end.
 */

import { FishSpecies, SpeciesProfile, Temperament } from '../../types/underwater';

/* World layout */
export const SEABED_SIZE = 110 as const;
export const SEABED_SEGMENTS = 240 as const;
export const SURFACE_Y = 11 as const;
export const SURFACE_SIZE = 260 as const;
export const DOME_RADIUS = 240 as const;
export const CAMERA_FAR = 320 as const;

/* Water column */
export const DISPLAY_GAMMA = 2.2 as const;

/* Lighting */
export const SUN_DIRECTION: readonly [number, number, number] = [0.32, 1, 0.18];
export const SUN_SHADOW_MAP_SIZE = 2048 as const;
export const SUN_SHADOW_EXTENT = 9 as const;
export const SUN_DISTANCE = 26 as const;
export const HEMI_GROUND_COLOR = '#3b3524' as const;
export const TRIFORGE_SUN_COLOR: readonly [number, number, number] = [3.4, 3.4, 3.2];
export const TRIFORGE_AMBIENT_COLOR: readonly [number, number, number] = [0.3, 0.44, 0.5];
/** The Triforge sun and ambient colours above match these slider values; the sliders scale them from here. */
export const TRIFORGE_SUN_REFERENCE_INTENSITY = 3.1 as const;
export const TRIFORGE_AMBIENT_REFERENCE_INTENSITY = 0.7 as const;

/* Caustics */

/* Camera */
export const CAMERA_NEAR = 0.1 as const;
export const CAMERA_BASE_POSITION: readonly [number, number, number] = [0, 2.6, 10.6];
export const CAMERA_TARGET: readonly [number, number, number] = [0, 2.4, 0];
export const CAMERA_BOB_SPEED = 0.33 as const;
export const CAMERA_LOOK_X = 2.2 as const;
export const CAMERA_LOOK_Y = 2.4 as const;

/* Keyboard navigation: WASD moves, arrow keys rotate */
export const NAV_SPEED = 4.5 as const;
export const NAV_SMOOTHING = 8 as const;
export const NAV_TURN_SPEED = 1.3 as const;
export const NAV_PITCH_LIMIT = 1.1 as const;
export const NAV_BOUNDS_X = 16 as const;
export const NAV_MIN_Z = -22 as const;
export const NAV_MAX_Z = 14 as const;
export const NAV_GROUND_CLEARANCE = 0.7 as const;
export const NAV_SURFACE_CLEARANCE = 0.7 as const;
export const NAV_KEY_CODES: readonly string[] = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

/* Renderer */
export const MAX_PIXEL_RATIO = 1.5 as const;
export const MIN_PIXEL_RATIO = 1 as const;
export const QUALITY_SAMPLE_FRAMES = 90 as const;
export const QUALITY_SLOW_FRAME_SECONDS = 0.027 as const;
export const QUALITY_RATIO_STEP = 0.25 as const;
export const MAX_FRAME_SECONDS = 0.05 as const;
export const MS_TO_SECONDS = 0.001 as const;
export const MULTISAMPLE_COUNT = 4 as const;

/* Post processing (Triforge compositor) */
// Triforge's three-backend vignette only behaves for offset <= 1: low offset widens the falloff band.
export const HUE_NEUTRAL = 0.5 as const;

/* Volumetric light shafts */
export const SHAFT_WIDTH_MIN = 1.6 as const;
export const SHAFT_WIDTH_MAX = 4.6 as const;
export const SHAFT_LENGTH = 15 as const;
export const SHAFT_SPREAD_X = 22 as const;
export const SHAFT_SPREAD_Z = 16 as const;
export const SHAFT_MAX_COUNT = 24 as const;

/* Marine snow */
export const PARTICLE_MAX_COUNT = 1800 as const;
export const PARTICLE_EXTENT_X = 22 as const;
export const PARTICLE_EXTENT_Y = 8.5 as const;
export const PARTICLE_EXTENT_Z = 20 as const;
export const PARTICLE_SPRITE_SIZE = 64 as const;

/* Scenery */
export interface RockPlacement {
  x: number;
  z: number;
  radius: number;
  squash: number;
  rotation: number;
  seed: number;
}

export interface SeagrassPatch {
  x: number;
  z: number;
  radius: number;
  height: number;
  bladeCount: number;
}

export const ROCK_PLACEMENTS: readonly RockPlacement[] = [
  { x: -9.5, z: -5.5, radius: 3.4, squash: 0.62, rotation: 0.4, seed: 11 },
  { x: 8.8, z: -7.5, radius: 4.2, squash: 0.58, rotation: 2.1, seed: 23 },
  { x: -3.4, z: -13.5, radius: 3.1, squash: 0.7, rotation: 1.2, seed: 37 },
  { x: 3.0, z: -16, radius: 5.2, squash: 0.55, rotation: 3.3, seed: 41 },
  { x: -15, z: -12, radius: 5.6, squash: 0.6, rotation: 0.9, seed: 53 },
  { x: 15.5, z: -14, radius: 4.8, squash: 0.64, rotation: 2.6, seed: 67 },
  { x: -7.4, z: 3.6, radius: 1.15, squash: 0.68, rotation: 1.9, seed: 71 },
  { x: 7.1, z: 2.4, radius: 1.5, squash: 0.6, rotation: 0.3, seed: 83 },
  { x: -5.2, z: -3.4, radius: 0.9, squash: 0.72, rotation: 2.8, seed: 97 },
  { x: 4.6, z: -2.6, radius: 0.7, squash: 0.7, rotation: 1.4, seed: 101 },
  { x: -11.5, z: 6.2, radius: 2.1, squash: 0.6, rotation: 3.7, seed: 113 },
  { x: 12.4, z: 6.8, radius: 2.4, squash: 0.62, rotation: 0.7, seed: 127 },
];
export const ROCK_SEGMENTS = 8 as const;
export const ROCK_NOISE_SCALE = 0.85 as const;
export const ROCK_NOISE_AMPLITUDE = 0.3 as const;
export const ROCK_DETAIL_SCALE = 3.4 as const;
export const ROCK_DETAIL_AMPLITUDE = 0.11 as const;
export const ROCK_BURY_FRACTION = 0.28 as const;

export const SEAGRASS_PATCHES: readonly SeagrassPatch[] = [
  { x: -6.8, z: -1.2, radius: 1.5, height: 1.5, bladeCount: 56 },
  { x: -7.6, z: -6.6, radius: 1.9, height: 2.1, bladeCount: 64 },
  { x: 6.4, z: -4.2, radius: 1.6, height: 1.7, bladeCount: 58 },
  { x: 9.6, z: -1.4, radius: 1.3, height: 1.4, bladeCount: 46 },
  { x: -2.4, z: -8.6, radius: 2.2, height: 2.4, bladeCount: 72 },
  { x: 1.2, z: -6.2, radius: 1.2, height: 1.3, bladeCount: 44 },
  { x: 4.4, z: -10.6, radius: 2.4, height: 2.6, bladeCount: 70 },
  { x: -10.8, z: 1.4, radius: 1.7, height: 1.8, bladeCount: 52 },
  { x: 10.2, z: 4.6, radius: 1.5, height: 1.5, bladeCount: 48 },
  { x: -4.6, z: 5.2, radius: 1.1, height: 1.1, bladeCount: 36 },
];
export const SEAGRASS_SEGMENTS = 5 as const;
export const SEAGRASS_BLADE_WIDTH = 0.085 as const;
export const SEAGRASS_UP_NORMAL_BIAS = 0.6 as const;
export const SCENERY_SEED = 20260930 as const;

/* Terrain */
export const DUNE_AMPLITUDE = 0.55 as const;
export const DUNE_FREQUENCY = 0.075 as const;
export const RIPPLE_AMPLITUDE = 0.06 as const;
export const RIPPLE_FREQUENCY = 0.9 as const;
export const BASIN_RISE_START = 26 as const;
export const BASIN_RISE_END = 50 as const;
export const BASIN_RISE_HEIGHT = 7 as const;
export const FISH_SHADOW_LIFT = 0.04 as const;

/* Fish species */
export const SPECIES_PROFILES: readonly SpeciesProfile[] = [
  {
    species: FishSpecies.JIKIN,
    label: 'Jikin goldfish',
    url: '/jikin_goldfish.glb',
    count: 1,
    targetLength: 2.2,
    clipSpeed: 0.9,
    cruiseSpeed: 0.62,
    seekSpeed: 1.25,
    fleeSpeed: 2.5,
    maxAccel: 1.5,
    perceptionRadius: 7,
    threatRadius: 1.7,
    preferredDepth: 3.5,
    cohesionWeight: 0.35,
    alignmentWeight: 0.4,
    separationWeight: 1.3,
    personalSpace: 1.9,
  },
  {
    species: FishSpecies.TOSAKIN,
    label: 'Tosakin goldfish',
    url: encodeURI('/tosakin_goldfish (1).glb'),
    count: 2,
    targetLength: 1.2,
    clipSpeed: 1.15,
    cruiseSpeed: 0.85,
    seekSpeed: 1.7,
    fleeSpeed: 3.4,
    maxAccel: 2.4,
    perceptionRadius: 6,
    threatRadius: 1.5,
    preferredDepth: 2.6,
    cohesionWeight: 0.85,
    alignmentWeight: 0.8,
    separationWeight: 1.1,
    personalSpace: 1.0,
  },
];

/** One temperament per fish, in spawn order: the big Jikin, then the two Tosakin. */
export const TEMPERAMENTS: readonly Temperament[] = [
  { label: 'calm elder', boldness: 0.75, greed: 0.8, sociability: 0.2, speedScale: 0.9, wanderRate: 0.6, depthOffset: 0.2 },
  { label: 'bold forager', boldness: 0.8, greed: 1.25, sociability: 0.5, speedScale: 1.2, wanderRate: 1.5, depthOffset: -0.3 },
  { label: 'shy follower', boldness: 1.4, greed: 0.65, sociability: 1.5, speedScale: 0.85, wanderRate: 0.8, depthOffset: 0.5 },
];

/* Entrance: fish swim in from beyond the frame instead of appearing */
export const ENTRY_EDGE_X = 14.5 as const;
export const ENTRY_DELAYS: readonly number[] = [0.4, 3.2, 6.6];
export const ENTRY_TARGET_X = 3.5 as const;
export const BOUNDS_PUSH_LIMIT = 1.6 as const;

/* Grazing and collision */
export const GRAZE_RANGE = 0.95 as const;
export const GRAZE_MIN_RUN = 0.25 as const;
export const GRAZE_PITCH_MAX = 0.75 as const;
export const NIBBLE_RATE = 26 as const;
export const NIBBLE_AMOUNT = 0.13 as const;
export const PITCH_SMOOTH = 6 as const;
export const BODY_RADIUS_FRACTION = 0.16 as const;
export const COLLISION_SAMPLES: readonly number[] = [-0.45, 0, 0.45];
export const FISH_COLLISION_FRACTION = 0.3 as const;
export const ROCK_COLLIDE_SCALE = 0.9 as const;

/* Path picking (System 1) */
export const WAYPOINT_CANDIDATES = 6 as const;
export const WAYPOINT_ARRIVE_RADIUS = 0.8 as const;
export const WAYPOINT_TIMEOUT = 16 as const;
export const WAYPOINT_Y_SPREAD = 1.3 as const;
export const WAYPOINT_NOISE = 0.9 as const;
export const TRIP_IDEAL = 3.8 as const;
export const TRIP_SCORE_WEIGHT = 0.5 as const;
export const COVER_RADIUS = 3 as const;
export const COVER_SCORE_WEIGHT = 2.4 as const;
export const MATE_SCORE_WEIGHT = 2.2 as const;
export const MATE_SOCIABILITY_FLOOR = 0.8 as const;
export const CROWD_SCORE_RADIUS = 1.4 as const;
export const CROWD_SCORE_PENALTY = 1.6 as const;
export const DWELL_MIN = 0.8 as const;
export const DWELL_MAX = 3.4 as const;
export const DWELL_SPEED_FACTOR = 0.22 as const;
export const ARRIVE_SLOWDOWN = 1.1 as const;
export const ARRIVE_MIN_SPEED = 0.16 as const;
export const GLIDE_AMOUNT = 0.3 as const;
export const GLIDE_RATE = 0.85 as const;
export const CRUISE_ACCEL_FACTOR = 0.4 as const;
export const SEEK_ACCEL_FACTOR = 0.8 as const;
export const PATH_SEED = 9931 as const;

/* Behaviour (System 1) */
export const FISH_DOMAIN_MIN_X = -7.6 as const;
export const FISH_DOMAIN_MAX_X = 7.6 as const;
export const FISH_DOMAIN_MIN_Z = -6.5 as const;
export const FISH_DOMAIN_MAX_Z = 3.2 as const;
export const FISH_CEILING_Y = 6.8 as const;
export const FISH_GROUND_CLEARANCE = 0.7 as const;
export const BOUNDS_MARGIN = 1.6 as const;
export const BOUNDS_GAIN = 1.4 as const;
export const DEPTH_GAIN = 0.35 as const;
export const DEPTH_SWAY = 0.9 as const;
export const DEPTH_SWAY_SPEED = 0.21 as const;
export const WANDER_TURN = 0.22 as const;
export const WANDER_FREQUENCY = 0.31 as const;
export const SCHOOL_RADIUS = 5 as const;
export const SMALL_AVOIDS_LARGE_RADIUS = 1.5 as const;
export const SMALL_AVOIDS_LARGE_WEIGHT = 1.6 as const;
export const CROWD_SHY_FACTOR = 0.35 as const;
export const CROWD_SHY_RADIUS = 1.2 as const;
export const FOOD_WEIGHT = 0.9 as const;
export const FOOD_MIN_APPETITE = 0.12 as const;
export const FOOD_ARRIVE_SLOWDOWN = 3 as const;
export const FOOD_ARRIVE_MIN_SPEED = 0.3 as const;
export const EAT_RADIUS_BASE = 0.16 as const;
export const EAT_RADIUS_PER_LENGTH = 0.1 as const;
export const MOUTH_OFFSET_FRACTION = 0.42 as const;
export const SATIETY_PER_PELLET = 0.3 as const;
export const SATIETY_DECAY = 0.045 as const;
export const GULP_SECONDS = 0.6 as const;
export const GULP_SPEED_FACTOR = 0.35 as const;
export const PANIC_DECAY = 1.1 as const;
export const PANIC_MIN_FLEE = 0.22 as const;
export const PANIC_FOOD_BLOCK = 0.15 as const;
export const THREAT_RADIUS_PER_LENGTH = 0.25 as const;
export const FLEE_ACCEL_FACTOR = 2.2 as const;
export const HEADING_TURN_RATE = 5.5 as const;
export const ROLL_GAIN = 0.55 as const;
export const ROLL_DAMPING = 3 as const;
export const PITCH_GAIN = 0.9 as const;
export const FISH_PITCH_LIMIT = 0.35 as const;
export const FISH_BANK_LIMIT = 0.32 as const;
export const CLIP_SPEED_BASE = 0.7 as const;
export const CLIP_SPEED_RANGE = 0.55 as const;
export const CLIP_SPEED_MAX_RATIO = 2.6 as const;
export const SPAWN_SEED = 4417 as const;

/* Food pellets */
export const PELLET_CAPACITY = 220 as const;
export const PELLETS_PER_DROP = 26 as const;
export const PELLET_RADIUS = 0.038 as const;
export const PELLET_COLOR = '#c47a35' as const;
export const PELLET_DROP_SPREAD = 0.55 as const;
export const PELLET_GRAVITY = 2.1 as const;
export const PELLET_DRAG = 5.2 as const;
export const PELLET_DRIFT = 0.05 as const;
export const PELLET_DRIFT_SPEED = 0.7 as const;
export const PELLET_JITTER = 0.06 as const;
export const PELLET_SETTLED_LIFE = 34 as const;
export const PELLET_FADE_SECONDS = 4 as const;
export const PELLET_SEGMENTS = 8 as const;
export const FOOD_PLANE_Z = 0 as const;
export const FOOD_MIN_Y = 0.8 as const;

/* Lighting rig */
export const RIM_POSITION: readonly [number, number, number] = [-6, 4, -14];
export const FILL_POSITION: readonly [number, number, number] = [5, 1.5, 14];

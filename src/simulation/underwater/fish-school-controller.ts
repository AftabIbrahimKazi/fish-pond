/**
 * System 1 for the whole school: fast, reflexive steering with no deliberation.
 * Priority per fish is  cursor threat  >  food  >  social behaviour  >  wandering.
 *
 * Social rules:
 *  - same species: loose schooling (cohesion, alignment, separation);
 *  - different species: small fish keep clear of big ones, big fish barely notice small ones,
 *    and a small fish yields the food to a big fish crowding it.
 */

import { MathUtils, Vector3 } from 'three';

import { buildSeededRandom } from '../prng';

import { CursorThreat, FishAgent, FishMode } from '../../types/underwater';
import { FoodPelletSimulation } from './food-pellet-simulation';
import { HeightSampler } from './scene-geometry';
import { ROCK_BURY_FRACTION, ROCK_PLACEMENTS, SEAGRASS_PATCHES } from './underwater-constants';
import {
  ARRIVE_MIN_SPEED,
  BODY_RADIUS_FRACTION,
  COLLISION_SAMPLES,
  FISH_COLLISION_FRACTION,
  GRAZE_MIN_RUN,
  GRAZE_PITCH_MAX,
  GRAZE_RANGE,
  NIBBLE_AMOUNT,
  NIBBLE_RATE,
  PITCH_SMOOTH,
  ROCK_COLLIDE_SCALE,
  ARRIVE_SLOWDOWN,
  BOUNDS_GAIN,
  BOUNDS_PUSH_LIMIT,
  COVER_RADIUS,
  COVER_SCORE_WEIGHT,
  CROWD_SCORE_PENALTY,
  CROWD_SCORE_RADIUS,
  CRUISE_ACCEL_FACTOR,
  DWELL_MAX,
  DWELL_MIN,
  DWELL_SPEED_FACTOR,
  GLIDE_AMOUNT,
  GLIDE_RATE,
  MATE_SCORE_WEIGHT,
  MATE_SOCIABILITY_FLOOR,
  PATH_SEED,
  SEEK_ACCEL_FACTOR,
  TRIP_IDEAL,
  TRIP_SCORE_WEIGHT,
  WAYPOINT_ARRIVE_RADIUS,
  WAYPOINT_CANDIDATES,
  WAYPOINT_NOISE,
  WAYPOINT_TIMEOUT,
  WAYPOINT_Y_SPREAD,
  BOUNDS_MARGIN,
  CROWD_SHY_FACTOR,
  CROWD_SHY_RADIUS,
  EAT_RADIUS_BASE,
  EAT_RADIUS_PER_LENGTH,
  FISH_CEILING_Y,
  FISH_DOMAIN_MAX_X,
  FISH_DOMAIN_MAX_Z,
  FISH_DOMAIN_MIN_X,
  FISH_DOMAIN_MIN_Z,
  FISH_GROUND_CLEARANCE,
  FISH_BANK_LIMIT,
  FISH_PITCH_LIMIT,
  FLEE_ACCEL_FACTOR,
  FOOD_ARRIVE_MIN_SPEED,
  FOOD_ARRIVE_SLOWDOWN,
  FOOD_MIN_APPETITE,
  FOOD_WEIGHT,
  GULP_SECONDS,
  GULP_SPEED_FACTOR,
  HEADING_TURN_RATE,
  MOUTH_OFFSET_FRACTION,
  PANIC_DECAY,
  PANIC_FOOD_BLOCK,
  PANIC_MIN_FLEE,
  PITCH_GAIN,
  ROLL_DAMPING,
  ROLL_GAIN,
  SATIETY_DECAY,
  SATIETY_PER_PELLET,
  SCHOOL_RADIUS,
  SMALL_AVOIDS_LARGE_RADIUS,
  SMALL_AVOIDS_LARGE_WEIGHT,
  THREAT_RADIUS_PER_LENGTH,
  WANDER_FREQUENCY,
  WANDER_TURN,
} from './underwater-constants';

const EPSILON = 1e-4 as const;
const HALF = 0.5 as const;
const FLEE_BLEND_BASE = 0.6 as const;
const FLEE_HORIZONTAL_BIAS = 0.55 as const;
const FLEE_VERTICAL_LIMIT = 0.5 as const;
const FLEE_MODE_SPEED = 0.85 as const;

export class FishSchoolController {
  private readonly _agents: readonly FishAgent[];
  private readonly _pellets: FoodPelletSimulation;
  private readonly _sampleHeight: HeightSampler;
  private readonly _desired = new Vector3();
  private readonly _forward = new Vector3();
  private readonly _offset = new Vector3();
  private readonly _centroid = new Vector3();
  private readonly _flock = new Vector3();
  private readonly _foodPoint = new Vector3();
  private readonly _closest = new Vector3();
  private readonly _mouth = new Vector3();
  private readonly _candidate = new Vector3();
  private readonly _random = buildSeededRandom(PATH_SEED);
  private readonly _coverPoints: readonly Vector3[] = [
    ...SEAGRASS_PATCHES.map((patch) => new Vector3(patch.x, 0, patch.z)),
    ...ROCK_PLACEMENTS.filter((rock) => rock.radius < COVER_RADIUS).map((rock) => new Vector3(rock.x, 0, rock.z)),
  ];

  constructor(agents: readonly FishAgent[], pellets: FoodPelletSimulation, sampleHeight: HeightSampler) {
    this._agents = agents;
    this._pellets = pellets;
    this._sampleHeight = sampleHeight;
  }

  public update(deltaSeconds: number, elapsedSeconds: number, threat: CursorThreat | null): void {
    for (const agent of this._agents) {
      if (agent.entryDelay > 0) {
        agent.entryDelay -= deltaSeconds;
        continue;
      }
      agent.satiety = Math.max(0, agent.satiety - SATIETY_DECAY * deltaSeconds);
      agent.gulp = Math.max(0, agent.gulp - deltaSeconds);
      agent.panic = Math.max(0, agent.panic - PANIC_DECAY * deltaSeconds);
      this._updateThreat(agent, threat);
      this._steer(agent, deltaSeconds, elapsedSeconds);
      this._updateBody(agent, deltaSeconds);
      this._updateEating(agent);
    }
    this._resolveFishCollisions();
  }

  /** Reflex: only a cursor that is actually close (to the fish, along its ray) startles a fish. */
  private _updateThreat(agent: FishAgent, threat: CursorThreat | null): void {
    if (!threat) return;
    this._offset.copy(agent.position).sub(threat.origin);
    const along = Math.max(0, this._offset.dot(threat.direction));
    this._closest.copy(threat.origin).addScaledVector(threat.direction, along);
    this._offset.copy(agent.position).sub(this._closest);
    const distance = this._offset.length();
    const radius = (agent.profile.threatRadius + agent.profile.targetLength * THREAT_RADIUS_PER_LENGTH) * agent.temperament.boldness;
    if (distance >= radius) return;

    const strength = 1 - distance / radius;
    if (strength <= agent.panic) return;
    agent.panic = strength;
    if (distance < EPSILON) this._offset.set(Math.random() - HALF, 0, Math.random() - HALF);
    this._offset.y *= FLEE_HORIZONTAL_BIAS;
    this._offset.y = MathUtils.clamp(this._offset.y, -FLEE_VERTICAL_LIMIT, FLEE_VERTICAL_LIMIT);
    agent.fleeDirection.copy(this._offset).normalize();
  }

  private _steer(agent: FishAgent, deltaSeconds: number, elapsedSeconds: number): void {
    const { profile } = agent;
    const desired = this._desired.set(0, 0, 0);
    const speed = agent.velocity.length();
    this._forward.set(Math.sin(agent.heading), 0, Math.cos(agent.heading));
    if (speed > EPSILON) this._forward.set(agent.velocity.x, 0, agent.velocity.z).normalize();

    const { temperament } = agent;
    const wobble = Math.sin(elapsedSeconds * WANDER_FREQUENCY * temperament.wanderRate + agent.wanderPhase) * WANDER_TURN;
    const pathSpeed = this._followPath(agent, deltaSeconds, desired);
    desired.applyAxisAngle(Y_AXIS, wobble);

    this._addSocial(agent, desired);
    this._addBounds(agent, desired);

    const glide = 1 + Math.sin(elapsedSeconds * GLIDE_RATE * temperament.wanderRate + agent.wanderPhase * 2) * GLIDE_AMOUNT;
    let desiredSpeed = pathSpeed * glide;
    agent.mode = FishMode.CRUISE;
    agent.feedPitch = 0;
    desiredSpeed = this._applyFood(agent, desired, desiredSpeed);

    let accelScale: number = this._isSeekingFood(agent) ? SEEK_ACCEL_FACTOR : CRUISE_ACCEL_FACTOR;
    if (agent.panic > PANIC_MIN_FLEE) {
      const blend = Math.min(1, FLEE_BLEND_BASE + agent.panic);
      desired.normalize().lerp(agent.fleeDirection, blend);
      desiredSpeed = MathUtils.lerp(desiredSpeed, profile.fleeSpeed * temperament.speedScale, Math.min(1, agent.panic / FLEE_MODE_SPEED));
      accelScale = FLEE_ACCEL_FACTOR;
      agent.mode = FishMode.FLEE;
    }

    if (agent.gulp > 0) desiredSpeed *= GULP_SPEED_FACTOR;
    if (desired.lengthSq() < EPSILON) desired.copy(this._forward);
    desired.normalize().multiplyScalar(desiredSpeed).sub(agent.velocity);
    const limit = profile.maxAccel * accelScale * deltaSeconds;
    if (desired.length() > limit) desired.setLength(limit);
    agent.velocity.add(desired);
  }

  private _isSeekingFood(agent: FishAgent): boolean {
    return agent.mode === FishMode.SEEK_FOOD;
  }

  private _applyFood(agent: FishAgent, desired: Vector3, cruise: number): number {
    const appetite = MathUtils.clamp(1 - agent.satiety, 0, 1);
    if (appetite < FOOD_MIN_APPETITE || agent.panic > PANIC_FOOD_BLOCK) return cruise;
    const slot = this._pellets.getNearest(agent.position, agent.profile.perceptionRadius, this._foodPoint);
    if (slot < 0) return cruise;

    let weight = Math.min(1, FOOD_WEIGHT * appetite * agent.temperament.greed);
    if (this._isCrowdedByLarger(agent)) weight *= CROWD_SHY_FACTOR;
    this._offset.copy(this._foodPoint).sub(agent.position);
    const distance = this._offset.length();
    this._offset.normalize();
    desired.normalize().multiplyScalar(1 - weight).addScaledVector(this._offset, weight);
    agent.mode = FishMode.SEEK_FOOD;
    const drop = agent.position.y - this._foodPoint.y;
    const run = Math.hypot(this._foodPoint.x - agent.position.x, this._foodPoint.z - agent.position.z);
    if (drop > 0 && distance < agent.profile.targetLength * GRAZE_RANGE) {
      agent.feedPitch = MathUtils.clamp(Math.atan2(drop, Math.max(run, GRAZE_MIN_RUN)), 0, GRAZE_PITCH_MAX);
    }
    const arrive = Math.max(FOOD_ARRIVE_MIN_SPEED, distance * FOOD_ARRIVE_SLOWDOWN);
    return Math.min(agent.profile.seekSpeed, arrive);
  }

  /**
   * Path picking: each fish holds a destination, swims there in a wide curve, hovers for a
   * moment on arrival, then chooses the next one. Writes the heading into `desired` and
   * returns the cruise speed to use.
   */
  private _followPath(agent: FishAgent, deltaSeconds: number, desired: Vector3): number {
    const { profile, temperament } = agent;
    const baseSpeed = profile.cruiseSpeed * temperament.speedScale;
    agent.waypointAge += deltaSeconds;

    const toGoal = this._offset.copy(agent.waypoint).sub(agent.position);
    const distance = toGoal.length();
    if (agent.dwell > 0) {
      agent.dwell -= deltaSeconds;
      desired.copy(this._forward);
      return baseSpeed * DWELL_SPEED_FACTOR;
    }
    if (distance < WAYPOINT_ARRIVE_RADIUS || agent.waypointAge > WAYPOINT_TIMEOUT) {
      agent.dwell = DWELL_MIN + this._random() * (DWELL_MAX - DWELL_MIN);
      this._pickWaypoint(agent);
      desired.copy(this._forward);
      return baseSpeed * DWELL_SPEED_FACTOR;
    }

    desired.copy(toGoal).normalize();
    return Math.min(baseSpeed, Math.max(ARRIVE_MIN_SPEED, distance * ARRIVE_SLOWDOWN));
  }

  /** Scores a handful of random spots by this fish's taste and heads for the best one. */
  private _pickWaypoint(agent: FishAgent): void {
    const { profile, temperament } = agent;
    let bestScore = -Infinity;
    for (let index = 0; index < WAYPOINT_CANDIDATES; index += 1) {
      const candidate = this._candidate.set(
        MathUtils.lerp(FISH_DOMAIN_MIN_X + BOUNDS_MARGIN, FISH_DOMAIN_MAX_X - BOUNDS_MARGIN, this._random()),
        0,
        MathUtils.lerp(FISH_DOMAIN_MIN_Z + BOUNDS_MARGIN, FISH_DOMAIN_MAX_Z - BOUNDS_MARGIN, this._random()),
      );
      const floor = this._sampleHeight(candidate.x, candidate.z) + FISH_GROUND_CLEARANCE + 0.3;
      const wantedY = profile.preferredDepth + temperament.depthOffset + (this._random() - HALF) * 2 * WAYPOINT_Y_SPREAD;
      candidate.y = MathUtils.clamp(wantedY, floor, FISH_CEILING_Y - 0.4);

      const score = this._scoreWaypoint(agent, candidate) + this._random() * WAYPOINT_NOISE;
      if (score > bestScore) {
        bestScore = score;
        agent.waypoint.copy(candidate);
      }
    }
    agent.waypointAge = 0;
  }

  private _scoreWaypoint(agent: FishAgent, candidate: Vector3): number {
    const { temperament } = agent;
    let score = -Math.abs(candidate.distanceTo(agent.position) - TRIP_IDEAL) * TRIP_SCORE_WEIGHT;

    let coverDistance = Infinity;
    for (const cover of this._coverPoints) {
      coverDistance = Math.min(coverDistance, Math.hypot(candidate.x - cover.x, candidate.z - cover.z));
    }
    const cover = 1 - MathUtils.clamp(coverDistance / COVER_RADIUS, 0, 1);
    score += (temperament.boldness - 1) * COVER_SCORE_WEIGHT * cover;

    for (const other of this._agents) {
      if (other === agent) continue;
      const gap = candidate.distanceTo(other.position);
      if (gap < CROWD_SCORE_RADIUS) score -= CROWD_SCORE_PENALTY;
      if (other.profile.species === agent.profile.species && temperament.sociability > MATE_SOCIABILITY_FLOOR) {
        score += (temperament.sociability - MATE_SOCIABILITY_FLOOR) * MATE_SCORE_WEIGHT * (1 - MathUtils.clamp(gap / SCHOOL_RADIUS, 0, 1));
      }
    }
    return score;
  }

  private _isCrowdedByLarger(agent: FishAgent): boolean {
    for (const other of this._agents) {
      if (other === agent || other.profile.targetLength <= agent.profile.targetLength) continue;
      if (other.position.distanceTo(agent.position) < other.profile.targetLength * CROWD_SHY_RADIUS) return true;
    }
    return false;
  }

  private _addSocial(agent: FishAgent, desired: Vector3): void {
    const { profile } = agent;
    this._centroid.set(0, 0, 0);
    this._flock.set(0, 0, 0);
    let mates = 0;
    for (const other of this._agents) {
      if (other === agent) continue;
      this._offset.copy(agent.position).sub(other.position);
      const distance = this._offset.length();
      if (distance < EPSILON) continue;

      if (other.profile.species === profile.species) {
        if (distance < SCHOOL_RADIUS) {
          this._centroid.add(other.position);
          this._flock.add(other.velocity);
          mates += 1;
        }
        if (distance < profile.personalSpace) {
          desired.addScaledVector(this._offset, (profile.separationWeight * (1 - distance / profile.personalSpace)) / distance);
        }
        continue;
      }

      const isSmaller = profile.targetLength < other.profile.targetLength;
      const reach = isSmaller ? other.profile.targetLength * SMALL_AVOIDS_LARGE_RADIUS : profile.personalSpace * HALF;
      if (distance < reach) {
        const weight = isSmaller ? SMALL_AVOIDS_LARGE_WEIGHT : profile.separationWeight * HALF;
        desired.addScaledVector(this._offset, (weight * (1 - distance / reach)) / distance);
      }
    }

    if (mates === 0) return;
    this._centroid.divideScalar(mates).sub(agent.position);
    const { sociability } = agent.temperament;
    if (this._centroid.length() > profile.personalSpace) desired.addScaledVector(this._centroid.normalize(), profile.cohesionWeight * sociability);
    if (this._flock.lengthSq() > EPSILON) desired.addScaledVector(this._flock.normalize(), profile.alignmentWeight * sociability);
  }

  private _addBounds(agent: FishAgent, desired: Vector3): void {
    const { position } = agent;
    const floor = this._sampleHeight(position.x, position.z) + FISH_GROUND_CLEARANCE;
    desired.x += this._getPush(position.x, FISH_DOMAIN_MIN_X, FISH_DOMAIN_MAX_X);
    desired.z += this._getPush(position.z, FISH_DOMAIN_MIN_Z, FISH_DOMAIN_MAX_Z);
    desired.y += this._getPush(position.y, floor, FISH_CEILING_Y);
  }

  private _getPush(value: number, min: number, max: number): number {
    if (value < min + BOUNDS_MARGIN) return Math.min(BOUNDS_PUSH_LIMIT, (min + BOUNDS_MARGIN - value) / BOUNDS_MARGIN) * BOUNDS_GAIN;
    if (value > max - BOUNDS_MARGIN) return -Math.min(BOUNDS_PUSH_LIMIT, (value - (max - BOUNDS_MARGIN)) / BOUNDS_MARGIN) * BOUNDS_GAIN;
    return 0;
  }

  private _updateBody(agent: FishAgent, deltaSeconds: number): void {
    agent.position.addScaledVector(agent.velocity, deltaSeconds);

    const horizontal = Math.hypot(agent.velocity.x, agent.velocity.z);
    if (horizontal > EPSILON) {
      const target = Math.atan2(agent.velocity.x, agent.velocity.z);
      const turn = Math.atan2(Math.sin(target - agent.heading), Math.cos(target - agent.heading));
      const step = turn * Math.min(1, deltaSeconds * HEADING_TURN_RATE);
      agent.heading += step;
      const targetRoll = MathUtils.clamp((-step / Math.max(deltaSeconds, EPSILON)) * ROLL_GAIN, -FISH_BANK_LIMIT, FISH_BANK_LIMIT);
      agent.roll += (targetRoll - agent.roll) * Math.min(1, deltaSeconds * ROLL_DAMPING);
    }
    const climb = Math.atan2(agent.velocity.y, Math.max(horizontal, EPSILON));
    let targetPitch = MathUtils.clamp(-climb * PITCH_GAIN, -FISH_PITCH_LIMIT, FISH_PITCH_LIMIT);
    if (agent.feedPitch > 0) {
      const nibble = agent.gulp > 0 ? Math.sin(agent.gulp * NIBBLE_RATE) * NIBBLE_AMOUNT : 0;
      targetPitch = agent.feedPitch + nibble;
    }
    agent.pitch += (targetPitch - agent.pitch) * Math.min(1, deltaSeconds * PITCH_SMOOTH);
    this._resolveTerrainCollision(agent);
  }

  /** A point along the fish's spine (fraction of body length from centre, +1 = one body length ahead). */
  private _getBodyPoint(agent: FishAgent, fraction: number, out: Vector3): Vector3 {
    const reach = agent.profile.targetLength * fraction;
    const flat = Math.cos(agent.pitch);
    return out.set(
      agent.position.x + Math.sin(agent.heading) * flat * reach,
      agent.position.y - Math.sin(agent.pitch) * reach,
      agent.position.z + Math.cos(agent.heading) * flat * reach,
    );
  }

  /**
   * Collision modifier: the nose, middle and tail must all clear the seabed by the body radius,
   * and the centre is pushed out of any rock. A nose-down nibble therefore lifts the body
   * instead of sinking it into the sand.
   */
  private _resolveTerrainCollision(agent: FishAgent): void {
    const radius = agent.profile.targetLength * BODY_RADIUS_FRACTION;
    let deficit = 0;
    for (const fraction of COLLISION_SAMPLES) {
      this._getBodyPoint(agent, fraction, this._closest);
      const ground = this._sampleHeight(this._closest.x, this._closest.z) + radius;
      deficit = Math.max(deficit, ground - this._closest.y);
    }
    if (deficit > 0) {
      agent.position.y += deficit;
      agent.velocity.y = Math.max(0, agent.velocity.y);
    }

    for (const rock of ROCK_PLACEMENTS) {
      const radiusXZ = rock.radius * ROCK_COLLIDE_SCALE + radius;
      const radiusY = rock.radius * rock.squash * ROCK_COLLIDE_SCALE + radius;
      const centreY = this._sampleHeight(rock.x, rock.z) - rock.radius * rock.squash * ROCK_BURY_FRACTION;
      this._offset.set((agent.position.x - rock.x) / radiusXZ, (agent.position.y - centreY) / radiusY, (agent.position.z - rock.z) / radiusXZ);
      const depth = this._offset.length();
      if (depth >= 1 || depth < EPSILON) continue;
      this._offset.divideScalar(depth);
      agent.position.set(rock.x + this._offset.x * radiusXZ, centreY + this._offset.y * radiusY, rock.z + this._offset.z * radiusXZ);
      agent.velocity.addScaledVector(this._offset, -Math.min(0, agent.velocity.dot(this._offset)));
    }
  }

  /** Collision modifier between fish: overlapping bodies are pushed apart, the smaller one moving more. */
  private _resolveFishCollisions(): void {
    for (let first = 0; first < this._agents.length; first += 1) {
      const a = this._agents[first];
      if (a.entryDelay > 0) continue;
      for (let second = first + 1; second < this._agents.length; second += 1) {
        const b = this._agents[second];
        if (b.entryDelay > 0) continue;
        const minimum = (a.profile.targetLength + b.profile.targetLength) * FISH_COLLISION_FRACTION;
        this._offset.copy(b.position).sub(a.position);
        const distance = this._offset.length();
        if (distance >= minimum) continue;
        if (distance < EPSILON) this._offset.set(1, 0, 0);
        else this._offset.divideScalar(distance);
        const massA = a.profile.targetLength * a.profile.targetLength;
        const massB = b.profile.targetLength * b.profile.targetLength;
        const overlap = minimum - distance;
        a.position.addScaledVector(this._offset, -overlap * (massB / (massA + massB)));
        b.position.addScaledVector(this._offset, overlap * (massA / (massA + massB)));
      }
    }
  }

  private _updateEating(agent: FishAgent): void {
    if (agent.gulp > 0) return;
    const length = agent.profile.targetLength;
    this._getBodyPoint(agent, MOUTH_OFFSET_FRACTION, this._mouth);
    const slot = this._pellets.getNearest(this._mouth, EAT_RADIUS_BASE + length * EAT_RADIUS_PER_LENGTH, this._foodPoint);
    if (slot < 0) return;
    this._pellets.setEaten(slot);
    agent.satiety = Math.min(1, agent.satiety + SATIETY_PER_PELLET);
    agent.gulp = GULP_SECONDS;
  }
}

const Y_AXIS = new Vector3(0, 1, 0);

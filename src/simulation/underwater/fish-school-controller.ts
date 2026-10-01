/**
 * Motor control for the whole school. This controller makes no decisions: whether a fish flees, goes
 * for food or swims somewhere new is decided by Laya (see `ai/fish-intent-controller.ts`) and arrives
 * here as `agent.intent` and a chosen destination. The controller turns those decisions into movement
 * (steering, speed, collision, bounds, body pose) and describes the world back to the model.
 *
 * What stays in code is physics, not choice: personal space between fish, avoiding the seabed and
 * rocks, staying in the tank, the direction away from the cursor, and swallowing a pellet that reaches
 * the mouth.
 */

import { MathUtils, Vector3 } from 'three';

import { buildSeededRandom } from '../prng';

import { CursorThreat, DestinationCandidate, FishAgent, FishMode, FishPerception } from '../../types/underwater';
import {
  DESTINATION_OPTION_COUNT,
  FOOD_AWARE_BODIES,
  HAND_AWARE_BODIES,
  BODY_CENTIMETRES,
  INTENT_COMMIT,
  INTENT_STALE_SECONDS,
  SPOT_CLOSE_FISH_BODIES,
  SPOT_HIGH_FRACTION,
  SPOT_LOW_FRACTION,
} from './ai/fish-intent-constants';
import { FoodPelletSimulation } from './food-pellet-simulation';
import { HeightSampler } from './scene-geometry';
import { ROCK_BURY_FRACTION, ROCK_PLACEMENTS, SEAGRASS_PATCHES } from './underwater-constants';
import {
  ARRIVE_MIN_SPEED,
  ARRIVE_SLOWDOWN,
  BODY_RADIUS_FRACTION,
  BOUNDS_GAIN,
  BOUNDS_MARGIN,
  BOUNDS_PUSH_LIMIT,
  COLLISION_SAMPLES,
  COVER_RADIUS,
  CRUISE_ACCEL_FACTOR,
  DWELL_SPEED_FACTOR,
  EAT_RADIUS_BASE,
  EAT_RADIUS_PER_LENGTH,
  FISH_BANK_LIMIT,
  FISH_CEILING_Y,
  FISH_COLLISION_FRACTION,
  FISH_DOMAIN_MAX_X,
  FISH_DOMAIN_MAX_Z,
  FISH_DOMAIN_MIN_X,
  FISH_DOMAIN_MIN_Z,
  FISH_GROUND_CLEARANCE,
  FISH_PITCH_LIMIT,
  FLEE_ACCEL_FACTOR,
  FOOD_ARRIVE_MIN_SPEED,
  FOOD_ARRIVE_SLOWDOWN,
  FOOD_WEIGHT,
  GLIDE_AMOUNT,
  GLIDE_RATE,
  GRAZE_MIN_RUN,
  GRAZE_PITCH_MAX,
  GRAZE_RANGE,
  GULP_SECONDS,
  GULP_SPEED_FACTOR,
  HEADING_TURN_RATE,
  MOUTH_OFFSET_FRACTION,
  NIBBLE_AMOUNT,
  NIBBLE_RATE,
  PANIC_DECAY,
  PANIC_MIN_FLEE,
  PATH_SEED,
  PITCH_GAIN,
  PITCH_SMOOTH,
  ROCK_COLLIDE_SCALE,
  ROLL_DAMPING,
  ROLL_GAIN,
  SATIETY_DECAY,
  SATIETY_PER_PELLET,
  SEEK_ACCEL_FACTOR,
  WANDER_FREQUENCY,
  WANDER_TURN,
  WAYPOINT_ARRIVE_RADIUS,
  WAYPOINT_TIMEOUT,
  WAYPOINT_Y_SPREAD,
} from './underwater-constants';

const EPSILON = 1e-4 as const;
const HALF = 0.5 as const;
const FLEE_BLEND_BASE = 0.6 as const;
const FLEE_HORIZONTAL_BIAS = 0.55 as const;
const FLEE_VERTICAL_LIMIT = 0.5 as const;
const FLEE_MODE_SPEED = 0.85 as const;
const WORLD_UP = 0.4 as const;

export class FishSchoolController {
  private readonly _agents: readonly FishAgent[];
  private readonly _pellets: FoodPelletSimulation;
  private readonly _sampleHeight: HeightSampler;
  private readonly _desired = new Vector3();
  private readonly _forward = new Vector3();
  private readonly _offset = new Vector3();
  private readonly _foodPoint = new Vector3();
  private readonly _closest = new Vector3();
  private readonly _mouth = new Vector3();
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
      this._updateFleeDirection(agent, threat);
      this._steer(agent, deltaSeconds, elapsedSeconds);
      this._updateBody(agent, deltaSeconds);
      this._updateEating(agent);
    }
    this._resolveFishCollisions();
  }

  /** What this fish senses right now, ready to be described to the model. */
  public getPerception(agent: FishAgent, threat: CursorThreat | null): FishPerception {
    const centimetresPerMetre = BODY_CENTIMETRES[agent.profile.species] / agent.profile.targetLength;
    let handCentimetres: number | null = null;
    if (threat) {
      const handDistance = this._getRayDistance(agent, threat);
      if (handDistance < agent.profile.targetLength * HAND_AWARE_BODIES) handCentimetres = Math.round(handDistance * centimetresPerMetre);
    }
    let foodCentimetres: number | null = null;
    const slot = this._pellets.getNearest(agent.position, agent.profile.targetLength * FOOD_AWARE_BODIES, this._foodPoint);
    if (slot >= 0) foodCentimetres = Math.round(agent.position.distanceTo(this._foodPoint) * centimetresPerMetre);
    return {
      handCentimetres,
      handSpeed: threat?.speed ?? 0,
      foodCentimetres,
      appetite: MathUtils.clamp(1 - agent.satiety, 0, 1),
      panic: agent.panic,
    };
  }

  /** A few places the fish could swim to, each described in words. The model picks one. */
  public getDestinationCandidates(agent: FishAgent): DestinationCandidate[] {
    const candidates: DestinationCandidate[] = [];
    for (let index = 0; index < DESTINATION_OPTION_COUNT; index += 1) {
      const position = new Vector3(
        MathUtils.lerp(FISH_DOMAIN_MIN_X + BOUNDS_MARGIN, FISH_DOMAIN_MAX_X - BOUNDS_MARGIN, this._random()),
        0,
        MathUtils.lerp(FISH_DOMAIN_MIN_Z + BOUNDS_MARGIN, FISH_DOMAIN_MAX_Z - BOUNDS_MARGIN, this._random()),
      );
      const floor = this._sampleHeight(position.x, position.z) + FISH_GROUND_CLEARANCE + WORLD_UP * HALF;
      const wantedY = agent.profile.preferredDepth + agent.temperament.depthOffset + (this._random() - HALF) * 2 * WAYPOINT_Y_SPREAD;
      position.y = MathUtils.clamp(wantedY, floor, FISH_CEILING_Y - WORLD_UP);
      candidates.push({ position, description: this._describeSpot(agent, position, floor) });
    }
    return candidates;
  }

  /** Records the destination the model chose. */
  public setDestination(agent: FishAgent, candidate: DestinationCandidate): void {
    agent.waypoint.copy(candidate.position);
    agent.waypointAge = 0;
    agent.needsDestination = false;
  }

  private _describeSpot(agent: FishAgent, position: Vector3, floor: number): string {
    const bodies = Math.max(1, Math.round(position.distanceTo(agent.position) / agent.profile.targetLength));
    let coverDistance = Infinity;
    for (const cover of this._coverPoints) coverDistance = Math.min(coverDistance, Math.hypot(position.x - cover.x, position.z - cover.z));
    const cover = coverDistance < COVER_RADIUS ? 'hidden among seagrass and rocks' : 'in open water';
    const nearest = this._agents.reduce((best, other) => (other === agent ? best : Math.min(best, position.distanceTo(other.position))), Infinity);
    const company = nearest < agent.profile.targetLength * SPOT_CLOSE_FISH_BODIES ? 'close to another fish' : 'away from the other fish';
    const level = (position.y - floor) / Math.max(EPSILON, FISH_CEILING_Y - floor);
    let height = 'in mid-water';
    if (level < SPOT_LOW_FRACTION) height = 'near the seabed';
    else if (level > SPOT_HIGH_FRACTION) height = 'near the surface';
    return `${bodies} body lengths away, ${cover}, ${company}, ${height}.`;
  }

  private _getRayDistance(agent: FishAgent, threat: CursorThreat): number {
    this._offset.copy(agent.position).sub(threat.origin);
    const along = Math.max(0, this._offset.dot(threat.direction));
    this._closest.copy(threat.origin).addScaledVector(threat.direction, along);
    return this._offset.copy(agent.position).sub(this._closest).length();
  }

  /** Geometry only: which way is "away" from the cursor. Whether to go that way is Laya's call. */
  private _updateFleeDirection(agent: FishAgent, threat: CursorThreat | null): void {
    if (!threat) return;
    const distance = this._getRayDistance(agent, threat);
    if (distance < EPSILON) this._offset.set(Math.random() - HALF, 0, Math.random() - HALF);
    this._offset.y *= FLEE_HORIZONTAL_BIAS;
    this._offset.y = MathUtils.clamp(this._offset.y, -FLEE_VERTICAL_LIMIT, FLEE_VERTICAL_LIMIT);
    agent.fleeDirection.copy(this._offset).normalize();
  }

  private _isIntentFresh(agent: FishAgent): boolean {
    return agent.intent.hasAnswer && agent.intent.ageSeconds < INTENT_STALE_SECONDS;
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

    this._addSeparation(agent, desired);
    this._addBounds(agent, desired);

    const glide = 1 + Math.sin(elapsedSeconds * GLIDE_RATE * temperament.wanderRate + agent.wanderPhase * 2) * GLIDE_AMOUNT;
    let desiredSpeed = pathSpeed * glide;
    agent.mode = FishMode.CRUISE;
    agent.feedPitch = 0;
    desiredSpeed = this._applyFood(agent, desired, desiredSpeed);

    let accelScale: number = this._isSeekingFood(agent) ? SEEK_ACCEL_FACTOR : CRUISE_ACCEL_FACTOR;
    if (this._isIntentFresh(agent) && agent.intent.danger >= INTENT_COMMIT) agent.panic = Math.max(agent.panic, agent.intent.danger);
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

  /** Moves toward food only when Laya has said the fish should eat. */
  private _applyFood(agent: FishAgent, desired: Vector3, cruise: number): number {
    if (!this._isIntentFresh(agent) || agent.intent.eat < INTENT_COMMIT) return cruise;
    const slot = this._pellets.getNearest(agent.position, agent.profile.perceptionRadius, this._foodPoint);
    if (slot < 0) return cruise;

    const weight = Math.min(1, FOOD_WEIGHT * agent.intent.eat);
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
   * Swims toward the destination Laya chose. On arrival (or when stuck) the fish asks for a new one and
   * drifts slowly until the answer comes back; it never picks a destination itself.
   */
  private _followPath(agent: FishAgent, deltaSeconds: number, desired: Vector3): number {
    const { profile, temperament } = agent;
    const baseSpeed = profile.cruiseSpeed * temperament.speedScale;
    agent.waypointAge += deltaSeconds;

    if (agent.needsDestination) {
      desired.copy(this._forward);
      return baseSpeed * DWELL_SPEED_FACTOR;
    }
    const toGoal = this._offset.copy(agent.waypoint).sub(agent.position);
    const distance = toGoal.length();
    if (distance < WAYPOINT_ARRIVE_RADIUS || agent.waypointAge > WAYPOINT_TIMEOUT) {
      agent.needsDestination = true;
      desired.copy(this._forward);
      return baseSpeed * DWELL_SPEED_FACTOR;
    }

    desired.copy(toGoal).normalize();
    return Math.min(baseSpeed, Math.max(ARRIVE_MIN_SPEED, distance * ARRIVE_SLOWDOWN));
  }

  /** Personal space: overlapping fish are nudged apart so bodies never need to cross. */
  private _addSeparation(agent: FishAgent, desired: Vector3): void {
    const { profile } = agent;
    for (const other of this._agents) {
      if (other === agent) continue;
      this._offset.copy(agent.position).sub(other.position);
      const distance = this._offset.length();
      if (distance < EPSILON || distance >= profile.personalSpace) continue;
      desired.addScaledVector(this._offset, (profile.separationWeight * (1 - distance / profile.personalSpace)) / distance);
    }
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

  /** The tank walls: once a fish has swum in, it can never leave the water, whatever it decided. */
  private _clampToTank(agent: FishAgent): void {
    const { position, velocity } = agent;
    if (!agent.hasEntered) {
      agent.hasEntered = position.x >= FISH_DOMAIN_MIN_X && position.x <= FISH_DOMAIN_MAX_X;
      return;
    }
    if (position.x < FISH_DOMAIN_MIN_X || position.x > FISH_DOMAIN_MAX_X) velocity.x = 0;
    if (position.z < FISH_DOMAIN_MIN_Z || position.z > FISH_DOMAIN_MAX_Z) velocity.z = 0;
    if (position.y > FISH_CEILING_Y) velocity.y = Math.min(0, velocity.y);
    position.x = MathUtils.clamp(position.x, FISH_DOMAIN_MIN_X, FISH_DOMAIN_MAX_X);
    position.z = MathUtils.clamp(position.z, FISH_DOMAIN_MIN_Z, FISH_DOMAIN_MAX_Z);
    position.y = Math.min(position.y, FISH_CEILING_Y);
  }

  private _updateBody(agent: FishAgent, deltaSeconds: number): void {
    agent.position.addScaledVector(agent.velocity, deltaSeconds);
    this._clampToTank(agent);

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

  /** A pellet that reaches the mouth is swallowed: contact, not a choice. */
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

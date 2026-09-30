/**
 * Applies a fish agent's simulated state to its model: position, heading, pitch, banking,
 * and a tail-beat rate that follows how hard the fish is swimming.
 */

import { Euler, MathUtils } from 'three';

import { FishAgent } from '../../types/underwater';
import { FishAsset } from './fish-loader';
import {
  CLIP_SPEED_BASE,
  CLIP_SPEED_MAX_RATIO,
  CLIP_SPEED_RANGE,
} from './underwater-constants';

export class FishBodyAnimation {
  private readonly _asset: FishAsset;
  private readonly _agent: FishAgent;
  private readonly _euler = new Euler(0, 0, 0, 'YXZ');

  constructor(asset: FishAsset, agent: FishAgent) {
    this._asset = asset;
    this._agent = agent;
  }

  public update(deltaSeconds: number): void {
    const { root, mixer, action, profile } = this._asset;
    const agent = this._agent;
    root.position.copy(agent.position);
    this._euler.set(agent.pitch, agent.heading, agent.roll);
    root.rotation.copy(this._euler);

    if (action) {
      const effort = MathUtils.clamp(agent.velocity.length() / profile.cruiseSpeed, 0, CLIP_SPEED_MAX_RATIO);
      action.timeScale = profile.clipSpeed * (CLIP_SPEED_BASE + CLIP_SPEED_RANGE * effort);
    }
    mixer.update(deltaSeconds);
  }

  public destroy(): void {
    this._asset.mixer.stopAllAction();
    this._asset.mixer.uncacheRoot(this._asset.mixer.getRoot());
  }
}

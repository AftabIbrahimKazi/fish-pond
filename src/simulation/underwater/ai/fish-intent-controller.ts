/**
 * Fish Intent Controller: the fish's decision maker. It consults Laya (System 1) through a worker, one
 * question set at a time, and writes the answers onto each fish. Nothing here decides what a fish does:
 * it only describes the situation to the model, offers the model its options and records the reply.
 * With the model off, fish make no decisions at all.
 */

import { buildSeededRandom } from '../../prng';
import { LayaLoadProgress, LayaQuestions, LayaStatus } from '../../../types/laya';
import { CursorThreat, DestinationCandidate, FishAgent, FishPerception } from '../../../types/underwater';
import {
  DANGER_STATEMENT,
  DESTINATION_INSTRUCTIONS,
  DESTINATION_PRIORITY_SCORE,
  DESTINATION_SCORE,
  EAT_STATEMENT,
  HAND_AWARE_CENTIMETRES,
  INTENT_LINGER,
  INTENT_REFRESH_SECONDS,
  PANIC_LINGER,
  QUESTION_DANGER,
  QUESTION_DESTINATION,
  QUESTION_EAT,
  THREAT_AGE_WEIGHT,
  THREAT_SCORE_BASE,
} from './fish-intent-constants';
import { buildFoodStateText, buildHandStateText } from './fish-perception-text';
import { LAYA_DOWNLOAD_BYTES, LAYA_MAX_THREADS, LAYA_MODEL_URL } from './laya-constants';
import { LayaWorkerController } from './laya-worker-controller';

const SHUFFLE_SEED = 20261001 as const;
const FIRST_ANSWER_SCORE = 10 as const;
const NO_PERCEPTION = null;
const NO_SCORE = -1 as const;
const MIN_THREADS = 1 as const;
const THREADS_PER_CORE = 0.5 as const;
const FULL_FRACTION = 1 as const;

type StatusCallback = (status: LayaStatus, downloadFraction: number, decisionMs: number) => void;

interface IntentRequest {
  agent: FishAgent;
  isDestination: boolean;
  perception: FishPerception | null;
  isDangerAsked: boolean;
  isEatAsked: boolean;
}

export class FishIntentController {
  private readonly _agents: readonly FishAgent[];
  private readonly _getPerception: (agent: FishAgent, threat: CursorThreat | null) => FishPerception;
  private readonly _getCandidates: (agent: FishAgent) => DestinationCandidate[];
  private readonly _setDestination: (agent: FishAgent, candidate: DestinationCandidate) => void;
  private readonly _onStatusChange: StatusCallback;
  private readonly _random = buildSeededRandom(SHUFFLE_SEED);
  private readonly _downloaded = new Map<string, number>();
  private _worker: LayaWorkerController | null = null;
  private _status: LayaStatus = LayaStatus.OFF;
  private _isBusy = false;
  private _wasDestinationLast = false;
  private _generation = 0;
  private _decisionMs = 0;

  constructor(
    agents: readonly FishAgent[],
    getPerception: (agent: FishAgent, threat: CursorThreat | null) => FishPerception,
    getCandidates: (agent: FishAgent) => DestinationCandidate[],
    setDestination: (agent: FishAgent, candidate: DestinationCandidate) => void,
    onStatusChange: StatusCallback,
  ) {
    this._agents = agents;
    this._getPerception = getPerception;
    this._getCandidates = getCandidates;
    this._setDestination = setDestination;
    this._onStatusChange = onStatusChange;
  }

  public async enable(): Promise<void> {
    if (this._worker) return;
    this._generation += 1;
    const generation = this._generation;
    this._downloaded.clear();
    this._setStatus(LayaStatus.DOWNLOADING, 0);
    const worker = new LayaWorkerController(LAYA_MODEL_URL, (progress) => this._onDownloadProgress(progress, generation));
    this._worker = worker;
    try {
      await worker.init(Math.max(MIN_THREADS, Math.min(LAYA_MAX_THREADS, Math.floor((navigator.hardwareConcurrency || MIN_THREADS) * THREADS_PER_CORE))));
      if (generation !== this._generation) return;
      this._setStatus(LayaStatus.ACTIVE, FULL_FRACTION);
    } catch {
      if (generation !== this._generation) return;
      worker.destroy();
      this._worker = null;
      this._setStatus(LayaStatus.FAILED, 0);
    }
  }

  public disable(): void {
    this._generation += 1;
    this._worker?.destroy();
    this._worker = null;
    this._isBusy = false;
    for (const agent of this._agents) this._clearIntent(agent);
    this._setStatus(LayaStatus.OFF, 0);
  }

  public destroy(): void {
    this.disable();
  }

  /** Ages every fish's last answer and, when the model is free, asks it about the fish most in need of a decision. */
  public update(deltaSeconds: number, threat: CursorThreat | null): void {
    for (const agent of this._agents) agent.intent.ageSeconds += deltaSeconds;
    if (this._status !== LayaStatus.ACTIVE || this._isBusy || !this._worker) return;
    const request = this._pickRequest(threat);
    if (!request) return;
    this._wasDestinationLast = request.isDestination;
    this._isBusy = true;
    const generation = this._generation;
    const work = request.isDestination ? this._askDestination(request.agent, generation) : this._askIntent(request, generation);
    work
      .catch(() => {
        if (generation === this._generation) this._setStatus(LayaStatus.FAILED, 0);
      })
      .finally(() => {
        if (generation === this._generation) this._isBusy = false;
      });
  }

  /**
   * Chooses whom to consult next. Only questions that apply to a fish's surroundings are asked: danger while a
   * hand is near (or a fear answer is still lingering) and eating while food is near (or an eat answer lingers).
   * A fish with a hand near is asked at once, nearest first and danger only (one question, so the answer comes
   * back fast), ahead of everything else. Which way the answer goes is always the model's call.
   */
  private _pickRequest(threat: CursorThreat | null): IntentRequest | null {
    let best: IntentRequest | null = null;
    let bestScore: number = NO_SCORE;
    for (const agent of this._agents) {
      if (agent.entryDelay > 0) continue;
      const perception = this._getPerception(agent, threat);
      const handCentimetres = perception.handCentimetres;
      if (handCentimetres !== null) {
        const closeness = 1 - handCentimetres / HAND_AWARE_CENTIMETRES[agent.profile.species];
        const threatScore = THREAT_SCORE_BASE + agent.intent.ageSeconds * THREAT_AGE_WEIGHT + closeness;
        if (threatScore > bestScore) {
          best = { agent, isDestination: false, perception, isDangerAsked: true, isEatAsked: false };
          bestScore = threatScore;
        }
        continue;
      }
      const isDangerAsked = agent.panic > PANIC_LINGER || agent.intent.danger > INTENT_LINGER;
      const isEatAsked = perception.foodCentimetres !== null || agent.intent.eat > INTENT_LINGER;
      if (isDangerAsked || isEatAsked) {
        const base = agent.intent.hasAnswer ? agent.intent.ageSeconds / INTENT_REFRESH_SECONDS : FIRST_ANSWER_SCORE;
        if (agent.intent.ageSeconds >= INTENT_REFRESH_SECONDS && base > bestScore) {
          best = { agent, isDestination: false, perception, isDangerAsked, isEatAsked };
          bestScore = base;
        }
      }
      const destinationScore = this._wasDestinationLast ? DESTINATION_SCORE : DESTINATION_PRIORITY_SCORE;
      if (agent.needsDestination && destinationScore > bestScore) {
        best = { agent, isDestination: true, perception: NO_PERCEPTION, isDangerAsked: false, isEatAsked: false };
        bestScore = destinationScore;
      }
    }
    return best;
  }

  private async _askIntent(request: IntentRequest, generation: number): Promise<void> {
    const worker = this._worker as LayaWorkerController; // update() only calls this while a worker exists
    const { agent } = request;
    const questions: LayaQuestions = {};
    const perception = request.perception as FishPerception; // intent requests always carry a perception
    const handState = buildHandStateText(perception);
    const foodState = buildFoodStateText(perception);
    if (request.isDangerAsked) questions[QUESTION_DANGER] = { kind: 'noul', instructions: DANGER_STATEMENT, state: handState };
    if (request.isEatAsked) questions[QUESTION_EAT] = { kind: 'noul', instructions: EAT_STATEMENT, state: foodState };
    const response = await worker.decide('', questions);
    if (generation !== this._generation) return;
    const danger = response.answers[QUESTION_DANGER];
    const eat = response.answers[QUESTION_EAT];
    // a question that was not asked had nothing to apply to (no hand, no food), so it carries no urge
    agent.intent.danger = danger?.kind === 'noul' ? danger.probabilityTrue : 0;
    agent.intent.eat = eat?.kind === 'noul' ? eat.probabilityTrue : 0;
    agent.intent.hasAnswer = true;
    agent.intent.ageSeconds = 0;
    this._decisionMs = response.elapsedMs;
    this._onStatusChange(this._status, FULL_FRACTION, this._decisionMs);
  }

  private async _askDestination(agent: FishAgent, generation: number): Promise<void> {
    const worker = this._worker as LayaWorkerController; // update() only calls this while a worker exists
    const candidates = this._buildShuffled(this._getCandidates(agent));
    const criteria: Record<string, string> = {};
    candidates.forEach((candidate, index) => {
      criteria[`spot_${index + 1}`] = candidate.description;
    });
    const state = `This goldfish is a ${agent.temperament.label.toLowerCase()}.`;
    const response = await worker.decide(state, {
      [QUESTION_DESTINATION]: { kind: 'choice', instructions: DESTINATION_INSTRUCTIONS, criteria },
    });
    if (generation !== this._generation) return;
    const answer = response.answers[QUESTION_DESTINATION];
    if (answer.kind !== 'choice') return;
    const chosen = candidates[Number(answer.choice.replace('spot_', '')) - 1];
    if (chosen) this._setDestination(agent, chosen);
    this._decisionMs = response.elapsedMs;
    this._onStatusChange(this._status, FULL_FRACTION, this._decisionMs);
  }

  private _buildShuffled(candidates: DestinationCandidate[]): DestinationCandidate[] {
    const shuffled = [...candidates];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this._random() * (index + 1));
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    return shuffled;
  }

  private _clearIntent(agent: FishAgent): void {
    agent.intent.danger = 0;
    agent.intent.eat = 0;
    agent.intent.hasAnswer = false;
    agent.intent.ageSeconds = 0;
  }

  private _onDownloadProgress(progress: LayaLoadProgress, generation: number): void {
    if (generation !== this._generation) return;
    this._downloaded.set(progress.file, progress.loaded);
    let loaded = 0;
    for (const bytes of this._downloaded.values()) loaded += bytes;
    const fraction = Math.min(FULL_FRACTION, loaded / LAYA_DOWNLOAD_BYTES);
    this._setStatus(fraction >= FULL_FRACTION ? LayaStatus.STARTING : LayaStatus.DOWNLOADING, fraction);
  }

  private _setStatus(status: LayaStatus, downloadFraction: number): void {
    this._status = status;
    this._onStatusChange(status, downloadFraction, this._decisionMs);
  }
}

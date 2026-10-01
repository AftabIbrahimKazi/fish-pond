/**
 * Types for the Laya-AI System 1 decision model (ONNX, runs in the browser).
 * Request shape follows the Laya / Jev "system one" contract.
 */

export type LayaQuestionKind = 'choice' | 'score' | 'noul';

export type LayaState = string | Record<string, unknown> | unknown[];

export interface LayaQuestion {
  kind: LayaQuestionKind;
  /** Overrides the shared state for this question, so each question can be worded for what the model reads best. */
  state?: LayaState;
  instructions: string;
  criteria?: Record<string, string | null> | string[] | null;
}

export type LayaQuestions = Record<string, LayaQuestion>;

/** A question after criteria and instructions are normalised for sequence building. */
export interface LayaInternalQuestion {
  kind: LayaQuestionKind;
  instructions: string;
  criteria: Record<string, string | null> | string[] | null;
}

export interface LayaConfig {
  maxLength: number;
  headMaxLength: number;
  temperatures: [number, number, number];
  temperaturesByOptions: Record<string, number>;
}

/** The fields of rl_agent_config.json that the runtime reads. */
export interface LayaRawConfig {
  max_len: number;
  head_max_len: number;
  temperature: [number, number, number];
  temperature_by_options: Record<string, number>;
}

export interface LayaChoiceAnswer {
  kind: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface LayaScoreAnswer {
  kind: 'score';
  score: number;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface LayaYesNoAnswer {
  kind: 'noul';
  probabilityTrue: number;
}

export type LayaAnswer = LayaChoiceAnswer | LayaScoreAnswer | LayaYesNoAnswer;

export interface LayaResponse {
  answers: Record<string, LayaAnswer>;
  inputTokens: number;
  elapsedMs: number;
}

export interface LayaSequence {
  ids: number[];
  markers: number[];
}

export interface LayaTokenizer {
  encode(text: string): number[];
  maskToken: string;
  maskTokenId: number;
  clsTokenId: number;
  sepTokenId: number;
}

export interface LayaLoadProgress {
  file: string;
  loaded: number;
  total: number;
  isCached: boolean;
}

export type LayaWorkerRequest =
  | { type: 'init'; baseUrl: string; threads?: number }
  | { type: 'decide'; requestId: number; state: LayaState; questions: LayaQuestions }
  | { type: 'destroy' };

export type LayaWorkerMessage =
  | { type: 'progress'; progress: LayaLoadProgress }
  | { type: 'ready'; threads: number }
  | { type: 'result'; requestId: number; response: LayaResponse }
  | { type: 'error'; requestId: number | null; message: string };

export enum LayaStatus {
  OFF = 'off',
  DOWNLOADING = 'downloading',
  STARTING = 'starting',
  ACTIVE = 'active',
  FAILED = 'failed',
}

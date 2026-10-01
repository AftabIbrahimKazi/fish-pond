/**
 * Runs the quantised Laya model (encoder + decision head) with ONNX Runtime Web (wasm).
 * Weights are fetched with progress and kept in the Cache API so a reload does not
 * download them again. Ported from the laya-web runtime by nvkudva
 * (github.com/nvkudva/laya-web); the model is convaiinnovations/laya (Apache-2.0).
 */

import * as ort from 'onnxruntime-web/wasm';

import {
  LayaConfig,
  LayaLoadProgress,
  LayaQuestions,
  LayaRawConfig,
  LayaResponse,
  LayaState,
  LayaTokenizer,
} from '../../../types/laya';
import {
  LAYA_CACHE_NAME,
  LAYA_DEFAULT_THREADS,
  LAYA_ENCODER_NAME,
  LAYA_HEAD_NAME,
  LAYA_KIND_INDEX,
  LAYA_MAX_THREADS,
  LAYA_ORT_PATH,
} from './laya-constants';
import { buildAnswer, getSoftmax, getTemperature } from './laya-postprocess';
import { buildInternalQuestion, buildOptionTexts, buildSequence } from './laya-sequence';
import { buildLayaTokenizer } from './laya-tokenizer-loader';

type ProgressCallback = (progress: LayaLoadProgress) => void;

async function readCachedBytes(url: string): Promise<Uint8Array | null> {
  try {
    const cache = await caches.open(LAYA_CACHE_NAME);
    const hit = await cache.match(url);
    return hit ? new Uint8Array(await hit.arrayBuffer()) : null;
  } catch {
    return null; // blocked storage: fall through to the network
  }
}

async function writeCachedBytes(url: string, bytes: Uint8Array): Promise<void> {
  try {
    const cache = await caches.open(LAYA_CACHE_NAME);
    await cache.put(url, new Response(bytes as BlobPart)); // Uint8Array is a valid body at runtime
  } catch {
    // quota exceeded or blocked storage: the session still works, it just re-downloads next time
  }
}

async function readStreamedBytes(url: string, onProgress?: ProgressCallback): Promise<Uint8Array> {
  const file = url.split('/').pop() ?? url;
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`${url}: ${response.status}`);
  const total = Number(response.headers.get('content-length') ?? 0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.({ file, loaded, total, isCached: false });
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

async function readWeights(url: string, onProgress?: ProgressCallback): Promise<Uint8Array> {
  const cached = await readCachedBytes(url);
  if (cached) {
    onProgress?.({ file: url.split('/').pop() ?? url, loaded: cached.length, total: cached.length, isCached: true });
    return cached;
  }
  const bytes = await readStreamedBytes(url, onProgress);
  await writeCachedBytes(url, bytes);
  return bytes;
}

function buildConfig(raw: LayaRawConfig): LayaConfig {
  return {
    maxLength: raw.max_len,
    headMaxLength: raw.head_max_len,
    temperatures: raw.temperature,
    temperaturesByOptions: raw.temperature_by_options,
  };
}

export async function deleteLayaWeightCache(): Promise<void> {
  try {
    await caches.delete(LAYA_CACHE_NAME);
  } catch {
    // blocked storage: nothing to delete
  }
}

export class LayaInferenceEngine {
  private readonly _baseUrl: string;
  private _config: LayaConfig | null = null;
  private _tokenizer: LayaTokenizer | null = null;
  private _encoder: ort.InferenceSession | null = null;
  private _head: ort.InferenceSession | null = null;

  constructor(baseUrl: string) {
    this._baseUrl = baseUrl;
  }

  public async init(onProgress?: ProgressCallback, threads?: number): Promise<void> {
    ort.env.wasm.wasmPaths = LAYA_ORT_PATH;
    ort.env.wasm.numThreads = threads ?? Math.min(navigator.hardwareConcurrency || LAYA_DEFAULT_THREADS, LAYA_MAX_THREADS);
    const [rawConfig, tokenizerJson, tokenizerConfig] = await Promise.all([
      fetch(`${this._baseUrl}/rl_agent_config.json`).then((response) => response.json() as Promise<LayaRawConfig>),
      fetch(`${this._baseUrl}/tokenizer.json`).then((response) => response.json() as Promise<object>),
      fetch(`${this._baseUrl}/tokenizer_config.json`).then((response) => response.json() as Promise<object>),
    ]);
    this._config = buildConfig(rawConfig);
    this._tokenizer = buildLayaTokenizer(tokenizerJson, tokenizerConfig);
    this._encoder = await this._createSession(LAYA_ENCODER_NAME, onProgress);
    this._head = await this._createSession(LAYA_HEAD_NAME, onProgress);
  }

  /** Scores each typed question against the state in one forward pass per question. */
  public async decide(state: LayaState, questions: LayaQuestions): Promise<LayaResponse> {
    if (!this._config || !this._tokenizer || !this._encoder || !this._head) throw new Error('LayaInferenceEngine is not initialised');
    const startedAt = performance.now();
    const response: LayaResponse = { answers: {}, inputTokens: 0, elapsedMs: 0 };
    for (const [questionId, request] of Object.entries(questions)) {
      const question = buildInternalQuestion(request);
      const optionCount = buildOptionTexts(question).length;
      const { ids, markers } = buildSequence(this._tokenizer, request.state ?? state, question, this._config.maxLength, this._config.headMaxLength);
      if (markers.length !== optionCount) throw new Error(`question ${questionId}: options do not fit in ${this._config.headMaxLength} tokens`);
      const kindIndex = LAYA_KIND_INDEX[question.kind];
      const logits = await this._runModel(ids, markers, kindIndex, optionCount);
      const temperature = getTemperature(this._config, kindIndex, optionCount);
      response.answers[questionId] = buildAnswer(question, getSoftmax(logits.map((value) => value / temperature)));
      response.inputTokens += ids.length;
    }
    response.elapsedMs = performance.now() - startedAt;
    return response;
  }

  public async destroy(): Promise<void> {
    await this._encoder?.release();
    await this._head?.release();
    this._encoder = null;
    this._head = null;
    this._tokenizer = null;
    this._config = null;
  }

  private async _createSession(name: string, onProgress?: ProgressCallback): Promise<ort.InferenceSession> {
    const graph = await readWeights(`${this._baseUrl}/${name}.onnx`, onProgress);
    const data = await readWeights(`${this._baseUrl}/${name}.onnx.data`, onProgress);
    return ort.InferenceSession.create(graph, {
      executionProviders: ['wasm'],
      externalData: [{ data, path: `${name}.onnx.data` }],
    });
  }

  private async _runModel(ids: number[], markers: number[], kindIndex: number, optionCount: number): Promise<number[]> {
    const encoder = this._encoder as ort.InferenceSession; // decide() checked the sessions
    const head = this._head as ort.InferenceSession; // decide() checked the sessions
    const length = ids.length;
    const attention = new ort.Tensor('int64', new BigInt64Array(length).fill(BigInt(1)), [1, length]);
    const { hidden } = await encoder.run({
      input_ids: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [1, length]),
      attention_mask: attention,
    });
    const result = await head.run({
      hidden,
      attention_mask: attention,
      marker_pos: new ort.Tensor('int64', BigInt64Array.from(markers, BigInt), [1, markers.length]),
      marker_mask: new ort.Tensor('bool', new Uint8Array(markers.length).fill(1), [1, markers.length]),
      qtype: new ort.Tensor('int64', BigInt64Array.from([kindIndex], BigInt), [1]),
    });
    return Array.from(result.logits.data as Float32Array).slice(0, optionCount); // head logits are float32
  }
}

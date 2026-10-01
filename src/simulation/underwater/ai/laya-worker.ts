/// <reference lib="webworker" />
/** Web Worker that owns the Laya model so inference never blocks the 3D scene. */

import { LayaWorkerMessage, LayaWorkerRequest } from '../../../types/laya';
import { LayaInferenceEngine } from './laya-inference-engine';

let engine: LayaInferenceEngine | null = null;

function postMessageToPage(message: LayaWorkerMessage): void {
  self.postMessage(message);
}

async function handleInit(baseUrl: string, threads?: number): Promise<void> {
  engine = new LayaInferenceEngine(baseUrl);
  await engine.init((progress) => postMessageToPage({ type: 'progress', progress }), threads);
  postMessageToPage({ type: 'ready', threads: threads ?? 0 });
}

async function handleDecide(request: Extract<LayaWorkerRequest, { type: 'decide' }>): Promise<void> {
  if (!engine) throw new Error('Laya worker is not initialised');
  const response = await engine.decide(request.state, request.questions);
  postMessageToPage({ type: 'result', requestId: request.requestId, response });
}

self.onmessage = (event: MessageEvent<LayaWorkerRequest>): void => {
  const request = event.data;
  const requestId = request.type === 'decide' ? request.requestId : null;
  const work = request.type === 'init' ? handleInit(request.baseUrl, request.threads) : request.type === 'decide' ? handleDecide(request) : engine?.destroy() ?? Promise.resolve();
  work.catch((error: unknown) => postMessageToPage({ type: 'error', requestId, message: String(error) }));
};

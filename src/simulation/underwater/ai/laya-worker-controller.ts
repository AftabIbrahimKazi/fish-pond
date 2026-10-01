/** Page-side handle for the Laya worker: starts it, sends decisions and resolves them by request id. */

import {
  LayaLoadProgress,
  LayaQuestions,
  LayaResponse,
  LayaState,
  LayaWorkerMessage,
  LayaWorkerRequest,
} from '../../../types/laya';

interface PendingRequest {
  resolve: (response: LayaResponse) => void;
  reject: (error: Error) => void;
}

export class LayaWorkerController {
  private readonly _baseUrl: string;
  private readonly _onProgress: (progress: LayaLoadProgress) => void;
  private _worker: Worker | null = null;
  private _nextRequestId = 1;
  private readonly _pending = new Map<number, PendingRequest>();
  private _readyHandlers: { resolve: () => void; reject: (error: Error) => void } | null = null;

  constructor(baseUrl: string, onProgress: (progress: LayaLoadProgress) => void) {
    this._baseUrl = baseUrl;
    this._onProgress = onProgress;
  }

  /** Starts the worker, downloads or restores the weights and resolves once the model is ready. */
  public init(threads?: number): Promise<void> {
    this._worker = new Worker(new URL('./laya-worker.ts', import.meta.url), { type: 'module' });
    this._worker.onmessage = (event: MessageEvent<LayaWorkerMessage>): void => this._onWorkerMessage(event.data);
    this._worker.onerror = (event: ErrorEvent): void => this._failAll(new Error(event.message));
    return new Promise<void>((resolve, reject) => {
      this._readyHandlers = { resolve, reject };
      this._send({ type: 'init', baseUrl: this._baseUrl, threads });
    });
  }

  public decide(state: LayaState, questions: LayaQuestions): Promise<LayaResponse> {
    const requestId = this._nextRequestId;
    this._nextRequestId += 1;
    return new Promise<LayaResponse>((resolve, reject) => {
      this._pending.set(requestId, { resolve, reject });
      this._send({ type: 'decide', requestId, state, questions });
    });
  }

  public destroy(): void {
    this._send({ type: 'destroy' });
    this._worker?.terminate();
    this._worker = null;
    this._failAll(new Error('Laya worker destroyed'));
  }

  private _send(request: LayaWorkerRequest): void {
    this._worker?.postMessage(request);
  }

  private _onWorkerMessage(message: LayaWorkerMessage): void {
    if (message.type === 'progress') {
      this._onProgress(message.progress);
    } else if (message.type === 'ready') {
      this._readyHandlers?.resolve();
      this._readyHandlers = null;
    } else if (message.type === 'result') {
      this._pending.get(message.requestId)?.resolve(message.response);
      this._pending.delete(message.requestId);
    } else if (message.requestId === null) {
      this._failAll(new Error(message.message));
    } else {
      this._pending.get(message.requestId)?.reject(new Error(message.message));
      this._pending.delete(message.requestId);
    }
  }

  private _failAll(error: Error): void {
    this._readyHandlers?.reject(error);
    this._readyHandlers = null;
    for (const request of this._pending.values()) request.reject(error);
    this._pending.clear();
  }
}

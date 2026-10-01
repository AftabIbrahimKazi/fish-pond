import { LayaQuestionKind } from '../../../types/laya';

/** Quantised Laya weights (Apache-2.0, nvkudva/laya-web-q8, a build of convaiinnovations/laya). */
export const LAYA_MODEL_URL = 'https://huggingface.co/nvkudva/laya-web-q8/resolve/main/v1' as const;
export const LAYA_CACHE_NAME = 'laya-weights-v1' as const;
export const LAYA_ORT_PATH = '/ort/' as const;
export const LAYA_MAX_THREADS = 8 as const;
export const LAYA_DEFAULT_THREADS = 4 as const;
export const LAYA_DOWNLOAD_MEGABYTES = 524 as const;
export const LAYA_DOWNLOAD_BYTES = 524e6 as const;

export const LAYA_ENCODER_NAME = 'encoder_q8' as const;
export const LAYA_HEAD_NAME = 'head_q8' as const;

/** Index of each question kind in the model's type embedding and temperature table. */
export const LAYA_KIND_INDEX: Record<LayaQuestionKind, number> = { choice: 0, score: 1, noul: 2 };
export const LAYA_KIND_NAMES: readonly LayaQuestionKind[] = ['choice', 'score', 'noul'];

/** Sequence building limits. Every one of them is part of the model's training contract. */
export const LAYA_OPTION_TOKEN_LIMIT = 48 as const;
export const LAYA_OPTION_BUDGET_FLOOR = 16 as const;
export const LAYA_OPTION_MIN_TOKENS = 4 as const;
export const LAYA_HEAD_MIN_TOKENS = 8 as const;
export const LAYA_PROBABILITY_DECIMALS = 1e4 as const;
export const LAYA_PROBABILITY_FLOOR = 1e-12 as const;
export const LAYA_ASCII_LIMIT = 0x7f as const;
export const LAYA_BMP_LIMIT = 0xffff as const;
export const LAYA_ASTRAL_OFFSET = 0x10000 as const;
export const LAYA_HIGH_SURROGATE_BASE = 0xd800 as const;
export const LAYA_LOW_SURROGATE_MASK = 0x3ff as const;
export const LAYA_SURROGATE_SHIFT = 10 as const;
export const LAYA_CONTROL_LIMIT = 0x20 as const;
export const LAYA_HEX_RADIX = 16 as const;
export const LAYA_HEX_WIDTH = 4 as const;

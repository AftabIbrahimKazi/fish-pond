/**
 * Turns Laya's raw logits into calibrated probabilities and answers.
 * Ported from the laya-web runtime by nvkudva (github.com/nvkudva/laya-web).
 */

import {
  LAYA_KIND_INDEX,
  LAYA_KIND_NAMES,
  LAYA_PROBABILITY_DECIMALS,
  LAYA_PROBABILITY_FLOOR,
} from './laya-constants';
import { LayaAnswer, LayaConfig, LayaInternalQuestion } from '../../../types/laya';

const SMALL_BUCKET_MAX = 2 as const;
const MEDIUM_BUCKET_MAX = 5 as const;
const LARGE_BUCKET_MAX = 10 as const;
const YES_INDEX = 1 as const;

/** A 2-option yes/no and a 20-option choice need different scaling, hence the cardinality key. */
export function getTemperatureBucket(kindIndex: number, optionCount: number): string {
  let size = '11+';
  if (optionCount <= SMALL_BUCKET_MAX) size = '2';
  else if (optionCount <= MEDIUM_BUCKET_MAX) size = '3-5';
  else if (optionCount <= LARGE_BUCKET_MAX) size = '6-10';
  return `${LAYA_KIND_NAMES[kindIndex]}:${size}`;
}

export function getTemperature(config: LayaConfig, kindIndex: number, optionCount: number): number {
  const bucket = config.temperaturesByOptions[getTemperatureBucket(kindIndex, optionCount)];
  return bucket === undefined ? config.temperatures[kindIndex] : bucket;
}

export function getSoftmax(logits: number[]): number[] {
  const peak = Math.max(...logits);
  const exponents = logits.map((value) => Math.exp(value - peak));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  return exponents.map((value) => value / total);
}

/** Confidence is 1 minus the normalised entropy of the answer distribution. */
export function getConfidence(probabilities: number[], optionCount: number): number {
  if (optionCount < SMALL_BUCKET_MAX) return 1;
  const entropy = -probabilities
    .slice(0, optionCount)
    .reduce((sum, value) => sum + value * Math.log(Math.min(Math.max(value, LAYA_PROBABILITY_FLOOR), 1)), 0);
  return 1 - entropy / Math.log(optionCount);
}

function getRounded(value: number): number {
  return Math.round(value * LAYA_PROBABILITY_DECIMALS) / LAYA_PROBABILITY_DECIMALS;
}

export function buildAnswer(question: LayaInternalQuestion, probabilities: number[]): LayaAnswer {
  const optionCount = probabilities.length;
  const confidence = getRounded(getConfidence(probabilities, optionCount));
  if (question.kind === 'choice') {
    const keys = Object.keys((question.criteria ?? {}) as Record<string, unknown>); // choice criteria are keyed after normalising
    const best = probabilities.indexOf(Math.max(...probabilities));
    return {
      kind: 'choice',
      choice: keys[best],
      probabilities: Object.fromEntries(keys.map((key, index) => [key, getRounded(probabilities[index])])),
      confidence,
    };
  }
  if (question.kind === 'score') {
    return {
      kind: 'score',
      score: getRounded(probabilities.reduce((sum, value, index) => sum + index * value, 0)),
      probabilities: Object.fromEntries(probabilities.map((value, index) => [String(index), getRounded(value)])),
      confidence,
    };
  }
  return { kind: 'noul', probabilityTrue: getRounded(probabilities[YES_INDEX]) };
}

export function getKindIndex(question: LayaInternalQuestion): number {
  return LAYA_KIND_INDEX[question.kind];
}

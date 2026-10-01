/**
 * Builds the token sequence Laya expects:
 *   [CLS] <kind> question: instructions [SEP] [MASK] opt0 [MASK] opt1 ... [SEP] state [SEP]
 *
 * Ported from the laya-web runtime by nvkudva (github.com/nvkudva/laya-web), which mirrors the
 * original Python of Laya (convaiinnovations/laya). Token-for-token equality with that reference
 * is the contract: every slice bound and space below is load-bearing.
 */

import {
  LAYA_ASCII_LIMIT,
  LAYA_ASTRAL_OFFSET,
  LAYA_BMP_LIMIT,
  LAYA_CONTROL_LIMIT,
  LAYA_HEAD_MIN_TOKENS,
  LAYA_HEX_RADIX,
  LAYA_HEX_WIDTH,
  LAYA_HIGH_SURROGATE_BASE,
  LAYA_LOW_SURROGATE_MASK,
  LAYA_OPTION_BUDGET_FLOOR,
  LAYA_OPTION_MIN_TOKENS,
  LAYA_OPTION_TOKEN_LIMIT,
  LAYA_SURROGATE_SHIFT,
} from './laya-constants';
import {
  LayaInternalQuestion,
  LayaQuestion,
  LayaSequence,
  LayaState,
  LayaTokenizer,
} from '../../../types/laya';

const LOW_SURROGATE_BASE = 0xdc00 as const;
const FALSE_OPTION_TEXT = 'no, the statement does not hold' as const;
const TRUE_OPTION_TEXT = 'yes, the statement holds' as const;

function getEscapedHex(code: number): string {
  return `\\u${code.toString(LAYA_HEX_RADIX).padStart(LAYA_HEX_WIDTH, '0')}`;
}

function getEscapedCharacter(character: string, isAsciiOnly: boolean): string {
  const code = character.codePointAt(0) as number; // a for...of step always yields one code point
  if (character === '"') return '\\"';
  if (character === '\\') return '\\\\';
  if (character === '\n') return '\\n';
  if (character === '\r') return '\\r';
  if (character === '\t') return '\\t';
  if (code < LAYA_CONTROL_LIMIT) return getEscapedHex(code);
  if (!isAsciiOnly || code <= LAYA_ASCII_LIMIT) return character;
  if (code <= LAYA_BMP_LIMIT) return getEscapedHex(code);
  const offset = code - LAYA_ASTRAL_OFFSET;
  const high = LAYA_HIGH_SURROGATE_BASE + (offset >> LAYA_SURROGATE_SHIFT);
  const low = LOW_SURROGATE_BASE + (offset & LAYA_LOW_SURROGATE_MASK);
  return getEscapedHex(high) + getEscapedHex(low);
}

function getEscapedString(text: string, isAsciiOnly: boolean): string {
  let escaped = '"';
  for (const character of text) escaped += getEscapedCharacter(character, isAsciiOnly);
  return `${escaped}"`;
}

/** Python's json.dumps: separators are ", " and ": ", unlike JSON.stringify. */
export function buildPythonJson(value: unknown, isAsciiOnly: boolean): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return getEscapedString(value, isAsciiOnly);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `[${value.map((item) => buildPythonJson(item, isAsciiOnly)).join(', ')}]`;
  const entries = Object.entries(value as Record<string, unknown>); // not null, string, boolean, number or array here
  return `{${entries.map(([key, item]) => `${getEscapedString(key, isAsciiOnly)}: ${buildPythonJson(item, isAsciiOnly)}`).join(', ')}}`;
}

export function buildStateText(state: LayaState): string {
  return typeof state === 'string' ? state : buildPythonJson(state, false);
}

/** Request question to internal question. Mirrors RLAgent._to_internal of the reference. */
export function buildInternalQuestion(question: LayaQuestion): LayaInternalQuestion {
  let criteria = question.criteria ?? null;
  if (question.kind === 'choice' && Array.isArray(criteria)) {
    const keyed: Record<string, string | null> = {};
    for (const key of criteria) keyed[key] = null;
    criteria = keyed;
  }
  // the reference calls json.dumps here with ensure_ascii left at its default of true
  const instructions = typeof question.instructions === 'string' ? question.instructions : buildPythonJson(question.instructions, true);
  return { kind: question.kind, instructions, criteria };
}

/** Option texts in label-index order. Yes/no is always [false, true] so index 1 is the yes probability. */
export function buildOptionTexts(question: LayaInternalQuestion): string[] {
  if (question.kind === 'choice') {
    const criteria = (question.criteria ?? {}) as Record<string, string | null>; // choice criteria are always keyed after normalising
    // the reference tests `if not v`: null, undefined and "" fall back to the bare key
    return Object.entries(criteria).map(([key, detail]) => (!detail ? key : `${key}: ${detail}`));
  }
  if (question.kind === 'score') {
    return (question.criteria as string[]).map((level, index) => `level ${index}: ${level}`); // score criteria are an ordered list
  }
  const criteria = (question.criteria ?? {}) as Record<string, string | null>; // yes/no criteria are an optional keyed override
  return [`false: ${criteria.false || FALSE_OPTION_TEXT}`, `true: ${criteria.true || TRUE_OPTION_TEXT}`];
}

function getTokenCount(optionTokens: number[][]): number {
  return optionTokens.reduce((total, tokens) => total + tokens.length, 0);
}

export function buildSequence(
  tokenizer: LayaTokenizer,
  state: LayaState,
  question: LayaInternalQuestion,
  maxLength: number,
  headMaxLength: number,
): LayaSequence {
  const scrub = (text: string): string => text.split(tokenizer.maskToken).join(' ');
  const options = buildOptionTexts(question);
  let headTokens = tokenizer.encode(`${question.kind} question: ${scrub(question.instructions)}`);

  let optionTokens = options.map((option) => [
    tokenizer.maskTokenId,
    ...tokenizer.encode(` ${scrub(option)}`).slice(0, LAYA_OPTION_TOKEN_LIMIT),
  ]);
  let optionBudget = headMaxLength - getTokenCount(optionTokens);
  if (optionBudget < LAYA_OPTION_BUDGET_FLOOR) {
    // too many or too long options: shrink every option text evenly
    const perOption = Math.max(LAYA_OPTION_MIN_TOKENS, Math.floor((headMaxLength - LAYA_OPTION_BUDGET_FLOOR) / Math.max(1, optionTokens.length)));
    optionTokens = optionTokens.map((tokens) => tokens.slice(0, perOption));
    optionBudget = headMaxLength - getTokenCount(optionTokens);
  }
  headTokens = headTokens.slice(0, Math.max(LAYA_HEAD_MIN_TOKENS, optionBudget));

  const ids = [tokenizer.clsTokenId, ...headTokens, tokenizer.sepTokenId];
  const markers: number[] = [];
  for (const tokens of optionTokens) {
    markers.push(ids.length);
    ids.push(...tokens);
  }
  ids.push(tokenizer.sepTokenId);

  const room = Math.max(0, maxLength - ids.length - 1);
  const stateTokens = tokenizer.encode(scrub(buildStateText(state))).slice(0, room);
  const all = [...ids, ...stateTokens, tokenizer.sepTokenId];
  return { ids: all.slice(0, maxLength), markers: markers.filter((marker) => marker < maxLength) };
}

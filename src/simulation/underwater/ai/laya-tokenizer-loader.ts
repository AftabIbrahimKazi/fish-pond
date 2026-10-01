/** Builds the Laya tokenizer straight from tokenizer.json, with no model attached. */

import { Tokenizer } from '@huggingface/tokenizers';

import { LayaTokenizer } from '../../../types/laya';

const MASK_TOKEN = '[MASK]' as const;
const CLS_TOKEN = '[CLS]' as const;
const SEP_TOKEN = '[SEP]' as const;

function getTokenId(tokenizer: Tokenizer, token: string): number {
  const id = tokenizer.token_to_id(token);
  if (id === undefined) throw new Error(`Laya tokenizer has no ${token} token`);
  return id;
}

export function buildLayaTokenizer(tokenizerJson: object, tokenizerConfig: object): LayaTokenizer {
  const tokenizer = new Tokenizer(tokenizerJson, tokenizerConfig);
  return {
    encode: (text: string): number[] => tokenizer.encode(text, { add_special_tokens: false }).ids,
    maskToken: MASK_TOKEN,
    maskTokenId: getTokenId(tokenizer, MASK_TOKEN),
    clsTokenId: getTokenId(tokenizer, CLS_TOKEN),
    sepTokenId: getTokenId(tokenizer, SEP_TOKEN),
  };
}

/**
 * AI notice.
 * One-line label that says plainly whether an experiment uses an AI model or is scripted code.
 */

import React from 'react';

import styles from './ai-notice.module.css';

export type AiNoticeKind = 'scripted' | 'model';

interface AiNoticeProps {
  kind: AiNoticeKind;
  isShort?: boolean;
}

const COPY: Record<AiNoticeKind, { long: string; short: string }> = {
  scripted: { long: 'Scripted simulation · no AI model is used here', short: 'Scripted · no AI' },
  model: { long: 'Decisions made by Laya-AI, an ONNX model in your browser', short: 'Laya-AI decides' },
};

export const AiNotice: React.FC<AiNoticeProps> = ({ kind, isShort = false }) => (
  <p className={styles['fp-ai-notice']} data-ai={kind === 'model' ? 'true' : 'false'}>
    {isShort ? COPY[kind].short : COPY[kind].long}
  </p>
);

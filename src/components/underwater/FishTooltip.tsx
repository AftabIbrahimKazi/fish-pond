'use client';

/**
 * Fish Tooltip.
 * A small text label (no glass wrapper) with an arrow that points at one fish and follows it for a few seconds after the pointer touches
 * it or its readout. It only says which fish it is (name and unique marker) and what it is doing; the rest is read
 * from the highlighted block in the readout on the right.
 */

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { FishFocusInfo } from '../../types/underwater';
import { getFishMarker, getStateText, getStateTone } from './FishTelemetryReadout';

import styles from './underwater.module.css';

export interface FishTooltipHandle {
  place: (x: number, y: number) => void;
}

interface FishTooltipProps {
  info: FishFocusInfo | null;
}

const EDGE_MARGIN_PX = 12 as const;
const SAFE_TOP_PX = 84 as const;
const FISH_CLEARANCE_PX = 18 as const;

export const FishTooltip = forwardRef<FishTooltipHandle, FishTooltipProps>(({ info }, handleRef) => {
  const elementRef = useRef<HTMLElement | null>(null);
  const [lastInfo, setLastInfo] = useState<FishFocusInfo | null>(null);
  if (info && info !== lastInfo) setLastInfo(info); // keeps the label on screen while it fades out
  const shown = info ?? lastInfo;

  useImperativeHandle(handleRef, () => ({
    place: (x: number, y: number): void => {
      const element = elementRef.current;
      const stage = element?.parentElement;
      if (!element || !stage) return;
      const half = element.offsetWidth / 2;
      const clampedX = Math.min(Math.max(x, half + EDGE_MARGIN_PX), stage.clientWidth - half - EDGE_MARGIN_PX);
      element.dataset.placement = y - element.offsetHeight - FISH_CLEARANCE_PX < SAFE_TOP_PX ? 'below' : 'above';
      // the label follows a moving fish every frame, so its position is passed as two CSS variables rather than a state attribute
      element.style.setProperty('--fp-tooltip-x', `${clampedX}px`);
      element.style.setProperty('--fp-tooltip-y', `${y}px`);
      element.style.setProperty('--fp-tooltip-arrow', `${x - clampedX}px`);
    },
  }), []);

  return (
    <aside
      ref={elementRef}
      className={`${styles['fp-underwater-tooltip']} position-absolute d-flex flex-column`}
      data-state={info ? 'visible' : 'hidden'}
      data-placement="above"
      aria-hidden={info ? undefined : true}
    >
      {shown && (
        <>
          <h2 className={styles['fp-underwater-tooltip-title']}>
            <span className={styles['fp-underwater-tooltip-marker']}>{getFishMarker(shown.id)}</span> {shown.label}
          </h2>
          <p className={styles['fp-underwater-tooltip-state']} data-tone={getStateTone(shown)}>
            {shown.temperament} · {getStateText(shown)}
          </p>
        </>
      )}
    </aside>
  );
});
FishTooltip.displayName = 'FishTooltip';

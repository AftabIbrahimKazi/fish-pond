/**
 * HUD Icons.
 * Small line icons shared by every HUD. Stroke follows the text colour, size comes from CSS.
 */

import React from 'react';

import styles from './hud-icons.module.css';

const ICON_VIEWBOX = '0 0 24 24' as const;
const ICON_STROKE_WIDTH = 1.75 as const;

function buildIcon(paths: React.ReactNode): React.FC {
  const HudIcon: React.FC = () => (
    <svg
      className={styles['fp-icon']}
      viewBox={ICON_VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths}
    </svg>
  );
  return HudIcon;
}

export const ArrowLeftIcon = buildIcon(
  <>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </>,
);

export const SlidersIcon = buildIcon(
  <>
    <path d="M21 4h-7" />
    <path d="M10 4H3" />
    <path d="M21 12h-9" />
    <path d="M8 12H3" />
    <path d="M21 20h-5" />
    <path d="M12 20H3" />
    <path d="M14 2v4" />
    <path d="M8 10v4" />
    <path d="M16 18v4" />
  </>,
);

export const CloseIcon = buildIcon(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
);

export const EyeIcon = buildIcon(
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

export const EyeOffIcon = buildIcon(
  <>
    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a13.2 13.2 0 0 1-1.7 2.68" />
    <path d="M6.6 6.6A13.5 13.5 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="m2 2 20 20" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>,
);

export const ResetIcon = buildIcon(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </>,
);

export const DownloadIcon = buildIcon(
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
    <path d="M12 15V3" />
  </>,
);

export const FishIcon = buildIcon(
  <>
    <path d="M6.5 12c3-5 8.5-6 13.5 0-5 6-10.5 5-13.5 0Z" />
    <path d="M6.5 12 2 8v8l4.5-4Z" />
    <path d="M16 11h.01" />
  </>,
);

export const ArrowRightIcon = buildIcon(
  <>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </>,
);

export const ArrowUpIcon = buildIcon(
  <>
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </>,
);

export const ArrowDownIcon = buildIcon(
  <>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </>,
);

export const ChevronDownIcon = buildIcon(<path d="m6 9 6 6 6-6" />);

export const PlayIcon = buildIcon(<path d="M6 4l14 8-14 8Z" />);

export const PauseIcon = buildIcon(
  <>
    <path d="M8 5v14" />
    <path d="M16 5v14" />
  </>,
);

export const PointerIcon = buildIcon(<path d="M4 4l7.07 17 2.51-7.39L21 11.07Z" />);

export const TimerIcon = buildIcon(
  <>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2" />
    <path d="M9 2h6" />
  </>,
);

export const FoodIcon = buildIcon(
  <>
    <circle cx="9" cy="9" r="3" />
    <circle cx="16" cy="14" r="3" />
    <circle cx="8" cy="17" r="2" />
  </>,
);

export const TrashIcon = buildIcon(
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
  </>,
);

export const TargetIcon = buildIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </>,
);

export const TableIcon = buildIcon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M9 4v16" />
  </>,
);

/**
 * Featured Badge.
 * Backlink credit for the site's Three.js Resources showcase listing. Fixed over the home and
 * docs pages — the only two with no competing fixed-position HUD to collide with. Stacked above
 * the Next.js dev toolbar indicator (bottom-left, dev mode only) rather than moved off it.
 */

import React from 'react';

import { THREEJS_RESOURCES_BADGE_URL, THREEJS_RESOURCES_LOGO_URL } from '../config/site';

import styles from './featured-badge.module.css';

export const FeaturedBadge: React.FC = () => (
  <a
    className={`${styles['fp-featured-badge']} position-fixed z-[var(--fp-z-overlay)] d-inline-flex align-items-center gap-[var(--fp-space-xs)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`}
    href={THREEJS_RESOURCES_BADGE_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Featured on Three.js Resources — view the showcase listing"
  >
    <img className={`${styles['fp-featured-badge-logo']} flex-shrink-0`} src={THREEJS_RESOURCES_LOGO_URL} alt="" />
    <span className={`${styles['fp-featured-badge-text']} d-flex flex-column`}>
      <span className={styles['fp-featured-badge-eyebrow']}>Featured on</span>
      <span className={styles['fp-featured-badge-title']}>Three.js Resources</span>
    </span>
  </a>
);

import type { Metadata } from 'next';
import Link from 'next/link';

import styles from './landing.module.css';

export const metadata: Metadata = {
  title: 'Fish Pond — Cognition Lab',
  description: 'Three scenes: the Cognitive Arena (instinct versus deliberation), the three-case Visual Telemetry Benchmark, and a realistic Triforge-shaded underwater scene.',
  alternates: { canonical: '/' },
};

interface ExperimentLink {
  href: string;
  order: string;
  title: string;
  summary: string;
  cta: string;
}

const EXPERIMENT_LINKS: ExperimentLink[] = [
  {
    href: '/arena',
    order: '01',
    title: 'Cognitive Arena',
    summary: 'One fish, one wide pond. Instinct (System 1) reacts in a heartbeat; deliberation (System 1 + 2) investigates the unknown. When they conflict, instinct wins.',
    cta: 'Enter the arena',
  },
  {
    href: '/benchmark',
    order: '02',
    title: 'Visual Telemetry Benchmark',
    summary: 'Three ponds side by side: programmed reflex, preset lottery and dual-process reasoning, fed identical inputs.',
    cta: 'Open the benchmark',
  },
  {
    href: '/underwater',
    order: '03',
    title: 'Underwater',
    summary: 'A realistic underwater scene: caustics, light shafts, water absorption and two real goldfish models, all shaded and graded with Triforge.',
    cta: 'Dive in',
  },
];

export default function LandingPage() {
  return (
    <main className={`${styles['fp-landing']} d-flex flex-column justify-content-center align-items-center flex-grow-1 p-[var(--fp-space-xl)] gap-[var(--fp-space-xl)]`}>
      <header className="d-flex flex-column align-items-center gap-[var(--fp-space-sm)]">
        <h1 className={styles['fp-landing-title']}>Fish Pond</h1>
        <p className={styles['fp-landing-tagline']}>Choose an experiment</p>
      </header>

      <nav aria-label="Experiments" className={`${styles['fp-landing-grid']} d-grid gap-[var(--fp-space-lg)] w-100`}>
        {EXPERIMENT_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles['fp-landing-card']} d-flex flex-column gap-[var(--fp-space-default)] p-[var(--fp-space-xl)]`}
          >
            <span className={styles['fp-landing-order']}>{link.order}</span>
            <h2 className={styles['fp-landing-card-title']}>{link.title}</h2>
            <p className={styles['fp-landing-card-summary']}>{link.summary}</p>
            <span className={styles['fp-landing-cta']}>{link.cta} <span aria-hidden="true">→</span></span>
          </Link>
        ))}
      </nav>
    </main>
  );
}

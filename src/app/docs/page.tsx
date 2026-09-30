import Link from 'next/link';

import { ArrowLeftIcon } from '../../components/HudIcons';
import { LandingBackdrop } from '../../components/landing/LandingBackdrop';
import { DOC_SECTIONS } from './docs-content';

import styles from './docs.module.css';

export default function DocsPage() {
  return (
    <>
      <LandingBackdrop />
      <main className={`${styles['fp-docs']} d-flex flex-column gap-[var(--fp-space-xl)] p-[var(--fp-space-md)] mx-auto`}>
        <header className="d-flex flex-column align-items-start gap-[var(--fp-space-md)]">
          <Link href="/" className={`${styles['fp-docs-back']} d-inline-flex align-items-center justify-content-center gap-[var(--fp-space-xs)] px-[var(--fp-space-default)] py-[var(--fp-space-xs)]`}>
            <ArrowLeftIcon />
            All experiments
          </Link>
          <div className="d-flex flex-column gap-[var(--fp-space-xs)]">
            <h1 className={styles['fp-docs-title']}>Fish Pond documentation</h1>
            <p className={styles['fp-docs-lead']}>
              How the experiments work, in depth: the fish behaviour systems, the Triforge shader pipeline, controls, the scene settings workflow and the design system.
            </p>
          </div>
        </header>

        <div className={`${styles['fp-docs-layout']} d-grid gap-[var(--fp-space-lg)]`}>
          <nav aria-label="On this page" className={`${styles['fp-docs-toc']} p-[var(--fp-space-lg)]`}>
            <p className={styles['fp-docs-toc-title']}>On this page</p>
            <ol className={`${styles['fp-docs-toc-list']} d-flex flex-column`}>
              {DOC_SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className={styles['fp-docs-toc-link']}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className={`${styles['fp-docs-article']} d-flex flex-column gap-[var(--fp-space-xxl)] p-[var(--fp-space-xl)]`}>
            {DOC_SECTIONS.map((section) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className={styles['fp-docs-section']}>
                <h2 id={`${section.id}-title`}>{section.title}</h2>
                <p className={styles['fp-docs-summary']}>{section.summary}</p>
                {section.content}
              </section>
            ))}
          </article>
        </div>
      </main>
    </>
  );
}

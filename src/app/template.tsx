import { ViewTransition } from 'react';

/**
 * Wraps every route so navigating between pages cross-fades instead of cutting.
 * The animation itself lives in globals.css (.fp-page-in / .fp-page-out).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="fp-page-in" exit="fp-page-out" default="none">
      {children}
    </ViewTransition>
  );
}

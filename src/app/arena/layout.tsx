import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cognitive Arena — Fish Pond',
  description: 'One fish, one wide pond: instinctive System 1 reflexes versus deliberate System 1+2 appraisal of unfamiliar objects, with visible short-term memory.',
  alternates: { canonical: '/arena' },
};

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return children;
}

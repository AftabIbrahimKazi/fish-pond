import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Underwater — Fish Pond',
  description: 'A realistic underwater scene shaded and graded entirely with Triforge: caustics, light shafts, water absorption and two real goldfish models.',
  alternates: { canonical: '/underwater' },
};

export default function UnderwaterLayout({ children }: { children: React.ReactNode }) {
  return children;
}

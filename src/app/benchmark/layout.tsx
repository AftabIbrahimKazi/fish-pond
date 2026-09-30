import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visual Telemetry Benchmark — Fish Pond',
  description: 'Side-by-side visual comparison of three fish control architectures: programmed reflex, preset lottery, and dual-process reasoning.',
  alternates: { canonical: '/benchmark' },
};

export default function BenchmarkLayout({ children }: { children: React.ReactNode }) {
  return children;
}

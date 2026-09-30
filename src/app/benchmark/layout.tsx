import type { Metadata } from 'next';

import { JsonLd } from '../../components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildRouteMetadata, buildWebApplicationJsonLd } from '../../config/seo';

export const metadata: Metadata = buildRouteMetadata('benchmark');

export default function BenchmarkLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={buildWebApplicationJsonLd('benchmark')} />
      <JsonLd data={buildBreadcrumbJsonLd('benchmark')} />
      {children}
    </>
  );
}

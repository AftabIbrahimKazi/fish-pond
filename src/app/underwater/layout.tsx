import type { Metadata } from 'next';

import { JsonLd } from '../../components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildRouteMetadata, buildWebApplicationJsonLd } from '../../config/seo';

export const metadata: Metadata = buildRouteMetadata('underwater');

export default function UnderwaterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={buildWebApplicationJsonLd('underwater')} />
      <JsonLd data={buildBreadcrumbJsonLd('underwater')} />
      {children}
    </>
  );
}

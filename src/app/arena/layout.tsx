import type { Metadata } from 'next';

import { JsonLd } from '../../components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildRouteMetadata, buildWebApplicationJsonLd } from '../../config/seo';

export const metadata: Metadata = buildRouteMetadata('arena');

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={buildWebApplicationJsonLd('arena')} />
      <JsonLd data={buildBreadcrumbJsonLd('arena')} />
      {children}
    </>
  );
}

import type { Metadata } from 'next';

import { JsonLd } from '../../components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildRouteMetadata, buildTechArticleJsonLd } from '../../config/seo';

export const metadata: Metadata = buildRouteMetadata('docs');

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={buildTechArticleJsonLd('docs')} />
      <JsonLd data={buildBreadcrumbJsonLd('docs')} />
      {children}
    </>
  );
}

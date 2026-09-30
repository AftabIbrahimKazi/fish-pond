/**
 * SEO builders: full per-route Metadata (Open Graph and Twitter included, because Next replaces a
 * parent's openGraph object instead of merging it) and schema.org JSON-LD blocks.
 */

import type { Metadata } from 'next';

import {
  AUTHOR_NAME,
  AUTHOR_URL,
  LAST_MODIFIED,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  REPO_URL,
  ROUTES,
  RouteSeo,
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_LOCALE,
  SITE_NAME,
  getAbsoluteUrl,
  getOgImagePath,
  getRoute,
} from './site';

export function buildRouteMetadata(slug: RouteSeo['slug']): Metadata {
  const route = getRoute(slug);
  const image = {
    url: getOgImagePath(slug),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: route.ogImageAlt,
  };
  return {
    title: { absolute: route.title },
    description: route.description,
    alternates: { canonical: route.path },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      url: route.path,
      title: route.title,
      description: route.description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: route.title,
      description: route.description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}

export function buildWebSiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${getAbsoluteUrl('/')}#website`,
    name: SITE_NAME,
    url: getAbsoluteUrl('/'),
    description: SITE_DESCRIPTION,
    inLanguage: SITE_LANGUAGE,
    publisher: { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_URL },
    sameAs: [REPO_URL],
  };
}

export function buildBreadcrumbJsonLd(slug: RouteSeo['slug']): Record<string, unknown> {
  const home = getRoute('home');
  const route = getRoute(slug);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: home.name, item: getAbsoluteUrl(home.path) },
      { '@type': 'ListItem', position: 2, name: route.name, item: getAbsoluteUrl(route.path) },
    ],
  };
}

export function buildWebApplicationJsonLd(slug: RouteSeo['slug']): Record<string, unknown> {
  const route = getRoute(slug);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: route.name,
    url: getAbsoluteUrl(route.path),
    description: route.description,
    applicationCategory: route.applicationCategory,
    operatingSystem: 'Any modern web browser',
    browserRequirements: 'Requires JavaScript and WebGL 2',
    inLanguage: SITE_LANGUAGE,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    image: getAbsoluteUrl(getOgImagePath(slug)),
    isPartOf: { '@id': `${getAbsoluteUrl('/')}#website` },
    author: { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_URL },
    codeRepository: REPO_URL,
  };
}

export function buildTechArticleJsonLd(slug: RouteSeo['slug']): Record<string, unknown> {
  const route = getRoute(slug);
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: route.title,
    description: route.description,
    url: getAbsoluteUrl(route.path),
    mainEntityOfPage: getAbsoluteUrl(route.path),
    image: getAbsoluteUrl(getOgImagePath(slug)),
    inLanguage: SITE_LANGUAGE,
    dateModified: LAST_MODIFIED,
    proficiencyLevel: 'Beginner',
    about: ['Fish behaviour simulation', 'WebGL shaders', 'Dual-process cognition', 'Next.js'],
    author: { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_URL },
    publisher: { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_URL },
    isPartOf: { '@id': `${getAbsoluteUrl('/')}#website` },
  };
}

export function buildExperimentListJsonLd(): Record<string, unknown> {
  const experiments = ROUTES.filter((route) => route.slug !== 'home' && route.slug !== 'docs');
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Fish Pond experiments',
    itemListElement: experiments.map((route, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: route.name,
      url: getAbsoluteUrl(route.path),
    })),
  };
}

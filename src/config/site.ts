/**
 * Site-wide constants: identity, URLs and the per-route SEO copy that feeds metadata, the sitemap,
 * structured data and the README. Titles are 50-60 characters and descriptions 120-155 (SEO-01/02).
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fish-pond-mu.vercel.app').replace(/\/$/, '');
export const SITE_NAME = 'Fish Pond' as const;
export const SITE_LOCALE = 'en_US' as const;
export const SITE_LANGUAGE = 'en' as const;
export const SITE_CATEGORY = 'technology' as const;
export const THEME_COLOR = '#0a2a33' as const;
export const BACKGROUND_COLOR = '#0a2a33' as const;
export const AUTHOR_NAME = 'Aftab Ibrahim Kazi' as const;
export const AUTHOR_URL = 'https://github.com/AftabIbrahimKazi' as const;
export const REPO_URL = 'https://github.com/AftabIbrahimKazi/fish-pond' as const;
export const OG_IMAGE_WIDTH = 1200 as const;
export const OG_IMAGE_HEIGHT = 630 as const;
export const LAST_MODIFIED = '2026-10-01' as const;

export const SITE_DESCRIPTION =
  'Three browser experiments in fish behaviour: a cognitive arena, a three-way AI benchmark and a realistic Triforge-shaded underwater scene.' as const;

export const SITE_KEYWORDS: readonly string[] = [
  'fish pond',
  'interactive 3D fish simulation',
  'WebGL underwater scene',
  'Three.js goldfish',
  'Triforge shaders',
  'dual-process cognition',
  'System 1 and System 2',
  'fish behaviour AI',
  'procedural water caustics',
  'Next.js 3D experiment',
  'liquid glass UI',
  'Strata CSS',
];

export type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface RouteSeo {
  slug: 'home' | 'arena' | 'benchmark' | 'underwater' | 'docs';
  path: string;
  name: string;
  title: string;
  description: string;
  ogTitle: string;
  ogSubtitle: string;
  ogImageAlt: string;
  changeFrequency: ChangeFrequency;
  priority: number;
  applicationCategory: string;
}

export const ROUTES: readonly RouteSeo[] = [
  {
    slug: 'home',
    path: '/',
    name: 'Fish Pond',
    title: 'Fish Pond — Interactive 3D Fish Behaviour Experiments',
    description: SITE_DESCRIPTION,
    ogTitle: 'Fish Pond',
    ogSubtitle: 'Interactive 3D fish behaviour experiments',
    ogImageAlt: 'Fish Pond landing page: three experiment cards over a realistic underwater scene',
    changeFrequency: 'monthly',
    priority: 1,
    applicationCategory: 'EducationalApplication',
  },
  {
    slug: 'arena',
    path: '/arena',
    name: 'Cognitive Arena',
    title: 'Cognitive Arena — Fish Instinct vs Deliberation | Fish Pond',
    description:
      'Place stimuli in a wide pond and watch one fish react: instant System 1 reflexes versus slower System 2 appraisal, with visible short-term memory.',
    ogTitle: 'Cognitive Arena',
    ogSubtitle: 'Instinct versus deliberation in one fish',
    ogImageAlt: 'Cognitive Arena: one fish in a wide pond with stimulus palette, mind readout and decision timeline',
    changeFrequency: 'monthly',
    priority: 0.8,
    applicationCategory: 'EducationalApplication',
  },
  {
    slug: 'benchmark',
    path: '/benchmark',
    name: 'Visual Telemetry Benchmark',
    title: 'Visual Telemetry Benchmark — Three Fish Controllers',
    description:
      'Compare three fish control architectures side by side: programmed reflex, preset lottery and dual-process reasoning, all fed identical inputs.',
    ogTitle: 'Visual Telemetry Benchmark',
    ogSubtitle: 'Three fish controllers, identical inputs',
    ogImageAlt: 'Benchmark: three ponds side by side showing reflex, lottery and dual-process fish with live telemetry',
    changeFrequency: 'monthly',
    priority: 0.8,
    applicationCategory: 'EducationalApplication',
  },
  {
    slug: 'underwater',
    path: '/underwater',
    name: 'Underwater',
    title: 'Underwater — Realistic 3D Goldfish Scene | Fish Pond',
    description:
      'Explore a realistic underwater scene with caustics, light shafts and real goldfish models. Fly around with WASD, feed the fish and tune every detail.',
    ogTitle: 'Underwater',
    ogSubtitle: 'A realistic goldfish scene, shaded with Triforge',
    ogImageAlt: 'Underwater scene with sunlit caustics on the seabed, seagrass and shafts of light',
    changeFrequency: 'monthly',
    priority: 0.9,
    applicationCategory: 'MultimediaApplication',
  },
  {
    slug: 'docs',
    path: '/docs',
    name: 'Documentation',
    title: 'Fish Pond Documentation — Architecture, AI and Controls',
    description:
      'Deep-dive documentation for Fish Pond: the fish behaviour engine, Triforge shader pipeline, dual-process AI, scene settings, controls and design system.',
    ogTitle: 'Documentation',
    ogSubtitle: 'Architecture, AI, shaders, controls and design system',
    ogImageAlt: 'Fish Pond documentation page over the underwater scene',
    changeFrequency: 'monthly',
    priority: 0.7,
    applicationCategory: 'EducationalApplication',
  },
];

export function getRoute(slug: RouteSeo['slug']): RouteSeo {
  const route = ROUTES.find((entry) => entry.slug === slug);
  if (!route) throw new Error(`Unknown route: ${slug}`);
  return route;
}

export function getAbsoluteUrl(path: string): string {
  return `${SITE_URL}${path === '/' ? '' : path}`;
}

export function getOgImagePath(slug: RouteSeo['slug']): string {
  return `/og/${slug}.jpg`;
}

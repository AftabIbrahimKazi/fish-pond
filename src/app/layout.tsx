import type { Metadata, Viewport } from 'next';

import { JsonLd } from '../components/seo/JsonLd';
import { buildWebSiteJsonLd } from '../config/seo';
import {
  AUTHOR_NAME,
  AUTHOR_URL,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_CATEGORY,
  SITE_KEYWORDS,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
  THEME_COLOR,
  getOgImagePath,
  getRoute,
} from '../config/site';

import './globals.css';

const home = getRoute('home');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: home.title, template: `%s | ${SITE_NAME}` },
  description: home.description,
  applicationName: SITE_NAME,
  generator: 'Next.js',
  keywords: [...SITE_KEYWORDS],
  authors: [{ name: AUTHOR_NAME, url: AUTHOR_URL }],
  creator: AUTHOR_NAME,
  publisher: AUTHOR_NAME,
  category: SITE_CATEGORY,
  referrer: 'origin-when-cross-origin',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    url: '/',
    title: home.title,
    description: home.description,
    images: [{ url: getOgImagePath('home'), width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: home.ogImageAlt }],
  },
  twitter: {
    card: 'summary_large_image',
    title: home.title,
    description: home.description,
    images: [{ url: getOgImagePath('home'), alt: home.ogImageAlt }],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: THEME_COLOR,
  colorScheme: 'dark',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>
        <JsonLd data={buildWebSiteJsonLd()} />
        {children}
      </body>
    </html>
  );
}

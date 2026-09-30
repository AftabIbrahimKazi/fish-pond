import type { MetadataRoute } from 'next';

import { LAST_MODIFIED, ROUTES, getAbsoluteUrl } from '../config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: getAbsoluteUrl(route.path),
    lastModified: LAST_MODIFIED,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

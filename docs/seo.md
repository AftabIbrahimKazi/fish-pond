# SEO

SEO is built into the project rather than added afterwards. The rules come from [`coding-standards/seo-standards.md`](../coding-standards/seo-standards.md).

## Single source of truth

`src/config/site.ts` holds the site URL, author, keywords and the per-route copy (title, description, Open Graph text, priority). `src/config/seo.ts` turns that into Next.js `Metadata` and JSON-LD. Change copy in one place and metadata, the sitemap, structured data and previews all follow.

| Route | Title (50-60 chars) |
|---|---|
| `/` | Fish Pond — Interactive 3D Fish Behaviour Experiments |
| `/arena` | Cognitive Arena — Fish Instinct vs Deliberation \| Fish Pond |
| `/benchmark` | Visual Telemetry Benchmark — Three Fish Controllers |
| `/underwater` | Underwater — Realistic 3D Goldfish Scene \| Fish Pond |
| `/docs` | Fish Pond Documentation — Architecture, AI and Controls |

Descriptions are 120-155 characters and unique per page.

## What is in place

| Feature | Where |
|---|---|
| Unique `<title>` and meta description | Route layouts via `buildRouteMetadata` |
| Canonical URL on every page | `alternates.canonical` |
| Open Graph and Twitter cards with 1200 by 630 images | `public/og/*.jpg`, referenced by `buildRouteMetadata` |
| `robots` directives, including large image previews | Root layout |
| One `h1` per page, sequential headings, landmarks | Pages and components |
| JSON-LD: WebSite, WebApplication, BreadcrumbList, TechArticle, ItemList | `src/components/seo/JsonLd.tsx` |
| Sitemap, robots, web app manifest | `src/app/sitemap.ts`, `robots.ts`, `manifest.ts` |
| Icons: SVG, PNG set, apple touch icon, maskable icon, `favicon.ico` | `public/`, `src/app/favicon.ico` |
| Theme colour and colour scheme | `viewport` export in the root layout |
| `llms.txt`, `humans.txt`, `security.txt` | `public/` |
| Security and cache headers | `next.config.ts` |
| Readable, lowercase URLs | `/arena`, `/benchmark`, `/underwater`, `/docs` |

## The site URL

Everything absolute derives from `NEXT_PUBLIC_SITE_URL` (default `https://fish-pond.vercel.app`). Set it in Vercel to your final domain. `public/llms.txt` and `public/.well-known/security.txt` contain the default domain as plain text; update them if the domain changes.

## Repository SEO (GitHub)

- A descriptive repository description, homepage link and topics are set on GitHub.
- The README opens with a keyword-rich summary, badges, screenshots with alt text and a table of contents.
- `docs/images/social-preview.jpg` is ready to upload as the repository social preview (Settings, General, Social preview).
- `CITATION.cff` enables GitHub's "Cite this repository" button.

## Checking it

- Validate structured data at <https://validator.schema.org> and <https://search.google.com/test/rich-results>.
- Preview cards with the Facebook Sharing Debugger and the LinkedIn Post Inspector.
- Run Lighthouse on the deployed site.
- Submit `https://fish-pond.vercel.app/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

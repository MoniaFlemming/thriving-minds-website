import { useEffect } from 'react';
import {
  canonicalUrl,
  PUBLIC_ROUTES,
  SERVICE_SCHEMA,
  SITE_NAME,
  SOCIAL_IMAGE_PATH,
  SITE_ORIGIN,
} from './site-config';

export type PageMetadataProps = { path: string };

type Metadata = {
  path: string;
  title: string;
  description: string;
  canonical: string | null;
  robots: string;
  pageType: 'WebSite' | 'WebPage';
  structuredData: object[];
};

function normalizePath(path: string) {
  const clean = path.split(/[?#]/, 1)[0].replace(/\/+/g, '/');
  if (!clean || clean === '/') return '/';
  return clean.replace(/\/+$/, '');
}

export function getPageMetadata(path: string): Metadata {
  const normalizedPath = normalizePath(path);
  const page = PUBLIC_ROUTES.find((route) => route.path === normalizedPath);
  const title = page?.title ?? 'Page not found | Thriving Minds Consulting';
  const description =
    page?.description ??
    'The page you requested could not be found. Return to Thriving Minds Consulting to explore recreation therapy and family wellness support.';
  const canonical = page ? canonicalUrl(page.path) : null;
  const robots = !page || import.meta.env.DEV ? 'noindex, follow' : 'index, follow';
  const websiteId = `${SITE_ORIGIN}/#website`;
  const organizationId = `${SITE_ORIGIN}/#organization`;
  const structuredData: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': organizationId,
      name: SITE_NAME,
      url: SITE_ORIGIN,
      description:
        'Recreation therapy and family wellness support for children, youth, and caregivers.',
      telephone: '+1-647-667-8437',
      email: 'info@thrivingmindsconsulting.com',
    },
  ];

  if (page?.path === '/') {
    structuredData.push(
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': websiteId,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        publisher: { '@id': organizationId },
      },
      ...SERVICE_SCHEMA.map((service) => ({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.name,
        description: service.description,
        provider: { '@id': organizationId },
        url: canonicalUrl('/'),
      })),
    );
  }

  if (page && canonical) {
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      name: page.pageName,
      description,
      url: canonical,
      isPartOf: { '@id': websiteId },
      publisher: { '@id': organizationId },
    });
  }

  return {
    path: normalizedPath,
    title,
    description,
    canonical,
    robots,
    pageType: normalizedPath === '/' ? 'WebSite' : 'WebPage',
    structuredData,
  };
}

function setMeta(selector: string, attribute: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    const [key, content] = attribute.split('=');
    element.setAttribute(key, content.replaceAll('"', ''));
    document.head.append(element);
  }
  element.content = value;
}

function applyMetadata(metadata: Metadata) {
  document.title = metadata.title;
  setMeta('meta[name="description"]', 'name="description"', metadata.description);
  setMeta('meta[name="robots"]', 'name="robots"', metadata.robots);
  setMeta('meta[property="og:site_name"]', 'property="og:site_name"', SITE_NAME);
  setMeta('meta[property="og:title"]', 'property="og:title"', metadata.title);
  setMeta('meta[property="og:description"]', 'property="og:description"', metadata.description);
  setMeta('meta[property="og:type"]', 'property="og:type"', 'website');
  setMeta('meta[name="twitter:card"]', 'name="twitter:card"', 'summary_large_image');
  setMeta('meta[name="twitter:title"]', 'name="twitter:title"', metadata.title);
  setMeta('meta[name="twitter:description"]', 'name="twitter:description"', metadata.description);
  setMeta(
    'meta[property="og:image"]',
    'property="og:image"',
    canonicalUrl(SOCIAL_IMAGE_PATH),
  );
  setMeta(
    'meta[name="twitter:image"]',
    'name="twitter:image"',
    canonicalUrl(SOCIAL_IMAGE_PATH),
  );
  if (metadata.canonical) {
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.append(link);
    }
    link.href = metadata.canonical;
    setMeta('meta[property="og:url"]', 'property="og:url"', metadata.canonical);
  } else {
    document.head.querySelector('link[rel="canonical"]')?.remove();
    document.head.querySelector('meta[property="og:url"]')?.remove();
  }
  document.head.querySelectorAll('script[data-page-structured-data]').forEach((node) => node.remove());
  metadata.structuredData.forEach((schema, index) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.pageStructuredData = String(index);
    script.textContent = JSON.stringify(schema);
    document.head.append(script);
  });
}

/** Add this inside the app shell before its route switch. */
export function PageMetadata({ path }: PageMetadataProps) {
  const metadata = getPageMetadata(path);
  useEffect(() => applyMetadata(metadata), [metadata.path]);

  // The prerenderer reads this inert payload to author <head> metadata and
  // retains it so hydrateRoot sees the same component tree on the client.
  const payload = JSON.stringify(metadata).replace(/</g, '\\u003c');
  return (
    <>
      <script
        type="application/x-thriving-minds-seo"
        data-thriving-minds-seo=""
        dangerouslySetInnerHTML={{ __html: payload }}
      />
    </>
  );
}
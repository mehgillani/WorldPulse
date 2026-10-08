import React, { useEffect } from 'react';
import { Article, SiteSettings } from '../types/editorial';

interface SeoHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  article?: Article | null;
  siteSettings: SiteSettings;
  noIndex?: boolean;
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  canonicalPath = '/',
  article = null,
  siteSettings,
  noIndex = false,
}) => {
  useEffect(() => {
    const fullTitle = article
      ? article.seo?.title || `${article.title} | ${siteSettings.siteName}`
      : title
      ? `${title} | ${siteSettings.siteName} — ${siteSettings.tagline}`
      : `${siteSettings.siteName} — ${siteSettings.tagline}`;

    const metaDesc = article
      ? article.seo?.description || article.subtitle
      : description || siteSettings.siteDescription;

    document.title = fullTitle;

    const setMetaTag = (selector: string, attrName: string, attrValue: string, content: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMetaTag('meta[name="description"]', 'name', 'description', metaDesc);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', article?.seo?.ogTitle || fullTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', article?.seo?.ogDescription || metaDesc);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', article ? 'article' : 'website');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', article?.seo?.ogTitle || fullTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', article?.seo?.ogDescription || metaDesc);
    setMetaTag('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');

    // Canonical Link
    const origin = window.location.origin;
    const cleanPath = article?.seo?.canonicalUrl || canonicalPath;
    const fullCanonical = cleanPath.startsWith('http') ? cleanPath : `${origin}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;

    let linkCanonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', fullCanonical);

    // JSON-LD Structured Data (NewsArticle + BreadcrumbList for articles, NewsMediaOrganization otherwise)
    const scriptId = 'wp-dynamic-jsonld';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = scriptId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }

    if (article && !noIndex) {
      const schemaData = [
        {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: article.title,
          description: article.subtitle,
          image: article.featuredImage.startsWith('http')
            ? [article.featuredImage]
            : [`${origin}${article.featuredImage}`],
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          author: [
            {
              '@type': 'Person',
              name: article.authorName,
              jobTitle: article.authorRole,
              url: `${origin}/author/${article.authorId.replace('author-', '')}`,
            },
          ],
          publisher: {
            '@type': 'NewsMediaOrganization',
            name: siteSettings.siteName,
            slogan: siteSettings.tagline,
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': fullCanonical,
          },
          articleSection: article.categoryName,
          keywords: article.tags.join(', '),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: `${origin}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: article.categoryName,
              item: `${origin}/${article.category}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: article.title,
              item: fullCanonical,
            },
          ],
        },
      ];
      scriptEl.textContent = JSON.stringify(schemaData);
    } else {
      const orgSchema = {
        '@context': 'https://schema.org',
        '@type': 'NewsMediaOrganization',
        name: siteSettings.siteName,
        slogan: siteSettings.tagline,
        description: siteSettings.siteDescription,
        url: origin,
      };
      scriptEl.textContent = JSON.stringify(orgSchema);
    }
  }, [title, description, canonicalPath, article, siteSettings, noIndex]);

  return null;
};

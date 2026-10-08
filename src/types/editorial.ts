export type ArticleStatus = 'published' | 'draft' | 'scheduled';

export interface Author {
  id: string;
  name: string;
  slug: string;
  role: string;
  location: string;
  bio: string;
  photo: string;
  email?: string;
  social: {
    x?: string;
    linkedin?: string;
    website?: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  showInNav: boolean;
  showOnHomepage: boolean;
  order: number;
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  category: string; // category slug
  categoryName: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorRole: string;
  featuredImage: string;
  imageCaption: string;
  body: string; // HTML rich text
  status: ArticleStatus;
  publishedAt: string;
  updatedAt: string;
  scheduledFor?: string;
  readingTime: number; // minutes
  views: number;
  isLead: boolean;
  isTrending: boolean;
  isDeveloping: boolean;
  developingUpdates?: {
    id: string;
    timestamp: string;
    summary: string;
  }[];
  isDemo: boolean;
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
  };
}

export interface BreakingNewsConfig {
  enabled: boolean;
  label: string;
  headline: string;
  articleSlug: string;
  categorySlug: string;
  startTime: string;
  endTime: string;
}

export interface AdPlacement {
  id: string;
  name: string;
  slotKey:
    | 'header'
    | 'homepage_top'
    | 'homepage_middle'
    | 'homepage_bottom'
    | 'article_top'
    | 'article_middle'
    | 'article_bottom'
    | 'sidebar'
    | 'category_page'
    | 'footer';
  enabled: boolean;
  network: 'adsense' | 'custom' | 'house';
  publisherId: string;
  adSlotId: string;
  format: 'responsive' | 'horizontal' | 'rectangle';
  customCode: string;
  sponsorLabel?: string;
  headline?: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  url: string;
  altText: string;
  caption: string;
  mimeType: string;
  dimensions: string;
  uploadedAt: string;
  sizeKb: number;
}

export interface ArticleComment {
  id: string;
  articleId: string;
  articleTitle: string;
  authorName: string;
  authorEmail?: string; // Stripped on public API responses for privacy
  content: string;
  createdAt: string;
  status: 'approved' | 'pending' | 'rejected' | 'spam';
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  siteDescription: string;
  editorialEmail: string;
  pressEmail: string;
  headquarters: string;
  commentsEnabled: boolean;
  demoBannerVisible: boolean;
  googleAnalyticsId: string;
  googleSearchConsoleCode: string;
  adsensePublisherId: string;
  newsletter: {
    title: string;
    description: string;
    provider: 'mailchimp' | 'brevo' | 'convertkit' | 'internal';
    formActionUrl: string;
  };
  social: {
    facebook: string;
    instagram: string;
    x: string;
    youtube: string;
    linkedin: string;
    tiktok: string;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'reader';
  interests: string[];
  savedArticleIds: string[];
  newsletterSubscribed: boolean;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalPageViews: number;
  uniqueVisitors: number;
  avgReadingTimeSec: number;
  NewsletterSubscribersCount: number;
  topCountries: { country: string; code: string; percentage: number; views: number }[];
  trafficSources: { source: string; percentage: number }[];
  deviceBreakdown: { device: string; percentage: number }[];
  topSearchQueries: { query: string; count: number }[];
  dailyTraffic: { date: string; views: number; visitors: number }[];
}

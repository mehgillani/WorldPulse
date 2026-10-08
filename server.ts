import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import {
  AdPlacement,
  AnalyticsSummary,
  Article,
  ArticleComment,
  Author,
  BreakingNewsConfig,
  Category,
  MediaItem,
  SiteSettings,
  UserProfile,
} from './src/types/editorial.ts';
import {
  INITIAL_ADS,
  INITIAL_ANALYTICS,
  INITIAL_ARTICLES,
  INITIAL_AUTHORS,
  INITIAL_BREAKING_NEWS,
  INITIAL_CATEGORIES,
  INITIAL_COMMENTS,
  INITIAL_MEDIA,
  INITIAL_SITE_SETTINGS,
} from './src/data/seedData.ts';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'worldpulse-db.json');

interface StoredUser extends UserProfile {
  passwordHash: string;
}

interface DatabaseSchema {
  articles: Article[];
  categories: Category[];
  authors: Author[];
  media: MediaItem[];
  ads: AdPlacement[];
  comments: ArticleComment[];
  breakingNews: BreakingNewsConfig;
  siteSettings: SiteSettings;
  analytics: AnalyticsSummary;
  users: StoredUser[];
  newsletterSubscribers: { email: string; subscribedAt: string; source: string }[];
  sessions: Record<string, { userId: string; role: 'admin' | 'editor' | 'reader'; expiresAt: number }>;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`worldpulse_salt_${password}`).digest('hex');
}

function sanitizeText(input: unknown, maxLength = 5000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .trim()
    .slice(0, maxLength);
}

function loadDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (parsed && Array.isArray(parsed.articles)) {
        return parsed;
      }
    } catch (err) {
      console.error('Error reading worldpulse-db.json, re-seeding:', err);
    }
  }

  const initialDb: DatabaseSchema = {
    articles: INITIAL_ARTICLES,
    categories: INITIAL_CATEGORIES,
    authors: INITIAL_AUTHORS,
    media: INITIAL_MEDIA,
    ads: INITIAL_ADS,
    comments: INITIAL_COMMENTS,
    breakingNews: INITIAL_BREAKING_NEWS,
    siteSettings: INITIAL_SITE_SETTINGS,
    analytics: INITIAL_ANALYTICS,
    users: [
      {
        id: 'usr-admin-1',
        name: 'Elena Rostova (Chief Editor)',
        email: 'admin@worldpulse.press',
        role: 'admin',
        interests: ['world', 'politics', 'business', 'technology', 'science', 'environment'],
        savedArticleIds: ['art-1', 'art-2'],
        newsletterSubscribed: true,
        createdAt: '2026-01-01T00:00:00Z',
        passwordHash: hashPassword('WorldPulseAdmin2026!'),
      },
      {
        id: 'usr-reader-1',
        name: 'Julian Vance',
        email: 'reader@worldpulse.press',
        role: 'reader',
        interests: ['technology', 'science', 'business', 'environment'],
        savedArticleIds: ['art-2'],
        newsletterSubscribed: true,
        createdAt: '2026-09-15T00:00:00Z',
        passwordHash: hashPassword('ReaderPass2026!'),
      },
    ],
    newsletterSubscribers: [
      { email: 'editorial.subscriber@example.org', subscribedAt: '2026-10-01T08:00:00Z', source: 'homepage' },
      { email: 'geneva.desk@example.ch', subscribedAt: '2026-10-04T14:22:00Z', source: 'article' },
    ],
    sessions: {},
  };

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

const db = loadDatabase();

function promoteScheduledArticles(): void {
  const now = new Date().toISOString();
  let changed = false;
  for (const art of db.articles) {
    if (art.status === 'scheduled' && art.scheduledFor && art.scheduledFor <= now) {
      art.status = 'published';
      art.publishedAt = art.scheduledFor;
      changed = true;
    }
  }
  if (changed) saveDatabase(db);
}

function getAuthenticatedUser(req: Request): StoredUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const session = db.sessions[token];
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    delete db.sessions[token];
    saveDatabase(db);
    return null;
  }
  return db.users.find((u) => u.id === session.userId) || null;
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  (req as Request & { user?: StoredUser }).user = user;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = getAuthenticatedUser(req);
  if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
    res.status(403).json({ error: 'Administrative authorization required.' });
    return;
  }
  (req as Request & { user?: StoredUser }).user = user;
  next();
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Serve generated editorial images in both dev and prod
  const assetsImgDir = path.resolve(process.cwd(), 'src/assets/images');
  if (fs.existsSync(assetsImgDir)) {
    app.use('/src/assets/images', express.static(assetsImgDir));
  }

  // Dynamic robots.txt (Section 21)
  app.get('/robots.txt', (req: Request, res: Response) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const robots = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /admin/*',
      'Disallow: /api/*',
      'Disallow: /drafts/*',
      `Sitemap: ${baseUrl}/sitemap.xml`,
    ].join('\n');
    res.type('text/plain').send(robots);
  });

  // Dynamic XML Sitemap + Google News Sitemap readiness (Section 21 & 22)
  app.get('/sitemap.xml', (req: Request, res: Response) => {
    promoteScheduledArticles();
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const publishedArticles = db.articles.filter((a) => a.status === 'published');

    const categoryUrls = db.categories
      .map(
        (c) => `  <url>
    <loc>${baseUrl}/${c.slug}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`
      )
      .join('\n');

    const articleUrls = publishedArticles
      .map(
        (a) => `  <url>
    <loc>${baseUrl}/${a.category}/${a.slug}</loc>
    <lastmod>${a.updatedAt}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${a.isLead ? '1.0' : '0.9'}</priority>
    <news:news>
      <news:publication>
        <news:name>WORLDPULSE</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${a.publishedAt}</news:publication_date>
      <news:title>${a.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</news:title>
    </news:news>
  </url>`
      )
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
${categoryUrls}
${articleUrls}
</urlset>`;
    res.type('application/xml').send(xml);
  });

  // Public Bootstrap Endpoint
  app.get('/api/bootstrap', (req: Request, res: Response) => {
    promoteScheduledArticles();
    const user = getAuthenticatedUser(req);
    const isAdmin = user && (user.role === 'admin' || user.role === 'editor');

    const visibleArticles = isAdmin
      ? db.articles
      : db.articles.filter((a) => a.status === 'published');

    // Never expose commenter email addresses publicly (Section 38)
    const publicComments = db.comments
      .filter((c) => c.status === 'approved')
      .map(({ authorEmail, ...rest }) => rest);

    res.json({
      articles: visibleArticles,
      categories: [...db.categories].sort((a, b) => a.order - b.order),
      authors: db.authors.map(({ email, ...publicAuthor }) => (isAdmin ? { ...publicAuthor, email } : publicAuthor)),
      breakingNews: db.breakingNews,
      ads: db.ads,
      siteSettings: db.siteSettings,
      comments: publicComments,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            interests: user.interests,
            savedArticleIds: user.savedArticleIds,
            newsletterSubscribed: user.newsletterSubscribed,
            createdAt: user.createdAt,
          }
        : null,
    });
  });

  // Track Article View
  app.post('/api/articles/:id/view', (req: Request, res: Response) => {
    const article = db.articles.find((a) => a.id === req.params.id || a.slug === req.params.id);
    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    article.views += 1;
    db.analytics.totalPageViews += 1;
    saveDatabase(db);
    res.json({ views: article.views });
  });

  // Submit Public Comment
  app.post('/api/articles/:id/comments', (req: Request, res: Response) => {
    if (!db.siteSettings.commentsEnabled) {
      res.status(403).json({ error: 'Comments are currently disabled by editorial settings.' });
      return;
    }
    const article = db.articles.find((a) => a.id === req.params.id);
    if (!article) {
      res.status(404).json({ error: 'Article not found.' });
      return;
    }
    const authorName = sanitizeText(req.body.name, 80);
    const authorEmail = sanitizeText(req.body.email, 120);
    const content = sanitizeText(req.body.content, 1500);

    if (!authorName || !authorEmail || !content) {
      res.status(400).json({ error: 'Name, email, and comment text are required.' });
      return;
    }

    const newComment: ArticleComment = {
      id: `cmt-${Date.now()}`,
      articleId: article.id,
      articleTitle: article.title,
      authorName,
      authorEmail,
      content,
      createdAt: new Date().toISOString(),
      status: 'approved', // Immediately visible in demo, configurable in Admin Moderation
    };
    db.comments.unshift(newComment);
    saveDatabase(db);

    const { authorEmail: _hidden, ...publicComment } = newComment;
    res.json({ comment: publicComment, message: 'Comment published.' });
  });

  // Newsletter Subscription
  app.post('/api/newsletter/subscribe', (req: Request, res: Response) => {
    const email = sanitizeText(req.body.email, 140).toLowerCase();
    const source = sanitizeText(req.body.source || 'website', 40);
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const existing = db.newsletterSubscribers.find((s) => s.email === email);
    if (!existing) {
      db.newsletterSubscribers.unshift({
        email,
        subscribedAt: new Date().toISOString(),
        source,
      });
      db.analytics.NewsletterSubscribersCount += 1;
      saveDatabase(db);
    }
    res.json({
      success: true,
      message: 'You are subscribed to the WORLDPULSE Daily Global Briefing.',
    });
  });

  // Authentication Routes
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password, quickRole } = req.body;
    let user: StoredUser | undefined;

    if (quickRole === 'admin') {
      user = db.users.find((u) => u.role === 'admin');
    } else if (quickRole === 'reader') {
      user = db.users.find((u) => u.role === 'reader');
    } else {
      const cleanEmail = sanitizeText(email, 140).toLowerCase();
      const hashed = hashPassword(String(password || ''));
      user = db.users.find((u) => u.email.toLowerCase() === cleanEmail && u.passwordHash === hashed);
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    db.sessions[token] = {
      userId: user.id,
      role: user.role,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    };
    saveDatabase(db);

    const { passwordHash: _ph, ...safeUser } = user;
    res.json({ token, user: safeUser });
  });

  app.post('/api/auth/firebase-sync', (req: Request, res: Response) => {
    const uid = sanitizeText(req.body.uid, 128);
    const email = sanitizeText(req.body.email, 160).toLowerCase();
    const name = sanitizeText(req.body.name || 'Reader', 80);
    if (!uid) {
      res.status(400).json({ error: 'Firebase UID is required.' });
      return;
    }

    const isAdminEmail = email === 'mehgillani5373@gmail.com' || email === 'admin@worldpulse.press';
    let user = db.users.find((u) => u.id === uid || (email && u.email.toLowerCase() === email));

    if (!user) {
      user = {
        id: uid,
        name,
        email,
        role: isAdminEmail ? 'admin' : 'reader',
        interests: Array.isArray(req.body.interests) ? req.body.interests : ['world', 'technology', 'business'],
        savedArticleIds: Array.isArray(req.body.savedArticleIds) ? req.body.savedArticleIds : ['art-1'],
        newsletterSubscribed: true,
        createdAt: new Date().toISOString(),
        passwordHash: '',
      };
      db.users.push(user);
    } else if (isAdminEmail) {
      user.role = 'admin';
    }

    const token = crypto.randomBytes(32).toString('hex');
    db.sessions[token] = {
      userId: user.id,
      role: user.role,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
    };
    saveDatabase(db);

    const { passwordHash: _ph, ...safeUser } = user;
    res.json({ token, user: safeUser });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const name = sanitizeText(req.body.name, 80);
    const email = sanitizeText(req.body.email, 140).toLowerCase();
    const password = String(req.body.password || '');
    const interests = Array.isArray(req.body.interests)
      ? req.body.interests.map((i: unknown) => sanitizeText(i, 30)).filter(Boolean)
      : ['world', 'technology', 'business'];

    if (!name || !email || !email.includes('@') || password.length < 6) {
      res.status(400).json({ error: 'Please provide name, valid email, and a password of at least 6 characters.' });
      return;
    }

    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const newUser: StoredUser = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role: 'reader',
      interests,
      savedArticleIds: [],
      newsletterSubscribed: Boolean(req.body.newsletterSubscribed),
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(password),
    };

    db.users.push(newUser);
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions[token] = {
      userId: newUser.id,
      role: newUser.role,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
    };
    saveDatabase(db);

    const { passwordHash: _ph, ...safeUser } = newUser;
    res.json({ token, user: safeUser });
  });

  app.put('/api/auth/profile', requireAuth, (req: Request, res: Response) => {
    const user = (req as Request & { user: StoredUser }).user;
    if (Array.isArray(req.body.interests)) {
      user.interests = req.body.interests.map((i: unknown) => sanitizeText(i, 40)).filter(Boolean);
    }
    if (Array.isArray(req.body.savedArticleIds)) {
      user.savedArticleIds = req.body.savedArticleIds.map((id: unknown) => sanitizeText(id, 60)).filter(Boolean);
    }
    if (typeof req.body.newsletterSubscribed === 'boolean') {
      user.newsletterSubscribed = req.body.newsletterSubscribed;
    }
    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      user.name = sanitizeText(req.body.name, 80);
    }
    saveDatabase(db);
    const { passwordHash: _ph, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      delete db.sessions[token];
      saveDatabase(db);
    }
    res.json({ success: true });
  });

  // ============================================================================
  // LOW-LATENCY GEMINI AI ENDPOINTS (Model: gemini-3.1-flash-lite)
  // ============================================================================

  // 1. Reader Low-Latency Flash Brief & Translation
  app.post('/api/ai/flash-brief', async (req: Request, res: Response) => {
    const { articleId, mode = 'brief', targetLanguage = 'Spanish', customTopics } = req.body;
    const startMs = Date.now();

    try {
      const ai = getGeminiClient();

      if (mode === 'personalized_digest') {
        const topics: string[] = Array.isArray(customTopics) && customTopics.length > 0 ? customTopics : ['world', 'technology', 'business'];
        const matchingArticles = db.articles
          .filter((a) => a.status === 'published' && topics.includes(a.category))
          .slice(0, 4);

        const contextText = matchingArticles
          .map((a) => `- [${a.categoryName}] ${a.title}: ${a.subtitle}`)
          .join('\n');

        if (!ai) {
          res.json({
            model: 'gemini-3.1-flash-lite',
            latencyMs: Date.now() - startMs,
            bullets: matchingArticles.map((a) => `${a.categoryName.toUpperCase()}: ${a.subtitle.replace('EDITORIAL DEMO SAMPLE — ', '')}`),
            synthesis: `Your personalized WORLDPULSE briefing across ${topics.join(', ')} highlights cross-border infrastructure protocols, semiconductor advances, and global trade shifts.`,
          });
          return;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `You are the Chief Briefing Editor at WORLDPULSE ("The world. In focus.").
Synthesize these recent stories for a reader interested in [${topics.join(', ')}]:
${contextText}

Return JSON with:
- bullets: 3 concise, high-impact executive takeaways (1 sentence each)
- synthesis: A 2-sentence overarching global perspective.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                bullets: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                synthesis: { type: Type.STRING },
              },
              required: ['bullets', 'synthesis'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        res.json({
          model: 'gemini-3.1-flash-lite',
          latencyMs: Date.now() - startMs,
          bullets: parsed.bullets || [],
          synthesis: parsed.synthesis || '',
        });
        return;
      }

      const article = db.articles.find((a) => a.id === articleId || a.slug === articleId);
      if (!article) {
        res.status(404).json({ error: 'Article not found for briefing.' });
        return;
      }

      const plainBody = article.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (!ai) {
        if (mode === 'translate') {
          res.json({
            model: 'gemini-3.1-flash-lite',
            latencyMs: Date.now() - startMs,
            translatedTitle: `[${targetLanguage}] ${article.title}`,
            bullets: [
              `Executive summary prepared in ${targetLanguage} for: ${article.subtitle}`,
              `Category: ${article.categoryName} · Author: ${article.authorName}`,
            ],
            whyItMatters: `Configure GEMINI_API_KEY in Secrets to enable live neural translation into ${targetLanguage}.`,
          });
          return;
        }
        res.json({
          model: 'gemini-3.1-flash-lite',
          latencyMs: Date.now() - startMs,
          bullets: [
            article.subtitle.replace('EDITORIAL DEMO SAMPLE — ', ''),
            `Reported by ${article.authorName} (${article.authorRole}) in the ${article.categoryName} desk.`,
            `Key focus areas: ${article.tags.filter((t) => t !== 'Demo Sample').join(', ')}.`,
          ],
          whyItMatters:
            'This development signals a structural shift in how international institutions coordinate technical and regulatory standards.',
        });
        return;
      }

      if (mode === 'translate') {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `Translate the headline and provide a 3-bullet executive summary of this WORLDPULSE article in ${targetLanguage}.
Headline: ${article.title}
Subtitle: ${article.subtitle}
Body: ${plainBody.slice(0, 2500)}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                translatedTitle: { type: Type.STRING },
                bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                whyItMatters: { type: Type.STRING },
              },
              required: ['translatedTitle', 'bullets', 'whyItMatters'],
            },
          },
        });
        const parsed = JSON.parse(response.text || '{}');
        res.json({
          model: 'gemini-3.1-flash-lite',
          latencyMs: Date.now() - startMs,
          ...parsed,
        });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `You are an international news editor at WORLDPULSE ("The world. In focus.").
Provide a low-latency 3-bullet executive summary and a 1-sentence "Why It Matters Globally" analysis for this article:
Headline: ${article.title}
Subtitle: ${article.subtitle}
Body: ${plainBody.slice(0, 3000)}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bullets: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              whyItMatters: { type: Type.STRING },
            },
            required: ['bullets', 'whyItMatters'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        model: 'gemini-3.1-flash-lite',
        latencyMs: Date.now() - startMs,
        bullets: parsed.bullets || [],
        whyItMatters: parsed.whyItMatters || '',
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate low-latency briefing.',
      });
    }
  });

  // 2. Admin AI Editorial Assistant (Section 42 & 43: Drafts ALWAYS require human review before publication)
  app.post('/api/ai/editorial-assist', requireAdmin, async (req: Request, res: Response) => {
    const { task, topic, title, body, category } = req.body;
    const startMs = Date.now();

    try {
      const ai = getGeminiClient();
      if (!ai) {
        // Structured fallback when GEMINI_API_KEY is not yet configured
        res.json({
          model: 'gemini-3.1-flash-lite',
          latencyMs: Date.now() - startMs,
          humanReviewRequired: true,
          suggestedTitle: title || `Global Perspective: ${topic || 'Emerging International Policy Shift'}`,
          suggestedSubtitle:
            'AI-Assisted Editorial Draft — Requires mandatory human editor verification and fact-checking prior to publication.',
          suggestedBody: `<p><em>[AI DRAFT — FOR EDITORIAL REVIEW ONLY]</em></p><p>This structured draft examines ${
            topic || title || 'the selected global topic'
          }. Before publishing on WORLDPULSE, an authorized editor must verify all primary sources, timestamps, and institutional attributions.</p><h2>Key Global Developments</h2><p>Initial analysis indicates significant cross-sector implications across regulatory frameworks and international markets.</p>`,
          suggestedTags: ['Global Affairs', 'Analysis', 'Editorial Review'],
          seoTitle: `${title || topic || 'Global Analysis'} | WORLDPULSE`,
          seoDescription: `In-depth WORLDPULSE editorial analysis on ${topic || title || 'global developments'}.`,
          headlines: [
            `${topic || title || 'The New Global Framework'}: What International Policymakers Are Debating`,
            `Inside the Shift Toward Sovereign Resilience in ${category || 'Global Markets'}`,
            `Why ${topic || title || 'Emerging Standards'} Could Reshape Cross-Border Cooperation`,
          ],
          socialCaptions: {
            x: `NEW on WORLDPULSE: ${title || topic} — The world. In focus. #WorldPulse`,
            linkedin: `Our latest editorial analysis examines the structural forces behind ${title || topic}. Read the full report on WORLDPULSE.`,
          },
        });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `You are the Senior Editorial Assistant at WORLDPULSE ("The world. In focus."), a serious international digital publication.
Task requested by human editor: "${task}"
Topic / Source Notes: "${topic || ''}"
Current Headline: "${title || ''}"
Category: "${category || 'world'}"
Current Body Excerpt: "${String(body || '').replace(/<[^>]+>/g, ' ').slice(0, 2000)}"

IMPORTANT EDITORIAL RULE: Never invent fake breaking news claims. Frame drafts analytically and clearly note where primary source verification is needed.
Return a JSON object containing:
- suggestedTitle (string)
- suggestedSubtitle (string)
- suggestedBody (HTML string using <p>, <h2>, <blockquote>, <ul>, <li>)
- suggestedTags (array of up to 5 strings)
- seoTitle (string, 40-60 chars)
- seoDescription (string, 120-155 chars)
- headlines (array of 3 alternative editorial headlines)
- socialCaptions (object with x and linkedin strings)`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedTitle: { type: Type.STRING },
              suggestedSubtitle: { type: Type.STRING },
              suggestedBody: { type: Type.STRING },
              suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
              seoTitle: { type: Type.STRING },
              seoDescription: { type: Type.STRING },
              headlines: { type: Type.ARRAY, items: { type: Type.STRING } },
              socialCaptions: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.STRING },
                  linkedin: { type: Type.STRING },
                },
                required: ['x', 'linkedin'],
              },
            },
            required: [
              'suggestedTitle',
              'suggestedSubtitle',
              'suggestedBody',
              'suggestedTags',
              'seoTitle',
              'seoDescription',
              'headlines',
              'socialCaptions',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        model: 'gemini-3.1-flash-lite',
        latencyMs: Date.now() - startMs,
        humanReviewRequired: true,
        ...parsed,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'AI editorial assistant failed.',
      });
    }
  });

  // ============================================================================
  // PROTECTED ADMIN ROUTES (/api/admin/*)
  // ============================================================================

  app.get('/api/admin/overview', requireAdmin, (_req: Request, res: Response) => {
    promoteScheduledArticles();
    res.json({
      articles: db.articles,
      categories: [...db.categories].sort((a, b) => a.order - b.order),
      authors: db.authors,
      media: db.media,
      ads: db.ads,
      comments: db.comments,
      breakingNews: db.breakingNews,
      siteSettings: db.siteSettings,
      analytics: db.analytics,
      newsletterSubscribers: db.newsletterSubscribers,
    });
  });

  // Create or Update Article
  app.post('/api/admin/articles', requireAdmin, (req: Request, res: Response) => {
    const payload = req.body as Partial<Article>;
    const title = sanitizeText(payload.title, 220);
    if (!title) {
      res.status(400).json({ error: 'Article headline is required.' });
      return;
    }

    const slug =
      sanitizeText(payload.slug, 160)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-|-$/g, '') ||
      `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 70)}-${Date.now().toString().slice(-4)}`;

    const categoryObj = db.categories.find((c) => c.slug === payload.category) || db.categories[0];
    const authorObj = db.authors.find((a) => a.id === payload.authorId) || db.authors[0];

    const now = new Date().toISOString();
    const isLead = Boolean(payload.isLead);
    if (isLead) {
      db.articles.forEach((a) => {
        a.isLead = false;
      });
    }

    const plainWords = String(payload.body || '')
      .replace(/<[^>]+>/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    const calculatedReadTime = Math.max(1, Math.round(plainWords / 200));

    const newArticle: Article = {
      id: payload.id || `art-${Date.now()}`,
      title,
      subtitle: sanitizeText(payload.subtitle, 400),
      slug,
      category: categoryObj.slug,
      categoryName: categoryObj.name,
      tags: Array.isArray(payload.tags) ? payload.tags.map((t) => sanitizeText(t, 40)).filter(Boolean) : [],
      authorId: authorObj.id,
      authorName: authorObj.name,
      authorRole: authorObj.role,
      featuredImage: payload.featuredImage || db.media[0]?.url || '',
      imageCaption: sanitizeText(payload.imageCaption, 300),
      body: payload.body || '<p></p>',
      status: payload.status || 'draft',
      publishedAt: payload.publishedAt || now,
      updatedAt: now,
      scheduledFor: payload.scheduledFor,
      readingTime: Number(payload.readingTime) || calculatedReadTime,
      views: Number(payload.views) || 0,
      isLead,
      isTrending: Boolean(payload.isTrending),
      isDeveloping: Boolean(payload.isDeveloping),
      developingUpdates: Array.isArray(payload.developingUpdates) ? payload.developingUpdates : [],
      isDemo: Boolean(payload.isDemo),
      seo: {
        title: sanitizeText(payload.seo?.title || `${title} | WORLDPULSE`, 120),
        description: sanitizeText(payload.seo?.description || payload.subtitle || title, 200),
        canonicalUrl: sanitizeText(payload.seo?.canonicalUrl || `/${categoryObj.slug}/${slug}`, 200),
        ogTitle: sanitizeText(payload.seo?.ogTitle || title, 120),
        ogDescription: sanitizeText(payload.seo?.ogDescription || payload.subtitle || title, 200),
        ogImage: payload.seo?.ogImage || payload.featuredImage || '',
      },
    };

    const existingIdx = db.articles.findIndex((a) => a.id === newArticle.id);
    if (existingIdx >= 0) {
      db.articles[existingIdx] = newArticle;
    } else {
      db.articles.unshift(newArticle);
    }

    saveDatabase(db);
    res.json({ article: newArticle });
  });

  // Delete Article
  app.delete('/api/admin/articles/:id', requireAdmin, (req: Request, res: Response) => {
    const idx = db.articles.findIndex((a) => a.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Article not found.' });
      return;
    }
    db.articles.splice(idx, 1);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Remove or Restore Demo Articles (Section 39)
  app.post('/api/admin/demo-content', requireAdmin, (req: Request, res: Response) => {
    const { action } = req.body;
    if (action === 'remove') {
      db.articles = db.articles.filter((a) => !a.isDemo);
      db.breakingNews.enabled = false;
      saveDatabase(db);
      res.json({ articles: db.articles, breakingNews: db.breakingNews, message: 'All demo articles removed.' });
      return;
    }
    if (action === 'restore') {
      const nonDemo = db.articles.filter((a) => !a.isDemo);
      db.articles = [... nonDemo, ...INITIAL_ARTICLES];
      db.breakingNews = INITIAL_BREAKING_NEWS;
      saveDatabase(db);
      res.json({ articles: db.articles, breakingNews: db.breakingNews, message: 'Demo articles restored.' });
      return;
    }
    res.status(400).json({ error: 'Invalid action.' });
  });

  // Update Breaking News
  app.put('/api/admin/breaking-news', requireAdmin, (req: Request, res: Response) => {
    db.breakingNews = {
      enabled: Boolean(req.body.enabled),
      label: sanitizeText(req.body.label || 'BREAKING', 40),
      headline: sanitizeText(req.body.headline, 240),
      articleSlug: sanitizeText(req.body.articleSlug, 160),
      categorySlug: sanitizeText(req.body.categorySlug || 'world', 60),
      startTime: req.body.startTime || new Date().toISOString(),
      endTime: req.body.endTime || '2027-12-31T23:59:59Z',
    };
    saveDatabase(db);
    res.json({ breakingNews: db.breakingNews });
  });

  // Manage Categories
  app.post('/api/admin/categories', requireAdmin, (req: Request, res: Response) => {
    const { id, name, slug, description, showInNav, showOnHomepage, order } = req.body;
    const cleanName = sanitizeText(name, 60);
    if (!cleanName) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const cleanSlug =
      sanitizeText(slug || cleanName, 60)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-') || `cat-${Date.now()}`;

    const catObj: Category = {
      id: id || `cat-${Date.now()}`,
      name: cleanName,
      slug: cleanSlug,
      description: sanitizeText(description, 240),
      showInNav: Boolean(showInNav),
      showOnHomepage: Boolean(showOnHomepage),
      order: Number(order) || db.categories.length + 1,
    };

    const existingIdx = db.categories.findIndex((c) => c.id === catObj.id);
    if (existingIdx >= 0) {
      db.categories[existingIdx] = catObj;
    } else {
      db.categories.push(catObj);
    }
    saveDatabase(db);
    res.json({ categories: [...db.categories].sort((a, b) => a.order - b.order) });
  });

  app.delete('/api/admin/categories/:id', requireAdmin, (req: Request, res: Response) => {
    db.categories = db.categories.filter((c) => c.id !== req.params.id);
    saveDatabase(db);
    res.json({ categories: db.categories });
  });

  // Manage Media Library
  app.post('/api/admin/media', requireAdmin, (req: Request, res: Response) => {
    const { title, url, altText, caption, mimeType, dimensions, sizeKb } = req.body;
    if (!url) {
      res.status(400).json({ error: 'Media URL or encoded image data is required.' });
      return;
    }
    const newMedia: MediaItem = {
      id: `media-${Date.now()}`,
      title: sanitizeText(title || 'Uploaded Editorial Image', 120),
      url: String(url),
      altText: sanitizeText(altText || title || 'Editorial photograph', 180),
      caption: sanitizeText(caption || '', 240),
      mimeType: sanitizeText(mimeType || 'image/jpeg', 40),
      dimensions: sanitizeText(dimensions || '1200 × 900', 40),
      uploadedAt: new Date().toISOString(),
      sizeKb: Number(sizeKb) || 240,
    };
    db.media.unshift(newMedia);
    saveDatabase(db);
    res.json({ media: db.media, item: newMedia });
  });

  app.delete('/api/admin/media/:id', requireAdmin, (req: Request, res: Response) => {
    db.media = db.media.filter((m) => m.id !== req.params.id);
    saveDatabase(db);
    res.json({ media: db.media });
  });

  // Manage Authors
  app.post('/api/admin/authors', requireAdmin, (req: Request, res: Response) => {
    const { id, name, slug, role, location, bio, photo, email, social } = req.body;
    const cleanName = sanitizeText(name, 80);
    if (!cleanName) {
      res.status(400).json({ error: 'Author name is required.' });
      return;
    }
    const authorObj: Author = {
      id: id || `author-${Date.now()}`,
      name: cleanName,
      slug:
        sanitizeText(slug || cleanName, 80)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-') || `author-${Date.now()}`,
      role: sanitizeText(role || 'Correspondent', 100),
      location: sanitizeText(location || 'International Desk', 80),
      bio: sanitizeText(bio, 600),
      photo: photo || db.authors[0]?.photo || '',
      email: sanitizeText(email, 120),
      social: {
        x: sanitizeText(social?.x, 160),
        linkedin: sanitizeText(social?.linkedin, 160),
        website: sanitizeText(social?.website, 160),
      },
    };
    const idx = db.authors.findIndex((a) => a.id === authorObj.id);
    if (idx >= 0) {
      db.authors[idx] = authorObj;
    } else {
      db.authors.push(authorObj);
    }
    saveDatabase(db);
    res.json({ authors: db.authors });
  });

  // Manage Comments Moderation
  app.put('/api/admin/comments/:id', requireAdmin, (req: Request, res: Response) => {
    const comment = db.comments.find((c) => c.id === req.params.id);
    if (!comment) {
      res.status(404).json({ error: 'Comment not found.' });
      return;
    }
    if (['approved', 'pending', 'rejected', 'spam'].includes(req.body.status)) {
      comment.status = req.body.status;
    }
    saveDatabase(db);
    res.json({ comments: db.comments });
  });

  app.delete('/api/admin/comments/:id', requireAdmin, (req: Request, res: Response) => {
    db.comments = db.comments.filter((c) => c.id !== req.params.id);
    saveDatabase(db);
    res.json({ comments: db.comments });
  });

  // Manage Advertisement Placements
  app.put('/api/admin/ads/:id', requireAdmin, (req: Request, res: Response) => {
    const adIdx = db.ads.findIndex((a) => a.id === req.params.id);
    if (adIdx === -1) {
      res.status(404).json({ error: 'Ad slot not found.' });
      return;
    }
    db.ads[adIdx] = {
      ...db.ads[adIdx],
      enabled: Boolean(req.body.enabled),
      network: req.body.network || db.ads[adIdx].network,
      publisherId: sanitizeText(req.body.publisherId, 80),
      adSlotId: sanitizeText(req.body.adSlotId, 80),
      format: req.body.format || db.ads[adIdx].format,
      customCode: String(req.body.customCode || ''),
      sponsorLabel: sanitizeText(req.body.sponsorLabel, 60),
      headline: sanitizeText(req.body.headline, 180),
      ctaText: sanitizeText(req.body.ctaText, 40),
      ctaUrl: sanitizeText(req.body.ctaUrl, 200),
    };
    saveDatabase(db);
    res.json({ ads: db.ads });
  });

  // Manage Site & SEO Settings
  app.put('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
    db.siteSettings = {
      ...db.siteSettings,
      ...req.body,
    };
    saveDatabase(db);
    res.json({ siteSettings: db.siteSettings });
  });

  // Vite middleware in development, static dist in production
  const distPath = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WORLDPULSE server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

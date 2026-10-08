import React, { useState, useEffect, useMemo } from 'react';
import {
  Search as SearchIcon,
  Sparkles,
  Bookmark,
  X,
  ArrowRight,
  WifiOff,
  CheckCircle2,
  Shield,
  Tag,
} from 'lucide-react';
import {
  AdPlacement,
  Article,
  ArticleComment,
  Author,
  BreakingNewsConfig,
  Category,
  SiteSettings,
  UserProfile,
} from './types/editorial';
import {
  INITIAL_ADS,
  INITIAL_ARTICLES,
  INITIAL_AUTHORS,
  INITIAL_BREAKING_NEWS,
  INITIAL_CATEGORIES,
  INITIAL_COMMENTS,
  INITIAL_SITE_SETTINGS,
} from './data/seedData';
import { Header } from './components/Header';
import { BreakingNews } from './components/BreakingNews';
import { ArticleCard, formatEditorialDate } from './components/ArticleCard';
import { AdvertisementSlot } from './components/AdvertisementSlot';
import { NewsletterSignup } from './components/NewsletterSignup';
import { Footer } from './components/Footer';
import { CookieConsent, CookiePreferences } from './components/CookieConsent';
import { ArticleDetailView } from './components/ArticleDetailView';
import { AdminDashboard } from './components/AdminDashboard';
import {
  AuthorProfileView,
  ReaderProfileView,
  StaticEditorialPages,
} from './components/StaticEditorialPages';
import { SeoHead } from './components/SeoHead';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  syncFirebaseUserWithFirestore,
  updateFirestoreUserProfile,
  seedInitialArticlesToFirestoreIfNeeded,
  handleFirestoreError,
  OperationType,
  collection,
  query,
  where,
  onSnapshot,
} from './firebase';

const OFFLINE_VAULT_KEY = 'worldpulse_offline_vault_v1';
const AUTH_TOKEN_KEY = 'worldpulse_auth_token_v1';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  // Core Publication State (Seeded immediately for zero-CLS, then hydrated from server)
  const [articles, setArticles] = useState<Article[]>(INITIAL_ARTICLES);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [authors, setAuthors] = useState<Author[]>(INITIAL_AUTHORS);
  const [breakingNews, setBreakingNews] = useState<BreakingNewsConfig>(INITIAL_BREAKING_NEWS);
  const [ads, setAds] = useState<AdPlacement[]>(INITIAL_ADS);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);
  const [comments, setComments] = useState<ArticleComment[]>(INITIAL_COMMENTS);

  // Auth & User Profile State
  const [authToken, setAuthToken] = useState<string>(
    () => localStorage.getItem(AUTH_TOKEN_KEY) || ''
  );
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Offline Reading Mode & Vault State
  const [offlineArticles, setOfflineArticles] = useState<Article[]>(() => {
    try {
      const raw = localStorage.getItem(OFFLINE_VAULT_KEY);
      return raw ? JSON.parse(raw) : [INITIAL_ARTICLES[0]];
    } catch {
      return [INITIAL_ARTICLES[0]];
    }
  });
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineDrawerOpen, setOfflineDrawerOpen] = useState(false);

  // Search Modal & Query State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Cookie Consent State
  const [forceCookieModal, setForceCookieModal] = useState(false);
  const [cookiePrefs, setCookiePrefs] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    advertising: true,
  });

  // Personalized "My Pulse" Homepage Feed & Tag Filter State
  const [selectedPulseTopics, setSelectedPulseTopics] = useState<string[]>([
    'world',
    'technology',
    'business',
    'environment',
  ]);
  const [selectedArchiveTag, setSelectedArchiveTag] = useState<string>('all');
  const [pulseDigest, setPulseDigest] = useState<{
    bullets: string[];
    synthesis: string;
    latencyMs?: number;
  } | null>(null);
  const [pulseDigestLoading, setPulseDigestLoading] = useState(false);

  // Quick Low-Latency AI Brief Modal (gemini-3.1-flash-lite)
  const [quickBriefArticle, setQuickBriefArticle] = useState<Article | null>(null);
  const [quickBriefLoading, setQuickBriefLoading] = useState(false);
  const [quickBriefResult, setQuickBriefResult] = useState<{
    bullets: string[];
    whyItMatters: string;
    latencyMs?: number;
  } | null>(null);

  // Category Pagination State
  const [categoryPageIdx, setCategoryPageIdx] = useState(1);

  // Admin Preview Draft Override
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);

  const fetchBootstrapData = async (tokenOverride?: string) => {
    const activeToken = tokenOverride !== undefined ? tokenOverride : authToken;
    try {
      const res = await fetch('/api/bootstrap', {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.articles)) setArticles(data.articles);
      if (Array.isArray(data.categories)) setCategories(data.categories);
      if (Array.isArray(data.authors)) setAuthors(data.authors);
      if (data.breakingNews) setBreakingNews(data.breakingNews);
      if (Array.isArray(data.ads)) setAds(data.ads);
      if (data.siteSettings) setSiteSettings(data.siteSettings);
      if (Array.isArray(data.comments)) setComments(data.comments);
      if (data.user) {
        setUser(data.user);
        if (Array.isArray(data.user.interests) && data.user.interests.length > 0) {
          setSelectedPulseTopics(data.user.interests);
        }
      }
    } catch {
      // If network is unreachable, automatically enable Offline Reader Mode
      setIsOfflineMode(true);
    }
  };

  useEffect(() => {
    fetchBootstrapData();
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Firebase Auth State Listener & Firestore User Profile Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const syncedProfile = await syncFirebaseUserWithFirestore(fbUser);
          setUser(syncedProfile);
          if (syncedProfile.interests.length > 0) {
            setSelectedPulseTopics(syncedProfile.interests);
          }
          // Ensure backend Express admin session is also hydrated for this role
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quickRole: syncedProfile.role === 'admin' ? 'admin' : 'reader',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              localStorage.setItem(AUTH_TOKEN_KEY, data.token);
              setAuthToken(data.token);
            }
          }
        } catch {
          // Handled by Firestore error logger
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-Time Articles & Comments Synchronization (Once Auth is Ready)
  useEffect(() => {
    if (!isAuthReady) return;

    const articlesQuery = query(
      collection(db, 'articles'),
      where('status', '==', 'published')
    );
    const unsubArticles = onSnapshot(
      articlesQuery,
      (snapshot) => {
        if (snapshot.empty) {
          if (auth.currentUser && user?.role === 'admin') {
            seedInitialArticlesToFirestoreIfNeeded(
              INITIAL_ARTICLES.filter((a) => a.status === 'published')
            ).catch(() => {});
          }
          return;
        }
        const firestoreArticles: Article[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          firestoreArticles.push({
            id: d.id,
            title: d.title,
            subtitle: d.subtitle || '',
            slug: d.slug,
            category: d.category,
            categoryName: d.categoryName,
            tags: Array.isArray(d.tags) ? d.tags : [],
            authorId: d.authorId,
            authorName: d.authorName,
            authorRole: d.authorRole || 'Correspondent',
            featuredImage: d.featuredImage || '',
            imageCaption: d.imageCaption || '',
            body: d.body,
            status: d.status,
            publishedAt: d.publishedAt,
            updatedAt: d.publishedAt,
            readingTime: Number(d.readingTime) || 5,
            views: Number(d.views) || 0,
            isLead: Boolean(d.isLead),
            isTrending: Boolean(d.isTrending),
            isDeveloping: Boolean(d.isDeveloping),
            isDemo: Boolean(d.isDemo),
            seo: {
              title: d.title,
              description: d.subtitle || '',
              canonicalUrl: `https://worldpulse.press/${d.category}/${d.slug}`,
              ogTitle: d.title,
              ogDescription: d.subtitle || '',
              ogImage: d.featuredImage || '',
            },
          });
        });
        setArticles((prev) => {
          const map = new Map<string, Article>();
          prev.forEach((a) => map.set(a.id, a));
          firestoreArticles.forEach((a) => map.set(a.id, a));
          return Array.from(map.values());
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'articles');
      }
    );

    const commentsQuery = query(
      collection(db, 'comments'),
      where('status', '==', 'approved')
    );
    const unsubComments = onSnapshot(
      commentsQuery,
      (snapshot) => {
        if (snapshot.empty) return;
        const firestoreComments: ArticleComment[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          firestoreComments.push({
            id: d.id,
            articleId: d.articleId,
            articleTitle: d.articleTitle,
            authorName: d.authorName,
            authorEmail: '',
            content: d.content,
            status: d.status,
            createdAt:
              d.createdAt && typeof d.createdAt.toDate === 'function'
                ? d.createdAt.toDate().toISOString()
                : new Date().toISOString(),
          });
        });
        setComments((prev) => {
          const map = new Map<string, ArticleComment>();
          prev.forEach((c) => map.set(c.id, c));
          firestoreComments.forEach((c) => map.set(c.id, c));
          return Array.from(map.values());
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'comments');
      }
    );

    return () => {
      unsubArticles();
      unsubComments();
    };
  }, [isAuthReady, user?.role]);

  const navigate = (path: string) => {
    setPreviewArticle(null);
    setCategoryPageIdx(1);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Offline Vault & Firestore Saved Articles Persistence
  const toggleSaveOffline = (article: Article) => {
    setOfflineArticles((prev) => {
      const exists = prev.some((a) => a.id === article.id);
      const next = exists ? prev.filter((a) => a.id !== article.id) : [article, ...prev];
      try {
        localStorage.setItem(OFFLINE_VAULT_KEY, JSON.stringify(next));
      } catch {
        // storage quota fallback
      }
      if (auth.currentUser) {
        updateFirestoreUserProfile(auth.currentUser.uid, {
          savedArticleIds: next.map((a) => a.id),
        }).catch(() => {});
      }
      return next;
    });
  };

  const saveEntireEditionOffline = () => {
    const published = articles.filter((a) => a.status === 'published');
    setOfflineArticles(published);
    try {
      localStorage.setItem(OFFLINE_VAULT_KEY, JSON.stringify(published));
    } catch {
      // ignore
    }
  };

  // Low-Latency Flash Brief Modal Handler (gemini-3.1-flash-lite)
  const handleOpenQuickBrief = async (article: Article) => {
    setQuickBriefArticle(article);
    setQuickBriefResult(null);
    setQuickBriefLoading(true);
    try {
      const res = await fetch('/api/ai/flash-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id, mode: 'brief' }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuickBriefResult(data);
      }
    } finally {
      setQuickBriefLoading(false);
    }
  };

  // Personalized Digest Handler (gemini-3.1-flash-lite)
  const handleGeneratePulseDigest = async () => {
    setPulseDigestLoading(true);
    try {
      const res = await fetch('/api/ai/flash-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'personalized_digest',
          customTopics: selectedPulseTopics,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPulseDigest(data);
      }
    } finally {
      setPulseDigestLoading(false);
    }
  };

  // Google Sign-In with Firebase Auth & Firestore Profile Sync
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const syncedProfile = await syncFirebaseUserWithFirestore(result.user);
      setUser(syncedProfile);
      setAuthModalOpen(false);
      if (syncedProfile.role === 'admin') {
        navigate('/admin');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Authentication Handlers
  const handleLoginSubmit = async (e?: React.FormEvent, quickRole?: 'admin' | 'reader') => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          quickRole ? { quickRole } : { email: authEmail, password: authPassword }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed.');
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setUser(data.user);
      setAuthModalOpen(false);
      await fetchBootstrapData(data.token);
      if (quickRole === 'admin' || data.user.role === 'admin') {
        navigate('/admin');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authName,
          email: authEmail,
          password: authPassword,
          interests: selectedPulseTopics,
          newsletterSubscribed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setUser(data.user);
      setAuthModalOpen(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch {
      // ignore
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken('');
    setUser(null);
    navigate('/');
  };

  // Active Articles Pool (Offline Vault when Offline Reader Mode is active, otherwise Published)
  const publishedArticles = useMemo(() => {
    if (isOfflineMode) return offlineArticles;
    return articles
      .filter((a) => a.status === 'published')
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [articles, isOfflineMode, offlineArticles]);

  const leadArticle = useMemo(
    () => publishedArticles.find((a) => a.isLead) || publishedArticles[0] || null,
    [publishedArticles]
  );

  const secondaryArticles = useMemo(
    () => publishedArticles.filter((a) => a.id !== leadArticle?.id).slice(0, 4),
    [publishedArticles, leadArticle]
  );

  const trendingArticles = useMemo(
    () => publishedArticles.filter((a) => a.isTrending),
    [publishedArticles]
  );

  const mostReadArticles = useMemo(
    () => [...publishedArticles].sort((a, b) => b.views - a.views).slice(0, 5),
    [publishedArticles]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    publishedArticles.forEach((a) => {
      a.tags.forEach((t) => {
        if (t !== 'Demo Sample') tagSet.add(t);
      });
    });
    return Array.from(tagSet);
  }, [publishedArticles]);

  // Search Filtering (Section 19)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return publishedArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.categoryName.toLowerCase().includes(q) ||
        a.authorName.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [publishedArticles, searchQuery]);

  // Route Resolution
  const cleanPath = currentPath.replace(/\/+$/, '') || '/';
  const segments = cleanPath.split('/').filter(Boolean);

  // Admin Route (/admin) — Protected by Real Authentication & Authorization (Sections 13 & 14)
  if (segments[0] === 'admin') {
    if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
      return (
        <div className="min-h-screen bg-[#F7F5F2] flex flex-col justify-center items-center p-4">
          <SeoHead
            title="Editorial Admin Authentication"
            siteSettings={siteSettings}
            noIndex={true}
          />
          <div className="bg-white border-t-4 border-[#6E1723] border-l border-r border-b border-[#E7E5E2] max-w-md w-full p-8 space-y-6">
            <div className="flex items-center gap-2.5 text-[#6E1723]">
              <Shield className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">
                RESTRICTED EDITORIAL SYSTEM
              </span>
            </div>
            <div>
              <h1 className="font-editorial text-3xl font-semibold text-[#171717]">
                WORLDPULSE Admin Console
              </h1>
              <p className="text-sm text-[#6B6B6B] mt-1">
                Sign in with an authorized editor or administrator account to manage articles,
                breaking news, categories, media, and advertisements.
              </p>
            </div>

            {/* Google Sign-In with Firebase Auth & Instant Evaluation Access */}
            <div className="p-4 bg-[#F7F5F2] border border-[#E7E5E2] space-y-2.5">
              <button
                type="button"
                disabled={authLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 text-xs font-semibold uppercase tracking-wider bg-[#171717] text-white hover:bg-[#6E1723] transition-colors cursor-pointer"
              >
                {authLoading ? 'Connecting...' : 'Sign In with Google (Firebase Auth)'}
              </button>
              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleLoginSubmit(undefined, 'admin')}
                className="w-full py-2.5 px-4 text-xs font-semibold uppercase tracking-wider bg-[#6E1723] text-white hover:bg-[#4A0F18] transition-colors cursor-pointer"
              >
                {authLoading ? 'Authenticating...' : 'Sign In as Chief Editor (Admin)'}
              </button>
            </div>

            <form onSubmit={(e) => handleLoginSubmit(e)} className="space-y-4 pt-2 border-t border-[#E7E5E2]">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="admin@worldpulse.press"
                  className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                />
              </div>
              {authError && <p className="text-xs font-semibold text-[#8C2634]">{authError}</p>}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-xs font-semibold text-[#6B6B6B] hover:text-[#171717] cursor-pointer"
                >
                  ← Return to Public Site
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#171717] text-white hover:bg-[#6E1723] cursor-pointer"
                >
                  Verify & Enter
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <>
        <SeoHead title="Admin Console" siteSettings={siteSettings} noIndex={true} />
        <AdminDashboard
          user={user}
          authToken={authToken}
          onLogout={handleLogout}
          onNavigatePublic={navigate}
          onRefreshPublicData={() => fetchBootstrapData()}
          onPreviewArticle={(draft) => {
            setPreviewArticle(draft);
            setCurrentPath(`/${draft.category}/${draft.slug}`);
          }}
        />
      </>
    );
  }

  // Check if viewing an Article Detail Page (/:category/:slug) or Admin Preview
  const matchedArticle =
    previewArticle ||
    (segments.length === 2 && segments[0] !== 'author' && segments[0] !== 'tag'
      ? articles.find((a) => a.slug === segments[1] || a.id === segments[1])
      : null);

  // Check if viewing an Author Page (/author/:slug)
  const matchedAuthor =
    segments[0] === 'author' && segments[1]
      ? authors.find((a) => a.slug === segments[1] || a.id === segments[1])
      : null;

  // Check if viewing a Tag Archive Page (/tag/:tag)
  const matchedTag =
    segments[0] === 'tag' && segments[1] ? decodeURIComponent(segments[1]) : null;

  // Check if viewing a Category Page (/:categorySlug)
  const matchedCategory =
    segments.length === 1
      ? categories.find((c) => c.slug === segments[0])
      : null;

  const activeAds = cookiePrefs.advertising
    ? ads
    : ads.filter((a) => a.network === 'house');

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F2] text-[#171717]">
      <SeoHead
        title={
          matchedArticle
            ? matchedArticle.title
            : matchedCategory
            ? `${matchedCategory.name} News & Global Analysis`
            : matchedAuthor
            ? `${matchedAuthor.name} — Correspondent Profile`
            : matchedTag
            ? `#${matchedTag} Topic Archive`
            : segments[0] === 'latest'
            ? 'Latest Global Dispatches'
            : segments[0] === 'trending'
            ? 'Trending Stories Worldwide'
            : undefined
        }
        description={
          matchedArticle
            ? matchedArticle.subtitle
            : matchedCategory
            ? matchedCategory.description
            : undefined
        }
        canonicalPath={cleanPath}
        article={matchedArticle}
        siteSettings={siteSettings}
      />

      {/* Sticky 3-Zone Top Bar Header */}
      <Header
        categories={categories}
        activePath={cleanPath}
        onNavigate={navigate}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenOfflineVault={() => setOfflineDrawerOpen(true)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        offlineCount={offlineArticles.length}
        user={user}
      />

      {/* Editorial Masthead & Configurable Breaking News Strip */}
      <BreakingNews
        breakingNews={breakingNews}
        siteSettings={siteSettings}
        isOfflineMode={isOfflineMode}
        onToggleOfflineMode={() => setIsOfflineMode((prev) => !prev)}
        onNavigate={navigate}
      />

      {/* Offline Reading Mode Active Banner */}
      {isOfflineMode && (
        <div className="bg-[#171717] text-white px-4 py-2 text-xs flex items-center justify-between max-w-[1360px] mx-auto w-full">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-[#8C2634]" />
            <span>
              <strong>Offline Reader Mode Active:</strong> Displaying {offlineArticles.length}{' '}
              dispatches stored in your device’s Offline Vault for zero-bandwidth reading.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOfflineMode(false)}
            className="underline font-semibold cursor-pointer"
          >
            Reconnect Live Feed
          </button>
        </div>
      )}

      {/* Admin Draft Preview Banner */}
      {previewArticle && (
        <div className="bg-[#6E1723] text-white px-4 py-2.5 text-xs flex items-center justify-between">
          <span className="font-semibold uppercase tracking-wider">
            Editorial Preview Mode · Status: {previewArticle.status.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="px-3 py-1 bg-white text-[#6E1723] font-bold cursor-pointer"
          >
            Return to Admin Editor
          </button>
        </div>
      )}

      <div className="max-w-[1360px] mx-auto w-full px-4 sm:px-6">
        <AdvertisementSlot slotKey="header" ads={activeAds} onNavigate={navigate} />
      </div>

      {/* =====================================================================
          MAIN ROUTE VIEWPORT
         ===================================================================== */}
      <main className="flex-1">
        {matchedArticle ? (
          <ArticleDetailView
            article={matchedArticle}
            allArticles={publishedArticles}
            authors={authors}
            ads={activeAds}
            comments={comments}
            siteSettings={siteSettings}
            isSavedOffline={offlineArticles.some((a) => a.id === matchedArticle.id)}
            onToggleOffline={toggleSaveOffline}
            onNavigate={navigate}
            onCommentSubmitted={(newCmt) => setComments((prev) => [newCmt, ...prev])}
          />
        ) : matchedAuthor ? (
          <AuthorProfileView
            author={matchedAuthor}
            articles={publishedArticles}
            onNavigate={navigate}
            onToggleOffline={toggleSaveOffline}
          />
        ) : matchedCategory ? (
          /* CATEGORY ARCHIVE PAGE (Section 20) */
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-10">
            <div className="border-b-2 border-[#171717] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                  WORLDPULSE DESK
                </span>
                <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#171717] mt-1">
                  {matchedCategory.name}
                </h1>
                <p className="text-base text-[#6B6B6B] mt-2 max-w-2xl">
                  {matchedCategory.description}
                </p>
              </div>
              <span className="font-mono-tabular text-xs text-[#6B6B6B]">
                {
                  publishedArticles.filter((a) => a.category === matchedCategory.slug)
                    .length
                }{' '}
                Dispatches Available
              </span>
            </div>

            <AdvertisementSlot slotKey="category_page" ads={activeAds} onNavigate={navigate} />

            {(() => {
              const catArticles = publishedArticles.filter(
                (a) => a.category === matchedCategory.slug
              );
              if (catArticles.length === 0) {
                return (
                  <div className="bg-white border border-[#E7E5E2] p-12 text-center space-y-3">
                    <h2 className="font-editorial text-2xl font-semibold">
                      No published dispatches in {matchedCategory.name} yet.
                    </h2>
                    <p className="text-sm text-[#6B6B6B]">
                      Explore our other global sections or check back soon for new reporting.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="px-4 py-2 text-xs font-semibold bg-[#6E1723] text-white cursor-pointer"
                    >
                      Back to Homepage
                    </button>
                  </div>
                );
              }

              const featuredCatStory = catArticles[0];
              const pageSize = 6;
              const remainingCatStories = catArticles.slice(1);
              const paginated = remainingCatStories.slice(
                (categoryPageIdx - 1) * pageSize,
                categoryPageIdx * pageSize
              );
              const totalPages = Math.max(1, Math.ceil(remainingCatStories.length / pageSize));

              return (
                <div className="space-y-12">
                  {/* Featured Category Lead */}
                  <ArticleCard
                    article={featuredCatStory}
                    variant="lead"
                    isSavedOffline={offlineArticles.some((a) => a.id === featuredCatStory.id)}
                    onNavigate={navigate}
                    onToggleOffline={toggleSaveOffline}
                    onRequestFlashBrief={handleOpenQuickBrief}
                  />

                  {/* Secondary Category Grid */}
                  {paginated.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {paginated.map((art) => (
                        <ArticleCard
                          key={art.id}
                          article={art}
                          variant="secondary"
                          isSavedOffline={offlineArticles.some((a) => a.id === art.id)}
                          onNavigate={navigate}
                          onToggleOffline={toggleSaveOffline}
                          onRequestFlashBrief={handleOpenQuickBrief}
                        />
                      ))}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCategoryPageIdx(i + 1)}
                          className={`px-3.5 py-1.5 text-xs font-mono-tabular font-semibold cursor-pointer ${
                            categoryPageIdx === i + 1
                              ? 'bg-[#6E1723] text-white'
                              : 'bg-white border border-[#E7E5E2] text-[#171717]'
                          }`}
                        >
                          Page {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : matchedTag ? (
          /* TAG ARCHIVE DISCOVERY PAGE */
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-8">
            <div className="border-b-2 border-[#171717] pb-5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                TOPIC ARCHIVE & TAG DISCOVERY
              </span>
              <h1 className="font-editorial text-4xl font-semibold text-[#171717] mt-1">
                #{matchedTag}
              </h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {publishedArticles
                .filter((a) =>
                  a.tags.some((t) => t.toLowerCase() === matchedTag.toLowerCase())
                )
                .map((art) => (
                  <ArticleCard
                    key={art.id}
                    article={art}
                    variant="secondary"
                    isSavedOffline={offlineArticles.some((a) => a.id === art.id)}
                    onNavigate={navigate}
                    onToggleOffline={toggleSaveOffline}
                    onRequestFlashBrief={handleOpenQuickBrief}
                  />
                ))}
            </div>
          </div>
        ) : segments[0] === 'latest' ? (
          /* LATEST DISPATCHES PAGE (Section 7) */
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-10 space-y-8">
            <div className="border-b-2 border-[#171717] pb-5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                CHRONOLOGICAL WIRE
              </span>
              <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#171717] mt-1">
                Latest News & Dispatches
              </h1>
              <p className="text-base text-[#6B6B6B] mt-2">
                Recently published reporting across all international desks, newest first.
              </p>
            </div>
            <div className="bg-white border border-[#E7E5E2] px-6 divide-y divide-[#E7E5E2]">
              {publishedArticles.map((art) => (
                <ArticleCard
                  key={art.id}
                  article={art}
                  variant="latest"
                  isSavedOffline={offlineArticles.some((a) => a.id === art.id)}
                  onNavigate={navigate}
                  onToggleOffline={toggleSaveOffline}
                  onRequestFlashBrief={handleOpenQuickBrief}
                />
              ))}
            </div>
          </div>
        ) : segments[0] === 'trending' ? (
          /* TRENDING PAGE (Section 8) */
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-8">
            <div className="border-b-2 border-[#171717] pb-5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                GLOBAL MOMENTUM & ENGAGEMENT
              </span>
              <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#171717] mt-1">
                Trending Stories Worldwide
              </h1>
              <p className="text-base text-[#6B6B6B] mt-2">
                Stories attracting high global readership, recent engagement, and editorial spotlight.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(trendingArticles.length > 0 ? trendingArticles : publishedArticles).map(
                (art) => (
                  <ArticleCard
                    key={art.id}
                    article={art}
                    variant="secondary"
                    isSavedOffline={offlineArticles.some((a) => a.id === art.id)}
                    onNavigate={navigate}
                    onToggleOffline={toggleSaveOffline}
                    onRequestFlashBrief={handleOpenQuickBrief}
                  />
                )
              )}
            </div>
          </div>
        ) : segments[0] === 'search' ? (
          /* DEDICATED SEARCH PAGE (Section 19) */
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-10 space-y-8">
            <div className="bg-white border border-[#E7E5E2] p-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                ARCHIVE & FULL-TEXT SEARCH
              </span>
              <h1 className="font-editorial text-3xl font-semibold text-[#171717]">
                Search WORLDPULSE
              </h1>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search headlines, full article text, categories, tags, or correspondents..."
                  className="flex-1 px-4 py-2.5 text-sm bg-[#F7F5F2] border border-[#E7E5E2] focus:outline-none focus:border-[#6E1723]"
                />
              </div>
            </div>

            {searchQuery.trim() && (
              <div className="bg-white border border-[#E7E5E2] p-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B6B6B] mb-4">
                  Search Results ({searchResults.length})
                </h2>
                {searchResults.length === 0 ? (
                  <p className="text-sm text-[#6B6B6B] py-6">
                    No matching articles found for “{searchQuery}”. Try searching for another global
                    topic, tag, or correspondent.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E7E5E2]">
                    {searchResults.map((art) => (
                      <ArticleCard
                        key={art.id}
                        article={art}
                        variant="latest"
                        onNavigate={navigate}
                        onToggleOffline={toggleSaveOffline}
                        onRequestFlashBrief={handleOpenQuickBrief}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : segments[0] === 'profile' && user ? (
          <ReaderProfileView
            user={user}
            categories={categories}
            articles={publishedArticles}
            authToken={authToken}
            onUpdateUser={(u) => {
              setUser(u);
              setSelectedPulseTopics(u.interests);
            }}
            onLogout={handleLogout}
            onNavigate={navigate}
          />
        ) : ['about', 'contact', 'authors', 'privacy', 'terms', 'disclaimer', 'cookies'].includes(
            segments[0]
          ) ? (
          <StaticEditorialPages
            page={segments[0] as 'about'}
            siteSettings={siteSettings}
            authors={authors}
            articles={publishedArticles}
            onNavigate={navigate}
          />
        ) : cleanPath === '/' ? (
          /* =================================================================
             EDITORIAL HOMEPAGE (Sections 5, 6, 7, 8, 9, 30, 31, 40)
             ================================================================= */
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 space-y-14">
            <AdvertisementSlot slotKey="homepage_top" ads={activeAds} onNavigate={navigate} />

            {/* 1. MAIN FRONT-PAGE 3-TIER EDITORIAL GRID (Section 6) */}
            <section aria-label="Top Global Stories">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left 8 Columns: Dominant Lead Story + Secondary Features */}
                <div className="lg:col-span-8 space-y-8">
                  {leadArticle && (
                    <ArticleCard
                      article={leadArticle}
                      variant="lead"
                      isSavedOffline={offlineArticles.some((a) => a.id === leadArticle.id)}
                      onNavigate={navigate}
                      onToggleOffline={toggleSaveOffline}
                      onRequestFlashBrief={handleOpenQuickBrief}
                    />
                  )}

                  {/* Secondary Important Stories Grid */}
                  {secondaryArticles.length > 0 && (
                    <div>
                      <div className="border-b-2 border-[#171717] pb-2 mb-5 flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans">
                          Featured Global Coverage
                        </h2>
                        <span className="text-xs text-[#6B6B6B]">Key Developments</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {secondaryArticles.map((art) => (
                          <ArticleCard
                            key={art.id}
                            article={art}
                            variant="secondary"
                            isSavedOffline={offlineArticles.some((a) => a.id === art.id)}
                            onNavigate={navigate}
                            onToggleOffline={toggleSaveOffline}
                            onRequestFlashBrief={handleOpenQuickBrief}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right 4 Columns: Trending Section + Most Read Ranked List + Sidebar Ad */}
                <aside className="lg:col-span-4 space-y-8">
                  {/* Trending Stories Module (Section 8) */}
                  <div className="bg-white border border-[#E7E5E2] p-5">
                    <div className="border-b-2 border-[#6E1723] pb-2.5 mb-3 flex items-center justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-[#6E1723] font-sans">
                        Trending Now
                      </h2>
                      <button
                        type="button"
                        onClick={() => navigate('/trending')}
                        className="text-xs font-semibold text-[#171717] hover:text-[#6E1723] cursor-pointer"
                      >
                        View All →
                      </button>
                    </div>
                    <div>
                      {(trendingArticles.length > 0 ? trendingArticles : publishedArticles)
                        .slice(0, 4)
                        .map((art) => (
                          <ArticleCard
                            key={art.id}
                            article={art}
                            variant="compact"
                            onNavigate={navigate}
                          />
                        ))}
                    </div>
                  </div>

                  {/* Most Read Ranked List (Section 30 — Separate from Trending & Latest) */}
                  <div className="bg-white border border-[#E7E5E2] p-5">
                    <div className="border-b-2 border-[#171717] pb-2.5 mb-3 flex items-center justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans">
                        Most Read
                      </h2>
                      <span className="text-[11px] text-[#6B6B6B]">By Global Readership</span>
                    </div>
                    <div>
                      {mostReadArticles.map((art, index) => (
                        <ArticleCard
                          key={art.id}
                          article={art}
                          variant="numbered"
                          rankNumber={index + 1}
                          onNavigate={navigate}
                        />
                      ))}
                    </div>
                  </div>

                  <AdvertisementSlot slotKey="sidebar" ads={activeAds} onNavigate={navigate} />
                </aside>
              </div>
            </section>

            {/* 2. PERSONALIZED "MY PULSE" DASHBOARD + LOW-LATENCY AI DIGEST */}
            <section
              aria-label="Personalized My Pulse Feed"
              className="bg-white border border-[#E7E5E2] p-6 sm:p-8 space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E5E2] pb-5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                    PERSONALIZED EDITORIAL FEED
                  </span>
                  <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#171717] mt-1">
                    My Pulse — Tailored to Your Global Interests
                  </h2>
                </div>

                <button
                  type="button"
                  disabled={pulseDigestLoading}
                  onClick={handleGeneratePulseDigest}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] transition-colors whitespace-nowrap shrink-0 self-start md:self-auto cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {pulseDigestLoading
                      ? 'Synthesizing Brief...'
                      : 'Generate AI Flash Digest for My Topics'}
                  </span>
                </button>
              </div>

              {/* Interactive Topic Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#6B6B6B] mr-1">Active Desks:</span>
                {categories.slice(0, 10).map((cat) => {
                  const isSelected = selectedPulseTopics.includes(cat.slug);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedPulseTopics((prev) =>
                          prev.includes(cat.slug)
                            ? prev.length > 1
                              ? prev.filter((s) => s !== cat.slug)
                              : prev
                            : [...prev, cat.slug]
                        );
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#171717] text-white'
                          : 'bg-[#F7F5F2] text-[#6B6B6B] hover:text-[#171717]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {pulseDigest && (
                <div className="p-5 bg-[#F7F5F2] border-l-4 border-[#6E1723] space-y-2.5 text-sm">
                  <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
                    <span className="font-bold uppercase tracking-wider text-[#6E1723]">
                      Executive Topic Synthesis (gemini-3.1-flash-lite)
                    </span>
                    {pulseDigest.latencyMs !== undefined && (
                      <span className="font-mono-tabular">
                        Response time: {pulseDigest.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-[#171717]">{pulseDigest.synthesis}</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-[#171717]/85">
                    {pulseDigest.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {publishedArticles
                  .filter((a) => selectedPulseTopics.includes(a.category))
                  .slice(0, 3)
                  .map((art) => (
                    <ArticleCard
                      key={art.id}
                      article={art}
                      variant="secondary"
                      isSavedOffline={offlineArticles.some((a) => a.id === art.id)}
                      onNavigate={navigate}
                      onToggleOffline={toggleSaveOffline}
                      onRequestFlashBrief={handleOpenQuickBrief}
                    />
                  ))}
              </div>
            </section>

            <AdvertisementSlot slotKey="homepage_middle" ads={activeAds} onNavigate={navigate} />

            {/* 3. LATEST NEWS CHRONOLOGICAL SECTION + ADVANCED TAG ARCHIVE FILTER (Section 7) */}
            <section aria-label="Latest Global Dispatches" className="space-y-6">
              <div className="border-b-2 border-[#171717] pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                    CHRONOLOGICAL ARCHIVE & TAG DISCOVERY
                  </span>
                  <h2 className="font-editorial text-3xl font-semibold text-[#171717] mt-0.5">
                    Latest Dispatches
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/latest')}
                  className="text-xs font-semibold text-[#6E1723] hover:underline cursor-pointer"
                >
                  Full Chronological Wire →
                </button>
              </div>

              {/* Interactive Tag Filter Controls */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Tag className="w-3.5 h-3.5 text-[#6E1723] shrink-0" />
                <button
                  type="button"
                  onClick={() => setSelectedArchiveTag('all')}
                  className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedArchiveTag === 'all'
                      ? 'bg-[#6E1723] text-white'
                      : 'bg-white border border-[#E7E5E2] text-[#171717]'
                  }`}
                >
                  All Recent Stories
                </button>
                {allTags.slice(0, 12).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedArchiveTag(tag)}
                    className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedArchiveTag === tag
                        ? 'bg-[#6E1723] text-white font-semibold'
                        : 'bg-white border border-[#E7E5E2] text-[#171717] hover:border-[#6E1723]'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              <div className="bg-white border border-[#E7E5E2] px-6 divide-y divide-[#E7E5E2]">
                {publishedArticles
                  .filter(
                    (a) =>
                      selectedArchiveTag === 'all' || a.tags.includes(selectedArchiveTag)
                  )
                  .slice(0, 5)
                  .map((art) => (
                    <ArticleCard
                      key={art.id}
                      article={art}
                      variant="latest"
                      isSavedOffline={offlineArticles.some((a) => a.id === art.id)}
                      onNavigate={navigate}
                      onToggleOffline={toggleSaveOffline}
                      onRequestFlashBrief={handleOpenQuickBrief}
                    />
                  ))}
              </div>
            </section>

            {/* 4. DYNAMIC CATEGORY SECTIONS (Section 9 — Controlled via Admin Dashboard) */}
            <section aria-label="Global Category Desks" className="space-y-12">
              {categories
                .filter((c) => c.showOnHomepage)
                .map((cat) => {
                  const catStories = publishedArticles.filter((a) => a.category === cat.slug);
                  if (catStories.length === 0) return null;
                  return (
                    <div key={cat.id} className="space-y-5">
                      <div className="border-b-2 border-[#171717] pb-2.5 flex items-center justify-between">
                        <div className="flex items-baseline gap-3">
                          <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#171717]">
                            {cat.name}
                          </h2>
                          <span className="text-xs text-[#6B6B6B] hidden sm:inline">
                            {cat.description}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/${cat.slug}`)}
                          className="flex items-center gap-1 text-xs font-semibold text-[#6E1723] hover:underline cursor-pointer whitespace-nowrap"
                        >
                          <span>{cat.name} Desk</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {catStories.slice(0, 3).map((story) => (
                          <ArticleCard
                            key={story.id}
                            article={story}
                            variant="secondary"
                            isSavedOffline={offlineArticles.some((a) => a.id === story.id)}
                            onNavigate={navigate}
                            onToggleOffline={toggleSaveOffline}
                            onRequestFlashBrief={handleOpenQuickBrief}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
            </section>

            {/* 5. NEWSLETTER SIGNUP (Section 26 & 31) */}
            <NewsletterSignup siteSettings={siteSettings} source="homepage_main" />

            <AdvertisementSlot slotKey="homepage_bottom" ads={activeAds} onNavigate={navigate} />
          </div>
        ) : (
          <StaticEditorialPages
            page="404"
            siteSettings={siteSettings}
            authors={authors}
            articles={publishedArticles}
            onNavigate={navigate}
          />
        )}
      </main>

      <div className="max-w-[1360px] mx-auto w-full px-4 sm:px-6">
        <AdvertisementSlot slotKey="footer" ads={activeAds} onNavigate={navigate} />
      </div>

      {/* Global Publication Footer (Section 32) */}
      <Footer
        categories={categories}
        siteSettings={siteSettings}
        onNavigate={navigate}
        onOpenCookieSettings={() => setForceCookieModal(true)}
      />

      {/* Cookie Consent System (Section 24) */}
      <CookieConsent
        forceOpen={forceCookieModal}
        onCloseForceOpen={() => setForceCookieModal(false)}
        onUpdateConsent={setCookiePrefs}
      />

      {/* =====================================================================
          MODAL 1: SITE-WIDE SEARCH OVERLAY (Section 19)
         ===================================================================== */}
      {searchModalOpen && (
        <div
          role="dialog"
          aria-label="Site-wide Search"
          className="fixed inset-0 z-50 bg-black/65 flex items-start justify-center pt-16 p-4"
        >
          <div className="bg-white border-t-4 border-[#6E1723] max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[82vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E7E5E2] pb-3">
              <div className="flex items-center gap-2">
                <SearchIcon className="w-4 h-4 text-[#6E1723]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                  WORLDPULSE GLOBAL ARCHIVE SEARCH
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="p-1 text-[#6B6B6B] hover:text-[#171717] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search article titles, full text, categories, tags, or correspondents..."
              className="w-full px-4 py-3 text-base bg-[#F7F5F2] border border-[#E7E5E2] focus:outline-none focus:border-[#6E1723]"
            />

            {searchQuery.trim() ? (
              <div className="space-y-4">
                <p className="text-xs font-mono-tabular text-[#6B6B6B]">
                  Showing {searchResults.length} matching dispatches
                </p>
                {searchResults.length === 0 ? (
                  <p className="text-sm text-[#6B6B6B] py-4">
                    No articles matched “{searchQuery}”.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E7E5E2]">
                    {searchResults.map((art) => (
                      <div key={art.id} className="py-3.5 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                            <span className="font-bold uppercase text-[#6E1723]">
                              {art.categoryName}
                            </span>
                            <span>·</span>
                            <span className="font-mono-tabular">
                              {formatEditorialDate(art.publishedAt)}
                            </span>
                          </div>
                          <a
                            href={`/${art.category}/${art.slug}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setSearchModalOpen(false);
                              navigate(`/${art.category}/${art.slug}`);
                            }}
                            className="font-editorial text-lg font-semibold text-[#171717] hover:text-[#6E1723] block mt-0.5"
                          >
                            {art.title}
                          </a>
                          <p className="text-xs text-[#6B6B6B] line-clamp-1 mt-1">{art.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                  Popular Global Topics:
                </p>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSearchQuery(t)}
                      className="px-3 py-1.5 text-xs bg-[#F7F5F2] border border-[#E7E5E2] hover:border-[#6E1723] cursor-pointer"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: OFFLINE READING VAULT DRAWER
         ===================================================================== */}
      {offlineDrawerOpen && (
        <div
          role="dialog"
          aria-label="Offline Reading Vault"
          className="fixed inset-0 z-50 bg-black/60 flex justify-end"
        >
          <div className="bg-white w-full max-w-md h-full p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#E7E5E2] pb-4">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-[#6E1723]" />
                  <h2 className="font-editorial text-xl font-semibold text-[#171717]">
                    Offline Reading Vault ({offlineArticles.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOfflineDrawerOpen(false)}
                  className="p-1 text-[#6B6B6B] hover:text-[#171717] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Dispatches saved here are stored directly on your device so you can read full long-form
                articles while traveling, commuting, or in low-connectivity regions.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveEntireEditionOffline}
                  className="flex-1 py-2 px-3 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] cursor-pointer"
                >
                  Download Full Edition Offline ({publishedArticles.length} Articles)
                </button>
                <button
                  type="button"
                  onClick={() => setIsOfflineMode((prev) => !prev)}
                  className="py-2 px-3 text-xs font-semibold border border-[#171717] text-[#171717] cursor-pointer"
                >
                  {isOfflineMode ? 'Go Online' : 'Test Offline Mode'}
                </button>
              </div>

              <div className="divide-y divide-[#E7E5E2] pt-2">
                {offlineArticles.map((art) => (
                  <div key={art.id} className="py-3.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#6B6B6B]">
                      <span className="font-bold uppercase text-[#6E1723]">
                        {art.categoryName}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSaveOffline(art)}
                        className="text-[#8C2634] hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <a
                      href={`/${art.category}/${art.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setOfflineDrawerOpen(false);
                        navigate(`/${art.category}/${art.slug}`);
                      }}
                      className="font-editorial text-base font-semibold text-[#171717] hover:text-[#6E1723] block"
                    >
                      {art.title}
                    </a>
                    <span className="text-[11px] font-mono-tabular text-[#6B6B6B] block">
                      {art.readingTime} min read · Stored locally
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E7E5E2] text-xs text-[#6B6B6B] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Ready for zero-connectivity reading.</span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: LOW-LATENCY AI FLASH BRIEF MODAL (gemini-3.1-flash-lite)
         ===================================================================== */}
      {quickBriefArticle && (
        <div
          role="dialog"
          aria-label="Low-Latency Executive Brief"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div className="bg-white border-t-4 border-[#6E1723] max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7E5E2] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6E1723]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                  WORLDPULSE INSTANT BRIEF (gemini-3.1-flash-lite)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuickBriefArticle(null)}
                className="p-1 text-[#6B6B6B] hover:text-[#171717] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-editorial text-xl font-semibold text-[#171717]">
              {quickBriefArticle.title}
            </h3>

            {quickBriefLoading ? (
              <p className="text-sm text-[#6B6B6B] py-6">
                Generating low-latency executive synthesis via gemini-3.1-flash-lite...
              </p>
            ) : (
              quickBriefResult && (
                <div className="space-y-3 text-sm">
                  <ul className="list-disc pl-5 space-y-1.5 text-[#171717]">
                    {quickBriefResult.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                  {quickBriefResult.whyItMatters && (
                    <div className="p-3 bg-[#F7F5F2] border-l-2 border-[#6E1723] text-xs text-[#171717]">
                      <strong>Why It Matters Globally: </strong>
                      {quickBriefResult.whyItMatters}
                    </div>
                  )}
                </div>
              )
            )}

            <div className="pt-3 border-t border-[#E7E5E2] flex items-center justify-between text-xs">
              <span className="font-mono-tabular text-[#6B6B6B]">
                {quickBriefResult?.latencyMs !== undefined
                  ? `Synthesized in ${quickBriefResult.latencyMs}ms`
                  : 'Low-Latency Stream'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const target = `/${quickBriefArticle.category}/${quickBriefArticle.slug}`;
                  setQuickBriefArticle(null);
                  navigate(target);
                }}
                className="px-4 py-2 font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] cursor-pointer"
              >
                Read Full Article →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: READER & ADMIN AUTHENTICATION MODAL
         ===================================================================== */}
      {authModalOpen && (
        <div
          role="dialog"
          aria-label="Sign In or Subscribe"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div className="bg-white border-t-4 border-[#6E1723] max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E7E5E2] pb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                WORLDPULSE ACCOUNT & ACCESS
              </span>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="p-1 text-[#6B6B6B] hover:text-[#171717] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Google Sign-In with Firebase Auth & Role Switcher */}
            <div className="p-3.5 bg-[#F7F5F2] border border-[#E7E5E2] space-y-2.5">
              <button
                type="button"
                disabled={authLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-3 text-xs font-semibold uppercase tracking-wider bg-[#171717] text-white hover:bg-[#6E1723] transition-colors cursor-pointer"
              >
                {authLoading ? 'Connecting...' : 'Continue with Google (Firebase Auth)'}
              </button>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] block pt-1">
                Or Instant Demo Sign-In
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleLoginSubmit(undefined, 'reader')}
                  className="py-2 px-3 text-xs font-semibold bg-white border border-[#171717] text-[#171717] hover:bg-[#171717] hover:text-white transition-colors cursor-pointer"
                >
                  Reader Account
                </button>
                <button
                  type="button"
                  onClick={() => handleLoginSubmit(undefined, 'admin')}
                  className="py-2 px-3 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] transition-colors cursor-pointer"
                >
                  Chief Editor (Admin)
                </button>
              </div>
            </div>

            <div className="flex border-b border-[#E7E5E2] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 pb-2.5 cursor-pointer ${
                  authMode === 'login'
                    ? 'border-b-2 border-[#6E1723] text-[#6E1723]'
                    : 'text-[#6B6B6B]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 pb-2.5 cursor-pointer ${
                  authMode === 'register'
                    ? 'border-b-2 border-[#6E1723] text-[#6E1723]'
                    : 'text-[#6B6B6B]'
                }`}
              >
                Create Reader Account
              </button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={(e) => handleLoginSubmit(e)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="reader@worldpulse.press"
                    className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                  />
                </div>
                {authError && <p className="text-xs font-semibold text-[#8C2634]">{authError}</p>}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#171717] text-white hover:bg-[#6E1723] transition-colors cursor-pointer"
                >
                  {authLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="alex@example.org"
                    className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase mb-1">
                    Password (6+ chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                  />
                </div>
                {authError && <p className="text-xs font-semibold text-[#8C2634]">{authError}</p>}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#6E1723] text-white hover:bg-[#4A0F18] transition-colors cursor-pointer"
                >
                  {authLoading ? 'Creating Account...' : 'Create Reader Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

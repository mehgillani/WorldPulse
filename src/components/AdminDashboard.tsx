import React, { useState, useEffect } from 'react';
import {
  FileText,
  PlusCircle,
  FolderKanban,
  Image as ImageIcon,
  Users,
  MessageSquare,
  Megaphone,
  BarChart3,
  Globe,
  Settings,
  Share2,
  Mail,
  LogOut,
  Trash2,
  Edit3,
  Eye,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Upload,
  Sparkles,
  BookOpen,
} from 'lucide-react';
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
} from '../types/editorial';
import { RichArticleEditor } from './RichArticleEditor';
import { EditorialImage } from './EditorialImage';
import { formatEditorialDate } from './ArticleCard';
import {
  auth,
  saveArticleToFirestore,
  deleteArticleFromFirestore,
} from '../firebase';

interface AdminDashboardProps {
  user: UserProfile;
  authToken: string;
  onLogout: () => void;
  onNavigatePublic: (path: string) => void;
  onRefreshPublicData: () => void;
  onPreviewArticle: (article: Article) => void;
}

type AdminSection =
  | 'dashboard'
  | 'articles'
  | 'create'
  | 'breaking'
  | 'categories'
  | 'media'
  | 'authors'
  | 'comments'
  | 'ads'
  | 'analytics'
  | 'seo'
  | 'settings'
  | 'social'
  | 'newsletter'
  | 'deployment';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  authToken,
  onLogout,
  onNavigatePublic,
  onRefreshPublicData,
  onPreviewArticle,
}) => {
  const [activeTab, setActiveTab] = useState<AdminSection>('dashboard');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  // Admin state from /api/admin/overview
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [ads, setAds] = useState<AdPlacement[]>([]);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [breakingNews, setBreakingNews] = useState<BreakingNewsConfig>({
    enabled: false,
    label: 'BREAKING',
    headline: '',
    articleSlug: '',
    categorySlug: 'world',
    startTime: '',
    endTime: '',
  });
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [subscribers, setSubscribers] = useState<
    { email: string; subscribedAt: string; source: string }[]
  >([]);

  // Article Filtering & Editing State
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Category Form State
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catNav, setCatNav] = useState(true);
  const [catHome, setCatHome] = useState(true);

  // Media Upload Form State
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaAlt, setMediaAlt] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');

  // Author Form State
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [authorLocation, setAuthorLocation] = useState('');
  const [authorBio, setAuthorBio] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Failed to load administrative data.');
      const data = await res.json();
      setArticles(data.articles || []);
      setCategories(data.categories || []);
      setAuthors(data.authors || []);
      setMedia(data.media || []);
      setAds(data.ads || []);
      setComments(data.comments || []);
      if (data.breakingNews) setBreakingNews(data.breakingNews);
      if (data.siteSettings) setSiteSettings(data.siteSettings);
      if (data.analytics) setAnalytics(data.analytics);
      setSubscribers(data.newsletterSubscribers || []);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Error loading admin console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [authToken]);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleQuickArticleUpdate = async (article: Article, patch: Partial<Article>) => {
    try {
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ ...article, ...patch }),
      });
      const data = await res.json();
      if (res.ok) {
        if (auth.currentUser) {
          await saveArticleToFirestore(data.article, true);
        }
        setArticles((prev) => prev.map((a) => (a.id === article.id ? data.article : a)));
        onRefreshPublicData();
        showToast(`Updated "${article.title.slice(0, 36)}..."`);
      }
    } catch {
      showToast('Failed to update article.');
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        if (auth.currentUser) {
          await deleteArticleFromFirestore(id);
        }
        setArticles((prev) => prev.filter((a) => a.id !== id));
        setDeleteConfirmId(null);
        onRefreshPublicData();
        showToast('Article permanently deleted.');
      }
    } catch {
      showToast('Failed to delete article.');
    }
  };

  const handleDemoContentAction = async (action: 'remove' | 'restore') => {
    try {
      const res = await fetch('/api/admin/demo-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setArticles(data.articles);
        setBreakingNews(data.breakingNews);
        onRefreshPublicData();
        showToast(data.message);
      }
    } catch {
      showToast('Action failed.');
    }
  };

  const handleSaveBreakingNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/breaking-news', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(breakingNews),
      });
      const data = await res.json();
      if (res.ok) {
        setBreakingNews(data.breakingNews);
        onRefreshPublicData();
        showToast('Breaking News configuration saved.');
      }
    } catch {
      showToast('Failed to save breaking news.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: catName,
          slug: catSlug,
          description: catDesc,
          showInNav: catNav,
          showOnHomepage: catHome,
          order: categories.length + 1,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCategories(data.categories);
        setCatName('');
        setCatSlug('');
        setCatDesc('');
        onRefreshPublicData();
        showToast('Category added.');
      }
    } catch {
      showToast('Failed to add category.');
    }
  };

  const handleToggleCategoryFlag = async (cat: Category, field: 'showInNav' | 'showOnHomepage') => {
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ ...cat, [field]: !cat[field] }),
      });
      const data = await res.json();
      if (res.ok) {
        setCategories(data.categories);
        onRefreshPublicData();
      }
    } catch {
      showToast('Failed to update category.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
        if (!mediaTitle) setMediaTitle(file.name.replace(/\.[^.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl.trim()) return;
    try {
      const res = await fetch('/api/admin/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: mediaTitle || 'Editorial Photograph',
          url: mediaUrl,
          altText: mediaAlt || mediaTitle,
          caption: mediaCaption,
          mimeType: 'image/jpeg',
          dimensions: '1600 × 900',
          sizeKb: 280,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMedia(data.media);
        setMediaTitle('');
        setMediaUrl('');
        setMediaAlt('');
        setMediaCaption('');
        showToast('Image added to Media Library.');
      }
    } catch {
      showToast('Upload failed.');
    }
  };

  const handleAddAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim()) return;
    try {
      const res = await fetch('/api/admin/authors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: authorName,
          role: authorRole || 'International Correspondent',
          location: authorLocation || 'Global Desk',
          bio: authorBio,
          email: authorEmail,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthors(data.authors);
        setAuthorName('');
        setAuthorRole('');
        setAuthorLocation('');
        setAuthorBio('');
        setAuthorEmail('');
        onRefreshPublicData();
        showToast('Correspondent profile saved.');
      }
    } catch {
      showToast('Failed to save author.');
    }
  };

  const handleCommentModeration = async (
    id: string,
    status: 'approved' | 'pending' | 'rejected' | 'spam'
  ) => {
    try {
      const res = await fetch(`/api/admin/comments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments);
        onRefreshPublicData();
        showToast(`Comment marked as ${status}.`);
      }
    } catch {
      showToast('Moderation action failed.');
    }
  };

  const handleSaveAd = async (ad: AdPlacement) => {
    try {
      const res = await fetch(`/api/admin/ads/${ad.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(ad),
      });
      const data = await res.json();
      if (res.ok) {
        setAds(data.ads);
        onRefreshPublicData();
        showToast(`Saved "${ad.name}" placement.`);
      }
    } catch {
      showToast('Failed to update ad slot.');
    }
  };

  const handleSaveSiteSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!siteSettings) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(siteSettings),
      });
      const data = await res.json();
      if (res.ok) {
        setSiteSettings(data.siteSettings);
        onRefreshPublicData();
        showToast('Site settings updated.');
      }
    } catch {
      showToast('Failed to save settings.');
    }
  };

  const filteredArticles = articles.filter((a) => {
    if (statusFilter === 'trending' && !a.isTrending) return false;
    if (
      statusFilter !== 'all' &&
      statusFilter !== 'trending' &&
      a.status !== statusFilter
    ) {
      return false;
    }
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    return true;
  });

  const publishedCount = articles.filter((a) => a.status === 'published').length;
  const draftCount = articles.filter((a) => a.status === 'draft').length;
  const scheduledCount = articles.filter((a) => a.status === 'scheduled').length;
  const demoCount = articles.filter((a) => a.isDemo).length;

  return (
    <div className="min-h-screen bg-[#F7F5F2] flex flex-col lg:flex-row">
      {/* Left Sidebar Navigation (260px Workspace Canvas) */}
      <aside className="w-full lg:w-64 bg-[#171717] text-white shrink-0 flex flex-col justify-between border-r border-[#E7E5E2]">
        <div>
          <div className="p-5 border-b border-white/15 flex items-center justify-between">
            <div>
              <span className="font-editorial text-xl font-bold tracking-[0.08em] text-white block">
                WORLDPULSE
              </span>
              <span className="text-[11px] uppercase tracking-widest text-white/60">
                Editorial Admin Console
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigatePublic('/')}
              className="text-xs px-2.5 py-1 bg-[#6E1723] text-white hover:bg-[#8C2634] transition-colors cursor-pointer"
            >
              View Site
            </button>
          </div>

          <nav className="p-3 space-y-1 text-xs font-medium">
            {[
              { id: 'dashboard', label: 'Dashboard Overview', icon: BarChart3 },
              { id: 'articles', label: `Articles (${articles.length})`, icon: FileText },
              { id: 'create', label: 'Create Article', icon: PlusCircle },
              { id: 'breaking', label: 'Breaking News Bar', icon: Radio },
              { id: 'categories', label: 'Categories & Tags', icon: FolderKanban },
              { id: 'media', label: `Media Library (${media.length})`, icon: ImageIcon },
              { id: 'authors', label: `Authors (${authors.length})`, icon: Users },
              { id: 'comments', label: `Comments (${comments.length})`, icon: MessageSquare },
              { id: 'ads', label: 'Advertisements', icon: Megaphone },
              { id: 'analytics', label: 'Analytics & Traffic', icon: BarChart3 },
              { id: 'seo', label: 'SEO & Sitemaps', icon: Globe },
              { id: 'settings', label: 'Site Settings', icon: Settings },
              { id: 'social', label: 'Social Media Links', icon: Share2 },
              { id: 'newsletter', label: `Newsletter (${subscribers.length})`, icon: Mail },
              { id: 'deployment', label: 'Deployment Checklist', icon: BookOpen },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'create') setEditingArticle(null);
                    setActiveTab(item.id as AdminSection);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#6E1723] text-white font-semibold'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/15 space-y-3 text-xs">
          <div>
            <p className="font-semibold text-white truncate">{user.name}</p>
            <p className="text-white/60 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-[#8C2634] text-white font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0">
        {/* Top Context Header */}
        <div className="bg-white border-b border-[#E7E5E2] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
            <span className="font-bold uppercase tracking-wider text-[#6E1723]">ADMIN</span>
            <span>/</span>
            <span className="uppercase font-semibold text-[#171717]">{activeTab}</span>
          </div>

          {feedback && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F7F5F2] border border-[#6E1723] text-xs font-semibold text-[#6E1723]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{feedback}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setEditingArticle(null);
                setActiveTab('create');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] transition-colors cursor-pointer"
            >
              + New Article
            </button>
          </div>
        </div>

        <div className="p-6 max-w-[1240px] mx-auto">
          {loading ? (
            <div className="bg-white border border-[#E7E5E2] p-12 text-center text-sm text-[#6B6B6B]">
              Loading WORLDPULSE Editorial Console...
            </div>
          ) : (
            <>
              {/* 1. DASHBOARD OVERVIEW & QUICK ACTIONS (Section 44) */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Top Metric Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-[#E7E5E2] p-5">
                      <span className="text-xs uppercase tracking-wider text-[#6B6B6B]">
                        Published Dispatches
                      </span>
                      <p className="font-mono-tabular text-3xl font-bold text-[#171717] mt-1">
                        {publishedCount}
                      </p>
                      <span className="text-xs text-[#6B6B6B] mt-1 block">
                        {draftCount} Drafts · {scheduledCount} Scheduled
                      </span>
                    </div>

                    <div className="bg-white border border-[#E7E5E2] p-5">
                      <span className="text-xs uppercase tracking-wider text-[#6B6B6B]">
                        Total Readership Views
                      </span>
                      <p className="font-mono-tabular text-3xl font-bold text-[#171717] mt-1">
                        {(analytics?.totalPageViews || 94860).toLocaleString()}
                      </p>
                      <span className="text-xs text-emerald-700 mt-1 block">
                        {(analytics?.uniqueVisitors || 61420).toLocaleString()} Unique Visitors
                      </span>
                    </div>

                    <div className="bg-white border border-[#E7E5E2] p-5">
                      <span className="text-xs uppercase tracking-wider text-[#6B6B6B]">
                        Newsletter Subscribers
                      </span>
                      <p className="font-mono-tabular text-3xl font-bold text-[#171717] mt-1">
                        {(analytics?.NewsletterSubscribersCount || 14820).toLocaleString()}
                      </p>
                      <span className="text-xs text-[#6B6B6B] mt-1 block">
                        Daily Global Briefing List
                      </span>
                    </div>

                    <div className="bg-white border border-[#E7E5E2] p-5">
                      <span className="text-xs uppercase tracking-wider text-[#6B6B6B]">
                        Breaking News Status
                      </span>
                      <p className="font-editorial text-xl font-semibold text-[#6E1723] mt-1">
                        {breakingNews.enabled ? 'Active on Site' : 'Disabled'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('breaking')}
                        className="text-xs font-semibold underline text-[#171717] mt-1 cursor-pointer"
                      >
                        Configure Ticker →
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions Grid (Section 44) */}
                  <div className="bg-white border border-[#E7E5E2] p-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans mb-4">
                      Editorial Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingArticle(null);
                          setActiveTab('create');
                        }}
                        className="p-4 bg-[#6E1723] text-white text-left hover:bg-[#4A0F18] transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-5 h-5 mb-2" />
                        <span className="text-xs font-semibold block">Create Article</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('media')}
                        className="p-4 bg-[#F7F5F2] border border-[#E7E5E2] text-[#171717] text-left hover:border-[#6E1723] transition-colors cursor-pointer"
                      >
                        <Upload className="w-5 h-5 mb-2 text-[#6E1723]" />
                        <span className="text-xs font-semibold block">Upload Media</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('breaking')}
                        className="p-4 bg-[#F7F5F2] border border-[#E7E5E2] text-[#171717] text-left hover:border-[#6E1723] transition-colors cursor-pointer"
                      >
                        <Radio className="w-5 h-5 mb-2 text-[#6E1723]" />
                        <span className="text-xs font-semibold block">Breaking News</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('published');
                          setActiveTab('articles');
                        }}
                        className="p-4 bg-[#F7F5F2] border border-[#E7E5E2] text-[#171717] text-left hover:border-[#6E1723] transition-colors cursor-pointer"
                      >
                        <FileText className="w-5 h-5 mb-2 text-[#6E1723]" />
                        <span className="text-xs font-semibold block">Published Articles</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('draft');
                          setActiveTab('articles');
                        }}
                        className="p-4 bg-[#F7F5F2] border border-[#E7E5E2] text-[#171717] text-left hover:border-[#6E1723] transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-5 h-5 mb-2 text-[#6E1723]" />
                        <span className="text-xs font-semibold block">View Drafts</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('ads')}
                        className="p-4 bg-[#F7F5F2] border border-[#E7E5E2] text-[#171717] text-left hover:border-[#6E1723] transition-colors cursor-pointer"
                      >
                        <Megaphone className="w-5 h-5 mb-2 text-[#6E1723]" />
                        <span className="text-xs font-semibold block">Ad Settings</span>
                      </button>
                    </div>
                  </div>

                  {/* Sample Demo Content Control Banner (Section 39) */}
                  <div className="bg-white border-l-4 border-[#6E1723] p-5 border-t border-r border-b border-t-[#E7E5E2] border-r-[#E7E5E2] border-b-[#E7E5E2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#171717] font-sans">
                        Sample Editorial Demo Content Manager ({demoCount} Demo Articles Active)
                      </h3>
                      <p className="text-xs text-[#6B6B6B] mt-1">
                        WORLDPULSE ships with 10 clearly labeled sample articles across global desks.
                        You can remove all sample articles in one click when ready for live production.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {demoCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleDemoContentAction('remove')}
                          className="px-4 py-2 text-xs font-semibold bg-[#8C2634] text-white hover:bg-[#4A0F18] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Remove All Demo Articles
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDemoContentAction('restore')}
                          className="px-4 py-2 text-xs font-semibold bg-[#171717] text-white hover:bg-[#6E1723] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Restore Sample Demo Articles
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Recent Articles Snapshot */}
                  <div className="bg-white border border-[#E7E5E2] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans">
                        Recent Editorial Dispatches
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('articles')}
                        className="text-xs font-semibold text-[#6E1723] hover:underline cursor-pointer"
                      >
                        Manage All Articles →
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b-2 border-[#171717] bg-[#F7F5F2]">
                            <th className="py-2.5 px-3">Headline</th>
                            <th className="py-2.5 px-3">Desk</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Views</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {articles.slice(0, 6).map((art) => (
                            <tr key={art.id} className="border-b border-[#E7E5E2] hover:bg-[#F7F5F2]/60">
                              <td className="py-3 px-3 font-medium text-[#171717] max-w-md truncate">
                                {art.title}
                              </td>
                              <td className="py-3 px-3 uppercase font-semibold text-[#6E1723]">
                                {art.categoryName}
                              </td>
                              <td className="py-3 px-3 uppercase font-mono-tabular">
                                {art.status}
                              </td>
                              <td className="py-3 px-3 text-right font-mono-tabular">
                                {art.views.toLocaleString()}
                              </td>
                              <td className="py-3 px-3 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingArticle(art);
                                    setActiveTab('create');
                                  }}
                                  className="text-[#6E1723] font-semibold hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. ARTICLES MANAGEMENT TABLE (Section 15) */}
              {activeTab === 'articles' && (
                <div className="space-y-6">
                  <div className="bg-white border border-[#E7E5E2] p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {['all', 'published', 'draft', 'scheduled', 'trending'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                            statusFilter === st
                              ? 'bg-[#6E1723] text-white'
                              : 'bg-[#F7F5F2] text-[#171717] hover:bg-[#E7E5E2]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                      >
                        <option value="all">All Categories</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingArticle(null);
                          setActiveTab('create');
                        }}
                        className="px-4 py-1.5 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] cursor-pointer"
                      >
                        + Create Article
                      </button>
                    </div>
                  </div>

                  {/* Delete Confirmation Modal */}
                  {deleteConfirmId && (
                    <div className="bg-white border-2 border-[#8C2634] p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-[#8C2634]" />
                        <span className="text-sm font-semibold text-[#171717]">
                          Are you sure you want to permanently delete this article? This action cannot be undone.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 text-xs font-semibold border border-[#E7E5E2] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArticle(deleteConfirmId)}
                          className="px-4 py-1.5 text-xs font-semibold bg-[#8C2634] text-white cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-[#E7E5E2] overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b-2 border-[#171717] bg-[#F7F5F2]">
                          <th className="py-3 px-4">Title</th>
                          <th className="py-3 px-3">Category</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">Author</th>
                          <th className="py-3 px-3">Published</th>
                          <th className="py-3 px-3 text-right">Views</th>
                          <th className="py-3 px-3 text-center">Trending</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredArticles.map((art) => (
                          <tr key={art.id} className="border-b border-[#E7E5E2] hover:bg-[#F7F5F2]/50">
                            <td className="py-3.5 px-4 max-w-xs">
                              <p className="font-semibold text-[#171717] line-clamp-1">{art.title}</p>
                              <span className="text-[11px] text-[#6B6B6B]">
                                {art.isLead ? 'Lead Story · ' : ''}
                                {art.isDeveloping ? 'Developing · ' : ''}
                                {art.isDemo ? 'Demo Sample' : 'Original'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 uppercase font-semibold text-[#6E1723]">
                              {art.categoryName}
                            </td>
                            <td className="py-3.5 px-3 font-mono-tabular uppercase">
                              <span
                                className={
                                  art.status === 'published'
                                    ? 'text-emerald-700 font-semibold'
                                    : art.status === 'scheduled'
                                    ? 'text-amber-700 font-semibold'
                                    : 'text-[#6B6B6B]'
                                }
                              >
                                {art.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-[#171717]">{art.authorName}</td>
                            <td className="py-3.5 px-3 font-mono-tabular text-[#6B6B6B]">
                              {formatEditorialDate(art.publishedAt)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono-tabular">
                              {art.views.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={art.isTrending}
                                onChange={() =>
                                  handleQuickArticleUpdate(art, { isTrending: !art.isTrending })
                                }
                                className="accent-[#6E1723] cursor-pointer"
                                title="Toggle Trending Status"
                              />
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingArticle(art);
                                  setActiveTab('create');
                                }}
                                className="text-[#6E1723] font-semibold hover:underline cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onPreviewArticle(art)}
                                className="text-[#171717] hover:underline cursor-pointer"
                              >
                                Preview
                              </button>
                              {art.status === 'published' ? (
                                <button
                                  type="button"
                                  onClick={() => handleQuickArticleUpdate(art, { status: 'draft' })}
                                  className="text-amber-700 hover:underline cursor-pointer"
                                >
                                  Unpublish
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickArticleUpdate(art, { status: 'published' })
                                  }
                                  className="text-emerald-700 font-semibold hover:underline cursor-pointer"
                                >
                                  Publish
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(art.id)}
                                className="text-[#8C2634] hover:underline cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. CREATE / EDIT ARTICLE (Sections 11 & 12) */}
              {activeTab === 'create' && (
                <RichArticleEditor
                  initialArticle={editingArticle}
                  categories={categories}
                  authors={authors}
                  media={media}
                  authToken={authToken}
                  onSaveSuccess={async (saved) => {
                    if (auth.currentUser) {
                      try {
                        await saveArticleToFirestore(saved, Boolean(editingArticle));
                      } catch {
                        // Handled by Firestore error logger
                      }
                    }
                    fetchAdminData();
                    onRefreshPublicData();
                    showToast(`Article "${saved.title.slice(0, 32)}..." saved as ${saved.status}.`);
                    setActiveTab('articles');
                  }}
                  onCancel={() => setActiveTab('articles')}
                  onPreviewArticle={onPreviewArticle}
                />
              )}

              {/* 4. BREAKING NEWS MANAGER (Section 17) */}
              {activeTab === 'breaking' && (
                <form
                  onSubmit={handleSaveBreakingNews}
                  className="bg-white border border-[#E7E5E2] p-6 space-y-5 max-w-2xl"
                >
                  <div className="border-b border-[#E7E5E2] pb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                      BREAKING NEWS TICKER CONTROL
                    </span>
                    <h2 className="font-editorial text-2xl font-semibold text-[#171717]">
                      Manage Site-Wide Breaking News Bar
                    </h2>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-[#F7F5F2] border border-[#E7E5E2]">
                    <input
                      type="checkbox"
                      checked={breakingNews.enabled}
                      onChange={(e) =>
                        setBreakingNews({ ...breakingNews, enabled: e.target.checked })
                      }
                      className="accent-[#6E1723] w-4 h-4"
                    />
                    <span className="text-sm font-semibold text-[#171717]">
                      Enable Breaking News Bar on Public Website
                    </span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1">
                        Ticker Badge Label
                      </label>
                      <input
                        type="text"
                        value={breakingNews.label}
                        onChange={(e) =>
                          setBreakingNews({ ...breakingNews, label: e.target.value })
                        }
                        placeholder="BREAKING"
                        className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1">
                        Link to Published Article
                      </label>
                      <select
                        value={breakingNews.articleSlug}
                        onChange={(e) => {
                          const found = articles.find((a) => a.slug === e.target.value);
                          setBreakingNews({
                            ...breakingNews,
                            articleSlug: e.target.value,
                            categorySlug: found?.category || 'world',
                            headline: found ? found.title : breakingNews.headline,
                          });
                        }}
                        className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                      >
                        <option value="">Custom Headline Only</option>
                        {articles
                          .filter((a) => a.status === 'published')
                          .map((a) => (
                            <option key={a.id} value={a.slug}>
                              {a.title}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1">
                      Breaking News Headline
                    </label>
                    <input
                      type="text"
                      value={breakingNews.headline}
                      onChange={(e) =>
                        setBreakingNews({ ...breakingNews, headline: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1">
                        Start Time (ISO)
                      </label>
                      <input
                        type="text"
                        value={breakingNews.startTime}
                        onChange={(e) =>
                          setBreakingNews({ ...breakingNews, startTime: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F5F2] border border-[#E7E5E2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1">
                        End Time (ISO)
                      </label>
                      <input
                        type="text"
                        value={breakingNews.endTime}
                        onChange={(e) =>
                          setBreakingNews({ ...breakingNews, endTime: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F5F2] border border-[#E7E5E2]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#6E1723] text-white hover:bg-[#4A0F18] cursor-pointer"
                  >
                    Save Breaking News Configuration
                  </button>
                </form>
              )}

              {/* 5. CATEGORIES & TAGS MANAGER (Section 4 & 9) */}
              {activeTab === 'categories' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <form
                    onSubmit={handleAddCategory}
                    className="lg:col-span-4 bg-white border border-[#E7E5E2] p-5 space-y-4 h-fit"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans border-b border-[#E7E5E2] pb-2">
                      Create Editorial Desk / Category
                    </h3>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Category Name *</label>
                      <input
                        type="text"
                        required
                        value={catName}
                        onChange={(e) => {
                          setCatName(e.target.value);
                          setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                        }}
                        placeholder="e.g. Geopolitics"
                        className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Slug</label>
                      <input
                        type="text"
                        value={catSlug}
                        onChange={(e) => setCatSlug(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F5F2] border border-[#E7E5E2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={catDesc}
                        onChange={(e) => setCatDesc(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={catNav}
                        onChange={(e) => setCatNav(e.target.checked)}
                        className="accent-[#6E1723]"
                      />
                      <span>Show in Primary Top Bar Navigation</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={catHome}
                        onChange={(e) => setCatHome(e.target.checked)}
                        className="accent-[#6E1723]"
                      />
                      <span>Display Category Section on Homepage</span>
                    </label>
                    <button
                      type="submit"
                      className="w-full py-2 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] cursor-pointer"
                    >
                      Save Category
                    </button>
                  </form>

                  <div className="lg:col-span-8 bg-white border border-[#E7E5E2] p-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans mb-4">
                      Active Editorial Categories ({categories.length})
                    </h3>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b-2 border-[#171717] bg-[#F7F5F2]">
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">URL Path</th>
                          <th className="py-2.5 px-3 text-center">In Top Nav</th>
                          <th className="py-2.5 px-3 text-center">On Homepage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((c) => (
                          <tr key={c.id} className="border-b border-[#E7E5E2]">
                            <td className="py-3 px-3 font-semibold text-[#171717]">{c.name}</td>
                            <td className="py-3 px-3 font-mono-tabular text-[#6B6B6B]">
                              /{c.slug}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={c.showInNav}
                                onChange={() => handleToggleCategoryFlag(c, 'showInNav')}
                                className="accent-[#6E1723] cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={c.showOnHomepage}
                                onChange={() => handleToggleCategoryFlag(c, 'showOnHomepage')}
                                className="accent-[#6E1723] cursor-pointer"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. MEDIA LIBRARY (Section 16) */}
              {activeTab === 'media' && (
                <div className="space-y-8">
                  <form
                    onSubmit={handleUploadMedia}
                    className="bg-white border border-[#E7E5E2] p-6 space-y-4"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans">
                      Upload Image to Private Media Library (JPG, PNG, WebP)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Select Local Image File
                        </label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleFileUpload}
                          className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-semibold file:bg-[#6E1723] file:text-white cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Or Paste Direct Image URL
                        </label>
                        <input
                          type="text"
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          placeholder="/src/assets/images/..."
                          className="w-full px-3 py-1.5 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Image Title</label>
                        <input
                          type="text"
                          value={mediaTitle}
                          onChange={(e) => setMediaTitle(e.target.value)}
                          placeholder="Geneva Plenary Session"
                          className="w-full px-3 py-1.5 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Alt Text (Accessibility)</label>
                        <input
                          type="text"
                          value={mediaAlt}
                          onChange={(e) => setMediaAlt(e.target.value)}
                          placeholder="Descriptive alt text for screen readers"
                          className="w-full px-3 py-1.5 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Editorial Caption</label>
                        <input
                          type="text"
                          value={mediaCaption}
                          onChange={(e) => setMediaCaption(e.target.value)}
                          placeholder="Fig. — Credit & location caption"
                          className="w-full px-3 py-1.5 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] cursor-pointer"
                    >
                      Add to Media Library
                    </button>
                  </form>

                  <div className="bg-white border border-[#E7E5E2] p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans">
                        Stored Editorial Media Assets ({media.length})
                      </h3>
                      <input
                        type="text"
                        value={mediaSearch}
                        onChange={(e) => setMediaSearch(e.target.value)}
                        placeholder="Search media by title or caption..."
                        className="px-3 py-1.5 text-xs bg-[#F7F5F2] border border-[#E7E5E2] w-64"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {media
                        .filter(
                          (m) =>
                            !mediaSearch ||
                            m.title.toLowerCase().includes(mediaSearch.toLowerCase()) ||
                            m.caption.toLowerCase().includes(mediaSearch.toLowerCase())
                        )
                        .map((item) => (
                          <div
                            key={item.id}
                            className="border border-[#E7E5E2] p-3 flex flex-col justify-between gap-3"
                          >
                            <div>
                              <EditorialImage
                                src={item.url}
                                alt={item.altText}
                                aspectClass="aspect-[16/9]"
                              />
                              <h4 className="text-xs font-semibold text-[#171717] mt-2">
                                {item.title}
                              </h4>
                              <p className="text-[11px] text-[#6B6B6B] line-clamp-2 mt-0.5">
                                {item.caption}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-[#E7E5E2] text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(item.url);
                                  showToast('Image URL copied to clipboard.');
                                }}
                                className="flex items-center gap-1 text-[#6E1723] font-semibold hover:underline cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy URL</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const res = await fetch(`/api/admin/media/${item.id}`, {
                                    method: 'DELETE',
                                    headers: { Authorization: `Bearer ${authToken}` },
                                  });
                                  if (res.ok) {
                                    const d = await res.json();
                                    setMedia(d.media);
                                    showToast('Media item removed.');
                                  }
                                }}
                                className="text-[#8C2634] hover:underline cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 7. AUTHORS MANAGER (Section 28) */}
              {activeTab === 'authors' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <form
                    onSubmit={handleAddAuthor}
                    className="lg:col-span-4 bg-white border border-[#E7E5E2] p-5 space-y-4 h-fit"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans border-b border-[#E7E5E2] pb-2">
                      Add Correspondent / Author
                    </h3>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="Dr. Henrik Lindqvist"
                        className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Editorial Title / Role</label>
                      <input
                        type="text"
                        value={authorRole}
                        onChange={(e) => setAuthorRole(e.target.value)}
                        placeholder="Senior Diplomatic Correspondent"
                        className="w-full px-3 py-2 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Bureau Location</label>
                      <input
                        type="text"
                        value={authorLocation}
                        onChange={(e) => setAuthorLocation(e.target.value)}
                        placeholder="Geneva & London"
                        className="w-full px-3 py-2 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Private Editorial Email
                      </label>
                      <input
                        type="email"
                        value={authorEmail}
                        onChange={(e) => setAuthorEmail(e.target.value)}
                        placeholder="correspondent@worldpulse.press"
                        className="w-full px-3 py-2 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Biography</label>
                      <textarea
                        rows={3}
                        value={authorBio}
                        onChange={(e) => setAuthorBio(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] cursor-pointer"
                    >
                      Save Author Profile
                    </button>
                  </form>

                  <div className="lg:col-span-8 space-y-4">
                    {authors.map((a) => (
                      <div
                        key={a.id}
                        className="bg-white border border-[#E7E5E2] p-5 flex items-start gap-4"
                      >
                        <img
                          src={a.photo}
                          alt={a.name}
                          className="w-14 h-14 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-editorial text-lg font-semibold text-[#171717]">
                              {a.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => onNavigatePublic(`/author/${a.slug}`)}
                              className="text-xs font-semibold text-[#6E1723] hover:underline cursor-pointer"
                            >
                              View Public Profile →
                            </button>
                          </div>
                          <p className="text-xs text-[#6E1723] font-semibold">
                            {a.role} · {a.location}
                          </p>
                          <p className="text-xs text-[#6B6B6B] mt-1.5">{a.bio}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 8. COMMENTS MODERATION (Section 38) */}
              {activeTab === 'comments' && (
                <div className="space-y-6">
                  {siteSettings && (
                    <div className="bg-white border border-[#E7E5E2] p-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#171717]">
                          Global Reader Comments System
                        </h3>
                        <p className="text-xs text-[#6B6B6B]">
                          Enable or disable reader discussions across all public articles. User email addresses are strictly private.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={siteSettings.commentsEnabled}
                          onChange={async (e) => {
                            const updated = {
                              ...siteSettings,
                              commentsEnabled: e.target.checked,
                            };
                            setSiteSettings(updated);
                            await fetch('/api/admin/settings', {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${authToken}`,
                              },
                              body: JSON.stringify(updated),
                            });
                            onRefreshPublicData();
                            showToast('Global comment setting updated.');
                          }}
                          className="accent-[#6E1723] w-4 h-4"
                        />
                        <span>Comments Enabled</span>
                      </label>
                    </div>
                  )}

                  <div className="bg-white border border-[#E7E5E2] divide-y divide-[#E7E5E2]">
                    {comments.map((c) => (
                      <div key={c.id} className="p-5 flex flex-col sm:flex-row justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-[#171717]">{c.authorName}</span>
                            <span className="text-[#6B6B6B]">({c.authorEmail || 'Private'})</span>
                            <span>·</span>
                            <span className="uppercase font-mono-tabular font-semibold text-[#6E1723]">
                              {c.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#6B6B6B]">Article: {c.articleTitle}</p>
                          <p className="text-sm text-[#171717] pt-1">{c.content}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start">
                          <button
                            type="button"
                            onClick={() => handleCommentModeration(c.id, 'approved')}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-700 text-white cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCommentModeration(c.id, 'rejected')}
                            className="px-2.5 py-1 text-xs font-semibold border border-[#E7E5E2] text-[#171717] cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCommentModeration(c.id, 'spam')}
                            className="px-2.5 py-1 text-xs font-semibold border border-amber-600 text-amber-700 cursor-pointer"
                          >
                            Spam
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. ADVERTISEMENT MANAGEMENT SYSTEM (Section 23) */}
              {activeTab === 'ads' && (
                <div className="space-y-6">
                  <div className="bg-white border border-[#E7E5E2] p-5">
                    <h2 className="font-editorial text-2xl font-semibold text-[#171717]">
                      Advertisement Placement & AdSense Configuration
                    </h2>
                    <p className="text-xs text-[#6B6B6B] mt-1">
                      Configure all 10 standard publication placements. Strictly policy-compliant: no incentivized clicks or intrusive popups.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {ads.map((ad, idx) => (
                      <div key={ad.id} className="bg-white border border-[#E7E5E2] p-5 space-y-3">
                        <div className="flex items-center justify-between border-b border-[#E7E5E2] pb-2">
                          <div>
                            <h3 className="text-sm font-bold text-[#171717] font-sans">{ad.name}</h3>
                            <span className="font-mono-tabular text-[11px] text-[#6B6B6B]">
                              Slot Key: {ad.slotKey}
                            </span>
                          </div>
                          <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ad.enabled}
                              onChange={(e) => {
                                const next = [...ads];
                                next[idx] = { ...ad, enabled: e.target.checked };
                                setAds(next);
                              }}
                              className="accent-[#6E1723]"
                            />
                            <span>Enabled</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block font-semibold mb-1">Publisher ID</label>
                            <input
                              type="text"
                              value={ad.publisherId}
                              onChange={(e) => {
                                const next = [...ads];
                                next[idx] = { ...ad, publisherId: e.target.value };
                                setAds(next);
                              }}
                              className="w-full px-2.5 py-1.5 font-mono-tabular bg-[#F7F5F2] border border-[#E7E5E2]"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold mb-1">Ad Slot ID</label>
                            <input
                              type="text"
                              value={ad.adSlotId}
                              onChange={(e) => {
                                const next = [...ads];
                                next[idx] = { ...ad, adSlotId: e.target.value };
                                setAds(next);
                              }}
                              className="w-full px-2.5 py-1.5 font-mono-tabular bg-[#F7F5F2] border border-[#E7E5E2]"
                            />
                          </div>
                        </div>

                        <div className="text-xs">
                          <label className="block font-semibold mb-1">
                            Sponsor Headline / House Message
                          </label>
                          <input
                            type="text"
                            value={ad.headline || ''}
                            onChange={(e) => {
                              const next = [...ads];
                              next[idx] = { ...ad, headline: e.target.value };
                              setAds(next);
                            }}
                            className="w-full px-2.5 py-1.5 bg-[#F7F5F2] border border-[#E7E5E2]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveAd(ads[idx])}
                          className="px-4 py-1.5 text-xs font-semibold bg-[#171717] text-white hover:bg-[#6E1723] transition-colors cursor-pointer"
                        >
                          Save Slot Settings
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 10. ANALYTICS & AUDIENCE TELEMETRY (Section 25) */}
              {activeTab === 'analytics' && analytics && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border border-[#E7E5E2] p-5">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans mb-3">
                        Traffic Sources
                      </h3>
                      <div className="space-y-2.5 text-xs">
                        {analytics.trafficSources.map((src) => (
                          <div key={src.source}>
                            <div className="flex justify-between mb-1">
                              <span>{src.source}</span>
                              <span className="font-mono-tabular font-semibold">
                                {src.percentage}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-[#F7F5F2]">
                              <div
                                className="h-full bg-[#6E1723]"
                                style={{ width: `${src.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-[#E7E5E2] p-5">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans mb-3">
                        Top Readership Regions
                      </h3>
                      <div className="space-y-2 text-xs">
                        {analytics.topCountries.map((c) => (
                          <div
                            key={c.code}
                            className="flex items-center justify-between py-1 border-b border-[#E7E5E2] last:border-0"
                          >
                            <span>{c.country}</span>
                            <span className="font-mono-tabular font-semibold">
                              {c.views.toLocaleString()} ({c.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-[#E7E5E2] p-5">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans mb-3">
                        Top Site Search Queries
                      </h3>
                      <div className="space-y-2 text-xs">
                        {analytics.topSearchQueries.map((q) => (
                          <div
                            key={q.query}
                            className="flex items-center justify-between py-1 border-b border-[#E7E5E2] last:border-0"
                          >
                            <span className="truncate">“{q.query}”</span>
                            <span className="font-mono-tabular font-semibold">{q.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 11. SEO & GOOGLE NEWS READINESS (Sections 21 & 22) */}
              {activeTab === 'seo' && siteSettings && (
                <div className="bg-white border border-[#E7E5E2] p-6 space-y-5">
                  <h2 className="font-editorial text-2xl font-semibold text-[#171717]">
                    SEO Architecture & Google News / Discover Readiness
                  </h2>
                  <p className="text-sm text-[#6B6B6B]">
                    WORLDPULSE automatically generates `NewsArticle` and `BreadcrumbList` JSON-LD
                    structured data, canonical URLs, OpenGraph cards, and dynamic XML sitemaps while
                    excluding `/admin` and draft articles from indexing.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="/sitemap.xml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-xs font-semibold bg-[#6E1723] text-white"
                    >
                      Inspect Live /sitemap.xml →
                    </a>
                    <a
                      href="/robots.txt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-xs font-semibold border border-[#171717] text-[#171717]"
                    >
                      Inspect Live /robots.txt →
                    </a>
                  </div>
                </div>
              )}

              {/* 12, 13, 14. SITE SETTINGS, SOCIAL MEDIA, & NEWSLETTER */}
              {(activeTab === 'settings' ||
                activeTab === 'social' ||
                activeTab === 'newsletter') &&
                siteSettings && (
                  <form
                    onSubmit={handleSaveSiteSettings}
                    className="bg-white border border-[#E7E5E2] p-6 space-y-5 max-w-2xl"
                  >
                    <h2 className="font-editorial text-2xl font-semibold text-[#171717]">
                      {activeTab === 'settings'
                        ? 'Publication & Analytics Settings'
                        : activeTab === 'social'
                        ? 'Global Social Media Channels'
                        : 'Newsletter Configuration & Subscribers'}
                    </h2>

                    {activeTab === 'settings' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Publication Name</label>
                          <input
                            type="text"
                            value={siteSettings.siteName}
                            onChange={(e) =>
                              setSiteSettings({ ...siteSettings, siteName: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Tagline</label>
                          <input
                            type="text"
                            value={siteSettings.tagline}
                            onChange={(e) =>
                              setSiteSettings({ ...siteSettings, tagline: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold mb-1">
                              Google Analytics Measurement ID
                            </label>
                            <input
                              type="text"
                              value={siteSettings.googleAnalyticsId}
                              onChange={(e) =>
                                setSiteSettings({
                                  ...siteSettings,
                                  googleAnalyticsId: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F5F2] border border-[#E7E5E2]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1">
                              Google Search Console Verification
                            </label>
                            <input
                              type="text"
                              value={siteSettings.googleSearchConsoleCode}
                              onChange={(e) =>
                                setSiteSettings({
                                  ...siteSettings,
                                  googleSearchConsoleCode: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F7F5F2] border border-[#E7E5E2]"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {activeTab === 'social' && (
                      <div className="space-y-3">
                        {(['x', 'facebook', 'instagram', 'youtube', 'linkedin', 'tiktok'] as const).map(
                          (platform) => (
                            <div key={platform}>
                              <label className="block text-xs font-semibold uppercase mb-1">
                                {platform} URL
                              </label>
                              <input
                                type="text"
                                value={siteSettings.social[platform]}
                                onChange={(e) =>
                                  setSiteSettings({
                                    ...siteSettings,
                                    social: {
                                      ...siteSettings.social,
                                      [platform]: e.target.value,
                                    },
                                  })
                                }
                                className="w-full px-3 py-2 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {activeTab === 'newsletter' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Newsletter Heading
                          </label>
                          <input
                            type="text"
                            value={siteSettings.newsletter.title}
                            onChange={(e) =>
                              setSiteSettings({
                                ...siteSettings,
                                newsletter: {
                                  ...siteSettings.newsletter,
                                  title: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Provider Integration (Mailchimp, Brevo, ConvertKit)
                          </label>
                          <select
                            value={siteSettings.newsletter.provider}
                            onChange={(e) =>
                              setSiteSettings({
                                ...siteSettings,
                                newsletter: {
                                  ...siteSettings.newsletter,
                                  provider: e.target.value as SiteSettings['newsletter']['provider'],
                                },
                              })
                            }
                            className="w-full px-3 py-2 text-xs bg-[#F7F5F2] border border-[#E7E5E2]"
                          >
                            <option value="internal">WORLDPULSE Built-in Subscriber Database</option>
                            <option value="mailchimp">Mailchimp Embedded Action</option>
                            <option value="brevo">Brevo (Sendinblue) API / Form</option>
                            <option value="convertkit">ConvertKit Form Action</option>
                          </select>
                        </div>

                        <div className="pt-4 border-t border-[#E7E5E2]">
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-2">
                            Recent Subscribed Emails ({subscribers.length})
                          </h4>
                          <div className="max-h-44 overflow-y-auto bg-[#F7F5F2] p-3 space-y-1.5 text-xs font-mono-tabular">
                            {subscribers.map((s, i) => (
                              <div key={i} className="flex justify-between">
                                <span>{s.email}</span>
                                <span className="text-[#6B6B6B]">{s.source}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </form>
                )}

              {/* 15. PRODUCTION DEPLOYMENT GUIDE (Section 50) */}
              {activeTab === 'deployment' && (
                <div className="bg-white border border-[#E7E5E2] p-6 space-y-5 max-w-3xl">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                    PRODUCTION READINESS RUNBOOK
                  </span>
                  <h2 className="font-editorial text-2xl font-semibold text-[#171717]">
                    13-Step Production Deployment & Operations Guide
                  </h2>
                  <ol className="list-decimal pl-5 space-y-2.5 text-sm text-[#171717] leading-relaxed">
                    <li>
                      <strong>Backend & API Server:</strong> Express server (`server.ts`) serves REST endpoints (`/api/*`), dynamic `/sitemap.xml`, `/robots.txt`, and low-latency `gemini-3.1-flash-lite` briefings.
                    </li>
                    <li>
                      <strong>Admin Account Security:</strong> Authenticated via `/api/auth/login` with hashed credentials and Bearer session tokens.
                    </li>
                    <li>
                      <strong>Database Persistence:</strong> Persistent database automatically initializes at `/data/worldpulse-db.json` (or connect external Firestore/PostgreSQL).
                    </li>
                    <li>
                      <strong>Media Storage:</strong> Upload JPG, PNG, and WebP assets via the Admin Media Library (`/admin` → Media Library).
                    </li>
                    <li>
                      <strong>Environment Variables:</strong> Configure `GEMINI_API_KEY` and `APP_URL` in `.env` or Cloud Run Secrets.
                    </li>
                    <li>
                      <strong>Production Build & Start:</strong> Run `npm run build` followed by `npm run start` (`node server.ts`).
                    </li>
                    <li>
                      <strong>Custom Domain:</strong> Map your custom domain (e.g., `worldpulse.press`) in Cloud Run / hosting DNS settings and set `APP_URL`.
                    </li>
                    <li>
                      <strong>Google Search Console:</strong> Add your verification token in Admin → Site Settings and submit `/sitemap.xml`.
                    </li>
                    <li>
                      <strong>Google Analytics:</strong> Add your `G-XXXXXXXXXX` Measurement ID in Admin → Site Settings.
                    </li>
                    <li>
                      <strong>Advertising Network Credentials:</strong> Enter your AdSense Publisher ID (`ca-pub-...`) and Slot IDs in Admin → Advertisements.
                    </li>
                    <li>
                      <strong>Social Media Channels:</strong> Update X, Facebook, Instagram, YouTube, and LinkedIn URLs in Admin → Social Media Links.
                    </li>
                    <li>
                      <strong>XML News Sitemap:</strong> Automatically generated at `/sitemap.xml` with Google News `&lt;news:news&gt;` tags.
                    </li>
                    <li>
                      <strong>Production Quality Verification:</strong> Remove sample demo articles in one click from Admin → Dashboard Overview before launch.
                    </li>
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

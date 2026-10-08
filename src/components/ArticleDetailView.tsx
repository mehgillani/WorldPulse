import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Check,
  Copy,
  Globe,
  Share2,
  Sparkles,
  Volume2,
  Square,
  ArrowLeft,
} from 'lucide-react';
import {
  AdPlacement,
  Article,
  ArticleComment,
  Author,
  SiteSettings,
} from '../types/editorial';
import { EditorialImage } from './EditorialImage';
import { AdvertisementSlot } from './AdvertisementSlot';
import { ArticleCard, formatEditorialDate } from './ArticleCard';
import { NewsletterSignup } from './NewsletterSignup';
import { auth, createCommentInFirestore } from '../firebase';

interface ArticleDetailViewProps {
  article: Article;
  allArticles: Article[];
  authors: Author[];
  ads: AdPlacement[];
  comments: ArticleComment[];
  siteSettings: SiteSettings;
  isSavedOffline: boolean;
  onToggleOffline: (article: Article) => void;
  onNavigate: (path: string) => void;
  onCommentSubmitted: (newComment: ArticleComment) => void;
}

export const ArticleDetailView: React.FC<ArticleDetailViewProps> = ({
  article,
  allArticles,
  authors,
  ads,
  comments,
  siteSettings,
  isSavedOffline,
  onToggleOffline,
  onNavigate,
  onCommentSubmitted,
}) => {
  const [readProgress, setReadProgress] = useState(0);
  const [textScale, setTextScale] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [copiedLink, setCopiedLink] = useState(false);

  // Low-latency Gemini 3.1 Flash-Lite state
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefData, setBriefData] = useState<{
    bullets: string[];
    whyItMatters: string;
    translatedTitle?: string;
    latencyMs?: number;
    model?: string;
  } | null>(null);
  const [selectedLang, setSelectedLang] = useState('Spanish');

  // Audio reader (Web Speech synthesis for remote/accessibility reading)
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Comment form state
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [commentStatus, setCommentStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>(
    'idle'
  );
  const [commentFeedback, setCommentFeedback] = useState('');

  const authorObj = authors.find((a) => a.id === article.authorId) || authors[0];
  const articleComments = comments.filter((c) => c.articleId === article.id);

  // Related articles based on category or shared tags (Section 29)
  const relatedArticles = allArticles
    .filter(
      (a) =>
        a.id !== article.id &&
        a.status === 'published' &&
        (a.category === article.category || a.tags.some((t) => article.tags.includes(t)))
    )
    .slice(0, 3);

  useEffect(() => {
    setBriefData(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Record view in backend
    fetch(`/api/articles/${article.id}/view`, { method: 'POST' }).catch(() => {});

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [article.id]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setReadProgress(100);
      } else {
        setReadProgress(Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGenerateBrief = async (mode: 'brief' | 'translate' = 'brief', lang = selectedLang) => {
    setBriefLoading(true);
    try {
      const res = await fetch('/api/ai/flash-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          mode,
          targetLanguage: lang,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBriefData(data);
      }
    } catch {
      // fallback
    } finally {
      setBriefLoading(false);
    }
  };

  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const plainText = `${article.title}. ${article.subtitle}. ${article.body
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')}`;
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const shareUrl = `${window.location.origin}/${article.category}/${article.slug}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(`${article.title} — WORLDPULSE`);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentEmail.trim() || !commentContent.trim()) return;
    setCommentStatus('submitting');
    try {
      const res = await fetch(`/api/articles/${article.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: commentName,
          email: commentEmail,
          content: commentContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post comment.');
      if (auth.currentUser) {
        try {
          await createCommentInFirestore(data.comment, auth.currentUser.uid);
        } catch {
          // Handled by Firestore error logger
        }
      }
      onCommentSubmitted(data.comment);
      setCommentName('');
      setCommentEmail('');
      setCommentContent('');
      setCommentStatus('success');
      setCommentFeedback('Thank you. Your comment has been published to the discussion.');
    } catch (err) {
      setCommentStatus('error');
      setCommentFeedback(err instanceof Error ? err.message : 'Unable to submit comment.');
    }
  };

  return (
    <div className="relative">
      {/* Reading Progress Bar (Section 47) */}
      <div className="fixed top-14 left-0 right-0 h-1 bg-[#E7E5E2] z-30">
        <div
          className="h-full bg-[#6E1723] transition-transform duration-150 origin-left"
          style={{ transform: `scaleX(${readProgress / 100})` }}
        />
      </div>

      <article className="max-w-[1160px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-16">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#6B6B6B] mb-6">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="flex items-center gap-1 hover:text-[#6E1723] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <span aria-hidden="true">/</span>
          <a
            href={`/${article.category}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(`/${article.category}`);
            }}
            className="font-bold uppercase tracking-wider text-[#6E1723] hover:underline"
          >
            {article.categoryName}
          </a>
          {article.isDeveloping && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold uppercase tracking-wider text-[#8C2634]">
                Developing Story
              </span>
            </>
          )}
          {article.isDemo && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#6B6B6B]">Sample Demo Content</span>
            </>
          )}
        </nav>

        <AdvertisementSlot slotKey="article_top" ads={ads} onNavigate={onNavigate} />

        {/* Article Header */}
        <header className="max-w-3xl">
          <h1 className="font-editorial text-3xl sm:text-5xl font-semibold text-[#171717] leading-[1.14]">
            {article.title}
          </h1>

          <p className="mt-4 text-lg sm:text-xl text-[#171717]/80 leading-relaxed font-normal">
            {article.subtitle}
          </p>

          {/* Byline & Timestamps */}
          <div className="mt-6 pt-5 border-t border-b border-[#E7E5E2] py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#6B6B6B]">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#171717]">
                <span>By</span>
                <a
                  href={`/author/${authorObj?.slug || 'elena-rostova'}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(`/author/${authorObj?.slug || 'elena-rostova'}`);
                  }}
                  className="font-semibold text-[#6E1723] hover:underline"
                >
                  {article.authorName}
                </a>
                {article.authorRole && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-xs text-[#6B6B6B]">{article.authorRole}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-xs">
                <span>Published: {formatEditorialDate(article.publishedAt)}</span>
                <span aria-hidden="true">·</span>
                <span>Updated: {formatEditorialDate(article.updatedAt)}</span>
                <span aria-hidden="true">·</span>
                <span>{article.readingTime} min read</span>
                <span aria-hidden="true">·</span>
                <span>{article.views.toLocaleString()} views</span>
              </div>
            </div>

            {/* Reader Utility Tools: Audio, Font Scale, Offline Save */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToggleSpeech}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E7E5E2] text-[#171717] hover:border-[#6E1723] transition-colors whitespace-nowrap cursor-pointer"
                title="Listen to article audio"
              >
                {isSpeaking ? <Square className="w-3.5 h-3.5 text-[#6E1723]" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{isSpeaking ? 'Stop Audio' : 'Listen'}</span>
              </button>

              <div className="flex items-center border border-[#E7E5E2] bg-white">
                <button
                  type="button"
                  onClick={() => setTextScale('normal')}
                  className={`px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                    textScale === 'normal' ? 'bg-[#171717] text-white' : 'text-[#6B6B6B]'
                  }`}
                  title="Standard text size"
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => setTextScale('large')}
                  className={`px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                    textScale === 'large' ? 'bg-[#171717] text-white' : 'text-[#6B6B6B]'
                  }`}
                  title="Large text size"
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => setTextScale('xlarge')}
                  className={`px-2.5 py-1.5 text-xs font-bold cursor-pointer ${
                    textScale === 'xlarge' ? 'bg-[#171717] text-white' : 'text-[#6B6B6B]'
                  }`}
                  title="Extra large text size"
                >
                  A++
                </button>
              </div>

              <button
                type="button"
                onClick={() => onToggleOffline(article)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                  isSavedOffline
                    ? 'bg-[#6E1723] text-white border-[#6E1723]'
                    : 'bg-white text-[#171717] border-[#E7E5E2] hover:border-[#6E1723]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{isSavedOffline ? 'Saved Offline' : 'Save Offline'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Featured Image & Caption */}
        <figure className="mt-8 max-w-4xl">
          <EditorialImage
            src={article.featuredImage}
            alt={article.title}
            categoryName={article.categoryName}
            aspectClass="aspect-[16/9]"
            priority={true}
          />
          {article.imageCaption && (
            <figcaption className="mt-2.5 text-xs text-[#6B6B6B] border-l-2 border-[#6E1723] pl-3">
              {article.imageCaption}
            </figcaption>
          )}
        </figure>

        {/* Two-Column Asymmetric Reading Canvas (Main Prose + Editorial Rail) */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left/Main Column: Long-Form Article Body */}
          <div className="lg:col-span-8">
            {/* Low-Latency Gemini 3.1 Flash-Lite Executive Briefing Bar */}
            <div className="mb-8 bg-white border border-[#E7E5E2] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#6E1723]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                    WORLDPULSE FLASH BRIEF
                  </span>
                  <span className="text-xs text-[#6B6B6B]">· Low-Latency Executive Synthesis</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateBrief('brief')}
                    disabled={briefLoading}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
                  >
                    {briefLoading ? 'Synthesizing...' : briefData ? 'Refresh Brief' : 'Generate 3-Point Brief'}
                  </button>

                  <div className="flex items-center gap-1 border border-[#E7E5E2] bg-[#F7F5F2] px-2 py-1">
                    <Globe className="w-3.5 h-3.5 text-[#6B6B6B]" />
                    <select
                      aria-label="Select translation language"
                      value={selectedLang}
                      onChange={(e) => {
                        setSelectedLang(e.target.value);
                        handleGenerateBrief('translate', e.target.value);
                      }}
                      className="text-xs bg-transparent text-[#171717] focus:outline-none cursor-pointer"
                    >
                      <option value="Spanish">Translate Brief: ES</option>
                      <option value="French">Translate Brief: FR</option>
                      <option value="German">Translate Brief: DE</option>
                      <option value="Arabic">Translate Brief: AR</option>
                      <option value="Japanese">Translate Brief: JA</option>
                    </select>
                  </div>
                </div>
              </div>

              {briefData && (
                <div className="mt-4 pt-4 border-t border-[#E7E5E2] space-y-3 text-sm">
                  {briefData.translatedTitle && (
                    <p className="font-editorial font-semibold text-base text-[#171717]">
                      {briefData.translatedTitle}
                    </p>
                  )}
                  <ul className="list-disc pl-5 space-y-1.5 text-[#171717]">
                    {briefData.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                  {briefData.whyItMatters && (
                    <p className="text-xs text-[#6B6B6B] pt-2 border-t border-[#E7E5E2]">
                      <strong className="text-[#171717] uppercase tracking-wider">
                        Global Context:{' '}
                      </strong>
                      {briefData.whyItMatters}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Developing Story Live Timeline (Section 18) */}
            {article.isDeveloping &&
              article.developingUpdates &&
              article.developingUpdates.length > 0 && (
                <div className="mb-8 bg-white border-l-4 border-[#6E1723] p-5 border-t border-r border-b border-t-[#E7E5E2] border-r-[#E7E5E2] border-b-[#E7E5E2]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                      Developing Story · Live Updates
                    </span>
                    <span className="font-mono-tabular text-xs text-[#6B6B6B]">
                      Last Updated: {formatEditorialDate(article.updatedAt)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {article.developingUpdates.map((upd) => (
                      <div
                        key={upd.id}
                        className="flex flex-col sm:flex-row sm:items-baseline gap-2 pb-2.5 border-b border-[#E7E5E2] last:border-b-0 last:pb-0 text-sm"
                      >
                        <span className="font-mono-tabular text-xs font-semibold text-[#6E1723] shrink-0">
                          {upd.timestamp}
                        </span>
                        <span className="text-[#171717]">{upd.summary}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Main Rich-Text Article Body */}
            <div
              className={`wp-article-prose max-w-[68ch] ${
                textScale === 'large'
                  ? 'text-[1.28rem] leading-[1.85]'
                  : textScale === 'xlarge'
                  ? 'text-[1.42rem] leading-[1.9]'
                  : ''
              }`}
              dangerouslySetInnerHTML={{ __html: article.body }}
            />

            {/* Inline Middle Advertisement Placement */}
            <AdvertisementSlot slotKey="article_middle" ads={ads} onNavigate={onNavigate} />

            {/* Article Tags for Archive Discovery */}
            {article.tags.length > 0 && (
              <div className="mt-8 pt-6 border-t border-[#E7E5E2] flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-[#6B6B6B] mr-2">
                  Topics & Archive Tags:
                </span>
                {article.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onNavigate(`/tag/${encodeURIComponent(tag)}`)}
                    className="px-3 py-1.5 bg-white border border-[#E7E5E2] text-[#171717] hover:border-[#6E1723] hover:text-[#6E1723] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Social Media Sharing Tools (Section 27) */}
            <div className="mt-6 pt-6 border-t border-[#E7E5E2] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#171717]">
                <Share2 className="w-4 h-4 text-[#6E1723]" />
                <span>Share This Dispatch</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white border border-[#E7E5E2] text-[#171717] hover:border-[#6E1723] transition-colors whitespace-nowrap"
                >
                  X / Twitter
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white border border-[#E7E5E2] text-[#171717] hover:border-[#6E1723] transition-colors whitespace-nowrap"
                >
                  Facebook
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white border border-[#E7E5E2] text-[#171717] hover:border-[#6E1723] transition-colors whitespace-nowrap"
                >
                  LinkedIn
                </a>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white border border-[#E7E5E2] text-[#171717] hover:border-[#6E1723] transition-colors whitespace-nowrap"
                >
                  WhatsApp
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white border border-[#E7E5E2] text-[#171717] hover:border-[#6E1723] transition-colors whitespace-nowrap"
                >
                  Telegram
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171717] text-white hover:bg-[#6E1723] transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Author Biography Box (Section 28) */}
            {authorObj && (
              <div className="mt-8 bg-white border border-[#E7E5E2] p-6 flex flex-col sm:flex-row items-start gap-5">
                <img
                  src={authorObj.photo}
                  alt={authorObj.name}
                  className="w-16 h-16 rounded-full object-cover shrink-0 border border-[#E7E5E2]"
                />
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6B6B]">
                    <span className="font-bold uppercase tracking-wider text-[#6E1723]">
                      {authorObj.role}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{authorObj.location}</span>
                  </div>
                  <h3 className="font-editorial text-xl font-semibold text-[#171717]">
                    <a
                      href={`/author/${authorObj.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(`/author/${authorObj.slug}`);
                      }}
                      className="hover:text-[#6E1723]"
                    >
                      {authorObj.name}
                    </a>
                  </h3>
                  <p className="text-sm text-[#6B6B6B] leading-relaxed">{authorObj.bio}</p>
                  <button
                    type="button"
                    onClick={() => onNavigate(`/author/${authorObj.slug}`)}
                    className="pt-1 text-xs font-semibold text-[#6E1723] hover:underline cursor-pointer"
                  >
                    View all dispatches by {authorObj.name} →
                  </button>
                </div>
              </div>
            )}

            <AdvertisementSlot slotKey="article_bottom" ads={ads} onNavigate={onNavigate} />

            {/* Reader Comments Section (Section 38) */}
            {siteSettings.commentsEnabled && (
              <section aria-label="Reader Discussion" className="mt-12 pt-8 border-t border-[#E7E5E2]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-editorial text-2xl font-semibold text-[#171717]">
                    Reader Discussion ({articleComments.length})
                  </h2>
                  <span className="text-xs text-[#6B6B6B]">
                    Moderated Forum · Emails are never displayed publicly
                  </span>
                </div>

                {/* Comment Submission Form */}
                <form
                  onSubmit={handleCommentSubmit}
                  className="bg-white border border-[#E7E5E2] p-5 space-y-4 mb-8"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="cmt-name"
                        className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1"
                      >
                        Your Name
                      </label>
                      <input
                        id="cmt-name"
                        type="text"
                        required
                        value={commentName}
                        onChange={(e) => setCommentName(e.target.value)}
                        placeholder="Dr. Sofia Lind"
                        className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2] focus:outline-none focus:border-[#6E1723]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cmt-email"
                        className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1"
                      >
                        Email Address (Kept Private)
                      </label>
                      <input
                        id="cmt-email"
                        type="email"
                        required
                        value={commentEmail}
                        onChange={(e) => setCommentEmail(e.target.value)}
                        placeholder="name@institution.org"
                        className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2] focus:outline-none focus:border-[#6E1723]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="cmt-body"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1"
                    >
                      Perspective or Contribution
                    </label>
                    <textarea
                      id="cmt-body"
                      rows={3}
                      required
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Share an informed perspective on this story..."
                      className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2] focus:outline-none focus:border-[#6E1723]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-[#6B6B6B]">
                      Comments are subject to WORLDPULSE editorial standards.
                    </span>
                    <button
                      type="submit"
                      disabled={commentStatus === 'submitting'}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#6E1723] text-white hover:bg-[#4A0F18] transition-colors cursor-pointer"
                    >
                      {commentStatus === 'submitting' ? 'Submitting...' : 'Post Comment'}
                    </button>
                  </div>

                  {commentFeedback && (
                    <p
                      className={`text-xs font-medium ${
                        commentStatus === 'success' ? 'text-emerald-700' : 'text-[#8C2634]'
                      }`}
                    >
                      {commentFeedback}
                    </p>
                  )}
                </form>

                {/* Approved Comments List */}
                <div className="space-y-4">
                  {articleComments.length === 0 ? (
                    <p className="text-sm text-[#6B6B6B] py-4">
                      No reader perspectives posted yet. Be the first to contribute.
                    </p>
                  ) : (
                    articleComments.map((cmt) => (
                      <div key={cmt.id} className="bg-white border border-[#E7E5E2] p-4">
                        <div className="flex items-center justify-between text-xs text-[#6B6B6B] mb-2">
                          <span className="font-semibold text-[#171717]">{cmt.authorName}</span>
                          <time className="font-mono-tabular">
                            {formatEditorialDate(cmt.createdAt)}
                          </time>
                        </div>
                        <p className="text-sm text-[#171717] leading-relaxed">{cmt.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Margin Rail (Most Read + Sidebar Ad + Newsletter) */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="bg-white border border-[#E7E5E2] p-5">
              <div className="border-b-2 border-[#171717] pb-2.5 mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans">
                  Most Read Globally
                </h2>
                <span className="text-[11px] text-[#6B6B6B]">Top Dispatches</span>
              </div>
              <div>
                {[...allArticles]
                  .filter((a) => a.status === 'published')
                  .sort((a, b) => b.views - a.views)
                  .slice(0, 5)
                  .map((item, idx) => (
                    <ArticleCard
                      key={item.id}
                      article={item}
                      variant="numbered"
                      rankNumber={idx + 1}
                      onNavigate={onNavigate}
                    />
                  ))}
              </div>
            </div>

            <AdvertisementSlot slotKey="sidebar" ads={ads} onNavigate={onNavigate} />

            <NewsletterSignup siteSettings={siteSettings} source="article_sidebar" compact={true} />
          </aside>
        </div>

        {/* You May Also Like — Related Stories (Section 29) */}
        {relatedArticles.length > 0 && (
          <section aria-label="You May Also Like" className="mt-16 pt-10 border-t-2 border-[#171717]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                  CONTINUED READING
                </span>
                <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#171717]">
                  You May Also Like
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(`/${article.category}`)}
                className="text-xs font-semibold text-[#6E1723] hover:underline cursor-pointer"
              >
                More in {article.categoryName} →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((rel) => (
                <ArticleCard
                  key={rel.id}
                  article={rel}
                  variant="secondary"
                  onNavigate={onNavigate}
                  onToggleOffline={onToggleOffline}
                />
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
};

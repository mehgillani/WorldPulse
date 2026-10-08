import React from 'react';
import { Bookmark, Sparkles } from 'lucide-react';
import { Article } from '../types/editorial';
import { EditorialImage } from './EditorialImage';

interface ArticleCardProps {
  article: Article;
  variant?: 'lead' | 'secondary' | 'latest' | 'compact' | 'numbered';
  rankNumber?: number;
  isSavedOffline?: boolean;
  onNavigate: (path: string) => void;
  onToggleOffline?: (article: Article) => void;
  onRequestFlashBrief?: (article: Article) => void;
}

export function formatEditorialDate(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(isoDate));
  } catch {
    return 'Oct 8, 2026';
  }
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  variant = 'secondary',
  rankNumber,
  isSavedOffline = false,
  onNavigate,
  onToggleOffline,
  onRequestFlashBrief,
}) => {
  const articleUrl = `/${article.category}/${article.slug}`;

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(articleUrl);
  };

  // 1. LEAD STORY (Dominant focal anchor on homepage)
  if (variant === 'lead') {
    return (
      <article className="group bg-white border border-[#E7E5E2] p-5 sm:p-7 transition-colors">
        <a href={articleUrl} onClick={handleCardClick} className="block">
          <EditorialImage
            src={article.featuredImage}
            alt={article.title}
            categoryName={article.categoryName}
            aspectClass="aspect-[16/9]"
            priority={true}
          />
        </a>

        <div className="mt-5">
          {/* Unboxed Metadata Kicker (Zero-Pill Discipline) */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6B6B] mb-2.5">
            <a
              href={`/${article.category}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(`/${article.category}`);
              }}
              className="font-bold uppercase tracking-widest text-[#6E1723] hover:underline"
            >
              {article.categoryName}
            </a>
            {article.isDeveloping && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#8C2634] uppercase tracking-wider">
                  Developing Story
                </span>
              </>
            )}
            {article.isDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#6B6B6B]">Sample Demo Article</span>
              </>
            )}
          </div>

          <h1 className="font-editorial text-2xl sm:text-4xl font-semibold text-[#171717] leading-[1.18] group-hover:text-[#6E1723] transition-colors">
            <a href={articleUrl} onClick={handleCardClick}>
              {article.title}
            </a>
          </h1>

          <p className="mt-3 text-base text-[#171717]/80 leading-relaxed max-w-3xl">
            {article.subtitle}
          </p>

          {/* Developing Story Live Updates Preview */}
          {article.isDeveloping && article.developingUpdates && article.developingUpdates.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#E7E5E2] space-y-1.5">
              {article.developingUpdates.slice(0, 2).map((upd) => (
                <div key={upd.id} className="flex items-baseline gap-2.5 text-xs">
                  <span className="font-mono-tabular font-semibold text-[#6E1723] shrink-0">
                    {upd.timestamp}
                  </span>
                  <span className="text-[#171717]/85">{upd.summary}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Metadata & Interactive Reader Actions */}
          <div className="mt-5 pt-4 border-t border-[#E7E5E2] flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B6B6B]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-[#171717]">By {article.authorName}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={article.publishedAt} className="font-mono-tabular">
                {formatEditorialDate(article.publishedAt)}
              </time>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{article.readingTime} min read</span>
            </div>

            <div className="flex items-center gap-3">
              {onRequestFlashBrief && (
                <button
                  type="button"
                  onClick={() => onRequestFlashBrief(article)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6E1723] bg-[#F7F5F2] hover:bg-[#6E1723] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant Brief</span>
                </button>
              )}
              {onToggleOffline && (
                <button
                  type="button"
                  onClick={() => onToggleOffline(article)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSavedOffline
                      ? 'text-[#6E1723] font-semibold underline'
                      : 'text-[#6B6B6B] hover:text-[#171717]'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{isSavedOffline ? 'Saved Offline' : 'Save Offline'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  // 2. NUMBERED MOST-READ / TRENDING ROW
  if (variant === 'numbered') {
    return (
      <article className="group py-3.5 border-b border-[#E7E5E2] last:border-b-0 flex items-start gap-4">
        <span className="font-mono-tabular text-xl font-semibold text-[#6E1723] shrink-0 w-7 pt-0.5">
          {String(rankNumber || 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-[#6B6B6B] mb-1">
            <span className="font-bold uppercase tracking-wider text-[#6E1723]">
              {article.categoryName}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{article.readingTime} min read</span>
          </div>
          <h3 className="font-editorial text-base font-semibold text-[#171717] leading-snug group-hover:text-[#6E1723] transition-colors">
            <a href={articleUrl} onClick={handleCardClick}>
              {article.title}
            </a>
          </h3>
        </div>
      </article>
    );
  }

  // 3. COMPACT TEXT-LED ITEM
  if (variant === 'compact') {
    return (
      <article className="group py-4 border-b border-[#E7E5E2] last:border-b-0">
        <div className="flex items-center gap-2 text-xs text-[#6B6B6B] mb-1.5">
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
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt} className="font-mono-tabular">
            {formatEditorialDate(article.publishedAt)}
          </time>
        </div>

        <h3 className="font-editorial text-lg font-semibold text-[#171717] leading-snug group-hover:text-[#6E1723] transition-colors">
          <a href={articleUrl} onClick={handleCardClick}>
            {article.title}
          </a>
        </h3>

        <p className="mt-1.5 text-sm text-[#6B6B6B] line-clamp-2">{article.subtitle}</p>
      </article>
    );
  }

  // 4. LATEST CHRONOLOGICAL HORIZONTAL ROW
  if (variant === 'latest') {
    return (
      <article className="group py-5 border-b border-[#E7E5E2] flex flex-col sm:flex-row items-start gap-5">
        <a
          href={articleUrl}
          onClick={handleCardClick}
          className="w-full sm:w-56 shrink-0 block"
        >
          <EditorialImage
            src={article.featuredImage}
            alt={article.title}
            categoryName={article.categoryName}
            aspectClass="aspect-[4/3]"
          />
        </a>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6B6B] mb-1.5">
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
                <span className="font-semibold text-[#8C2634] uppercase tracking-wider">
                  Developing
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <time dateTime={article.publishedAt} className="font-mono-tabular">
              {formatEditorialDate(article.publishedAt)}
            </time>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{article.readingTime} min read</span>
          </div>

          <h3 className="font-editorial text-xl font-semibold text-[#171717] leading-snug group-hover:text-[#6E1723] transition-colors">
            <a href={articleUrl} onClick={handleCardClick}>
              {article.title}
            </a>
          </h3>

          <p className="mt-2 text-sm text-[#171717]/80 line-clamp-2 leading-relaxed">
            {article.subtitle}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B6B6B]">
            <span>By {article.authorName}</span>
            <div className="flex items-center gap-3">
              {onRequestFlashBrief && (
                <button
                  type="button"
                  onClick={() => onRequestFlashBrief(article)}
                  className="text-[#6E1723] hover:underline font-medium cursor-pointer whitespace-nowrap"
                >
                  Instant Brief
                </button>
              )}
              {onToggleOffline && (
                <button
                  type="button"
                  onClick={() => onToggleOffline(article)}
                  className="hover:text-[#171717] cursor-pointer whitespace-nowrap"
                >
                  {isSavedOffline ? 'Saved Offline' : 'Save Offline'}
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  // 5. SECONDARY FEATURE CARD (Default)
  return (
    <article className="group flex flex-col justify-between bg-white border border-[#E7E5E2] p-4 transition-colors">
      <div>
        <a href={articleUrl} onClick={handleCardClick} className="block mb-3.5">
          <EditorialImage
            src={article.featuredImage}
            alt={article.title}
            categoryName={article.categoryName}
            aspectClass="aspect-[4/3]"
          />
        </a>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6B6B] mb-1.5">
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
              <span className="font-semibold text-[#8C2634] uppercase">Developing</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">{article.readingTime} min read</span>
        </div>

        <h3 className="font-editorial text-lg sm:text-xl font-semibold text-[#171717] leading-snug group-hover:text-[#6E1723] transition-colors">
          <a href={articleUrl} onClick={handleCardClick}>
            {article.title}
          </a>
        </h3>

        <p className="mt-2 text-sm text-[#6B6B6B] line-clamp-2 leading-relaxed">
          {article.subtitle}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-[#E7E5E2] flex items-center justify-between text-xs text-[#6B6B6B]">
        <span className="truncate">By {article.authorName}</span>
        <div className="flex items-center gap-2.5 shrink-0">
          {onRequestFlashBrief && (
            <button
              type="button"
              onClick={() => onRequestFlashBrief(article)}
              className="text-[#6E1723] font-medium hover:underline cursor-pointer whitespace-nowrap"
            >
              Brief
            </button>
          )}
          {onToggleOffline && (
            <button
              type="button"
              onClick={() => onToggleOffline(article)}
              className={`cursor-pointer whitespace-nowrap ${
                isSavedOffline ? 'text-[#6E1723] font-semibold' : 'hover:text-[#171717]'
              }`}
              title="Save for Offline Reading"
            >
              {isSavedOffline ? 'Saved' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

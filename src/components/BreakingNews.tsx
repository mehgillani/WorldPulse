import React from 'react';
import { ArrowRight, Wifi, WifiOff } from 'lucide-react';
import { BreakingNewsConfig, SiteSettings } from '../types/editorial';

interface BreakingNewsProps {
  breakingNews: BreakingNewsConfig;
  siteSettings: SiteSettings;
  isOfflineMode: boolean;
  onToggleOfflineMode: () => void;
  onNavigate: (path: string) => void;
}

export const BreakingNews: React.FC<BreakingNewsProps> = ({
  breakingNews,
  siteSettings,
  isOfflineMode,
  onToggleOfflineMode,
  onNavigate,
}) => {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date('2026-10-08T12:00:00Z'));

  return (
    <div className="bg-white border-b border-[#E7E5E2]">
      {/* Sub-header Editorial Masthead Strip */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E5E2] text-xs text-[#6B6B6B]">
        <div className="flex items-center gap-3">
          {/* Abstract WORLDPULSE Emblem representing globe + information pulse */}
          <svg
            className="w-4 h-4 text-[#6E1723] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3.6 9h16.8M3.6 15h16.8" />
            <path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
          </svg>
          <span className="font-semibold text-[#171717] tracking-wide">{siteSettings.tagline}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular hidden sm:inline">{formattedDate}</span>
          <span aria-hidden="true" className="hidden md:inline">·</span>
          <span className="hidden md:inline">International Edition</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate('/latest')}
            className="hover:text-[#6E1723] font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            Latest
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => onNavigate('/trending')}
            className="hover:text-[#6E1723] font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            Trending
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onToggleOfflineMode}
            className={`flex items-center gap-1 font-medium transition-colors cursor-pointer whitespace-nowrap ${
              isOfflineMode ? 'text-[#6E1723] font-semibold' : 'hover:text-[#171717]'
            }`}
            title="Toggle Offline Reading Mode for low-connectivity environments"
          >
            {isOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{isOfflineMode ? 'Offline Reader Active' : 'Offline Mode'}</span>
          </button>
        </div>
      </div>

      {/* Configurable Breaking News Bar */}
      {breakingNews.enabled && breakingNews.headline && (
        <div className="bg-[#F7F5F2] border-b border-[#E7E5E2]">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6E1723] shrink-0 pt-0.5 sm:pt-0">
                {breakingNews.label || 'BREAKING'}
              </span>
              <span className="text-[#6B6B6B] hidden sm:inline" aria-hidden="true">
                /
              </span>
              <a
                href={`/${breakingNews.categorySlug || 'world'}/${breakingNews.articleSlug}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (breakingNews.articleSlug) {
                    onNavigate(`/${breakingNews.categorySlug || 'world'}/${breakingNews.articleSlug}`);
                  }
                }}
                className="text-sm font-semibold text-[#171717] hover:text-[#6E1723] transition-colors truncate"
              >
                {breakingNews.headline}
              </a>
            </div>

            {breakingNews.articleSlug && (
              <button
                type="button"
                onClick={() => onNavigate(`/${breakingNews.categorySlug || 'world'}/${breakingNews.articleSlug}`)}
                className="flex items-center gap-1 text-xs font-semibold text-[#6E1723] hover:text-[#4A0F18] shrink-0 self-start sm:self-auto cursor-pointer whitespace-nowrap"
              >
                <span>Read Dispatch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { Search, Menu, X, ChevronDown, Bookmark, User } from 'lucide-react';
import { Category, UserProfile } from '../types/editorial';

interface HeaderProps {
  categories: Category[];
  activePath: string;
  onNavigate: (path: string) => void;
  onOpenSearch: () => void;
  onOpenOfflineVault: () => void;
  onOpenAuthModal: () => void;
  offlineCount: number;
  user: UserProfile | null;
}

export const Header: React.FC<HeaderProps> = ({
  categories,
  activePath,
  onNavigate,
  onOpenSearch,
  onOpenOfflineVault,
  onOpenAuthModal,
  offlineCount,
  user,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navCategories = categories.filter((c) => c.showInNav);
  const primaryCategories = navCategories.slice(0, 5);
  const overflowCategories = [
    ...navCategories.slice(5),
    ...categories.filter((c) => !c.showInNav),
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLinkClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setMoreOpen(false);
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#6E1723] text-white border-b border-[#4A0F18] transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark (Top Bar Contract) */}
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="font-editorial text-xl sm:text-2xl font-bold tracking-[0.08em] text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          WORLDPULSE
        </a>

        {/* Zone 2: 5 core navigation links + More dropdown */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-white/90" aria-label="Main Navigation">
          {primaryCategories.map((cat) => {
            const isActive = activePath === `/${cat.slug}`;
            return (
              <a
                key={cat.id}
                href={`/${cat.slug}`}
                onClick={(e) => handleLinkClick(e, `/${cat.slug}`)}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                  isActive
                    ? 'border-white text-white font-semibold'
                    : 'border-transparent text-white/85 hover:text-white hover:border-white/50'
                }`}
              >
                {cat.name}
              </a>
            );
          })}

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((prev) => !prev)}
              className="flex items-center gap-1 py-1 text-sm font-medium text-white/85 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
              aria-expanded={moreOpen}
            >
              <span>More</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {moreOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white text-[#171717] border border-[#E7E5E2] shadow-lg py-2 z-50">
                <div className="px-3 py-1.5 border-b border-[#E7E5E2] text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                  Sections & Desks
                </div>
                {overflowCategories.map((cat) => (
                  <a
                    key={cat.id}
                    href={`/${cat.slug}`}
                    onClick={(e) => handleLinkClick(e, `/${cat.slug}`)}
                    className="block px-4 py-2 text-sm text-[#171717] hover:bg-[#F7F5F2] hover:text-[#6E1723] transition-colors"
                  >
                    {cat.name}
                  </a>
                ))}
                <div className="border-t border-[#E7E5E2] mt-1 pt-1">
                  <a
                    href="/latest"
                    onClick={(e) => handleLinkClick(e, '/latest')}
                    className="block px-4 py-2 text-sm font-medium text-[#171717] hover:bg-[#F7F5F2] hover:text-[#6E1723]"
                  >
                    Latest Dispatches
                  </a>
                  <a
                    href="/trending"
                    onClick={(e) => handleLinkClick(e, '/trending')}
                    className="block px-4 py-2 text-sm font-medium text-[#171717] hover:bg-[#F7F5F2] hover:text-[#6E1723]"
                  >
                    Trending Globally
                  </a>
                  <a
                    href="/authors"
                    onClick={(e) => handleLinkClick(e, '/authors')}
                    className="block px-4 py-2 text-sm text-[#6B6B6B] hover:bg-[#F7F5F2] hover:text-[#171717]"
                  >
                    Correspondents & Authors
                  </a>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: 1-2 Primary Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/90 hover:text-white hover:bg-[#4A0F18] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Search articles"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>

          <button
            type="button"
            onClick={onOpenOfflineVault}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/90 hover:text-white hover:bg-[#4A0F18] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Offline Reading Vault"
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden md:inline">Offline</span>
            {offlineCount > 0 && (
              <span className="font-mono-tabular text-[11px] underline">({offlineCount})</span>
            )}
          </button>

          {user ? (
            <button
              type="button"
              onClick={() => onNavigate(user.role === 'admin' || user.role === 'editor' ? '/admin' : '/profile')}
              className="px-3.5 py-1.5 text-xs font-semibold bg-white text-[#6E1723] hover:bg-[#F7F5F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {user.role === 'admin' || user.role === 'editor' ? 'Admin Desk' : user.name.split(' ')[0]}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-white text-[#6E1723] hover:bg-[#F7F5F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 text-white hover:bg-[#4A0F18] transition-colors cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Editorial Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#4A0F18] border-t border-white/15 px-4 py-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs tracking-widest uppercase text-white/70">The world. In focus.</span>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <a href="/latest" onClick={(e) => handleLinkClick(e, '/latest')} className="text-white underline">
                Latest
              </a>
              <a href="/trending" onClick={(e) => handleLinkClick(e, '/trending')} className="text-white underline">
                Trending
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`/${cat.slug}`}
                onClick={(e) => handleLinkClick(e, `/${cat.slug}`)}
                className="px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-[#6E1723] transition-colors"
              >
                {cat.name}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-white/75">
            <div className="flex items-center gap-4">
              <a href="/about" onClick={(e) => handleLinkClick(e, '/about')} className="hover:text-white">
                About
              </a>
              <a href="/authors" onClick={(e) => handleLinkClick(e, '/authors')} className="hover:text-white">
                Authors
              </a>
              <a href="/contact" onClick={(e) => handleLinkClick(e, '/contact')} className="hover:text-white">
                Contact
              </a>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('/admin');
              }}
              className="text-white font-semibold underline cursor-pointer"
            >
              Editorial Admin (/admin)
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

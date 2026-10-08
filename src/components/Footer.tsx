import React from 'react';
import { Category, SiteSettings } from '../types/editorial';

interface FooterProps {
  categories: Category[];
  siteSettings: SiteSettings;
  onNavigate: (path: string) => void;
  onOpenCookieSettings: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  categories,
  siteSettings,
  onNavigate,
  onOpenCookieSettings,
}) => {
  const handleLink = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    onNavigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#171717] text-white border-t-4 border-[#6E1723] mt-16">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/15">
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              {/* Square Social/Favicon Brand Emblem */}
              <div className="w-9 h-9 bg-[#6E1723] flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h4l2-4 4 8 2-4h6" />
                </svg>
              </div>
              <div>
                <a
                  href="/"
                  onClick={(e) => handleLink(e, '/')}
                  className="font-editorial text-2xl font-bold tracking-[0.08em] text-white block"
                >
                  {siteSettings.siteName || 'WORLDPULSE'}
                </a>
                <p className="text-xs tracking-widest uppercase text-white/70">
                  {siteSettings.tagline || 'The world. In focus.'}
                </p>
              </div>
            </div>

            <p className="text-sm text-white/70 leading-relaxed max-w-sm">
              {siteSettings.siteDescription}
            </p>

            {/* Social Media Links (Section 27) */}
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-white/80">
              {siteSettings.social.x && (
                <a
                  href={siteSettings.social.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 border border-white/20 hover:border-white hover:text-white transition-colors"
                >
                  X / Twitter
                </a>
              )}
              {siteSettings.social.facebook && (
                <a
                  href={siteSettings.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 border border-white/20 hover:border-white hover:text-white transition-colors"
                >
                  Facebook
                </a>
              )}
              {siteSettings.social.instagram && (
                <a
                  href={siteSettings.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 border border-white/20 hover:border-white hover:text-white transition-colors"
                >
                  Instagram
                </a>
              )}
              {siteSettings.social.youtube && (
                <a
                  href={siteSettings.social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 border border-white/20 hover:border-white hover:text-white transition-colors"
                >
                  YouTube
                </a>
              )}
              {siteSettings.social.linkedin && (
                <a
                  href={siteSettings.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 border border-white/20 hover:border-white hover:text-white transition-colors"
                >
                  LinkedIn
                </a>
              )}
            </div>
          </div>

          {/* Editorial Sections Column 1 */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 font-sans">
              Global Desks
            </h3>
            <ul className="space-y-2 text-sm text-white/80">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <a
                    href={`/${cat.slug}`}
                    onClick={(e) => handleLink(e, `/${cat.slug}`)}
                    className="hover:text-white transition-colors"
                  >
                    {cat.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Editorial Sections Column 2 */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 font-sans">
              More Coverage
            </h3>
            <ul className="space-y-2 text-sm text-white/80">
              {categories.slice(6).map((cat) => (
                <li key={cat.id}>
                  <a
                    href={`/${cat.slug}`}
                    onClick={(e) => handleLink(e, `/${cat.slug}`)}
                    className="hover:text-white transition-colors"
                  >
                    {cat.name}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="/latest"
                  onClick={(e) => handleLink(e, '/latest')}
                  className="hover:text-white transition-colors"
                >
                  Latest News
                </a>
              </li>
              <li>
                <a
                  href="/trending"
                  onClick={(e) => handleLink(e, '/trending')}
                  className="hover:text-white transition-colors"
                >
                  Trending Globally
                </a>
              </li>
            </ul>
          </div>

          {/* Organization & Legal Column */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 font-sans">
              Publication & Standards
            </h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <a
                  href="/about"
                  onClick={(e) => handleLink(e, '/about')}
                  className="hover:text-white transition-colors"
                >
                  About WORLDPULSE
                </a>
              </li>
              <li>
                <a
                  href="/authors"
                  onClick={(e) => handleLink(e, '/authors')}
                  className="hover:text-white transition-colors"
                >
                  Editorial Board & Authors
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  onClick={(e) => handleLink(e, '/contact')}
                  className="hover:text-white transition-colors"
                >
                  Contact & Press Desk
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => handleLink(e, '/privacy')}
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => handleLink(e, '/terms')}
                  className="hover:text-white transition-colors"
                >
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a
                  href="/disclaimer"
                  onClick={(e) => handleLink(e, '/disclaimer')}
                  className="hover:text-white transition-colors"
                >
                  Editorial Disclaimer
                </a>
              </li>
              <li>
                <a
                  href="/cookies"
                  onClick={(e) => handleLink(e, '/cookies')}
                  className="hover:text-white transition-colors"
                >
                  Cookie Policy
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenCookieSettings}
                  className="text-white/75 hover:text-white underline text-xs cursor-pointer"
                >
                  Manage Cookie Consent
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Technical Links */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/60">
          <p>© {new Date().getFullYear()} WORLDPULSE. All rights reserved. The world. In focus.</p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              XML Sitemap
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Robots.txt
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="/admin"
              onClick={(e) => handleLink(e, '/admin')}
              className="hover:text-white transition-colors"
            >
              Editorial Console
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

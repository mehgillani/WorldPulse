import React, { useState } from 'react';
import {
  Article,
  Author,
  Category,
  SiteSettings,
  UserProfile,
} from '../types/editorial';
import { ArticleCard } from './ArticleCard';
import { auth, updateFirestoreUserProfile } from '../firebase';

interface StaticPageProps {
  page:
    | 'about'
    | 'contact'
    | 'authors'
    | 'privacy'
    | 'terms'
    | 'disclaimer'
    | 'cookies'
    | '404';
  siteSettings: SiteSettings;
  authors: Author[];
  articles: Article[];
  onNavigate: (path: string) => void;
}

export const StaticEditorialPages: React.FC<StaticPageProps> = ({
  page,
  siteSettings,
  authors,
  articles,
  onNavigate,
}) => {
  const [contactSent, setContactSent] = useState(false);

  if (page === '404') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-5">
        <span className="font-mono-tabular text-xs font-bold uppercase tracking-widest text-[#6E1723]">
          ERROR 404 · PAGE NOT FOUND
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#171717]">
          The requested dispatch or archive page could not be located.
        </h1>
        <p className="text-base text-[#6B6B6B] max-w-xl mx-auto">
          The link may have been updated, archived, or mistyped. Explore our latest global coverage
          below.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#6E1723] text-white hover:bg-[#4A0F18] cursor-pointer"
          >
            Return to Homepage
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/latest')}
            className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider border border-[#171717] text-[#171717] hover:bg-white cursor-pointer"
          >
            Browse Latest Dispatches
          </button>
        </div>
      </div>
    );
  }

  if (page === 'authors') {
    return (
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="border-b-2 border-[#171717] pb-5">
          <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
            INTERNATIONAL EDITORIAL DESK
          </span>
          <h1 className="font-editorial text-3xl sm:text-5xl font-semibold text-[#171717] mt-1">
            Correspondents & Editors
          </h1>
          <p className="text-base text-[#6B6B6B] mt-2 max-w-2xl">
            Meet the journalists, researchers, and editors reporting for WORLDPULSE across diplomacy,
            economics, science, technology, and culture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {authors.map((author) => {
            const count = articles.filter(
              (a) => a.authorId === author.id && a.status === 'published'
            ).length;
            return (
              <div
                key={author.id}
                className="bg-white border border-[#E7E5E2] p-6 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={author.photo}
                    alt={author.name}
                    className="w-16 h-16 rounded-full object-cover shrink-0 border border-[#E7E5E2]"
                  />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#6E1723]">
                      {author.role}
                    </span>
                    <h2 className="font-editorial text-2xl font-semibold text-[#171717] mt-0.5">
                      <a
                        href={`/author/${author.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate(`/author/${author.slug}`);
                        }}
                        className="hover:text-[#6E1723]"
                      >
                        {author.name}
                      </a>
                    </h2>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">{author.location}</p>
                    <p className="text-sm text-[#171717]/80 mt-3 leading-relaxed">{author.bio}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E7E5E2] flex items-center justify-between text-xs">
                  <span className="font-mono-tabular text-[#6B6B6B]">
                    {count} published {count === 1 ? 'dispatch' : 'dispatches'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate(`/author/${author.slug}`)}
                    className="font-semibold text-[#6E1723] hover:underline cursor-pointer"
                  >
                    Read Author Archive →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (page === 'contact') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="border-b-2 border-[#171717] pb-5">
          <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
            GLOBAL BUREAUS & READER DESK
          </span>
          <h1 className="font-editorial text-3xl sm:text-5xl font-semibold text-[#171717] mt-1">
            Contact WORLDPULSE
          </h1>
          <p className="text-base text-[#6B6B6B] mt-2">
            Reach our editorial board, submit press inquiries, or report corrections.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 bg-white border border-[#E7E5E2] p-6 space-y-4 h-fit">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#6E1723]">
                Editorial & Newsroom
              </h2>
              <p className="text-sm font-mono-tabular text-[#171717] mt-1">
                {siteSettings.editorialEmail}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#6E1723]">
                Press & Syndication
              </h2>
              <p className="text-sm font-mono-tabular text-[#171717] mt-1">
                {siteSettings.pressEmail}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#6E1723]">
                International Desks
              </h2>
              <p className="text-sm text-[#6B6B6B] mt-1">{siteSettings.headquarters}</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setContactSent(true);
            }}
            className="md:col-span-7 bg-white border border-[#E7E5E2] p-6 space-y-4"
          >
            <h2 className="font-editorial text-2xl font-semibold text-[#171717]">
              Send a Direct Message to the Editors
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase mb-1">Department</label>
              <select className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]">
                <option>Editorial Desk & News Tips</option>
                <option>Corrections & Fact-Checking</option>
                <option>Advertising & Institutional Partnerships</option>
                <option>Technical & Accessibility Support</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase mb-1">Message *</label>
              <textarea
                rows={4}
                required
                className="w-full px-3 py-2 text-sm bg-[#F7F5F2] border border-[#E7E5E2]"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#6E1723] text-white hover:bg-[#4A0F18] cursor-pointer"
            >
              Transmit Message
            </button>
            {contactSent && (
              <p className="text-xs font-semibold text-emerald-700">
                Thank you. Your message has been logged with the WORLDPULSE editorial desk.
              </p>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white border border-[#E7E5E2] p-6 sm:p-10 space-y-6">
        {page === 'about' && (
          <>
            <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
              EDITORIAL CHARTER & MISSION
            </span>
            <h1 className="font-editorial text-3xl sm:text-5xl font-semibold text-[#171717]">
              WORLDPULSE — The world. In focus.
            </h1>
            <div className="wp-article-prose">
              <p>
                WORLDPULSE is an independent global digital news and trends publication built to cover
                the forces reshaping our world—across diplomacy, politics, global business,
                semiconductors and quantum technology, planetary science, health, sports, architecture,
                and contemporary culture.
              </p>
              <h2>Editorial Independence & Verification</h2>
              <p>
                Our reporting separates verified fact from commentary. Every dispatch published on
                WORLDPULSE undergoes human editorial review. When AI-assisted synthesis or translation
                tools are used, they are clearly labeled and subject to strict human oversight.
              </p>
              <h2>Global Accessibility & Offline Resilience</h2>
              <p>
                Because critical information should remain accessible regardless of local bandwidth,
                WORLDPULSE includes a built-in Offline Reading Vault and low-latency executive
                briefings.
              </p>
            </div>
          </>
        )}

        {page === 'privacy' && (
          <>
            <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
              DATA PROTECTION & READER PRIVACY
            </span>
            <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#171717]">
              Privacy Policy
            </h1>
            <div className="space-y-4 text-sm text-[#171717] leading-relaxed">
              <p>Last Updated: October 8, 2026</p>
              <p>
                WORLDPULSE respects reader privacy. When you read articles, save dispatches to your
                Offline Reading Vault, or subscribe to our newsletter, we collect only the minimum
                data required to provide these services.
              </p>
              <h2 className="font-editorial text-xl font-semibold pt-2">
                1. Commenter & Subscriber Email Protection
              </h2>
              <p>
                Email addresses submitted with article comments are used solely for moderation and
                are never exposed in public HTML or API responses.
              </p>
              <h2 className="font-editorial text-xl font-semibold pt-2">
                2. Cookie & Analytics Controls
              </h2>
              <p>
                You can modify your analytics and advertising cookie preferences at any time via the
                “Manage Cookie Consent” link in the website footer.
              </p>
            </div>
          </>
        )}

        {page === 'terms' && (
          <>
            <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
              READER AGREEMENT
            </span>
            <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#171717]">
              Terms & Conditions
            </h1>
            <div className="space-y-4 text-sm text-[#171717] leading-relaxed">
              <p>
                By accessing WORLDPULSE, you agree to abide by intellectual property laws and our
                community discussion guidelines. Articles may be shared via official social links or
                quoted with clear attribution to WORLDPULSE. Automated scraping or unauthorized
                commercial syndication is prohibited.
              </p>
            </div>
          </>
        )}

        {page === 'disclaimer' && (
          <>
            <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
              EDITORIAL & SAMPLE CONTENT NOTICE
            </span>
            <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#171717]">
              Editorial Disclaimer
            </h1>
            <div className="space-y-4 text-sm text-[#171717] leading-relaxed">
              <p>
                WORLDPULSE publishes news analysis, cultural criticism, and scientific reporting for
                general informational purposes. Nothing published in our Business, Technology, or
                Health sections constitutes financial, legal, or medical advice.
              </p>
              <p>
                Articles marked as <strong>Sample Demo Article</strong> are demonstration dispatches
                created to illustrate the publication’s layout and editorial tools, and can be
                removed from the Admin Console at any time.
              </p>
            </div>
          </>
        )}

        {page === 'cookies' && (
          <>
            <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
              STORAGE & CONSENT POLICY
            </span>
            <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#171717]">
              Cookie Policy
            </h1>
            <div className="space-y-4 text-sm text-[#171717] leading-relaxed">
              <p>
                WORLDPULSE uses local storage and cookies in three categories: (1) Essential storage
                for your Offline Reading Vault and authentication session, (2) Editorial Analytics to
                understand readership trends, and (3) Policy-compliant Advertising slots.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface AuthorProfileViewProps {
  author: Author;
  articles: Article[];
  onNavigate: (path: string) => void;
  onToggleOffline: (article: Article) => void;
}

export const AuthorProfileView: React.FC<AuthorProfileViewProps> = ({
  author,
  articles,
  onNavigate,
  onToggleOffline,
}) => {
  const authorArticles = articles.filter(
    (a) => a.authorId === author.id && a.status === 'published'
  );

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="bg-white border border-[#E7E5E2] p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6">
        <img
          src={author.photo}
          alt={author.name}
          className="w-24 h-24 rounded-full object-cover shrink-0 border-2 border-[#6E1723]"
        />
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6B6B]">
            <span className="font-bold uppercase tracking-widest text-[#6E1723]">
              {author.role}
            </span>
            <span>·</span>
            <span>{author.location}</span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#171717]">
            {author.name}
          </h1>
          <p className="text-base text-[#171717]/80 max-w-2xl leading-relaxed">{author.bio}</p>
        </div>
      </div>

      <div>
        <div className="border-b-2 border-[#171717] pb-3 mb-6 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#171717] font-sans">
            Dispatches by {author.name} ({authorArticles.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {authorArticles.map((art) => (
            <ArticleCard
              key={art.id}
              article={art}
              variant="secondary"
              onNavigate={onNavigate}
              onToggleOffline={onToggleOffline}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface ReaderProfileViewProps {
  user: UserProfile;
  categories: Category[];
  articles: Article[];
  authToken: string;
  onUpdateUser: (updated: UserProfile) => void;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

export const ReaderProfileView: React.FC<ReaderProfileViewProps> = ({
  user,
  categories,
  articles,
  authToken,
  onUpdateUser,
  onLogout,
  onNavigate,
}) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user.interests || []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const toggleInterest = (slug: string) => {
    setSelectedInterests((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      if (auth.currentUser) {
        await updateFirestoreUserProfile(auth.currentUser.uid, {
          interests: selectedInterests,
        });
      }
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ interests: selectedInterests }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdateUser(data.user);
      } else {
        onUpdateUser({ ...user, interests: selectedInterests });
      }
      setMsg('Your personalized topic feed preferences have been saved to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const recommended = articles.filter(
    (a) => a.status === 'published' && selectedInterests.includes(a.category)
  );

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="bg-white border border-[#E7E5E2] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
            WORLDPULSE READER ACCOUNT
          </span>
          <h1 className="font-editorial text-3xl font-semibold text-[#171717] mt-1">
            {user.name}
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">{user.email}</p>
        </div>

        <div className="flex items-center gap-3">
          {(user.role === 'admin' || user.role === 'editor') && (
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="px-4 py-2 text-xs font-semibold bg-[#6E1723] text-white cursor-pointer"
            >
              Open Admin Console
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 text-xs font-semibold border border-[#171717] text-[#171717] cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E7E5E2] p-6 space-y-4">
        <h2 className="font-editorial text-2xl font-semibold text-[#171717]">
          Customize Your “My Pulse” Editorial Interests
        </h2>
        <p className="text-sm text-[#6B6B6B]">
          Select the global desks you follow closely to tailor your homepage recommendations and
          AI Flash Briefings.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          {categories.map((c) => {
            const active = selectedInterests.includes(c.slug);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleInterest(c.slug)}
                className={`px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#6E1723] text-white'
                    : 'bg-[#F7F5F2] text-[#171717] border border-[#E7E5E2]'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="pt-2 flex items-center gap-4">
          <button
            type="button"
            disabled={saving}
            onClick={handleSavePreferences}
            className="px-5 py-2 text-xs font-semibold bg-[#171717] text-white hover:bg-[#6E1723] cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Topic Preferences'}
          </button>
          {msg && <span className="text-xs font-semibold text-emerald-700">{msg}</span>}
        </div>
      </div>

      <div>
        <h2 className="font-editorial text-2xl font-semibold text-[#171717] mb-4">
          Recommended Dispatches for Your Interests ({recommended.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommended.map((art) => (
            <ArticleCard key={art.id} article={art} variant="secondary" onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
};

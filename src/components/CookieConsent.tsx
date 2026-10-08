import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  advertising: boolean;
  decidedAt?: string;
}

interface CookieConsentProps {
  forceOpen: boolean;
  onCloseForceOpen: () => void;
  onUpdateConsent: (prefs: CookiePreferences) => void;
}

const STORAGE_KEY = 'worldpulse_cookie_consent_v1';

export const CookieConsent: React.FC<CookieConsentProps> = ({
  forceOpen,
  onCloseForceOpen,
  onUpdateConsent,
}) => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    advertising: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CookiePreferences;
        setPrefs(parsed);
        onUpdateConsent(parsed);
        return;
      } catch {
        // ignore invalid json
      }
    }

    // Respect 10s+ dwell + scroll interaction before displaying consent bar
    let hasScrolled = false;
    const onScroll = () => {
      hasScrolled = true;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const timer = setTimeout(() => {
      if (hasScrolled && !localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    }, 11000);

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (forceOpen) {
      setVisible(true);
      setShowDetails(true);
    }
  }, [forceOpen]);

  const savePreferences = (nextPrefs: CookiePreferences) => {
    const withDate = { ...nextPrefs, essential: true, decidedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withDate));
    setPrefs(withDate);
    onUpdateConsent(withDate);
    setVisible(false);
    setShowDetails(false);
    onCloseForceOpen();
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie Consent Preferences"
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t-2 border-[#6E1723] shadow-2xl p-4 sm:p-6"
    >
      <div className="max-w-[1360px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
                WORLDPULSE PRIVACY & COOKIE TRANSPARENCY
              </span>
              {forceOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setVisible(false);
                    onCloseForceOpen();
                  }}
                  className="lg:hidden p-1 text-[#6B6B6B] hover:text-[#171717]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-sm text-[#171717] mt-1 leading-relaxed">
              We use essential cookies to deliver fast global journalism and support offline reading.
              With your consent, we also use analytics and policy-compliant advertising cookies to
              measure readership and sustain independent reporting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="px-3.5 py-2 text-xs font-semibold border border-[#E7E5E2] text-[#171717] hover:bg-[#F7F5F2] transition-colors whitespace-nowrap cursor-pointer"
            >
              {showDetails ? 'Hide Preferences' : 'Manage Preferences'}
            </button>
            <button
              type="button"
              onClick={() =>
                savePreferences({ essential: true, analytics: false, advertising: false })
              }
              className="px-3.5 py-2 text-xs font-semibold border border-[#171717] text-[#171717] hover:bg-[#F7F5F2] transition-colors whitespace-nowrap cursor-pointer"
            >
              Reject Non-Essential
            </button>
            <button
              type="button"
              onClick={() =>
                savePreferences({ essential: true, analytics: true, advertising: true })
              }
              className="px-4 py-2 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] transition-colors whitespace-nowrap cursor-pointer"
            >
              Accept All
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-t border-[#E7E5E2] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[#F7F5F2] border border-[#E7E5E2]">
              <div className="flex items-center justify-between font-semibold text-[#171717]">
                <span>Essential Editorial & Offline Storage</span>
                <span className="text-[#6E1723] uppercase">Always Active</span>
              </div>
              <p className="text-[#6B6B6B] mt-1">
                Required for security, authentication sessions, and your local Offline Reading Vault.
              </p>
            </div>

            <label className="p-3 bg-[#F7F5F2] border border-[#E7E5E2] flex flex-col justify-between cursor-pointer">
              <div className="flex items-center justify-between font-semibold text-[#171717]">
                <span>Editorial Analytics</span>
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                  className="accent-[#6E1723]"
                />
              </div>
              <p className="text-[#6B6B6B] mt-1">
                Helps our newsroom understand which global topics and long-form investigations resonate.
              </p>
            </label>

            <label className="p-3 bg-[#F7F5F2] border border-[#E7E5E2] flex flex-col justify-between cursor-pointer">
              <div className="flex items-center justify-between font-semibold text-[#171717]">
                <span>Policy-Compliant Advertising</span>
                <input
                  type="checkbox"
                  checked={prefs.advertising}
                  onChange={(e) => setPrefs({ ...prefs, advertising: e.target.checked })}
                  className="accent-[#6E1723]"
                />
              </div>
              <p className="text-[#6B6B6B] mt-1">
                Enables non-intrusive sponsor placements and Google AdSense slots where configured.
              </p>
            </label>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="button"
                onClick={() => savePreferences(prefs)}
                className="px-4 py-2 text-xs font-semibold bg-[#171717] text-white hover:bg-[#6E1723] transition-colors cursor-pointer"
              >
                Save Selected Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

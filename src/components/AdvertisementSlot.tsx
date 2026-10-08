import React from 'react';
import { AdPlacement } from '../types/editorial';

interface AdvertisementSlotProps {
  slotKey: AdPlacement['slotKey'];
  ads: AdPlacement[];
  onNavigate?: (path: string) => void;
  className?: string;
}

export const AdvertisementSlot: React.FC<AdvertisementSlotProps> = ({
  slotKey,
  ads,
  onNavigate,
  className = '',
}) => {
  const placement = ads.find((a) => a.slotKey === slotKey);
  if (!placement || !placement.enabled) return null;

  return (
    <aside
      aria-label="Advertisement"
      className={`bg-white border border-[#E7E5E2] p-4 sm:p-5 my-6 ${className}`}
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-[#6B6B6B] border-b border-[#E7E5E2] pb-2 mb-3">
        <span>{placement.sponsorLabel || 'ADVERTISEMENT'}</span>
        <span className="font-mono-tabular">
          {placement.network === 'adsense' ? `AdSense · ${placement.adSlotId}` : 'Editorial Notice'}
        </span>
      </div>

      {placement.customCode ? (
        <div
          className="text-sm text-[#171717]"
          dangerouslySetInnerHTML={{ __html: placement.customCode }}
        />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-editorial text-base sm:text-lg font-medium text-[#171717]">
              {placement.headline ||
                'WORLDPULSE Global Briefing — Independent international reporting.'}
            </p>
            <p className="text-xs text-[#6B6B6B] mt-1">
              Slot ID: <span className="font-mono-tabular">{placement.adSlotId}</span> · Format:{' '}
              {placement.format}
            </p>
          </div>
          {placement.ctaText && (
            <button
              type="button"
              onClick={() => {
                if (placement.ctaUrl && onNavigate) {
                  if (placement.ctaUrl.startsWith('#')) {
                    const el = document.querySelector(placement.ctaUrl);
                    el?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    onNavigate(placement.ctaUrl);
                  }
                }
              }}
              className="px-4 py-2 text-xs font-semibold bg-[#6E1723] text-white hover:bg-[#4A0F18] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
            >
              {placement.ctaText}
            </button>
          )}
        </div>
      )}
    </aside>
  );
};

import React, { useState } from 'react';

interface EditorialImageProps {
  src: string;
  alt: string;
  categoryName?: string;
  className?: string;
  aspectClass?: string;
  priority?: boolean;
}

export const EditorialImage: React.FC<EditorialImageProps> = ({
  src,
  alt,
  categoryName = 'WORLDPULSE',
  className = '',
  aspectClass = 'aspect-[16/9]',
  priority = false,
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-[#4A0F18] via-[#261418] to-[#171717] flex flex-col justify-between p-6 text-white ${aspectClass} ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-white/80">
            {categoryName}
          </span>
          <span className="font-mono-tabular text-[11px] text-white/50">WORLDPULSE ARCHIVE</span>
        </div>
        <div className="my-auto py-2">
          <p className="font-editorial text-lg md:text-xl font-medium text-white/95 line-clamp-3">
            {alt}
          </p>
        </div>
        <div className="flex items-center justify-between text-[10px] tracking-wider uppercase text-white/50 pt-2 border-t border-white/10">
          <span>The world. In focus.</span>
          <span>Editorial Visual Plate</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#E7E5E2] ${aspectClass} ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
      />
    </div>
  );
};

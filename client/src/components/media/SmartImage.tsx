import React, { useState, useEffect } from 'react';

type SmartImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  aspectRatio?: string;
  priority?: boolean;
  fallbackSrc?: string;
};

// Inline cyberpunk placeholder – no external file dependency
function CyberpunkPlaceholder({ alt }: { alt?: string }) {
  const label = alt ? alt.slice(0, 22) : 'PRODUCT';
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #060a14 0%, #0d1220 50%, #07080f 100%)',
      }}
    >
      {/* Grid lines */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.15) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      {/* Corner brackets */}
      <div className="absolute inset-4 pointer-events-none" style={{ border: '1px solid rgba(0,255,255,0.12)', borderRadius: '8px' }} />
      <div className="absolute top-4 left-4 w-6 h-6" style={{
        borderTop: '2px solid rgba(0,255,255,0.55)',
        borderLeft: '2px solid rgba(0,255,255,0.55)',
        borderRadius: '3px 0 0 0',
      }} />
      <div className="absolute top-4 right-4 w-6 h-6" style={{
        borderTop: '2px solid rgba(255,88,214,0.55)',
        borderRight: '2px solid rgba(255,88,214,0.55)',
        borderRadius: '0 3px 0 0',
      }} />
      <div className="absolute bottom-4 left-4 w-6 h-6" style={{
        borderBottom: '2px solid rgba(255,88,214,0.55)',
        borderLeft: '2px solid rgba(255,88,214,0.55)',
        borderRadius: '0 0 0 3px',
      }} />
      <div className="absolute bottom-4 right-4 w-6 h-6" style={{
        borderBottom: '2px solid rgba(0,255,255,0.55)',
        borderRight: '2px solid rgba(0,255,255,0.55)',
        borderRadius: '0 0 3px 0',
      }} />
      {/* Icon */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="2" y="8" width="36" height="26" rx="4" stroke="rgba(0,255,255,0.5)" strokeWidth="1.5" />
          <circle cx="13" cy="18" r="4" stroke="rgba(0,255,255,0.4)" strokeWidth="1.5" />
          <path d="M2 28 L11 20 L18 26 L25 18 L38 30" stroke="rgba(255,88,214,0.5)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <p style={{
          fontFamily: 'monospace',
          fontSize: '0.6rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'rgba(0,255,255,0.45)',
          textAlign: 'center',
          maxWidth: '80%',
          lineHeight: 1.4,
        }}>
          {label}
        </p>
      </div>
      {/* Scan line sweep */}
      <div className="absolute inset-x-0 h-px opacity-20" style={{
        top: '50%',
        background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.8), transparent)',
      }} />
    </div>
  );
}

export function SmartImage({
  src: initialSrc,
  alt,
  className = '',
  aspectRatio = 'aspect-square',
  priority = false,
  ...props
}: SmartImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    initialSrc ? 'loading' : 'error'
  );
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(
    initialSrc ? String(initialSrc) : undefined
  );

  useEffect(() => {
    const src = initialSrc ? String(initialSrc) : undefined;
    setCurrentSrc(src);
    setStatus(src ? 'loading' : 'error');
  }, [initialSrc]);

  const handleLoad = () => setStatus('loaded');

  const handleError = () => {
    setStatus('error');
    setCurrentSrc(undefined);
  };

  return (
    <div className={`relative overflow-hidden ${aspectRatio} ${className}`}>
      {/* Loading shimmer */}
      {status === 'loading' && (
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(90deg, rgba(0,255,255,0.03) 0%, rgba(0,255,255,0.08) 50%, rgba(0,255,255,0.03) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s ease-in-out infinite',
        }} />
      )}

      {/* Actual image */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt || 'Product image'}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}

      {/* Cyberpunk placeholder when no image */}
      {status === 'error' && <CyberpunkPlaceholder alt={alt} />}
    </div>
  );
}

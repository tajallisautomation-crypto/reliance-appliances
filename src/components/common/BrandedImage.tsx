import type { CSSProperties, SyntheticEvent } from 'react';

type WatermarkPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

interface BrandedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  /** Explicit width — pass together with height to let the browser reserve space and prevent CLS */
  width?: number;
  /** Explicit height — pass together with width to let the browser reserve space and prevent CLS */
  height?: number;
  watermarkPosition?: WatermarkPosition;
  watermarkOpacity?: number;
  compact?: boolean;
  onError?: (e: SyntheticEvent<HTMLImageElement>) => void;
  onLoad?: () => void;
  draggable?: boolean;
}

const POSITION_CLASSES: Record<WatermarkPosition, string> = {
  'bottom-right': 'bottom-2 right-2',
  'bottom-left':  'bottom-2 left-2',
  'top-right':    'top-2 right-2',
  'top-left':     'top-2 left-2',
};

/**
 * Drop-in image wrapper that overlays a subtle Tajalli's brand watermark.
 * Use instead of <img> for all product and gallery images.
 *
 * compact=true  → icon-only pill (~36px), for small grid thumbnails
 * compact=false → icon + "Tajalli's" text pill (~72px), for card/detail images
 */
export function BrandedImage({
  src,
  alt,
  className = '',
  style,
  imageClassName = '',
  imageStyle,
  loading = 'lazy',
  fetchPriority,
  width,
  height,
  watermarkPosition = 'bottom-right',
  watermarkOpacity = 0.22,
  compact = false,
  onError,
  onLoad,
  draggable,
}: BrandedImageProps) {
  const posClass = POSITION_CLASSES[watermarkPosition];

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={fetchPriority === 'high' ? 'sync' : 'async'}
        width={width}
        height={height}
        className={`h-full w-full ${imageClassName}`}
        style={imageStyle}
        onError={onError}
        onLoad={onLoad}
        draggable={draggable}
      />
      <div
        className={`pointer-events-none absolute ${posClass} z-10 flex items-center gap-1 rounded-full bg-white/50 backdrop-blur-sm ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}
        style={{ opacity: watermarkOpacity }}
        aria-hidden="true"
      >
        <img
          src="/tajallis-logo-icon.svg"
          alt=""
          width={compact ? 12 : 16}
          height={compact ? 12 : 16}
          className={compact ? 'h-3 w-auto' : 'h-4 w-auto'}
          draggable={false}
        />
        {!compact && (
          <span className="text-[8px] font-bold text-gray-700 tracking-tight whitespace-nowrap leading-none select-none">
            Tajalli's
          </span>
        )}
      </div>
    </div>
  );
}

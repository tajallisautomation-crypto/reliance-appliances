import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';

// Premium restrained palette — no harsh orange. Brand-native dark + accent tones.
const THEMES: Record<string, { grad: string; muted: string; badge: string }> = {
  orange: { grad: 'from-gray-900 via-gray-900 to-brand-900',   muted: 'text-brand-300',   badge: 'bg-brand-500/20 text-brand-300'   },
  dark:   { grad: 'from-gray-950 to-gray-900',                 muted: 'text-gray-400',    badge: 'bg-white/10 text-gray-300'        },
  blue:   { grad: 'from-blue-950 via-blue-900 to-gray-900',    muted: 'text-blue-200',    badge: 'bg-blue-500/20 text-blue-200'     },
  green:  { grad: 'from-emerald-950 via-emerald-900 to-gray-900', muted: 'text-emerald-200', badge: 'bg-emerald-500/20 text-emerald-300' },
  teal:   { grad: 'from-teal-950 via-teal-900 to-gray-900',    muted: 'text-teal-200',    badge: 'bg-teal-500/20 text-teal-200'     },
  red:    { grad: 'from-rose-950 via-rose-900 to-gray-900',    muted: 'text-rose-200',    badge: 'bg-rose-500/20 text-rose-200'     },
  purple: { grad: 'from-purple-950 via-purple-900 to-gray-900',muted: 'text-purple-200',  badge: 'bg-purple-500/20 text-purple-200' },
};

export default function OfferBannerSlider() {
  const { offerBanners } = useSettingsStore();
  const slides = offerBanners.filter(b => b.active && (b.title || b.subtitle));

  const [idx, setIdx]       = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const next = useCallback(() => setIdx(i => (i + 1) % slides.length), [slides.length]);
  const prev = ()                => setIdx(i => (i - 1 + slides.length) % slides.length);

  useEffect(() => { setIdx(0); }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [slides.length, paused, next]);

  if (!slides.length) return null;

  const b      = slides[Math.min(idx, slides.length - 1)];
  const theme  = THEMES[b.theme] ?? THEMES.orange;

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchStartX.current === null || slides.length <= 1) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) > 50) delta < 0 ? next() : prev();
        touchStartX.current = null;
      }}
    >
      <div className={`bg-gradient-to-r ${theme.grad} relative`}>

        {/* Refined decorative layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="absolute -right-24 top-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-white/3 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-9 relative">
          <div className="flex items-center gap-6">

            {/* Content */}
            <div className="flex-1 min-w-0">
              {b.badge && (
                <span className={`inline-block ${theme.badge} text-[10px] font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-widest`}>
                  {b.badge}
                </span>
              )}
              <h2 className="text-white text-xl md:text-2xl font-black leading-tight mb-1.5 tracking-tight">
                {b.title}
              </h2>
              {b.subtitle && (
                <p className={`${theme.muted} text-sm mb-4 max-w-lg leading-relaxed`}>{b.subtitle}</p>
              )}
              {b.cta && b.ctaLink && (
                <Link
                  to={b.ctaLink}
                  className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {b.cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Arrows (desktop only) */}
            {slides.length > 1 && (
              <div className="hidden md:flex items-center gap-2 shrink-0">
                <button onClick={prev} aria-label="Previous offer"
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={next} aria-label="Next offer"
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Dots + mobile arrows */}
          {slides.length > 1 && (
            <div className="flex items-center gap-3 mt-4">
              <button onClick={prev} aria-label="Previous" className="md:hidden text-white/60 hover:text-white">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)} aria-label={`Go to slide ${i + 1}`}
                    className="p-1.5"
                  >
                    <span className={`block rounded-full transition-all duration-300 ${
                      i === idx ? 'bg-white w-4 h-1' : 'bg-white/35 w-1.5 h-1.5 hover:bg-white/55'
                    }`} />
                  </button>
                ))}
              </div>
              <button onClick={next} aria-label="Next" className="md:hidden text-white/60 hover:text-white">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="ml-auto text-white/40 text-[10px] font-mono">{idx + 1}/{slides.length}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

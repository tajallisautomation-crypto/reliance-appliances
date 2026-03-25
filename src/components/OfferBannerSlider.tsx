import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';

const THEMES: Record<string, { grad: string; circle: string; muted: string }> = {
  orange: { grad: 'from-orange-600 to-orange-400',     circle: 'bg-white/10',  muted: 'text-orange-100' },
  dark:   { grad: 'from-gray-900 to-gray-700',         circle: 'bg-white/5',   muted: 'text-gray-300'   },
  blue:   { grad: 'from-blue-700 to-blue-500',         circle: 'bg-white/10',  muted: 'text-blue-100'   },
  green:  { grad: 'from-emerald-700 to-emerald-500',   circle: 'bg-white/10',  muted: 'text-emerald-100'},
  teal:   { grad: 'from-teal-700 to-teal-500',         circle: 'bg-white/10',  muted: 'text-teal-100'   },
  red:    { grad: 'from-red-700 to-red-500',           circle: 'bg-white/10',  muted: 'text-red-100'    },
  purple: { grad: 'from-purple-700 to-purple-500',     circle: 'bg-white/10',  muted: 'text-purple-100' },
};

export default function OfferBannerSlider() {
  const { offerBanners } = useSettingsStore();
  const slides = offerBanners.filter(b => b.active && (b.title || b.subtitle));

  const [idx, setIdx]       = useState(0);
  const [paused, setPaused] = useState(false);

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
    >
      <div className={`bg-gradient-to-r ${theme.grad} relative`}>

        {/* Decorative bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className={`absolute -right-12 -top-12 w-72 h-72 rounded-full ${theme.circle}`} />
          <div className={`absolute right-36 -bottom-20 w-52 h-52 rounded-full ${theme.circle}`} />
          <div className={`absolute right-72 top-2 w-16 h-16 rounded-full ${theme.circle}`} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 relative">
          <div className="flex items-center gap-6">

            {/* Content */}
            <div className="flex-1 min-w-0">
              {b.badge && (
                <span className="inline-block bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-widest">
                  {b.badge}
                </span>
              )}
              <h2 className="text-white text-2xl md:text-3xl font-black leading-tight mb-1 truncate">
                {b.title}
              </h2>
              {b.subtitle && (
                <p className={`${theme.muted} text-sm md:text-base mb-4 max-w-lg`}>{b.subtitle}</p>
              )}
              {b.cta && b.ctaLink && (
                <Link
                  to={b.ctaLink}
                  className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
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
              <div className="flex items-center gap-1.5">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setIdx(i)} aria-label={`Go to slide ${i + 1}`}
                    className={`rounded-full transition-all duration-300 ${
                      i === idx ? 'bg-white w-5 h-1.5' : 'bg-white/40 w-1.5 h-1.5 hover:bg-white/60'
                    }`}
                  />
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

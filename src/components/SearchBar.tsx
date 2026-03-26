// ── SearchBar.tsx — Amazon-like autocomplete search bar ──────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Package, Tag, ArrowRight, Loader2 } from 'lucide-react';
import { getProducts } from '@/lib/api';
import { buildSearchIndex, autocomplete, type SearchIndex, type SearchSuggestion } from '@/lib/search';

// ── Shared index cache (so multiple SearchBar instances share one load) ────────
let _cachedIndex: SearchIndex | null = null;
let _indexTs = 0;
let _indexPromise: Promise<SearchIndex> | null = null;
const INDEX_TTL = 60 * 1000; // 1 minute

async function getIndex(): Promise<SearchIndex> {
  if (_cachedIndex && Date.now() - _indexTs < INDEX_TTL) return _cachedIndex;
  if (!_indexPromise) {
    _indexPromise = getProducts().then(({ products }) => {
      _cachedIndex = buildSearchIndex(products);
      _indexTs = Date.now();
      _indexPromise = null;
      return _cachedIndex;
    });
  }
  return _indexPromise;
}

export function invalidateSearchIndex() {
  _cachedIndex = null;
  _indexPromise = null;
}

// ── Type icons ─────────────────────────────────────────────────────────────────

function SuggestionIcon({ type }: { type: SearchSuggestion['type'] }) {
  if (type === 'category') return <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  if (type === 'brand')    return <span className="text-[10px] font-bold text-purple-500 shrink-0 w-3.5">B</span>;
  if (type === 'model')    return <span className="text-[10px] font-bold text-orange-400 shrink-0 w-3.5">#</span>;
  return <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SearchBarProps {
  placeholder?: string;
  className?:   string;
  inputClass?:  string;
  autoFocus?:   boolean;
  defaultValue?:string;
  onSearch?:    (q: string) => void; // override navigation
}

export default function SearchBar({
  placeholder  = 'Search products, brands, models…',
  className    = '',
  inputClass   = '',
  autoFocus    = false,
  defaultValue = '',
  onSearch,
}: SearchBarProps) {
  const navigate                        = useNavigate();
  const [query,       setQuery]         = useState(defaultValue);
  const [suggestions, setSuggestions]   = useState<SearchSuggestion[]>([]);
  const [open,        setOpen]          = useState(false);
  const [activeIdx,   setActiveIdx]     = useState(-1);
  const [loading,     setLoading]       = useState(false);
  const [index,       setIndex]         = useState<SearchIndex | null>(_cachedIndex);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  // Load index lazily on first focus
  const ensureIndex = useCallback(async () => {
    if (index) return index;
    setLoading(true);
    const idx = await getIndex();
    setIndex(idx);
    setLoading(false);
    return idx;
  }, [index]);

  // Click-outside closes dropdown
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setActiveIdx(-1);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Recompute suggestions whenever query or index changes
  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      const idx = await ensureIndex();
      setSuggestions(autocomplete(idx, query));
      setOpen(true);
      setActiveIdx(-1);
    }, 80);
    return () => clearTimeout(debounce.current);
  }, [query, ensureIndex]);

  function submit(q: string) {
    if (!q.trim()) return;
    setOpen(false); setSuggestions([]); setActiveIdx(-1);
    if (onSearch) { onSearch(q.trim()); }
    else { navigate(`/search?q=${encodeURIComponent(q.trim())}`); }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') submit(query);
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    if (e.key === 'Escape')    { setOpen(false); setActiveIdx(-1); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) {
        const s = suggestions[activeIdx];
        setQuery(s.text);
        submit(s.text);
      } else {
        submit(query);
      }
    }
  }

  const displayQ = activeIdx >= 0 ? suggestions[activeIdx].text : query;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative flex items-center">
        {loading
          ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin pointer-events-none" />
          : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        }
        <input
          ref={inputRef}
          type="search"
          value={displayQ}
          autoFocus={autoFocus}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={e => { setQuery(e.target.value); setActiveIdx(-1); }}
          onFocus={() => { ensureIndex(); if (suggestions.length > 0) setOpen(true); }}
          onKeyDown={handleKey}
          className={`pl-9 pr-8 py-2 w-full rounded-full bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent ${inputClass}`}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={`${s.type}-${s.text}`}
              onMouseDown={e => { e.preventDefault(); setQuery(s.text); submit(s.text); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                i === activeIdx ? 'bg-orange-50' : 'hover:bg-gray-50'
              } ${i > 0 ? 'border-t border-gray-50' : ''}`}
            >
              <SuggestionIcon type={s.type} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800 block truncate">{s.text}</span>
                {s.subtext && <span className="text-xs text-gray-400 truncate block">{s.subtext}</span>}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            </button>
          ))}

          {/* Search all hint */}
          <button
            onMouseDown={e => { e.preventDefault(); submit(query); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left bg-gray-50 border-t border-gray-100 hover:bg-orange-50 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="text-sm text-orange-600 font-medium">
              Search all results for "<span className="font-bold">{query}</span>"
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

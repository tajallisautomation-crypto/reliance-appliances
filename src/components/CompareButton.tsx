import { Link } from 'react-router-dom';
import { GitCompareArrows, X, CheckSquare } from 'lucide-react';
import { useCompareStore, MAX_COMPARE_ITEMS } from '@/store/compareStore';
import type { Product } from '@/lib/api';

interface Props {
  product: Product;
  /** 'icon' = compact icon-only button, 'full' = full labelled button */
  variant?: 'icon' | 'full';
  className?: string;
}

export default function CompareButton({ product, variant = 'full', className = '' }: Props) {
  const { has, toggle, items } = useCompareStore();
  const active  = has(product.id);
  const full    = items.length >= MAX_COMPARE_ITEMS && !active;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (full) return;
    toggle(product);
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        title={full ? `Max ${MAX_COMPARE_ITEMS} products` : active ? 'Remove from compare' : 'Add to compare'}
        className={`w-11 h-11 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-apple-lg transition-colors
          ${active
            ? 'bg-orange-500 text-white'
            : full
              ? 'bg-white text-gray-300 cursor-not-allowed opacity-60'
              : 'bg-white text-gray-500 hover:bg-orange-50 hover:text-orange-500'}
          ${className}`}
      >
        {active ? <CheckSquare className="w-4 h-4" /> : <GitCompareArrows className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={full}
      title={full ? `Max ${MAX_COMPARE_ITEMS} products` : undefined}
      className={`flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors
        ${active
          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          : full
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'}
        ${className}`}
    >
      <GitCompareArrows className="w-3.5 h-3.5" />
      {active ? 'In Compare' : 'Compare'}
    </button>
  );
}

/** Floating compare bar shown at the bottom of the page when items are selected. */
export function CompareBar() {
  const { items, remove, clear } = useCompareStore();
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-2xl">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <GitCompareArrows className="w-5 h-5 text-orange-400 shrink-0" />
        <span className="text-sm font-semibold text-orange-300 shrink-0">
          Compare ({items.length}/{MAX_COMPARE_ITEMS})
        </span>
        <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar">
          {items.map(p => (
            <div key={p.id} className="flex items-center gap-1 bg-gray-800 rounded-lg px-2.5 py-1 shrink-0">
              {p.thumbnail?.startsWith('http') && (
                <img src={p.thumbnail} alt="" className="w-6 h-6 object-cover rounded" />
              )}
              <span className="text-xs text-white truncate max-w-[120px]">
                {p.simplified_name || `${p.brand} ${p.model}`}
              </span>
              <button onClick={() => remove(p.id)} className="ml-1 text-gray-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={clear} className="text-xs text-gray-400 hover:text-white">Clear</button>
          <Link
            to="/compare"
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
            Compare Now
          </Link>
        </div>
      </div>
    </div>
  );
}

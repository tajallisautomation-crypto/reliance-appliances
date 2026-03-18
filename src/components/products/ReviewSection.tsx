import { useEffect, useState, type FormEvent } from 'react';
import { Star, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Review {
  id:               string;
  customer_name:    string;
  city:             string | null;
  rating:           number;
  comment:          string;
  verified_purchase: boolean;
  created_at:       string;
}

interface Props {
  productId:   string;
  productName: string;
}

function StarRating({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={`transition-colors ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
        >
          <Star className={`w-5 h-5 ${n <= display ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
        </button>
      ))}
    </div>
  );
}

function RatingSummary({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  const avg   = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const counts = [5, 4, 3, 2, 1].map(n => ({ n, count: reviews.filter(r => r.rating === n).length }));

  return (
    <div className="flex gap-8 items-center mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
      <div className="text-center flex-shrink-0">
        <p className="text-5xl font-black text-gray-900">{avg.toFixed(1)}</p>
        <StarRating value={Math.round(avg)} />
        <p className="text-xs text-gray-500 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex-1 space-y-1.5">
        {counts.map(({ n, count }) => (
          <div key={n} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-4 text-right">{n}</span>
            <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all"
                style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-xs text-gray-400 w-5">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewSection({ productId, productName }: Props) {
  const [reviews,    setReviews]   = useState<Review[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [showForm,   setShowForm]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted] = useState(false);
  const [formError,  setFormError] = useState('');

  const [name,    setName]    = useState('');
  const [city,    setCity]    = useState('');
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    setLoading(true);
    supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReviews((data as Review[]) ?? []);
        setLoading(false);
      });
  }, [productId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setFormError('Please select a star rating.'); return; }
    if (!comment.trim()) { setFormError('Please write a review comment.'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('reviews').insert({
        product_id:    productId,
        customer_name: name,
        city:          city || null,
        rating,
        comment:       comment.trim(),
      }).select().single();

      if (error) throw error;

      // Optimistic update
      setReviews(prev => [data as Review, ...prev]);
      setSubmitted(true);
      setShowForm(false);
      setName(''); setCity(''); setRating(0); setComment('');
    } catch {
      setFormError('Could not submit your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading reviews…
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-gray-900 text-lg">
          Customer Reviews {reviews.length > 0 && <span className="text-gray-400 font-normal text-sm">({reviews.length})</span>}
        </h3>
        {!showForm && !submitted && (
          <button onClick={() => setShowForm(true)}
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 border border-brand-200 px-4 py-2 rounded-xl hover:bg-brand-50 transition-colors">
            Write a Review
          </button>
        )}
      </div>

      {submitted && (
        <div className="flex items-center gap-3 bg-eco-50 border border-eco-200 rounded-2xl p-4 mb-6">
          <CheckCircle className="w-5 h-5 text-eco-500 flex-shrink-0" />
          <p className="text-sm text-eco-800 font-medium">Thank you — your review has been published.</p>
        </div>
      )}

      <RatingSummary reviews={reviews} />

      {/* Write review form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8 space-y-4 animate-slide-up">
          <h4 className="font-bold text-gray-900">Review {productName}</h4>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Your Rating *</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Your Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Nasir A."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 bg-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">City</label>
              <input value={city} onChange={e => setCity(e.target.value)}
                placeholder="e.g. Karachi"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 bg-white" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Your Review *</label>
            <textarea required value={comment} onChange={e => setComment(e.target.value)} rows={3}
              placeholder="Share your experience with this product…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 bg-white resize-none" />
          </div>

          {formError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Review'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-5 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-gray-500">No reviews yet.</p>
          <p className="text-sm mt-1">Be the first to review this product.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {reviews.map(r => (
            <div key={r.id} className="border-b border-gray-100 pb-5 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {r.customer_name}
                    {r.city && <span className="text-gray-400 font-normal"> · {r.city}</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating value={r.rating} />
                    {r.verified_purchase && (
                      <span className="inline-flex items-center gap-1 text-xs text-eco-700 font-medium">
                        <CheckCircle className="w-3 h-3" /> Verified Purchase
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

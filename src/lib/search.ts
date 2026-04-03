// ── search.ts — Client-side search engine ────────────────────────────────────
// Amazon-like: instant, fuzzy, ranked, with autocomplete

import type { Product } from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IndexedProduct {
  product:         Product;
  tokens:          Set<string>;
  modelNorm:       string;
  nameLower:       string;
  brandLower:      string;
  catLower:        string;
  subCatLower:     string;
  /** Normalized canonical category — more reliable for category-hint filtering */
  normCatLower:    string;
  /** Normalized subcategory */
  normSubCatLower: string;
  /** Normalized browse group (frontend_browse_group) */
  browseGroupLower: string;
  searchBlob:      string;   // full-text for substring search
  price:           number;
  /**
   * Parsed capacity in tons (for ACs) or kWh (for batteries/solar).
   * Enables capacity-aware scoring so "1.5 ton" strictly outranks "1 ton" for that query.
   * Governance: derived from structured specs fields only — never from raw text guessing.
   */
  capacityTon?: number;
}

export interface SearchIndex {
  products:      IndexedProduct[];
  brands:        string[];
  categories:    string[];
  modelNumbers:  string[];
}

export interface SearchResult {
  product: Product;
  score:   number;
}

export interface SearchSuggestion {
  text:       string;
  subtext?:   string;
  type:       'product' | 'category' | 'brand' | 'model';
  productId?: string;
}

export interface ParsedQuery {
  raw:           string;
  clean:         string;
  terms:         string[];
  priceMax?:     number;
  priceMin?:     number;
  isModelLike:   boolean;
  brandHint?:    string;
  categoryHint?: string;
  /** Capacity in tons parsed from query — e.g. "1.5 ton" → 1.5. Enables strict capacity scoring. */
  capacityTonHint?: number;
  // admin-only
  missingImages?: boolean;
  missingName?:   boolean;
  missingDesc?:   boolean;
}

export interface SearchOptions {
  limit?:    number;
  category?: string;
  brand?:    string;
  priceMin?: number;
  priceMax?: number;
}

// ── Known brands (for query parsing) ─────────────────────────────────────────

const KNOWN_BRANDS = [
  'haier','dawlance','pel','waves','samsung','lg','tcl','hisense',
  'westpoint','boss','orient','gree','kenwood','super asia','nasgas',
  'rinnai','milan','geepas','anex','tefal','spectrum','baltra','homage',
  'panasonic','sharp','philips','black decker',
];

// ── Category keyword → display name mapping ───────────────────────────────────

const CAT_KEYWORDS: Array<[string, string[]]> = [
  // Abbreviations listed before full terms so shorter queries resolve correctly
  ['Air Conditioners',  ['air conditioner','split ac','inverter ac','dc inverter','window ac','floor standing ac',' ac ','acs','ac unit']],
  ['Refrigerators',     ['refrigerator','fridge','fridges','refs','ref ','no frost','side by side','french door','double door','minibar']],
  ['Freezers',          ['deep freezer','chest freezer','vertical freezer','freezer','deep freeze']],
  ['Washing Machines',  ['washing machine','washer','washers','top load','front load','twin tub','semi automatic','fully automatic','washing']],
  ['Televisions',       ['television','televisions','smart tv','led tv','led tvs','qled','oled','4k tv','android tv','google tv','tvs','tv set']],
  ['Solar Solutions',   ['solar panel','solar inverter','solar system','ups','battery','solar']],
  ['Kitchen Appliances',['microwave','microwaves','air fryer','blender','juicer','toaster','kettle','rice cooker','sandwich maker','food processor','hand blender']],
  ['Water Dispensers',  ['water dispenser','water cooler','dispenser']],
  ['Vacuum Cleaners',   ['vacuum cleaner','vacuum']],
  ['Small Appliances',  ['ceiling fan','fans','iron','heater','air cooler','trimmer','hair dryer','hand mixer','small appliance']],
];

// ── Normalization helpers ──────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9.]/g, '');
}

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .split(/[\s\-_\/,;:()\[\]{}'"!@#$%^&*+=|<>?]+/)
    .map(t => t.replace(/[^a-z0-9.]/g, ''))
    .filter(t => t.length >= 1);
}

// ── Build index ────────────────────────────────────────────────────────────────

export function buildSearchIndex(products: Product[]): SearchIndex {
  const indexed: IndexedProduct[]  = [];
  const brandsSet                  = new Set<string>();
  const catsSet                    = new Set<string>();
  const modelsSet                  = new Set<string>();

  for (const p of products) {
    const tokens = new Set<string>();

    const add = (...vals: string[]) => vals.forEach(v => { if (v) tokenize(v).forEach(t => tokens.add(t)); });
    const addRaw = (v: string) => { if (v) tokens.add(v.toLowerCase()); };

    // Brand
    add(p.brand); addRaw(p.brand);
    if (p.brand) brandsSet.add(p.brand.toLowerCase());

    // Model — split on delimiters AND add full/normalized
    add(p.model); addRaw(p.model);
    tokens.add(norm(p.model));
    if (p.model) modelsSet.add(p.model.toLowerCase());

    // Name
    add(p.simplified_name);

    // Category / sub-cat — both raw supplier and normalized canonical
    add(p.category, p.sub_category);
    addRaw(p.category); addRaw(p.sub_category);
    if (p.category) catsSet.add(p.category);
    // Normalized fields (Layer 2 taxonomy) — power category-hint filtering
    if (p.normalized_category)    { add(p.normalized_category);    addRaw(p.normalized_category); }
    if (p.normalized_subcategory) { add(p.normalized_subcategory); addRaw(p.normalized_subcategory); }
    if (p.frontend_browse_group)  { addRaw(p.frontend_browse_group); }

    // Tags
    if (p.tags) add(p.tags);

    // Specs — flatten values: "1000W" → "1000w", "1.5L" → "1.5l"
    if (p.specs) {
      Object.values(p.specs).forEach(v => {
        const s = String(v);
        tokens.add(s.toLowerCase().replace(/\s+/g, ''));
        add(s);
      });
    }

    // Description (first 300 chars, only 4+ char tokens to avoid noise)
    if (p.description) {
      tokenize(p.description.slice(0, 300))
        .filter(t => t.length >= 4)
        .forEach(t => tokens.add(t));
    }

    const searchBlob = [
      p.brand, p.model, p.simplified_name, p.category,
      p.sub_category, p.normalized_category, p.normalized_subcategory,
      p.frontend_browse_group,
      p.tags, p.description?.slice(0, 300) ?? '',
      Object.values(p.specs ?? {}).join(' '),
    ].join(' ').toLowerCase();

    // ── Capacity parsing (ACs: tons; solar/batteries: kWh) ──────────────────────
    // Governance: read from structured specs only. Never guess from raw text.
    let capacityTon: number | undefined;
    if (p.specs) {
      const tonSpec = p.specs['Tonnage'] || p.specs['tonnage'] || '';
      const tonMatch = String(tonSpec).match(/^([\d.]+)\s*[Tt]on/);
      if (tonMatch) capacityTon = parseFloat(tonMatch[1]);
    }

    indexed.push({
      product:          p,
      tokens,
      modelNorm:        norm(p.model),
      nameLower:        (p.simplified_name || '').toLowerCase(),
      brandLower:       p.brand.toLowerCase(),
      catLower:         p.category.toLowerCase(),
      subCatLower:      (p.sub_category || '').toLowerCase(),
      normCatLower:     (p.normalized_category    || '').toLowerCase(),
      normSubCatLower:  (p.normalized_subcategory || '').toLowerCase(),
      browseGroupLower: (p.frontend_browse_group  || '').toLowerCase(),
      searchBlob,
      price:            p.price.cash_floor,
      capacityTon,
    });
  }

  return {
    products:    indexed,
    brands:      [...brandsSet].sort(),
    categories:  [...catsSet].sort(),
    modelNumbers:[...modelsSet].sort(),
  };
}

// ── Query parsing ─────────────────────────────────────────────────────────────

function parsePriceToken(s: string): number {
  const c = s.replace(/,/g, '');
  if (c.endsWith('k')) return parseFloat(c) * 1000;
  return parseFloat(c);
}

export function parseQuery(raw: string): ParsedQuery {
  let working = raw.toLowerCase().trim().replace(/['"]/g, '');

  // Admin special tokens
  let missingImages = false, missingName = false, missingDesc = false;
  if (/missing.*(image|img|photo|thumbnail)/i.test(working)) {
    missingImages = true;
    working = working.replace(/missing.*(image|img|photo|thumbnail)\w*/gi, '').trim();
  }
  if (/missing.*(name|title|simplified)/i.test(working)) {
    missingName = true;
    working = working.replace(/missing.*(name|title|simplified)\w*/gi, '').trim();
  }
  if (/missing.*(desc|description)/i.test(working)) {
    missingDesc = true;
    working = working.replace(/missing.*(desc|description)\w*/gi, '').trim();
  }

  // Price: "between X and Y"
  let priceMin: number | undefined, priceMax: number | undefined;
  const betweenM = working.match(/\bbetween\s+([\d,]+k?)\s+(?:and|to|-)\s+([\d,]+k?)\b/i);
  if (betweenM) {
    priceMin = parsePriceToken(betweenM[1]);
    priceMax = parsePriceToken(betweenM[2]);
    working  = working.replace(betweenM[0], '').trim();
  }

  // Price: "under/below X" or "above/over X"
  const underM = working.match(/\b(?:under|below|less than|max|up to)\s+([\d,]+k?)\b/i);
  if (underM) { priceMax = parsePriceToken(underM[1]); working = working.replace(underM[0], '').trim(); }
  const overM = working.match(/\b(?:above|over|more than|min)\s+([\d,]+k?)\b/i);
  if (overM)  { priceMin = parsePriceToken(overM[1]);  working = working.replace(overM[0], '').trim(); }

  // Strip filler words
  working = working.replace(/\b(?:show|find|get|search|for|me|the|a|an|in|with|that|has|have|are|is)\b/g, ' ').replace(/\s+/g, ' ').trim();

  const terms = working.split(/\s+/).filter(t => t.length > 0);

  // Model-like: alphanumeric with digits, not a pure category word
  const CATEGORY_WORDS = /^(air|washing|refriger|micro|solar|water|vacuum|small|kitchen|television|freezer|blender|fryer|cooler|heater|iron|fan|juicer|toaster|kettle|mixer|oven)$/i;
  const joined = working.replace(/\s/g, '');
  const isModelLike = /\d/.test(joined) && /^[a-z0-9][a-z0-9\-\.]*$/i.test(joined) && !CATEGORY_WORDS.test(working.trim());

  // Brand hint — longest match wins
  let brandHint: string | undefined;
  for (const brand of KNOWN_BRANDS.sort((a, b) => b.length - a.length)) {
    if (working.includes(brand)) { brandHint = brand; break; }
  }

  // Category hint — first keyword match wins
  let categoryHint: string | undefined;
  outer: for (const [cat, kws] of CAT_KEYWORDS) {
    for (const kw of kws) {
      if (working.includes(kw)) { categoryHint = cat; break outer; }
    }
  }

  // Capacity hint — detect "1.5 ton", "1 ton", "2 ton", "1.5ton", "15 ton" etc.
  let capacityTonHint: number | undefined;
  const capMatch = working.match(/\b([\d.]+)\s*ton\b/i);
  if (capMatch) {
    const v = parseFloat(capMatch[1]);
    if (v >= 0.5 && v <= 5) capacityTonHint = v; // sanity range — ignore nonsense values
  }

  return { raw, clean: working, terms, priceMax, priceMin, isModelLike, brandHint, categoryHint, capacityTonHint, missingImages, missingName, missingDesc };
}

// ── Edit distance (Levenshtein) ───────────────────────────────────────────────

function editDist(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 3) return 99;
  const dp = new Array(b.length + 1).fill(0).map((_: unknown, i: number) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i-1] === b[j-1] ? prev : 1 + Math.min(prev, dp[j], dp[j-1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}

function fuzzyMatch(query: string, token: string): boolean {
  if (token.includes(query)) return true;
  if (query.length <= 3) return false;
  return editDist(query, token) <= (query.length <= 5 ? 1 : 2);
}

// ── Scoring ────────────────────────────────────────────────────────────────────

function scoreProduct(ip: IndexedProduct, pq: ParsedQuery): number {
  // Hard price filter
  if (pq.priceMax !== undefined && ip.price > pq.priceMax) return -1;
  if (pq.priceMin !== undefined && ip.price < pq.priceMin) return -1;

  let score = 0;
  const q     = pq.clean;
  const terms = pq.terms;
  const qNorm = norm(q.replace(/\s/g, ''));

  if (!q && !pq.brandHint && !pq.categoryHint && pq.priceMax === undefined && pq.priceMin === undefined) return 1; // empty query = show all

  // ── Model matching (highest priority) ────────────────────────────────────
  if (ip.modelNorm === qNorm)                    { score += 200; }
  else if (ip.modelNorm.startsWith(qNorm) && qNorm.length >= 2) { score += 150; }
  else if (ip.modelNorm.includes(qNorm) && qNorm.length >= 3)   { score += 100; }
  // Parts of model
  const mParts = ip.product.model.split(/[-\s_]/);
  if (mParts.some(part => norm(part) === qNorm && qNorm.length >= 2)) { score += 80; }

  // ── Name matching ─────────────────────────────────────────────────────────
  if (ip.nameLower === q)                                          { score += 120; }
  else if (ip.nameLower.startsWith(q))                             { score += 90;  }
  else if (ip.nameLower.includes(q))                               { score += 65;  }
  else if (terms.length > 1 && terms.every(t => ip.nameLower.includes(t))) { score += 55; }

  // ── Brand matching ────────────────────────────────────────────────────────
  if (ip.brandLower === q || ip.brandLower === terms[0])         { score += 50; }
  else if (pq.brandHint && ip.brandLower.includes(pq.brandHint)) { score += 45; }
  else if (terms.some(t => t.length >= 3 && ip.brandLower === t)){ score += 30; }

  // ── Category matching ─────────────────────────────────────────────────────
  // Check both raw supplier category and normalized canonical taxonomy fields.
  // Normalized fields are more reliable because they don't vary by supplier naming.
  if (pq.categoryHint) {
    const hint = pq.categoryHint.toLowerCase();
    if (ip.catLower.includes(hint))         { score += 50; }
    if (ip.subCatLower.includes(hint))      { score += 25; }
    if (ip.normCatLower.includes(hint))     { score += 45; }
    if (ip.normSubCatLower.includes(hint))  { score += 20; }
    if (ip.browseGroupLower.includes(hint)) { score += 15; }
  }
  if (terms.some(t => t.length >= 4 && ip.catLower.includes(t)))         { score += 20; }
  if (terms.some(t => t.length >= 4 && ip.subCatLower.includes(t)))      { score += 10; }
  if (terms.some(t => t.length >= 4 && ip.normCatLower.includes(t)))     { score += 18; }
  if (terms.some(t => t.length >= 4 && ip.normSubCatLower.includes(t)))  { score += 8;  }

  // ── Capacity matching (first-class: "1.5 ton" must beat "1 ton" for that query) ─
  // Governance: exact ton match = +80 bonus; wrong capacity = −40 penalty when a hint is present.
  // This prevents "2 ton" ACs appearing above "1.5 ton" ACs for a "1.5 ton" query.
  if (pq.capacityTonHint !== undefined && ip.capacityTon !== undefined) {
    const diff = Math.abs(ip.capacityTon - pq.capacityTonHint);
    if (diff === 0)           { score += 80; }   // exact capacity match
    else if (diff <= 0.2)     { score += 20; }   // very close (e.g. 1.5 vs 1.4)
    else                      { score -= 40; }   // wrong capacity — demote
  }

  // ── Token matching ────────────────────────────────────────────────────────
  for (const term of terms) {
    if (term.length < 2) continue;
    if (ip.tokens.has(term))                                              { score += 15; }
    else if ([...ip.tokens].some(t => t.startsWith(term) && term.length >= 3)) { score += 8; }
  }

  // ── Blob: all terms present ───────────────────────────────────────────────
  if (terms.length > 1 && terms.every(t => ip.searchBlob.includes(t))) { score += 15 * terms.length; }

  // ── Fuzzy fallback (only when score is low) ───────────────────────────────
  if (score < 25) {
    for (const term of terms) {
      if (term.length < 4) continue;
      for (const token of ip.tokens) {
        if (token.length < 3) continue;
        if (fuzzyMatch(term, token)) { score += 8; break; }
      }
    }
  }

  return score;
}

// ── Main search ────────────────────────────────────────────────────────────────

export function search(
  index:   SearchIndex,
  query:   string,
  options: SearchOptions = {}
): SearchResult[] {
  const pq = parseQuery(query);

  let candidates = index.products;

  // Hard filters from options
  if (options.category) {
    const cl = options.category.toLowerCase();
    candidates = candidates.filter(ip => ip.catLower.includes(cl));
  }
  if (options.brand) {
    const bl = options.brand.toLowerCase();
    candidates = candidates.filter(ip => ip.brandLower === bl);
  }
  if (options.priceMin !== undefined) candidates = candidates.filter(ip => ip.price >= options.priceMin!);
  if (options.priceMax !== undefined) candidates = candidates.filter(ip => ip.price <= options.priceMax!);

  // When the query maps to a specific category, restrict candidates to that category.
  // This prevents e.g. "led" or "refs" from returning ACs/TVs via token or fuzzy matches.
  // Check both raw supplier category AND normalized taxonomy fields so products with
  // unusual supplier category strings (e.g. "Hybrid Inverter" for Ziewnic) still match.
  if (pq.categoryHint) {
    const hint = pq.categoryHint.toLowerCase().replace(/s$/, ''); // strip trailing s for partial match
    const catCandidates = candidates.filter(ip =>
      ip.catLower.includes(hint)         ||
      ip.subCatLower.includes(hint)      ||
      ip.normCatLower.includes(hint)     ||
      ip.normSubCatLower.includes(hint)  ||
      ip.browseGroupLower.includes(hint)
    );
    // Only restrict if at least some products match the category — avoids empty results
    if (catCandidates.length > 0) candidates = catCandidates;
  }

  // Minimum score: 12 filters out weak fuzzy/blob-only matches
  const MIN_SCORE = pq.clean ? 12 : 1;

  const results: SearchResult[] = [];
  for (const ip of candidates) {
    const score = scoreProduct(ip, pq);
    if (score >= MIN_SCORE) results.push({ product: ip.product, score });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break: featured first
    if (a.product.featured !== b.product.featured) return b.product.featured ? 1 : -1;
    return 0;
  });

  return results.slice(0, options.limit ?? 60);
}

// ── Autocomplete ──────────────────────────────────────────────────────────────

export function autocomplete(
  index: SearchIndex,
  query: string,
  limit = 8
): SearchSuggestion[] {
  if (!query.trim()) return [];
  const q   = query.toLowerCase().trim();
  const out: SearchSuggestion[] = [];
  const seen = new Set<string>();

  function push(s: SearchSuggestion) {
    if (seen.has(s.text.toLowerCase()) || out.length >= limit) return;
    seen.add(s.text.toLowerCase());
    out.push(s);
  }

  // 1. Product name matches — starts-with first, then contains
  const nameMatches = index.products
    .filter(ip => ip.nameLower.startsWith(q) || (q.length >= 3 && ip.nameLower.includes(q)))
    .sort((a, b) => {
      const as = a.nameLower.startsWith(q) ? 0 : 1;
      const bs = b.nameLower.startsWith(q) ? 0 : 1;
      return as - bs || (b.product.featured ? 1 : 0) - (a.product.featured ? 1 : 0);
    });
  for (const ip of nameMatches.slice(0, 5)) {
    push({ text: ip.product.simplified_name || ip.product.model, subtext: ip.product.category, type: 'product', productId: ip.product.id });
  }

  // 2. Model-number matches
  if (out.length < limit) {
    const mNorm = norm(q);
    const mMatches = index.products
      .filter(ip => ip.modelNorm.startsWith(mNorm) || ip.product.model.toLowerCase().startsWith(q))
      .slice(0, 3);
    for (const ip of mMatches) {
      push({ text: ip.product.simplified_name || ip.product.model, subtext: ip.product.model, type: 'model', productId: ip.product.id });
    }
  }

  // 3. Category matches
  if (out.length < limit) {
    for (const cat of index.categories) {
      if (cat.toLowerCase().startsWith(q) || (q.length >= 3 && cat.toLowerCase().includes(q))) {
        push({ text: cat, type: 'category' });
      }
    }
  }

  // 4. Brand matches
  if (out.length < limit) {
    for (const brand of index.brands) {
      if (brand.startsWith(q)) {
        push({ text: brand.charAt(0).toUpperCase() + brand.slice(1), type: 'brand' });
      }
    }
  }

  return out;
}

// ── Admin search (extends regular search with admin-specific filters) ─────────

export function adminSearch(
  index:    SearchIndex,
  query:    string,
  options?: SearchOptions
): SearchResult[] {
  const pq = parseQuery(query);

  // Start with all or text-matched results
  let results = query.trim()
    ? search(index, query, { limit: 500, ...options })
    : index.products.map(ip => ({ product: ip.product, score: 1 }));

  // Admin special filters from query
  if (pq.missingImages) {
    results = results.filter(r => !r.product.thumbnail?.includes('supabase'));
  }
  if (pq.missingName) {
    results = results.filter(r => !r.product.simplified_name?.trim());
  }
  if (pq.missingDesc) {
    results = results.filter(r => !r.product.description?.trim());
  }

  return results;
}

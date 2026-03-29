import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Grid3X3, List, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'
import { getProducts, DEFAULT_CATEGORIES, formatPrice, type Product } from '../lib/api'
import ProductCard from '../components/products/ProductCard'
import SEO from '../components/ui/SEO'

const SORT_OPTIONS = [
  { value: '',           label: 'Featured'   },
  { value: 'newest',     label: 'Newest'     },
  { value: 'price_asc',  label: 'Price ↑'   },
  { value: 'price_desc', label: 'Price ↓'   },
  { value: 'name_asc',   label: 'Name A–Z'  },
]

const BUDGET_RANGES = [
  { label: 'Under 20k',      min: 0,       max: 20000   },
  { label: '20k – 50k',      min: 20000,   max: 50000   },
  { label: '50k – 1 Lac',    min: 50000,   max: 100000  },
  { label: '1 – 2 Lac',      min: 100000,  max: 200000  },
  { label: 'Above 2 Lac',    min: 200000,  max: 9999999 },
]

// Broad category groups — each group contains one or more DEFAULT_CATEGORIES ids
const CATEGORY_GROUPS = [
  { id: 'cooling', label: 'Cooling & Climate',  icon: '❄️', cats: ['ac', 'fridge', 'fridge-nofrost', 'fridge-sbs', 'fridge-french', 'freezer'] },
  { id: 'laundry', label: 'Laundry',            icon: '🫧', cats: ['washing', 'frontload'] },
  { id: 'kitchen', label: 'Kitchen & Cooking',  icon: '🍳', cats: ['kitchen', 'microwave-solo', 'microwave-grill', 'microwave-convection', 'hood'] },
  { id: 'tv',      label: 'Televisions',        icon: '📺', cats: ['tv'] },
  { id: 'solar',   label: 'Solar & Energy',     icon: '☀️', cats: ['solar-inverter', 'solar-battery', 'solar-panel', 'solar-pump'] },
  { id: 'home',    label: 'Home & Comfort',     icon: '🏠', cats: ['fan', 'water', 'small', 'care'] },
] as const

// Category-specific spec filters — applied client-side
type SpecFilter = { key: string; label: string; options: { value: string; label: string; match: (p: Product) => boolean }[] }

// Helper: extract numeric value from simplified_name (e.g. "55 inch" → 55, "4kg" → 4)
const _inches = (p: Product) => { const m = (p.simplified_name + ' ' + p.tags).match(/(\d{2})\s*(?:"|inch|")/i); return m ? parseInt(m[1]) : 0; }
const _kg     = (p: Product) => { const m = (p.simplified_name + ' ' + p.tags).match(/(\d{1,2}(?:\.\d)?)\s*kg/i); return m ? parseFloat(m[1]) : 0; }
const _liters = (p: Product) => { const c = p.specs?.['Capacity'] || ''; const m = c.match(/(\d{2,3})\s*L/i); return m ? parseInt(m[1]) : 0; }
const _cuft   = (p: Product) => { const c = p.specs?.['Capacity'] || p.simplified_name; const m = c.match(/(\d{1,2}(?:\.\d)?)\s*(?:cu\.?ft|cubic)/i); return m ? parseFloat(m[1]) : 0; }

const SPEC_FILTERS: Record<string, SpecFilter[]> = {
  // ── Air Conditioners ─────────────────────────────────────────────────────────
  ac: [
    {
      key: 'tonnage', label: 'Tonnage',
      options: [
        { value: '1t',   label: '1 Ton',    match: p => /\b1\s*ton/i.test(p.category) && !/1\.5|2\s*ton/i.test(p.category) },
        { value: '1.5t', label: '1.5 Ton',  match: p => /1\.5\s*ton/i.test(p.category) },
        { value: '2t',   label: '2 Ton',    match: p => /\b2\s*ton/i.test(p.category) },
      ],
    },
    {
      key: 'actech', label: 'Technology',
      options: [
        { value: 'inverter',     label: 'Inverter',      match: p => /inverter/i.test(p.tags + ' ' + p.simplified_name) },
        { value: 'non-inverter', label: 'Non-Inverter',  match: p => !/inverter/i.test(p.tags + ' ' + p.simplified_name) },
      ],
    },
    {
      key: 'actype', label: 'Type',
      options: [
        { value: 'split',  label: 'Split AC',          match: p => !/floor.?standing|portable|window/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'floor',  label: 'Floor Standing',    match: p => /floor.?standing|floor.?mount/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'portable',label:'Portable / Window', match: p => /portable|window.?ac/i.test(p.simplified_name + ' ' + p.tags) },
      ],
    },
    {
      key: 'acfeatures', label: 'Features',
      options: [
        { value: 'wifi',  label: 'WiFi / Smart Control', match: p => /wifi|wi-fi|smart.?control/i.test(p.tags + ' ' + p.simplified_name) },
        { value: 'conv',  label: 'Convertible (5-in-1+)',match: p => /convertible|\bin-1\b|5-in-1|4-in-1/i.test(p.tags + ' ' + p.simplified_name) },
        { value: 'heat',  label: 'Heat & Cool',          match: p => /heat|heating/i.test(p.tags + ' ' + p.simplified_name) },
      ],
    },
  ],

  // ── Refrigerators ────────────────────────────────────────────────────────────
  fridge: [
    {
      key: 'fridgesize', label: 'Size',
      options: [
        { value: 'small',  label: 'Compact (≤10 Cu.Ft)',   match: p => { const c = _cuft(p); return c > 0 ? c <= 10 : p.category.toLowerCase().includes('small'); } },
        { value: 'medium', label: 'Medium (11–16 Cu.Ft)',  match: p => { const c = _cuft(p); return c > 0 ? c >= 11 && c <= 16 : p.category.toLowerCase().includes('medium'); } },
        { value: 'large',  label: 'Large (17+ Cu.Ft)',     match: p => { const c = _cuft(p); return c > 0 ? c >= 17 : p.category.toLowerCase().includes('large'); } },
      ],
    },
    {
      key: 'fridgetype', label: 'Type',
      options: [
        { value: 'glass',  label: 'Glass Door',            match: p => /glass.?door|glass.?top/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'double', label: 'Double Door',           match: p => /double.?door|two.?door|2-door/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'mini',   label: 'Mini / Bar Fridge',     match: p => /mini.?fridge|bar.?fridge|mini.?ref/i.test(p.simplified_name + ' ' + p.tags) },
      ],
    },
    {
      key: 'fridgetech', label: 'Technology',
      options: [
        { value: 'inverter',  label: 'Inverter Compressor', match: p => /inverter/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'nofrost',   label: 'No-Frost / Frost-Free',match: p => /no.?frost|frost.?free/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'autofrost', label: 'Auto-Defrost',         match: p => /auto.?defrost|auto.?frost/i.test(p.simplified_name + ' ' + p.tags) },
      ],
    },
  ],

  // ── Freezers ─────────────────────────────────────────────────────────────────
  freezer: [
    {
      key: 'freezertype', label: 'Type',
      options: [
        { value: 'chest',   label: 'Chest Freezer',   match: p => /chest/i.test(p.simplified_name + ' ' + p.category + ' ' + p.tags) },
        { value: 'upright', label: 'Upright Freezer',  match: p => /upright|vertical/i.test(p.simplified_name + ' ' + p.category + ' ' + p.tags) },
        { value: 'deep',    label: 'Deep Freezer',     match: p => /deep.?fre|HDF/i.test(p.simplified_name + ' ' + p.category + ' ' + p.model) },
      ],
    },
    {
      key: 'freezercap', label: 'Capacity',
      options: [
        { value: 'small',  label: 'Small (≤6 Cu.Ft)',   match: p => { const c = _cuft(p); return c > 0 ? c <= 6 : /small/i.test(p.simplified_name) } },
        { value: 'medium', label: 'Medium (7–12 Cu.Ft)',match: p => { const c = _cuft(p); return c > 0 ? c >= 7 && c <= 12 : false; } },
        { value: 'large',  label: 'Large (13+ Cu.Ft)',  match: p => { const c = _cuft(p); return c > 0 ? c >= 13 : /large/i.test(p.simplified_name); } },
      ],
    },
    {
      key: 'freezertech', label: 'Technology',
      options: [
        { value: 'inverter', label: 'Inverter',           match: p => /inverter/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'nofrost',  label: 'No-Frost',           match: p => /no.?frost/i.test(p.simplified_name + ' ' + p.tags) },
      ],
    },
  ],

  // ── Washing Machines ─────────────────────────────────────────────────────────
  washing: [
    {
      key: 'washtype', label: 'Type',
      options: [
        { value: 'front',   label: 'Front Load Auto',  match: p => /front.?load/i.test(p.tags + ' ' + p.simplified_name) },
        { value: 'top',     label: 'Top Load Auto',    match: p => /top.?load/i.test(p.tags + ' ' + p.simplified_name) && !/semi/i.test(p.category) },
        { value: 'semi',    label: 'Semi-Automatic',   match: p => p.category.toLowerCase().includes('semi-automatic') },
        { value: 'spinner', label: 'Spinner',          match: p => /spinner|spin dryer/i.test(p.category + ' ' + p.tags) },
      ],
    },
    {
      key: 'washcap', label: 'Capacity',
      options: [
        { value: 'small',   label: 'Up to 7 kg',      match: p => { const k = _kg(p); return k > 0 ? k <= 7 : false } },
        { value: 'medium',  label: '8 – 10 kg',       match: p => { const k = _kg(p); return k >= 8 && k <= 10 } },
        { value: 'large',   label: '11 – 14 kg',      match: p => { const k = _kg(p); return k >= 11 && k <= 14 } },
        { value: 'xl',      label: '15 kg+ (Blanket)',match: p => { const k = _kg(p); return k >= 15 || (p.tags || '').includes('blanket-washable') } },
      ],
    },
    {
      key: 'washinverter', label: 'Technology',
      options: [
        { value: 'inverter', label: 'Inverter Motor', match: p => /inverter/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'direct',   label: 'Direct Drive',   match: p => /direct.?drive/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'digital',  label: 'Digital Display',match: p => /digital|smart|auto/i.test(p.simplified_name + ' ' + p.tags) && !/semi/i.test(p.category) },
      ],
    },
  ],

  // ── Televisions ──────────────────────────────────────────────────────────────
  tv: [
    {
      key: 'tvsize', label: 'Screen Size',
      options: [
        { value: '32',  label: '32"',            match: p => { const i = _inches(p); return i > 0 ? i <= 32 : /\b32\b/.test(p.simplified_name) } },
        { value: '43',  label: '40" – 43"',      match: p => { const i = _inches(p); return i >= 40 && i <= 43 } },
        { value: '50',  label: '50" – 55"',      match: p => { const i = _inches(p); return i >= 50 && i <= 55 } },
        { value: '65',  label: '65" – 75"',      match: p => { const i = _inches(p); return i >= 65 && i <= 75 } },
        { value: '85',  label: '85"+ (Ultra)',   match: p => { const i = _inches(p); return i >= 85 } },
      ],
    },
    {
      key: 'tvtech', label: 'Panel Type',
      options: [
        { value: 'qled', label: 'QLED',          match: p => /qled/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'oled', label: 'OLED',          match: p => /\boled\b/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'led',  label: 'LED / Smart LED',match: p => !/qled|oled/i.test(p.simplified_name + ' ' + p.tags) },
      ],
    },
  ],

  // ── Kitchen Appliances ───────────────────────────────────────────────────────
  kitchen: [
    {
      key: 'kitchentype', label: 'Category',
      options: [
        { value: 'cooking',    label: 'Cooking & Ovens',      match: p => p.category.toLowerCase().includes('cooking') || /oven|toaster|grill/i.test(p.simplified_name) },
        { value: 'blenders',   label: 'Blenders & Juicers',   match: p => p.category.toLowerCase().includes('blender') || /blender|juicer/i.test(p.simplified_name) },
        { value: 'processors', label: 'Food Processors',      match: p => p.category.toLowerCase().includes('food proc') || /food.?proc|chopper/i.test(p.simplified_name) },
        { value: 'breakfast',  label: 'Breakfast & Beverages',match: p => p.category.toLowerCase().includes('breakfast') || /coffee|tea|toaster|kettle/i.test(p.simplified_name) },
        { value: 'airfryer',   label: 'Air Fryers',           match: p => /air.?fry/i.test(p.simplified_name + ' ' + p.category) },
      ],
    },
  ],

  // ── Microwave Ovens ──────────────────────────────────────────────────────────
  microwave: [
    {
      key: 'mwcap', label: 'Cavity Size',
      options: [
        { value: 'small',  label: 'Compact (≤20L)',  match: p => { const l = _liters(p); return l > 0 ? l <= 20 : false } },
        { value: 'medium', label: 'Standard (21–30L)',match: p => { const l = _liters(p); return l >= 21 && l <= 30 } },
        { value: 'large',  label: 'Large (31L+)',     match: p => { const l = _liters(p); return l >= 31 } },
      ],
    },
  ],

  // ── Small Appliances ─────────────────────────────────────────────────────────
  small: [
    {
      key: 'smalltype', label: 'Type',
      options: [
        { value: 'iron',    label: 'Irons & Steamers',    match: p => /iron|steamer/i.test(p.simplified_name) },
        { value: 'heater',  label: 'Heaters',             match: p => /heater|room.?heat/i.test(p.simplified_name) },
        { value: 'fan',     label: 'Fans & Air Coolers',  match: p => /\bfan\b|air.?cool/i.test(p.simplified_name) },
        { value: 'vacuum',  label: 'Vacuum Cleaners',     match: p => /vacuum/i.test(p.simplified_name) },
        { value: 'kettle',  label: 'Kettles',             match: p => /kettle/i.test(p.simplified_name) },
        { value: 'hair',    label: 'Hair Care',           match: p => /hair|dryer|straighten/i.test(p.simplified_name) },
      ],
    },
  ],

  // ── Solar Solutions ──────────────────────────────────────────────────────────
  solar: [
    {
      key: 'solartype', label: 'System Type',
      options: [
        { value: 'ongrid',  label: 'On-Grid',    match: p => /on.?grid/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'offgrid', label: 'Off-Grid',   match: p => /off.?grid/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'hybrid',  label: 'Hybrid',     match: p => /hybrid/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'battery', label: 'Battery / Storage', match: p => /battery|storage|lithium/i.test(p.simplified_name + ' ' + p.tags) },
      ],
    },
    {
      key: 'solarkw', label: 'System Size',
      options: [
        { value: '3kw',  label: 'Up to 3 kW',    match: p => { const m = (p.simplified_name + ' ' + p.tags).match(/(\d+(?:\.\d+)?)\s*kw/i); return m ? parseFloat(m[1]) <= 3 : false } },
        { value: '5kw',  label: '3 – 5 kW',      match: p => { const m = (p.simplified_name + ' ' + p.tags).match(/(\d+(?:\.\d+)?)\s*kw/i); const v = m ? parseFloat(m[1]) : 0; return v > 3 && v <= 5 } },
        { value: '10kw', label: '6 – 10 kW',     match: p => { const m = (p.simplified_name + ' ' + p.tags).match(/(\d+(?:\.\d+)?)\s*kw/i); const v = m ? parseFloat(m[1]) : 0; return v > 5 && v <= 10 } },
        { value: 'big',  label: 'Above 10 kW',   match: p => { const m = (p.simplified_name + ' ' + p.tags).match(/(\d+(?:\.\d+)?)\s*kw/i); return m ? parseFloat(m[1]) > 10 : false } },
      ],
    },
  ],

  // ── Water Dispensers ─────────────────────────────────────────────────────────
  water: [
    {
      key: 'watertype', label: 'Type',
      options: [
        { value: 'compressor', label: 'Compressor Cooling',   match: p => /compressor/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'electric',   label: 'Electric Cooling',     match: p => /electric.?cool|thermoelectric/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'hot',        label: 'Hot & Cold',           match: p => /hot.{1,8}cold|cold.{1,8}hot/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'floor',      label: 'Floor Standing',       match: p => /floor.?stand|stand.?type/i.test(p.simplified_name + ' ' + p.tags) },
        { value: 'table',      label: 'Table Top / Mini',     match: p => /table.?top|mini|counter/i.test(p.simplified_name + ' ' + p.tags) },
      ],
    },
  ],
}

// Which SPEC_FILTERS key maps to a category slug / id
function getSpecKey(catId: string): string {
  if (catId === 'ac' || catId === 'air-conditioners' || catId === 'air_conditioner') return 'ac'
  if (catId === 'fridge' || catId === 'refrigerators' || catId === 'refrigerator') return 'fridge'
  if (catId === 'fridge-nofrost' || catId === 'no-frost-refrigerators') return 'fridge'
  if (catId === 'fridge-sbs' || catId === 'side-by-side-refrigerators') return 'fridge'
  if (catId === 'fridge-french' || catId === 'french-door-refrigerators') return 'fridge'
  if (catId === 'freezer' || catId === 'freezers' || catId === 'deep_freezer') return 'freezer'
  if (catId === 'washing' || catId === 'washing-machines' || catId === 'washing_machine') return 'washing'
  if (catId === 'frontload' || catId === 'front-load-washing-machines') return 'washing'
  if (catId === 'tv' || catId === 'televisions' || catId === 'television') return 'tv'
  if (catId === 'kitchen' || catId === 'kitchen-appliances') return 'kitchen'
  if (catId === 'microwave' || catId === 'microwave-ovens') return 'microwave'
  if (catId === 'microwave-solo' || catId === 'solo-microwave-ovens') return 'microwave'
  if (catId === 'microwave-grill' || catId === 'grill-microwave-ovens') return 'microwave'
  if (catId === 'microwave-convection' || catId === 'convection-air-fryer-ovens') return 'microwave'
  if (catId === 'small' || catId === 'small-appliances') return 'small'
  if (catId === 'solar' || catId === 'solar-solutions') return 'solar'
  if (catId === 'solar-inverter' || catId === 'solar-inverters') return 'solar'
  if (catId === 'solar-battery' || catId === 'solar-batteries') return 'solar'
  if (catId === 'solar-panel' || catId === 'solar-panels') return 'solar'
  if (catId === 'solar-pump' || catId === 'solar-water-pumps') return 'solar'
  if (catId === 'water' || catId === 'water-dispensers') return 'water'
  return ''
}

export default function Products() {
  const [sp, setSp]             = useSearchParams()
  const { categorySlug }        = useParams<{ categorySlug?: string }>()
  const navigate                = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [view, setView]         = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [specFilters, setSpecFilters] = useState<Record<string, string>>({})
  const [budgetIdx, setBudgetIdx] = useState<number | null>(null)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [manualGroup, setManualGroup] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    budget: true, brand: true, specs: true, stock: true,
  })

  const category = categorySlug || sp.get('category') || ''
  const brand    = sp.get('brand') || ''
  const search   = sp.get('search') || ''
  const sort     = sp.get('sort') || ''

  const activeCat = DEFAULT_CATEGORIES.find(c => c.id === category || c.slug === category)
  const specKey   = getSpecKey(activeCat?.id || category)
  const catSpecFilters = SPEC_FILTERS[specKey] || []

  // Derive the active group from the selected sub-category, or from the manually selected group
  const activeGroupId   = activeCat
    ? (CATEGORY_GROUPS.find(g => (g.cats as readonly string[]).includes(activeCat.id))?.id ?? null)
    : manualGroup
  const activeGroupData = CATEGORY_GROUPS.find(g => g.id === activeGroupId) ?? null

  const fetchProducts = useCallback(() => {
    setLoading(true)
    setFetchError(false)
    const params: Record<string, string> = {}
    if (category) params.category = category
    if (brand)    params.brand    = brand
    if (search)   params.search   = search
    if (sort)     params.sort     = sort
    getProducts(params).then(d => {
      setProducts(d.products)
      setTotal(d.total)
      setLoading(false)
    }).catch(() => {
      setFetchError(true)
      setLoading(false)
    })
  }, [category, brand, search, sort])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // Reset client-side filters when category changes
  useEffect(() => { setSpecFilters({}); setBudgetIdx(null); setInStockOnly(false) }, [category])

  const brands = useMemo(
    () => [...new Set(products.map(p => p.brand).filter(Boolean))].sort(),
    [products]
  )

  // Client-side filtering (budget, spec filters, in-stock) + default price sort
  const filteredProducts = useMemo(() => {
    let list = products
    if (budgetIdx !== null) {
      const { min, max } = BUDGET_RANGES[budgetIdx]
      list = list.filter(p => p.price.cash_floor >= min && p.price.cash_floor <= max)
    }
    if (inStockOnly) {
      list = list.filter(p => p.stock_status === 'In Stock')
    }
    for (const [key, val] of Object.entries(specFilters)) {
      if (!val) continue
      const filterGroup = catSpecFilters.find(f => f.key === key)
      const option = filterGroup?.options.find(o => o.value === val)
      if (option) list = list.filter(option.match)
    }
    return list
  }, [products, budgetIdx, inStockOnly, specFilters, catSpecFilters, sort, category, search])

  function goToCategory(catId: string) {
    setSpecFilters({}); setBudgetIdx(null); setInStockOnly(false)
    if (!catId) { setManualGroup(null); navigate('/products'); return }
    const cat = DEFAULT_CATEGORIES.find(c => c.id === catId || c.slug === catId)
    if (cat) { navigate(`/products/category/${cat.slug}`); return }
    const next = new URLSearchParams(sp)
    next.set('category', catId)
    setSp(next)
  }

  function setFilter(key: string, val: string) {
    if (key === 'category') { goToCategory(val); return }
    const next = new URLSearchParams(sp)
    if (val) next.set(key, val); else next.delete(key)
    setSp(next)
  }

  function clearAll() {
    setSpecFilters({}); setBudgetIdx(null); setInStockOnly(false); setManualGroup(null)
    if (categorySlug) { navigate('/products'); return }
    setSp({})
  }

  function toggleSection(key: string) {
    setExpandedSections(s => ({ ...s, [key]: !s[key] }))
  }

  const hasFilters = !!(category || brand || search || budgetIdx !== null || inStockOnly || Object.values(specFilters).some(Boolean))
  const activeFilterCount = [
    brand, budgetIdx !== null ? 'b' : '', inStockOnly ? 's' : '',
    ...Object.values(specFilters).filter(Boolean)
  ].filter(Boolean).length

  const seoTitle = activeCat
    ? `${activeCat.name} — Buy in Karachi on Installments`
    : search
    ? `Search: "${search}" — Reliance by Tajallis`
    : 'All Products — Home Appliances Karachi'

  const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://tajallis.com.pk'
  const pageUrl  = categorySlug ? `/products/category/${categorySlug}` : '/products'

  const itemListSchema = filteredProducts.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: seoTitle,
    url: `${SITE_URL}${pageUrl}`,
    numberOfItems: filteredProducts.length,
    itemListElement: filteredProducts.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/products/${p.slug}`,
      name: p.simplified_name || `${p.brand} ${p.model}`,
    })),
  } : null

  const breadcrumbSchema = activeCat ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: activeCat.name },
    ],
  } : null

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={seoTitle}
        description={`Shop ${activeCat?.name || 'home appliances'} in Karachi. Genuine products with easy installments, home delivery & after-sale support. ${filteredProducts.length} products available.`}
        path={pageUrl}
      />
      <Helmet>
        {itemListSchema && <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>}
        {breadcrumbSchema && <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>}
      </Helmet>

      {/* ── Top bar ── */}
      <div className="bg-white border-b sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">

          {/* Result count */}
          <div className="text-sm text-gray-500 min-w-0">
            <span className="text-gray-900 font-semibold">{loading ? '…' : filteredProducts.length}</span>
            {!loading && filteredProducts.length !== total && (
              <span className="text-gray-400"> of {total}</span>
            )}
            <span className="ml-1">products</span>
            {activeCat && (
              <span className="ml-1 hidden sm:inline">
                in <span className="text-brand-600 font-medium">{activeCat.icon} {activeCat.name}</span>
              </span>
            )}
            {search && (
              <span className="ml-1">for "<span className="text-brand-600 font-medium">{search}</span>"</span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Group tabs — desktop */}
            <div className="hidden lg:flex gap-1 overflow-x-auto">
              <button onClick={() => { goToCategory(''); setManualGroup(null) }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all
                  ${!activeGroupId ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-brand-50'}`}>
                All
              </button>
              {CATEGORY_GROUPS.map(g => {
                const isActive = g.id === activeGroupId
                return (
                  <button key={g.id}
                    onClick={() => {
                      if (g.cats.length === 1) {
                        setManualGroup(g.id); goToCategory(g.cats[0])
                      } else {
                        setManualGroup(isActive ? null : g.id)
                        if (isActive) goToCategory('')
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-all
                      ${isActive ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-brand-50'}`}>
                    {g.icon} {g.label}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <select value={sort} onChange={e => setFilter('sort', e.target.value)}
                className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:border-brand-400 cursor-pointer">
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {/* Filter toggle */}
              <button onClick={() => setShowFilters(f => !f)}
                className={`relative flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all
                  ${showFilters ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600 hover:border-brand-200'}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className={`ml-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center
                    ${showFilters ? 'bg-white text-brand-500' : 'bg-brand-500 text-white'}`}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* View toggle */}
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setView('grid')}
                  className={`p-1.5 transition-colors ${view === 'grid' ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button onClick={() => setView('list')}
                  className={`p-1.5 transition-colors ${view === 'list' ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sub-category strip (desktop) — shown when a group with multiple cats is active ── */}
        {activeGroupData && activeGroupData.cats.length > 1 && (
          <div className="hidden lg:block border-t bg-brand-50/60 px-4 py-2">
            <div className="max-w-7xl mx-auto flex gap-1.5 flex-wrap">
              <button
                onClick={() => goToCategory('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  !category ? 'bg-brand-500 text-white' : 'text-brand-700 hover:bg-brand-100'
                }`}>
                All {activeGroupData.label}
              </button>
              {(activeGroupData.cats as readonly string[]).map(id => {
                const cat = DEFAULT_CATEGORIES.find(c => c.id === id)
                if (!cat) return null
                return (
                  <button key={id} onClick={() => goToCategory(id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
                      activeCat?.id === id ? 'bg-brand-500 text-white' : 'text-brand-700 hover:bg-brand-100'
                    }`}>
                    {cat.icon} {cat.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Filter Panel ── */}
        {showFilters && (
          <div className="border-t bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-5">
              {/* Close bar */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filters</span>
                <button onClick={() => setShowFilters(false)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-200">
                  <X className="w-3.5 h-3.5" /> Close
                </button>
              </div>
              {/* Mobile category picker — grouped */}
              <div className="lg:hidden mb-5 space-y-3">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</div>
                <div className="flex gap-2 flex-wrap">
                  <Pill active={!activeGroupId} onClick={() => { goToCategory(''); setManualGroup(null); setShowFilters(false) }}>All</Pill>
                  {CATEGORY_GROUPS.map(g => (
                    <Pill key={g.id} active={g.id === activeGroupId}
                      onClick={() => {
                        if (g.cats.length === 1) { setManualGroup(g.id); goToCategory(g.cats[0]); setShowFilters(false) }
                        else { setManualGroup(g.id === activeGroupId ? null : g.id); if (g.id === activeGroupId) goToCategory('') }
                      }}>
                      {g.icon} {g.label}
                    </Pill>
                  ))}
                </div>
                {/* Sub-category pills when a group is selected */}
                {activeGroupData && activeGroupData.cats.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap pl-2 border-l-2 border-brand-200">
                    <Pill active={!category} onClick={() => { goToCategory('') }}>All {activeGroupData.label}</Pill>
                    {(activeGroupData.cats as readonly string[]).map(id => {
                      const cat = DEFAULT_CATEGORIES.find(c => c.id === id)
                      if (!cat) return null
                      return (
                        <Pill key={id} active={activeCat?.id === id} onClick={() => { goToCategory(id); setShowFilters(false) }}>
                          {cat.icon} {cat.name}
                        </Pill>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Budget */}
                <FilterSection label="Budget" expanded={expandedSections.budget} onToggle={() => toggleSection('budget')}>
                  <div className="space-y-1.5">
                    {BUDGET_RANGES.map((r, i) => (
                      <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                        <input type="radio" name="budget" checked={budgetIdx === i}
                          onChange={() => setBudgetIdx(budgetIdx === i ? null : i)}
                          className="accent-brand-500 w-3.5 h-3.5 cursor-pointer" />
                        <span className={`text-sm transition-colors ${budgetIdx === i ? 'text-brand-600 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                          {r.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </FilterSection>

                {/* Brand */}
                {brands.length > 0 && (
                  <FilterSection label="Brand" expanded={expandedSections.brand} onToggle={() => toggleSection('brand')}>
                    <div className="flex gap-2 flex-wrap">
                      {brands.map(b => (
                        <Pill key={b} active={brand === b.toLowerCase()}
                          onClick={() => setFilter('brand', brand === b.toLowerCase() ? '' : b.toLowerCase())}>
                          {b}
                        </Pill>
                      ))}
                    </div>
                  </FilterSection>
                )}

                {/* Category-specific spec filters */}
                {catSpecFilters.map(sf => (
                  <FilterSection key={sf.key} label={sf.label} expanded={expandedSections[sf.key] !== false} onToggle={() => toggleSection(sf.key)}>
                    <div className="space-y-1.5">
                      {sf.options.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                          <input type="checkbox" checked={specFilters[sf.key] === opt.value}
                            onChange={() => setSpecFilters(prev => ({ ...prev, [sf.key]: prev[sf.key] === opt.value ? '' : opt.value }))}
                            className="accent-brand-500 w-3.5 h-3.5 cursor-pointer rounded" />
                          <span className={`text-sm transition-colors ${specFilters[sf.key] === opt.value ? 'text-brand-600 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                            {opt.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </FilterSection>
                ))}

                {/* In Stock */}
                <FilterSection label="Availability" expanded={expandedSections.stock} onToggle={() => toggleSection('stock')}>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={inStockOnly}
                      onChange={() => setInStockOnly(v => !v)}
                      className="accent-brand-500 w-3.5 h-3.5 cursor-pointer rounded" />
                    <span className={`text-sm ${inStockOnly ? 'text-brand-600 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                      In Stock only
                    </span>
                  </label>
                </FilterSection>
              </div>

              {/* Active filter chips + clear */}
              {hasFilters && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  <span className="text-xs text-gray-400 font-medium">Active:</span>
                  {activeCat && <FilterChip label={`${activeCat.icon} ${activeCat.name}`} onRemove={() => goToCategory('')} />}
                  {brand && <FilterChip label={`Brand: ${brand}`} onRemove={() => setFilter('brand', '')} />}
                  {budgetIdx !== null && <FilterChip label={`Budget: ${BUDGET_RANGES[budgetIdx].label}`} onRemove={() => setBudgetIdx(null)} />}
                  {inStockOnly && <FilterChip label="In Stock" onRemove={() => setInStockOnly(false)} />}
                  {Object.entries(specFilters).filter(([,v]) => v).map(([k, v]) => {
                    const sf = catSpecFilters.find(f => f.key === k)
                    const opt = sf?.options.find(o => o.value === v)
                    return opt ? <FilterChip key={k} label={opt.label} onRemove={() => setSpecFilters(prev => ({ ...prev, [k]: '' }))} /> : null
                  })}
                  <button onClick={clearAll} className="ml-auto text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium">
                    <X className="w-3.5 h-3.5" /> Clear all
                  </button>
                </div>
              )}
              {/* Bottom close button */}
              <div className="flex justify-center mt-5">
                <button onClick={() => setShowFilters(false)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-400 px-5 py-2 rounded-xl transition-all">
                  <X className="w-4 h-4" /> Close Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Product Grid ── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className={view === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-4 gap-5' : 'space-y-4'}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`bg-gray-100 rounded-2xl animate-pulse ${view === 'grid' ? 'h-72' : 'h-28'}`} />
            ))}
          </div>
        ) : fetchError ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Could not load products</h3>
            <p className="text-gray-500 mb-6">Check your connection and try again</p>
            <button onClick={fetchProducts} className="bg-brand-500 text-white px-6 py-2.5 rounded-xl font-medium">
              Retry
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search term</p>
            <button onClick={clearAll} className="bg-brand-500 text-white px-6 py-2.5 rounded-xl font-medium">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className={view === 'grid'
              ? 'grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5'
              : 'space-y-4'}>
              {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            {filteredProducts.length >= 40 && (
              <p className="text-center text-xs text-gray-400 mt-8">
                Showing {filteredProducts.length} products · Use filters to narrow results
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Small helper components ───────────────────────────────────────────────────

function FilterSection({ label, expanded, onToggle, children }: {
  label: string; expanded: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between mb-2.5 group">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-700 transition-colors">
          {label}
        </span>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {expanded && children}
    </div>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all
        ${active ? 'bg-brand-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-700 hover:border-brand-200 hover:text-brand-600'}`}>
      {children}
    </button>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 border border-brand-200 text-brand-700 rounded-full text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-red-500 transition-colors ml-0.5">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

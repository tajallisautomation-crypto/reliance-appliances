// ─── RELIANCE API — lib/api.ts ────────────────────────────────
// Fixes: image URL 503s, 3-month advance 45%, amounts rounded to 100

const SHEETS_URL = import.meta.env.VITE_SHEETS_URL || ''

export function roundTo100(n: number): number {
  return Math.round(n / 100) * 100
}

export function fixImageUrl(url: string, size = 400): string {
  if (!url) return '/placeholder-product.svg'
  if (url.includes('drive.google.com/thumbnail')) return url
  if (url.includes('lh3.googleusercontent.com'))  return url
  if (!url.includes('drive.google.com') && url.startsWith('http')) return url
  let fileId = ''
  let m: RegExpMatchArray | null
  m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m) fileId = m[1]
  else {
    m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    if (m) fileId = m[1]
    else if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) fileId = url.trim()
  }
  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`
  return '/placeholder-product.svg'
}

export interface InstallmentPlan {
  total: number; advance: number; monthly: number
  monthlyPayments: number; advancePct: number; markup: number
}

export function calcInstallmentPlan(basePrice: number, planKey: '2month'|'3month'|'6month'|'12month'): InstallmentPlan {
  const configs = {
    '2month':  { markup: 0.10, advancePct: 0.50, totalPayments: 2  },
    '3month':  { markup: 0.15, advancePct: 0.45, totalPayments: 3  },
    '6month':  { markup: 0.25, advancePct: 0.40, totalPayments: 6  },
    '12month': { markup: 0.40, advancePct: 0.30, totalPayments: 12 },
  }
  const c = configs[planKey]
  const total = roundTo100(basePrice * (1 + c.markup))
  const advance = roundTo100(total * c.advancePct)
  const remaining = total - advance
  const monthlyPayments = c.totalPayments - 1
  const monthly = roundTo100(remaining / monthlyPayments)
  return { total, advance, monthly, monthlyPayments, advancePct: c.advancePct, markup: c.markup }
}

export function calcAllPlans(basePrice: number): Record<string, InstallmentPlan> {
  if (!basePrice) return {}
  return {
    '2month':  calcInstallmentPlan(basePrice, '2month'),
    '3month':  calcInstallmentPlan(basePrice, '3month'),
    '6month':  calcInstallmentPlan(basePrice, '6month'),
    '12month': calcInstallmentPlan(basePrice, '12month'),
  }
}

export interface Product {
  id: string; brand: string; model: string; name: string
  category: string; subCategory: string; cashPrice: number; mrp: number
  image: string; images: string[]; color: string; warranty: string
  description: string; specs: string; tonnage: string; cubicFeet: string
  inverter: boolean; inStock: boolean; featured: boolean
  plans: Record<string, InstallmentPlan>; seoTitle: string; seoDesc: string; updatedAt: string
}

function normaliseProduct(raw: any): Product {
  return {
    ...raw,
    image:  fixImageUrl(raw.image  || ''),
    images: (raw.images || []).map((u: string) => fixImageUrl(u)).filter(Boolean),
    cashPrice: Number(raw.cashPrice || raw.cash_price || 0),
    mrp:       Number(raw.mrp || 0),
    plans:     raw.plans && Object.keys(raw.plans).length > 0 ? raw.plans : calcAllPlans(Number(raw.cashPrice || raw.cash_price || 0)),
  }
}

async function apiFetch<T>(params: Record<string, string>, retries = 2): Promise<T> {
  const url = `${SHEETS_URL}?${new URLSearchParams(params).toString()}`
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      return data as T
    } catch (e) {
      if (attempt === retries) throw e
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  throw new Error('All retries exhausted')
}

export async function getProducts(params?: Record<string, string>): Promise<{ products: Product[]; total: number }> {
  try {
    const data = await apiFetch<any>({ action: 'getProducts', ...(params||{}) })
    return { products: (data.products || []).map(normaliseProduct), total: data.total || 0 }
  } catch { return { products: FALLBACK_PRODUCTS, total: FALLBACK_PRODUCTS.length } }
}

export async function getProduct(id: string): Promise<Product | null> {
  try { const data = await apiFetch<any>({ action: 'getProduct', id }); return normaliseProduct(data) }
  catch { return FALLBACK_PRODUCTS.find(p => p.id === id) || null }
}

export async function getCategories() {
  try { return await apiFetch<any>({ action: 'getCategories' }) }
  catch { return { categories: DEFAULT_CATEGORIES } }
}

export async function getSolarQuote(params: Record<string, string>) {
  return apiFetch<any>({ action: 'getSolarQuote', ...params })
}

export async function getInstallmentPlans(price: number) {
  try { return await apiFetch<any>({ action: 'getInstallmentPlans', price: String(price) }) }
  catch { return { price, plans: calcAllPlans(price) } }
}

export async function getPackages() {
  try { return await apiFetch<any>({ action: 'getPackages' }) } catch { return { packages: [] } }
}

export async function getLoyaltyTiers() {
  try { return await apiFetch<any>({ action: 'getLoyaltyTiers' }) } catch { return { tiers: [] } }
}

export async function submitOrder(body: any) {
  const res = await fetch(SHEETS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addOrder', ...body }) })
  return res.json()
}

export async function submitEnquiry(body: any) {
  const res = await fetch(SHEETS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submitRetailForm', ...body }) })
  return res.json()
}

export const DEFAULT_CATEGORIES = [
  { id:'ac',      name:'Air Conditioners',  icon:'❄️', slug:'air-conditioners'   },
  { id:'fridge',  name:'Refrigerators',      icon:'🧊', slug:'refrigerators'      },
  { id:'washing', name:'Washing Machines',   icon:'🫧', slug:'washing-machines'   },
  { id:'tv',      name:'Televisions',        icon:'📺', slug:'televisions'        },
  { id:'solar',   name:'Solar Solutions',    icon:'☀️', slug:'solar-solutions'    },
  { id:'kitchen', name:'Kitchen Appliances', icon:'🍳', slug:'kitchen-appliances' },
  { id:'water',   name:'Water Dispensers',   icon:'💧', slug:'water-dispensers'   },
  { id:'vacuum',  name:'Vacuum Cleaners',    icon:'🌀', slug:'vacuum-cleaners'    },
  { id:'small',   name:'Small Appliances',   icon:'🔌', slug:'small-appliances'   },
]

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id:'fallback-1', brand:'Haier', model:'HSU-13LF',
    name:'Haier 1.1 Ton Cool Only Inverter Split AC',
    category:'Air Conditioners', subCategory:'Inverter Split',
    cashPrice:105973, mrp:111550,
    image:'https://www.haier.com/pk/content/dam/haier/pk/products/air-conditioner/split-ac/hsu-13lf/hsu-13lf-front.jpg',
    images:[], color:'White', warranty:'5 years compressor, 1 year parts',
    description:'1.1 Ton Cool Only Inverter AC with R410A refrigerant.',
    specs:'Cooling Capacity: 12000 BTU | Input Power: 0.9kW | Refrigerant: R410A',
    tonnage:'1.1', cubicFeet:'', inverter:true, inStock:true, featured:true,
    plans: calcAllPlans(105973),
    seoTitle:'Haier HSU-13LF 1.1 Ton Inverter AC Price in Pakistan',
    seoDesc:'Buy Haier HSU-13LF 1.1 Ton Cool Only Inverter Split AC.',
    updatedAt: new Date().toISOString(),
  },
]

export function fmtPKR(n: number): string {
  return 'PKR ' + Math.round(n).toLocaleString('en-PK')
}

export function discountPct(cashPrice: number, mrp: number): number {
  if (!mrp || mrp <= cashPrice) return 0
  return Math.round((mrp - cashPrice) / mrp * 100)
}

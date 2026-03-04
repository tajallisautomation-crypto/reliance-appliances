// ─── RELIANCE API — lib/api.ts  v5.0 ─────────────────────────
// Single source of truth for data fetching + calculations
// Aligns exactly with ApplianceStoreBrain.gs v5.0
// KEY FIXES: CATEGORY_MAP exported, calcAllPlans centralized

const SHEETS_URL = import.meta.env.VITE_SHEETS_URL || ''

export function roundTo100(n: number): number { return Math.round(n / 100) * 100 }

export function fixImageUrl(url: string, size = 400): string {
  if (!url) return '/placeholder-product.svg'
  if (url.includes('drive.google.com/thumbnail')) return url
  if (url.includes('lh3.googleusercontent.com'))  return url
  if (url.startsWith('http') && !url.includes('drive.google.com')) return url
  let fileId = '', m: RegExpMatchArray | null
  m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m) { fileId = m[1] } else {
    m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    if (m) fileId = m[1]
    else if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) fileId = url.trim()
  }
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}` : '/placeholder-product.svg'
}

export interface InstallmentPlan {
  total: number; advance: number; monthly: number; monthlyPayments: number; advancePct: number
}

// Plan keys MUST match ApplianceStoreBrain.gs PLAN_CONFIG
// 3-month advance = 45% (verified correct)
const PLAN_CONFIG: Record<string, { markup: number; advancePct: number; totalPayments: number }> = {
  '2month':  { markup: 0.10, advancePct: 0.50, totalPayments: 2  },
  '3month':  { markup: 0.15, advancePct: 0.45, totalPayments: 3  },
  '6month':  { markup: 0.25, advancePct: 0.40, totalPayments: 6  },
  '12month': { markup: 0.40, advancePct: 0.30, totalPayments: 12 },
}

export function calcInstallmentPlan(basePrice: number, key: string): InstallmentPlan {
  const c = PLAN_CONFIG[key]; if (!c) throw new Error('Unknown plan: ' + key)
  const total = roundTo100(basePrice * (1 + c.markup))
  const advance = roundTo100(total * c.advancePct)
  const monthlyPayments = c.totalPayments - 1
  const monthly = roundTo100((total - advance) / monthlyPayments)
  return { total, advance, monthly, monthlyPayments, advancePct: c.advancePct }
}

export function calcAllPlans(basePrice: number): Record<string, InstallmentPlan> {
  if (!basePrice) return {}
  return Object.fromEntries(Object.keys(PLAN_CONFIG).map(k => [k, calcInstallmentPlan(basePrice, k)]))
}

export interface Product {
  id: string; brand: string; model: string; name: string; category: string; subCategory: string
  cashPrice: number; mrp: number; image: string; images: string[]; color: string; warranty: string
  description: string; specs: string; tonnage: string; cubicFeet: string; inverter: boolean
  inStock: boolean; featured: boolean; plans: Record<string, InstallmentPlan>
  seoTitle: string; seoDesc: string; updatedAt: string
}

export interface Category { id: string; name: string; icon: string; slug: string }

// MUST match CATEGORY_MAP in ApplianceStoreBrain.gs — short IDs map to full category names in sheet
export const CATEGORY_MAP: Record<string, string> = {
  'ac': 'Air Conditioners', 'fridge': 'Refrigerators', 'washing': 'Washing Machines',
  'tv': 'Televisions', 'solar': 'Solar Solutions', 'kitchen': 'Kitchen Appliances',
  'water': 'Water Dispensers', 'vacuum': 'Vacuum Cleaners', 'small': 'Small Appliances',
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id:'ac',      name:'Air Conditioners',  icon:'\u2744\uFE0F', slug:'air-conditioners'   },
  { id:'fridge',  name:'Refrigerators',      icon:'\uD83E\uDDCA', slug:'refrigerators'      },
  { id:'washing', name:'Washing Machines',   icon:'\uD83E\uDEA7', slug:'washing-machines'   },
  { id:'tv',      name:'Televisions',        icon:'\uD83D\uDCFA', slug:'televisions'        },
  { id:'solar',   name:'Solar Solutions',    icon:'\u2600\uFE0F', slug:'solar-solutions'    },
  { id:'kitchen', name:'Kitchen Appliances', icon:'\uD83C\uDF73', slug:'kitchen-appliances' },
  { id:'water',   name:'Water Dispensers',   icon:'\uD83D\uDCA7', slug:'water-dispensers'   },
  { id:'vacuum',  name:'Vacuum Cleaners',    icon:'\uD83C\uDF00', slug:'vacuum-cleaners'    },
  { id:'small',   name:'Small Appliances',   icon:'\uD83D\uDD0C', slug:'small-appliances'   },
]

function normaliseProduct(raw: any): Product {
  const bp = Number(raw.cashPrice || raw.cash_price || 0)
  return {
    id: String(raw.id||''), brand: String(raw.brand||''), model: String(raw.model||''),
    name: String(raw.name||raw.Simplified_Name||''), category: String(raw.category||''),
    subCategory: String(raw.subCategory||''), cashPrice: bp,
    mrp: Number(raw.mrp||0)||roundTo100(bp*1.052), image: fixImageUrl(raw.image||''),
    images: Array.isArray(raw.images)?raw.images.map((u:string)=>fixImageUrl(u)).filter(Boolean):[],
    color: String(raw.color||''), warranty: String(raw.warranty||''),
    description: String(raw.description||''), specs: String(raw.specs||''),
    tonnage: String(raw.tonnage||''), cubicFeet: String(raw.cubicFeet||''),
    inverter: !!raw.inverter, inStock: raw.inStock!==false, featured: !!raw.featured,
    plans: (raw.plans&&Object.keys(raw.plans).length>0)?raw.plans:calcAllPlans(bp),
    seoTitle: String(raw.seoTitle||raw.name||''), seoDesc: String(raw.seoDesc||''),
    updatedAt: String(raw.updatedAt||new Date().toISOString()),
  }
}

async function apiFetch<T>(params: Record<string,string>, retries=2): Promise<T> {
  if (!SHEETS_URL) throw new Error('VITE_SHEETS_URL not set')
  const url = `${SHEETS_URL}?${new URLSearchParams(params)}`
  for (let a=0;a<=retries;a++) {
    try {
      const res=await fetch(url); if(!res.ok) throw new Error(`HTTP ${res.status}`)
      const data=await res.json(); if(data.error) throw new Error(data.error)
      return data as T
    } catch(e) { if(a===retries) throw e; await new Promise(r=>setTimeout(r,800*(a+1))) }
  }
  throw new Error('exhausted')
}

export async function getProducts(params?:Record<string,string>):Promise<{products:Product[];total:number}> {
  try {
    const data=await apiFetch<any>({action:'getProducts',...(params||{})})
    return {products:(data.products||[]).map(normaliseProduct),total:data.total||0}
  } catch { return {products:FALLBACK_PRODUCTS,total:FALLBACK_PRODUCTS.length} }
}

export async function getProduct(id:string):Promise<Product|null> {
  try { return normaliseProduct(await apiFetch<any>({action:'getProduct',id})) }
  catch { return FALLBACK_PRODUCTS.find(p=>p.id===id)||null }
}

export async function getCategories():Promise<{categories:Category[]}> {
  try { return await apiFetch<any>({action:'getCategories'}) }
  catch { return {categories:DEFAULT_CATEGORIES} }
}

export async function getSolarQuote(params:Record<string,string>) { return apiFetch<any>({action:'getSolarQuote',...params}) }

export async function getInstallmentPlans(price:number) {
  try { return await apiFetch<any>({action:'getInstallmentPlans',price:String(price)}) }
  catch { return {price,plans:calcAllPlans(price)} }
}

export async function getPackages() { try{return await apiFetch<any>({action:'getPackages'})}catch{return{packages:[]}} }
export async function getLoyaltyTiers() { try{return await apiFetch<any>({action:'getLoyaltyTiers'})}catch{return{tiers:[]}} }

export async function submitOrder(body:any) {
  if (!SHEETS_URL) return {error:'SHEETS_URL not configured'}
  return (await fetch(SHEETS_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'addOrder',...body})})).json()
}

export async function submitEnquiry(body:any) {
  if (!SHEETS_URL) return {error:'SHEETS_URL not configured'}
  return (await fetch(SHEETS_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'submitRetailForm',...body})})).json()
}

export function fmtPKR(n:number):string { return 'PKR\u00A0'+Math.round(n||0).toLocaleString('en-PK') }
export function discountPct(cashPrice:number,mrp:number):number { if(!mrp||mrp<=cashPrice)return 0; return Math.round((mrp-cashPrice)/mrp*100) }

export const FALLBACK_PRODUCTS: Product[] = [
  {id:'fallback-1',brand:'Haier',model:'HSU-18HNF DC Inverter',name:'Haier 1.5 Ton Cool Only Inverter Split AC',category:'Air Conditioners',subCategory:'DC Inverter',cashPrice:148500,mrp:156000,image:'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80',images:[],color:'White',warranty:'5 years compressor, 1 year parts',description:'1.5 Ton DC Inverter AC.',specs:'18000 BTU | R32',tonnage:'1.5',cubicFeet:'',inverter:true,inStock:true,featured:true,plans:calcAllPlans(148500),seoTitle:'Haier 1.5 Ton Inverter AC Karachi',seoDesc:'Buy Haier HSU-18HNF in Karachi.',updatedAt:new Date().toISOString()},
  {id:'fallback-2',brand:'Dawlance',model:'9160 WB',name:'Dawlance 14 Cu.Ft Defrost Refrigerator',category:'Refrigerators',subCategory:'Double Door',cashPrice:121000,mrp:127000,image:'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80',images:[],color:'White',warranty:'10 years compressor',description:'Dawlance 14 Cu.Ft refrigerator.',specs:'14 Cu.Ft | Defrost',tonnage:'',cubicFeet:'14',inverter:false,inStock:true,featured:true,plans:calcAllPlans(121000),seoTitle:'Dawlance Fridge Price Karachi',seoDesc:'Buy Dawlance 9160 WB in Karachi.',updatedAt:new Date().toISOString()},
]

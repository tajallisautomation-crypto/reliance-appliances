import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, CheckCircle, MessageCircle, Trash2, Tag,
  ChevronDown, ChevronUp, Info, ShoppingBag, Sparkles,
  ClipboardCheck, AlertCircle, X,
} from 'lucide-react'
import { getProducts, getProduct, formatPrice, calcPlan, submitOrder, type Product } from '@/lib/api'
import SEO from '@/components/ui/SEO'
import { waSales } from '@/lib/whatsapp'
import { useMyopStore } from '@/store/myopStore'
import { checkCompatibility, parseBatteryVoltage, type CompatibilityResult } from '@/lib/compatibility'

// ── Solar compatibility helpers ───────────────────────────────────────────────

function isSolarInverter(p: Product): boolean {
  const nc = (p.normalized_category || '').toLowerCase()
  const oc = (p.original_category  || '').toLowerCase()
  return nc.includes('inverter') || oc.includes('inverter')
}

function isSolarBattery(p: Product): boolean {
  const nc = (p.normalized_category || '').toLowerCase()
  const oc = (p.original_category  || '').toLowerCase()
  return nc.includes('batter') || oc.includes('batter')
}

/** Parse inverter rated output power (kW) from product specs. Returns null if not found. */
function parseInverterPowerKw(specs: Record<string, string>): number | null {
  for (const [k, v] of Object.entries(specs)) {
    const kl = k.toLowerCase().trim()
    if ((kl.includes('output') || kl.includes('rated') || kl.includes('capacity')) && kl.includes('kw')) {
      const m = String(v).match(/(\d+\.?\d*)/)
      if (m) return parseFloat(m[1])
    }
  }
  // Fallback: any key with 'power' containing a kW value
  for (const [k, v] of Object.entries(specs)) {
    if (k.toLowerCase().includes('power')) {
      const m = String(v).match(/(\d+\.?\d*)\s*kw/i)
      if (m) return parseFloat(m[1])
    }
  }
  return null
}

/** Parse battery voltage from product specs. */
function parseBatteryVoltageFromSpecs(specs: Record<string, string>): 24 | 48 | 'unknown' {
  const VOLT_KEYS = ['battery voltage', 'voltage', 'system voltage', 'nominal voltage', 'dc voltage']
  for (const [k, v] of Object.entries(specs)) {
    const kl = k.toLowerCase().trim()
    if (VOLT_KEYS.some(vk => kl === vk || kl.includes(vk))) {
      return parseBatteryVoltage(v)
    }
  }
  return 'unknown'
}

// ── Constants ────────────────────────────────────────────────────────────────

const DISCOUNT_THRESHOLD = 3
const DISCOUNT_PCT       = 0.05   // 5%

// Categories available in the package builder
const TABS = [
  { id: 'ac',      label: 'Air Conditioners', icon: '❄️' },
  { id: 'fridge',  label: 'Refrigerators',    icon: '🧊' },
  { id: 'freezer', label: 'Freezers',         icon: '❄️' },
  { id: 'washing', label: 'Washing Machines', icon: '👕' },
  { id: 'tv',      label: 'Televisions',      icon: '📺' },
  { id: 'solar',   label: 'Solar / UPS',      icon: '☀️' },
  { id: 'kitchen', label: 'Kitchen',          icon: '🍳' },
  { id: 'small',   label: 'Small Appliances', icon: '🔌' },
  { id: 'water',   label: 'Water Dispensers', icon: '💧' },
  { id: 'fan',     label: 'Fans',             icon: '🌀' },
]

interface PresetSlot {
  tabId:    string
  label:    string
  required: boolean
}

interface PresetPack {
  id:          string
  name:        string
  tagline:     string
  icon:        string
  positioning: string
  bestFor:     string
  houseType:   'house' | 'apartment' | 'both'
  solarRec?:   string
  upsRec?:     string
  slots:       PresetSlot[]
  firstTab:    string
  items?:      Array<{ id: string; label: string; price: number }>
}

const PRESET_PACKS: PresetPack[] = [
  // ── Priority 1: New Home Starter ────────────────────────────────────────
  {
    id:          'new-home',
    name:        'New Home Starter',
    tagline:     'AC · Fridge · Washer · TV',
    icon:        '🏠',
    positioning: 'Everything essential to make a new home functional from day one.',
    bestFor:     'Newly married couples, shifting homes, small families',
    houseType:   'house',
    solarRec:    'Solar-ready setup: adding a 3kW solar or UPS plan reduces running cost and covers load-shedding.',
    slots: [
      { tabId: 'ac',      label: 'Inverter AC',      required: true  },
      { tabId: 'fridge',  label: 'Refrigerator',     required: true  },
      { tabId: 'washing', label: 'Washing Machine',  required: true  },
      { tabId: 'tv',      label: 'LED TV',           required: true  },
      { tabId: 'water',   label: 'Water Dispenser',  required: false },
    ],
    firstTab: 'ac',
    items: [
      { id: 'haier-hsu-18cfp-cm',             label: 'Haier 1.5T AC',       price: 113000 },
      { id: 'haier-hrf-246-epb-epr-epcg',     label: 'Haier Fridge 246L',   price:  77000 },
      { id: 'haier-hwm-120-as-mg',            label: 'Haier Washer 12kg',   price:  52000 },
      { id: 'dawlance-kore-fhd-google-tv-43', label: 'Dawlance 43" TV',     price:  69000 },
    ],
  },
  // ── Priority 2: Apartment Comfort ───────────────────────────────────────
  {
    id:          'apartment-comfort',
    name:        'Apartment Comfort',
    tagline:     'AC · Fridge · Washer · UPS Backup',
    icon:        '🏢',
    positioning: 'Designed for apartments where roof solar may not be practical. UPS/inverter backup keeps essentials running during load-shedding.',
    bestFor:     'Apartment residents, tenants, small families',
    houseType:   'apartment',
    upsRec:      'For flats, a UPS/inverter is more practical than rooftop solar. Add an inverter + battery to cover fans, lights, and fridge.',
    slots: [
      { tabId: 'ac',      label: 'Inverter AC',     required: true  },
      { tabId: 'fridge',  label: 'Refrigerator',    required: true  },
      { tabId: 'washing', label: 'Washing Machine', required: true  },
      { tabId: 'solar',   label: 'UPS / Inverter',  required: true  },
      { tabId: 'solar',   label: 'Battery Bank',    required: false },
    ],
    firstTab: 'ac',
  },
  // ── Priority 3: Summer Cooling ──────────────────────────────────────────
  {
    id:          'summer-cooling',
    name:        'Summer Cooling',
    tagline:     '1–2 Inverter ACs · Fridge · Fan',
    icon:        '🌬️',
    positioning: 'Cooling essentials for Karachi summers, with installation and support included.',
    bestFor:     'Summer buyers, families replacing old ACs, repeat customers',
    houseType:   'both',
    solarRec:    'Multiple cooling appliances selected. A 3kW–5kW solar package can significantly reduce your summer electricity bill.',
    slots: [
      { tabId: 'ac',     label: '1st Inverter AC',   required: true  },
      { tabId: 'ac',     label: '2nd AC (optional)', required: false },
      { tabId: 'fridge', label: 'Refrigerator',      required: false },
      { tabId: 'fan',    label: 'Fan',               required: false },
    ],
    firstTab: 'ac',
  },
  // ── Priority 4: Wedding / Jahez ─────────────────────────────────────────
  {
    id:          'wedding-jahez',
    name:        'Wedding / Jahez Pack',
    tagline:     'Fridge · Washer · TV · Microwave · More',
    icon:        '💍',
    positioning: 'A complete home-start package with transparent pricing, delivery, and after-sales support.',
    bestFor:     'Wedding shopping, family gift purchases, parents buying for children',
    houseType:   'both',
    slots: [
      { tabId: 'fridge',   label: 'Refrigerator',    required: true  },
      { tabId: 'washing',  label: 'Washing Machine', required: true  },
      { tabId: 'tv',       label: 'LED TV',          required: true  },
      { tabId: 'kitchen',  label: 'Microwave Oven',  required: true  },
      { tabId: 'small',    label: 'Iron',            required: false },
      { tabId: 'water',    label: 'Water Dispenser', required: false },
      { tabId: 'ac',       label: 'Air Conditioner', required: false },
    ],
    firstTab: 'fridge',
  },
  // ── Priority 5: Green Corridor ──────────────────────────────────────────
  {
    id:          'green-corridor',
    name:        'Green Corridor',
    tagline:     'Inverter AC · Inverter Fridge · 3kW Solar',
    icon:        '☀️',
    positioning: "Don't just buy solar. First reduce your load with inverter appliances, then size solar smartly.",
    bestFor:     'Energy-conscious families, North Karachi, repeat buyers',
    houseType:   'house',
    solarRec:    'Your inverter appliances reduce required solar size. A 3kW system covers this load well.',
    slots: [
      { tabId: 'ac',     label: 'Inverter AC',     required: true  },
      { tabId: 'fridge', label: 'Inverter Fridge', required: true  },
      { tabId: 'solar',  label: '3kW Solar',       required: true  },
      { tabId: 'fan',    label: 'Low-Load Fan',    required: false },
      { tabId: 'solar',  label: 'Battery Backup',  required: false },
    ],
    firstTab: 'ac',
    items: [
      { id: 'ziewnic-pv3000',               label: 'Ziewnic PV3000 3KW',    price:  74000 },
      { id: 'ziewnic-12v-100ah-li-vietnam', label: 'Ziewnic 100AH Battery', price:  68000 },
    ],
  },
  // ── Priority 6: Load-Shedding Backup ────────────────────────────────────
  {
    id:          'loadshedding-backup',
    name:        'Load-Shedding Backup',
    tagline:     'UPS/Inverter · Battery · Fans',
    icon:        '🔋',
    positioning: 'Keep essentials running during load-shedding. Only compatible batteries are shown for your selected inverter.',
    bestFor:     'Flats, tenants, areas with unreliable electricity',
    houseType:   'apartment',
    upsRec:      'Select your inverter first — only compatible batteries will be shown so you get the right setup.',
    slots: [
      { tabId: 'solar',  label: 'UPS / Inverter', required: true  },
      { tabId: 'solar',  label: 'Battery',        required: true  },
      { tabId: 'fan',    label: 'Fan(s)',         required: false },
      { tabId: 'small',  label: 'Lights / Other', required: false },
      { tabId: 'fridge', label: 'Refrigerator',   required: false },
    ],
    firstTab: 'solar',
  },
  // ── Extended packs 7–10 ─────────────────────────────────────────────────
  {
    id:          'solar-kitchen',
    name:        'Solar-Ready Kitchen',
    tagline:     'Fridge · Microwave · Air Fryer · Kettle',
    icon:        '🍳',
    positioning: 'Upgrade your kitchen with efficient appliances easier to support with solar later.',
    bestFor:     'Home upgrades, wedding setups, kitchen renovations',
    houseType:   'house',
    solarRec:    'Kitchen load is low-to-medium. Pairing with an inverter fridge makes your future solar package more efficient.',
    slots: [
      { tabId: 'fridge',  label: 'Inverter Fridge', required: true  },
      { tabId: 'kitchen', label: 'Microwave Oven',  required: true  },
      { tabId: 'kitchen', label: 'Air Fryer',       required: false },
      { tabId: 'water',   label: 'Water Dispenser', required: false },
    ],
    firstTab: 'fridge',
    items: [
      { id: 'dawlance-md-7',                            label: 'Dawlance Microwave',  price: 16500 },
      { id: 'westpoint-5254',                           label: 'Westpoint Air Fryer', price: 28000 },
      { id: 'dawlance-electric-kettle-dwek-7100-local', label: 'Dawlance Kettle',     price:  5500 },
    ],
  },
  {
    id:          'executive-cooling',
    name:        'Executive Cooling',
    tagline:     'Floor-Standing AC · Fridge · Freezer',
    icon:        '🏢',
    positioning: 'For large rooms, commercial spaces, offices, and high-load homes.',
    bestFor:     'Large homes, offices, clinics, salons, small businesses',
    houseType:   'both',
    solarRec:    'High-load package detected. A 5kW–10kW solar assessment is recommended before finalizing.',
    slots: [
      { tabId: 'ac',      label: 'Floor-Standing AC',  required: true  },
      { tabId: 'fridge',  label: 'Refrigerator',       required: false },
      { tabId: 'freezer', label: 'Freezer',            required: false },
      { tabId: 'solar',   label: 'Voltage Stabilizer', required: false },
    ],
    firstTab: 'ac',
  },
  {
    id:          'commercial-starter',
    name:        'Commercial Starter',
    tagline:     'Commercial AC · Fridge · Water Dispenser',
    icon:        '🏪',
    positioning: 'Reliable appliance setup for offices, shops, clinics, and small commercial spaces.',
    bestFor:     'Clinics, offices, salons, shops, small warehouses',
    houseType:   'both',
    solarRec:    'Commercial setups benefit from solar. Ask us about a 5kW–10kW consultation.',
    slots: [
      { tabId: 'ac',     label: 'Commercial / Large AC', required: true  },
      { tabId: 'fridge', label: 'Refrigerator/Freezer',  required: false },
      { tabId: 'water',  label: 'Water Dispenser',       required: false },
      { tabId: 'solar',  label: 'Solar / UPS',           required: false },
    ],
    firstTab: 'ac',
  },
  {
    id:          'service-protection',
    name:        'Service + Protection',
    tagline:     'Any Appliance + Delivery + Install',
    icon:        '🛠️',
    positioning: 'Not just products — complete setup, installation, and after-sales support.',
    bestFor:     'Customers wanting full installation, maintenance, and warranty coverage',
    houseType:   'both',
    slots: [
      { tabId: 'ac',    label: 'Main Appliance', required: true  },
      { tabId: 'small', label: 'Install / AMC',  required: false },
    ],
    firstTab: 'ac',
  },
]

// Category → estimated monthly kWh for solar load bar
function estimateKwhPerMonth(p: Product): number {
  const nc = (p.normalized_category || p.category || '').toLowerCase()
  if (nc.includes('air cond')) {
    // Try to get tonnage from specs
    let tons = 1.5
    const specs = p.specs || {}
    for (const [k, v] of Object.entries(specs)) {
      if (/ton/i.test(k) || /capaci/i.test(k)) {
        const m = String(v).match(/(\d+\.?\d*)/)
        if (m) { tons = parseFloat(m[1]); break }
      }
    }
    return Math.round(tons * 120)   // ~120 kWh/month per ton (8h/day summer)
  }
  if (nc.includes('refriger') || nc.includes('fridge')) return 45
  if (nc.includes('washing') || nc.includes('washer')) return 8
  if (nc.includes('television') || nc.includes('tv')) return 12
  if (nc.includes('microwave')) return 6
  if (nc.includes('kitchen') || nc.includes('small')) return 4
  return 0
}

/** Maps a product's category fields to one of the BYOP tab IDs. */
function getProductTabId(p: Product): string {
  const nc = (p.normalized_category || p.original_category || '').toLowerCase()
  if (nc.includes('air cond') || nc.includes('ton air')) return 'ac'
  if (nc.includes('freezer'))                             return 'freezer'
  if (nc.includes('refriger'))                            return 'fridge'
  if (nc.includes('washing'))                             return 'washing'
  if (nc.includes('television') || nc.includes(' led') || nc.includes('smart tv') || nc.includes('qled')) return 'tv'
  if (nc.includes('solar') || nc.includes('inverter') || nc.includes('batter') || nc.includes('power solution')) return 'solar'
  if (nc.includes('water dispen'))                        return 'water'
  if (nc.includes('fan'))                                 return 'fan'
  if (nc.includes('kitchen') || nc.includes('microwave')) return 'kitchen'
  return 'small'
}

// ── Types ────────────────────────────────────────────────────────────────────

interface PackageItem {
  product: Product
  qty:     number
}

// ── Spec extraction ───────────────────────────────────────────────────────────

/**
 * Given a product and the active BYOP tab, extracts up to 3 decision-relevant specs.
 * Priority lists are ordered from most to least important for each category.
 */
function getKeySpecs(product: Product, tabId: string): string[] {
  const specs = product.specs || {}
  const nc    = (product.normalized_category || '').toLowerCase()

  // Normalize spec lookup — case-insensitive key search
  const get = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      for (const [k, v] of Object.entries(specs)) {
        if (k.toLowerCase().trim() === key.toLowerCase().trim() && v) return String(v)
      }
    }
    return undefined
  }
  // Partial key match fallback
  const getPartial = (...terms: string[]): string | undefined => {
    for (const term of terms) {
      for (const [k, v] of Object.entries(specs)) {
        if (k.toLowerCase().includes(term.toLowerCase()) && v) return String(v)
      }
    }
    return undefined
  }

  const result: string[] = []

  if (tabId === 'ac' || nc.includes('air condition')) {
    const cap     = get('Tonnage', 'Capacity', 'Cooling Capacity') ?? getPartial('ton', 'btu')
    const type    = get('Type', 'Technology') ?? getPartial('inverter', 'non-inverter')
    const rating  = get('Energy Rating', 'Energy Star', 'EER') ?? getPartial('energy', 'rating', 'star')
    if (cap)    result.push(cap)
    if (type)   result.push(type)
    if (rating) result.push(rating)

  } else if (tabId === 'fridge' || nc.includes('refrigerator')) {
    const cap   = get('Capacity', 'Volume', 'Gross Capacity', 'Net Capacity') ?? getPartial('litre', 'cu.ft', 'liter', 'capacity')
    const type  = get('Type', 'Defrost', 'Configuration') ?? getPartial('frost', 'no-frost', 'direct cool')
    const doors = get('Doors', 'Door') ?? getPartial('door')
    if (cap)   result.push(cap)
    if (type)  result.push(type)
    if (doors) result.push(doors)

  } else if (tabId === 'washing' || nc.includes('washing')) {
    const cap  = get('Capacity', 'Load Capacity', 'Drum Capacity') ?? getPartial('kg', 'capacity')
    const type = get('Type', 'Configuration', 'Loading') ?? getPartial('front', 'top', 'automatic', 'semi')
    const spin = get('Spin Speed', 'RPM') ?? getPartial('rpm', 'spin')
    if (cap)  result.push(cap)
    if (type) result.push(type)
    if (spin) result.push(spin)

  } else if (tabId === 'tv' || nc.includes('television')) {
    const size = get('Screen Size', 'Display Size', 'Size') ?? getPartial('inch', '"', 'size')
    const res  = get('Resolution', 'Display Resolution') ?? getPartial('4k', 'fhd', 'hd', 'uhd', 'qled')
    const tech = get('Display Technology', 'Panel Type', 'Smart') ?? getPartial('qled', 'led', 'smart', 'google', 'android')
    if (size) result.push(size)
    if (res)  result.push(res)
    if (tech) result.push(tech)

  } else if (tabId === 'solar') {
    const power = get('Rated Power', 'Output Power', 'Capacity', 'Power Output') ?? getPartial('kw', 'watt', 'power')
    const type  = get('Type', 'System Type') ?? getPartial('hybrid', 'off-grid', 'lithium', 'lifepo')
    const volt  = get('Battery Voltage', 'Voltage', 'System Voltage') ?? getPartial('48v', '24v', 'voltage')
    if (power) result.push(power)
    if (type)  result.push(type)
    if (volt)  result.push(volt)

  } else if (tabId === 'kitchen' || nc.includes('kitchen')) {
    const power = get('Power', 'Wattage', 'Input Power') ?? getPartial('watt', 'power', 'w')
    const cap   = get('Capacity', 'Volume') ?? getPartial('litre', 'liter', 'capacity', 'cup', 'slice')
    const feat  = get('Functions', 'Feature', 'Type') ?? getPartial('function', 'mode', 'grill', 'convection')
    if (power) result.push(power)
    if (cap)   result.push(cap)
    if (feat)  result.push(feat)

  } else {
    // Generic fallback for small appliances
    const power = get('Power', 'Wattage', 'Input Power') ?? getPartial('watt', 'power')
    const cap   = get('Capacity', 'Volume') ?? getPartial('litre', 'liter', 'capacity')
    const type  = get('Type', 'Technology') ?? getPartial('type', 'cord', 'cordless')
    if (power) result.push(power)
    if (cap)   result.push(cap)
    if (type)  result.push(type)
  }

  return result.filter(Boolean).slice(0, 3)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildWAMessage(items: PackageItem[], subtotal: number, discount: number, total: number): string {
  const lines: string[] = [
    "*My Custom Package — Tajalli's* 📦",
    '',
    ...items.map((item, i) => {
      const name = item.product.simplified_name || item.product.model
      const price = item.product.price.cash_floor
      return `${i + 1}. *${item.product.brand} ${name}*${item.qty > 1 ? ` ×${item.qty}` : ''} — PKR ${formatPrice(price * item.qty)}`
    }),
    '',
    `Subtotal: PKR ${formatPrice(subtotal)}`,
  ]
  if (discount > 0) {
    lines.push(`5% Package Discount: −PKR ${formatPrice(discount)}`)
    lines.push(`*Total: PKR ${formatPrice(total)}*`)
  } else {
    lines.push(`*Total: PKR ${formatPrice(total)}*`)
    lines.push(`_(Add ${DISCOUNT_THRESHOLD - items.length} more item${DISCOUNT_THRESHOLD - items.length === 1 ? '' : 's'} to unlock 5% discount)_`)
  }
  lines.push('')
  lines.push('Please confirm availability and share installment options. JazakAllah.')
  return lines.join('\n')
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ProductTile({
  product,
  selected,
  onAdd,
  onRemove,
  compatibilityResult,
  tabId,
}: {
  product:  Product
  selected: boolean
  onAdd:    () => void
  onRemove: () => void
  compatibilityResult?: CompatibilityResult
  tabId: string
}) {
  const incompatible = compatibilityResult?.status === 'incompatible'
  const needsReview  = compatibilityResult?.status === 'uncertain_manual_review'
  const keySpecs     = getKeySpecs(product, tabId)
  const hasModelLine = Boolean(product.simplified_name && product.model && product.simplified_name !== product.model)

  return (
    <div className={`relative bg-white rounded-2xl border-2 transition-all overflow-hidden group flex flex-col ${
      incompatible ? 'border-red-200 opacity-60' :
      selected     ? 'border-brand-400 shadow-lg shadow-brand-50'
                   : 'border-gray-100 hover:border-brand-200 hover:shadow-md'
    }`}>
      {/* Compatibility overlays */}
      {incompatible && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-red-500 text-white text-[10px] font-bold text-center py-1 leading-tight">
          ⚠ Incompatible with your inverter
        </div>
      )}
      {needsReview && !incompatible && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-amber-400 text-gray-900 text-[10px] font-bold text-center py-1 leading-tight">
          ⚠ Needs compatibility review
        </div>
      )}
      {selected && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center shadow">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {/* Image — reduced aspect to leave more room for specs */}
      <div className="aspect-[4/3] bg-gray-50 overflow-hidden shrink-0">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.simplified_name || product.model}
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
            onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg' }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        {/* Brand + model */}
        <p className="text-[10px] font-bold text-brand-500 uppercase tracking-wider mb-0.5">{product.brand}</p>
        <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 mb-0.5">
          {product.simplified_name || product.model}
        </p>
        {hasModelLine && (
          <p className="text-[10px] text-gray-400 font-mono mb-1.5 truncate">{product.model}</p>
        )}

        {/* Key specs */}
        {keySpecs.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {keySpecs.map((spec, i) => (
              <span key={i} className="inline-block bg-gray-50 border border-gray-100 text-gray-600 text-[10px] font-medium px-1.5 py-0.5 rounded-md leading-tight">
                {spec}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <p className="text-sm font-black text-gray-900 mb-2 mt-auto">
          PKR {formatPrice(product.price.cash_floor)}
        </p>

        {/* Action */}
        {selected ? (
          <button onClick={onRemove}
            className="w-full py-2 rounded-xl text-xs font-bold border-2 border-red-200 text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1">
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        ) : (
          <button onClick={incompatible ? undefined : onAdd} disabled={incompatible}
            title={incompatible ? compatibilityResult?.message : undefined}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
              incompatible ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-brand-500 text-white'
            }`}>
            {incompatible ? '✗ Incompatible' : '+ Add to Package'}
          </button>
        )}
      </div>
    </div>
  )
}

type OrderView = 'summary' | 'form' | 'done'

function PackageSummary({
  items,
  onRemove,
  onQtyChange,
}: {
  items:       PackageItem[]
  onRemove:    (id: string) => void
  onQtyChange: (id: string, qty: number) => void
}) {
  const [expanded,   setExpanded]   = useState(true)
  const [view,       setView]       = useState<OrderView>('summary')
  const [form,       setForm]       = useState({ name: '', phone: '', city: '', notes: '' })
  const [loading,    setLoading]    = useState(false)
  const [orderId,    setOrderId]    = useState('')
  const [submitErr,  setSubmitErr]  = useState('')
  const [payMode,    setPayMode]    = useState<'cash' | '3m' | '6m' | '12m'>('cash')

  const totalItems = items.reduce((n, i) => n + i.qty, 0)
  const subtotal   = items.reduce((n, i) => n + i.product.price.cash_floor * i.qty, 0)
  const qualifies  = totalItems >= DISCOUNT_THRESHOLD
  const discount   = qualifies ? Math.round(subtotal * DISCOUNT_PCT) : 0
  const total      = subtotal - discount
  const plan3m     = total > 0 ? calcPlan(total, '3m')  : null
  const plan6m     = total > 0 ? calcPlan(total, '6m')  : null
  const plan12m    = total > 0 ? calcPlan(total, '12m') : null
  const activePlan = payMode === '3m' ? plan3m : payMode === '6m' ? plan6m : payMode === '12m' ? plan12m : null
  const waMsg      = buildWAMessage(items, subtotal, discount, total)

  const phoneValid = /^(\+92|0)3\d{9}$/.test(form.phone.trim())
  const canSubmit  = !loading && form.name.trim() && phoneValid && form.city.trim()

  const handleOnlineOrder = async () => {
    if (!canSubmit) return
    setLoading(true)
    setSubmitErr('')
    try {
      const result = await submitOrder({
        customer_name:    form.name.trim(),
        customer_phone:   form.phone.trim(),
        customer_address: form.city.trim(),
        customer_email:   '',
        products: items.map(i => ({
          id: i.product.id, model: i.product.model,
          brand: i.product.brand, qty: i.qty,
          price: i.product.price.cash_floor,
        })),
        total_amount:     total,
        payment_method:   'myop',
        installment_plan: '',
        advance_paid:     0,
        monthly_amount:   0,
        notes: form.notes || '',
      })
      if (result.error) throw new Error(result.error)
      setOrderId(result.id ? `PKG-${result.id.toString().slice(0, 8).toUpperCase()}` : 'PKG-' + Date.now())
      setView('done')
    } catch {
      setSubmitErr('Could not submit. Try WhatsApp instead.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-xl overflow-hidden sticky top-20 lg:top-[120px]">
      {/* Header */}
      <div className="bg-gray-900 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-white" />
          <span className="font-black text-white">Your Package</span>
          {totalItems > 0 && (
            <span className="bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalItems}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {view !== 'summary' && (
            <button onClick={() => { setView('summary'); setSubmitErr('') }} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)} className="text-gray-400 hover:text-white transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Discount banner */}
      {view === 'summary' && totalItems > 0 && totalItems < DISCOUNT_THRESHOLD && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-800">
            Add <strong>{DISCOUNT_THRESHOLD - totalItems} more</strong> to unlock <strong>5% off</strong>
          </p>
        </div>
      )}
      {view === 'summary' && qualifies && (
        <div className="px-5 py-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-xs text-green-800 font-semibold">5% package discount applied! 🎉</p>
        </div>
      )}

      {/* ── DONE STATE ── */}
      {view === 'done' && (
        <div className="px-5 py-6 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="font-black text-gray-900 mb-1">Order Received!</p>
          <p className="text-xs text-gray-500 mb-1">Ref: <strong>{orderId}</strong></p>
          <p className="text-xs text-gray-400 mb-4">We'll call within a few hours to confirm.</p>
          <a href={waSales(`Hi, I just placed a package order online. Ref: ${orderId}`)}
            target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1da84e] text-white text-xs font-semibold transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> Track on WhatsApp (optional)
          </a>
        </div>
      )}

      {/* ── FORM STATE ── */}
      {view === 'form' && (
        <div className="px-5 py-4">
          <p className="text-xs text-gray-500 mb-4">Enter your details — we'll call to confirm and arrange delivery.</p>
          <div className="space-y-3">
            <input type="text" placeholder="Full Name *"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors" />
            <div>
              <input type="tel" placeholder="Mobile Number * (03XX-XXXXXXX)"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors ${form.phone && !phoneValid ? 'border-red-300' : 'border-gray-200 focus:border-brand-400'}`} />
              {form.phone && !phoneValid && <p className="text-xs text-red-500 mt-1">Enter a valid Pakistani mobile number</p>}
            </div>
            <input type="text" placeholder="City / Area *"
              value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors" />
            <textarea placeholder="Notes (optional)" rows={2}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors resize-none" />
          </div>
          {submitErr && (
            <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{submitErr}</p>
            </div>
          )}
          <div className="mt-4 space-y-2">
            <button onClick={handleOnlineOrder} disabled={!canSubmit}
              className="w-full py-3 rounded-xl font-black text-white text-sm bg-brand-500 hover:bg-brand-600 disabled:opacity-40 transition-colors">
              {loading ? 'Submitting…' : 'Confirm Order'}
            </button>
            <a href={waSales(waMsg)} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors">
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" /> Place via WhatsApp instead
            </a>
          </div>
        </div>
      )}

      {/* ── SUMMARY STATE ── */}
      {view === 'summary' && (
        <>
          {expanded && (
            <div className="px-5 py-4 max-h-64 overflow-y-auto space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-6">
                  <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No items added yet</p>
                  <p className="text-xs text-gray-400 mt-1">Browse products and add to your package</p>
                </div>
              ) : items.map(item => (
                <div key={item.product.id} className="flex items-start gap-3">
                  <img src={item.product.thumbnail || '/placeholder-product.svg'}
                    alt={item.product.simplified_name || item.product.model}
                    className="w-12 h-12 rounded-xl object-contain bg-gray-50 border border-gray-100 shrink-0"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-brand-500 font-semibold">{item.product.brand}</p>
                    <p className="text-xs font-bold text-gray-900 leading-tight truncate">
                      {item.product.simplified_name || item.product.model}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
                        <button onClick={() => onQtyChange(item.product.id, item.qty - 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xs font-bold">−</button>
                        <span className="text-xs font-bold text-gray-700 w-5 text-center">{item.qty}</span>
                        <button onClick={() => onQtyChange(item.product.id, item.qty + 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xs font-bold">+</button>
                      </div>
                      <p className="text-xs font-black text-gray-900">PKR {formatPrice(item.product.price.cash_floor * item.qty)}</p>
                    </div>
                  </div>
                  <button onClick={() => onRemove(item.product.id)} className="text-gray-300 hover:text-red-500 transition-colors mt-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span><span>PKR {formatPrice(subtotal)}</span>
              </div>
              {qualifies && (
                <div className="flex justify-between text-sm text-green-600 font-semibold">
                  <span>5% Discount</span><span>− PKR {formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-gray-900 text-base border-t border-gray-100 pt-2">
                <span>Total</span><span>PKR {formatPrice(total)}</span>
              </div>

              {/* Payment mode toggle */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200 text-[11px] font-bold mt-1">
                {(['cash', '3m', '6m', '12m'] as const).map(mode => (
                  <button key={mode} onClick={() => setPayMode(mode)}
                    className={`flex-1 py-1.5 transition-colors ${payMode === mode ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {mode === 'cash' ? 'Cash' : mode.replace('m', 'M')}
                  </button>
                ))}
              </div>

              {/* Installment breakdown */}
              {activePlan ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs space-y-1">
                  <div className="flex justify-between text-blue-800">
                    <span>Advance ({Math.round(activePlan.advancePct * 100)}%)</span>
                    <span className="font-bold">PKR {formatPrice(activePlan.advance)}</span>
                  </div>
                  <div className="flex justify-between text-blue-800">
                    <span>Monthly × {activePlan.monthlyPayments}</span>
                    <span className="font-bold">PKR {formatPrice(activePlan.monthly)}</span>
                  </div>
                  <div className="flex justify-between text-blue-900 font-black border-t border-blue-200 pt-1">
                    <span>Total (installment)</span>
                    <span>PKR {formatPrice(activePlan.total)}</span>
                  </div>
                  <p className="text-[10px] text-blue-500">Installment available — confirm with our team on WhatsApp</p>
                </div>
              ) : payMode === 'cash' ? (
                <p className="text-xs text-gray-400 text-right">Cash price shown above</p>
              ) : null}

              {/* Primary: website order */}
              <button onClick={() => setView('form')}
                className="w-full mt-3 py-3.5 rounded-2xl font-black text-white bg-brand-500 hover:bg-brand-600 transition-colors flex items-center justify-center gap-2">
                <ClipboardCheck className="w-4 h-4" /> Place Order Online
              </button>
              {/* Secondary: WhatsApp */}
              <a href={waSales(waMsg)} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-2xl border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 transition-colors">
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" /> Order via WhatsApp instead
              </a>
              <p className="text-xs text-gray-400 text-center">We'll call to confirm availability within 1 hour.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function MYOPPage() {
  // Persistent state — survives navigation, tab changes, and page refreshes
  const store      = useMyopStore()
  const activeTab  = store.activeTab
  const selected   = store.items
  const setActiveTab = store.setActiveTab

  const [products,      setProducts]      = useState<Product[]>([])
  const [loading,       setLoading]       = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [bundleLoading, setBundleLoading] = useState<string | null>(null)
  const [bundleLoaded,  setBundleLoaded]  = useState<string | null>(null)
  const [houseType,     setHouseType]     = useState<'house' | 'apartment'>('house')
  const [activePreset,  setActivePreset]  = useState<string | null>(null)

  // Solar compatibility: detect if user has an inverter in their package
  const selectedInverterItem = selected.find(item => isSolarInverter(item.product))
  const inverterPowerKw      = selectedInverterItem ? parseInverterPowerKw(selectedInverterItem.product.specs) : null
  const inverterBrand        = selectedInverterItem?.product.brand ?? ''
  const inverterModel        = selectedInverterItem?.product.model ?? ''

  /** Returns a CompatibilityResult for battery products on the solar tab; null otherwise */
  function getBatteryCompatibility(p: Product): CompatibilityResult | undefined {
    if (activeTab !== 'solar' || !selectedInverterItem || inverterPowerKw === null) return undefined
    if (!isSolarBattery(p)) return undefined
    const bv = parseBatteryVoltageFromSpecs(p.specs)
    return checkCompatibility({ inverterPowerKw, batteryVoltage: bv, inverterBrand, inverterModel })
  }

  // Fetch products for the active tab
  const fetchTab = useCallback(async (tabId: string) => {
    setLoading(true)
    setProducts([])
    try {
      const { products } = await getProducts({ category: tabId, sort: 'price_asc' })
      setProducts(products)
    } catch { /* silent — show empty state */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTab(activeTab); setSearchQuery('') }, [activeTab, fetchTab])

  // Load a preset bundle — fetch each product by ID and add to cart
  const loadBundle = useCallback(async (pack: PresetPack) => {
    if (bundleLoading || !pack.items?.length) return
    setBundleLoading(pack.id)
    setBundleLoaded(null)
    try {
      // Deduplicate IDs — if same product appears twice (e.g. 2 batteries), fetch once then addItem twice
      const idCounts: Record<string, number> = {}
      for (const item of pack.items!) {
        idCounts[item.id] = (idCounts[item.id] || 0) + 1
      }
      const uniqueIds = Object.keys(idCounts)
      const fetched = await Promise.all(uniqueIds.map(id => getProduct(id)))
      for (let i = 0; i < uniqueIds.length; i++) {
        const product = fetched[i]
        if (!product) continue
        const qty = idCounts[uniqueIds[i]]
        if (!store.hasItem(product.id)) {
          store.addItem(product, qty)
        }
      }
      setActiveTab(pack.firstTab)
      setBundleLoaded(pack.id)
      setTimeout(() => setBundleLoaded(null), 2500)
    } catch { /* silent */ }
    finally { setBundleLoading(null) }
  }, [bundleLoading, store, setActiveTab])

  // Start a guided preset — pre-load items (if any) and navigate to first slot tab
  const startPreset = useCallback(async (pack: PresetPack) => {
    const wasActive = activePreset === pack.id
    setActivePreset(pack.id)
    if (!wasActive && pack.items?.length) {
      await loadBundle(pack)
    } else {
      // Navigate to first unfilled required slot, or first slot
      const firstUnfilled = pack.slots.find(
        slot => slot.required && !selected.some(i => getProductTabId(i.product) === slot.tabId)
      )
      setActiveTab(firstUnfilled?.tabId ?? pack.slots[0]?.tabId ?? pack.firstTab)
    }
  }, [activePreset, loadBundle, setActiveTab, selected])

  // Filter products by search query (model, simplified_name, brand)
  const filteredProducts = searchQuery.trim()
    ? products.filter(p => {
        const q = searchQuery.toLowerCase()
        return (
          (p.simplified_name || '').toLowerCase().includes(q) ||
          (p.model           || '').toLowerCase().includes(q) ||
          (p.brand           || '').toLowerCase().includes(q)
        )
      })
    : products

  const isSelected = (id: string) => store.hasItem(id)

  const addItem    = (product: Product) => store.addItem(product)
  const removeItem = (id: string)       => store.removeItem(id)

  const changeQty = (id: string, qty: number) => {
    if (qty < 1) { removeItem(id); return }
    store.updateQty(id, qty)
  }

  const totalItems = store.itemCount()
  const qualifies  = totalItems >= DISCOUNT_THRESHOLD

  // Solar / UPS load recommendation
  const currentPreset     = activePreset ? PRESET_PACKS.find(p => p.id === activePreset) ?? null : null
  const hasInverter       = selected.some(i => isSolarInverter(i.product))
  const totalKwhPerMonth  = selected.reduce((sum, i) => sum + estimateKwhPerMonth(i.product) * i.qty, 0)
  const avgDailyKwh       = +(totalKwhPerMonth / 30).toFixed(1)
  const recommendedKw     = avgDailyKwh <= 0 ? 0
                          : avgDailyKwh < 5  ? 3.5
                          : avgDailyKwh < 10 ? 5
                          : avgDailyKwh < 15 ? 8
                          : 12
  const showSolarBar = totalKwhPerMonth > 0 && !hasInverter && houseType === 'house'
  const showUPSBar   = totalKwhPerMonth > 0 && !hasInverter && houseType === 'apartment'

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Build Your Own Package — Tajalli's"
        description="Mix and match appliances and solar products. Get 5% off when you pick 3 or more products. Easy installments available."
        keywords="home appliance package karachi, bundle deals appliances pakistan, custom appliance package"
      />

      {/* Hero */}
      <div className="bg-gray-900 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-500/20 text-brand-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
            <Sparkles className="w-4 h-4" /> Make Your Own Package
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
            Build Your Perfect<br />Home Package
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
            Pick any appliances or solar products you need — mix and match across categories.
            Add <strong className="text-brand-400">3 or more items</strong> and get <strong className="text-brand-400">5% off</strong> your entire order.
          </p>

          {/* Discount badge */}
          <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-6 py-3">
            <Tag className="w-5 h-5 text-brand-400" />
            <div className="text-left">
              <p className="text-white font-bold text-sm">5% Bundle Discount</p>
              <p className="text-gray-400 text-xs">Automatically applied when you pick 3+ products</p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works strip */}
      <div className="bg-white border-b border-gray-100 py-5 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { step: '01', text: 'Browse & add products from any category' },
            { step: '02', text: 'Add 3+ items to unlock your 5% discount' },
            { step: '03', text: 'Place your order online or via WhatsApp — we confirm and deliver' },
          ].map(s => (
            <div key={s.step} className="flex flex-col items-center gap-1">
              <span className="text-xs font-black text-brand-500">{s.step}</span>
              <p className="text-xs text-gray-600 leading-snug">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left: Category tabs + product grid ── */}
          <div className="flex-1 min-w-0">

            {/* ── Guided Starter Packs ── */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Guided Starter Packs</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Start with a template, then swap any product</p>
                </div>
                {/* House / Apartment toggle */}
                <div className="flex rounded-xl overflow-hidden border border-gray-200 text-[11px] font-bold shrink-0">
                  <button onClick={() => setHouseType('house')}
                    className={`px-3 py-1.5 transition-colors ${houseType === 'house' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    🏠 House
                  </button>
                  <button onClick={() => setHouseType('apartment')}
                    className={`px-3 py-1.5 transition-colors ${houseType === 'apartment' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    🏢 Apartment
                  </button>
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {PRESET_PACKS.map(pack => {
                  const isActive  = activePreset === pack.id
                  const isLoading = bundleLoading === pack.id
                  const isLoaded  = bundleLoaded  === pack.id
                  const filledCount = pack.slots.filter(slot =>
                    selected.some(i => getProductTabId(i.product) === slot.tabId)
                  ).length
                  return (
                    <div key={pack.id} className={`bg-white border-2 rounded-2xl p-4 flex flex-col gap-2 transition-all shrink-0 w-56 ${
                      isActive
                        ? 'border-brand-400 shadow-lg shadow-brand-50'
                        : 'border-gray-200 hover:border-brand-200 hover:shadow-md'
                    }`}>
                      {/* Header */}
                      <div className="flex items-start gap-2">
                        <span className="text-2xl leading-none shrink-0">{pack.icon}</span>
                        <div className="min-w-0">
                          <p className="font-black text-gray-900 text-sm leading-tight">{pack.name}</p>
                          <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{pack.tagline}</p>
                        </div>
                      </div>
                      {/* Slot pills */}
                      <div className="flex flex-wrap gap-1">
                        {pack.slots.map((slot, i) => {
                          const filled = selected.some(item => getProductTabId(item.product) === slot.tabId)
                          return (
                            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-medium leading-tight ${
                              filled
                                ? 'bg-green-100 text-green-700'
                                : slot.required
                                  ? 'bg-brand-50 text-brand-600 border border-brand-200'
                                  : 'bg-gray-50 text-gray-400'
                            }`}>
                              {filled ? '✓ ' : ''}{slot.label}
                            </span>
                          )
                        })}
                      </div>
                      {/* Positioning */}
                      <p className="text-[10px] text-gray-500 leading-snug line-clamp-2">{pack.positioning}</p>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        <span className="font-semibold">Best for:</span> {pack.bestFor}
                      </p>
                      {/* Progress bar (only when active + has items) */}
                      {isActive && filledCount > 0 && (
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-400 rounded-full transition-all"
                            style={{ width: `${(filledCount / pack.slots.length) * 100}%` }}
                          />
                        </div>
                      )}
                      {/* CTA */}
                      <button
                        onClick={() => startPreset(pack)}
                        disabled={isLoading}
                        className={`mt-auto py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                          isLoaded  ? 'bg-green-500 text-white' :
                          isActive  ? 'bg-brand-500 hover:bg-brand-600 text-white' :
                                      'bg-gray-900 hover:bg-brand-500 text-white'
                        }`}
                      >
                        {isLoading ? (
                          <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Loading…</>
                        ) : isLoaded ? '✓ Pack loaded!' : isActive ? 'Continue building →' : 'Start with this pack →'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Guided preset progress strip */}
            {activePreset && currentPreset && (
              <div className="mb-4 bg-brand-50 border border-brand-200 rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{currentPreset.icon}</span>
                    <p className="text-xs font-black text-brand-700">{currentPreset.name}</p>
                    <span className="text-[10px] text-brand-500 font-medium">
                      {currentPreset.slots.filter(s => selected.some(i => getProductTabId(i.product) === s.tabId)).length}
                      /{currentPreset.slots.length} filled
                    </span>
                  </div>
                  <button onClick={() => setActivePreset(null)}
                    className="text-xs text-brand-400 hover:text-brand-700 font-medium transition-colors">
                    Clear ×
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentPreset.slots.map((slot, i) => {
                    const filled = selected.some(item => getProductTabId(item.product) === slot.tabId)
                    return (
                      <button key={i} onClick={() => setActiveTab(slot.tabId)}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition-colors ${
                          filled
                            ? 'bg-green-100 border-green-200 text-green-700'
                            : slot.required
                              ? 'bg-white border-brand-300 text-brand-700 hover:bg-brand-100'
                              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        {filled ? '✓ ' : ''}{slot.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative mb-6">
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, model, or brand…"
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl border-2 border-gray-200 bg-white text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-brand-400 shadow-sm transition-colors"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Solar recommendation bar — house mode */}
            {showSolarBar && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5">☀️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-900">
                    {currentPreset?.solarRec
                      ? currentPreset.solarRec
                      : `Your package uses ~${totalKwhPerMonth} kWh/month (${avgDailyKwh} kWh/day)`}
                  </p>
                  {!currentPreset?.solarRec && (
                    <p className="text-xs text-amber-700 mt-0.5">
                      A <strong>{recommendedKw} kW solar system</strong> would cover this load and reduce your electricity bill.
                    </p>
                  )}
                </div>
                <button onClick={() => setActiveTab('solar')}
                  className="shrink-0 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap">
                  Add Solar →
                </button>
              </div>
            )}

            {/* UPS recommendation bar — apartment mode */}
            {showUPSBar && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5">🔋</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-blue-900">
                    {currentPreset?.upsRec
                      ? currentPreset.upsRec
                      : 'For apartments, UPS/inverter backup is more practical than rooftop solar.'}
                  </p>
                  {!currentPreset?.upsRec && (
                    <p className="text-xs text-blue-700 mt-0.5">
                      Covers fans, lights, and fridge during load-shedding — ~{totalKwhPerMonth} kWh/month estimated load.
                    </p>
                  )}
                </div>
                <button onClick={() => setActiveTab('solar')}
                  className="shrink-0 text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap">
                  Add UPS →
                </button>
              </div>
            )}

            {/* Products grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-4 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-3">📦</p>
                {searchQuery ? (
                  <>
                    <p className="text-gray-500 font-medium">No products match "{searchQuery}"</p>
                    <button onClick={() => setSearchQuery('')} className="text-brand-500 text-sm hover:underline mt-2 inline-block">
                      Clear search
                    </button>
                    <span className="text-gray-300 mx-2 text-sm">·</span>
                    <Link to="/products" className="text-gray-400 text-sm hover:underline mt-2 inline-block">
                      Search all products →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 font-medium">No products found in this category</p>
                    <Link to="/products" className="text-brand-500 text-sm hover:underline mt-2 inline-block">
                      Browse all products →
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Search result count */}
                {searchQuery && (
                  <p className="text-xs text-gray-400 mb-3">{filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for "{searchQuery}"</p>
                )}
                {/* Compatibility banner: shown on solar tab when an inverter is selected */}
                {activeTab === 'solar' && selectedInverterItem && (
                  <div className={`mb-4 rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${
                    inverterPowerKw !== null
                      ? 'bg-blue-50 border border-blue-200 text-blue-800'
                      : 'bg-amber-50 border border-amber-200 text-amber-800'
                  }`}>
                    <span className="text-base leading-none mt-0.5">⚡</span>
                    <div>
                      {inverterPowerKw !== null ? (
                        <>
                          <strong>{selectedInverterItem.product.brand} {selectedInverterItem.product.model}</strong> ({inverterPowerKw} kW) is in your package.
                          {' '}Incompatible batteries are marked and cannot be added.
                        </>
                      ) : (
                        <>
                          <strong>{selectedInverterItem.product.brand} {selectedInverterItem.product.model}</strong> is in your package,
                          but its rated power is not on file — battery compatibility check is unavailable.
                        </>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <ProductTile
                      key={product.id}
                      product={product}
                      tabId={activeTab}
                      selected={isSelected(product.id)}
                      onAdd={() => addItem(product)}
                      onRemove={() => removeItem(product.id)}
                      compatibilityResult={getBatteryCompatibility(product)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Right: Package summary (desktop sticky) ── */}
          <div id="myop-summary" className="lg:w-80 shrink-0">
            <PackageSummary
              items={selected}
              onRemove={removeItem}
              onQtyChange={changeQty}
            />

            {/* Info box */}
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Prices shown are cash prices. Installment plans (2–12 months) are available — select your preferred plan when placing your order.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile floating bar */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-apple-xl">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 leading-none mb-0.5">
              {totalItems} item{totalItems !== 1 ? 's' : ''} selected
              {qualifies && <span className="text-green-600 font-semibold ml-1">· 5% off</span>}
            </p>
            <p className="font-black text-gray-900 text-base leading-none">
              PKR {formatPrice(
                selected.reduce((n, i) => n + i.product.price.cash_floor * i.qty, 0) * (qualifies ? (1 - DISCOUNT_PCT) : 1)
              )}
            </p>
          </div>
          <button
            onClick={() => document.getElementById('myop-summary')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-2 text-sm whitespace-nowrap transition-colors"
          >
            <ShoppingBag className="w-4 h-4" /> View Summary
          </button>
        </div>
      )}
      {/* Bottom padding for mobile bar */}
      {selected.length > 0 && <div className="h-20 lg:hidden" />}
    </div>
  )
}

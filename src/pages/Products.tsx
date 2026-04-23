import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Grid3X3, List, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'
import { getProducts, DEFAULT_CATEGORIES, type Product } from '../lib/api'
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

// Primary browse categories — maps to normalized_category slugs in getProducts CAT_TERMS
const PRIMARY_BROWSE_CATS = [
  { id: 'air-conditioners',   label: 'Air Conditioners',   icon: '❄️' },
  { id: 'refrigerators',      label: 'Refrigerators',      icon: '🧊' },
  { id: 'freezers',           label: 'Freezers',           icon: '🥶' },
  { id: 'washing-machines',   label: 'Washing Machines',   icon: '👕' },
  { id: 'televisions',        label: 'Televisions',        icon: '📺' },
  { id: 'solar',              label: 'Solar',              icon: '☀️' },
  { id: 'kitchen-appliances', label: 'Kitchen Appliances', icon: '🍳' },
  { id: 'water-dispensers',   label: 'Water Dispensers',   icon: '💧' },
  { id: 'small-appliances',   label: 'Small Appliances',   icon: '🔌' },
] as const


// ── Deep subcategories — pre-set spec filter combinations accessible via ?sub= ─
// Each entry maps a specKey (e.g. 'ac') to an array of browsable subcategories.
// Clicking a subcategory pill sets ?sub=<slug> and pre-applies the matching filters.
// ── Deep subcategory config — entries validated against actual catalog data ───
// Counts (from live DB audit 2026-04-09, 993 active products):
//   AC: 194 | Freezers: 56 | WM: 58 + Spinners: 10 | TV: 84
//   Kitchen: 231 | Small+Heating+Care: 102 | Solar Inv: 57+Bat: 12
// Each entry pre-sets SPEC_FILTERS keys so the URL ?sub= param immediately
// narrows the product grid to the right subset — no manual filter-clicking needed.
const DEEP_SUBCATEGORIES: Record<string, Array<{
  slug: string; label: string; icon: string; filters: Record<string, string>
}>> = {

  // ── Air Conditioners ─────────────────────────────────────────────────────────
  // 1T: 61 | 1.5T: 81 | 2T: 38 | T3: 34 | Heat&Cool: 137 | Inverter: 113 | Non-Inv: 81
  ac: [
    // By tonnage + technology (most commercially useful groupings)
    { slug: '1-ton-inverter',       label: '1 Ton Inverter',         icon: '❄️', filters: { tonnage: '1t',   actech: 'inverter'     } },
    { slug: '1-ton-non-inverter',   label: '1 Ton Non-Inverter',     icon: '❄️', filters: { tonnage: '1t',   actech: 'non-inverter' } },
    { slug: '1-5-ton-inverter',     label: '1.5 Ton Inverter',       icon: '❄️', filters: { tonnage: '1.5t', actech: 'inverter'     } },
    { slug: '1-5-ton-non-inverter', label: '1.5 Ton Non-Inverter',   icon: '❄️', filters: { tonnage: '1.5t', actech: 'non-inverter' } },
    { slug: '2-ton-inverter',       label: '2 Ton Inverter',         icon: '❄️', filters: { tonnage: '2t',   actech: 'inverter'     } },
    { slug: '2-ton-non-inverter',   label: '2 Ton Non-Inverter',     icon: '❄️', filters: { tonnage: '2t',   actech: 'non-inverter' } },
    // By feature / mode (T3: 34 products, Heat&Cool: 137)
    { slug: 'heat-and-cool',        label: 'Heat & Cool',            icon: '🌡️', filters: { actemp: 'heatcool'                      } },
    { slug: 'cool-only',            label: 'Cool Only',              icon: '❄️', filters: { actemp: 'coolonly'                      } },
    { slug: 't3-air-conditioners',  label: 'T3 (High Ambient 52°C)', icon: '🌞', filters: { actemp: 't3'                            } },
    // By type (floor-standing: 4 products confirmed)
    { slug: 'floor-standing-ac',    label: 'Floor Standing',         icon: '🏢', filters: { actype: 'floor'                         } },
  ],

  // ── Refrigerators ────────────────────────────────────────────────────────────
  // Small: 24 | Medium: 18 | Large: 25 | No-Frost: 7 | French: 6 | SxS: 5
  // Inverter: widespread | No-Frost tag: 7 | Glass Door: common
  fridge: [
    { slug: 'compact-fridge',    label: 'Compact (up to 10 Cu.Ft)',  icon: '🧊', filters: { fridgesize: 'small'    } },
    { slug: 'medium-fridge',     label: 'Medium (11–16 Cu.Ft)',      icon: '🧊', filters: { fridgesize: 'medium'   } },
    { slug: 'large-fridge',      label: 'Large (17+ Cu.Ft)',         icon: '🧊', filters: { fridgesize: 'large'    } },
    { slug: 'inverter-fridge',   label: 'Inverter Compressor',       icon: '⚡', filters: { fridgetech: 'inverter' } },
    { slug: 'glass-door-fridge', label: 'Glass Door',                icon: '🔲', filters: { fridgetype: 'glass'    } },
    { slug: 'no-frost-fridge',   label: 'No-Frost',                  icon: '❄️', filters: { fridgetype: 'nofrost'  } },
    { slug: 'double-door-fridge',label: 'Double Door',               icon: '🚪', filters: { fridgetype: 'double'   } },
  ],

  // ── Freezers ─────────────────────────────────────────────────────────────────
  // Total: 56 | Inverter: 25 | Non-Inv: 31 | Double Door: 7 | Convertible: 6
  // Cu.Ft: <=9: 7 | 10-11: 8 | 12-14: 10 | 15+: 20
  freezer: [
    // By type (most browsable grouping — customers search by door style)
    { slug: 'double-door-freezer',  label: 'Double Door Freezers',      icon: '🚪', filters: { freezertype: 'double'       } },
    { slug: 'single-door-freezer',  label: 'Single Door Freezers',      icon: '📦', filters: { freezertype: 'single'       } },
    { slug: 'convertible-freezer',  label: 'Convertible Freezers',      icon: '🔄', filters: { freezertype: 'convertible'  } },
    { slug: 'upright-freezer',      label: 'Vertical / Upright',        icon: '🥶', filters: { freezertype: 'upright'      } },
    // By technology
    { slug: 'inverter-freezer',     label: 'Inverter Freezers',         icon: '⚡', filters: { freezertech: 'inverter'     } },
    { slug: 'non-inverter-freezer', label: 'Non-Inverter Freezers',     icon: '🧊', filters: { freezertech: 'non-inverter' } },
    // By capacity band (calibrated to actual catalog)
    { slug: 'freezer-8cuft',        label: 'Up to 9 Cu.Ft (Compact)',   icon: '📦', filters: { freezercap: '8cuft'         } },
    { slug: 'freezer-10cuft',       label: '10–11 Cu.Ft',               icon: '📦', filters: { freezercap: '10cuft'        } },
    { slug: 'freezer-13cuft',       label: '12–14 Cu.Ft',               icon: '📦', filters: { freezercap: '13cuft'        } },
    { slug: 'freezer-15cuft',       label: '15+ Cu.Ft (Large)',         icon: '📦', filters: { freezercap: '15cuft'        } },
    // Combined: inverter + capacity (most specific search)
    { slug: 'inverter-freezer-10',  label: 'Inverter 10–11 Cu.Ft',      icon: '⚡', filters: { freezertech: 'inverter', freezercap: '10cuft' } },
    { slug: 'inverter-freezer-15',  label: 'Inverter 15+ Cu.Ft',        icon: '⚡', filters: { freezertech: 'inverter', freezercap: '15cuft' } },
  ],

  // ── Washing Machines ─────────────────────────────────────────────────────────
  // Total WM: 58 | Front Load: 3 | Top Load: 33 | Semi-Auto: 18 | Twin Tub: 2
  // Spinners: 10 | Inverter: 3 | Kg bands: <=7: 11 | 8-9: 22 | 10-11: 13 | 12-14: 14 | 15+: 8
  washing: [
    // By type
    { slug: 'front-load',        label: 'Front Load Auto',   icon: '🌀', filters: { washtype: 'front'   } },
    { slug: 'top-load',          label: 'Top Load Auto',     icon: '👕', filters: { washtype: 'top'     } },
    { slug: 'semi-automatic',    label: 'Semi-Automatic',    icon: '🔄', filters: { washtype: 'semi'    } },
    { slug: 'twin-tub',          label: 'Twin Tub',          icon: '🫧', filters: { washtype: 'twintub' } },
    { slug: 'spinners',          label: 'Spinners',          icon: '🌀', filters: { washtype: 'spinner' } },
    // By capacity
    { slug: 'washer-7kg',        label: 'Up to 7 kg',        icon: '👕', filters: { washcap: 'small'  } },
    { slug: 'washer-8-9kg',      label: '8–9 kg',            icon: '👕', filters: { washcap: 'medium' } },
    { slug: 'washer-10-11kg',    label: '10–11 kg',          icon: '👕', filters: { washcap: 'large'  } },
    { slug: 'washer-12-14kg',    label: '12–14 kg',          icon: '👕', filters: { washcap: 'xl'     } },
    { slug: 'washer-15kg-plus',  label: '15 kg+ (Blanket)',  icon: '🛏️', filters: { washcap: 'xxl'    } },
    // By tech (inverter: 3 products confirmed)
    { slug: 'inverter-washer',   label: 'Inverter Motor',    icon: '⚡', filters: { washinverter: 'inverter' } },
  ],

  // ── Televisions ──────────────────────────────────────────────────────────────
  // Total: 84 | 32": 6 | 43": 12 | 50-55": 21 | 65": 19 | 75-79": 15 | 80"+: 11
  // QLED: 7 | 4K: 14 | Google TV: 9 | OLED: 0 (none in catalog — not listed)
  tv: [
    // By screen size (primary browse)
    { slug: '32-inch-tv',  label: '32" TV',         icon: '📺', filters: { tvsize: '32' } },
    { slug: '43-inch-tv',  label: '43" TV',         icon: '📺', filters: { tvsize: '43' } },
    { slug: '50-55-inch',  label: '50"–55" TV',     icon: '📺', filters: { tvsize: '50' } },
    { slug: '65-inch-tv',  label: '65" TV',         icon: '🖥️', filters: { tvsize: '65' } },
    { slug: '75-inch-tv',  label: '75" TV',         icon: '🖥️', filters: { tvsize: '75' } },
    { slug: '85-inch-plus',label: '85"+ Ultra',     icon: '🎬', filters: { tvsize: '85' } },
    // By display technology (7 QLED, 14 4K confirmed)
    { slug: 'qled-tv',     label: 'QLED',           icon: '✨', filters: { tvtech: 'qled'     } },
    { slug: '4k-tv',       label: '4K / Ultra HD',  icon: '🔲', filters: { tvtech: '4k'       } },
    { slug: 'google-tv',   label: 'Google TV',      icon: '📱', filters: { tvtech: 'googletv' } },
  ],

  // ── Kitchen Appliances ───────────────────────────────────────────────────────
  // Total: 231 — subcategory counts verified against catalog
  kitchen: [
    // High-traffic subcategories first
    { slug: 'air-fryers',        label: 'Air Fryers',            icon: '🌪️', filters: { kitchensubtype: 'air-fryer'      } },
    { slug: 'hand-blenders',     label: 'Hand Blenders',         icon: '🥤', filters: { kitchensubtype: 'hand-blender'  } },
    { slug: 'jug-blenders',      label: 'Jug / Stand Blenders',  icon: '🥤', filters: { kitchensubtype: 'jug-blender'   } },
    { slug: 'mixers',            label: 'Mixers',                icon: '🎂', filters: { kitchensubtype: 'mixer'         } },
    { slug: 'juicers',           label: 'Juicers',               icon: '🍊', filters: { kitchensubtype: 'juicer'        } },
    { slug: 'food-processors',   label: 'Food Processors',       icon: '🔪', filters: { kitchensubtype: 'food-processor'} },
    { slug: 'choppers',          label: 'Choppers',              icon: '🥬', filters: { kitchensubtype: 'chopper'       } },
    { slug: 'meat-grinders',     label: 'Meat Grinders',         icon: '🥩', filters: { kitchensubtype: 'meat-grinder'  } },
    { slug: 'electric-ovens',    label: 'Electric Ovens',        icon: '🍞', filters: { kitchensubtype: 'oven'          } },
    { slug: 'toasters',          label: 'Toasters',              icon: '🍞', filters: { kitchensubtype: 'toaster'       } },
    { slug: 'sandwich-makers',   label: 'Sandwich / Waffle',     icon: '🥪', filters: { kitchensubtype: 'sandwich'      } },
    { slug: 'electric-kettles',  label: 'Electric Kettles',      icon: '🫖', filters: { kitchensubtype: 'kettle'        } },
    { slug: 'coffee-makers',     label: 'Coffee Makers',         icon: '☕', filters: { kitchensubtype: 'coffee'        } },
    { slug: 'roti-makers',       label: 'Roti Makers',           icon: '🫓', filters: { kitchensubtype: 'roti'          } },
    { slug: 'induction-cookers', label: 'Induction / Ceramic',   icon: '🍳', filters: { kitchensubtype: 'induction'     } },
    { slug: 'rice-cookers',      label: 'Rice Cookers',          icon: '🍚', filters: { kitchensubtype: 'rice-cooker'   } },
  ],

  // ── Microwave Ovens ──────────────────────────────────────────────────────────
  // Solo: 13+3=16 | Grill: 14 | Convection/AF: 14+1=15 | Total: ~45
  microwave: [
    { slug: 'solo-microwave',        label: 'Solo Microwaves',        icon: '📡', filters: { mwtype: 'solo'        } },
    { slug: 'grill-microwave',       label: 'Grill Microwaves',       icon: '🔥', filters: { mwtype: 'grill'       } },
    { slug: 'convection-microwave',  label: 'Convection / Air Fryer', icon: '🌀', filters: { mwtype: 'convection'  } },
    { slug: 'inverter-microwave',    label: 'Inverter Microwave',     icon: '⚡', filters: { mwtype: 'inverter-mw' } },
    { slug: 'compact-microwave',     label: 'Compact (up to 20L)',    icon: '📡', filters: { mwcap: 'small'        } },
    { slug: 'standard-microwave',    label: 'Standard (21–30L)',      icon: '📡', filters: { mwcap: 'medium'       } },
    { slug: 'large-microwave',       label: 'Large (31L+)',           icon: '📡', filters: { mwcap: 'large'        } },
  ],

  // ── Small Appliances / Home & Heating ────────────────────────────────────────
  // Total: ~58 in Home&Heating + 8 in Small + 8 in vacuum/small
  // Fans: 7 | Dry Irons: 8 | Steam Irons: 6 | Steamers: 5
  // Heaters: 11 | Vacuums: 10 | Humidifiers: 6 | Insect Killers: 6
  small: [
    { slug: 'fans',             label: 'Fans',              icon: '💨', filters: { smalltype: 'fan'           } },
    { slug: 'dry-irons',        label: 'Dry Irons',         icon: '👔', filters: { smalltype: 'dry-iron'      } },
    { slug: 'steam-irons',      label: 'Steam Irons',       icon: '💨', filters: { smalltype: 'steam-iron'    } },
    { slug: 'garment-steamers', label: 'Garment Steamers',  icon: '👗', filters: { smalltype: 'garment-steam' } },
    { slug: 'room-heaters',     label: 'Room Heaters',      icon: '🔥', filters: { smalltype: 'heater'        } },
    { slug: 'vacuum-cleaners',  label: 'Vacuum Cleaners',   icon: '🧹', filters: { smalltype: 'vacuum'        } },
    { slug: 'humidifiers',      label: 'Humidifiers',       icon: '💧', filters: { smalltype: 'humidifier'    } },
    { slug: 'insect-killers',   label: 'Insect Killers',    icon: '🦟', filters: { smalltype: 'insect-killer' } },
  ],

  // ── Personal Care ─────────────────────────────────────────────────────────────
  // Total: ~38 | Hair Dryers: 12 | Straighteners: 8 | Trimmers/Clippers: 6
  care: [
    { slug: 'hair-dryers',      label: 'Hair Dryers',         icon: '💨', filters: { caretype: 'hair-dryer'   } },
    { slug: 'straighteners',    label: 'Hair Straighteners',  icon: '💇', filters: { caretype: 'straightener' } },
    { slug: 'curlers',          label: 'Curlers / Crimpers',  icon: '〰️', filters: { caretype: 'curler'       } },
    { slug: 'trimmers',         label: 'Trimmers / Clippers', icon: '✂️', filters: { caretype: 'trimmer'      } },
    { slug: 'body-scales',      label: 'Body Scales',         icon: '⚖️', filters: { caretype: 'scale'        } },
    { slug: 'massagers',        label: 'Massagers',           icon: '🤲', filters: { caretype: 'massager'     } },
  ],

  // ── Solar Solutions ──────────────────────────────────────────────────────────
  // Inverters: 57 | Batteries: 12 | Panels: 0 (not in catalog) | Pump Inv: 3
  // kW bands: <=5: 14 | 5-8: 15 | 8-12: 9 | unlabelled: 19
  // Battery voltages: 12.8V (1) | 25.6V/24V (2) | 51.2V/48V (5) | Lithium: 6
  solar: [
    // By product type
    { slug: 'solar-inverters',   label: 'Solar Inverters',     icon: '⚡', filters: { solarcat: 'inverter' } },
    { slug: 'solar-batteries',   label: 'Solar Batteries',     icon: '🔋', filters: { solarcat: 'battery'  } },
    { slug: 'pump-inverters',    label: 'Pump Inverters',      icon: '🌊', filters: { solarcat: 'pump'     } },
    { slug: 'hybrid-systems',    label: 'Hybrid Systems',      icon: '🔄', filters: { solarcat: 'hybrid'   } },
    // By inverter size (kW — calibrated to actual catalog coverage)
    { slug: 'up-to-5kw',         label: 'Up to 5 kW',          icon: '☀️', filters: { solarcat: 'inverter', solarkw: '5kw'   } },
    { slug: '5-8kw',             label: '5–8 kW',              icon: '☀️', filters: { solarcat: 'inverter', solarkw: '8kw'   } },
    { slug: '8-12kw',            label: '8–12 kW',             icon: '☀️', filters: { solarcat: 'inverter', solarkw: '12kw'  } },
    { slug: 'above-12kw',        label: 'Above 12 kW',         icon: '☀️', filters: { solarcat: 'inverter', solarkw: '12kw+' } },
    // By battery voltage (compatibility groupings — 24V vs 48V matters for solar system design)
    { slug: '24v-batteries',     label: '24V Batteries (25.6V)', icon: '🔋', filters: { solarcat: 'battery', batvolt: '24v' } },
    { slug: '48v-batteries',     label: '48V Batteries (51.2V)', icon: '🔋', filters: { solarcat: 'battery', batvolt: '48v' } },
  ],

  // ── Water Dispensers ─────────────────────────────────────────────────────────
  // Total: 7 — simplified_names are "Dawlance Cold Water Dispenser" (generic).
  // Type must be inferred from model# or tags. Using broadest available filters.
  water: [
    { slug: 'cold-dispenser',    label: 'Cold Water Only',   icon: '💧', filters: { watertype: 'cold'   } },
    { slug: 'hot-cold-dispenser',label: 'Hot & Cold',        icon: '♨️', filters: { watertype: 'hot'    } },
    { slug: 'bottom-load',       label: 'Bottom Load',       icon: '🪣', filters: { watertype: 'bottom' } },
  ],
}

// Category-specific spec filters — applied client-side
type SpecFilter = { key: string; label: string; options: { value: string; label: string; match: (p: Product) => boolean }[] }

// Helper: extract numeric value from simplified_name / specs
// Catalog format: "9kg", "9 kg", "9.2 kg", "11.3 Cu.Ft", "20L", "55""
const _name = (p: Product) => (p.simplified_name || '') + ' ' + (p.tags || '') + ' ' + (p.model || '')
const _inches = (p: Product) => { const m = _name(p).match(/(\d{2})\s*(?:"|inch|")/i); return m ? parseInt(m[1]) : 0; }
const _kg     = (p: Product) => { const m = (p.simplified_name || '').match(/(\d{1,2}(?:\.\d{1,2})?)\s*kg\b/i); return m ? parseFloat(m[1]) : 0; }
const _liters = (p: Product) => {
  const src = (p.specs?.['Capacity'] || '') + ' ' + (p.simplified_name || '');
  const m = src.match(/(\d{2,3})\s*[Ll]\b/); return m ? parseInt(m[1]) : 0;
}
const _cuft   = (p: Product) => {
  const src = (p.specs?.['Capacity'] || '') + ' ' + (p.simplified_name || '');
  const m = src.match(/(\d{1,2}(?:\.\d+)?)\s*(?:cu\.?ft|cubic\.?\s*f)/i); return m ? parseFloat(m[1]) : 0;
}
// kW extractor for solar
const _kw = (p: Product) => {
  const m = (p.simplified_name || '').match(/(\d+(?:\.\d+)?)\s*k[Ww]/);
  return m ? parseFloat(m[1]) : 0;
}

const SPEC_FILTERS: Record<string, SpecFilter[]> = {
  // ── Air Conditioners ─────────────────────────────────────────────────────────
  // Catalog: 194 total — "1 Ton ACs" (62), "1.5 Ton ACs" (84), "2 Ton ACs" (35),
  //          "Air Conditioner" (13 — incl 0.9T/1.2T/1.7T/floor-standing)
  // Inverter: 113 | Non-Inverter: 81 | T3: 34 | Heat&Cool: 137
  ac: [
    {
      key: 'tonnage', label: 'Tonnage',
      options: [
        // Match category name first (most reliable), fall back to simplified_name
        { value: '1t',   label: '1 Ton',    match: p => p.category === '1 Ton Air Conditioners' || (/\b1\.0?\s*[Tt]on\b/i.test(p.simplified_name || '') && !/1\.[2-9]\s*[Tt]on/i.test(p.simplified_name || '')) },
        { value: '1.5t', label: '1.5 Ton',  match: p => p.category === '1.5 Ton Air Conditioners' || /1\.5\s*[Tt]on/i.test(p.simplified_name || '') },
        { value: '2t',   label: '2 Ton',    match: p => p.category === '2 Ton Air Conditioners' || (/\b2\.0?\s*[Tt]on\b/i.test(p.simplified_name || '') && !/2\.[1-9]/i.test(p.simplified_name || '')) },
      ],
    },
    {
      key: 'actech', label: 'Technology',
      options: [
        {
          value: 'inverter', label: 'Inverter',
          match: p => {
            const src = (p.simplified_name || '') + ' ' + (p.tags || '');
            if (/inverter/i.test(src)) return true;
            // Product intelligence: Gree Airy series = inverter (not always labeled)
            if (/gree/i.test(p.brand) && /\bairy\b/i.test(p.simplified_name || '')) return true;
            // Product intelligence: Haier HFT series = T3 inverter
            if (/haier/i.test(p.brand) && /\bHFT\b/.test(p.model || '')) return true;
            return false;
          },
        },
        {
          value: 'non-inverter', label: 'Non-Inverter',
          match: p => {
            const src = (p.simplified_name || '') + ' ' + (p.tags || '');
            if (/inverter/i.test(src)) return false;
            // Gree Airy and Haier HFT are inverter — exclude from non-inverter
            if (/gree/i.test(p.brand) && /\bairy\b/i.test(p.simplified_name || '')) return false;
            if (/haier/i.test(p.brand) && /\bHFT\b/.test(p.model || '')) return false;
            return true;
          },
        },
      ],
    },
    {
      key: 'actemp', label: 'Cooling Mode',
      options: [
        { value: 'heatcool', label: 'Heat & Cool',          match: p => /heat.*cool|heat & cool/i.test(p.simplified_name || '') },
        { value: 'coolonly', label: 'Cool Only',            match: p => !/heat.*cool|heat & cool/i.test(p.simplified_name || '') },
        {
          value: 't3', label: 'T3 (High Ambient 52°C)',
          match: p => {
            if (/\bT3\b/i.test((p.simplified_name || '') + ' ' + (p.model || ''))) return true;
            // Haier HFT series = T3 inverter (product intelligence rule)
            if (/haier/i.test(p.brand) && /\bHFT\b/.test(p.model || '')) return true;
            return false;
          },
        },
      ],
    },
    {
      key: 'actype', label: 'Type',
      options: [
        { value: 'split', label: 'Split AC',        match: p => !/floor.?stand|floor.?mount|cassette/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) && !/^GF-/i.test(p.model || '') },
        { value: 'floor', label: 'Floor Standing',  match: p => /floor.?stand|floor.?mount|cassette/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) || /^GF-/i.test(p.model || '') },
      ],
    },
  ],

  // ── Refrigerators ────────────────────────────────────────────────────────────
  fridge: [
    {
      key: 'fridgesize', label: 'Size',
      options: [
        { value: 'small',  label: 'Compact (≤10 Cu.Ft)',  match: p => { const c = _cuft(p); return c > 0 ? c <= 10  : p.category.toLowerCase().includes('small'); } },
        { value: 'medium', label: 'Medium (11–16 Cu.Ft)', match: p => { const c = _cuft(p); return c > 0 ? c >= 11 && c <= 16 : p.category.toLowerCase().includes('medium'); } },
        { value: 'large',  label: 'Large (17+ Cu.Ft)',    match: p => { const c = _cuft(p); return c > 0 ? c >= 17  : p.category.toLowerCase().includes('large'); } },
      ],
    },
    {
      key: 'fridgetype', label: 'Type',
      options: [
        { value: 'glass',  label: 'Glass Door',     match: p => /glass.?door|glass.?top/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
        { value: 'double', label: 'Double Door',    match: p => /double.?door|two.?door|2-door/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
        { value: 'nofrost',label: 'No-Frost',       match: p => /no.?frost|frost.?free/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
      ],
    },
    {
      key: 'fridgetech', label: 'Technology',
      options: [
        { value: 'inverter',  label: 'Inverter Compressor', match: p => /inverter/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
        { value: 'twinInv',   label: 'Twin Inverter',       match: p => /twin.?inv/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
      ],
    },
  ],

  // ── Freezers ─────────────────────────────────────────────────────────────────
  // Catalog: 56 total — Inverter: 25 | Non-Inv: 31 | Double Door: 7 | Convertible: 6
  // Cu.Ft bands: ≤9: 7 | 10-11: 8 | 12-14: 10 | 15+: 20 (20 products incl 16-18 Cu.Ft)
  freezer: [
    {
      key: 'freezertype', label: 'Type',
      options: [
        { value: 'double',    label: 'Double Door',     match: p => /double.?door/i.test(p.simplified_name || '') },
        { value: 'single',    label: 'Single Door',     match: p => /single.?door/i.test(p.simplified_name || '') },
        { value: 'convertible',label: 'Convertible',   match: p => /convert/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
        { value: 'upright',   label: 'Upright / Vertical', match: p => /upright|vertical/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
      ],
    },
    {
      // Bands calibrated to actual catalog: ≤9cuft (7 products), 10-11 (8), 12-14 (10), 15+ (20)
      key: 'freezercap', label: 'Capacity',
      options: [
        { value: '8cuft',  label: '≈ 8 Cu.Ft (≤9)',    match: p => { const c = _cuft(p); return c > 0 ? c <= 9   : false } },
        { value: '10cuft', label: '10–11 Cu.Ft',        match: p => { const c = _cuft(p); return c >= 10 && c <= 11 } },
        { value: '13cuft', label: '12–14 Cu.Ft',        match: p => { const c = _cuft(p); return c >= 12 && c <= 14 } },
        { value: '15cuft', label: '15+ Cu.Ft (Large)',  match: p => { const c = _cuft(p); return c >= 15 } },
      ],
    },
    {
      key: 'freezertech', label: 'Technology',
      options: [
        { value: 'inverter',    label: 'Inverter',      match: p => /inverter/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
        { value: 'non-inverter',label: 'Non-Inverter',  match: p => !/inverter/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
      ],
    },
  ],

  // ── Washing Machines ─────────────────────────────────────────────────────────
  // Catalog: 58 WMs + 10 Spinners — Front Load: 3 | Top Load: 33 | Semi-Auto: 18
  // Twin Tub: 2 | Inverter: 3 | Spinners: 10
  // Kg bands: ≤7: 11 | 8-9: 22 | 10-11: 13 | 12-14: 14 | 15+: 8
  washing: [
    {
      key: 'washtype', label: 'Type',
      options: [
        { value: 'front',    label: 'Front Load Auto',  match: p => /front.?load/i.test((p.simplified_name || '') + ' ' + (p.category || '')) },
        { value: 'top',      label: 'Top Load Auto',    match: p => /top.?load/i.test((p.simplified_name || '') + ' ' + (p.category || '')) && !/semi/i.test(p.category) },
        { value: 'semi',     label: 'Semi-Automatic',   match: p => /semi.?auto/i.test((p.category || '') + ' ' + (p.simplified_name || '')) && !/twin.?tub/i.test(p.simplified_name || '') },
        { value: 'twintub',  label: 'Twin Tub',         match: p => /twin.?tub/i.test(p.simplified_name || '') },
        { value: 'spinner',  label: 'Spinner',          match: p => /spinner|spin.?dry/i.test((p.category || '') + ' ' + (p.simplified_name || '')) },
      ],
    },
    {
      key: 'washcap', label: 'Capacity',
      options: [
        { value: 'small',  label: 'Up to 7 kg',      match: p => { const k = _kg(p); return k > 0 ? k <= 7   : false } },
        { value: 'medium', label: '8–9 kg',          match: p => { const k = _kg(p); return k >= 8  && k <= 9  } },
        { value: 'large',  label: '10–11 kg',        match: p => { const k = _kg(p); return k >= 10 && k <= 11 } },
        { value: 'xl',     label: '12–14 kg',        match: p => { const k = _kg(p); return k >= 12 && k <= 14 } },
        { value: 'xxl',    label: '15 kg+ (Blanket)',match: p => { const k = _kg(p); return k >= 15 || (p.tags || '').includes('blanket') } },
      ],
    },
    {
      key: 'washinverter', label: 'Technology',
      options: [
        { value: 'inverter', label: 'Inverter Motor',   match: p => /inverter/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
        { value: 'direct',   label: 'Direct Drive',     match: p => /direct.?drive/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
      ],
    },
  ],

  // ── Televisions ──────────────────────────────────────────────────────────────
  // Catalog: 84 total — 32": 6 | 43": 12 | 50-55": 21 | 65": 19 | 75-79": 15 | 80"+: 11
  // QLED: 7 | 4K: 14 | Google TV: 9 | OLED: 0 (none in catalog)
  tv: [
    {
      key: 'tvsize', label: 'Screen Size',
      options: [
        { value: '32',  label: '32"',         match: p => { const i = _inches(p); return i > 0 ? i <= 32 : /\b32\b/.test(p.simplified_name || '') } },
        { value: '43',  label: '43"',         match: p => { const i = _inches(p); return i >= 40 && i <= 43 } },
        { value: '50',  label: '50"–55"',     match: p => { const i = _inches(p); return i >= 50 && i <= 55 } },
        { value: '65',  label: '65"',         match: p => { const i = _inches(p); return i >= 60 && i <= 65 } },
        { value: '75',  label: '75"',         match: p => { const i = _inches(p); return i >= 70 && i <= 79 } },
        { value: '85',  label: '85"+ (Ultra)',match: p => { const i = _inches(p); return i >= 80 } },
      ],
    },
    {
      key: 'tvtech', label: 'Display Type',
      options: [
        { value: 'qled',    label: 'QLED',          match: p => /qled/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
        { value: '4k',      label: '4K / Ultra HD',  match: p => /\b4k\b|ultra.?hd|\buhd\b/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
        { value: 'googletv',label: 'Google TV',      match: p => /google.?tv/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
        { value: 'led',     label: 'LED / Smart LED',match: p => !/qled/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
      ],
    },
  ],

  // ── Kitchen Appliances ───────────────────────────────────────────────────────
  // Catalog: 231 total across Kitchen* categories + Air Fryer
  // Hand Blenders: 18 | Jug Blenders: 25 | Mixers: 11 | Juicers: 25
  // Choppers: 8 | Food Processors: 26 | Meat Grinders: 25 | Air Fryers: 20
  // Toasters: 23 | Kettles: 16 | Coffee: 8 | Ovens: 21 | Roti: 11 | Sandwich/Waffle: 8
  kitchen: [
    {
      key: 'kitchensubtype', label: 'Product Type',
      options: [
        { value: 'air-fryer',     label: 'Air Fryers',           match: p => /air.?fr/i.test((p.simplified_name || '') + ' ' + (p.category || '')) },
        { value: 'hand-blender',  label: 'Hand Blenders',        match: p => /hand.?blend|stick.?blend|immersion.?blend/i.test(p.simplified_name || '') },
        { value: 'jug-blender',   label: 'Jug / Stand Blenders', match: p => /\bblender\b/i.test(p.simplified_name || '') && !/hand.?blend|stick.?blend/i.test(p.simplified_name || '') },
        { value: 'mixer',         label: 'Mixers',               match: p => /\bmixer\b/i.test(p.simplified_name || '') },
        { value: 'juicer',        label: 'Juicers',              match: p => /juicer/i.test(p.simplified_name || '') },
        { value: 'chopper',       label: 'Choppers',             match: p => /chopper/i.test(p.simplified_name || '') },
        { value: 'food-processor',label: 'Food Processors',      match: p => /food.?proc|kitchen.?chef|kitchen.?robot|food.?fact/i.test(p.simplified_name || '') },
        { value: 'meat-grinder',  label: 'Meat Grinders',        match: p => /grinder|mincer|meat.?min/i.test(p.simplified_name || '') },
        { value: 'toaster',       label: 'Toasters',             match: p => /toaster/i.test(p.simplified_name || '') },
        { value: 'sandwich',      label: 'Sandwich / Waffle',    match: p => /sandwich|waffle/i.test(p.simplified_name || '') },
        { value: 'kettle',        label: 'Electric Kettles',     match: p => /kettle/i.test(p.simplified_name || '') },
        { value: 'coffee',        label: 'Coffee Makers',        match: p => /coffee/i.test(p.simplified_name || '') },
        { value: 'oven',          label: 'Electric Ovens',       match: p => /\boven\b/i.test(p.simplified_name || '') && !/micro|air.?fr/i.test(p.simplified_name || '') },
        { value: 'roti',          label: 'Roti Makers',          match: p => /roti/i.test(p.simplified_name || '') },
        { value: 'induction',     label: 'Induction / Ceramic',  match: p => /induction|ceramic.?cook/i.test(p.simplified_name || '') },
        { value: 'rice-cooker',   label: 'Rice Cookers',         match: p => /rice.?cook/i.test(p.simplified_name || '') },
        { value: 'water-boiler',  label: 'Water Boilers',        match: p => /water.?boil/i.test(p.simplified_name || '') },
        { value: 'egg-boiler',    label: 'Egg Boilers',          match: p => /egg.?boil/i.test(p.simplified_name || '') },
      ],
    },
  ],

  // ── Microwave Ovens ──────────────────────────────────────────────────────────
  microwave: [
    {
      key: 'mwtype', label: 'Type',
      options: [
        { value: 'solo',        label: 'Solo (Reheat Only)',     match: p => /solo/i.test((p.simplified_name || '') + ' ' + (p.category || '')) },
        { value: 'grill',       label: 'Grill',                 match: p => /grill/i.test((p.simplified_name || '') + ' ' + (p.category || '')) && !/convection/i.test(p.simplified_name || '') },
        { value: 'convection',  label: 'Convection / Air Fryer',match: p => /convection|air.?fr/i.test((p.simplified_name || '') + ' ' + (p.category || '')) },
        { value: 'inverter-mw', label: 'Inverter Microwave',    match: p => /inverter/i.test((p.simplified_name || '') + ' ' + (p.tags || '')) },
      ],
    },
    {
      key: 'mwcap', label: 'Cavity Size',
      options: [
        { value: 'small',  label: 'Compact (≤20L)',   match: p => { const l = _liters(p); return l > 0 ? l <= 20 : false } },
        { value: 'medium', label: 'Standard (21–30L)',match: p => { const l = _liters(p); return l >= 21 && l <= 30 } },
        { value: 'large',  label: 'Large (31L+)',      match: p => { const l = _liters(p); return l >= 31 } },
      ],
    },
  ],

  // ── Small Appliances ─────────────────────────────────────────────────────────
  // Catalog: ~50 in "Home & Heating Appliances" + 8 in "Small Appliances"
  // Fans: 7 | Dry Irons: 8 | Steam Irons: 6 | Garment Steamers: 5
  // Heaters: 11 | Vacuums: 10 | Humidifiers: 6 | Insect Killers: 6
  small: [
    {
      key: 'smalltype', label: 'Type',
      options: [
        { value: 'fan',           label: 'Fans',                 match: p => /\bfan\b/i.test(p.simplified_name || '') },
        { value: 'dry-iron',      label: 'Dry Irons',            match: p => /dry.?iron/i.test(p.simplified_name || '') },
        { value: 'steam-iron',    label: 'Steam Irons',          match: p => /steam.?iron/i.test(p.simplified_name || '') },
        { value: 'garment-steam', label: 'Garment Steamers',     match: p => /garment.?steam/i.test(p.simplified_name || '') },
        { value: 'heater',        label: 'Room Heaters',         match: p => /heater/i.test(p.simplified_name || '') },
        { value: 'vacuum',        label: 'Vacuum Cleaners',      match: p => /vacuum/i.test(p.simplified_name || '') },
        { value: 'humidifier',    label: 'Humidifiers',          match: p => /humidif/i.test(p.simplified_name || '') },
        { value: 'insect-killer', label: 'Insect Killers',       match: p => /insect.?kill|insect.?zap/i.test(p.simplified_name || '') },
      ],
    },
  ],

  // ── Personal Care ─────────────────────────────────────────────────────────────
  // Catalog: 28 in "Personal Care Appliances" + 10 in "care"
  // Hair Dryers: 12 | Straighteners: 8 | Trimmers/Clippers: 6 | Other: misc
  care: [
    {
      key: 'caretype', label: 'Type',
      options: [
        { value: 'hair-dryer',    label: 'Hair Dryers',          match: p => /hair.?dry/i.test(p.simplified_name || '') },
        { value: 'straightener',  label: 'Hair Straighteners',   match: p => /straight/i.test(p.simplified_name || '') },
        { value: 'curler',        label: 'Curlers / Crimpers',   match: p => /curl|crimp/i.test(p.simplified_name || '') },
        { value: 'trimmer',       label: 'Trimmers / Clippers',  match: p => /trimmer|clipper/i.test(p.simplified_name || '') },
        { value: 'scale',         label: 'Body / Bath Scales',   match: p => /scale|weigh/i.test(p.simplified_name || '') },
        { value: 'massager',      label: 'Massagers',            match: p => /massag/i.test(p.simplified_name || '') },
      ],
    },
  ],

  // ── Solar Solutions ──────────────────────────────────────────────────────────
  // Catalog: Inverters: 57 | Batteries: 12 | Panels: 0 | Pump Inv: 3 | Misc: 13
  // kW bands (inverters): ≤3kW: 2 | 3-5kW: 12 | 5-8kW: 15 | 8-12kW: 9 | unknown: 19
  // Battery voltages: 12.8V (1) | 25.6V / 24V (2) | 48V / 51.2V (5) | Lithium: 6
  solar: [
    {
      key: 'solarcat', label: 'Product Type',
      options: [
        { value: 'inverter', label: 'Inverters',         match: p => /solar.?inverter|hybrid.?inverter/i.test(p.category || '') },
        { value: 'battery',  label: 'Solar Batteries',   match: p => /solar.?battery|lithium.?battery/i.test(p.category || '') || /kWh|LiFePO/i.test(p.simplified_name || '') },
        { value: 'pump',     label: 'Pump Inverters',    match: p => /solar.?pump|solar.?converter|pump.?inv/i.test((p.category || '') + ' ' + (p.simplified_name || '')) },
        { value: 'hybrid',   label: 'Hybrid Systems',   match: p => /hybrid/i.test((p.category || '') + ' ' + (p.simplified_name || '') + ' ' + (p.tags || '')) },
      ],
    },
    {
      // kW filter — works on simplified_name values like "Ziewnic 6kW Lenox Solar Inverter"
      key: 'solarkw', label: 'Inverter Size',
      options: [
        { value: '5kw',  label: 'Up to 5 kW',    match: p => { const k = _kw(p); return k > 0 && k <= 5 } },
        { value: '8kw',  label: '5–8 kW',        match: p => { const k = _kw(p); return k > 5  && k <= 8  } },
        { value: '12kw', label: '8–12 kW',       match: p => { const k = _kw(p); return k > 8  && k <= 12 } },
        { value: '12kw+',label: 'Above 12 kW',   match: p => { const k = _kw(p); return k > 12 } },
      ],
    },
    {
      // Voltage filter — relevant for batteries and compatible inverters
      // 24V (25.6V): for ≤3kW systems | 48V (51.2V): for ≥5kW systems
      key: 'batvolt', label: 'Battery Voltage',
      options: [
        { value: '12v', label: '12V Systems (12.8V)', match: p => /12\.8\s*V|12\s*V\b/i.test(p.simplified_name || '') },
        { value: '24v', label: '24V Systems (25.6V)', match: p => /25\.6\s*V|24\s*V\b/i.test(p.simplified_name || '') },
        { value: '48v', label: '48V Systems (51.2V)', match: p => /51\.2\s*V|48\s*V\b/i.test((p.simplified_name || '') + ' ' + (p.model || '')) },
      ],
    },
  ],

  // ── Water Dispensers ─────────────────────────────────────────────────────────
  // Catalog: 7 total — simplified_names are generic "Dawlance Cold Water Dispenser"
  // Type must be inferred from model# (WD-1035 BOTTOM LOAD) or tags
  water: [
    {
      key: 'watertype', label: 'Type',
      options: [
        { value: 'bottom', label: 'Bottom Load',       match: p => /bottom.?load/i.test((p.model || '') + ' ' + (p.tags || '')) },
        { value: 'hot',    label: 'Hot & Cold',        match: p => /hot.*cold|cold.*hot|HC\b/i.test((p.model || '') + ' ' + (p.simplified_name || '') + ' ' + (p.tags || '')) },
        { value: 'cold',   label: 'Cold Water Only',   match: p => !/hot.*cold|cold.*hot|bottom.?load/i.test((p.model || '') + ' ' + (p.simplified_name || '') + ' ' + (p.tags || '')) },
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
  // Home & Heating Appliances, vacuum, insect killers all share the 'small' filter set
  if (catId === 'home-heating' || catId === 'home-and-heating' || catId === 'Home & Heating Appliances') return 'small'
  if (catId === 'vacuum' || catId === 'vacuum-cleaners') return 'small'
  // Personal Care: hair dryers, straighteners, trimmers etc.
  if (catId === 'care' || catId === 'personal-care' || catId === 'personal-care-appliances') return 'care'
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
  const fetchSeq = useRef(0)
  const [view, setView]         = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [specFilters, setSpecFilters] = useState<Record<string, string>>({})
  const [budgetIdx, setBudgetIdx] = useState<number | null>(null)
  const [inStockOnly, setInStockOnly]       = useState(false)
  const [solarReadyOnly, setSolarReadyOnly] = useState(false)
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
  const subSlug       = sp.get('sub') || ''
  const catDeepSubs   = DEEP_SUBCATEGORIES[specKey] || []
  const activeDeepSub = catDeepSubs.find(s => s.slug === subSlug) ?? null

  // Helper: is a PRIMARY_BROWSE_CATS tab active for the current URL?
  const isPrimaryTabActive = (catId: string) => {
    if (catId === 'solar') {
      return category === 'solar' || (activeCat?.id ?? '').startsWith('solar-')
    }
    if (catId === 'refrigerators') {
      return activeCat?.id === 'fridge' || (activeCat?.id ?? '').startsWith('fridge-')
    }
    return activeCat?.slug === catId || category === catId
  }

  const fetchProducts = useCallback(() => {
    setLoading(true)
    setFetchError(false)
    const seq = ++fetchSeq.current
    const params: Record<string, string> = {}
    if (category) params.category = category
    if (brand)  params.brand  = brand
    if (search) params.search = search
    if (sort)   params.sort   = sort
    getProducts(params).then(d => {
      if (seq !== fetchSeq.current) return // stale response — a newer fetch is in flight
      setProducts(d.products)
      setTotal(d.total)
      setLoading(false)
    }).catch(() => {
      if (seq !== fetchSeq.current) return
      setFetchError(true)
      setLoading(false)
    })
  }, [category, brand, search, sort])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // Reset client-side filters when category changes
  useEffect(() => { setSpecFilters({}); setBudgetIdx(null); setInStockOnly(false); setSolarReadyOnly(false) }, [category])

  // Apply deep subcategory preset when ?sub= param changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!subSlug) return
    const match = catDeepSubs.find(s => s.slug === subSlug)
    if (match) setSpecFilters(match.filters)
  }, [subSlug])

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
    if (solarReadyOnly) {
      list = list.filter(p => {
        const src = (p.simplified_name || '') + ' ' + (p.tags || '') + ' ' + (p.category || '')
        return /inverter/i.test(src) || /solar/i.test(p.category || '')
      })
    }
    for (const [key, val] of Object.entries(specFilters)) {
      if (!val) continue
      const filterGroup = catSpecFilters.find(f => f.key === key)
      const option = filterGroup?.options.find(o => o.value === val)
      if (option) list = list.filter(option.match)
    }
    return list
  }, [products, budgetIdx, inStockOnly, solarReadyOnly, specFilters, catSpecFilters, sort, category, search])

  function goToCategory(catId: string) {
    setSpecFilters({}); setBudgetIdx(null); setInStockOnly(false)
    if (!catId) {
      if (categorySlug) navigate('/products')
      else setSp({})
      return
    }
    const cat = DEFAULT_CATEGORIES.find(c => c.id === catId || c.slug === catId)
    if (cat) { navigate(`/products/category/${cat.slug}`); return }
    const next = new URLSearchParams(sp)
    next.set('category', catId)
    setSp(next)
  }

  function goToSubcat(slug: string) {
    const match = slug ? catDeepSubs.find(s => s.slug === slug) : null
    setSpecFilters(match ? match.filters : {})
    setBudgetIdx(null)
    const next = new URLSearchParams(sp)
    if (slug) next.set('sub', slug); else next.delete('sub')
    setSp(next)
  }

  function setFilter(key: string, val: string) {
    if (key === 'category') { goToCategory(val); return }
    const next = new URLSearchParams(sp)
    if (val) next.set(key, val); else next.delete(key)
    setSp(next)
  }

  function clearAll() {
    setSpecFilters({}); setBudgetIdx(null); setInStockOnly(false); setSolarReadyOnly(false)
    if (categorySlug) { navigate('/products'); return }
    setSp({})
  }

  function toggleSection(key: string) {
    setExpandedSections(s => ({ ...s, [key]: !s[key] }))
  }

  const hasFilters = !!(category || brand || search || budgetIdx !== null || inStockOnly || solarReadyOnly || Object.values(specFilters).some(Boolean))
  const activeFilterCount = [
    brand, budgetIdx !== null ? 'b' : '', inStockOnly ? 's' : '', solarReadyOnly ? 'r' : '',
    ...Object.values(specFilters).filter(Boolean)
  ].filter(Boolean).length

  const seoTitle = activeCat
    ? `${activeCat.name} — Buy in Karachi on Installments`
    : search
    ? `Search: "${search}" — Tajalli's`
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
      <div className="bg-white border-b sticky top-14 sm:top-16 lg:top-[104px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">

          {/* Result count */}
          <div className="text-xs sm:text-sm text-gray-500 min-w-0 shrink-0">
            <span className="text-gray-900 font-semibold">{loading ? '…' : filteredProducts.length}</span>
            {!loading && filteredProducts.length !== total && (
              <span className="text-gray-400"> of {total}</span>
            )}
            <span className="ml-0.5 hidden sm:inline"> products</span>
            {activeCat && (
              <span className="ml-1 hidden sm:inline">
                in <span className="text-brand-600 font-medium">{activeCat.icon} {activeCat.name}</span>
              </span>
            )}
            {search && (
              <span className="ml-1 truncate max-w-[100px] hidden sm:inline">for "<span className="text-brand-600 font-medium">{search}</span>"</span>
            )}
          </div>

          {/* Scrollable category tabs — shared mobile + desktop */}
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
            <div className="flex gap-1.5 w-max">
              <button onClick={() => goToCategory('')}
                className={`px-4 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all min-h-[36px]
                  ${!category ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-brand-50 active:bg-brand-50'}`}>
                All
              </button>
              {PRIMARY_BROWSE_CATS.map(cat => {
                const isActive = isPrimaryTabActive(cat.id)
                return (
                  <button key={cat.id}
                    onClick={() => goToCategory(cat.id)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all min-h-[36px]
                      ${isActive ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-brand-50 active:bg-brand-50'}`}>
                    {cat.icon} {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            {/* Sort */}
            <select value={sort} onChange={e => setFilter('sort', e.target.value)}
              className="text-xs border border-gray-200 rounded-xl px-2 sm:px-3 py-1.5 bg-white focus:outline-none focus:border-brand-400 cursor-pointer min-h-[36px]">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Filter toggle */}
            <button onClick={() => setShowFilters(f => !f)}
              className={`relative flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all min-h-[36px]
                ${showFilters ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600 hover:border-brand-200'}`}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center
                  ${showFilters ? 'bg-white text-brand-500' : 'bg-brand-500 text-white'}`}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View toggle — hidden on mobile (always grid) */}
            <div className="hidden sm:flex border border-gray-200 rounded-xl overflow-hidden min-h-[36px]">
              <button onClick={() => setView('grid')}
                className={`px-2 transition-colors flex items-center ${view === 'grid' ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setView('list')}
                className={`px-2 transition-colors flex items-center ${view === 'list' ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Deep subcategory strip — shown when a specific category is active and has subcategories ── */}
        {catDeepSubs.length > 0 && category && (
          <div className="border-t bg-orange-50/40 px-3 sm:px-4 py-2 overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
            <div className="flex gap-1.5 w-max items-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">Type:</span>
              <button
                onClick={() => goToSubcat('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  !subSlug ? 'bg-brand-500 text-white' : 'text-brand-700 hover:bg-brand-100'
                }`}>
                All
              </button>
              {catDeepSubs.map(sub => (
                <button key={sub.slug}
                  onClick={() => goToSubcat(sub.slug)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
                    subSlug === sub.slug
                      ? 'bg-brand-500 text-white'
                      : 'text-brand-700 hover:bg-brand-100 bg-white/60 border border-brand-100'
                  }`}>
                  <span>{sub.icon}</span> {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Filter Panel ── */}
        {showFilters && (
          <>
            {/* Mobile backdrop — closes panel on tap outside */}
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black/40"
              onClick={() => setShowFilters(false)}
            />
          <div className={[
            /* Mobile: fixed bottom sheet */
            'fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col',
            'max-h-[85vh]',
            /* Desktop: revert to inline */
            'lg:static lg:rounded-none lg:shadow-none lg:z-auto lg:flex-none lg:max-h-none lg:block',
            'lg:border-t lg:bg-gray-50',
          ].join(' ')}>
            <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col flex-1 min-h-0 lg:block">
              {/* Close bar */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filters</span>
                <button onClick={() => setShowFilters(false)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-200 min-h-[44px]">
                  <X className="w-3.5 h-3.5" /> Close
                </button>
              </div>
              {/* Scrollable area on mobile */}
              <div className="flex-1 overflow-y-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0">

              {/* Mobile category picker */}
              <div className="lg:hidden mb-5 space-y-3">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</div>
                <div className="flex gap-2 flex-wrap">
                  <Pill active={!category} onClick={() => { goToCategory(''); setShowFilters(false) }}>All</Pill>
                  {PRIMARY_BROWSE_CATS.map(cat => (
                    <Pill key={cat.id} active={isPrimaryTabActive(cat.id)}
                      onClick={() => { goToCategory(cat.id); setShowFilters(false) }}>
                      {cat.icon} {cat.label}
                    </Pill>
                  ))}
                </div>
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

                {/* In Stock + Solar Ready */}
                <FilterSection label="Availability" expanded={expandedSections.stock} onToggle={() => toggleSection('stock')}>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" checked={inStockOnly}
                        onChange={() => setInStockOnly(v => !v)}
                        className="accent-brand-500 w-3.5 h-3.5 cursor-pointer rounded" />
                      <span className={`text-sm ${inStockOnly ? 'text-brand-600 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                        In Stock only
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" checked={solarReadyOnly}
                        onChange={() => setSolarReadyOnly(v => !v)}
                        className="accent-amber-500 w-3.5 h-3.5 cursor-pointer rounded" />
                      <span className={`text-sm ${solarReadyOnly ? 'text-amber-600 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                        ☀️ Solar / Inverter Ready
                      </span>
                    </label>
                  </div>
                </FilterSection>
              </div>

              {/* Active filter chips + clear */}
              {hasFilters && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  <span className="text-xs text-gray-400 font-medium">Active:</span>
                  {activeCat && <FilterChip label={`${activeCat.icon} ${activeCat.name}`} onRemove={() => goToCategory('')} />}
                  {activeDeepSub && <FilterChip label={`${activeDeepSub.icon} ${activeDeepSub.label}`} onRemove={() => goToSubcat('')} />}
                  {brand && <FilterChip label={`Brand: ${brand}`} onRemove={() => setFilter('brand', '')} />}
                  {budgetIdx !== null && <FilterChip label={`Budget: ${BUDGET_RANGES[budgetIdx].label}`} onRemove={() => setBudgetIdx(null)} />}
                  {inStockOnly && <FilterChip label="In Stock" onRemove={() => setInStockOnly(false)} />}
                  {solarReadyOnly && <FilterChip label="☀️ Solar / Inverter Ready" onRemove={() => setSolarReadyOnly(false)} />}
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
              {/* Desktop: centre close button */}
              <div className="hidden lg:flex justify-center mt-5">
                <button onClick={() => setShowFilters(false)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-400 px-5 py-2 rounded-xl transition-all">
                  <X className="w-4 h-4" /> Close Filters
                </button>
              </div>

              </div>{/* end scrollable area */}
            </div>{/* end max-w-7xl */}

            {/* Mobile: sticky show-results CTA */}
            <div className="lg:hidden shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
              <button onClick={() => setShowFilters(false)}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-2xl text-sm transition-colors">
                Show {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
              </button>
            </div>

          </div>{/* end panel */}
          </>
        )}
      </div>

      {/* ── Product Grid ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {loading ? (
          <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5' : 'space-y-3'}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`bg-gray-100 rounded-2xl animate-pulse ${view === 'grid' ? 'h-60 sm:h-72' : 'h-24 sm:h-28'}`} />
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
              ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5'
              : 'space-y-3 sm:space-y-4'}>
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
      className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all min-h-[44px]
        ${active ? 'bg-brand-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-700 hover:border-brand-200 hover:text-brand-600 active:bg-gray-50'}`}>
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

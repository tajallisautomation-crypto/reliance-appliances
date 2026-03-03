import { SHEETS_URL } from './config';
import type { Product, Category } from './types';

// ── Offline fallback products (used if Sheets URL not configured) ──────────
export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'haier-hsu18hnf',
    brand: 'Haier', model: 'HSU-18HNF DC Inverter',
    category: 'Air Conditioners', slug: 'haier-hsu-18hnf-dc-inverter',
    description: 'Haier HSU-18HNF 1.5 Ton DC Inverter Air Conditioner with triple inverter technology, self-cleaning function, and Wi-Fi control. Ideal for rooms up to 200 sq ft.',
    specs: { Capacity:'1.5 Ton', Technology:'DC Inverter', 'Energy Rating':'5 Star', Refrigerant:'R410A', 'Air Flow':'720 m³/h', 'Noise Level':'20 dB', 'Wi-Fi':'Yes', Color:'White' },
    tags: 'inverter ac,energy saving,wifi ac,1.5 ton,cooling',
    colors: 'White',
    price: { min:120000, retail:132000, cash_floor:126000 },
    installments: {
      '2m': { months:2,  total:145200, advance:72600,  monthly:72600 },
      '3m': { months:3,  total:151800, advance:75900,  monthly:37950 },
      '6m': { months:6,  total:165000, advance:66000,  monthly:19800 },
      '12m':{ months:12, total:184800, advance:55440,  monthly:11760 },
    },
    warranty: '1 Year Parts & Labour, 5 Years Compressor',
    stock_status: 'In Stock', featured: true,
    thumbnail: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80',
    gallery:   ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80'],
    seo: { title:'Haier HSU-18HNF DC Inverter AC 1.5 Ton — Karachi', description:'Buy Haier HSU-18HNF 1.5 Ton DC Inverter AC in Karachi on easy installments. Free delivery, 5-year compressor warranty.', keywords:'Haier inverter AC Karachi, HSU-18HNF price, 1.5 ton AC installment' },
  },
  {
    id: 'gree-gs18pith',
    brand: 'Gree', model: 'GS-18PITH Fairy Inverter',
    category: 'Air Conditioners', slug: 'gree-gs-18pith-fairy-inverter',
    description: 'Gree Fairy Series 1.5 Ton DC Inverter AC with I-Feel technology, Golden Fin anti-corrosion coating, and Auto Restart function.',
    specs: { Capacity:'1.5 Ton', Technology:'DC Inverter', 'Energy Rating':'5 Star', Refrigerant:'R32', 'Auto Clean':'Yes', 'I-Feel':'Yes', Color:'White' },
    tags: 'gree ac,fairy series,inverter,1.5 ton,i-feel',
    colors: 'White, Golden',
    price: { min:127000, retail:139700, cash_floor:133350 },
    installments: {
      '2m': { months:2,  total:153670, advance:76835,  monthly:76835 },
      '3m': { months:3,  total:160655, advance:80327,  monthly:40163 },
      '6m': { months:6,  total:174625, advance:69850,  monthly:20955 },
      '12m':{ months:12, total:195580, advance:58674,  monthly:12446 },
    },
    warranty: '1 Year Parts & Labour, 5 Years Compressor',
    stock_status: 'In Stock', featured: true,
    thumbnail: 'https://images.unsplash.com/photo-1619048696989-74e1d7b25f7f?w=600&q=80',
    gallery:   ['https://images.unsplash.com/photo-1619048696989-74e1d7b25f7f?w=800&q=80'],
    seo: { title:'Gree Fairy GS-18PITH Inverter AC — Karachi', description:'Buy Gree Fairy 1.5 Ton DC Inverter AC in Karachi. I-Feel technology, R32 refrigerant. Easy installments available.', keywords:'Gree Fairy AC Karachi, GS-18PITH price, Gree inverter AC installment' },
  },
  {
    id: 'dawlance-9150',
    brand: 'Dawlance', model: '9150 Chrome Pro Refrigerator',
    category: 'Refrigerators', slug: 'dawlance-9150-chrome-pro-refrigerator',
    description: 'Dawlance 9150 Chrome Pro 14 CFT double door refrigerator with No-Frost technology, glass shelves, and full inverter compressor for 40% energy savings.',
    specs: { Capacity:'14 CFT / 397L', Type:'Double Door', Technology:'Full Inverter', 'No Frost':'Yes', 'Energy Saving':'40%', Refrigerant:'R600a', Color:'Chrome', 'Water Dispenser':'No' },
    tags: 'dawlance fridge,no frost,inverter refrigerator,double door,14 cft',
    colors: 'Chrome Silver, Black Steel',
    price: { min:98000, retail:107800, cash_floor:102900 },
    installments: {
      '2m': { months:2,  total:118580, advance:59290,  monthly:59290 },
      '3m': { months:3,  total:123970, advance:61985,  monthly:30992 },
      '6m': { months:6,  total:134750, advance:53900,  monthly:16170 },
      '12m':{ months:12, total:150920, advance:45276,  monthly:9595  },
    },
    warranty: '1 Year Parts & Labour, 10 Years Compressor',
    stock_status: 'In Stock', featured: true,
    thumbnail: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80',
    gallery:   ['https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&q=80'],
    seo: { title:'Dawlance 9150 Chrome Pro Refrigerator — Karachi', description:'Buy Dawlance Chrome Pro No-Frost refrigerator in Karachi. 10-year compressor warranty. Installments from PKR 9,595/month.', keywords:'Dawlance 9150 Chrome Pro price, no frost fridge Karachi, double door refrigerator installment' },
  },
  {
    id: 'haier-hwm70',
    brand: 'Haier', model: 'HWM 70-826S Washing Machine',
    category: 'Washing Machines', slug: 'haier-hwm-70-826s-washing-machine',
    description: 'Haier 7kg Semi-Automatic Washing Machine with powerful pulsator wash, 3 wash programs, and energy-efficient motor. Perfect for medium-sized families.',
    specs: { Capacity:'7 Kg', Type:'Semi-Automatic', Programs:'3 Wash + 3 Spin', Motor:'Copper Wire', 'Water Level':'5 Levels', Color:'White/Grey' },
    tags: 'haier washing machine,semi automatic,7kg,front load',
    colors: 'White, Grey',
    price: { min:35000, retail:38500, cash_floor:36750 },
    installments: {
      '2m': { months:2,  total:42350, advance:21175,  monthly:21175 },
      '3m': { months:3,  total:44275, advance:22137,  monthly:11069 },
      '6m': { months:6,  total:48125, advance:19250,  monthly:5775  },
      '12m':{ months:12, total:53900, advance:16170,  monthly:3424  },
    },
    warranty: '2 Years Parts & Labour',
    stock_status: 'In Stock', featured: false,
    thumbnail: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80',
    gallery:   ['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&q=80'],
    seo: { title:'Haier HWM 70-826S 7kg Washing Machine — Karachi', description:'Buy Haier 7kg Semi-Auto Washing Machine in Karachi. Copper motor, 2-year warranty. Easy installments available.', keywords:'Haier washing machine Karachi, 7kg semi automatic price, washing machine installment' },
  },
  {
    id: 'samsung-55-4k',
    brand: 'Samsung', model: '55" Crystal 4K UHD TV',
    category: 'Televisions', slug: 'samsung-55-crystal-4k-uhd-tv',
    description: 'Samsung 55-inch Crystal 4K UHD Smart TV with Crystal Processor 4K, AirSlim design, and multiple voice assistant support including Bixby and Alexa.',
    specs: { Size:'55 Inch', Resolution:'4K UHD (3840×2160)', Processor:'Crystal 4K', 'Smart TV':'Yes', OS:'Tizen', HDR:'HDR10+', Ports:'3x HDMI, 2x USB', Color:'Black' },
    tags: 'samsung tv,55 inch,4k smart tv,crystal uhd,hdr',
    colors: 'Black',
    price: { min:120000, retail:132000, cash_floor:126000 },
    installments: {
      '2m': { months:2,  total:145200, advance:72600,  monthly:72600 },
      '3m': { months:3,  total:151800, advance:75900,  monthly:37950 },
      '6m': { months:6,  total:165000, advance:66000,  monthly:19800 },
      '12m':{ months:12, total:184800, advance:55440,  monthly:11760 },
    },
    warranty: '1 Year Parts & Labour, 1 Year Panel',
    stock_status: 'In Stock', featured: true,
    thumbnail: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600&q=80',
    gallery:   ['https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=800&q=80'],
    seo: { title:'Samsung 55" Crystal 4K UHD Smart TV — Karachi', description:'Buy Samsung 55" 4K Smart TV in Karachi. Crystal Processor, Tizen OS, HDR10+. Easy installments available.', keywords:'Samsung 55 inch 4K TV Karachi, Crystal UHD price, smart TV installment Pakistan' },
  },
  {
    id: 'jinko-400w-solar',
    brand: 'Jinko', model: 'JKM400M-54HL Solar Panel',
    category: 'Solar Solutions', slug: 'jinko-400w-mono-solar-panel',
    description: 'Jinko 400W Mono PERC solar panel with 21.3% efficiency, 25-year linear power output warranty, and strong mechanical load resistance up to 5400 Pa.',
    specs: { Power:'400W', Type:'Mono PERC', Efficiency:'21.3%', 'Voc':'49.6V', 'Isc':'10.27A', Dimensions:'1722×1134×35mm', Weight:'21.3 Kg', 'Wind Load':'2400 Pa', 'Snow Load':'5400 Pa' },
    tags: 'solar panel,400w,jinko,mono perc,net metering',
    colors: 'Black Frame / White Backsheet',
    price: { min:29500, retail:32450, cash_floor:30975 },
    installments: {
      '2m': { months:2,  total:35695, advance:17847,  monthly:17847 },
      '3m': { months:3,  total:37317, advance:18658,  monthly:9329  },
      '6m': { months:6,  total:40562, advance:16225,  monthly:4867  },
      '12m':{ months:12, total:45430, advance:13629,  monthly:2888  },
    },
    warranty: '12 Years Product, 25 Years Linear Power Output',
    stock_status: 'In Stock', featured: true,
    thumbnail: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80',
    gallery:   ['https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80'],
    seo: { title:'Jinko 400W Solar Panel Pakistan — Karachi', description:'Buy Jinko JKM400M 400W Mono PERC solar panel in Karachi. 25-year warranty. Net metering eligible. Easy installments.', keywords:'Jinko 400W solar panel price Pakistan, mono perc solar Karachi, solar installment' },
  },
];

export const CATEGORIES: Category[] = [
  { name:'Air Conditioners',  slug:'air-conditioners',  icon:'❄️' },
  { name:'Refrigerators',     slug:'refrigerators',     icon:'🧊' },
  { name:'Washing Machines',  slug:'washing-machines',  icon:'🫧' },
  { name:'Televisions',       slug:'televisions',       icon:'📺' },
  { name:'Solar Solutions',   slug:'solar-solutions',   icon:'☀️' },
  { name:'Kitchen Appliances',slug:'kitchen-appliances',icon:'🍳' },
  { name:'Water Heaters',     slug:'water-heaters',     icon:'🚿' },
  { name:'Vacuum Cleaners',   slug:'vacuum-cleaners',   icon:'🌀' },
];

// ── API layer ──────────────────────────────────────────────
let _productsCache: Product[] | null = null;
let _cacheTime = 0;
const CACHE_MS = 5 * 60 * 1000; // 5 min

export async function fetchProducts(): Promise<Product[]> {
  if (_productsCache && Date.now() - _cacheTime < CACHE_MS) return _productsCache;

  if (!SHEETS_URL) return FALLBACK_PRODUCTS;

  try {
    const res  = await fetch(`${SHEETS_URL}?action=getProducts`);
    const json = await res.json();
    if (json.status === 'ok' && Array.isArray(json.data) && json.data.length) {
      _productsCache = json.data;
      _cacheTime     = Date.now();
      return json.data;
    }
  } catch {
    // Sheets unreachable — use fallback silently
  }
  return FALLBACK_PRODUCTS;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const all = await fetchProducts();
  return all.find(p => p.slug === slug) ?? null;
}

export function formatPrice(n: number): string {
  return Math.round(n).toLocaleString('en-PK');
}

export function slugifyCategory(cat: string): string {
  return cat.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

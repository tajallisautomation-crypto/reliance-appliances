/**
 * enrich_from_products_txt.mjs
 * Enriches / inserts products extracted from Material/products.txt
 *
 * Sources (OCR-extracted from image PDFs by user):
 *   - WASHING-MACHINE.pdf    → Dawlance washing machines
 *   - Smart Ref Leaflet.pdf  → Kenwood Smart Series refrigerators
 *   - Tech Series Leaflet.pdf → Homage Tech Series refrigerators
 *
 * Behaviour:
 *   - Dawlance WMs: enrich existing DB rows; insert missing ones
 *   - Kenwood & Homage: insert new (with retail_price=0, set prices via admin)
 *
 * Run:  node enrich_from_products_txt.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN           = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// DAWLANCE WASHING MACHINES — from WASHING-MACHINE.pdf
// Capacity in kg; Dimensions H × W × D cm
// ─────────────────────────────────────────────────────────────────────────────

const DAWLANCE_WMS = [

  // FRONT LOAD — INVERTER
  {
    model: 'DWF 8200 X INV', name: 'Dawlance 13kg Front-Load Fully Automatic Washing Machine DWF-8200',
    series: 'Front Load Inverter', type: 'Front Load', load_type: 'Fully Automatic',
    capacity_kg: 13, h: 84, w: 60, d: 59,
    inverter: true, spin_rpm: 1200,
    features: ['Front Load', 'Fully Automatic', 'Inverter Motor', 'High Energy Efficiency', 'Multiple Wash Programs', 'Child Lock', 'Delay Start', 'Stainless Steel Drum'],
    tokens: ['DWF 8200 X', 'DWF-8200 X', 'DWF8200X', 'AWM DWF 8200'],
  },
  {
    model: 'DWF 7200 X INV', name: 'Dawlance 10kg Front-Load Fully Automatic Washing Machine DWF-7200',
    series: 'Front Load Inverter', type: 'Front Load', load_type: 'Fully Automatic',
    capacity_kg: 10, h: 84, w: 60, d: 49,
    inverter: true, spin_rpm: 1200,
    features: ['Front Load', 'Fully Automatic', 'Inverter Motor', 'High Energy Efficiency', 'Multiple Wash Programs', 'Child Lock', 'Delay Start', 'Stainless Steel Drum'],
    tokens: ['DWF 7200 X', 'DWF-7200 X', 'DWF7200X', 'AWM DWF 7200'],
  },
  {
    model: 'DWF 8120 G INV', name: 'Dawlance 13kg Front-Load Fully Automatic Washing Machine DWF-8120',
    series: 'Front Load Inverter', type: 'Front Load', load_type: 'Fully Automatic',
    capacity_kg: 13, h: 84, w: 60, d: 59,
    inverter: true, spin_rpm: 1200,
    features: ['Front Load', 'Fully Automatic', 'Inverter Motor', 'Glass Door', 'High Energy Efficiency', 'Multiple Wash Programs', 'Child Lock', 'Delay Start'],
    tokens: ['DWF 8120 G', 'DWF-8120 G', 'DWF8120G', 'DWF-8120 Gr'],
  },
  {
    model: 'DWF 7120 W INV', name: 'Dawlance 10kg Front-Load Fully Automatic Washing Machine DWF-7120',
    series: 'Front Load Inverter', type: 'Front Load', load_type: 'Fully Automatic',
    capacity_kg: 10, h: 84, w: 60, d: 55,
    inverter: true, spin_rpm: 1200,
    features: ['Front Load', 'Fully Automatic', 'Inverter Motor', 'High Energy Efficiency', 'Multiple Wash Programs', 'Child Lock', 'Delay Start'],
    tokens: ['DWF 7120 W', 'DWF-7120 W', 'DWF7120W', 'DWF-7120 Gr', 'DWF 7120'],
  },

  // TOP LOAD — PLATINUM SERIES
  {
    model: 'DWT 255 ES', name: 'Dawlance 10kg Top-Load Fully Automatic Washing Machine DWT-255',
    series: 'Top Load Energy Saver', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 10, h: 95, w: 54, d: 56,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Energy Saver', 'Multiple Wash Programs', 'Lint Filter', 'Auto Restart'],
    tokens: ['DWT 255 ES', 'DWT-255 ES', 'DWT255ES'],
  },
  {
    model: 'DWT 9060 EZ', name: 'Dawlance 10kg Top-Load Fully Automatic Washing Machine DWT-9060',
    series: 'Top Load', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 10, h: 95, w: 54, d: 56,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Easy Operation', 'Multiple Wash Programs', 'Lint Filter'],
    tokens: ['DWT 9060 EZ', 'DWT-9060 EZ', 'DWT9060'],
  },
  {
    model: 'DWT 1165 PL', name: 'Dawlance 11kg Top-Load Fully Automatic Washing Machine DWT-1165',
    series: 'Top Load Platinum', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 11, h: 96.5, w: 55, d: 56.5,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Platinum Series', 'Pearl Wash Technology', 'Multiple Wash Programs', 'Child Lock', 'Auto Restart'],
    tokens: ['DWT 1165 PL', 'DWT-1165 PL', 'DWT1165', 'AWM DWT 1165'],
  },
  {
    model: 'DWT 1470 PL', name: 'Dawlance 15kg Top-Load Fully Automatic Washing Machine DWT-1470',
    series: 'Top Load Platinum', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 15, h: 97, w: 58.5, d: 61,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Platinum Series', 'Pearl Wash Technology', 'Multiple Wash Programs', 'Child Lock', 'Auto Restart'],
    tokens: ['DWT 1470 PL', 'DWT-1470 PL', 'DWT1470', 'AWM DWT 1470'],
  },
  {
    model: 'DWT 1775 PL', name: 'Dawlance 22kg Top-Load Fully Automatic Washing Machine DWT-1775',
    series: 'Top Load Platinum', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 22, h: 106.5, w: 66.5, d: 59.5,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Platinum Series', 'Large Capacity — Ideal for Large Families', 'Multiple Wash Programs', 'Child Lock'],
    tokens: ['DWT 1775 PL', 'DWT-1775 PL', 'DWT1775', 'DWT-1775'],
  },

  // ENERGY SAVER SERIES
  {
    model: 'DWT 260 ES', name: 'Dawlance 11kg Top-Load Fully Automatic Washing Machine DWT-260 ES',
    series: 'Energy Saver', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 11, h: 96.5, w: 56, d: 56.5,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Energy Saver Technology', 'Reduced Power Consumption', 'Multiple Wash Programs', 'Auto Restart'],
    tokens: ['DWT 260 ES', 'DWT-260 ES', 'DWT260ES'],
  },
  {
    model: 'DWT 270 ES', name: 'Dawlance 15kg Top-Load Fully Automatic Washing Machine DWT-270 ES',
    series: 'Energy Saver', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 15, h: 96.5, w: 58.5, d: 61,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Energy Saver Technology', 'Reduced Power Consumption', 'Multiple Wash Programs', 'Auto Restart'],
    tokens: ['DWT 270 ES', 'DWT-270 ES', 'DWT270ES'],
  },

  // LVS+ SERIES (Low Voltage Start)
  {
    model: 'DWT 260 S LVS+', name: 'Dawlance 11kg Top-Load Fully Automatic Washing Machine DWT-260 LVS+',
    series: 'LVS+ (Low Voltage Start)', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 11, h: 97, w: 58.5, d: 61,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Low Voltage Start (LVS+) — Works During Load Shedding Voltage Dips', 'Multiple Wash Programs', 'Child Lock', 'Silver Finish'],
    tokens: ['DWT 260 S LVS', 'DWT-260 S LVS', 'DWT260SLVS'],
  },
  {
    model: 'DWT 270 S LVS+', name: 'Dawlance 15kg Top-Load Fully Automatic Washing Machine DWT-270 LVS+',
    series: 'LVS+ (Low Voltage Start)', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 15, h: 97, w: 58.5, d: 61,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Low Voltage Start (LVS+)', 'Multiple Wash Programs', 'Child Lock', 'Silver Finish'],
    tokens: ['DWT 270 S LVS', 'DWT-270 S LVS', 'DWT270SLVS'],
  },
  {
    model: 'DWT 260 C LVS+', name: 'Dawlance 11kg Top-Load Fully Automatic Washing Machine DWT-260C LVS+',
    series: 'LVS+ (Low Voltage Start)', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 11, h: 97, w: 58.5, d: 61,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Low Voltage Start (LVS+)', 'Multiple Wash Programs', 'Child Lock', 'Chrome Finish'],
    tokens: ['DWT 260 C LVS', 'DWT-260 C LVS', 'DWT260CLVS'],
  },
  {
    model: 'DWT 270 C LVS+', name: 'Dawlance 15kg Top-Load Fully Automatic Washing Machine DWT-270C LVS+',
    series: 'LVS+ (Low Voltage Start)', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 15, h: 97, w: 58.5, d: 61,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Low Voltage Start (LVS+)', 'Multiple Wash Programs', 'Child Lock', 'Chrome Finish'],
    tokens: ['DWT 270 C LVS', 'DWT-270 C LVS', 'DWT270CLVS'],
  },

  // AUTO DOSE SERIES
  {
    model: 'DWT 1166 ADS+', name: 'Dawlance 11kg Top-Load Fully Automatic Washing Machine DWT-1166 Auto Dose',
    series: 'Auto Dose', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 11, h: 96.5, w: 56, d: 56.5,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Auto Dose System (ADS+) — Automatic Detergent Dispensing', 'Precise Detergent Control', 'Multiple Wash Programs', 'Child Lock'],
    tokens: ['DWT 1166 ADS', 'DWT-1166 ADS', 'DWT1166ADS'],
  },

  // GLOW SERIES (Illuminated display)
  {
    model: 'DWT 1167 FLP', name: 'Dawlance 11kg Top-Load Fully Automatic Washing Machine DWT-1167 Glow',
    series: 'Glow Series', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 11, h: 96.5, w: 56, d: 56.5,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Glow Series — Illuminated LED Display', 'Premium Look', 'Multiple Wash Programs', 'Child Lock'],
    tokens: ['DWT 1167 FLP', 'DWT-1167 FLP', 'DWT1167FLP'],
  },
  {
    model: 'DWT 1471 FLP', name: 'Dawlance 15kg Top-Load Fully Automatic Washing Machine DWT-1471 Glow',
    series: 'Glow Series', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 15, h: 96.5, w: 56, d: 56.5,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Glow Series — Illuminated LED Display', 'Premium Look', 'Multiple Wash Programs', 'Child Lock'],
    tokens: ['DWT 1471 FLP', 'DWT-1471 FLP', 'DWT1471FLP'],
  },
  {
    model: 'DWT 1167 FLT', name: 'Dawlance 11kg Top-Load Fully Automatic Washing Machine DWT-1167 Glow Touch',
    series: 'Glow Series Touch', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 11, h: 96.5, w: 56, d: 56.5,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Glow Series — LED Touch Display', 'Premium Design', 'Touch Control Panel', 'Multiple Wash Programs', 'Child Lock'],
    tokens: ['DWT 1167 FLT', 'DWT-1167 FLT', 'DWT1167FLT', 'DWT 11671 FLT'],
  },
  {
    model: 'DWT 1471 FLT', name: 'Dawlance 15kg Top-Load Fully Automatic Washing Machine DWT-1471 Glow Touch',
    series: 'Glow Series Touch', type: 'Top Load', load_type: 'Fully Automatic',
    capacity_kg: 15, h: 96.5, w: 56, d: 56.5,
    inverter: false, spin_rpm: 800,
    features: ['Top Load', 'Fully Automatic', 'Glow Series — LED Touch Display', 'Premium Design', 'Touch Control Panel', 'Multiple Wash Programs', 'Child Lock'],
    tokens: ['DWT 1471 FLT', 'DWT-1471 FLT', 'DWT1471FLT', 'DWT-14711 FLT', 'AWM DWT-14711', 'AWM DWT 1471'],
  },

  // SEMI-AUTOMATIC TWIN TUB
  {
    model: 'DW 10500 C', name: 'Dawlance 22kg Semi-Automatic Twin-Tub Washing Machine DW-10500',
    series: 'Semi-Automatic Twin Tub', type: 'Semi-Automatic', load_type: 'Semi-Automatic',
    capacity_kg: 22, h: 105.5, w: 94, d: 55.5,
    inverter: false, spin_rpm: null,
    features: ['Semi-Automatic', 'Twin Tub — Separate Wash & Spin Tubs', 'Large 22kg Capacity', 'Manual Water Fill', 'Separate Spin Timer', 'Ideal for Large Households'],
    tokens: ['DW 10500 C', 'DW-10500 C', 'DW10500'],
  },
  {
    model: 'DW 7500 C', name: 'Dawlance 15kg Semi-Automatic Twin-Tub Washing Machine DW-7500',
    series: 'Semi-Automatic Twin Tub', type: 'Semi-Automatic', load_type: 'Semi-Automatic',
    capacity_kg: 15, h: 99, w: 87.5, d: 49,
    inverter: false, spin_rpm: null,
    features: ['Semi-Automatic', 'Twin Tub', '15kg Capacity', 'Manual Water Fill', 'Separate Spin Timer', 'Chrome Finish'],
    tokens: ['DW 7500 C', 'DW-7500 C', 'DW7500C'],
  },
  {
    model: 'DW 7500 G', name: 'Dawlance 15kg Semi-Automatic Twin-Tub Washing Machine DW-7500G',
    series: 'Semi-Automatic Twin Tub', type: 'Semi-Automatic', load_type: 'Semi-Automatic',
    capacity_kg: 15, h: 99, w: 87.5, d: 49,
    inverter: false, spin_rpm: null,
    features: ['Semi-Automatic', 'Twin Tub', '15kg Capacity', 'Manual Water Fill', 'Separate Spin Timer', 'Grey Finish'],
    tokens: ['DW 7500 G', 'DW-7500 G', 'DW7500G'],
  },
  {
    model: 'DW 6550 C', name: 'Dawlance 12kg Semi-Automatic Twin-Tub Washing Machine DW-6550',
    series: 'Semi-Automatic Twin Tub', type: 'Semi-Automatic', load_type: 'Semi-Automatic',
    capacity_kg: 12, h: 96, w: 84, d: 46,
    inverter: false, spin_rpm: null,
    features: ['Semi-Automatic', 'Twin Tub', '12kg Capacity', 'Manual Water Fill', 'Separate Spin Timer', 'Chrome Finish'],
    tokens: ['DW 6550 C', 'DW-6550 C', 'DW6550C'],
  },
  {
    model: 'DW 6550 W', name: 'Dawlance 12kg Semi-Automatic Twin-Tub Washing Machine DW-6550W',
    series: 'Semi-Automatic Twin Tub', type: 'Semi-Automatic', load_type: 'Semi-Automatic',
    capacity_kg: 12, h: 96, w: 84, d: 46,
    inverter: false, spin_rpm: null,
    features: ['Semi-Automatic', 'Twin Tub', '12kg Capacity', 'Manual Water Fill', 'Separate Spin Timer', 'White Finish'],
    tokens: ['DW 6550 W', 'DW-6550 W', 'DW6550W'],
  },

  // SINGLE TUB
  {
    model: 'DW 6100 C', name: 'Dawlance 15kg Single-Tub Washing Machine DW-6100',
    series: 'Single Tub', type: 'Single Tub', load_type: 'Semi-Automatic',
    capacity_kg: 15, h: 98.5, w: 56, d: 47.5,
    inverter: false, spin_rpm: null,
    features: ['Single Tub', 'Semi-Automatic', '15kg Capacity', 'Pulsator Wash', 'Timer Control', 'Chrome Finish'],
    tokens: ['DW 6100 C', 'DW-6100 C', 'DW6100C'],
  },
  {
    model: 'DW 9100 G', name: 'Dawlance 18kg Single-Tub Washing Machine DW-9100G',
    series: 'Single Tub', type: 'Single Tub', load_type: 'Semi-Automatic',
    capacity_kg: 18, h: 109, w: 61, d: 53.5,
    inverter: false, spin_rpm: null,
    features: ['Single Tub', 'Semi-Automatic', '18kg Large Capacity', 'Pulsator Wash', 'Timer Control', 'Grey Finish'],
    tokens: ['DW 9100 G', 'DW-9100 G', 'DW9100G'],
  },
  {
    model: 'DW 9100 C', name: 'Dawlance 18kg Single-Tub Washing Machine DW-9100',
    series: 'Single Tub', type: 'Single Tub', load_type: 'Semi-Automatic',
    capacity_kg: 18, h: 109, w: 61, d: 53.5,
    inverter: false, spin_rpm: null,
    features: ['Single Tub', 'Semi-Automatic', '18kg Large Capacity', 'Pulsator Wash', 'Timer Control', 'Chrome Finish'],
    tokens: ['DW 9100 C', 'DW-9100 C', 'DW9100C'],
  },
  {
    model: 'DW 6100 W', name: 'Dawlance 15kg Single-Tub Washing Machine DW-6100W',
    series: 'Single Tub', type: 'Single Tub', load_type: 'Semi-Automatic',
    capacity_kg: 15, h: 98.5, w: 56, d: 47.5,
    inverter: false, spin_rpm: null,
    features: ['Single Tub', 'Semi-Automatic', '15kg Capacity', 'Pulsator Wash', 'Timer Control', 'White Finish'],
    tokens: ['DW 6100 W', 'DW-6100 W', 'DW6100W'],
  },
  {
    model: 'DW 9200 CFL', name: 'Dawlance 18kg Single-Tub Washing Machine DW-9200 CFL',
    series: 'Single Tub', type: 'Single Tub', load_type: 'Semi-Automatic',
    capacity_kg: 18, h: 109, w: 61, d: 53.5,
    inverter: false, spin_rpm: null,
    features: ['Single Tub', 'Semi-Automatic', '18kg Capacity', 'Pulsator Wash', 'Timer Control', 'Chrome / Floral Design'],
    tokens: ['DW 9200 CFL', 'DW-9200 CFL', 'DW9200CFL'],
  },
  {
    model: 'DW 9200 WFL', name: 'Dawlance 18kg Single-Tub Washing Machine DW-9200 WFL',
    series: 'Single Tub', type: 'Single Tub', load_type: 'Semi-Automatic',
    capacity_kg: 18, h: 109, w: 61, d: 53.5,
    inverter: false, spin_rpm: null,
    features: ['Single Tub', 'Semi-Automatic', '18kg Capacity', 'Pulsator Wash', 'Timer Control', 'White / Floral Design'],
    tokens: ['DW 9200 WFL', 'DW-9200 WFL', 'DW9200WFL'],
  },

  // SPINNER
  {
    model: 'DS 9000 W', name: 'Dawlance 16kg Spinner / Spin Dryer DS-9000',
    series: 'Spinner', type: 'Spinner', load_type: 'Spinner / Dryer',
    capacity_kg: 16, h: 96.5, w: 60, d: 52.9,
    inverter: false, spin_rpm: 1300,
    features: ['Spin Dryer', '16kg Spin Capacity', 'High-Speed Spin — Removes More Water', 'Stainless Steel Drum', 'Timer Control', 'White Finish', 'Ideal as Add-On to Manual / Semi-Auto Washers'],
    tokens: ['DS 9000 W', 'DS-9000 W', 'DS9000W'],
  },
  {
    model: 'DS 6000 C', name: 'Dawlance 10kg Spinner / Spin Dryer DS-6000',
    series: 'Spinner', type: 'Spinner', load_type: 'Spinner / Dryer',
    capacity_kg: 10, h: 81, w: 48.5, d: 42,
    inverter: false, spin_rpm: 1300,
    features: ['Spin Dryer', '10kg Spin Capacity', 'High-Speed Spin', 'Timer Control', 'Chrome Finish', 'Compact Design'],
    tokens: ['DS 6000 C', 'DS-6000 C', 'DS6000C'],
  },
];

function matchDwWm(dbModel, wm) {
  const UP = dbModel.toUpperCase().replace(/\s+/g, ' ').trim();
  for (const token of wm.tokens) {
    const T = token.toUpperCase().replace(/\s+/g, ' ');
    if (UP.includes(T) || UP.replace(/\s+/g, '').includes(T.replace(/\s+/g, ''))) return true;
  }
  return false;
}

function buildWmSpecs(wm) {
  return {
    Type:               `Washing Machine — ${wm.series}`,
    'Wash Type':        wm.type,
    'Load Type':        wm.load_type,
    Capacity:           `${wm.capacity_kg} kg`,
    'Inverter Motor':   wm.inverter ? 'Yes — Energy Efficient Inverter' : 'No',
    ...(wm.spin_rpm ? { 'Spin Speed': `${wm.spin_rpm} RPM` } : {}),
    'Height':           `${wm.h} cm`,
    'Width':            `${wm.w} cm`,
    'Depth':            `${wm.d} cm`,
    'Dimensions (H×W×D)': `${wm.h} × ${wm.w} × ${wm.d} cm`,
    'Key Features':     wm.features.join(', '),
    'Power Supply':     '220V / 50Hz',
    Warranty:           '2 years parts & labour',
  };
}

function buildWmDescription(wm) {
  const inv = wm.inverter ? ' Equipped with an inverter motor for significant energy savings.' : '';
  const typeNote = wm.type === 'Front Load'
    ? 'Front-load design is gentler on clothes and more water-efficient.'
    : wm.type === 'Semi-Automatic'
    ? 'Semi-automatic design — manual water control, low running cost.'
    : wm.type === 'Spinner'
    ? 'High-speed spin dryer — removes more water for faster drying.'
    : 'Top-load design for convenient loading.';
  return `The ${wm.name} is part of Dawlance's ${wm.series} range. ${typeNote}${inv} Capacity: ${wm.capacity_kg}kg. Dimensions: H${wm.h} × W${wm.w} × D${wm.d} cm. Available at Reliance Appliances, Karachi — on easy installments or cash. Call or WhatsApp for the latest price.`;
}

function buildWmTags(wm) {
  return [
    'dawlance', 'Dawlance', wm.model,
    'washing machine', wm.type.toLowerCase(), wm.series.toLowerCase(),
    `${wm.capacity_kg}kg`, `${wm.capacity_kg} kg washing machine`,
    wm.inverter ? 'inverter washing machine' : '',
    'dawlance washing machine', 'karachi', 'pakistan',
    'reliance appliances', 'installment', 'easy installments',
    'washing machine price pakistan', 'washing machine karachi',
  ].filter(Boolean).join(', ');
}

// ─────────────────────────────────────────────────────────────────────────────
// KENWOOD SMART SERIES — from Smart Ref Leaflet Artwork.pdf
// ─────────────────────────────────────────────────────────────────────────────

const SMART_FEATURES = [
  'Wi-Fi Temperature & Compressor Control',
  'Dual Temperature Display',
  'Digital Touch Panel',
  'Smart UV Light — Kills 99.9% Bacteria',
  'Active Carbon Filter — Odour Elimination',
  'Copper Anti-Moisture Tube',
  'Inverter Technology — Up to 60% Energy Efficient',
  'Low Voltage Startup — Works from 110V',
  'Concealed Internal Condenser',
  '5-Way Evaporator — Deep Freezing (-25°C)',
  'Smart Mode', 'Super Freeze Mode', 'Eco Mode',
  'DC Components — Higher Efficiency',
  'Larger Fan for Uniform Cooling',
  '2 LED Lights',
  'Large Ice Tray',
  'Adjustable Glass Shelf',
];

const KENWOOD_REFS = [
  {
    model: 'KRF-24557', size_hint: 'Small / Medium',
    colors: ['Black', 'Maroon'],
    name: 'Kenwood Smart Series Refrigerator KRF-24557',
  },
  {
    model: 'KRF-25657', size_hint: 'Medium',
    colors: ['Black', 'Maroon'],
    name: 'Kenwood Smart Series Refrigerator KRF-25657',
  },
  {
    model: 'KRF-26757', size_hint: 'Medium / Large',
    colors: ['Black', 'Maroon'],
    name: 'Kenwood Smart Series Refrigerator KRF-26757',
  },
  {
    model: 'KRF-27857', size_hint: 'Large',
    colors: ['Black', 'Maroon'],
    name: 'Kenwood Smart Series Refrigerator KRF-27857',
  },
];

function buildKenwoodSpecs(ref) {
  return {
    Type:                  'Refrigerator — Kenwood Smart Series',
    Series:                'Smart Series',
    'Available Colors':    ref.colors.join(', '),
    'Door Type':           'Single Door',
    'Inverter Technology': 'Yes — Up to 60% Energy Efficient',
    'Connectivity':        'Wi-Fi Smart Control via App',
    'Control Panel':       'Digital Touch Panel with Dual Temperature Display',
    'UV Sterilisation':    'Smart UV Light — 99.9% Bacteria Elimination',
    'Odour Control':       'Active Carbon Filter',
    'Moisture Control':    'Copper Anti-Moisture Tube',
    'Low Voltage Start':   'Yes — Works from 110V',
    'Condenser':           'Concealed Internal Condenser',
    'Deep Freeze':         '5-Way Evaporator — Deep Freezing at -25°C',
    'Modes':               'Smart Mode, Super Freeze Mode, Eco Mode',
    'Lighting':            '2 LED Interior Lights',
    'Ice Tray':            'Large Ice Tray',
    'Shelving':            'Adjustable Glass Shelf',
    'Key Features':        SMART_FEATURES.slice(0, 6).join(', '),
    'Power Supply':        '220V / 50Hz',
    Warranty:              '1 year parts & labour',
    Brand:                 'Kenwood Pakistan — www.kenwoodpakistan.pk | UAN: 021-111-764-111',
  };
}

function buildKenwoodDescription(ref) {
  return `The ${ref.name} is part of Kenwood's premium Smart Series — featuring Wi-Fi connectivity, digital touch control, Smart UV sterilisation, and inverter technology for up to 60% energy savings. Works at voltages as low as 110V, ideal for Karachi load shedding conditions. Available in ${ref.colors.join(' and ')}. Features: ${SMART_FEATURES.slice(0, 5).join(', ')} and more. Available at Reliance Appliances, Karachi — on easy installments or cash. Call or WhatsApp for the latest price.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOMAGE TECH SERIES — from Tech Series Leaflet Artwork.pdf
// ─────────────────────────────────────────────────────────────────────────────

const HOMAGE_REFS = [
  {
    model: 'HR-47452',
    name: 'Homage Tech Series Refrigerator HR-47452',
  },
  {
    model: 'HR-47562',
    name: 'Homage Tech Series Refrigerator HR-47562',
  },
  {
    model: 'HR-47672',
    name: 'Homage Tech Series Refrigerator HR-47672',
  },
  {
    model: 'HR-47782',
    name: 'Homage Tech Series Refrigerator HR-47782',
  },
];

function buildHomageSpecs(ref) {
  return {
    Type:                  'Refrigerator — Homage Tech Series',
    Series:                'Tech Series',
    'Inverter Technology': 'Yes — Up to 60% Energy Efficient',
    'Connectivity':        'Wi-Fi Smart Control',
    'Control Panel':       'Digital Touch Panel with Dual Temperature Display',
    'UV Sterilisation':    'Smart UV Light — Kills 99.9% Bacteria',
    'Odour Control':       'Active Carbon Filter',
    'Moisture Control':    'Copper Anti-Moisture Tube',
    'Low Voltage Start':   'Yes — Works from 110V',
    'Condenser':           'Concealed Internal Condenser',
    'Deep Freeze':         '5-Way Evaporator — Deep Freezing at -25°C',
    'Modes':               'Smart Mode, Super Freeze Mode, Eco Mode',
    'Lighting':            '2 LED Interior Lights',
    'Ice Tray':            'Large Ice Tray',
    'Shelving':            'Adjustable Glass Shelf',
    'Key Features':        SMART_FEATURES.slice(0, 6).join(', '),
    'Power Supply':        '220V / 50Hz',
    Warranty:              '1 year parts & labour',
    Brand:                 'Homage Pakistan — www.homage.pk | UAN: 021-111-764-111',
  };
}

function buildHomageDescription(ref) {
  return `The ${ref.name} is part of Homage's premium Tech Series — featuring Wi-Fi connectivity, digital touch control, Smart UV sterilisation, and inverter technology for up to 60% energy savings. Works at voltages as low as 110V — ideal for Karachi load shedding conditions. Features: ${SMART_FEATURES.slice(0, 5).join(', ')} and more. Available at Reliance Appliances, Karachi — on easy installments or cash. Call or WhatsApp for the latest price.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }
  console.log('Signed in.\n');

  // ── 1. DAWLANCE WASHING MACHINES ──────────────────────────────────────────
  console.log('═'.repeat(60));
  console.log('DAWLANCE WASHING MACHINES');
  console.log('═'.repeat(60));

  const { data: allDawlance } = await supabase
    .from('products')
    .select('id, brand, model, category, simplified_name')
    .ilike('brand', 'dawlance');

  const existingWMs = allDawlance.filter(p =>
    p.category?.toLowerCase().includes('wash') ||
    p.model?.toUpperCase().match(/^(AWM\s+)?D[WS][TF]?\s/)
  );
  console.log(`Found ${existingWMs.length} Dawlance washing machines in DB.\n`);

  let wmUpdated = 0, wmInserted = 0;

  for (const wm of DAWLANCE_WMS) {
    const dbRow = existingWMs.find(p => matchDwWm(p.model, wm));

    const specs       = buildWmSpecs(wm);
    const description = buildWmDescription(wm);
    const tags        = buildWmTags(wm);
    const seo_title   = `${wm.name} Price in Pakistan | Buy on Installments — Reliance Appliances Karachi`;
    const seo_desc    = `Buy the ${wm.name} in Karachi. ${wm.capacity_kg}kg ${wm.type} washing machine. ${wm.inverter ? 'Inverter motor.' : ''} Easy installments at Reliance Appliances.`;

    if (dbRow) {
      console.log(`  ${DRY_RUN ? 'WOULD ENRICH' : 'ENRICH'}  ${dbRow.model}  →  ${wm.series} | ${wm.capacity_kg}kg`);
      if (!DRY_RUN) {
        const { error: e } = await supabase.from('products').update({
          simplified_name: wm.name,
          category: 'Washing Machines',
          sub_category: wm.type,
          specs, description, tags, seo_title, seo_desc,
          updated_at: new Date().toISOString(),
        }).eq('id', dbRow.id);
        if (e) { console.error(`    ✗ ${e.message}`); continue; }
      }
      wmUpdated++;
    } else {
      console.log(`  ${DRY_RUN ? 'WOULD INSERT' : 'INSERT'}  ${wm.model}  (${wm.series} | ${wm.capacity_kg}kg)`);
      if (!DRY_RUN) {
        const slug = `dawlance-${wm.model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const { error: e } = await supabase.from('products').insert({
          id: randomUUID(),
          brand: 'Dawlance', model: wm.model, simplified_name: wm.name,
          category: 'Washing Machines', sub_category: wm.type,
          slug, specs, description, tags, seo_title, seo_desc,
          retail_price: 0, cash_floor: 0,
          stock_status: 'In Stock',
          thumbnail_url: null, gallery_urls: [],
          updated_at: new Date().toISOString(),
        });
        if (e) { console.error(`    ✗ ${e.message}`); continue; }
      }
      wmInserted++;
    }
  }

  console.log(`\nDawlance WMs: ${wmUpdated} enriched, ${wmInserted} inserted.`);

  // ── 2. KENWOOD SMART SERIES ────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('KENWOOD SMART SERIES REFRIGERATORS');
  console.log('═'.repeat(60));

  let kwInserted = 0;
  for (const ref of KENWOOD_REFS) {
    console.log(`  ${DRY_RUN ? 'WOULD INSERT' : 'INSERT'}  ${ref.model}`);
    if (!DRY_RUN) {
      const specs       = buildKenwoodSpecs(ref);
      const description = buildKenwoodDescription(ref);
      const tags        = `kenwood, Kenwood, ${ref.model}, kenwood smart series, smart refrigerator, wi-fi refrigerator, inverter refrigerator, kenwood ref, karachi, pakistan, reliance appliances, installment, easy installments, fridge karachi, refrigerator price pakistan`;
      const slug        = `kenwood-${ref.model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const seo_title   = `${ref.name} Price in Pakistan | Buy on Installments — Reliance Appliances Karachi`;
      const seo_desc    = `Buy the ${ref.name} in Karachi. Smart Series with Wi-Fi, UV light, inverter technology. Easy installments at Reliance Appliances.`;
      const { error: e } = await supabase.from('products').insert({
        id: randomUUID(),
        brand: 'Kenwood', model: ref.model, simplified_name: ref.name,
        category: 'Refrigerators', sub_category: 'Smart Inverter',
        colors: ref.colors.join(', '),
        slug, specs, description, tags, seo_title, seo_desc,
        retail_price: 0, cash_floor: 0,
        stock_status: 'In Stock',
        thumbnail_url: null, gallery_urls: [],
        updated_at: new Date().toISOString(),
      });
      if (e) { console.error(`    ✗ ${e.message}`); continue; }
    }
    kwInserted++;
  }
  console.log(`\nKenwood: ${kwInserted} inserted.`);

  // ── 3. HOMAGE TECH SERIES ─────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('HOMAGE TECH SERIES REFRIGERATORS');
  console.log('═'.repeat(60));

  let hmInserted = 0;
  for (const ref of HOMAGE_REFS) {
    console.log(`  ${DRY_RUN ? 'WOULD INSERT' : 'INSERT'}  ${ref.model}`);
    if (!DRY_RUN) {
      const specs       = buildHomageSpecs(ref);
      const description = buildHomageDescription(ref);
      const tags        = `homage, Homage, ${ref.model}, homage tech series, tech series refrigerator, wi-fi refrigerator, inverter refrigerator, homage ref, karachi, pakistan, reliance appliances, installment, easy installments, fridge karachi, refrigerator price pakistan`;
      const slug        = `homage-${ref.model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const seo_title   = `${ref.name} Price in Pakistan | Buy on Installments — Reliance Appliances Karachi`;
      const seo_desc    = `Buy the ${ref.name} in Karachi. Tech Series with Wi-Fi, UV light, inverter technology. Easy installments at Reliance Appliances.`;
      const { error: e } = await supabase.from('products').insert({
        id: randomUUID(),
        brand: 'Homage', model: ref.model, simplified_name: ref.name,
        category: 'Refrigerators', sub_category: 'Smart Inverter',
        slug, specs, description, tags, seo_title, seo_desc,
        retail_price: 0, cash_floor: 0,
        stock_status: 'In Stock',
        thumbnail_url: null, gallery_urls: [],
        updated_at: new Date().toISOString(),
      });
      if (e) { console.error(`    ✗ ${e.message}`); continue; }
    }
    hmInserted++;
  }
  console.log(`\nHomage: ${hmInserted} inserted.`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('COMPLETE');
  console.log(`  Dawlance WMs enriched : ${wmUpdated}`);
  console.log(`  Dawlance WMs inserted : ${wmInserted}`);
  console.log(`  Kenwood refs inserted : ${kwInserted}`);
  console.log(`  Homage refs inserted  : ${hmInserted}`);
  console.log(`\n  NOTE: All inserted products have retail_price=0.`);
  console.log(`  Set prices via Admin Panel before publishing.`);
  if (DRY_RUN) console.log('\n(Dry run — run without --dry-run to apply)');
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });

/**
 * backfill_solar_compatibility.mjs
 *
 * Populates the compatibility columns added by
 * supabase/migrations/20260402_compatibility_columns.sql for every solar
 * inverter and battery product already in the DB.
 *
 * What it sets:
 *   system_role             — 'inverter' | 'battery' | 'panel' | 'other'
 *   inverter_power_kw       — parsed from specs (inverters only)
 *   battery_voltage         — parsed from specs (batteries only)
 *   compatibility_status    — 'missing_data_blocked' if power/voltage unknown,
 *                             else left as 'not_applicable' (engine decides at runtime)
 *   requires_compatibility_review — true when data is still missing after parse
 *
 * Preserves all other fields (prices, images, descriptions, etc.)
 *
 * Run:  node backfill_solar_compatibility.mjs [--dry-run]
 *       --dry-run  prints changes without writing to DB
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN           = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Category detection ────────────────────────────────────────────────────────

const INVERTER_CATS = ['inverter', 'solar converter', 'hybrid inverter', 'on-grid', 'off-grid', 'pv inverter'];
const BATTERY_CATS  = ['battery', 'solar battery', 'lithium', 'lifepo4'];
const PANEL_CATS    = ['solar panel', 'panel', 'pv panel', 'mono', 'poly'];

function detectSystemRole(product) {
  const nc  = (product.normalized_category  || '').toLowerCase();
  const oc  = (product.original_category    || product.category || '').toLowerCase();
  const sub = (product.normalized_subcategory || '').toLowerCase();
  const all = `${nc} ${oc} ${sub}`;

  if (INVERTER_CATS.some(k => all.includes(k))) return 'inverter';
  if (BATTERY_CATS .some(k => all.includes(k))) return 'battery';
  if (PANEL_CATS   .some(k => all.includes(k))) return 'panel';
  return 'none'; // DB CHECK constraint: ('inverter','battery','panel','pump','system','accessory','none')
}

// ── Spec parsers ──────────────────────────────────────────────────────────────

const POWER_KW_KEYS = [
  'output power (kw)', 'rated power (kw)', 'capacity (kw)', 'rated output (kw)',
  'max output power (kw)', 'inverter capacity (kw)', 'nominal output power (kw)',
];

/** Returns kW as number, or null if not found. */
function parseInverterPowerKw(specs) {
  if (!specs || typeof specs !== 'object') return null;

  // 1. Check known key patterns (exact / includes)
  for (const [k, v] of Object.entries(specs)) {
    const kl = k.toLowerCase().trim();
    if (POWER_KW_KEYS.some(pk => kl === pk || kl.includes(pk))) {
      const m = String(v).match(/(\d+\.?\d*)/);
      if (m) return parseFloat(m[1]);
    }
  }

  // 2. Fallback: any key containing both 'power'/'capacity' and 'kw'
  for (const [k, v] of Object.entries(specs)) {
    const kl = k.toLowerCase().trim();
    if ((kl.includes('power') || kl.includes('capacity')) && kl.includes('kw')) {
      const m = String(v).match(/(\d+\.?\d*)/);
      if (m) return parseFloat(m[1]);
    }
  }

  // 3. Last resort: look for an inline "X kW" value in any power-adjacent key
  for (const [k, v] of Object.entries(specs)) {
    if (k.toLowerCase().includes('power') || k.toLowerCase().includes('capacity')) {
      const m = String(v).match(/(\d+\.?\d*)\s*kw/i);
      if (m) {
        const n = parseFloat(m[1]);
        // Sanity check: inverters are 0.5–30 kW range
        if (n >= 0.5 && n <= 30) return n;
      }
    }
  }

  return null;
}

const VOLT_KEYS = [
  'battery voltage', 'system voltage', 'nominal voltage', 'dc voltage',
  'battery bank voltage', 'dc bus voltage',
];

/** Returns 24, 48, or null. */
function parseBatteryVoltage(specs) {
  if (!specs || typeof specs !== 'object') return null;

  for (const [k, v] of Object.entries(specs)) {
    const kl = k.toLowerCase().trim();
    if (VOLT_KEYS.some(vk => kl === vk || kl.includes(vk))) {
      const s = String(v).toLowerCase().trim();
      if (s.startsWith('24') || s === '24v') return 24;
      if (s.startsWith('48') || s === '48v') return 48;
      const m = String(v).match(/^(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n === 24 || n === 48) return n;
      }
    }
  }

  // Fallback: check 'voltage' key — handles both nominal (e.g. '24V', '48V')
  // and cell-level nominal voltages (e.g. '25.6V' = 24V class, '51.2V' = 48V class)
  for (const [k, v] of Object.entries(specs)) {
    if (k.toLowerCase().trim() === 'voltage') {
      const s = String(v).toLowerCase().trim();
      const n = parseFloat(s);
      if (!isNaN(n)) {
        // Exact or near-exact 24V / 48V
        if (n === 24 || n === 48) return n;
        // LiFePO4 nominal cell voltages map to voltage class:
        // 12.8V = 12V class (not handled by compatibility engine, treat as 24V if no other data)
        // 25.6V = 24V class (4 cells × 3.2V = 12.8V × 2 = 25.6V)
        // 51.2V = 48V class (16 cells × 3.2V = 51.2V)
        if (n >= 20 && n < 30) return 24;  // 24V class: 20–29V nominal
        if (n >= 40 && n < 58) return 48;  // 48V class: 40–57V nominal
      }
    }
  }

  return null;
}

// ── Known overrides (manually verified, in case specs are missing) ────────────
// Format: { brand (lowercase prefix), model (lowercase contains), powerKw?, voltageV? }

const KNOWN_OVERRIDES = [
  // Tajalli standard packages (Crown Yorker series)
  { brand: 'crown', model: '3.6',  powerKw: 3.6  },
  { brand: 'crown', model: '5kw',  powerKw: 5.0  },
  { brand: 'crown', model: '8kw',  powerKw: 8.0  },
  { brand: 'crown', model: 'yorker 3.6', powerKw: 3.6  },
  { brand: 'crown', model: 'yorker 5',   powerKw: 5.0  },
  { brand: 'crown', model: 'yorker 8',   powerKw: 8.0  },
  // ── Ziewnic inverters (PV model codes: PV7000 = 4.7kW, PV9000 = 6.7kW etc.) ──
  // Spec key is 'Power Output' e.g. '4.7 kW' — parser step 3 handles this correctly.
  // These overrides cover cases where spec parsing fails (e.g. missing or unusual spec key).
  { brand: 'ziewnic', model: 'pv7000',  powerKw: 4.7  },  // Roux IP54 PV7000
  { brand: 'ziewnic', model: 'pv9000',  powerKw: 6.7  },  // Roux IP54 PV9000
  { brand: 'ziewnic', model: 'pv15000', powerKw: 11.7 },  // Roux IP54 PV15000
  { brand: 'ziewnic', model: 'pv8000',  powerKw: 6.0  },  // Lenox IP65 PV8000
  { brand: 'ziewnic', model: 'pv10500', powerKw: 8.0  },  // Lenox IP65 PV10500
  { brand: 'ziewnic', model: 'pv15600', powerKw: 12.0 },  // Lenox IP65 PV15600
  { brand: 'ziewnic', model: 'pv11000', powerKw: 9.0  },  // Voltronics 7th Gen PV11000
  { brand: 'ziewnic', model: 'pv14000', powerKw: 11.0 },  // Voltronics 7th Gen PV14000
  { brand: 'ziewnic', model: 'pv4000',  powerKw: 3.2  },  // Voltronics 6th Gen PV4000
  { brand: 'ziewnic', model: 'pv6500',  powerKw: 4.5  },  // Voltronics 5th/6th Gen PV6500
  { brand: 'ziewnic', model: 'pv8500',  powerKw: 6.5  },  // Voltronics 5th/6th Gen PV8500
  { brand: 'ziewnic', model: 'pv13000', powerKw: 10.5 },  // Voltronics 5th Gen PV13000
  { brand: 'ziewnic', model: 'pv5000',  powerKw: 4.2  },  // Axpert Twin PV5000
  // ── Ziewnic batteries ──
  // Spec key is 'Voltage' with nominal LiFePO4 cell values: 25.6V = 24V class, 51.2V = 48V class.
  // The parseBatteryVoltage range check above handles this, but explicit overrides are authoritative.
  { brand: 'ziewnic', model: '25v-100ah-li-china',   voltageV: 24 },
  { brand: 'ziewnic', model: '51v-100ah-li-china',   voltageV: 48 },
  { brand: 'ziewnic', model: '12v-100ah-li-vietnam', voltageV: 24 }, // 12.8V nominal = 12V class, treated as 24V-system-capable
  { brand: 'ziewnic', model: '12.8v',  voltageV: 24 }, // 12.8V products matched by voltage value in name
  { brand: 'ziewnic', model: '12v-100ah', voltageV: 24 }, // Short slug match
  { brand: 'ziewnic', model: '25v-100ah-li-vietnam', voltageV: 24 },
  { brand: 'ziewnic', model: '51v-100ah-li-vietnam', voltageV: 48 },
  { brand: 'ziewnic', model: '51v-280ah-li-vietnam', voltageV: 48 },
  // Crown batteries — named by capacity, not voltage. Elektra Boost = LiFePO4 battery banks.
  { brand: 'crown', model: '24v',         voltageV: 24 },
  { brand: 'crown', model: '48v',         voltageV: 48 },
  { brand: 'crown', model: 'boost 2.4kw', voltageV: 24 }, // Crown Elektra Boost 2.4KW = 25.6V/24V class
  { brand: 'crown', model: 'boost pro',   voltageV: 24 }, // Crown Elektra Boost Pro 2.4KW
  { brand: 'crown', model: 'boost lite',  voltageV: 48 }, // Crown Elektra Boost Lite 5.12KW = 51.2V/48V class
];

function applyKnownOverrides(product, parsedPowerKw, parsedVoltage) {
  const b = (product.brand || '').toLowerCase();
  const m = (product.model || '').toLowerCase();

  for (const rule of KNOWN_OVERRIDES) {
    if (!b.includes(rule.brand)) continue;
    if (!m.includes(rule.model)) continue;
    return {
      powerKw:  rule.powerKw  ?? parsedPowerKw,
      voltageV: rule.voltageV ?? parsedVoltage,
    };
  }
  return { powerKw: parsedPowerKw, voltageV: parsedVoltage };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n⚡ Solar Compatibility Backfill — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // Auth required for RLS-protected upserts
  if (!DRY_RUN) {
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (authErr) { console.error('Auth error:', authErr.message); process.exit(1); }
    console.log('✓ Authenticated\n');
  }

  // Fetch all solar products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, brand, model, category, original_category, normalized_category, normalized_subcategory, specs')
    .or(
      "category_family.eq.Solar," +
      "normalized_category.ilike.%inverter%," +
      "normalized_category.ilike.%battery%," +
      "normalized_category.ilike.%panel%," +
      "original_category.ilike.%inverter%," +
      "original_category.ilike.%battery%"
    );

  if (error) {
    console.error('Supabase fetch error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${products.length} solar products to process.\n`);

  const updates = [];
  const skipped = [];

  for (const p of products) {
    const role = detectSystemRole(p);

    let powerKw  = null;
    let voltageV = null;

    if (role === 'inverter') {
      powerKw = parseInverterPowerKw(p.specs);
    } else if (role === 'battery') {
      voltageV = parseBatteryVoltage(p.specs);
    }

    // Apply known overrides if spec parsing failed
    const { powerKw: finalPowerKw, voltageV: finalVoltage } = applyKnownOverrides(p, powerKw, voltageV);

    const missingData = (role === 'inverter' && finalPowerKw === null)
                     || (role === 'battery'  && finalVoltage  === null);

    const update = {
      id:         p.id,
      system_role: role,
      compatibility_status:         missingData ? 'missing_data_blocked' : 'not_applicable',
      requires_compatibility_review: missingData,
    };

    if (role === 'inverter') {
      update.inverter_power_kw = finalPowerKw;
      if (missingData) update.compatibility_notes = `inverter_power_kw not found in specs. Keys present: ${Object.keys(p.specs || {}).join(', ') || 'none'}`;
    }
    if (role === 'battery') {
      update.battery_voltage = finalVoltage;
      if (missingData) update.compatibility_notes = `battery_voltage not found in specs. Keys present: ${Object.keys(p.specs || {}).join(', ') || 'none'}`;
    }

    const status = missingData ? '⚠ MISSING' : '✓';
    const detail = role === 'inverter'
      ? `${finalPowerKw ?? '?'} kW`
      : role === 'battery'
        ? `${finalVoltage ?? '?'}V`
        : '';
    console.log(`${status} [${role.padEnd(8)}] ${p.brand} ${p.model} ${detail}`);

    updates.push(update);
    if (missingData) skipped.push(`${p.brand} ${p.model}`);
  }

  console.log(`\n─────────────────────────────────────────────`);
  console.log(`Total:   ${updates.length}`);
  console.log(`Missing: ${skipped.length}`);
  if (skipped.length) {
    console.log(`\nProducts needing manual data entry:`);
    skipped.forEach(s => console.log(`  • ${s}`));
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes written. Remove --dry-run to apply.');
    return;
  }

  // Update existing rows in batches of 10 concurrent requests.
  // Use .update().eq('id') rather than upsert to avoid NOT NULL constraint
  // failures on unspecified columns (brand, model, etc.).
  let written = 0;
  const CONCURRENCY = 10;
  for (let i = 0; i < updates.length; i += CONCURRENCY) {
    const batch = updates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(({ id, ...fields }) =>
        supabase.from('products').update(fields).eq('id', id)
      )
    );
    for (const { error: uErr } of results) {
      if (uErr) { console.error('Update error:', uErr.message); }
      else       { written++; }
    }
  }

  console.log(`\n✅ Done. Wrote ${written} / ${updates.length} products.`);
  if (skipped.length) {
    console.log(`⚠  ${skipped.length} products still need manual inverter_power_kw / battery_voltage entry in Admin → Compatibility tab.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });

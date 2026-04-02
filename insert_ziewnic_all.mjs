/**
 * insert_ziewnic_all.mjs
 * Inserts all 38 Ziewnic products (6 batteries + 32 inverters) at 10% above catalog price.
 * Prices rounded to nearest PKR 500.
 */
import { createClient } from '@supabase/supabase-js';
// Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables before running
const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const markup = price => Math.round(price * 1.1 / 500) * 500;

// Common tags base
const T = extra => `ziewnic, solar, karachi, pakistan, reliance appliances, installment, ${extra}`;

const products = [

  // ═══════════════════════════════════════════════════════════
  // SECTION A: LITHIUM BATTERIES
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-25v-100ah-li-china', slug: 'ziewnic-25v-100ah-li-china',
    brand: 'Ziewnic', model: '25.6V 100AH Lithium Battery',
    simplified_name: 'Ziewnic 2.56kWh Lithium Battery',
    category: 'Solar Battery', stock_status: 'In Stock', featured: false,
    warranty: '6 years battery', cash_floor: markup(134000), retail_price: markup(134000),
    specs: {
      'Capacity': '2.56 kWh (25.6V / 100AH)',
      'Cell Type': 'LiFePO4 — CATL / BYD / Gotion (Top Brand)',
      'Origin': 'Made in China',
      'Mounting': 'Wall Mounted',
      'Display': 'Large LCD',
      'Life Cycle': '12+ years design life',
      'Warranty': '6 Years',
      'Voltage': '25.6V',
      'Ampere Hours': '100AH',
      'Watt Hours': '2,560 Wh (2.56 kWh)',
      'Protection': 'Over-Voltage, Over-Current, Over-Temperature, Short Circuit',
      'Compatible With': 'All major solar inverters',
    },
    tags: T('solar battery, lithium battery, lifepo4, 2.56kwh, battery backup, loadshedding, ups battery'),
    description: 'The Ziewnic 25.6V 100AH LiFePO4 lithium battery stores 2.56 kWh of solar energy, providing reliable backup power during loadshedding. Built with top-brand cells (CATL/BYD/Gotion) and a large LCD status display. Wall-mounted, compact, and compatible with all major solar inverters. 6-year warranty. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-51v-100ah-li-china', slug: 'ziewnic-51v-100ah-li-china',
    brand: 'Ziewnic', model: '51.2V 100AH Lithium Battery',
    simplified_name: 'Ziewnic 5.12kWh Lithium Battery',
    category: 'Solar Battery', stock_status: 'In Stock', featured: false,
    warranty: '6 years battery', cash_floor: markup(223000), retail_price: markup(223000),
    specs: {
      'Capacity': '5.12 kWh (51.2V / 100AH)',
      'Cell Type': 'LiFePO4 — CATL / BYD / Gotion (Top Brand)',
      'Origin': 'Made in China',
      'Mounting': 'Wall Mounted', 'Display': 'Large LCD',
      'Life Cycle': '12+ years design life', 'Warranty': '6 Years',
      'Voltage': '51.2V', 'Ampere Hours': '100AH', 'Watt Hours': '5,120 Wh (5.12 kWh)',
      'Protection': 'Over-Voltage, Over-Current, Over-Temperature, Short Circuit',
      'Compatible With': 'All major solar inverters',
    },
    tags: T('solar battery, lithium battery, lifepo4, 5.12kwh, 48v, battery backup, loadshedding'),
    description: 'The Ziewnic 51.2V 100AH LiFePO4 battery stores 5.12 kWh — enough to power a home through extended loadshedding. Premium CATL/BYD/Gotion cells, large LCD display, wall-mounted design. 6-year warranty. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-12v-100ah-li-vietnam', slug: 'ziewnic-12v-100ah-li-vietnam',
    brand: 'Ziewnic', model: '12.8V 100AH Lithium Battery (BYD)',
    simplified_name: 'Ziewnic 1.28kWh Lithium Battery (BYD)',
    category: 'Solar Battery', stock_status: 'In Stock', featured: false,
    warranty: '10 years battery', cash_floor: markup(62000), retail_price: markup(62000),
    specs: {
      'Capacity': '1.28 kWh (12.8V / 100AH)',
      'Cell Type': 'LiFePO4 — BYD Long Prismatic Cells',
      'BMS': 'PACE Active BMS (American Chip)',
      'Origin': 'Made in Vietnam',
      'Life Cycle': '8,000 charge cycles (20+ years effective life)',
      'Warranty': '10 Years',
      'Voltage': '12.8V', 'Ampere Hours': '100AH', 'Watt Hours': '1,280 Wh (1.28 kWh)',
      'Full Charge Voltage': '14.6V', 'Discharge Cut-Off': '10V',
      'Connections': 'Supports series and parallel connection',
      'Protection': 'Over-temp, short circuit, over-voltage, over-current',
    },
    tags: T('solar battery, lithium battery, lifepo4, byd, 1.28kwh, 12v, battery backup, ups battery'),
    description: 'The Ziewnic 12.8V 100AH lithium battery uses genuine BYD Long Prismatic cells and a PACE Active BMS rated for 8,000 cycles (20+ years). Supports series and parallel connection for scalable systems. 10-year warranty. Ideal for home UPS and solar backup in Karachi.',
  },
  {
    id: 'ziewnic-25v-100ah-li-vietnam', slug: 'ziewnic-25v-100ah-li-vietnam',
    brand: 'Ziewnic', model: '25.6V 100AH Lithium Battery (BYD Premium)',
    simplified_name: 'Ziewnic 2.56kWh Lithium Battery (BYD Premium)',
    category: 'Solar Battery', stock_status: 'In Stock', featured: false,
    warranty: '10 years battery', cash_floor: markup(163000), retail_price: markup(163000),
    specs: {
      'Capacity': '2.56 kWh (25.6V / 100AH)',
      'Cell Type': 'LiFePO4 — BYD Long Prismatic Cells',
      'BMS': 'PACE Active BMS (American Chip)', 'Origin': 'Made in Vietnam',
      'Mounting': 'Wall Mounted', 'Display': 'RGB Status Light',
      'Life Cycle': '8,000 charge cycles (20+ years)', 'Warranty': '10 Years',
      'Voltage': '25.6V', 'Ampere Hours': '100AH', 'Watt Hours': '2,560 Wh (2.56 kWh)',
      'Charge/Discharge': '1C/1C Continuous',
      'Protection': 'Over-Temp, Over-Voltage, Over-Current, Short Circuit',
    },
    tags: T('solar battery, lithium battery, lifepo4, byd premium, 2.56kwh, battery backup, loadshedding'),
    description: 'The Ziewnic 25.6V 100AH Premium battery uses genuine BYD Long Prismatic cells and PACE Active BMS — 8,000 cycles, 20+ years design life. Wall-mounted, RGB status display. 10-year warranty. One of the most durable solar batteries available in Pakistan.',
  },
  {
    id: 'ziewnic-51v-100ah-li-vietnam', slug: 'ziewnic-51v-100ah-li-vietnam',
    brand: 'Ziewnic', model: '51.2V 100AH Lithium Battery (BYD Premium)',
    simplified_name: 'Ziewnic 5.12kWh Lithium Battery (BYD Premium)',
    category: 'Solar Battery', stock_status: 'In Stock', featured: false,
    warranty: '10 years battery', cash_floor: markup(258000), retail_price: markup(258000),
    specs: {
      'Capacity': '5.12 kWh (51.2V / 100AH)',
      'Cell Type': 'LiFePO4 — BYD Long Prismatic Cells',
      'BMS': 'PACE Active BMS (American Chip)', 'Origin': 'Made in Vietnam',
      'Mounting': 'Wall Mounted', 'Display': 'RGB Status Light',
      'Life Cycle': '8,000 charge cycles (20+ years)', 'Warranty': '10 Years',
      'Voltage': '51.2V', 'Ampere Hours': '100AH', 'Watt Hours': '5,120 Wh (5.12 kWh)',
      'Charge/Discharge': '1C/1C Continuous',
      'Protection': 'Over-Temp, Over-Voltage, Over-Current, Short Circuit',
    },
    tags: T('solar battery, lithium battery, lifepo4, byd premium, 5.12kwh, 48v, battery backup'),
    description: 'The Ziewnic 51.2V 100AH Premium battery delivers 5.12 kWh with BYD Long Prismatic cells rated for 8,000 cycles. RGB status display, 1C/1C continuous charge/discharge, PACE Active BMS. 10-year warranty. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-51v-280ah-li-vietnam', slug: 'ziewnic-51v-280ah-li-vietnam',
    brand: 'Ziewnic', model: '51.2V 280AH Lithium Battery (BYD High Capacity)',
    simplified_name: 'Ziewnic 14.4kWh Lithium Battery (BYD High Capacity)',
    category: 'Solar Battery', stock_status: 'In Stock', featured: true,
    warranty: '10 years battery', cash_floor: markup(680000), retail_price: markup(680000),
    specs: {
      'Capacity': '14.4 kWh (51.2V / 280AH)',
      'Cell Type': 'LiFePO4 — BYD Long Prismatic Cells',
      'BMS': 'PACE Active BMS (American Chip)', 'Origin': 'Made in Vietnam',
      'Mounting': 'Wall Mounted', 'Display': 'RGB Status Light',
      'Life Cycle': '8,000 charge cycles (20+ years)', 'Warranty': '10 Years',
      'Voltage': '51.2V', 'Ampere Hours': '280AH', 'Watt Hours': '14,400 Wh (14.4 kWh)',
      'Charge/Discharge': '1C/1C Continuous',
      'Ideal For': 'Large homes, commercial premises, 3-phase systems',
    },
    tags: T('solar battery, lithium battery, lifepo4, byd, 14.4kwh, 14kwh, 280ah, commercial solar, large home'),
    description: 'The Ziewnic 51.2V 280AH lithium battery stores 14.4 kWh — enough to power a large home or small office for 12+ hours off-grid. BYD 280AH Long Prismatic cells, PACE Active BMS. Flagship unit for commercial premises. 10-year warranty. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION B: INVERTERS — ROUX IP54 (European, Made in China)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-roux-ip54-pv7000', slug: 'ziewnic-roux-ip54-pv7000',
    brand: 'Ziewnic', model: 'Roux IP54 PV7000',
    simplified_name: 'Ziewnic 4.7kW Roux IP54 Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(134000), retail_price: markup(134000),
    specs: {
      'Power Output': '4.7 kW', 'Series': 'Roux IP54 (European Version)',
      'Origin': 'Made in China', 'IP Rating': 'IP54 (Dust & Water Resistant)',
      'Casing': 'Aluminium — PCBA replacement warranty, lifetime repairable',
      'PV Input Range': '60–500 VDC',
      'Lithium Activation': 'Yes — lithium battery wake-up start',
      'Wi-Fi': 'Built-in Wi-Fi (iOS/Android monitoring)',
      'Parameters': 'Adjustable via app',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, hybrid inverter, roux, ip54, 4.7kw, 5kw, wifi inverter, lithium compatible'),
    description: 'The Ziewnic Roux IP54 PV7000 is a 4.7kW European-standard solar inverter built with an IP54 aluminium casing for superior dust and water resistance. Features built-in Wi-Fi monitoring, lithium battery activation/wake-up, and adjustable parameters. PCBA replacement warranty ensures lifetime repairability. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-roux-ip54-pv9000', slug: 'ziewnic-roux-ip54-pv9000',
    brand: 'Ziewnic', model: 'Roux IP54 PV9000',
    simplified_name: 'Ziewnic 6.7kW Roux IP54 Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(167000), retail_price: markup(167000),
    specs: {
      'Power Output': '6.7 kW', 'Series': 'Roux IP54 (European Version)',
      'Origin': 'Made in China', 'IP Rating': 'IP54 (Dust & Water Resistant)',
      'Casing': 'Aluminium — PCBA replacement warranty, lifetime repairable',
      'PV Input Range': '60–500 VDC',
      'Lithium Activation': 'Yes — lithium battery wake-up start',
      'Wi-Fi': 'Built-in Wi-Fi (iOS/Android monitoring)',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, hybrid inverter, roux, ip54, 6.7kw, 7kw, wifi inverter, lithium compatible'),
    description: 'The Ziewnic Roux IP54 PV9000 is a 6.7kW European-standard solar inverter with IP54 aluminium casing, built-in Wi-Fi, and lithium battery activation. PCBA replacement warranty ensures lifetime repairability. Ideal for medium-large homes and commercial premises. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-roux-ip54-pv15000', slug: 'ziewnic-roux-ip54-pv15000',
    brand: 'Ziewnic', model: 'Roux IP54 PV15000',
    simplified_name: 'Ziewnic 11.7kW Roux IP54 Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(345000), retail_price: markup(345000),
    specs: {
      'Power Output': '11.7 kW', 'Series': 'Roux IP54 (European Version)',
      'Origin': 'Made in China', 'IP Rating': 'IP54 (Dust & Water Resistant)',
      'Casing': 'Aluminium — PCBA replacement warranty, lifetime repairable',
      'PV Input Range': '60–500 VDC',
      'Lithium Activation': 'Yes — lithium battery wake-up start',
      'Wi-Fi': 'Built-in Wi-Fi (iOS/Android monitoring)',
      'Warranty': '2 Years',
      'Ideal For': 'Large homes, offices, commercial premises',
    },
    tags: T('solar inverter, hybrid inverter, roux, ip54, 11.7kw, 12kw, large system, commercial solar, wifi inverter'),
    description: 'The Ziewnic Roux IP54 PV15000 is an 11.7kW European-standard solar inverter for large homes and commercial installations. IP54 aluminium casing, built-in Wi-Fi, lithium battery activation, and lifetime-repairable PCBA design. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION C: LENOX IP65 INVERTERS
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-lenox-ip65-pv8000', slug: 'ziewnic-lenox-ip65-pv8000',
    brand: 'Ziewnic', model: 'Lenox IP65 PV8000',
    simplified_name: 'Ziewnic 6kW Lenox IP65 Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: true,
    warranty: '2 years inverter', cash_floor: markup(230000), retail_price: markup(230000),
    specs: {
      'Power Output': '6 kW', 'Series': 'Lenox IP65 (European Version)',
      'IP Rating': 'IP65 (Fully Dust-Proof & Water Resistant)',
      'Design': 'First European Version 14 PCBA based inverter — external replaceable',
      'Monitoring': 'End-user monitoring app',
      'Battery Scheduling': '6 time periods for battery charging/discharging',
      'Lithium Compatible': 'Yes — all lithium battery types',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, lenox, ip65, 6kw, waterproof inverter, hybrid inverter, commercial solar, wifi monitoring'),
    description: 'The Ziewnic Lenox IP65 PV8000 is a 6kW fully IP65-rated solar inverter — the first European-version 14 PCBA-based inverter with externally replaceable boards. Features 6 programmable time periods for battery scheduling and end-user monitoring. The gold standard for outdoor and rooftop installations in Karachi\'s harsh climate. Available at Reliance by Tajalli\'s.',
  },
  {
    id: 'ziewnic-lenox-ip65-pv10500', slug: 'ziewnic-lenox-ip65-pv10500',
    brand: 'Ziewnic', model: 'Lenox IP65 PV10500',
    simplified_name: 'Ziewnic 8kW Lenox IP65 Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(320000), retail_price: markup(320000),
    specs: {
      'Power Output': '8 kW', 'Series': 'Lenox IP65 (European Version)',
      'IP Rating': 'IP65 (Fully Dust-Proof & Water Resistant)',
      'Design': '14 PCBA based — external replaceable boards',
      'Monitoring': 'End-user monitoring app',
      'Battery Scheduling': '6 time periods for battery charging/discharging',
      'Ideal For': 'Large homes, offices, commercial buildings',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, lenox, ip65, 8kw, waterproof inverter, hybrid inverter, commercial solar'),
    description: 'The Ziewnic Lenox IP65 PV10500 delivers 8kW with full IP65 waterproofing. Externally replaceable PCBA boards, 6-period battery scheduling, and end-user monitoring. Built for large homes and commercial solar systems. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-lenox-ip65-pv15600', slug: 'ziewnic-lenox-ip65-pv15600',
    brand: 'Ziewnic', model: 'Lenox IP65 PV15600',
    simplified_name: 'Ziewnic 12kW Lenox IP65 Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(580000), retail_price: markup(580000),
    specs: {
      'Power Output': '12 kW', 'Series': 'Lenox IP65 (European Version)',
      'IP Rating': 'IP65 (Fully Dust-Proof & Water Resistant)',
      'Design': '14 PCBA based — external replaceable boards',
      'Monitoring': 'End-user monitoring app',
      'Battery Scheduling': '6 time periods',
      'Ideal For': 'Commercial premises, factories, large offices',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, lenox, ip65, 12kw, waterproof inverter, commercial solar, large system'),
    description: 'The Ziewnic Lenox IP65 PV15600 is a 12kW fully waterproof solar inverter designed for commercial premises and large installations. IP65 rating, 14 externally replaceable PCBA boards, and 6-period battery scheduling. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION D: VOLTRONICS 7th GEN DUAL MPPT
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-voltronics-7g-pv11000', slug: 'ziewnic-voltronics-7g-pv11000',
    brand: 'Ziewnic', model: 'Voltronics 7th Gen Dual MPPT PV11000',
    simplified_name: 'Ziewnic 9kW Voltronics 7th Gen Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: true,
    warranty: '2 years inverter', cash_floor: markup(240000), retail_price: markup(240000),
    specs: {
      'Power Output': '9 kW', 'Series': 'Voltronics 7th Generation (Taiwan)',
      'MPPT': 'Dual MPPT solar charge controller',
      'Chip': 'ST Singapore IGBT/MOSFET',
      'Wi-Fi': 'Built-in (iOS/Android)',
      'Operation': 'Runs with or without battery',
      'Display': 'Colour screen LCD with touch buttons',
      'Battery Charging': 'Up to 160A (AC + Solar combined)',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, voltronics, 7th gen, dual mppt, 9kw, taiwan, wifi, hybrid inverter, color screen'),
    description: 'The Ziewnic Voltronics 7th Gen PV11000 is a genuine 9kW dual MPPT solar inverter engineered in Taiwan with ST Singapore chips. Built-in Wi-Fi monitoring, colour LCD touch screen, and up to 160A battery charging (AC+Solar). Runs with or without battery. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-voltronics-7g-pv14000', slug: 'ziewnic-voltronics-7g-pv14000',
    brand: 'Ziewnic', model: 'Voltronics 7th Gen Dual MPPT PV14000',
    simplified_name: 'Ziewnic 11kW Voltronics 7th Gen Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(305000), retail_price: markup(305000),
    specs: {
      'Power Output': '11 kW', 'Series': 'Voltronics 7th Generation (Taiwan)',
      'MPPT': 'Dual MPPT solar charge controller',
      'Chip': 'ST Singapore IGBT/MOSFET',
      'Wi-Fi': 'Built-in (iOS/Android)',
      'Operation': 'Runs with or without battery',
      'Display': 'Colour screen LCD with touch buttons',
      'Battery Charging': 'Up to 160A (AC + Solar combined)',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, voltronics, 7th gen, dual mppt, 11kw, taiwan, wifi, hybrid inverter, large system'),
    description: 'The Ziewnic Voltronics 7th Gen PV14000 delivers 11kW of power — ideal for large homes and commercial premises. Dual MPPT, ST Singapore chips, built-in Wi-Fi, colour LCD, and 160A battery charging. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION E: VOLTRONICS 6th GEN 3-CHOPPER DUAL PV PORT
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-voltronics-6g-pv4000', slug: 'ziewnic-voltronics-6g-pv4000',
    brand: 'Ziewnic', model: 'Voltronics 6th Gen PV4000',
    simplified_name: 'Ziewnic 3.2kW Voltronics 6th Gen Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(83000), retail_price: markup(83000),
    specs: {
      'Power Output': '3.2 kVA / 3.2 kW', 'Series': 'Voltronics 6th Generation (Taiwan)',
      'Chopper': '3-Chopper design', 'Dual PV Port': 'Yes — parallel 32A',
      'Modes': 'ON / OFF / MKS / KS',
      'Dual Output': 'Heavy load and normal load separate outputs',
      'MOSFET': 'High-efficiency MOSFET',
      'Design': 'European design, engineered in Taiwan',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, voltronics, 6th gen, 3.2kw, 3kw, taiwan, home inverter, small system'),
    description: 'The Ziewnic Voltronics 6th Gen PV4000 is a 3.2kW solar inverter with 3-chopper technology and dual PV port. Features separate heavy and normal load outputs, 4 operating modes, and high-efficiency MOSFET. European design, engineered in Taiwan. Ideal for small homes and apartments. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-voltronics-6g-pv6500', slug: 'ziewnic-voltronics-6g-pv6500',
    brand: 'Ziewnic', model: 'Voltronics 6th Gen PV6500',
    simplified_name: 'Ziewnic 4.5kW Voltronics 6th Gen Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(105000), retail_price: markup(105000),
    specs: {
      'Power Output': '4.5 kW', 'Series': 'Voltronics 6th Generation (Taiwan)',
      'Chopper': '3-Chopper design', 'Dual PV Port': 'Yes — parallel 32A',
      'Modes': 'ON / OFF / MKS / KS', 'MOSFET': 'High-efficiency MOSFET',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, voltronics, 6th gen, 4.5kw, 5kw, taiwan, hybrid inverter'),
    description: 'The Ziewnic Voltronics 6th Gen PV6500 is a 4.5kW solar inverter with 3-chopper technology, dual PV port, and high-efficiency MOSFET. Four operating modes and European-standard design. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-voltronics-6g-pv8500', slug: 'ziewnic-voltronics-6g-pv8500',
    brand: 'Ziewnic', model: 'Voltronics 6th Gen PV8500',
    simplified_name: 'Ziewnic 6.5kW Voltronics 6th Gen Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(125000), retail_price: markup(125000),
    specs: {
      'Power Output': '6.5 kW', 'Series': 'Voltronics 6th Generation (Taiwan)',
      'Chopper': '3-Chopper design', 'Dual PV Port': 'Yes — parallel 32A',
      'Modes': 'ON / OFF / MKS / KS', 'MOSFET': 'High-efficiency MOSFET',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, voltronics, 6th gen, 6.5kw, 7kw, taiwan, hybrid inverter'),
    description: 'The Ziewnic Voltronics 6th Gen PV8500 delivers 6.5kW with 3-chopper technology, dual PV port, and European-standard design. Suitable for medium to large homes. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION F: VOLTRONICS 5th GEN (HIGH PV, SURGE 2x)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-voltronics-5g-pv6500', slug: 'ziewnic-voltronics-5g-pv6500',
    brand: 'Ziewnic', model: 'Voltronics 5th Gen PV6500',
    simplified_name: 'Ziewnic 4.5kW Voltronics 5th Gen Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(113000), retail_price: markup(113000),
    specs: {
      'Power Output': '4.5 kW', 'Series': 'Voltronics 5th Generation (Taiwan)',
      'PV Input Range': '90–550 VDC', 'Surge Capacity': '2x rated power for 5 seconds',
      'Modes': 'ON / OFF / MKS / KS', 'MOSFET': 'High-efficiency MOSFET',
      'Battery Operation': 'Runs with or without battery', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, voltronics, 5th gen, 4.5kw, 5kw, high pv, surge, taiwan'),
    description: 'The Ziewnic Voltronics 5th Gen PV6500 is a 4.5kW solar inverter with high PV input range (90–550V), 2x surge capacity for 5 seconds, and battery-optional operation. Four operating modes and high-efficiency MOSFET. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-voltronics-5g-pv8500', slug: 'ziewnic-voltronics-5g-pv8500',
    brand: 'Ziewnic', model: 'Voltronics 5th Gen PV8500',
    simplified_name: 'Ziewnic 6.5kW Voltronics 5th Gen Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(138000), retail_price: markup(138000),
    specs: {
      'Power Output': '6.5 kW', 'Series': 'Voltronics 5th Generation (Taiwan)',
      'PV Input Range': '90–550 VDC', 'Surge Capacity': '2x rated power for 5 seconds',
      'Modes': 'ON / OFF / MKS / KS', 'MOSFET': 'High-efficiency MOSFET',
      'Settings Restore': '1-button restore factory settings',
      'Battery Operation': 'Runs with or without battery', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, voltronics, 5th gen, 6.5kw, 7kw, high pv, surge, taiwan'),
    description: 'The Ziewnic Voltronics 5th Gen PV8500 delivers 6.5kW with 2x surge capacity, high PV input (90–550V), and 1-button settings restore. Runs with or without battery. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-voltronics-5g-pv13000', slug: 'ziewnic-voltronics-5g-pv13000',
    brand: 'Ziewnic', model: 'Voltronics 5th Gen PV13000',
    simplified_name: 'Ziewnic 10.5kW Voltronics 5th Gen Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(258000), retail_price: markup(258000),
    specs: {
      'Power Output': '10.5 kW', 'Series': 'Voltronics 5th Generation (Taiwan)',
      'PV Input Range': '90–550 VDC', 'Surge Capacity': '2x rated power for 5 seconds',
      'Battery Charging': 'Up to 160A (AC + Solar combined)',
      'Battery Operation': 'Runs with or without battery', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, voltronics, 5th gen, 10.5kw, 11kw, high pv, large system, commercial'),
    description: 'The Ziewnic Voltronics 5th Gen PV13000 is a 10.5kW solar inverter for large homes and commercial premises. High PV range (90–550V), 160A battery charging, and 2x surge capacity. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION G: AXPERT TWIN PREMIUM PLUS (DUAL AC OUTPUT)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-axpert-twin-pv5000', slug: 'ziewnic-axpert-twin-pv5000',
    brand: 'Ziewnic', model: 'Axpert Twin Premium Plus PV5000',
    simplified_name: 'Ziewnic 4.2kW Axpert Twin Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(95000), retail_price: markup(95000),
    specs: {
      'Power Output': '4.2 kW', 'Series': 'Axpert Twin Premium Plus',
      'Dual AC Output': 'Yes — smart load management (2 separate AC outputs)',
      'PV Input Range': '30–450 VDC', 'Max PV Input Current': '18A',
      'Battery Equalization': 'Yes — extends battery life',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, axpert twin, 4.2kw, dual output, smart load, ups, hybrid inverter'),
    description: 'The Ziewnic Axpert Twin Premium Plus PV5000 is a 4.2kW solar inverter with dual AC outputs for intelligent load management — run critical and non-critical loads separately. Includes battery equalization and PV input range of 30–450V. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-axpert-twin-pv7000', slug: 'ziewnic-axpert-twin-pv7000',
    brand: 'Ziewnic', model: 'Axpert Twin Premium Plus PV7000',
    simplified_name: 'Ziewnic 6.2kW Axpert Twin Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(110000), retail_price: markup(110000),
    specs: {
      'Power Output': '6.2 kW', 'Series': 'Axpert Twin Premium Plus',
      'Dual AC Output': 'Yes — smart load management',
      'PV Input Range': '90–450 VDC', 'Max PV Input Current': '28A',
      'Battery Equalization': 'Yes', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, axpert twin, 6.2kw, dual output, smart load, hybrid inverter'),
    description: 'The Ziewnic Axpert Twin Premium Plus PV7000 is a 6.2kW solar inverter with dual AC outputs (smart load management). 28A PV input current, battery equalization, and 90–450V PV range. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION H: PARALLEL SERIES (DUAL AC SOURCES)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-parallel-pv10000', slug: 'ziewnic-parallel-pv10000',
    brand: 'Ziewnic', model: 'Parallel Series PV10000',
    simplified_name: 'Ziewnic 8kW Parallel Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(255000), retail_price: markup(255000),
    specs: {
      'Power Output': '8 kW', 'Series': 'Parallel Series',
      'Dual AC Sources': 'Yes — two independent AC sources with auto-switching',
      'Max Battery Charging': '150A',
      'Connectivity': 'RS485 / CAN-BUS / RS232 for BMS',
      'External BTS': 'Yes — battery temperature sensor support',
      'Battery Equalization': 'Yes', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, parallel inverter, 8kw, dual ac, bms, rs485, canbus, commercial solar'),
    description: 'The Ziewnic Parallel Series PV10000 is an 8kW solar inverter with two independent AC sources that auto-switch. Supports RS485/CAN-BUS/RS232 BMS connectivity, external battery temperature sensor, and 150A max charging. Ideal for critical commercial applications. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-parallel-pv12000', slug: 'ziewnic-parallel-pv12000',
    brand: 'Ziewnic', model: 'Parallel Series PV12000',
    simplified_name: 'Ziewnic 11kW Parallel Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(295000), retail_price: markup(295000),
    specs: {
      'Power Output': '11 kW', 'Series': 'Parallel Series',
      'Dual AC Sources': 'Yes — two independent AC sources with auto-switching',
      'Max Battery Charging': '150A',
      'Connectivity': 'RS485 / CAN-BUS / RS232 for BMS',
      'External BTS': 'Yes', 'Battery Equalization': 'Yes', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, parallel inverter, 11kw, dual ac, bms, commercial solar, large system'),
    description: 'The Ziewnic Parallel Series PV12000 is an 11kW dual-AC-source solar inverter with auto-switching, BMS connectivity, and 150A battery charging. For large commercial solar installations. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION I: DUAL SERIES (Wi-Fi, 100A MPPT)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-dual-pv2500', slug: 'ziewnic-dual-pv2500',
    brand: 'Ziewnic', model: 'Dual Series PV2500',
    simplified_name: 'Ziewnic 1.6kW Dual MPPT Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(70000), retail_price: markup(70000),
    specs: {
      'Power Output': '1.6 kW', 'Series': 'Dual Series (100A MPPT)',
      'Wi-Fi': 'Optional — iOS/Android monitoring',
      'Conformal Coating': 'Yes — dust and humidity protection',
      'Lithium Compatible': 'Yes — all lithium types',
      'MPPT Charge Controller': '100A solar charge controller',
      'Output': 'Pure sine wave',
      'Display': 'Colour screen LCD with touch buttons',
      'Connectivity': 'RS485 / CAN monitoring', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, dual mppt, 1.6kw, small system, wifi, lithium, pure sine wave, ups'),
    description: 'The Ziewnic Dual PV2500 is a 1.6kW solar inverter with 100A MPPT, pure sine wave output, and conformal coating for dust/humidity resistance. Optional Wi-Fi monitoring and RS485/CAN connectivity. Ideal for small apartments and office UPS. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-dual-pv5000', slug: 'ziewnic-dual-pv5000',
    brand: 'Ziewnic', model: 'Dual Series PV5000',
    simplified_name: 'Ziewnic 3.5kW Dual MPPT Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(95000), retail_price: markup(95000),
    specs: {
      'Power Output': '3.5 kW', 'Series': 'Dual Series (100A MPPT)',
      'Wi-Fi': 'Optional', 'Conformal Coating': 'Yes',
      'Lithium Compatible': 'Yes', 'MPPT Charge Controller': '100A',
      'Output': 'Pure sine wave', 'Connectivity': 'RS485 / CAN monitoring', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, dual mppt, 3.5kw, wifi, lithium, pure sine wave, home inverter'),
    description: 'The Ziewnic Dual PV5000 is a 3.5kW solar inverter with 100A MPPT, pure sine wave, and RS485/CAN monitoring. Optional Wi-Fi and conformal coating. Suitable for 2-3 bedroom homes. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-dual-pv7000', slug: 'ziewnic-dual-pv7000',
    brand: 'Ziewnic', model: 'Dual Series PV7000',
    simplified_name: 'Ziewnic 5.5kW Dual MPPT Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(110000), retail_price: markup(110000),
    specs: {
      'Power Output': '5.5 kW', 'Series': 'Dual Series (100A MPPT)',
      'Wi-Fi': 'Optional', 'Conformal Coating': 'Yes',
      'Lithium Compatible': 'Yes', 'MPPT Charge Controller': '100A',
      'Battery Charging': 'Up to 160A (AC + Solar combined)',
      'Output': 'Pure sine wave', 'Connectivity': 'RS485 / CAN monitoring', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, dual mppt, 5.5kw, 6kw, wifi, lithium, pure sine wave, hybrid inverter'),
    description: 'The Ziewnic Dual PV7000 is a 5.5kW solar inverter with 100A MPPT, 160A battery charging, conformal coating, and optional Wi-Fi. RS485/CAN monitoring. Suitable for 3-4 bedroom homes. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION J: 6th GEN BASIC (PV3000 / PV4500)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-6g-basic-pv3000', slug: 'ziewnic-6g-basic-pv3000',
    brand: 'Ziewnic', model: 'Voltronics 6th Gen Basic PV3000',
    simplified_name: 'Ziewnic 2.2kW Voltronics 6th Gen Basic Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(67000), retail_price: markup(67000),
    specs: {
      'Power Output': '2.2 kVA / 2.2 kW', 'Series': 'Voltronics 6th Gen Basic (Taiwan)',
      'MOSFET': 'High-efficiency MOSFET', 'Chopper': 'Bigger chopper design',
      'Output': '100% pure sine wave', 'Real-Time Sharing': '98% real-time sharing',
      'Max PV Input Current': '18A', 'Wi-Fi': 'Optional (iOS/Android)',
      'Design': 'Designed and engineered in Taiwan', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, voltronics, 6th gen, 2.2kw, 2kw, basic, pure sine wave, ups, small home'),
    description: 'The Ziewnic Voltronics 6th Gen Basic PV3000 is a 2.2kW pure sine wave solar inverter designed for small homes and apartments. 98% real-time sharing efficiency, optional Wi-Fi monitoring, engineered in Taiwan. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-6g-basic-pv4500', slug: 'ziewnic-6g-basic-pv4500',
    brand: 'Ziewnic', model: 'Voltronics 6th Gen Basic PV4500',
    simplified_name: 'Ziewnic 3.2kW Voltronics 6th Gen Basic Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(77000), retail_price: markup(77000),
    specs: {
      'Power Output': '3.2 kVA / 3.2 kW', 'Series': 'Voltronics 6th Gen Basic (Taiwan)',
      'MOSFET': 'High-efficiency MOSFET', 'Output': '100% pure sine wave',
      'Real-Time Sharing': '98% real-time sharing', 'Wi-Fi': 'Optional', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, voltronics, 6th gen, 3.2kw, 3kw, basic, pure sine wave, ups'),
    description: 'The Ziewnic Voltronics 6th Gen Basic PV4500 is a 3.2kW pure sine wave solar inverter. 98% efficiency, optional Wi-Fi, engineered in Taiwan. Suitable for small to medium homes. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION K: HYBRID PARALLEL (Marvel 5G / Z6 European)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-marvel-5g-pv8500', slug: 'ziewnic-marvel-5g-pv8500',
    brand: 'Ziewnic', model: 'Marvel 5G European PV8500',
    simplified_name: 'Ziewnic 7kW Marvel 5G Hybrid Parallel Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: true,
    warranty: '2 years inverter', cash_floor: markup(145000), retail_price: markup(145000),
    specs: {
      'Power Output': '7 kVA / 7 kW', 'Series': 'Marvel 5G (5th Gen European Hybrid)',
      'Parallel': 'Three-phase when paralleled — up to 12 units',
      'Dual MPPT': '8500W MPPT charge controller (160A)',
      'Grid-Tied': 'Yes — net metering with 100% reverse grid feeding',
      'Wi-Fi': 'Optional', 'Records': 'Energy, load, and fault logs',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, hybrid inverter, marvel, 5g, 7kw, parallel, net metering, grid tied, 3 phase, commercial'),
    description: 'The Ziewnic Marvel 5G European PV8500 is a 7kW 5th-gen European hybrid inverter that can be paralleled up to 12 units for three-phase operation. Features dual MPPT (160A), grid-tied net metering with 100% reverse feeding, and energy/fault logging. Ideal for commercial and large residential solar systems. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-z6-european-pv8500', slug: 'ziewnic-z6-european-pv8500',
    brand: 'Ziewnic', model: 'Z6 European PV8500',
    simplified_name: 'Ziewnic 7kW Z6 European Hybrid Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(145000), retail_price: markup(145000),
    specs: {
      'Power Output': '7 kVA / 7 kW', 'Series': 'Z6 European (Single/Three-Phase Parallel)',
      'Parallel': 'Three-phase when paralleled — up to 9 units',
      'Dual MPPT': '8500W MPPT charge controller (160A)',
      'Wi-Fi': 'Built-in (10m range, Android)',
      'Operation': 'Runs with or without battery',
      'BMS': 'Built-in battery equalization and BMS',
      'Battery Equalization': 'Yes', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, hybrid inverter, z6, european, 7kw, parallel, built-in wifi, bms, 3 phase'),
    description: 'The Ziewnic Z6 European PV8500 is a 7kW hybrid inverter with built-in Wi-Fi, dual MPPT (160A), and parallel capability for up to 9 units in three-phase. Runs with or without battery, with built-in BMS and battery equalization. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION L: SOLAR CONVERTERS (Grid-Tied / On-Off Grid)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-converter-pv7000', slug: 'ziewnic-converter-pv7000',
    brand: 'Ziewnic', model: 'Solar Converter PV7000',
    simplified_name: 'Ziewnic 5kW Solar Converter (Grid-Tied)',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(42000), retail_price: markup(42000),
    specs: {
      'Power Output': '5 kW', 'Series': 'Solar Converter (Made in Taiwan)',
      'Type': 'On/Off Grid Solar Converter',
      'Special': 'First in Pakistan: supports 1000W panel input',
      'Output': 'Pure sine wave',
      'MPPT': 'Built-in high-efficiency MPPT, Dual MPPT',
      'PV Input Range': '60–500 VDC', 'Display': 'Single LCD interface',
      'Battery Required': 'No — runs without battery',
      'Panel Types': 'Supports TOPCon / HJT / HIMO10 / standard panels',
      'Warranty': '2 Years',
    },
    tags: T('solar inverter, grid tied, solar converter, 5kw, on grid, no battery, dual mppt, topcon, hjt'),
    description: 'The Ziewnic Solar Converter PV7000 is a 5kW on/off-grid solar converter — the first in Pakistan to support 1000W panel input. Dual MPPT, pure sine wave, compatible with TOPCon/HJT/HIMO10 panels. Runs without battery, making it a cost-effective entry into solar. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-converter-pv10000', slug: 'ziewnic-converter-pv10000',
    brand: 'Ziewnic', model: 'Solar Converter PV10000',
    simplified_name: 'Ziewnic 7kW Solar Converter (Grid-Tied)',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(52000), retail_price: markup(52000),
    specs: {
      'Power Output': '7 kW', 'Series': 'Solar Converter (Made in Taiwan)',
      'Type': 'On/Off Grid — feedback to grid supported',
      'Wi-Fi': 'Optional', 'MPPT': 'Built-in high-efficiency MPPT',
      'Fast Islanding': 'Yes — fast islanding response',
      'Panel Types': 'TOPCon / HJT / HIMO10 / standard',
      'Battery Required': 'No', 'Dust Screen': 'Easy replacement', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, grid tied, solar converter, 7kw, on grid, net metering, no battery, topcon'),
    description: 'The Ziewnic Solar Converter PV10000 is a 7kW on/off-grid solar converter with fast islanding response and grid-feedback capability. Optional Wi-Fi, easy dust screen replacement, and TOPCon/HJT panel support. Runs without battery. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION M: ROUX LITE 6th GEN (Made in Taiwan)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-roux-lite-pv6000', slug: 'ziewnic-roux-lite-pv6000',
    brand: 'Ziewnic', model: 'Roux Lite PV6000',
    simplified_name: 'Ziewnic 4.2kW Roux Lite Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(115000), retail_price: markup(115000),
    specs: {
      'Power Output': '4.2 kW', 'Series': 'Roux Lite 6th Gen (Made in Taiwan)',
      'Modes': 'ON / OFF / MKS / KS',
      'PV Input Range': '60–500 VDC', 'Power Factor': 'PF 1.0',
      'Battery Charging': 'Up to 220A (AC + Solar combined)',
      'Operation': 'Runs with or without battery',
      'Fault Codes': '25 fault codes for easy troubleshooting',
      'Generator Compatible': 'Yes', 'Surge Capacity': '2x for 5 seconds',
      'Overload Protection': '120%', 'Grid-Tied': 'Net metering supported',
      'European Standard': 'Yes', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, roux lite, 4.2kw, 5kw, taiwan, net metering, generator, 220a charging, hybrid'),
    description: 'The Ziewnic Roux Lite PV6000 is a 4.2kW 6th-gen solar inverter made in Taiwan. Features 220A battery charging (AC+Solar), 4 operating modes, net metering, generator compatibility, and 25-fault diagnostic codes. PF 1.0, 2x surge, 120% overload protection. European standard. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-roux-lite-pv8000', slug: 'ziewnic-roux-lite-pv8000',
    brand: 'Ziewnic', model: 'Roux Lite PV8000',
    simplified_name: 'Ziewnic 6.2kW Roux Lite Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(135000), retail_price: markup(135000),
    specs: {
      'Power Output': '6.2 kW', 'Series': 'Roux Lite 6th Gen (Made in Taiwan)',
      'Modes': 'ON / OFF / MKS / KS',
      'PV Input Range': '60–500 VDC', 'Power Factor': 'PF 1.0',
      'Battery Charging': 'Up to 220A (AC + Solar combined)',
      'Electronic Breaker': 'Built-in auto electronic breaker',
      'Display': 'Colour screen LCD with touch buttons',
      'Dust Protection': 'Anti-dust design',
      'Lithium Compatible': 'Yes — all lithium types',
      'Real-Time Sharing': '98% efficiency', 'Overload Protection': '120%',
      'Grid-Tied': 'Net metering supported', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, roux lite, 6.2kw, 6kw, taiwan, net metering, 220a charging, color screen, hybrid'),
    description: 'The Ziewnic Roux Lite PV8000 is a 6.2kW 6th-gen solar inverter made in Taiwan. Colour LCD touch display, auto electronic breaker, 220A charging, net metering, anti-dust design, and 98% real-time efficiency. European standard. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION N: ROUX MINI IP54 (Made in Taiwan)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-roux-mini-ip54-pv5000', slug: 'ziewnic-roux-mini-ip54-pv5000',
    brand: 'Ziewnic', model: 'Roux Mini IP54 PV5000',
    simplified_name: 'Ziewnic 3.5kW Roux Mini IP54 Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(85000), retail_price: markup(85000),
    specs: {
      'Power Output': '3.5 kW', 'Series': 'Roux Mini IP54 (Made in Taiwan)',
      'IP Rating': 'IP54 (Dust & Water Resistant)',
      'Modes': 'ON / OFF / MKS / KS', 'PV Input Range': '60–500 VDC',
      'Power Factor': 'PF 1.0', 'Battery Charging': 'Up to 220A (AC + Solar)',
      'Fault Codes': '25 fault codes', 'Operation': 'Runs with or without battery',
      'Surge Capacity': '2x for 5 seconds', 'Max PV Input': '4500W',
      'MPPT Charge Controller': '80A', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, roux mini, ip54, 3.5kw, waterproof, taiwan, small system, hybrid inverter'),
    description: 'The Ziewnic Roux Mini IP54 PV5000 is a compact 3.5kW IP54-rated solar inverter made in Taiwan. 80A MPPT, 220A battery charging, 4 operating modes, and 2x surge capacity. Dust and water resistant — ideal for rooftop and outdoor installations. Available at Reliance by Tajalli\'s, Karachi.',
  },

  // ═══════════════════════════════════════════════════════════
  // SECTION O: IP54 DUAL MPPT HIGH-POWER (Made in Taiwan)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'ziewnic-dual-mppt-ip54-pv12000', slug: 'ziewnic-dual-mppt-ip54-pv12000',
    brand: 'Ziewnic', model: 'Dual MPPT IP54 PV12000',
    simplified_name: 'Ziewnic 8.5kW Dual MPPT IP54 Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(250000), retail_price: markup(250000),
    specs: {
      'Power Output': '8.5 kW', 'Series': 'Dual MPPT IP54 High Power (Made in Taiwan)',
      'IP Rating': 'IP54 (Dust & Water Resistant)',
      'Generation': 'Real 6th Gen', 'MOSFET': 'High-efficiency MOSFET',
      'Chopper': 'Bigger chopper', 'Modes': 'ON / OFF / MKS / KS',
      'Surge Capacity': '2x for 5 seconds', 'PV Input Range': '90–550 VDC',
      'Settings Restore': '1-button restore factory settings', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, dual mppt, ip54, 8.5kw, 9kw, 6th gen, waterproof, taiwan, large system'),
    description: 'The Ziewnic Dual MPPT IP54 PV12000 is an 8.5kW 6th-gen solar inverter with IP54 weatherproofing, high PV range (90–550V), 2x surge, and 1-button factory restore. Made in Taiwan. Available at Reliance by Tajalli\'s, Karachi.',
  },
  {
    id: 'ziewnic-dual-mppt-ip54-pv15000', slug: 'ziewnic-dual-mppt-ip54-pv15000',
    brand: 'Ziewnic', model: 'Dual MPPT IP54 PV15000',
    simplified_name: 'Ziewnic 10.5kW Dual MPPT IP54 Solar Inverter',
    category: 'Solar Inverter', stock_status: 'In Stock', featured: false,
    warranty: '2 years inverter', cash_floor: markup(310000), retail_price: markup(310000),
    specs: {
      'Power Output': '10.5 kW', 'Series': 'Dual MPPT IP54 High Power (Made in Taiwan)',
      'IP Rating': 'IP54 (Dust & Water Resistant)',
      'Generation': 'Real 6th Gen', 'MOSFET': 'High-efficiency MOSFET',
      'Modes': 'ON / OFF / MKS / KS', 'Surge Capacity': '2x for 5 seconds',
      'PV Input Range': '90–550 VDC',
      'Battery Charging': 'Up to 160A (AC + Solar combined)', 'Warranty': '2 Years',
    },
    tags: T('solar inverter, dual mppt, ip54, 10.5kw, 11kw, 6th gen, waterproof, taiwan, large system, commercial'),
    description: 'The Ziewnic Dual MPPT IP54 PV15000 is a 10.5kW 6th-gen IP54 solar inverter made in Taiwan. 90–550V PV range, 160A battery charging, 2x surge, high-efficiency MOSFET. For large homes and commercial solar systems. Available at Reliance by Tajalli\'s, Karachi.',
  },
];

async function run() {
  const { error: authErr } = await sb.auth.signInWithPassword({
    email: 'tajallisautomation@gmail.com',
    password: 'Hammad123!',
  });
  if (authErr) { console.error('Auth failed:', authErr.message); return; }
  console.log('Authenticated OK\n');

  let ok = 0; let fail = 0;
  for (const prod of products) {
    const { error } = await sb.from('products').upsert(prod, { onConflict: 'id' });
    if (error) { console.error(`FAIL  ${prod.id}: ${error.message}`); fail++; }
    else { console.log(`OK    ${prod.simplified_name} — PKR ${prod.cash_floor.toLocaleString()}`); ok++; }
  }
  console.log(`\n${ok} OK  ${fail} FAIL  (${products.length} total)`);
}
run().catch(console.error);

import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);

const p = price => Math.round(price * 1.1 / 500) * 500;

const batteries = [
  {
    id: 'ziewnic-25v-100ah-li-china',
    brand: 'Ziewnic', model: '25.6V 100AH Lithium Battery (China)',
    simplified_name: 'Ziewnic 2.56kWh Lithium Battery',
    category: 'Solar Battery', stock_status: 'In Stock', warranty: '6 years battery',
    cash_floor: p(134000), retail_price: p(134000),
    specs: {
      'Capacity': '2.56 kWh (25.6V 100AH)', 'Cell Type': 'LiFePO4 — CATL / BYD / Gotion',
      'Origin': 'Made in China', 'Mounting': 'Wall Mounted', 'Display': 'Large LCD',
      'Life Cycle': '12+ years design life', 'Warranty': '6 Years',
      'Voltage': '25.6V', 'Ampere Hours': '100AH', 'Watt Hours': '2,560 Wh (2.56 kWh)',
      'Protection': 'Over-Voltage, Over-Current, Over-Temperature, Short Circuit',
      'Compatible': 'All major solar inverters',
    },
    tags: 'ziewnic, solar battery, lithium battery, lifepo4, 2.56kwh, solar, karachi, pakistan, reliance appliances, installment, battery backup, loadshedding',
    description: 'The Ziewnic 25.6V 100AH LiFePO4 lithium battery stores 2.56 kWh of solar energy, providing reliable backup power during loadshedding. Built with top-brand cells (CATL/BYD/Gotion) and a large LCD status display. Wall-mounted for space efficiency. 6-year warranty. Available at Reliance by Tajalli\'s, Karachi.',
    featured: false,
  },
  {
    id: 'ziewnic-51v-100ah-li-china',
    brand: 'Ziewnic', model: '51.2V 100AH Lithium Battery (China)',
    simplified_name: 'Ziewnic 5.12kWh Lithium Battery',
    category: 'Solar Battery', stock_status: 'In Stock', warranty: '6 years battery',
    cash_floor: p(223000), retail_price: p(223000),
    specs: {
      'Capacity': '5.12 kWh (51.2V 100AH)', 'Cell Type': 'LiFePO4 — CATL / BYD / Gotion',
      'Origin': 'Made in China', 'Mounting': 'Wall Mounted', 'Display': 'Large LCD',
      'Life Cycle': '12+ years design life', 'Warranty': '6 Years',
      'Voltage': '51.2V', 'Ampere Hours': '100AH', 'Watt Hours': '5,120 Wh (5.12 kWh)',
      'Protection': 'Over-Voltage, Over-Current, Over-Temperature, Short Circuit',
      'Compatible': 'All major solar inverters',
    },
    tags: 'ziewnic, solar battery, lithium battery, lifepo4, 5.12kwh, 48v, solar, karachi, pakistan, reliance appliances, installment, battery backup, loadshedding',
    description: 'The Ziewnic 51.2V 100AH LiFePO4 lithium battery stores 5.12 kWh — enough to run a home through extended loadshedding. Premium CATL/BYD/Gotion cells, large LCD display, wall-mounted compact design. 6-year warranty. Available at Reliance by Tajalli\'s, Karachi.',
    featured: false,
  },
  {
    id: 'ziewnic-12v-100ah-li-vietnam',
    brand: 'Ziewnic', model: '12.8V 100AH Lithium Battery (Vietnam)',
    simplified_name: 'Ziewnic 1.28kWh Lithium Battery (BYD)',
    category: 'Solar Battery', stock_status: 'In Stock', warranty: '10 years battery',
    cash_floor: p(62000), retail_price: p(62000),
    specs: {
      'Capacity': '1.28 kWh (12.8V 100AH)', 'Cell Type': 'LiFePO4 — BYD Long Prismatic Cells',
      'BMS': 'PACE Active BMS (American Chip)', 'Origin': 'Made in Vietnam',
      'Life Cycle': '8,000 charge cycles (20+ years effective life)', 'Warranty': '10 Years',
      'Voltage': '12.8V', 'Ampere Hours': '100AH', 'Watt Hours': '1,280 Wh (1.28 kWh)',
      'Full Charge Voltage': '14.6V', 'Discharge Cut-Off': '10V',
      'Connections': 'Supports series and parallel connection',
      'Protection': 'Over-temp, short circuit, over-voltage, over-current',
    },
    tags: 'ziewnic, solar battery, lithium battery, lifepo4, byd, 1.28kwh, 12v, solar, karachi, pakistan, reliance appliances, installment, battery backup',
    description: 'The Ziewnic 12.8V 100AH lithium battery uses genuine BYD Long Prismatic cells and a PACE Active BMS rated for 8,000 cycles (20+ years). Supports series and parallel connection. 10-year warranty. Ideal for home UPS and solar backup in Karachi.',
    featured: false,
  },
  {
    id: 'ziewnic-25v-100ah-li-vietnam',
    brand: 'Ziewnic', model: '25.6V 100AH Lithium Battery (Vietnam)',
    simplified_name: 'Ziewnic 2.56kWh Lithium Battery (BYD Premium)',
    category: 'Solar Battery', stock_status: 'In Stock', warranty: '10 years battery',
    cash_floor: p(163000), retail_price: p(163000),
    specs: {
      'Capacity': '2.56 kWh (25.6V 100AH)', 'Cell Type': 'LiFePO4 — BYD Long Prismatic Cells',
      'BMS': 'PACE Active BMS (American Chip)', 'Origin': 'Made in Vietnam',
      'Mounting': 'Wall Mounted', 'Display': 'RGB Status Light',
      'Life Cycle': '8,000 charge cycles (20+ years effective life)', 'Warranty': '10 Years',
      'Voltage': '25.6V', 'Ampere Hours': '100AH', 'Watt Hours': '2,560 Wh (2.56 kWh)',
      'Charge/Discharge': '1C/1C Continuous',
      'Protection': 'Over-Temp, Over-Voltage, Over-Current, Short Circuit',
    },
    tags: 'ziewnic, solar battery, lithium battery, lifepo4, byd premium, 2.56kwh, solar, karachi, pakistan, reliance appliances, installment, battery backup',
    description: 'The Ziewnic 25.6V 100AH Premium battery uses genuine BYD Long Prismatic cells and PACE Active BMS — 8,000 cycles, 20+ years design life. Wall-mounted, RGB status display. 10-year warranty, one of the most durable solar batteries in Pakistan.',
    featured: false,
  },
  {
    id: 'ziewnic-51v-100ah-li-vietnam',
    brand: 'Ziewnic', model: '51.2V 100AH Lithium Battery (Vietnam)',
    simplified_name: 'Ziewnic 5.12kWh Lithium Battery (BYD Premium)',
    category: 'Solar Battery', stock_status: 'In Stock', warranty: '10 years battery',
    cash_floor: p(258000), retail_price: p(258000),
    specs: {
      'Capacity': '5.12 kWh (51.2V 100AH)', 'Cell Type': 'LiFePO4 — BYD Long Prismatic Cells',
      'BMS': 'PACE Active BMS (American Chip)', 'Origin': 'Made in Vietnam',
      'Mounting': 'Wall Mounted', 'Display': 'RGB Status Light',
      'Life Cycle': '8,000 charge cycles (20+ years effective life)', 'Warranty': '10 Years',
      'Voltage': '51.2V', 'Ampere Hours': '100AH', 'Watt Hours': '5,120 Wh (5.12 kWh)',
      'Charge/Discharge': '1C/1C Continuous',
      'Protection': 'Over-Temp, Over-Voltage, Over-Current, Short Circuit',
    },
    tags: 'ziewnic, solar battery, lithium battery, lifepo4, byd premium, 5.12kwh, 48v, solar, karachi, pakistan, reliance appliances, installment, battery backup',
    description: 'The Ziewnic 51.2V 100AH Premium lithium battery delivers 5.12 kWh with BYD Long Prismatic cells rated for 8,000 cycles. RGB status display, 1C/1C continuous charge/discharge, PACE Active BMS. 10-year warranty. Available at Reliance by Tajalli\'s, Karachi.',
    featured: false,
  },
  {
    id: 'ziewnic-51v-280ah-li-vietnam',
    brand: 'Ziewnic', model: '51.2V 280AH Lithium Battery (Vietnam)',
    simplified_name: 'Ziewnic 14.4kWh Lithium Battery (BYD High Capacity)',
    category: 'Solar Battery', stock_status: 'In Stock', warranty: '10 years battery',
    cash_floor: p(680000), retail_price: p(680000),
    specs: {
      'Capacity': '14.4 kWh (51.2V 280AH)', 'Cell Type': 'LiFePO4 — BYD Long Prismatic Cells',
      'BMS': 'PACE Active BMS (American Chip)', 'Origin': 'Made in Vietnam',
      'Mounting': 'Wall Mounted', 'Display': 'RGB Status Light',
      'Life Cycle': '8,000 charge cycles (20+ years effective life)', 'Warranty': '10 Years',
      'Voltage': '51.2V', 'Ampere Hours': '280AH', 'Watt Hours': '14,400 Wh (14.4 kWh)',
      'Charge/Discharge': '1C/1C Continuous',
      'Ideal For': 'Large homes, commercial premises, 3-phase systems',
    },
    tags: 'ziewnic, solar battery, lithium battery, lifepo4, byd, 14.4kwh, 14kwh, 280ah, commercial solar, solar, karachi, pakistan, reliance appliances, battery backup',
    description: 'The Ziewnic 51.2V 280AH lithium battery stores 14.4 kWh — enough to power an entire home or small office for 12+ hours off-grid. BYD 280AH Long Prismatic cells with PACE Active BMS. Flagship high-capacity unit for large homes and commercial premises. 10-year warranty. Available at Reliance by Tajalli\'s, Karachi.',
    featured: true,
  },
];

async function run() {
  const { error: authErr } = await sb.auth.signInWithPassword({
    email: 'tajallisautomation@gmail.com',
    password: 'Hammad123!',
  });
  if (authErr) { console.error('Auth failed:', authErr.message); return; }
  console.log('Authenticated OK');

  for (const prod of batteries) {
    const { error } = await sb.from('products').upsert(prod, { onConflict: 'id' });
    if (error) console.error(`FAIL ${prod.id}:`, error.message);
    else console.log(`OK  ${prod.id} — PKR ${prod.cash_floor.toLocaleString()}`);
  }
  console.log('\nBatch 1 (batteries) complete.');
}
run().catch(console.error);

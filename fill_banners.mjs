import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://fdfjavyopbrfvwtjaerw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto'
);
await sb.auth.signInWithPassword({ email: 'tajallisautomation@gmail.com', password: 'Hammad123!' });

const banners = [
  {
    id: 1,
    active: true,
    theme: 'orange',
    badge: 'Summer Ready',
    title: 'Beat the Heat — Inverter ACs from PKR 104,000',
    subtitle: 'Haier, Dawlance, Gree, EcoStar & more. Cash or easy installments. Free delivery & installation in Karachi.',
    cta: 'Shop Air Conditioners',
    ctaLink: '/products/category/1-ton-air-conditioners',
  },
  {
    id: 2,
    active: true,
    theme: 'dark',
    badge: 'Easy Installments',
    title: 'Own Any Appliance — Pay in 2 to 12 Months',
    subtitle: 'No bank account needed. No credit check. No hidden charges. Just easy monthly payments.',
    cta: 'See Installment Plans',
    ctaLink: '/installments',
  },
  {
    id: 3,
    active: true,
    theme: 'blue',
    badge: 'Refrigerators',
    title: 'Premium Refrigerators — Inverter & Glass Door',
    subtitle: 'Haier, Dawlance & more. Frost-free, inverter compressor, and glass door models in stock.',
    cta: 'Browse Refrigerators',
    ctaLink: '/products/category/large-refrigerators',
  },
  {
    id: 4,
    active: true,
    theme: 'green',
    badge: 'Go Solar',
    title: 'Cut Your Electricity Bill by Up to 80%',
    subtitle: 'Solar panels, inverters & batteries — all on installments. Free consultation included.',
    cta: 'Calculate Your Savings',
    ctaLink: '/solar-calculator',
  },
  {
    id: 5,
    active: true,
    theme: 'teal',
    badge: 'Free Service',
    title: 'Free Delivery & Installation in Karachi',
    subtitle: 'Every purchase includes professional delivery, setup and a post-installation follow-up call.',
    cta: 'Shop Now',
    ctaLink: '/products',
  },
];

const { error } = await sb.from('site_settings')
  .upsert({ key: 'offer_banners', value: JSON.stringify(banners) }, { onConflict: 'key' });

if (error) console.error('Error:', error);
else console.log('✓ Banners saved successfully — 5 banners active');

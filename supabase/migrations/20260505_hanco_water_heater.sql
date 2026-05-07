-- ============================================================
-- Product: Hanco HEG-50L 50L Solar-Compatible Electric Water Heater
-- Date:    2026-05-05
-- Source:  hanco.pk (official product page)
-- Run in:  Supabase SQL Editor
-- ============================================================

INSERT INTO public.products (
  id,
  slug,

  -- Identity
  brand,
  model,
  simplified_name,

  -- Taxonomy
  category,
  original_category,
  sub_category,
  normalized_category,
  normalized_subcategory,
  category_family,
  comparison_group,
  frontend_browse_group,
  seo_category_slug,
  seo_subcategory_slug,
  taxonomy_status,

  -- Content
  description,
  specs,
  tags,
  colors,

  -- Pricing (PKR)
  retail_price,
  cash_floor,
  min_price,

  -- Warranty & stock
  warranty,
  stock_status,
  featured,

  -- Images (placeholder; update via Admin Portal when images are sourced)
  thumbnail_url,
  gallery_urls,

  -- SEO
  seo_title,
  seo_desc,
  seo_keywords,

  -- Solar compatibility (appliance — not a solar system component)
  system_role,
  compatibility_status,
  compatibility_notes,
  requires_compatibility_review,

  import_date,
  updated_at
)
VALUES (
  'hanco-heg-50l',
  'hanco-heg-50l-solar-electric-water-heater',

  -- Identity
  'Hanco',
  'HEG-50L',
  'Hanco 50L Solar Electric Water Heater',

  -- Taxonomy
  'Electric Water Heaters',
  'Electric Water Heaters',
  'Geysers',
  'Small Appliances',
  'Home & Heating Appliances',
  'small',
  'electric-water-heaters',
  'small',
  'small-appliances',
  'electric-water-heaters',
  'live',

  -- Description
  E'The Hanco HEG-50L is a 50-litre semi-instant electric water heater built for Pakistani households dealing with load shedding and rising electricity costs. Its defining feature is solar compatibility: connect it directly to your existing solar inverter and run it on clean energy during daylight hours — no additional hardware required.\n\nAdjustable Wattage Control lets you choose between three power settings (800W, 1200W, or 2000W) to match whatever energy source is available. Use 800W on a smaller inverter or during peak solar hours, and step up to 2000W on the grid for fast heating when you need it quickly.\n\nThe tank uses an Incoloy 840 nickel-chromium alloy heating element that resists oxidation, corrosion, and limescale far better than the standard copper elements found in cheaper units, extending service life significantly. High-density insulation surrounds the tank to retain heat for long periods, cutting down on reheating cycles and saving energy.\n\nRated IPX4 splash-proof with a 0.8 MPa (8 bar) pressure rating, this unit handles the high water pressures common in high-rise buildings and multi-storey homes without issue.\n\nFour safety systems are built in: dry-heat cutoff protects the element if the tank runs empty, an over-pressure relief valve prevents tank rupture, an overheat cutoff engages if the thermostat fails, and Class I grounded enclosure guards against electric shock.\n\nAvailable in Silver and White. Backed by a 2-year leakage warranty from Hanco.',

  -- Specs (jsonb)
  '{
    "Capacity":        "50 Litres",
    "Power Settings":  "800W / 1200W / 2000W (Adjustable)",
    "Voltage":         "220–240V AC",
    "Frequency":       "50 Hz",
    "Pressure Rating": "0.8 MPa (8 Bar)",
    "Waterproof Grade":"IPX4",
    "Heating Element": "Incoloy 840 (Nickel-Chromium Alloy)",
    "Solar Compatible":"Yes",
    "Safety Features": "Dry Heat Protection, Over-Pressure Relief, Overheat Cutoff, Class I Electric Shock Protection",
    "Colors":          "Silver, White"
  }'::jsonb,

  -- Tags
  'water heater, geyser, electric geyser, solar geyser, solar compatible water heater, 50 litre geyser, hanco, heg-50l, load shedding, energy saving',

  -- Colors
  'Silver, White',

  -- Pricing (PKR)
  27150,
  27150,
  27150,

  -- Warranty & stock
  '2 Year Leakage Warranty',
  'In Stock',
  false,

  -- Images
  '',
  '[]'::jsonb,

  -- SEO
  'Hanco HEG-50L 50L Solar-Compatible Electric Water Heater | Tajalli''s',
  'Buy the Hanco HEG-50L 50L electric geyser with adjustable 800W/1200W/2000W wattage, solar inverter compatibility, Incoloy 840 element, and IPX4 rating. 2-year leakage warranty. Rs. 27,150.',
  'hanco electric water heater, hanco geyser, heg-50l, 50 litre geyser, solar geyser pakistan, solar compatible electric geyser, hanco solar water heater',

  -- Solar compatibility
  'none',
  'not_applicable',
  'Solar-compatible appliance. Designed to run directly off a solar inverter output. Not a solar system component.',
  false,

  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  slug                      = EXCLUDED.slug,
  brand                     = EXCLUDED.brand,
  model                     = EXCLUDED.model,
  simplified_name           = EXCLUDED.simplified_name,
  category                  = EXCLUDED.category,
  original_category         = EXCLUDED.original_category,
  sub_category              = EXCLUDED.sub_category,
  normalized_category       = EXCLUDED.normalized_category,
  normalized_subcategory    = EXCLUDED.normalized_subcategory,
  category_family           = EXCLUDED.category_family,
  comparison_group          = EXCLUDED.comparison_group,
  frontend_browse_group     = EXCLUDED.frontend_browse_group,
  seo_category_slug         = EXCLUDED.seo_category_slug,
  seo_subcategory_slug      = EXCLUDED.seo_subcategory_slug,
  taxonomy_status           = EXCLUDED.taxonomy_status,
  description               = EXCLUDED.description,
  specs                     = EXCLUDED.specs,
  tags                      = EXCLUDED.tags,
  colors                    = EXCLUDED.colors,
  retail_price              = EXCLUDED.retail_price,
  cash_floor                = EXCLUDED.cash_floor,
  min_price                 = EXCLUDED.min_price,
  warranty                  = EXCLUDED.warranty,
  stock_status              = EXCLUDED.stock_status,
  featured                  = EXCLUDED.featured,
  seo_title                 = EXCLUDED.seo_title,
  seo_desc                  = EXCLUDED.seo_desc,
  seo_keywords              = EXCLUDED.seo_keywords,
  system_role               = EXCLUDED.system_role,
  compatibility_status      = EXCLUDED.compatibility_status,
  compatibility_notes       = EXCLUDED.compatibility_notes,
  requires_compatibility_review = EXCLUDED.requires_compatibility_review,
  updated_at                = NOW();

-- Verify
SELECT
  id,
  brand,
  model,
  simplified_name,
  retail_price,
  warranty,
  stock_status,
  taxonomy_status,
  normalized_category,
  normalized_subcategory,
  specs->>'Solar Compatible' AS solar_compatible,
  specs->>'Power Settings'   AS power_settings
FROM public.products
WHERE id = 'hanco-heg-50l';

-- Seed bundle package templates for the invoice/quotation tool.
-- Lines use the QuoteLine shape: id, name, model, qty, unitPrice, category,
--   warranty, keySpec, kwhPerMonth, savingsPct, minPrice, floorPrice,
--   overrideReason, displayPrefix, packageNote, isPackage, packageComponents.
-- Prices below are placeholder guidance — staff overrides in the quotation tool.

INSERT INTO package_templates (name, description, category_tag, discount, discount_type, sort_order, lines)
VALUES

-- ── 1. AC Complete Package ────────────────────────────────────────────────────
(
  'AC Complete Package',
  'Inverter AC + professional installation + stabilizer/UPS + free solar suitability consultation. Everything needed for a worry-free cooling upgrade.',
  'ac-bundle',
  5.00,
  'Bundle',
  10,
  '[
    {"id":"ac-unit","name":"Inverter AC","model":"(select model)","qty":1,"unitPrice":95000,"category":"air-conditioners","warranty":"5 year compressor","keySpec":"1.5 Ton · Inverter","kwhPerMonth":180,"savingsPct":40,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]},
    {"id":"ac-install","name":"Professional AC Installation","model":"Standard","qty":1,"unitPrice":3500,"category":"service","warranty":"","keySpec":"Full wiring + gas charge","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Includes copper piping up to 15 ft","isPackage":false,"packageComponents":[]},
    {"id":"stabilizer","name":"Voltage Stabilizer","model":"(select model)","qty":1,"unitPrice":8500,"category":"ups-inverters","warranty":"1 year","keySpec":"3000W · Auto Cut-off","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]},
    {"id":"solar-consult","name":"Solar Suitability Consultation","model":"Free","qty":1,"unitPrice":0,"category":"service","warranty":"","keySpec":"Site assessment + system sizing","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Estimate savings and payback period at no cost","isPackage":false,"packageComponents":[]}
  ]'
),

-- ── 2. Fridge & Home Bundle ───────────────────────────────────────────────────
(
  'Fridge & Home Bundle',
  'Refrigerator + fridge mat/guard + free delivery + 1-year care plan option. Full peace of mind from day one.',
  'fridge-bundle',
  4.00,
  'Bundle',
  20,
  '[
    {"id":"fridge","name":"Inverter Refrigerator","model":"(select model)","qty":1,"unitPrice":85000,"category":"refrigerators","warranty":"10 year compressor","keySpec":"Inverter · No-Frost","kwhPerMonth":45,"savingsPct":35,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]},
    {"id":"fridge-mat","name":"Refrigerator Mat / Guard","model":"Standard","qty":1,"unitPrice":800,"category":"small-appliances","warranty":"","keySpec":"Anti-vibration · Waterproof","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Protects floor from vibration and condensation","isPackage":false,"packageComponents":[]},
    {"id":"fridge-delivery","name":"White-Glove Delivery & Placement","model":"Included","qty":1,"unitPrice":0,"category":"service","warranty":"","keySpec":"2-man team · Ground floor free","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]},
    {"id":"fridge-careplan","name":"Annual Care Plan — Essential","model":"Refrigerators","qty":1,"unitPrice":6000,"category":"service","warranty":"1 year plan","keySpec":"2 service visits · Parts discount","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Covers preventive maintenance + gas checks","isPackage":false,"packageComponents":[]}
  ]'
),

-- ── 3. Laundry Starter Pack ───────────────────────────────────────────────────
(
  'Laundry Starter Pack',
  'Washing machine + machine stand + professional installation + 1-year service plan. Set it up once and forget it.',
  'laundry-bundle',
  5.00,
  'Bundle',
  30,
  '[
    {"id":"washer","name":"Automatic Washing Machine","model":"(select model)","qty":1,"unitPrice":60000,"category":"washing-machines","warranty":"2 year parts + labour","keySpec":"7 kg · Full Auto","kwhPerMonth":30,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]},
    {"id":"washer-stand","name":"Washing Machine Stand","model":"Universal","qty":1,"unitPrice":2200,"category":"small-appliances","warranty":"","keySpec":"Heavy duty · Adjustable","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Raises machine for easy loading and reduces vibration noise","isPackage":false,"packageComponents":[]},
    {"id":"washer-install","name":"Washing Machine Installation","model":"Standard","qty":1,"unitPrice":1500,"category":"service","warranty":"","keySpec":"Inlet hose + drain setup","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Includes test run and cycle demonstration","isPackage":false,"packageComponents":[]},
    {"id":"washer-service","name":"Annual Service Plan","model":"Washing Machines","qty":1,"unitPrice":6000,"category":"service","warranty":"1 year plan","keySpec":"2 service visits · Belt + pump check","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Drum clean + filter service included","isPackage":false,"packageComponents":[]}
  ]'
),

-- ── 4. Solar Power Bundle ─────────────────────────────────────────────────────
(
  'Solar Power Bundle',
  'Complete solar system (panels + inverter + battery bank) with AC compatibility check and net metering guidance. Cut bills by 60%+.',
  'solar-bundle',
  3.00,
  'Bundle',
  40,
  '[
    {"id":"solar-system","name":"Solar Panel Array","model":"(size TBD on-site)","qty":1,"unitPrice":180000,"category":"solar","warranty":"25 year performance","keySpec":"3–5 kW · Mono PERC","kwhPerMonth":0,"savingsPct":65,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Panel count and kW determined after free site assessment","isPackage":true,"packageComponents":[{"id":"panels","name":"Mono PERC Panels","qty":8,"keySpec":"380W each","group":"core","status":"included","addonPrice":0},{"id":"structure","name":"Mounting Structure","qty":1,"keySpec":"Galvanised steel","group":"core","status":"included","addonPrice":0},{"id":"wiring","name":"DC Wiring & Conduit","qty":1,"keySpec":"6mm² DC cable","group":"core","status":"included","addonPrice":0}]},
    {"id":"inverter","name":"Hybrid Solar Inverter","model":"(select kW)","qty":1,"unitPrice":85000,"category":"ups-inverters","warranty":"5 year","keySpec":"5 kW · MPPT · Grid-tie ready","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Supports net metering and battery backup simultaneously","isPackage":false,"packageComponents":[]},
    {"id":"battery","name":"Lithium Battery Bank","model":"(select kWh)","qty":1,"unitPrice":120000,"category":"ups-inverters","warranty":"3 year","keySpec":"10 kWh · LiFePO4","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"6–8 hours backup for essential loads","isPackage":false,"packageComponents":[]},
    {"id":"ac-compat","name":"AC Compatibility & Load Check","model":"Included","qty":1,"unitPrice":0,"category":"service","warranty":"","keySpec":"Inverter AC sizing + load audit","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Ensures solar system can power existing and planned ACs without oversizing","isPackage":false,"packageComponents":[]}
  ]'
)

ON CONFLICT DO NOTHING;

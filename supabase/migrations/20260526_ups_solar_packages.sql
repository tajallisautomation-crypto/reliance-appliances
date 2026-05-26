-- New UPS and Solar package templates: 1.2kW UPS, 2kW UPS, 2kW Solar+2.4kWh,
-- 6kW Solar+5kWh, 7kW Solar+5kWh, 10kW Solar+10kWh.
-- Safe to re-run — skips rows whose name already exists.
--
-- Rates used (canonical from solarRules.ts):
--   Panel (Crown Bi-Facial 620W): PKR 30,000 each
--   Solar wiring: PKR 12/W   | Solar labor: PKR 6/W
--   UPS wiring:   PKR 9/W    | UPS labor:   PKR 3/W
--   Elevated frame: PKR 17,500/panel

INSERT INTO package_templates (name, description, category_tag, discount, discount_type, sort_order, lines)
SELECT name, description, category_tag, discount, discount_type, sort_order, lines::jsonb
FROM (VALUES

-- ── 1. 1.2kW UPS System ───────────────────────────────────────────────────────
(
  '1.2kW UPS System',
  'Entry-level battery backup for flats & apartments. Runs 2 fans + LED lights + phone/laptop charging. No rooftop required. Ziewnic RouX Nano 1.2kW inverter + Crown 2.4kWh LiFePO4 battery included.',
  'ups',
  0.00,
  'Package',
  5,
  '[
    {"id":"inv-1.2kw","name":"Ziewnic RouX Nano 1.2kW Inverter","model":"RouX Nano 1.2kW","qty":1,"unitPrice":37000,"category":"ups-inverters","warranty":"2 year replacement","keySpec":"1.2kW · Pure Sine Wave · 24V","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Ziewnic Jan 2026 catalog + 15% margin","isPackage":false,"packageComponents":[]},
    {"id":"bat-2.4kwh","name":"Crown 2.4kWh LiFePO4 Battery","model":"Elektra Boost Pro 2.4kWh","qty":1,"unitPrice":95000,"category":"ups-inverters","warranty":"10 year replacement","keySpec":"2.4kWh · 24V · 100Ah · LiFePO4","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"6–8 hrs backup for essential loads","isPackage":false,"packageComponents":[]},
    {"id":"ups-wiring-1.2kw","name":"UPS Wiring & Electrical Equipment","model":"1.2kW system","qty":1,"unitPrice":10800,"category":"service","warranty":"1 year workmanship","keySpec":"1200W · PKR 9/W","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Includes consumer unit connection and cable tray","isPackage":false,"packageComponents":[]},
    {"id":"ups-labor-1.2kw","name":"Professional Installation & Transport","model":"1.2kW UPS","qty":1,"unitPrice":8600,"category":"service","warranty":"","keySpec":"1200W · PKR 3/W labor + transport","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Includes test run and load verification","isPackage":false,"packageComponents":[]}
  ]'
),

-- ── 2. 2kW UPS System ─────────────────────────────────────────────────────────
(
  '2kW UPS System',
  'Home essentials backup — runs fridge + fans + lights + small TV. No rooftop required. Ziewnic RouX Mini 2.0kW inverter + Crown 2.4kWh LiFePO4 battery.',
  'ups',
  0.00,
  'Package',
  6,
  '[
    {"id":"inv-2kw","name":"Ziewnic RouX Mini 2.0kW Inverter","model":"RouX Mini 2.0kW","qty":1,"unitPrice":55000,"category":"ups-inverters","warranty":"3 year replacement","keySpec":"2kW · Pure Sine Wave · 24V","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Ziewnic Jan 2026 catalog + 15% margin","isPackage":false,"packageComponents":[]},
    {"id":"bat-2.4kwh-2kw","name":"Crown 2.4kWh LiFePO4 Battery","model":"Elektra Boost Pro 2.4kWh","qty":1,"unitPrice":95000,"category":"ups-inverters","warranty":"10 year replacement","keySpec":"2.4kWh · 24V · 100Ah · LiFePO4","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"6–8 hrs backup on essential loads","isPackage":false,"packageComponents":[]},
    {"id":"ups-wiring-2kw","name":"UPS Wiring & Electrical Equipment","model":"2kW system","qty":1,"unitPrice":18000,"category":"service","warranty":"1 year workmanship","keySpec":"2000W · PKR 9/W","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]},
    {"id":"ups-labor-2kw","name":"Professional Installation & Transport","model":"2kW UPS","qty":1,"unitPrice":11000,"category":"service","warranty":"","keySpec":"2000W · PKR 3/W labor + transport","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Test run and circuit labelling included","isPackage":false,"packageComponents":[]}
  ]'
),

-- ── 3. 2kW Solar + 2.4kWh Battery ────────────────────────────────────────────
(
  '2kW Solar System + 2.4kWh Battery',
  'Entry-level solar system. 4 × Crown Bi-Facial 620W panels (2.48kW peak). Crown Yorker 3.6kW hybrid inverter + Crown 2.4kWh LiFePO4 battery. Elevated frame optional.',
  'solar',
  0.00,
  'Package',
  15,
  '[
    {"id":"panels-4","name":"Crown Bi-Facial 620W Solar Panels","model":"Bi-Facial 620W","qty":4,"unitPrice":30000,"category":"solar","warranty":"25 year performance","keySpec":"4 panels · 2.48kW peak · Mono Bi-Facial","kwhPerMonth":0,"savingsPct":55,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"620W per panel; 5–5.5 peak sun hrs/day in Karachi","isPackage":false,"packageComponents":[]},
    {"id":"inv-3.6kw-sol","name":"Crown Yorker 3.6kW Hybrid Inverter","model":"Yorker 3.6kW","qty":1,"unitPrice":140000,"category":"ups-inverters","warranty":"3 year replacement","keySpec":"3.6kW · Hybrid · MPPT · 24V","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Supports on-grid and battery backup simultaneously","isPackage":false,"packageComponents":[]},
    {"id":"bat-2.4kwh-sol","name":"Crown 2.4kWh LiFePO4 Battery","model":"Elektra Boost Pro 2.4kWh","qty":1,"unitPrice":95000,"category":"ups-inverters","warranty":"10 year replacement","keySpec":"2.4kWh · 24V · LiFePO4","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"6–8 hrs backup during evening load shedding","isPackage":false,"packageComponents":[]},
    {"id":"solar-wiring-2kw","name":"Solar Wiring & Electrical Equipment","model":"2kW solar","qty":1,"unitPrice":24000,"category":"service","warranty":"1 year workmanship","keySpec":"2000W · PKR 12/W","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"DC combiner, AC breaker, metering, conduit","isPackage":false,"packageComponents":[]},
    {"id":"solar-labor-2kw","name":"Professional Installation & Transport","model":"2kW solar","qty":1,"unitPrice":17000,"category":"service","warranty":"","keySpec":"2000W · PKR 6/W labor + transport","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Commissioning, test run, site cleanup","isPackage":false,"packageComponents":[]},
    {"id":"frame-4panel","name":"Elevated Solar Frame (Optional)","model":"14-gauge galvanised","qty":4,"unitPrice":17500,"category":"service","warranty":"10 year structural","keySpec":"Per panel · Anti-rust coated","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Remove if flat/standard roof mount is available","isPackage":false,"packageComponents":[]}
  ]'
),

-- ── 4. 6kW Solar + 5.12kWh Battery ───────────────────────────────────────────
(
  '6kW Solar System + 5.12kWh Battery',
  'Premium solar system. 10 × Crown Bi-Facial 620W panels (6.2kW peak). Ziewnic RouX 6.7kW hybrid inverter + Ziewnic LI-WALL 5.12kWh battery. Covers 3+ ACs. Elevated frame optional.',
  'solar',
  0.00,
  'Package',
  55,
  '[
    {"id":"panels-10","name":"Crown Bi-Facial 620W Solar Panels","model":"Bi-Facial 620W","qty":10,"unitPrice":30000,"category":"solar","warranty":"25 year performance","keySpec":"10 panels · 6.2kW peak · Mono Bi-Facial","kwhPerMonth":0,"savingsPct":75,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Generates ~680–750 units/month in Karachi","isPackage":false,"packageComponents":[]},
    {"id":"inv-6.7kw","name":"Ziewnic RouX 6.7kW Hybrid Inverter","model":"RouX 6.7kW","qty":1,"unitPrice":193000,"category":"ups-inverters","warranty":"3 year replacement","keySpec":"6.7kW · Hybrid · MPPT · 48V","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Ziewnic Jan 2026 catalog + 15% margin","isPackage":false,"packageComponents":[]},
    {"id":"bat-5.12kwh-6kw","name":"Ziewnic LI-WALL 2.0 5.12kWh Battery","model":"LI-WALL 2.0 5.12kWh","qty":1,"unitPrice":257000,"category":"ups-inverters","warranty":"5 year replacement","keySpec":"5.12kWh · 48V · LiFePO4","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"8–12 hrs backup for essential loads","isPackage":false,"packageComponents":[]},
    {"id":"solar-wiring-6kw","name":"Solar Wiring & Electrical Equipment","model":"6kW solar","qty":1,"unitPrice":74400,"category":"service","warranty":"1 year workmanship","keySpec":"6200W · PKR 12/W","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]},
    {"id":"solar-labor-6kw","name":"Professional Installation & Transport","model":"6kW solar","qty":1,"unitPrice":44200,"category":"service","warranty":"","keySpec":"6200W · PKR 6/W labor + transport","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]},
    {"id":"frame-10panel","name":"Elevated Solar Frame (Optional)","model":"14-gauge galvanised","qty":10,"unitPrice":17500,"category":"service","warranty":"10 year structural","keySpec":"Per panel · Anti-rust coated","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]}
  ]'
),

-- ── 5. 7kW Solar + 5.12kWh Battery ───────────────────────────────────────────
(
  '7kW Solar System + 5.12kWh Battery',
  'High-capacity solar system. 12 × Crown Bi-Facial 620W panels (7.44kW peak). Crown 8kW hybrid inverter + Crown 5.12kWh LiFePO4 battery. Covers 4 ACs. Elevated frame optional.',
  'solar',
  0.00,
  'Package',
  60,
  '[
    {"id":"panels-12","name":"Crown Bi-Facial 620W Solar Panels","model":"Bi-Facial 620W","qty":12,"unitPrice":30000,"category":"solar","warranty":"25 year performance","keySpec":"12 panels · 7.44kW peak · Mono Bi-Facial","kwhPerMonth":0,"savingsPct":80,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Generates ~820–950 units/month in Karachi","isPackage":false,"packageComponents":[]},
    {"id":"inv-8kw-7","name":"Crown 8kW Hybrid Inverter","model":"Nexus 8kW","qty":1,"unitPrice":250000,"category":"ups-inverters","warranty":"5 year replacement","keySpec":"8kW · Hybrid · MPPT · 48V","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Handles full 7.44kW panel array with headroom","isPackage":false,"packageComponents":[]},
    {"id":"bat-5.12kwh-7kw","name":"Crown 5.12kWh LiFePO4 Battery","model":"Elektra Boost Pro 5.12kWh","qty":1,"unitPrice":285000,"category":"ups-inverters","warranty":"10 year replacement","keySpec":"5.12kWh · 48V · 100Ah · LiFePO4","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"8–12 hrs backup for essential loads","isPackage":false,"packageComponents":[]},
    {"id":"solar-wiring-7kw","name":"Solar Wiring & Electrical Equipment","model":"7kW solar","qty":1,"unitPrice":89280,"category":"service","warranty":"1 year workmanship","keySpec":"7440W · PKR 12/W","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]},
    {"id":"solar-labor-7kw","name":"Professional Installation & Transport","model":"7kW solar","qty":1,"unitPrice":51720,"category":"service","warranty":"","keySpec":"7440W · PKR 6/W labor + transport","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]},
    {"id":"frame-12panel","name":"Elevated Solar Frame (Optional)","model":"14-gauge galvanised","qty":12,"unitPrice":17500,"category":"service","warranty":"10 year structural","keySpec":"Per panel · Anti-rust coated","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]}
  ]'
),

-- ── 6. 10kW Solar + 10.24kWh Battery (Net Metering) ─────────────────────────
(
  '10kW Solar System + 10.24kWh Battery',
  'Net metering eligible system. 17 × Crown Bi-Facial 620W panels (10.54kW peak). Ziewnic RouX Ultra 12kW inverter + 2 × Ziewnic Z Box 5.12kWh battery bank (10.24kWh total). Sell surplus to K-Electric. Elevated frame optional.',
  'solar',
  0.00,
  'Package',
  70,
  '[
    {"id":"panels-17","name":"Crown Bi-Facial 620W Solar Panels","model":"Bi-Facial 620W","qty":17,"unitPrice":30000,"category":"solar","warranty":"25 year performance","keySpec":"17 panels · 10.54kW peak · Mono Bi-Facial","kwhPerMonth":0,"savingsPct":85,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Generates ~1,150–1,300 units/month in Karachi","isPackage":false,"packageComponents":[]},
    {"id":"inv-12kw-10","name":"Ziewnic RouX Ultra 12kW Hybrid Inverter","model":"RouX Ultra 12kW","qty":1,"unitPrice":437000,"category":"ups-inverters","warranty":"3 year replacement","keySpec":"12kW · 3-Phase Hybrid · MPPT · 48V","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"Ziewnic Jan 2026 catalog + 15% margin","isPackage":false,"packageComponents":[]},
    {"id":"bat-10.24kwh","name":"Ziewnic Z Box European 10.24kWh Battery (2×5.12kWh)","model":"Z Box European 5.12kWh ×2","qty":2,"unitPrice":288000,"category":"ups-inverters","warranty":"5 year replacement","keySpec":"10.24kWh total · 48V · LiFePO4 · stackable","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"10–16 hrs backup; charge on solar, discharge evening peak","isPackage":false,"packageComponents":[]},
    {"id":"solar-wiring-10kw","name":"Solar Wiring & Electrical Equipment","model":"10kW solar","qty":1,"unitPrice":126480,"category":"service","warranty":"1 year workmanship","keySpec":"10540W · PKR 12/W","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]},
    {"id":"solar-labor-10kw","name":"Professional Installation & Transport","model":"10kW solar","qty":1,"unitPrice":73240,"category":"service","warranty":"","keySpec":"10540W · PKR 6/W labor + transport","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"3-phase commissioning, metering calibration","isPackage":false,"packageComponents":[]},
    {"id":"frame-17panel","name":"Elevated Solar Frame (Optional)","model":"14-gauge galvanised","qty":17,"unitPrice":17500,"category":"service","warranty":"10 year structural","keySpec":"Per panel · Anti-rust coated","kwhPerMonth":0,"savingsPct":0,"minPrice":0,"floorPrice":0,"overrideReason":"","displayPrefix":"","packageNote":"","isPackage":false,"packageComponents":[]}
  ]'
)

) AS v(name, description, category_tag, discount, discount_type, sort_order, lines)
WHERE NOT EXISTS (
  SELECT 1 FROM package_templates pt WHERE pt.name = v.name
);

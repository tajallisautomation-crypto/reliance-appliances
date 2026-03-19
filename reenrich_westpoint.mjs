/**
 * reenrich_westpoint.mjs
 * Re-enriches all Westpoint products in the DB using the corrected _WP_NAMES lookup.
 * Preserves: id, brand, model, prices, installments, images, created_at
 * Overwrites: simplified_name, category, specs, description, tags, seo fields
 *
 * Run:  node reenrich_westpoint.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://fdfjavyopbrfvwtjaerw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZmphdnlvcGJyZnZ3dGphZXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDE3MDAsImV4cCI6MjA4ODIxNzcwMH0.fXwGFR_e3xZ4trEbkcH8UQ6_oWcIn92UUUvkGuFajto';
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL    || 'tajallisautomation@gmail.com';
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD || 'Hammad123!';
const DRY_RUN           = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Corrected Westpoint model lookup (mirrors the fixed _WP_NAMES in api.ts) ──
const WP_NAMES = {
  '367':  ['Westpoint 3-in-1 Juicer Blender Grinder WF-367',        'Juicer Blender'],
  '6093': ['Westpoint Deluxe 3-in-1 Sandwich Toaster WF-6093',      'Sandwich Toaster'],
  '9935': ['Westpoint 2-in-1 Hand Blender WF-9935',                 'Hand Blender'],
  '5350': ['Westpoint Professional Rice Cooker WF-5350',             'Rice Cooker'],
  '410':  ['Westpoint Deluxe Cordless Electric Kettle 1L WF-410',   'Electric Kettle'],
  '546':  ['Westpoint Deluxe Citrus Juicer WF-546',                 'Juicer'],
  '9225': ['Westpoint Professional Dry/Wet Grinder WF-9225',        'Grinder'],
  '5147': ['Westpoint Deluxe Fan Heater WF-5147',                   'Fan Heater'],
  '6813': ['Westpoint Professional Hair Clipper WF-6813',           'Hair Clipper'],
  '6810': ['Westpoint Professional Hair Straightening Brush WF-6810','Hair Straightener'],
  '6809': ['Westpoint Professional Hair Dryer WF-6809',             'Hair Dryer'],
  '5165': ['Westpoint Professional Slow Juicer WF-5165',            'Slow Juicer'],
  '7201': ['Westpoint Deluxe Juicer Blender Dry Mill WF-7201',      'Juicer Blender'],
  '7005': ['Westpoint Deluxe Bath Scale WF-7005',                   'Digital Scale'],
  '1206': ['Westpoint Ultrasonic Room Humidifier WF-1206',          'Humidifier'],
  '2025': ['Westpoint Coffee Maker WF-2025',                        'Coffee Maker'],
  '2023': ['Westpoint Coffee Maker WF-2023',                        'Coffee Maker'],
  '330':  ['Westpoint Baby Bottle Sterilizer WF-330',               'Baby Appliance'],
  '9228': ['Westpoint Professional Coffee & Spice Grinder WF-9228', 'Coffee Grinder'],
  '6697': ['Westpoint Deluxe Sandwich Toaster WF-6697',             'Sandwich Toaster'],
  '6696': ['Westpoint Deluxe Sandwich Toaster Grill WF-6696',       'Sandwich Toaster'],
  '6320': ['Westpoint Water Boiler 20L WF-6320',                    'Water Boiler'],
  '6316': ['Westpoint Water Boiler 16L WF-6316',                    'Water Boiler'],
  '9901': ['Westpoint Deluxe Hand Mixer WF-9901',                   'Hand Mixer'],
  '9301': ['Westpoint Deluxe Hand Mixer WF-9301',                   'Hand Mixer'],
  '9802': ['Westpoint Deluxe Hand Mixer WF-9802',                   'Hand Mixer'],
  '9804': ['Westpoint Deluxe Hand Mixer WF-9804',                   'Hand Mixer'],
  '4636': ['Westpoint Deluxe Hand Mixer WF-4636',                   'Hand Mixer'],
  '1860': ['Westpoint Professional Kitchen Chef WF-1860',           'Kitchen Chef'],
  '501':  ['Westpoint Kitchen Robot WF-501',                        'Food Processor'],
  '504':  ['Westpoint Kitchen Robot WF-504',                        'Food Processor'],
  '506':  ['Westpoint Kitchen Robot WF-506',                        'Food Processor'],
  '2805': ['Westpoint Food Factory Jumbo WF-2805',                  'Food Processor'],
  '8818': ['Westpoint Kitchen Chef 5-in-1 WF-8818',                'Kitchen Chef'],
  '8819': ['Westpoint Kitchen Chef WF-8819',                        'Kitchen Chef'],
  '6913': ['Westpoint Professional Hair Clipper WF-6913',           'Hair Clipper'],
  '6613': ['Westpoint 3-in-1 Hair Trimmer WF-6613',                'Hair Trimmer'],
  '614':  ['Westpoint Facial Steamer WF-614',                       'Facial Steamer'],
  '2564': ['Westpoint Professional Pop-Up Toaster 4-Slice WF-2564', 'Bread Toaster'],
  '2532': ['Westpoint Deluxe Pop-Up Toaster 2-Slice WF-2532',      'Bread Toaster'],
  '2538': ['Westpoint Deluxe Pop-Up Toaster 2-Slice WF-2538',      'Bread Toaster'],
  '209':  ['Westpoint Baby Bottle Warmer WF-209',                   'Baby Appliance'],
  '7115': ['Westpoint Electric Insect Killer WF-7115',              'Insect Killer'],
  '4360': ['Westpoint Digital Kitchen Scale WF-4360',               'Kitchen Scale'],
  '251':  ['Westpoint Professional Single Hot Plate WF-251',        'Hot Plate'],
  '252':  ['Westpoint Professional Double Hot Plate WF-252',        'Hot Plate'],
  '291':  ['Westpoint Professional Ceramic Cooker WF-291',          'Ceramic Cooker'],
  '6514': ['Westpoint Deluxe Roti Maker WF-6514',                  'Roti Maker'],
  '3616': ['Westpoint Deluxe Dough Maker WF-3616',                  'Dough Maker'],
  '5252': ['Westpoint Electric Egg Boiler WF-5252',                 'Egg Boiler'],
  '231':  ['Westpoint Deluxe Magic Broom WF-231',                   'Vacuum Cleaner'],
  '103':  ['Westpoint Vacuum Cleaner WF-103',                       'Vacuum Cleaner'],
  '3469': ['Westpoint Professional Vacuum Cleaner WF-3469',         'Vacuum Cleaner'],
  '3669': ['Westpoint Deluxe Vacuum Cleaner WF-3669',               'Vacuum Cleaner'],
  '960':  ['Westpoint Deluxe Vacuum Cleaner WF-960',                'Vacuum Cleaner'],
  '1401': ['Westpoint Deluxe Water Dispenser WF-1401',              'Water Dispenser'],
  '441':  ['Westpoint Deluxe Deep Fryer WF-441',                    'Deep Fryer'],
  '843':  ['Westpoint Deep Fryer WF-843',                           'Deep Fryer'],
  '851':  ['Westpoint Deluxe Deep Fryer WF-851',                    'Deep Fryer'],
  '841':  ['Westpoint Deep Fryer WF-841',                           'Deep Fryer'],
  '830':  ['Westpoint Air Fryer WF-830',                            'Air Fryer'],       // FIXED: was Deep Fryer
  '4800': ['Westpoint Microwave Oven WF-4800',                      'Microwave Oven'],  // FIXED: was Air Fryer
  '4805': ['Westpoint Deluxe Air Fryer WF-4805',                    'Air Fryer'],
  '4981': ['Westpoint Deluxe Air Fryer WF-4981',                    'Air Fryer'],
  '4500': ['Westpoint Electric Oven WF-4500',                       'Electric Oven'],   // FIXED: was Air Fryer
  '364':  ['Westpoint Electric Oven WF-364',                        'Electric Oven'],   // FIXED: was Chopper
  '343':  ['Westpoint Deluxe Chopper WF-343',                       'Food Chopper'],
  '342':  ['Westpoint Chopper WF-342',                              'Food Chopper'],
  '333':  ['Westpoint Blender WF-333',                              'Blender'],         // FIXED: was Chopper
  '408':  ['Westpoint Food Factory WF-408',                         'Food Processor'],  // FIXED: was Electric Kettle
  '445':  ['Westpoint Electric Kettle WF-445',                      'Electric Kettle'],
  '498':  ['Westpoint Electric Kettle WF-498',                      'Electric Kettle'],
  '550':  ['Westpoint Electric Kettle WF-550',                      'Electric Kettle'],
  '578':  ['Westpoint Electric Kettle WF-578',                      'Electric Kettle'],
  '545':  ['Westpoint Electric Kettle WF-545',                      'Electric Kettle'],
  '5258': ['Westpoint Deluxe Electric Oven WF-5258',                'Electric Oven'],
  '5254': ['Westpoint Deluxe Electric Oven WF-5254',                'Electric Oven'],
  '5255': ['Westpoint Electric Oven WF-5255',                       'Electric Oven'],
  '5256': ['Westpoint Electric Oven WF-5256',                       'Electric Oven'],
  '5160': ['Westpoint Electric Oven WF-5160',                       'Electric Oven'],
  '5161': ['Westpoint Electric Oven WF-5161',                       'Electric Oven'],
  '8814': ['Westpoint Kitchen Chef WF-8814',                        'Kitchen Chef'],
  '8817': ['Westpoint Kitchen Chef WF-8817',                        'Kitchen Chef'],
  '9914': ['Westpoint Hand Blender WF-9914',                        'Hand Blender'],
  '9915': ['Westpoint Hand Blender WF-9915',                        'Hand Blender'],
  '9916': ['Westpoint Hand Blender WF-9916',                        'Hand Blender'],
  '9934': ['Westpoint Hand Blender WF-9934',                        'Hand Blender'],
  '9715': ['Westpoint Hand Blender WF-9715',                        'Hand Blender'],
  '9814': ['Westpoint Deluxe Hand Mixer WF-9814',                   'Hand Mixer'],
  '9815': ['Westpoint Deluxe Hand Mixer WF-9815',                   'Hand Mixer'],
  '9216': ['Westpoint Professional Grinder WF-9216',                'Grinder'],
  '1844': ['Westpoint Electric Pressure Cooker WF-1844',            'Pressure Cooker'],
  '2310': ['Westpoint Electric Pressure Cooker WF-2310',            'Pressure Cooker'],
  '2405': ['Westpoint Electric Pressure Cooker WF-2405',            'Pressure Cooker'],
  '2800r':['Westpoint Electric Pressure Cooker WF-2800R',           'Pressure Cooker'],
  '3117': ['Westpoint Electric Pressure Cooker WF-3117',            'Pressure Cooker'],
  '2020': ['Westpoint Electric Iron WF-2020',                       'Electric Iron'],
  '2063': ['Westpoint Electric Iron WF-2063',                       'Electric Iron'],
  '6259': ['Westpoint Electric Iron WF-6259',                       'Electric Iron'],
  '6270': ['Westpoint Electric Iron WF-6270',                       'Electric Iron'],
  '6175': ['Westpoint Electric Iron WF-6175',                       'Electric Iron'],
  '6178': ['Westpoint Electric Iron WF-6178',                       'Electric Iron'],
  '6171': ['Westpoint Electric Iron WF-6171',                       'Electric Iron'],
  '1153': ['Westpoint Ultrasonic Room Humidifier WF-1153',          'Humidifier'],
  '1156': ['Westpoint Room Humidifier WF-1156',                     'Humidifier'],
  '1097': ['Westpoint Room Humidifier WF-1097',                     'Humidifier'],
  '1098': ['Westpoint Room Humidifier WF-1098',                     'Humidifier'],
  '1090': ['Westpoint Room Humidifier WF-1090',                     'Humidifier'],
  '1102': ['Westpoint Room Humidifier WF-1102',                     'Humidifier'],
  '1186': ['Westpoint Air Purifier WF-1186',                        'Air Purifier'],
  '5807': ['Westpoint Deluxe Room Heater WF-5807',                  'Room Heater'],
  '5307': ['Westpoint Room Heater WF-5307',                         'Room Heater'],
  '772':  ['Westpoint Room Heater WF-772',                          'Room Heater'],
  '1353': ['Westpoint Room Heater WF-1353',                         'Room Heater'],
  '2386': ['Westpoint Room Heater WF-2386',                         'Room Heater'],
  '90b':  ['Westpoint Deluxe Immersion Rod WF-90B',                 'Immersion Rod'],
  '78b':  ['Westpoint Immersion Rod WF-78B',                        'Immersion Rod'],
  '4257': ['Westpoint Blender WF-4257',                             'Blender'],
  '4256': ['Westpoint Blender WF-4256',                             'Blender'],
  '4258': ['Westpoint Blender WF-4258',                             'Blender'],
  '4307': ['Westpoint Blender WF-4307',                             'Blender'],
  '7500': ['Westpoint Deluxe Juicer WF-7500',                       'Juicer'],
  '7805': ['Westpoint Juicer WF-7805',                              'Juicer'],
  '738':  ['Westpoint Juicer WF-738',                               'Juicer'],
  '929':  ['Westpoint Citrus Juicer WF-929',                        'Juicer'],
  '301':  ['Westpoint Meat Mincer WF-301',                          'Meat Mincer'],
  '143':  ['Westpoint Meat Mincer WF-143',                          'Meat Mincer'],
  '142':  ['Westpoint Meat Mincer WF-142',                          'Meat Mincer'],
  '152':  ['Westpoint Meat Mincer WF-152',                          'Meat Mincer'],
  '6307': ['Westpoint Automatic Clothes Iron WF-6307',              'Electric Iron'],
  'f10':  ['Westpoint Quick Chopper WF-F10',                        'Food Chopper'],
  'f04':  ['Westpoint Vegetable Slicer WF-F04',                     'Food Slicer'],
  'f07':  ['Westpoint Manual Kitchen Slicer WF-F07',                'Food Slicer'],
  '2610': ['Westpoint Convection Oven WF-2610',                     'Electric Oven'],   // FIXED: was Rotisserie Oven
  '6300': ['Westpoint Convection Rotisserie Oven WF-6300',          'Electric Oven'],   // FIXED: subcategory corrected
  '5805': ['Westpoint Kitchen Chef WF-5805',                        'Kitchen Chef'],
  '2803': ['Westpoint Food Factory Jumbo WF-2803',                  'Food Processor'],  // FIXED: was Kitchen Chef
  '4711': ['Westpoint Convection Rotisserie Oven WF-4711',          'Electric Oven'],
  '5259': ['Westpoint Air Fryer Rotisserie Oven WF-5259',           'Air Fryer'],
  '853':  ['Westpoint Microwave Oven WF-853',                       'Microwave Oven'],
  '9714': ['Westpoint Hand Blender WF-9714',                        'Hand Blender'],
  '442':  ['Westpoint Kitchen Chef WF-442',                         'Kitchen Chef'],
  '8266': ['Westpoint Cordless Electric Kettle WF-8266',            'Electric Kettle'],
  '3804': ['Westpoint Kitchen Chef WF-3804',                        'Kitchen Chef'],
  '304':  ['Westpoint Blender Grinder WF-304',                      'Blender'],
  '822':  ['Westpoint Microwave Oven WF-822',                       'Microwave Oven'],
  '6174': ['Westpoint Cordless Electric Kettle WF-6174',            'Electric Kettle'],
  '949':  ['Westpoint Blender Grinder WF-949',                      'Blender'],
  '8815': ['Westpoint Kitchen Robot WF-8815',                       'Kitchen Robot'],
  '9215': ['Westpoint Hand Blender WF-9215',                        'Hand Blender'],
  '4201': ['Westpoint 3-in-1 Hand Blender WF-4201',                 'Hand Blender'],
  '9816': ['Westpoint Hand Blender WF-9816',                        'Hand Blender'],
  '832':  ['Westpoint Microwave Oven WF-832',                       'Microwave Oven'],
  '1846': ['Westpoint Juicer Mincer WF-1846',                       'Juicer'],
  '2409': ['Westpoint Juicer Blender Drymill WF-2409',              'Juicer Blender'],
  '718':  ['Westpoint Blender Grinder WF-718',                      'Blender'],
  '1099': ['Westpoint Food Chopper WF-1099',                        'Food Chopper'],
  '554':  ['Westpoint Citrus Juicer WF-554',                        'Juicer'],
  '495c': ['Westpoint Food Chopper WF-495C',                        'Food Chopper'],
  '8813': ['Westpoint Juicer Blender Drymill WF-8813',              'Juicer Blender'],
  '496c': ['Westpoint Kitchen Robot WF-496C',                       'Kitchen Robot'],
  '9214': ['Westpoint Hand Blender WF-9214',                        'Hand Blender'],
  '5253': ['Westpoint Deluxe Air Fryer WF-5253',                    'Air Fryer'],
  '7501': ['Westpoint Juicer Blender Drymill WF-7501',              'Juicer Blender'],
  '1834': ['Westpoint Kitchen Chef WF-1834',                        'Kitchen Chef'],
  '7259': ['Westpoint Deluxe Air Fryer WF-7259',                    'Air Fryer'],
  '4259': ['Westpoint Deluxe Air Fryer WF-4259',                    'Air Fryer'],
  '443':  ['Westpoint Kitchen Chef WF-443',                         'Kitchen Chef'],
  '1833': ['Westpoint Kitchen Chef WF-1833',                        'Kitchen Chef'],
  '497c': ['Westpoint Kitchen Robot WF-497C',                       'Kitchen Robot'],
  '5257': ['Westpoint Deluxe Air Fryer WF-5257',                    'Air Fryer'],
  '9936': ['Westpoint Hand Blender WF-9936',                        'Hand Blender'],
  '1845': ['Westpoint Kitchen Chef WF-1845',                        'Kitchen Chef'],
  '332':  ['Westpoint Blender Grinder WF-332',                      'Blender'],
  '5500': ['Westpoint Professional Rotisserie Baking Oven WF-5500', 'Electric Oven'],
  '2430': ['Westpoint Deluxe Dry Iron WF-2430',                     'Electric Iron'],
  '6807': ['Westpoint Hair Straightener WF-6807',                   'Hair Straightener'],
  '1253': ['Westpoint Garment Steamer WF-1253',                     'Garment Steamer'],
  '1159': ['Westpoint Garment Steamer WF-1159',                     'Garment Steamer'],
  '2451': ['Westpoint Dry Iron WF-2451',                            'Electric Iron'],
  '6201': ['Westpoint Hair Dryer WF-6201',                          'Hair Dryer'],
  '1546': ['Westpoint Deluxe Tower Fan WF-1546',                    'Tower Fan'],
  '1154': ['Westpoint Garment Steamer WF-1154',                     'Garment Steamer'],
  '6203': ['Westpoint Hair Dryer WF-6203',                          'Hair Dryer'],
  '6280': ['Westpoint Hair Dryer WF-6280',                          'Hair Dryer'],
  '672':  ['Westpoint Dry Iron WF-672',                             'Electric Iron'],
  '6808': ['Westpoint Hair Straightener WF-6808',                   'Hair Straightener'],
  '2064': ['Westpoint Steam Iron WF-2064',                          'Electric Iron'],
  '1201': ['Westpoint Ultrasonic Room Humidifier WF-1201',          'Humidifier'],
  '1205': ['Westpoint Deluxe Ultrasonic Humidifier WF-1205',        'Humidifier'],
  '2024': ['Westpoint Coffee Maker WF-2024',                        'Coffee Maker'],
  '210':  ['Westpoint Dual Baby Bottle Warmer WF-210',              'Baby Appliance'],
  '2528': ['Westpoint Pop-Up Toaster 4-Slice WF-2528',              'Bread Toaster'],
  '2561': ['Westpoint Pop-Up Toaster 2-Slice WF-2561',              'Bread Toaster'],
  '2563': ['Westpoint Pop-Up Toaster 4-Slice Double WF-2563',       'Bread Toaster'],
  '261':  ['Westpoint Professional Single Hot Plate WF-261',        'Hot Plate'],
  '262':  ['Westpoint Professional Double Hot Plate WF-262',        'Hot Plate'],
  '292':  ['Westpoint Professional Ceramic Cooker Double WF-292',   'Ceramic Cooker'],
  '3050': ['Westpoint Meat Mincer WF-3050',                         'Meat Mincer'],
  '3166': ['Westpoint Non-Stick Pizza Pan WF-3166',                 'Kitchen Accessory'],
  '329':  ['Westpoint Baby Bottle Sterilizer WF-329',               'Baby Appliance'],
  '3870': ['Westpoint Foot Massager WF-3870',                       'Massager'],
  '4616': ['Westpoint Deluxe Hand Mixer WF-4616',                   'Hand Mixer'],
  '4626': ['Westpoint Deluxe Hand Mixer WF-4626',                   'Hand Mixer'],
  '502':  ['Westpoint Kitchen Robot WF-502',                        'Food Processor'],
  '505':  ['Westpoint Kitchen Robot WF-505',                        'Food Processor'],
  '636':  ['Westpoint Deluxe Sandwich Toaster WF-636',              'Sandwich Toaster'],
  '6362': ['Westpoint Epilator WF-6362',                            'Epilator'],
  '6686': ['Westpoint Deluxe Sandwich Toaster WF-6686',             'Sandwich Toaster'],
  '6713': ['Westpoint Professional Hair Clipper WF-6713',           'Hair Clipper'],
  '7010': ['Westpoint Digital Weight Scale WF-7010',                'Digital Scale'],
  '7108': ['Westpoint Electric Insect Killer WF-7108',              'Insect Killer'],
  '7110': ['Westpoint Electric Insect Killer WF-7110',              'Insect Killer'],
  '7112': ['Westpoint Electric Insect Killer WF-7112',              'Insect Killer'],
  '9224': ['Westpoint Professional Coffee Grinder WF-9224',         'Coffee Grinder'],
  '9601': ['Westpoint Egg Beater WF-9601',                          'Hand Mixer'],
  '9801': ['Westpoint Steel Egg Beater WF-9801',                    'Hand Mixer'],
  'f05':  ['Westpoint Manual Fries Cutter WF-F05',                  'Food Slicer'],
};


// ── Category → DB category string ─────────────────────────────────────────────
const CAT_MAP = {
  'Electric Kettle':    'Kitchen Appliances',
  'Sandwich Toaster':   'Kitchen Appliances',
  'Hand Blender':       'Kitchen Appliances',
  'Juicer Blender':     'Kitchen Appliances',
  'Rice Cooker':        'Kitchen Appliances',
  'Juicer':             'Kitchen Appliances',
  'Grinder':            'Kitchen Appliances',
  'Coffee Maker':       'Kitchen Appliances',
  'Coffee Grinder':     'Kitchen Appliances',
  'Hand Mixer':         'Kitchen Appliances',
  'Kitchen Chef':       'Kitchen Appliances',
  'Food Processor':     'Kitchen Appliances',
  'Blender':            'Kitchen Appliances',
  'Slow Juicer':        'Kitchen Appliances',
  'Meat Mincer':        'Kitchen Appliances',
  'Roti Maker':         'Kitchen Appliances',
  'Dough Maker':        'Kitchen Appliances',
  'Egg Boiler':         'Kitchen Appliances',
  'Hot Plate':          'Kitchen Appliances',
  'Ceramic Cooker':     'Kitchen Appliances',
  'Kitchen Scale':      'Kitchen Appliances',
  'Food Chopper':       'Kitchen Appliances',
  'Food Slicer':        'Kitchen Appliances',
  'Kitchen Robot':      'Kitchen Appliances',
  'Water Boiler':       'Kitchen Appliances',
  'Pressure Cooker':    'Kitchen Appliances',
  'Air Fryer':          'Kitchen Appliances',
  'Deep Fryer':         'Kitchen Appliances',
  'Microwave Oven':     'Kitchen Appliances',
  'Electric Oven':      'Kitchen Appliances',
  'Rotisserie Oven':    'Kitchen Appliances',
  'Bread Toaster':      'Kitchen Appliances',
  'Water Dispenser':    'Kitchen Appliances',
  'Vacuum Cleaner':     'Small Appliances',
  'Hair Dryer':         'Small Appliances',
  'Hair Straightener':  'Small Appliances',
  'Hair Clipper':       'Small Appliances',
  'Hair Trimmer':       'Small Appliances',
  'Facial Steamer':     'Small Appliances',
  'Garment Steamer':    'Small Appliances',
  'Electric Iron':      'Small Appliances',
  'Room Heater':        'Small Appliances',
  'Fan Heater':         'Small Appliances',
  'Tower Fan':          'Small Appliances',
  'Humidifier':         'Small Appliances',
  'Air Purifier':       'Small Appliances',
  'Immersion Rod':      'Small Appliances',
  'Insect Killer':      'Small Appliances',
  'Digital Scale':      'Small Appliances',
  'Baby Appliance':     'Small Appliances',
};

// ── Spec templates per product type ──────────────────────────────────────────
const SPECS = {
  'Air Fryer':       { Type: 'Air Fryer', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Deep Fryer':      { Type: 'Deep Fryer', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Microwave Oven':  { Type: 'Microwave Oven', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Electric Oven':   { Type: 'Electric Oven', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Rotisserie Oven': { Type: 'Rotisserie Oven', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Blender':         { Type: 'Blender', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Juicer':          { Type: 'Juicer', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Juicer Blender':  { Type: 'Juicer / Blender / Dry Mill', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Hand Blender':    { Type: 'Hand Blender', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Hand Mixer':      { Type: 'Hand Mixer', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Food Processor':  { Type: 'Food Processor / Food Factory', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Kitchen Chef':    { Type: 'Kitchen Chef / Multi-Function', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Kitchen Robot':   { Type: 'Kitchen Robot / Food Processor', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Electric Kettle': { Type: 'Electric Kettle', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Sandwich Toaster':{ Type: 'Sandwich Toaster', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Bread Toaster':   { Type: 'Pop-Up Bread Toaster', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Grinder':         { Type: 'Dry/Wet Grinder', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Coffee Grinder':  { Type: 'Coffee & Spice Grinder', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Coffee Maker':    { Type: 'Drip Coffee Maker', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Rice Cooker':     { Type: 'Electric Rice Cooker', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Pressure Cooker': { Type: 'Electric Pressure Cooker', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Roti Maker':      { Type: 'Electric Roti Maker', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Dough Maker':     { Type: 'Electric Dough Maker', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Egg Boiler':      { Type: 'Electric Egg Boiler', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Hot Plate':       { Type: 'Electric Hot Plate', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Ceramic Cooker':  { Type: 'Ceramic Cooker', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Kitchen Scale':   { Type: 'Digital Kitchen Scale', 'Power Supply': 'Battery', Warranty: '2 years parts & labour' },
  'Food Chopper':    { Type: 'Food Chopper', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Meat Mincer':     { Type: 'Electric Meat Mincer', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Water Boiler':    { Type: 'Electric Water Boiler', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Water Dispenser': { Type: 'Water Dispenser', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Vacuum Cleaner':  { Type: 'Vacuum Cleaner', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Electric Iron':   { Type: 'Electric Iron', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Hair Dryer':      { Type: 'Hair Dryer', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Hair Straightener':{ Type: 'Hair Straightener / Straightening Brush', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Hair Clipper':    { Type: 'Hair Clipper', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Hair Trimmer':    { Type: 'Hair Trimmer', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Facial Steamer':  { Type: 'Facial Steamer', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Garment Steamer': { Type: 'Garment Steamer', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Room Heater':     { Type: 'Room Heater', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Fan Heater':      { Type: 'Fan Heater', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Tower Fan':       { Type: 'Tower Fan', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Humidifier':      { Type: 'Ultrasonic Humidifier', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Air Purifier':    { Type: 'Air Purifier', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Immersion Rod':   { Type: 'Immersion Rod / Water Heater', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Insect Killer':   { Type: 'Electric Insect Killer', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Baby Appliance':  { Type: 'Baby Care Appliance', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Digital Scale':      { Type: 'Digital Weight Scale', 'Power Supply': 'Battery', Warranty: '2 years parts & labour' },
  'Slow Juicer':        { Type: 'Slow / Cold Press Juicer', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Epilator':           { Type: 'Epilator', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Massager':           { Type: 'Foot Massager', 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' },
  'Kitchen Accessory':  { Type: 'Kitchen Accessory', 'Power Supply': 'N/A', Warranty: '2 years parts & labour' },
};

const EXTRA_CATS = {
  'Epilator':          'Small Appliances',
  'Massager':          'Small Appliances',
  'Kitchen Accessory': 'Kitchen Appliances',
};

function wpLookup(model) {
  const key = model.toLowerCase().replace(/^wf-?/, '').replace(/\s+/g, '');
  return WP_NAMES[key] ?? null;
}

async function main() {
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }
  console.log('Signed in.\n');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, brand, model, category, simplified_name, retail_price, cash_floor, thumbnail_url, gallery_urls')
    .ilike('brand', 'westpoint');

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }
  console.log(`Found ${products.length} Westpoint products.\n`);

  let updated = 0, unknown = 0, skipped = 0;

  for (const p of products) {
    const entry = wpLookup(p.model);
    if (!entry) {
      console.log(`  UNKNOWN  WF-${p.model} — not in lookup table`);
      unknown++;
      continue;
    }

    const [name, subCat] = entry;
    const dbCategory = CAT_MAP[subCat] || EXTRA_CATS[subCat] || p.category;
    const specs = SPECS[subCat] || { Type: subCat, 'Power Supply': '220V / 50Hz', Warranty: '2 years parts & labour' };
    const tags = `westpoint, Westpoint, WF-${p.model}, ${name.toLowerCase()}, karachi, pakistan, reliance appliances, installment, easy installments, ${subCat.toLowerCase()}, appliance, westpoint appliance, appliance karachi, appliance price pakistan`;
    const description = `The ${name} by Westpoint is a quality appliance designed for everyday Pakistani households. Built to local electrical standards (220V/50Hz). Warranty: 2 years parts & labour. Available at Reliance Appliances, Karachi — on easy installments or cash. Call or WhatsApp for the latest price.`;
    const seo_title = `${name} Price in Pakistan | Buy on Installments — Reliance Appliances Karachi`;
    const seo_desc  = `Buy the ${name} in Karachi at the best price. Available on easy installments at Reliance Appliances. 2 years warranty. Call or WhatsApp now.`;

    const unchanged = p.simplified_name === name && p.category === dbCategory;
    if (unchanged && !DRY_RUN) { skipped++; continue; }

    console.log(`  ${DRY_RUN ? 'would' : 'UPDATE'} WF-${p.model}`);
    console.log(`         name:     ${p.simplified_name} → ${name}`);
    console.log(`         category: ${p.category} → ${dbCategory} (${subCat})`);

    if (!DRY_RUN) {
      const { error: e } = await supabase.from('products').update({
        simplified_name: name,
        category:        dbCategory,
        sub_category:    subCat,
        specs,
        description,
        tags,
        seo_title,
        seo_desc,
        updated_at: new Date().toISOString(),
      }).eq('id', p.id);
      if (e) { console.error(`    ✗ ${e.message}`); continue; }
    }
    updated++;
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Updated  : ${updated}`);
  console.log(`Skipped  : ${skipped} (already correct)`);
  console.log(`Unknown  : ${unknown} (not in lookup table — needs manual entry)`);
  if (DRY_RUN) console.log(`\n(Dry run — run without --dry-run to apply)`);
  console.log();
}

main().catch(err => { console.error(err); process.exit(1); });

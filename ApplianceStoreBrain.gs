/**
 * ══════════════════════════════════════════════════════════════════════════
 *  RELIANCE APPLIANCES — ApplianceStoreBrain.gs  v3.0
 *  Google Apps Script — Single-file, fully self-contained
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  HOW TO DEPLOY:
 *  1. Open your Google Sheet → Extensions → Apps Script
 *  2. Paste this entire file
 *  3. Run setupAllSheets() ONCE to create all tabs
 *  4. Deploy → New Deployment → Web App
 *     Execute as: Me | Access: Anyone
 *  5. Copy the Web App URL → paste in .env as VITE_SHEETS_URL
 *
 *  TABS CREATED (17):
 *  Raw_Import, Master_Products, Price_Archive, CRM_Customers, Orders,
 *  FollowUp_Schedule, Warranty_Tracker, Maintenance_Reminders,
 *  Power_Solutions, Packages_Offers, Loyalty_Tiers, Referrals,
 *  SEO_Content, Bot_Scripts, Competitor_Monitor, Analytics, Sync_Logs
 *
 *  KEY POLICY:
 *  - Markup ratios and advance % are INTERNAL ONLY — never returned via API
 *  - API returns: advance (PKR amount), monthly (PKR amount), total (PKR amount)
 *  - No percentage breakdowns ever surface in public JSON responses
 * ══════════════════════════════════════════════════════════════════════════
 */

// ── INTERNAL PLAN CONFIG — NEVER EXPOSED VIA API ─────────────────────────
const _PLAN_CONFIG = {
  '2m':  { markup: 1.10, advRatio: 0.50, installments: 1  },
  '3m':  { markup: 1.15, advRatio: 0.50, installments: 2  },
  '6m':  { markup: 1.25, advRatio: 0.40, installments: 5  },
  '12m': { markup: 1.40, advRatio: 0.30, installments: 11 },
};

function _calcPlan(retailPrice, planKey) {
  var cfg     = _PLAN_CONFIG[planKey];
  var total   = Math.round(retailPrice * cfg.markup);
  var advance = Math.round(total * cfg.advRatio);
  var monthly = cfg.installments > 0 ? Math.round((total - advance) / cfg.installments) : 0;
  var months  = planKey === '2m' ? 2 : planKey === '3m' ? 3 : planKey === '6m' ? 6 : 12;
  // Return AMOUNTS ONLY — no ratios, no percentages
  return { months: months, total: total, advance: advance, monthly: monthly };
}

function _calcAllPlans(retailPrice) {
  return {
    '2m':  _calcPlan(retailPrice, '2m'),
    '3m':  _calcPlan(retailPrice, '3m'),
    '6m':  _calcPlan(retailPrice, '6m'),
    '12m': _calcPlan(retailPrice, '12m'),
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  WEB APP ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────

function doGet(e) {
  var action = e.parameter.action || 'getProducts';
  var result;

  try {
    switch (action) {
      case 'getProducts':    result = getProducts();    break;
      case 'getCategories':  result = getCategories();  break;
      case 'getProduct':     result = getProduct(e.parameter.slug); break;
      case 'getCrmStats':    result = getCrmStats();    break;
      case 'getAnalytics':   result = getAnalytics();   break;
      case 'getCompetitor':  result = getCompetitorData(); break;
      case 'getFollowUps':   result = getFollowUps();   break;
      default:               result = { error: 'Unknown action' };
    }
  } catch(err) {
    result = { error: err.message };
    _log('API Error', action, err.message);
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body   = JSON.parse(e.postData.contents);
  var action = body.action;
  var result;

  try {
    switch (action) {
      case 'addOrder':        result = addOrder(body);        break;
      case 'addCrmContact':   result = addCrmContact(body);   break;
      case 'updateFollowUp':  result = updateFollowUp(body);  break;
      case 'logAnalytics':    result = logAnalytics(body);    break;
      case 'logCompetitor':          result = logCompetitor(body);             break;
      case 'generateCorporateQuote': result = generateCorporateQuote(body);    break;
      case 'generateSolarQuote':     result = generateSolarQuote(body);        break;
      default:                       result = { error: 'Unknown action' };
    }
  } catch(err) {
    result = { error: err.message };
    _log('POST Error', action, err.message);
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────────────────
//  PRODUCT API
// ─────────────────────────────────────────────────────────────────────────

function getProducts() {
  var sheet = _getSheet('Master_Products');
  var rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return _getFallbackProducts();

  var headers = rows[0];
  var products = [];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0]) continue;
    var p = _rowToProduct(headers, row);
    if (p) products.push(p);
  }

  return products.length > 0 ? products : _getFallbackProducts();
}

function getProduct(slug) {
  if (!slug) return null;
  var all = getProducts();
  return all.find(function(p) { return p.slug === slug; }) || null;
}

function getCategories() {
  return [
    { name:'Air Conditioners',   slug:'air-conditioners',   icon:'❄️' },
    { name:'Refrigerators',      slug:'refrigerators',      icon:'🧊' },
    { name:'Washing Machines',   slug:'washing-machines',   icon:'🫧' },
    { name:'Televisions',        slug:'televisions',        icon:'📺' },
    { name:'Solar Solutions',    slug:'solar-solutions',    icon:'☀️' },
    { name:'Kitchen Appliances', slug:'kitchen-appliances', icon:'🍳' },
    { name:'Water Dispensers',   slug:'water-dispensers',   icon:'💧' },
    { name:'Small Appliances',   slug:'small-appliances',   icon:'🔌' },
  ];
}

function _rowToProduct(headers, row) {
  var obj = {};
  headers.forEach(function(h, i) { obj[h] = row[i]; });

  var retailPrice   = parseFloat(obj['Retail_Price']) || 0;
  var cashFloor     = parseFloat(obj['Cash_Floor'])   || Math.round(retailPrice * 0.95);
  var plans         = _calcAllPlans(retailPrice);

  // Parse specs JSON safely
  var specs = {};
  try { specs = JSON.parse(obj['Specs_JSON'] || '{}'); } catch(e) { specs = {}; }

  // Image_Main → thumbnail, Image_Gallery → single gallery image (clean, no watermarks)
  var rawMain    = (obj['Image_Main']    || '').toString().trim();
  var rawGallery = (obj['Image_Gallery'] || '').toString().trim();
  var thumbnail  = _isCleanImageUrl(rawMain)    ? rawMain    : '';
  var gallery    = _isCleanImageUrl(rawGallery) ? [rawGallery] : [];

  return {
    id:          obj['Product_ID']   || '',
    brand:       obj['Brand']        || '',
    model:       obj['Model']        || '',
    category:    obj['Category']     || '',
    slug:        obj['Slug']         || _slugify(obj['Brand'] + '-' + obj['Model']),
    description: obj['Description']  || '',
    specs:       specs,
    tags:        obj['Tags']         || '',
    colors:      obj['Colors']       || '',
    price: {
      min:        parseFloat(obj['Min_Price'])   || 0,
      retail:     retailPrice,
      cash_floor: cashFloor,
    },
    // !! Only PKR amounts returned — NO markup ratios, NO advance percentages
    installments: plans,
    warranty:     obj['Warranty']     || '',
    stock_status: obj['Stock_Status'] || 'In Stock',
    featured:     obj['Featured'] === 'TRUE' || obj['Featured'] === true,
    thumbnail:    thumbnail,
    gallery:      gallery,
    seo: {
      title:       obj['SEO_Title']       || '',
      description: obj['SEO_Description'] || '',
      keywords:    obj['SEO_Keywords']    || '',
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  ENRICHMENT ENGINE
// ─────────────────────────────────────────────────────────────────────────

function fullSync() {
  _importRawProducts();
  enrichAllProducts();
  recalculatePrices();
  generateSEOContent();
  _log('fullSync', 'complete', new Date().toISOString());
}

function _importRawProducts() {
  var raw    = _getSheet('Raw_Import');
  var master = _getSheet('Master_Products');
  var rawRows = raw.getDataRange().getValues();
  if (rawRows.length < 2) return;

  var masterHeaders = master.getRange(1,1).getValue() === 'Product_ID'
    ? master.getRange(1, 1, 1, master.getLastColumn()).getValues()[0]
    : _setupMasterHeaders(master);

  var existingSlugs = [];
  if (master.getLastRow() > 1) {
    var slugCol = masterHeaders.indexOf('Slug') + 1;
    if (slugCol > 0) {
      existingSlugs = master.getRange(2, slugCol, master.getLastRow()-1).getValues().flat();
    }
  }

  var added = 0;
  for (var i = 1; i < rawRows.length; i++) {
    var row = rawRows[i];
    if (!row[0] || !row[1]) continue;

    var brand    = row[0].toString().trim();
    var model    = row[1].toString().trim();
    var category = row[2] ? row[2].toString().trim() : _detectCategory(brand, model);
    var minPrice = parseFloat(row[3]) || 0;
    var slug     = _slugify(brand + '-' + model);

    if (existingSlugs.indexOf(slug) >= 0) continue;

    var retail   = Math.round(minPrice * 1.15);
    var cashFloor = Math.round(retail * 0.95);
    var id       = 'PROD' + (Date.now() % 100000) + i;

    var newRow = new Array(masterHeaders.length).fill('');
    var set = function(key, val) {
      var idx = masterHeaders.indexOf(key);
      if (idx >= 0) newRow[idx] = val;
    };

    set('Product_ID', id);
    set('Brand', brand);
    set('Model', model);
    set('Category', category);
    set('Sub_Category', row[4] || '');
    set('Slug', slug);
    set('Min_Price', minPrice);
    set('Retail_Price', retail);
    set('Cash_Floor', cashFloor);
    set('Stock_Status', 'In Stock');
    set('Featured', 'FALSE');
    set('Import_Date', new Date().toISOString().split('T')[0]);

    master.appendRow(newRow);
    existingSlugs.push(slug);
    added++;
  }

  _log('Import', 'Products imported', added);
  return added;
}

function enrichAllProducts() {
  var sheet = _getSheet('Master_Products');
  var rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return;

  var headers = rows[0];
  var enriched = 0;

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0]) continue;

    var obj = {};
    headers.forEach(function(h, j) { obj[h] = row[j]; });

    var brand    = obj['Brand'] || '';
    var model    = obj['Model'] || '';
    var category = obj['Category'] || _detectCategory(brand, model);
    var retail   = parseFloat(obj['Retail_Price']) || 0;

    // Only enrich if fields are empty
    var needsEnrich = !obj['Description'] || !obj['Warranty'] || !obj['Tags'];
    if (!needsEnrich) continue;

    var enriched_data = _buildEnrichment(brand, model, category, retail);

    var update = function(key, val) {
      var col = headers.indexOf(key) + 1;
      if (col > 0 && val) sheet.getRange(i+1, col).setValue(val);
    };

    if (!obj['Description']) update('Description', enriched_data.description);
    if (!obj['Warranty'])    update('Warranty',    enriched_data.warranty);
    if (!obj['Tags'])        update('Tags',        enriched_data.tags);
    if (!obj['Colors'])      update('Colors',      enriched_data.colors);
    if (!obj['Specs_JSON'])  update('Specs_JSON',  JSON.stringify(enriched_data.specs));
    if (!obj['Category'])    update('Category',    category);

    // Two clean images from Drive: Image_Main (thumbnail) + Image_Gallery (one gallery shot)
    var images = _fetchImagesFromDrive(brand, model);
    if (images.thumbnail) {
      if (!obj['Image_Main'])    update('Image_Main',    images.thumbnail);
      if (!obj['Image_Gallery']) update('Image_Gallery', images.gallery[0] || '');
    }

    enriched++;
    Utilities.sleep(200); // rate limit
  }

  _log('Enrichment', 'Products enriched', enriched);
  return enriched;
}

function _buildEnrichment(brand, model, category, retail) {
  var cat = category.toLowerCase();
  var mod = model.toUpperCase();

  // Description
  var desc = brand + ' ' + model + ' — ';
  if (cat.includes('air') || cat.includes('ac')) {
    var tons = mod.includes('24') ? '2 ton' : mod.includes('18') ? '1.5 ton' : mod.includes('12') ? '1 ton' : mod.includes('9') ? '0.75 ton' : '1.5 ton';
    var inv  = mod.includes('INV') || mod.includes('DC') || mod.includes('NF') ? 'DC Inverter' : 'Standard';
    desc += inv + ' ' + tons + ' Air Conditioner. Engineered for Karachi\'s climate. Energy-efficient cooling with fast-cool technology and self-cleaning filter.';
  } else if (cat.includes('fridge') || cat.includes('refrig')) {
    var cap = mod.includes('91') ? '14 cu ft' : mod.includes('95') ? '16 cu ft' : mod.includes('98') ? '18 cu ft' : '14 cu ft';
    desc += cap + ' Refrigerator with inverter compressor for maximum energy savings. Chrome/glass finish with door alarm and moisture-lock crisper.';
  } else if (cat.includes('wash')) {
    var load = mod.includes('front') || mod.includes('FL') ? 'Front Load' : 'Top Load';
    var kg   = mod.match(/\d+kg/i) ? mod.match(/\d+kg/i)[0] : '8kg';
    desc += kg + ' ' + load + ' Washing Machine. Multiple wash programs including quick wash, eco mode, and delicates. Lint filter included.';
  } else if (cat.includes('tv') || cat.includes('telev')) {
    var size = mod.match(/\d+/) ? mod.match(/\d+/)[0] + '"' : '55"';
    desc += size + ' Smart TV with 4K Ultra HD resolution. HDR support, smart platform with Netflix/YouTube built-in. Wide viewing angle panel.';
  } else if (cat.includes('solar')) {
    var watts = mod.match(/\d+[Ww]/) ? mod.match(/\d+[Ww]/)[0] : '400W';
    desc += watts + ' Monocrystalline Solar Panel. High-efficiency cell technology, anti-reflective glass, 25-year performance guarantee.';
  } else {
    desc += 'Premium quality home appliance from ' + brand + '. Built for reliability and performance. Full manufacturer warranty included.';
  }

  // Warranty
  var warranty = '';
  var b = brand.toLowerCase();
  if (cat.includes('air') || cat.includes('ac')) {
    warranty = b.includes('haier') ? '5 years compressor, 1 year parts' :
               b.includes('gree')  ? '5 years compressor, 1 year parts' :
               b.includes('daikin')? '5 years compressor, 2 years parts' :
               '1 year parts and labour';
  } else if (cat.includes('fridge') || cat.includes('refrig')) {
    warranty = b.includes('dawlance') ? '10 years compressor, 2 years parts' :
               b.includes('haier')    ? '5 years compressor, 2 years parts' :
               '2 years parts, 5 years compressor';
  } else if (cat.includes('solar')) {
    warranty = '25 years performance (80%), 12 years product warranty';
  } else if (cat.includes('tv')) {
    warranty = '1 year parts and labour, panel 1 year';
  } else {
    warranty = '1 year manufacturer warranty';
  }

  // Tags
  var tags = [brand, model, category, 'karachi', 'installment', 'aqsaat', 'pakistan', 'reliance appliances'];
  if (cat.includes('air') || cat.includes('ac')) tags.push('inverter ac', 'air conditioner', 'climate control');
  if (cat.includes('fridge')) tags.push('refrigerator', 'fridge', 'chrome refrigerator');
  if (cat.includes('solar')) tags.push('solar panel', 'solar system', 'net metering', 'bijli');
  tags.push('warranty', 'genuine', 'official');

  // Colors
  var colors = cat.includes('air') || cat.includes('ac') ? 'White' :
               cat.includes('fridge') ? 'Chrome Silver, Graphite Black, Glass White' :
               cat.includes('solar') ? 'Black Frame / Silver Frame' :
               cat.includes('tv') ? 'Jet Black' : 'White';

  // Specs
  var specs = {};
  if (cat.includes('air') || cat.includes('ac')) {
    var t = mod.includes('24') ? '2' : mod.includes('18') ? '1.5' : mod.includes('12') ? '1' : '1.5';
    specs = { capacity: t + ' Ton', type: 'Split AC', technology: mod.includes('DC') || mod.includes('INV') ? 'DC Inverter' : 'Fixed Speed',
              refrigerant: 'R32', voltage: '220V / 50Hz', noise_level: '19–43 dB' };
  } else if (cat.includes('fridge') || cat.includes('refrig')) {
    specs = { capacity: '14–18 Cu Ft', type: 'Double Door', compressor: 'Inverter', defrost: 'Auto', voltage: '220V / 50Hz' };
  } else if (cat.includes('solar')) {
    var w = mod.match(/\d+/) ? mod.match(/\d+/)[0] : '400';
    specs = { wattage: w + 'W', cell_type: 'Monocrystalline', efficiency: '21%+', voc: '49.5V', dimensions: '1722×1134×35mm' };
  } else if (cat.includes('tv')) {
    specs = { resolution: '3840×2160 (4K)', hdr: 'HDR10', smart: 'Yes', hdmi_ports: '3', wifi: '802.11ac' };
  }

  return { description: desc, warranty: warranty, tags: tags.join(','), colors: colors, specs: specs };
}

// ─────────────────────────────────────────────────────────────────────────
//  COMPETITOR CROSS-VERIFICATION ENGINE
// ─────────────────────────────────────────────────────────────────────────

function runCompetitorCheck() {
  var sheet    = _getSheet('Master_Products');
  var compSheet = _getSheet('Competitor_Monitor');
  var rows     = sheet.getDataRange().getValues();
  if (rows.length < 2) return;

  var headers = rows[0];
  var checked = 0;

  var COMPETITORS = [
    { name:'Daraz',        urlTemplate:'https://www.daraz.pk/catalog/?q={query}' },
    { name:'HomeShopping', urlTemplate:'https://www.homeshopping.pk/search?term={query}' },
    { name:'Yayvo',        urlTemplate:'https://www.yayvo.com/catalogsearch/result/?q={query}' },
  ];

  for (var i = 1; i < Math.min(rows.length, 11); i++) { // check first 10 products
    var row  = rows[i];
    if (!row[0]) continue;

    var obj = {};
    headers.forEach(function(h, j) { obj[h] = row[j]; });

    var brand  = obj['Brand'] || '';
    var model  = obj['Model'] || '';
    var retail = parseFloat(obj['Retail_Price']) || 0;
    var query  = encodeURIComponent(brand + ' ' + model);

    COMPETITORS.forEach(function(comp) {
      try {
        var url      = comp.urlTemplate.replace('{query}', query);
        var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
        var html     = response.getContentText();

        // Extract price patterns from HTML (simplified pattern matching)
        var priceMatch = html.match(/(?:PKR|Rs\.?)\s*([\d,]+)/i);
        var competitorPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g,'')) : 0;

        if (competitorPrice > 1000) {
          var diff     = retail - competitorPrice;
          var status   = diff < 0 ? 'We are cheaper' : diff > 0 ? 'They are cheaper' : 'Same price';

          // Log to Competitor_Monitor sheet
          compSheet.appendRow([
            new Date().toISOString(),
            brand + ' ' + model,
            obj['Product_ID'],
            comp.name,
            retail,
            competitorPrice,
            diff,
            status,
            'Price',
            url,
          ]);
          checked++;
        }
      } catch(e) {
        _log('CompetitorCheck', brand + ' ' + model, 'Fetch error: ' + e.message);
      }
      Utilities.sleep(500);
    });
  }

  // Also do spec cross-checking (flag mismatches for manual review)
  _flagSpecMismatches();
  _log('CompetitorCheck', 'Products checked', checked);
  return checked;
}

function _flagSpecMismatches() {
  // Known spec discrepancies to watch for (enriched with live UrlFetch where available)
  var compSheet = _getSheet('Competitor_Monitor');
  var KNOWN_CHECKS = [
    { product:'Haier.*HSU', field:'Specs', check:'R32 refrigerant', note:'Verify R32 vs R410A across listings' },
    { product:'Samsung.*TV',  field:'HDR',   check:'HDR10+',          note:'Check if HDR10 or HDR10+ on all platforms' },
    { product:'Jinko.*400',   field:'Warranty', check:'10yr product', note:'Verify 12yr vs 10yr product warranty across sources' },
  ];

  KNOWN_CHECKS.forEach(function(c) {
    compSheet.appendRow([
      new Date().toISOString(),
      c.product,
      '',
      'Cross-Platform',
      '',
      '',
      '',
      'Spec Review Needed',
      c.field + ': ' + c.note,
      '',
    ]);
  });
}

function getCompetitorData() {
  var sheet = _getSheet('Competitor_Monitor');
  var rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  var headers = rows[0];
  return rows.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  }).filter(function(r) { return r['Product'] || r['product']; });
}

// ─────────────────────────────────────────────────────────────────────────
//  CRM ENGINE
// ─────────────────────────────────────────────────────────────────────────

function addOrder(data) {
  var sheet    = _getSheet('Orders');
  var orderId  = 'ORD-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6);
  var today    = new Date();

  // Calculate warranty expiry from product warranty string
  var warrantyMonths = 12;
  var ws = (data.warranty || '').toLowerCase();
  if (ws.includes('10 year')) warrantyMonths = 120;
  else if (ws.includes('5 year')) warrantyMonths = 60;
  else if (ws.includes('2 year')) warrantyMonths = 24;

  var warrantyExpiry = new Date(today);
  warrantyExpiry.setMonth(warrantyExpiry.getMonth() + warrantyMonths);

  sheet.appendRow([
    orderId, today.toISOString().split('T')[0],
    data.customerName || '', data.customerPhone || '', data.area || '', data.address || '',
    data.productId || '', data.productName || '', data.qty || 1,
    data.plan || 'cash', data.amount || 0,
    data.withInstallation ? 'Yes' : 'No', data.installationCost || 0,
    'Confirmed', warrantyExpiry.toISOString().split('T')[0],
    data.notes || '', new Date().toISOString(),
  ]);

  // Auto-schedule follow-ups
  _scheduleFollowUps(orderId, data, warrantyExpiry);

  // Auto-create warranty record
  _createWarrantyRecord(orderId, data, warrantyExpiry);

  // Auto-create maintenance record
  _createMaintenanceRecord(orderId, data);

  // Archive price
  _archivePrice(data.productId, data.amount, data.plan);

  // Update customer tier
  _updateCustomerSpend(data.customerPhone, data.amount);

  _log('Order', orderId, data.productName);
  return { success: true, orderId: orderId };
}

function _scheduleFollowUps(orderId, data, warrantyExpiry) {
  var sheet   = _getSheet('FollowUp_Schedule');
  var today   = new Date();
  var cName   = data.customerName || 'Customer';
  var cPhone  = data.customerPhone || '';
  var product = data.productName  || '';

  // Determine maintenance cycle from category
  var cat = (data.category || product).toLowerCase();
  var maintenanceDays = cat.includes('ac') ? 90 : cat.includes('solar') ? 180 : 365;

  var schedule = [
    {
      type:    'post-sale',
      daysOut: 3,
      msg_ur:  'Salam ' + cName + '! ' + product + ' ki delivery ke 3 din baad check in kar raha hoon. Product theek kaam kar raha hai? Koi sawal ho toh zaroor batain!',
      msg_en:  'Hi ' + cName + '! Checking in 3 days after your ' + product + ' delivery. Is everything working perfectly? Any questions at all?',
    },
    {
      type:    'quarterly',
      daysOut: 90,
      msg_ur:  'Salam ' + cName + '! ' + product + ' ko 3 mahine hogaye — umeed hai sab theek chal raha hai. Koi maintenance tip chahiye? Hum hamesha available hain!',
      msg_en:  'Hi ' + cName + '! 3 months with your ' + product + '. How is it performing? Any tips needed for optimal maintenance?',
    },
    {
      type:    'maintenance',
      daysOut: maintenanceDays,
      msg_ur:  'Salam ' + cName + '! ' + product + ' ka routine service due hai. Regular maintenance se life expectancy 3-5 saal barh jaati hai. Schedule karein?',
      msg_en:  'Hi ' + cName + '! Your ' + product + ' is due for routine service. Regular maintenance extends lifespan by 3–5 years. Want to schedule?',
    },
    {
      type:    'annual',
      daysOut: 365,
      msg_ur:  'Salam ' + cName + '! ' + product + ' ki 1 saal poori hoi — Mubarak ho! Annual service aur health check ke liye hamari team ready hai.',
      msg_en:  'Hi ' + cName + '! One year with your ' + product + '! Time for an annual service and health check. Our team is ready.',
    },
    {
      type:    'warranty-expiry',
      daysOut: Math.round((warrantyExpiry - today) / 86400000) - 30,
      msg_ur:  'Salam ' + cName + '! ' + product + ' ki warranty aglay mahine expire ho rahi hai. Extended warranty plan ke baare mein janana chahein?',
      msg_en:  'Hi ' + cName + '! Your ' + product + ' warranty expires next month. Interested in our extended warranty plan?',
    },
    {
      type:    'upgrade',
      daysOut: 700,
      msg_ur:  'Salam ' + cName + '! Kya aap ' + product + ' ko upgrade karna chahein ge? Loyalty customers ko exclusive pricing milti hai. New models available hain!',
      msg_en:  'Hi ' + cName + '! Would you like to upgrade your ' + product + '? Loyalty customers get exclusive pricing on our latest models!',
    },
  ];

  schedule.forEach(function(s) {
    var dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + Math.max(1, s.daysOut));

    sheet.appendRow([
      'FU-' + Date.now().toString().slice(-6) + '-' + s.type,
      orderId, cName, cPhone, product,
      s.type, dueDate.toISOString().split('T')[0],
      'Scheduled', s.msg_ur, s.msg_en,
      new Date().toISOString(),
    ]);
  });
}

function _createWarrantyRecord(orderId, data, warrantyExpiry) {
  var sheet = _getSheet('Warranty_Tracker');
  sheet.appendRow([
    'WR-' + Date.now().toString().slice(-6),
    orderId, data.customerName, data.customerPhone,
    data.productId, data.productName,
    new Date().toISOString().split('T')[0],
    warrantyExpiry.toISOString().split('T')[0],
    data.warranty || '1 year', 'Active', '', '', new Date().toISOString(),
  ]);
}

function _createMaintenanceRecord(orderId, data) {
  var sheet = _getSheet('Maintenance_Reminders');
  var today = new Date();
  var cat   = (data.category || data.productName || '').toLowerCase();
  var cycleMonths = cat.includes('ac') ? 3 : cat.includes('solar') ? 6 : 12;
  var nextDate = new Date(today);
  nextDate.setMonth(nextDate.getMonth() + cycleMonths);

  sheet.appendRow([
    'MR-' + Date.now().toString().slice(-6),
    orderId, data.customerName, data.customerPhone,
    data.productName, cycleMonths + ' months',
    today.toISOString().split('T')[0],
    nextDate.toISOString().split('T')[0],
    'Scheduled', '',
  ]);
}

function addCrmContact(data) {
  var sheet = _getSheet('CRM_Customers');
  var id    = 'CUST-' + Date.now().toString().slice(-7);

  // Check if customer exists by phone
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][2] === data.phone) {
      return { success: true, customerId: rows[i][0], existing: true };
    }
  }

  sheet.appendRow([
    id, data.name || '', data.phone || '', data.email || '',
    data.area || '', 'Bronze', 0, 0,
    'REF' + Math.random().toString(36).substr(2,6).toUpperCase(),
    new Date().toISOString().split('T')[0],
    data.powerNotes || '', data.applianceCount || 0, data.notes || '',
  ]);

  return { success: true, customerId: id };
}

function updateFollowUp(data) {
  var sheet = _getSheet('FollowUp_Schedule');
  var rows  = sheet.getDataRange().getValues();
  var headers = rows[0];
  var idCol   = headers.indexOf('FollowUp_ID') + 1;
  var statCol = headers.indexOf('Status') + 1;
  var noteCol = headers.indexOf('Notes') + 1;

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][idCol-1] === data.followUpId) {
      sheet.getRange(i+1, statCol).setValue(data.status || 'Done');
      if (data.notes && noteCol > 0) sheet.getRange(i+1, noteCol).setValue(data.notes);
      return { success: true };
    }
  }
  return { error: 'FollowUp not found' };
}

function _updateCustomerSpend(phone, amount) {
  if (!phone) return;
  var sheet = _getSheet('CRM_Customers');
  var rows  = sheet.getDataRange().getValues();
  var headers = rows[0];
  var phoneCol = headers.indexOf('Phone') + 1;
  var spendCol = headers.indexOf('Total_Spend') + 1;
  var tierCol  = headers.indexOf('Tier') + 1;

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][phoneCol-1] === phone && spendCol > 0) {
      var newSpend = (parseFloat(rows[i][spendCol-1]) || 0) + amount;
      sheet.getRange(i+1, spendCol).setValue(newSpend);
      // Update tier
      var tier = newSpend >= 500000 ? 'Platinum' : newSpend >= 150000 ? 'Gold' : newSpend >= 50000 ? 'Silver' : 'Bronze';
      if (tierCol > 0) sheet.getRange(i+1, tierCol).setValue(tier);
      return;
    }
  }
}

function processFollowUps() {
  var sheet   = _getSheet('FollowUp_Schedule');
  var rows    = sheet.getDataRange().getValues();
  var headers = rows[0];
  var today   = new Date().toISOString().split('T')[0];
  var processed = 0;

  var dueCol  = headers.indexOf('Due_Date') + 1;
  var statCol = headers.indexOf('Status') + 1;

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][statCol-1] === 'Scheduled' && rows[i][dueCol-1] <= today) {
      sheet.getRange(i+1, statCol).setValue('Due - Send Now');
      processed++;
    }
  }

  _log('FollowUps', 'Marked due', processed);
  return processed;
}

function checkMaintenanceDue() {
  var sheet = _getSheet('Maintenance_Reminders');
  var rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return;

  var headers = rows[0];
  var today   = new Date().toISOString().split('T')[0];
  var nextCol = headers.indexOf('Next_Service_Date') + 1;
  var statCol = headers.indexOf('Status') + 1;

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][statCol-1] === 'Scheduled' && rows[i][nextCol-1] <= today) {
      sheet.getRange(i+1, statCol).setValue('Overdue - Action Needed');
    }
  }
}

function getFollowUps() {
  var sheet = _getSheet('FollowUp_Schedule');
  var rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  var headers = rows[0];
  return rows.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  }).filter(function(r) { return r['Status'] === 'Due - Send Now' || r['Status'] === 'Scheduled'; });
}

function getCrmStats() {
  var customers = _getSheet('CRM_Customers').getLastRow() - 1;
  var orders    = _getSheet('Orders').getLastRow() - 1;
  var followups = _getSheet('FollowUp_Schedule').getLastRow() - 1;
  var warranties = _getSheet('Warranty_Tracker').getLastRow() - 1;

  return {
    customers:  Math.max(0, customers),
    orders:     Math.max(0, orders),
    followups:  Math.max(0, followups),
    warranties: Math.max(0, warranties),
    lastSync:   new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  ANALYTICS ENGINE
// ─────────────────────────────────────────────────────────────────────────

function logAnalytics(data) {
  var sheet = _getSheet('Analytics');
  sheet.appendRow([
    new Date().toISOString(),
    data.event     || '',
    data.page      || '',
    data.product   || '',
    data.category  || '',
    data.plan      || '',
    data.amount    || 0,
    data.sessionId || '',
    data.source    || '',
  ]);
  return { success: true };
}

function getAnalytics() {
  var sheet = _getSheet('Analytics');
  var rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return { visits:0, waClicks:0, orders:0 };

  var headers = rows[0];
  var stats   = { visits:0, waClicks:0, orders:0, topPages:{}, topProducts:{} };

  rows.slice(1).forEach(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    if (obj['Event'] === 'pageview') stats.visits++;
    if (obj['Event'] === 'wa_click') stats.waClicks++;
    if (obj['Event'] === 'order')    stats.orders++;
  });

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────
//  PRICE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────

function recalculatePrices() {
  var sheet = _getSheet('Master_Products');
  var rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return;

  var headers   = rows[0];
  var updated   = 0;

  // Column indexes
  var retailCol   = headers.indexOf('Retail_Price') + 1;
  var cashCol     = headers.indexOf('Cash_Floor') + 1;
  var p2mACol     = headers.indexOf('2M_Advance') + 1;
  var p2mMCol     = headers.indexOf('2M_Monthly') + 1;
  var p3mACol     = headers.indexOf('3M_Advance') + 1;
  var p3mMCol     = headers.indexOf('3M_Monthly') + 1;
  var p6mACol     = headers.indexOf('6M_Advance') + 1;
  var p6mMCol     = headers.indexOf('6M_Monthly') + 1;
  var p12mACol    = headers.indexOf('12M_Advance') + 1;
  var p12mMCol    = headers.indexOf('12M_Monthly') + 1;

  for (var i = 1; i < rows.length; i++) {
    var row    = rows[i];
    if (!row[0]) continue;
    var retail = parseFloat(row[retailCol-1]) || 0;
    if (retail <= 0) continue;

    var plans = _calcAllPlans(retail);
    var cash  = Math.round(retail * 0.95);

    if (cashCol > 0 && !rows[i][cashCol-1]) sheet.getRange(i+1, cashCol).setValue(cash);
    // Store PKR amounts in installment columns — no ratios stored here
    if (p2mACol > 0)  sheet.getRange(i+1, p2mACol).setValue(plans['2m'].advance);
    if (p2mMCol > 0)  sheet.getRange(i+1, p2mMCol).setValue(plans['2m'].monthly);
    if (p3mACol > 0)  sheet.getRange(i+1, p3mACol).setValue(plans['3m'].advance);
    if (p3mMCol > 0)  sheet.getRange(i+1, p3mMCol).setValue(plans['3m'].monthly);
    if (p6mACol > 0)  sheet.getRange(i+1, p6mACol).setValue(plans['6m'].advance);
    if (p6mMCol > 0)  sheet.getRange(i+1, p6mMCol).setValue(plans['6m'].monthly);
    if (p12mACol > 0) sheet.getRange(i+1, p12mACol).setValue(plans['12m'].advance);
    if (p12mMCol > 0) sheet.getRange(i+1, p12mMCol).setValue(plans['12m'].monthly);

    updated++;
  }

  _log('Prices', 'Recalculated', updated);
  return updated;
}

function _archivePrice(productId, price, plan) {
  if (!productId || !price) return;
  var sheet = _getSheet('Price_Archive');
  sheet.appendRow([
    new Date().toISOString().split('T')[0], productId, price, plan, new Date().toISOString()
  ]);
}

// ─────────────────────────────────────────────────────────────────────────
//  MULTI-IMAGE DRIVE INTEGRATION
// ─────────────────────────────────────────────────────────────────────────

var DRIVE_FOLDER_ID = '1lREzBPFJGemSR4UkBIfosRCAja7S4quO';

function _fetchImagesFromDrive(brand, model) {
  var result = { thumbnail: '', gallery: [] };
  try {
    var folder  = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var tokens  = (brand + ' ' + model).toLowerCase().split(/[\s\-_]+/).filter(Boolean);
    var scored  = [];

    // Search root folder
    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      scored.push({ file:file, score: _scoreFilename(file.getName(), tokens) });
    }

    // Search brand subfolders
    var subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      var sub = subfolders.next();
      if (tokens.some(function(t) { return sub.getName().toLowerCase().includes(t); })) {
        var subFiles = sub.getFiles();
        while (subFiles.hasNext()) {
          var sf = subFiles.next();
          scored.push({ file:sf, score: _scoreFilename(sf.getName(), tokens) + 5 });
        }
      }
    }

    // Filter images only, sort by score
    var imgExts = ['.jpg','.jpeg','.png','.webp'];
    var images = scored.filter(function(s) {
      return s.score > 0 && imgExts.some(function(ext) { return s.file.getName().toLowerCase().endsWith(ext); });
    }).sort(function(a,b) { return b.score - a.score });

    if (images.length === 0) {
      // Fallback to Unsplash placeholder
      result.thumbnail = _getUnsplashFallback(brand, model);
      return result;
    }

    // Only take top 2 images: index 0 → Image_Main, index 1 → Image_Gallery
    images.slice(0, 2).forEach(function(img, i) {
      try {
        img.file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
        var fileId = img.file.getId();
        var url    = 'https://drive.google.com/uc?export=view&id=' + fileId;
        if (i === 0) result.thumbnail = url;
        else         result.gallery.push(url);
      } catch(e) {}
    });
  } catch(e) {
    result.thumbnail = _getUnsplashFallback(brand, model);
    _log('Drive', 'Image fetch error', e.message);
  }
  return result;
}

function _scoreFilename(filename, tokens) {
  var fn     = filename.toLowerCase();
  var score  = 0;
  tokens.forEach(function(t) { if (fn.includes(t)) score += 3; });
  if (fn.includes('front') || fn.includes('main') || fn.includes('primary') || fn.includes('display')) score += 5;
  if (fn.includes('side') || fn.includes('back') || fn.includes('angle')) score += 1;
  return score;
}

// ── Watermark / logo guard ────────────────────────────────────────────────
// Blocks marketplace URLs that embed seller watermarks or logos.
// Only allows Google Drive direct-view links, Unsplash, and bare HTTPS image URLs
// that are NOT from known watermarked marketplaces.
var _BLOCKED_IMAGE_HOSTS = [
  'daraz.pk','daraz.com','olx.com','olx.com.pk',
  'homeshopping.pk','yayvo.com','naheed.pk','shophive.com',
  'symbios.pk','telemart.pk','ishopping.pk','czone.com.pk',
  'alfatah.com.pk','mega.pk',
  // social / ad platforms that serve watermarked images
  'aliexpress.com','alibaba.com','amazon.com','flipkart.com',
  'ebay.com','wish.com',
];

function _isCleanImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  var trimmed = url.trim();
  if (trimmed.length < 10) return false;
  if (!trimmed.match(/^https?:\/\//i)) return false;

  // Must be an image file or a known trusted image host
  var lc = trimmed.toLowerCase();
  var isImageFile = lc.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/);
  var isGdrive    = lc.includes('drive.google.com/uc') || lc.includes('lh3.googleusercontent.com');
  var isUnsplash  = lc.includes('unsplash.com');
  if (!isImageFile && !isGdrive && !isUnsplash) return false;

  // Block known watermarked marketplaces
  for (var i = 0; i < _BLOCKED_IMAGE_HOSTS.length; i++) {
    if (lc.includes(_BLOCKED_IMAGE_HOSTS[i])) return false;
  }
  return true;
}

function _getUnsplashFallback(brand, model) {
  var cat = _detectCategory(brand, model).toLowerCase();
  // Category-specific Unsplash photos (clean, no watermarks, no seller logos)
  var PHOTOS = {
    'air':     'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80',
    'fridge':  'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80',
    'refrig':  'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&q=80',
    'wash':    'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&q=80',
    'tv':      'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600&q=80',
    'telev':   'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600&q=80',
    'solar':   'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80',
    'kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    'water':   'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    'vacuum':  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  };
  var fallback = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80';
  var keys = Object.keys(PHOTOS);
  for (var i = 0; i < keys.length; i++) {
    if (cat.includes(keys[i])) return PHOTOS[keys[i]];
  }
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────
//  SEO CONTENT GENERATION
// ─────────────────────────────────────────────────────────────────────────

function generateSEOContent() {
  var masterSheet = _getSheet('Master_Products');
  var seoSheet    = _getSheet('SEO_Content');
  var rows        = masterSheet.getDataRange().getValues();
  if (rows.length < 2) return;

  var headers  = rows[0];
  var generated = 0;

  var titleCol = headers.indexOf('SEO_Title') + 1;
  var descCol  = headers.indexOf('SEO_Description') + 1;
  var kwCol    = headers.indexOf('SEO_Keywords') + 1;

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0] || (row[titleCol-1] && row[descCol-1])) continue;

    var obj = {};
    headers.forEach(function(h, j) { obj[h] = row[j]; });

    var brand    = obj['Brand'] || '';
    var model    = obj['Model'] || '';
    var category = obj['Category'] || '';
    var retail   = parseFloat(obj['Retail_Price']) || 0;
    var warranty = obj['Warranty'] || '1 year';

    var title = brand + ' ' + model + ' Price in Karachi | Easy Installments | Reliance Appliances';
    var desc  = 'Buy ' + brand + ' ' + model + ' in Karachi from PKR ' +
                Math.round(retail*0.9).toLocaleString() + '. ' +
                category + ' on easy 2–12 month installments. ' + warranty + '. ' +
                'Free delivery & professional installation. Karachi\'s trusted appliance store since 2015.';
    var kws   = brand + ', ' + model + ', ' + category + ' Karachi, ' + brand + ' ' + category +
                ' price Pakistan, installment ' + category + ' Karachi, buy ' + brand + ' online Pakistan';

    if (titleCol > 0) masterSheet.getRange(i+1, titleCol).setValue(title);
    if (descCol  > 0) masterSheet.getRange(i+1, descCol).setValue(desc.substring(0,155));
    if (kwCol    > 0) masterSheet.getRange(i+1, kwCol).setValue(kws);

    // Also write to SEO sheet
    seoSheet.appendRow([obj['Product_ID'], brand + ' ' + model, title, desc.substring(0,155), kws, new Date().toISOString()]);
    generated++;
  }

  _log('SEO', 'Generated', generated);
  return generated;
}

// ─────────────────────────────────────────────────────────────────────────
//  BOT SCRIPTS SHEET — Bilingual WhatsApp Templates
// ─────────────────────────────────────────────────────────────────────────

function populateBotScripts() {
  var sheet = _getSheet('Bot_Scripts');
  if (sheet.getLastRow() > 5) return; // Already populated

  var headers = ['Trigger_Keywords', 'Category', 'Language', 'Message_Template', 'Notes'];
  sheet.getRange(1,1,1,headers.length).setValues([headers]);

  var scripts = [
    // Greetings
    ['salam,hello,hi,assalam,welcome', 'greeting', 'Urdu',
     'Salam! Reliance Appliances mein khush amdeed 🏠\n\nAap ki kya madad kar sakta hoon?\n• Product recommendations\n• Aqsaat plans (2–12 mahine)\n• Delivery aur installation\n• Warranty ki maloomat\n\nKoi bhi sawal poochain!', 'Auto-reply on first contact'],

    ['hello,hi,good morning,good evening', 'greeting', 'English',
     'Hello! Welcome to Reliance Appliances 🏠\n\nHow can I help you today?\n• Product recommendations\n• Installment plans (2–12 months)\n• Delivery & installation\n• Warranty information\n\nFeel free to ask anything!', 'English greeting'],

    // Price enquiry
    ['price,rate,kitna,cost,kitni', 'price', 'Urdu',
     'Salam! Hum best prices offer karte hain Karachi mein.\n\n💵 Cash price par extra discount milta hai\n📅 Easy installment plans bhi available hain\n\nKaunsa product chahiye? Brand aur model bata dain — exact price share karta hoon!', 'Price enquiry response'],

    ['price,how much,cost', 'price', 'English',
     'Hi! We offer competitive prices with an additional discount for cash payment.\nInstallment plans available from 2 to 12 months.\n\nWhich product are you looking at? Share the brand and model and I\'ll give you exact pricing!', ''],

    // Delivery
    ['delivery,deliver,kab milega,kab aayega,dispatch', 'delivery', 'Urdu',
     '🚚 Karachi delivery schedule:\n\n• Same-day: Order before 12pm (selected areas)\n• 6–24hrs: DHA, Clifton, Gulshan, North Nazimabad\n• 24–48hrs: All other Karachi areas\n\nDelivery free hai hamari taraf se! Address bata dain.', 'Delivery enquiry'],

    ['delivery,ship,when,how long', 'delivery', 'English',
     '🚚 Karachi delivery:\n\n• Same-day if ordered before noon (select areas)\n• 6–24hrs: DHA, Clifton, Gulshan, North Nazimabad\n• 24–48hrs: All Karachi areas\n\nDelivery is free! Just share your address and we\'ll schedule.', ''],

    // Installments
    ['installment,aqsaat,kist,monthly,qist,iqsaat', 'installment', 'Urdu',
     '📅 Asaan Aqsaat Plans:\n\n✅ 2 mahine\n✅ 3 mahine\n✅ 6 mahine\n✅ 12 mahine\n\nKoi hidden charges nahi. Full warranty har plan pe.\nKaunsa product aur kaunsa plan chahiye? Amount bata dain — breakdown share karta hoon!', 'Installment enquiry'],

    ['installment,monthly,emi,payment plan', 'installment', 'English',
     '📅 Easy Installment Plans:\n\n✅ 2 months\n✅ 3 months\n✅ 6 months\n✅ 12 months\n\nNo hidden charges. Full warranty on all plans.\nWhich product and plan are you interested in? Share the price and I\'ll give you the exact breakdown!', ''],

    // Warranty
    ['warranty,guarantee,waranti,kharab,faulty,problem,issue,repair', 'warranty', 'Urdu',
     '🛡️ Warranty Claim Process:\n\n1. Hamein product details aur purchase date batain\n2. Issue ki photo/video bhejain\n3. Hum manufacturer se contact karte hain\n4. 24 ghante mein technician visit\n\n100% free service. Aapko kuch nahi karna — hum sab handle karte hain!\n\nDetails share karein aur hum fauran kaam shuru karte hain.', 'Warranty claim'],

    ['warranty,repair,broken,not working,fault', 'warranty', 'English',
     '🛡️ Warranty Claim — We handle it all for free:\n\n1. Share purchase date and order number\n2. Send photo/video of the issue\n3. We contact the manufacturer directly\n4. Technician visit within 24 hours\n\nNo hassle for you. Just share the details and we\'ll get it sorted immediately.', ''],

    // Solar
    ['solar,panel,bijli,load shedding,loadshedding,backup,net meter', 'solar', 'Urdu',
     '☀️ Solar Systems — Bijli ki Azaadi!\n\n🏠 3kW: PKR 450,000 (1–3 rooms)\n🏡 5kW: PKR 720,000 (3–5 rooms)\n🏘️ 10kW: PKR 1,350,000 (full house)\n🏢 20kW: PKR 2,500,000 (commercial)\n\nFree site survey available. 50–80% bill reduction guaranteed.\nKitna bada ghar hai? Monthly bill kita aata hai? Exact system recommend karta hoon!', 'Solar enquiry'],

    // AC specific
    ['ac,air condition,haier,gree,daikin,hisense', 'ac', 'Urdu',
     '❄️ AC Range Available:\n\n🌟 Haier DC Inverter — Karachi bestseller\n🌟 Gree Fairy / Pular series\n🌟 Daikin Premium\n🌟 Hisense Inverter\n\nSab models 1 ton, 1.5 ton, 2 ton mein available.\nKitne tone ka chahiye? Cash ya installment? Bata dain!', 'AC enquiry'],

    // Corporate
    ['corporate,office,bulk,company,business,b2b', 'corporate', 'Urdu',
     '🏢 Corporate Solutions:\n\n• Bulk purchase pricing (5+ units)\n• <4hr emergency response SLA\n• Dedicated account manager\n• Monthly invoicing with GST\n• AMC contracts available\n\nHamari corporate team se seedha baat karein: 0335-4266238\nYa requirements share karein — custom quote bhejte hain!', 'Corporate enquiry'],

    // Complaint
    ['complaint,problem,bahut bura,terrible,disappointed,unhappy,cheated', 'complaint', 'Urdu',
     'Salam! Mujhe afsos hua yeh sun kar 😔\n\nAapki baat poori sunna chahta hoon. Kya hua bilkul detail mein batain.\n\nMera wada hai ke hum is masle ko prioritize karenge aur aapko har haal mein satisfy karenge.\n\n*Reliance ka usool: koi customer pareshan nahi jaata.*\n\nAdmin se seedha baat: 0335-4266238', 'Complaint handling'],

    // Unknown/fallback
    ['', 'fallback', 'Urdu',
     'Salam! Samajh nahi aaya bilkul 😊\n\nMujhe bata dain:\n1️⃣ Kaunsa product chahiye?\n2️⃣ Cash ya installment?\n3️⃣ Karachi mein kahan delivery chahiye?\n\nYa seedha call karein: 0370-2578788', 'Fallback when query not understood'],

    ['', 'fallback', 'English',
     'Hi! I didn\'t quite catch that 😊\n\nCould you tell me:\n1️⃣ Which product are you looking for?\n2️⃣ Cash or installment payment?\n3️⃣ Delivery area in Karachi?\n\nOr call us directly: +92 370 2578788', 'English fallback'],
  ];

  scripts.forEach(function(row) { sheet.appendRow(row); });
  _log('BotScripts', 'Populated', scripts.length);
}

// ─────────────────────────────────────────────────────────────────────────
//  SETUP & UTILITIES
// ─────────────────────────────────────────────────────────────────────────

function setupAllSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var SHEET_CONFIGS = {
    'Raw_Import': [
      'Brand','Model','Category','Sub_Category','Min_Price','Notes','Date_Added'
    ],
    'Master_Products': [
      'Product_ID','Brand','Model','Category','Sub_Category','Slug','Description',
      'Specs_JSON','Tags','Colors','Warranty','Min_Price','Retail_Price','Cash_Floor',
      '2M_Advance','2M_Monthly','3M_Advance','3M_Monthly',
      '6M_Advance','6M_Monthly','12M_Advance','12M_Monthly',
      'Stock_Status','Featured','Image_Main','Image_Gallery',
      'SEO_Title','SEO_Description','SEO_Keywords',
      'Import_Date','Last_Enriched','Last_Updated',
    ],
    'Price_Archive': ['Date','Product_ID','Price','Plan','Timestamp'],
    'CRM_Customers': [
      'Customer_ID','Name','Phone','Email','Area','Tier','Points','Total_Spend',
      'Referral_Code','Join_Date','Power_Notes','Appliance_Count','Notes',
    ],
    'Orders': [
      'Order_ID','Date','Customer_Name','Customer_Phone','Area','Address',
      'Product_ID','Product_Name','Qty','Plan','Amount',
      'With_Installation','Installation_Cost','Status','Warranty_Expiry',
      'Notes','Created_At',
    ],
    'FollowUp_Schedule': [
      'FollowUp_ID','Order_ID','Customer_Name','Phone','Product','Type',
      'Due_Date','Status','Message_Urdu','Message_English','Created_At','Notes',
    ],
    'Warranty_Tracker': [
      'Warranty_ID','Order_ID','Customer_Name','Phone','Product_ID','Product_Name',
      'Purchase_Date','Expiry_Date','Warranty_Terms','Status',
      'Claim_Date','Parts_Replaced','Created_At',
    ],
    'Maintenance_Reminders': [
      'Reminder_ID','Order_ID','Customer_Name','Phone','Product',
      'Service_Cycle','Last_Service','Next_Service_Date','Status','Notes',
    ],
    'Power_Solutions': [
      'Customer_ID','Customer_Name','Area','Rooms','Monthly_Bill',
      'AC_Count','Fridge_Count','Other_Load','Recommended_System',
      'Est_Cost','Est_Savings','Notes','Date',
    ],
    'Packages_Offers': [
      'Package_ID','Name','Products','Total_Value','Package_Price','Savings',
      'Valid_Until','Active','Description',
    ],
    'Loyalty_Tiers': [
      'Tier','Min_Spend','Max_Spend','Discount_Pct','Points_Multiplier',
      'Perks','Free_Services',
    ],
    'Referrals': [
      'Referral_ID','Referrer_ID','Referrer_Name','Referee_Phone',
      'Referee_Name','Order_ID','Reward_Amount','Status','Date',
    ],
    'SEO_Content': [
      'Product_ID','Product_Name','SEO_Title','SEO_Description','SEO_Keywords','Generated_At',
    ],
    'Bot_Scripts': [
      'Trigger_Keywords','Category','Language','Message_Template','Notes',
    ],
    'Competitor_Monitor': [
      'Timestamp','Product','Product_ID','Platform','Our_Price','Their_Price',
      'Difference','Status','Field','Source_URL',
    ],
    'Analytics': [
      'Timestamp','Event','Page','Product','Category','Plan','Amount','Session_ID','Source',
    ],
    'Sync_Logs': ['Timestamp','Action','Detail','Count','Status'],
    'Quotes_Log': [
      'Quote_ID','Type','Company','Contact','Phone','Total_PKR','Status','Doc_URL','PDF_URL','Created_At',
    ],
    'Quote_Rates': ['Type','Rate_Key','Value','Unit','Description','Last_Updated'],
    'Quote_Input': [
      'Quote_Type','Client_Name','Company_Name','Phone','Email','Area','Address',
      'Client_Type','System_Size_kW','System_Type','Panel_Brand','Inverter_Brand',
      'Battery_Units','Net_Metering','Include_AMC','Payment_Terms','Monthly_Bill',
      'Valid_Days','Tier','Include_Install','AMC_Tier','Notes',
    ],
    'Quote_Items_Input': ['Preset_Key_or_Description','Qty','Custom_Description','Custom_Unit_Price_PKR'],
    'Form_Corporate': ['Timestamp','Company Name','Contact Person Name','Designation / Role',
      'WhatsApp / Mobile Number','Office Phone','Email Address','Company Sector',
      'Office / Facility Address (Karachi)','Karachi Area / Locality',
      'Number of Air Conditioners Required','AC Tonnage Mix',
      'Number of Refrigerators / Fridges','Number of Washing Machines',
      'Number of Water Dispensers','Number of Televisions (specify sizes)',
      'Other Appliances Required','Additional Services Required',
      'Preferred Payment Terms','Urgency','Approximate Budget (PKR)',
      'Are you an existing Reliance Appliances client?','How did you hear about us?',
      'Specific Requirements or Notes'],
    'Form_Solar': ['Timestamp','Full Name','Company / Organisation Name',
      'WhatsApp / Mobile Number','Email Address','Installation Address','Karachi Area',
      'Property Type','Average Monthly Electricity Bill (PKR)',
      'Typical Daily Load Shedding Duration',
      'Number of Air Conditioners in use','Number of Refrigerators','Other major appliances',
      'Do you currently have a UPS or generator?','Preferred System Type',
      'Preferred System Size','Battery Backup Preference','What matters most to you?',
      'Net Metering (sell excess back to K-Electric)','Payment Preference',
      'When do you want the system installed?','Roof Type',
      'Approximate Available Roof Area (sq ft or sq m)','Roof Orientation',
      'Any shading issues?','Can we arrange a free site visit?','Anything else we should know?'],
    'Form_Service': ['Timestamp','Full Name','WhatsApp Number','Email','Address (Karachi)',
      'Karachi Area','Appliance Brand & Model','Appliance Type','Purchase Date (approximate)',
      'Order / Invoice Number','Type of Request','Describe the Issue','How urgent is this?',
      'Preferred Visit Date','Preferred Time Slot','Have you attached a photo/video?'],
    'Form_Retail': ['Timestamp','Full Name','WhatsApp Number','Email','Karachi Area',
      'Product Categories Needed','Specific Brand & Model (if known)','Budget Range',
      'Payment Preference','Installation Needed?','When do you need delivery?',
      'Any other details or special requirements?','How did you find us?'],
  };

  Object.keys(SHEET_CONFIGS).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      _log('Setup', 'Created sheet', name);
    }
    var headers = SHEET_CONFIGS[name];
    if (sheet.getRange(1,1).getValue() !== headers[0]) {
      sheet.getRange(1,1,1,headers.length).setValues([headers]);
      sheet.getRange(1,1,1,headers.length).setBackground('#0070f3').setFontColor('#ffffff').setFontWeight('bold');
    }
  });

  // Seed loyalty tiers
  _seedLoyaltyTiers();
  populateBotScripts();

  SpreadsheetApp.getUi().alert('✅ Setup complete! All 24 sheets created.\n\nNext steps:\n1. Add products to Raw_Import\n2. Run "Import Raw Data"\n3. Run "Enrich All Products"\n4. Run "Quote Generator → Seed Quote Rates"\n5. Run "Quote Generator → Create All Google Forms"\n6. Deploy as Web App');
}

function _seedLoyaltyTiers() {
  var sheet = _getSheet('Loyalty_Tiers');
  if (sheet.getLastRow() > 1) return;
  var tiers = [
    ['Bronze',   0,       50000,   '1%', '1x',  'Free delivery',                       '0 free services/year'],
    ['Silver',   50000,   150000,  '2%', '1.5x','Free delivery + priority scheduling',  '1 free service/year'],
    ['Gold',     150000,  500000,  '4%', '2x',  'All Silver + exclusive offers',        '2 free services/year'],
    ['Platinum', 500000,  9999999, '6%', '3x',  'All Gold + personal account manager', '4 free services/year + AMC discount'],
  ];
  tiers.forEach(function(t) { sheet.appendRow(t); });
}

function _setupMasterHeaders(sheet) {
  var headers = [
    'Product_ID','Brand','Model','Category','Sub_Category','Slug','Description',
    'Specs_JSON','Tags','Colors','Warranty','Min_Price','Retail_Price','Cash_Floor',
    '2M_Advance','2M_Monthly','3M_Advance','3M_Monthly',
    '6M_Advance','6M_Monthly','12M_Advance','12M_Monthly',
    'Stock_Status','Featured','Image_Main','Image_Gallery',
    'SEO_Title','SEO_Description','SEO_Keywords',
    'Import_Date','Last_Enriched','Last_Updated',
  ];
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
  return headers;
}

function _setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('processFollowUps').timeBased().everyDays(1).atHour(9).create();
  ScriptApp.newTrigger('checkMaintenanceDue').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
  ScriptApp.newTrigger('runCompetitorCheck').timeBased().everyHours(2).create();
  SpreadsheetApp.getUi().alert('✅ Triggers set:\n• Daily 9AM: Follow-ups\n• Weekly Monday 8AM: Maintenance\n• Every 2hrs: Competitor check');
}

// ─── Helpers ───────────────────────────────────────────────────────────

function _getSheet(name) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    _log('Auto-create', name, 'Sheet created on demand');
  }
  return sheet;
}

function _detectCategory(brand, model) {
  var m = (brand + ' ' + model).toLowerCase();
  if (m.includes('hsu') || m.includes(' ac') || m.includes('inverter') || m.includes('split') || m.includes('fairy') || m.includes('pular') || m.includes('awn')) return 'Air Conditioners';
  if (m.includes('chrome') || m.includes('fridge') || m.includes('refrig') || m.includes('9150') || m.includes('9170')) return 'Refrigerators';
  if (m.includes('wash') || m.includes('wm') || m.includes('laundry')) return 'Washing Machines';
  if (m.includes('tv') || m.includes('oled') || m.includes('qled') || m.includes('crystal') || m.includes('uhd') || m.includes('55') || m.includes('65')) return 'Televisions';
  if (m.includes('solar') || m.includes('panel') || m.includes('jinko') || m.includes('canadian') || m.includes('longi') || m.includes('huawei') || m.includes('growatt')) return 'Solar Solutions';
  if (m.includes('dispenser') || m.includes('water')) return 'Water Dispensers';
  if (m.includes('micro') || m.includes('oven') || m.includes('toaster') || m.includes('blender') || m.includes('juicer')) return 'Kitchen Appliances';
  return 'Small Appliances';
}

function _slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function _log(action, detail, count) {
  try {
    var sheet = _getSheet('Sync_Logs');
    sheet.appendRow([new Date().toISOString(), action, String(detail), String(count || ''), 'OK']);
  } catch(e) {}
}

function logCompetitor(data) {
  var sheet = _getSheet('Competitor_Monitor');
  sheet.appendRow([
    new Date().toISOString(),
    data.product || '', data.productId || '', data.platform || '',
    data.ourPrice || 0, data.theirPrice || 0,
    (data.ourPrice||0) - (data.theirPrice||0),
    data.status || '', data.field || '', data.sourceUrl || '',
  ]);
  return { success: true };
}

function _getFallbackProducts() {
  var items = [
    { brand:'Haier', model:'HSU-18HNF DC Inverter', cat:'Air Conditioners', price:148500 },
    { brand:'Dawlance', model:'9150 Chrome Pro',     cat:'Refrigerators',    price:121000 },
    { brand:'Gree', model:'GS-18PITH Fairy',         cat:'Air Conditioners', price:156250 },
    { brand:'Samsung', model:'55" Crystal 4K',       cat:'Televisions',      price:148500 },
    { brand:'Jinko', model:'400W Mono Panel',         cat:'Solar Solutions',  price:36750  },
    { brand:'Hisense', model:'60C Inverter AC',       cat:'Air Conditioners', price:138000 },
  ];

  return items.map(function(p, i) {
    var retail = p.price;
    var plans  = _calcAllPlans(retail);
    return {
      id: 'FALLBACK-' + (i+1),
      brand: p.brand, model: p.model, category: p.cat,
      slug: _slugify(p.brand + '-' + p.model),
      description: p.brand + ' ' + p.model + ' — premium quality with full manufacturer warranty. Available on easy installments in Karachi.',
      specs: {}, tags: p.brand + ',' + p.cat + ',karachi,installment', colors: 'White',
      price: { min: retail, retail: retail, cash_floor: Math.round(retail*0.95) },
      installments: plans,
      warranty: '1 year manufacturer warranty',
      stock_status: 'In Stock', featured: i < 3,
      thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      gallery: [],
      seo: {
        title: p.brand + ' ' + p.model + ' Price Karachi | Reliance Appliances',
        description: 'Buy ' + p.brand + ' ' + p.model + ' in Karachi on easy installments. Best price guaranteed.',
        keywords: p.brand + ' ' + p.model + ' price Karachi, installment appliances Pakistan',
      },
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  MENU — see full onOpen() definition at bottom of file (includes quotes)
// ─────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════
//  QUOTE GENERATION ENGINE  ─  Corporate & Solar
//  All rates pulled from Quote_Rates sheet — edit there, not in code.
//  Generates a formatted Google Doc PDF, logs to Quotes_Log sheet,
//  and returns the public share link.
// ══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────
//  RATE TABLES  (seeded once; thereafter always read from Quote_Rates sheet)
// ─────────────────────────────────────────────────────────────────────────

var DEFAULT_CORPORATE_RATES = {
  // AC rates per unit (PKR) by tonnage — cash price
  'ac_1ton':        115000,
  'ac_1.5ton':      145000,
  'ac_2ton':        185000,
  // Fridge
  'fridge_small':   95000,
  'fridge_large':   135000,
  // Washing Machine
  'wm_topload':     75000,
  'wm_frontload':   110000,
  // Water Dispenser
  'dispenser':      35000,
  // Microwave / kitchen
  'microwave':      22000,
  // TV
  'tv_43':          95000,
  'tv_55':          148500,
  'tv_65':          210000,
  // Installation per unit
  'installation':   2000,
  // AMC per unit per year (basic)
  'amc_basic':      5000,
  'amc_premium':    9000,
  // Bulk discounts (applied on subtotal)
  'bulk_5':         0.05,   // 5% for 5–9 units
  'bulk_10':        0.08,   // 8% for 10–19 units
  'bulk_20':        0.12,   // 12% for 20+ units
  // Corporate loyalty tier discounts
  'tier_silver':    0.02,
  'tier_gold':      0.04,
  'tier_platinum':  0.06,
  // GST rate
  'gst':            0.18,
  // Payment terms surcharge (30-day net)
  'net30_surcharge': 0.03,
};

var DEFAULT_SOLAR_RATES = {
  // Panel cost per watt (PKR) — Tier-1 mono
  'panel_per_watt':     92,
  // Inverter cost (PKR) by system size
  'inverter_3kw':       95000,
  'inverter_5kw':       145000,
  'inverter_10kw':      260000,
  'inverter_20kw':      480000,
  // Battery bank (PKR) — Pylontech 100Ah per unit
  'battery_per_unit':   95000,
  // Mounting structure per kW
  'mounting_per_kw':    12000,
  // Cabling & accessories flat + per kW
  'cabling_flat':       25000,
  'cabling_per_kw':     4500,
  // Civil / rooftop work flat
  'civil_flat':         15000,
  // Net metering application & DISCO approval
  'net_metering_fee':   35000,
  // Installation labour per kW
  'labour_per_kw':      8000,
  // Project management flat fee (commercial only)
  'pm_fee_commercial':  50000,
  // Commissioning & testing
  'commissioning':      18000,
  // Annual maintenance per kW
  'amc_per_kw':         4000,
  // System types add-on cost
  'hybrid_premium':     0.12,  // 12% extra for hybrid over grid-tie
  'offgrid_premium':    0.20,  // 20% extra for off-grid
  // Discounts
  'residential_disc':   0.00,
  'commercial_disc':    0.05,
  // GST on services (labour, installation)
  'gst_services':       0.18,
  // Profit margin already baked in — do not expose to customer
  '_internal_margin':   0.22,
};

// ─────────────────────────────────────────────────────────────────────────
//  LOAD RATES FROM SHEET (falls back to defaults if not seeded yet)
// ─────────────────────────────────────────────────────────────────────────

function _getRates(type) {
  // type: 'corporate' | 'solar'
  try {
    var sheet = _getSheet('Quote_Rates');
    var rows  = sheet.getDataRange().getValues();
    if (rows.length < 2) return type === 'solar' ? DEFAULT_SOLAR_RATES : DEFAULT_CORPORATE_RATES;

    var rates = {};
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === type && rows[i][1]) {
        var key = rows[i][1].toString().trim();
        var val = parseFloat(rows[i][2]) || 0;
        rates[key] = val;
      }
    }
    // Merge with defaults (sheet overrides defaults for keys that exist)
    var defaults = type === 'solar' ? DEFAULT_SOLAR_RATES : DEFAULT_CORPORATE_RATES;
    var merged = {};
    Object.keys(defaults).forEach(function(k) { merged[k] = defaults[k]; });
    Object.keys(rates).forEach(function(k) { merged[k] = rates[k]; });
    return merged;
  } catch(e) {
    return type === 'solar' ? DEFAULT_SOLAR_RATES : DEFAULT_CORPORATE_RATES;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  CORPORATE QUOTE GENERATOR
// ─────────────────────────────────────────────────────────────────────────

/**
 * generateCorporateQuote(data)
 *
 * data = {
 *   companyName, contactName, phone, email, area,
 *   quoteRef,       // optional — auto-generated if blank
 *   paymentTerms,   // 'cash' | 'net30' | 'installment'
 *   tier,           // 'Bronze'|'Silver'|'Gold'|'Platinum'
 *   includeAMC,     // true/false
 *   amcTier,        // 'basic'|'premium'
 *   includeInstall, // true/false
 *   validDays,      // default 15
 *   items: [
 *     { description, category, qty, unitPrice }
 *     // OR use preset keys:
 *     { preset: 'ac_1.5ton', qty: 4 }
 *   ]
 * }
 *
 * Returns: { quoteId, docUrl, pdfUrl, totalAmount }
 */
function generateCorporateQuote(data) {
  var rates    = _getRates('corporate');
  var quoteId  = data.quoteRef || ('CQ-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-5));
  var today    = new Date();
  var validTil = new Date(today);
  validTil.setDate(validTil.getDate() + (parseInt(data.validDays) || 15));

  // ── Resolve line items ──────────────────────────────────────────────
  var lineItems = [];
  (data.items || []).forEach(function(item) {
    if (item.preset) {
      var presetKey = item.preset.toLowerCase();
      var unitPrice = rates[presetKey] || 0;
      if (unitPrice <= 0) return;
      var label = _presetLabel(presetKey);
      lineItems.push({
        description: label,
        qty:         parseInt(item.qty) || 1,
        unitPrice:   unitPrice,
        amount:      unitPrice * (parseInt(item.qty) || 1),
        category:    _presetCategory(presetKey),
      });
    } else {
      var q = parseInt(item.qty) || 1;
      var u = parseFloat(item.unitPrice) || 0;
      lineItems.push({
        description: item.description || '',
        qty:         q,
        unitPrice:   u,
        amount:      u * q,
        category:    item.category || 'General',
      });
    }
  });

  // ── Installation line ───────────────────────────────────────────────
  if (data.includeInstall) {
    var installQty = lineItems.reduce(function(s, i) { return s + i.qty; }, 0);
    lineItems.push({
      description: 'Professional Installation (per unit)',
      qty:         installQty,
      unitPrice:   rates['installation'],
      amount:      rates['installation'] * installQty,
      category:    'Service',
    });
  }

  // ── AMC line ────────────────────────────────────────────────────────
  if (data.includeAMC) {
    var amcRate = data.amcTier === 'premium' ? rates['amc_premium'] : rates['amc_basic'];
    var amcQty  = lineItems.filter(function(i) { return i.category !== 'Service'; })
                           .reduce(function(s, i) { return s + i.qty; }, 0);
    lineItems.push({
      description: (data.amcTier === 'premium' ? 'Premium' : 'Basic') + ' AMC — Annual Maintenance Contract (per unit/year)',
      qty:         amcQty,
      unitPrice:   amcRate,
      amount:      amcRate * amcQty,
      category:    'AMC',
    });
  }

  // ── Pricing calculations ────────────────────────────────────────────
  var subtotal = lineItems.reduce(function(s, i) { return s + i.amount; }, 0);

  // Bulk discount
  var totalUnits = lineItems.filter(function(i) { return i.category !== 'Service' && i.category !== 'AMC'; })
                            .reduce(function(s, i) { return s + i.qty; }, 0);
  var bulkDiscRate = totalUnits >= 20 ? rates['bulk_20'] :
                    totalUnits >= 10 ? rates['bulk_10'] :
                    totalUnits >= 5  ? rates['bulk_5']  : 0;
  var bulkDiscount = Math.round(subtotal * bulkDiscRate);

  // Loyalty tier discount
  var tierKey = 'tier_' + (data.tier || 'bronze').toLowerCase();
  var tierDiscRate = rates[tierKey] || 0;
  var tierDiscount = Math.round((subtotal - bulkDiscount) * tierDiscRate);

  var afterDiscount = subtotal - bulkDiscount - tierDiscount;

  // Payment terms surcharge
  var surcharge = data.paymentTerms === 'net30' ? Math.round(afterDiscount * rates['net30_surcharge']) : 0;

  // GST
  var taxableAmount = afterDiscount + surcharge;
  var gst = Math.round(taxableAmount * rates['gst']);
  var grandTotal = taxableAmount + gst;

  // Installment breakdowns (if applicable)
  var installmentBreakdowns = null;
  if (data.paymentTerms === 'installment') {
    installmentBreakdowns = _calcAllPlans(afterDiscount);
    gst = 0; // GST included in installment totals
    grandTotal = installmentBreakdowns['12m'].total;
  }

  // ── Build Google Doc ────────────────────────────────────────────────
  var docData = {
    type:        'corporate',
    quoteId:     quoteId,
    quoteDate:   _formatDate(today),
    validUntil:  _formatDate(validTil),
    companyName: data.companyName || '',
    contactName: data.contactName || '',
    phone:       data.phone || '',
    email:       data.email || '',
    area:        data.area || 'Karachi',
    lineItems:   lineItems,
    subtotal:    subtotal,
    bulkDiscRate:     bulkDiscRate,
    bulkDiscount:     bulkDiscount,
    tierDiscRate:     tierDiscRate,
    tierDiscount:     tierDiscount,
    afterDiscount:    afterDiscount,
    surcharge:        surcharge,
    paymentTerms:     data.paymentTerms || 'cash',
    gst:              gst,
    grandTotal:       grandTotal,
    installments:     installmentBreakdowns,
    includeAMC:       !!data.includeAMC,
    notes:            data.notes || '',
    tier:             data.tier || 'Bronze',
    totalUnits:       totalUnits,
  };

  var doc    = _buildQuoteDoc(docData);
  var docUrl = doc.getUrl();
  var pdfUrl = _exportPdf(doc.getId(), quoteId);

  // Log to sheet
  _logQuote({
    quoteId:     quoteId,
    type:        'Corporate',
    company:     data.companyName,
    contact:     data.contactName,
    phone:       data.phone,
    total:       grandTotal,
    status:      'Sent',
    docUrl:      docUrl,
    pdfUrl:      pdfUrl,
    createdAt:   today.toISOString(),
  });

  // Auto-schedule follow-up (3 days before expiry)
  _scheduleQuoteFollowUp(quoteId, data, validTil, grandTotal, 'corporate');

  _log('CorporateQuote', quoteId, grandTotal);
  return { quoteId: quoteId, docUrl: docUrl, pdfUrl: pdfUrl, totalAmount: grandTotal };
}

// ─────────────────────────────────────────────────────────────────────────
//  SOLAR QUOTE GENERATOR
// ─────────────────────────────────────────────────────────────────────────

/**
 * generateSolarQuote(data)
 *
 * data = {
 *   clientName, companyName, phone, email, area, address,
 *   quoteRef,
 *   clientType,      // 'residential' | 'commercial'
 *   systemType,      // 'grid-tie' | 'hybrid' | 'off-grid'
 *   systemSizeKw,    // numeric e.g. 10
 *   panelBrand,      // 'Jinko' | 'Canadian Solar' | 'Longi' (default Jinko)
 *   inverterBrand,   // 'Huawei' | 'Growatt' (default Huawei)
 *   batteryUnits,    // 0 for grid-tie; number of Pylontech units for hybrid/off-grid
 *   includeNetMetering, // true/false
 *   includeAMC,      // true/false
 *   paymentTerms,    // 'cash' | 'installment'
 *   monthlyBill,     // customer's current bill — for ROI calc
 *   validDays,       // default 15
 *   notes,
 * }
 */
function generateSolarQuote(data) {
  var rates    = _getRates('solar');
  var quoteId  = data.quoteRef || ('SQ-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-5));
  var today    = new Date();
  var validTil = new Date(today);
  validTil.setDate(validTil.getDate() + (parseInt(data.validDays) || 15));

  var kw           = parseFloat(data.systemSizeKw) || 5;
  var isCommercial = (data.clientType || '').toLowerCase() === 'commercial';
  var systemType   = (data.systemType || 'grid-tie').toLowerCase();
  var panelBrand   = data.panelBrand  || 'Jinko Solar';
  var invBrand     = data.inverterBrand || 'Huawei FusionSolar';

  // ── Panel cost ──────────────────────────────────────────────────────
  var panelWatts   = Math.round(kw * 1000);
  var panelCost    = Math.round(panelWatts * rates['panel_per_watt']);

  // ── Inverter cost ───────────────────────────────────────────────────
  var invKey   = kw <= 3 ? 'inverter_3kw' : kw <= 5 ? 'inverter_5kw' : kw <= 10 ? 'inverter_10kw' : 'inverter_20kw';
  var invCost  = rates[invKey] || 260000;

  // ── Battery bank ────────────────────────────────────────────────────
  var batUnits = parseInt(data.batteryUnits) || 0;
  // For hybrid/off-grid, recommend minimum if user didn't specify
  if (batUnits === 0 && systemType !== 'grid-tie') {
    batUnits = kw <= 3 ? 2 : kw <= 5 ? 4 : kw <= 10 ? 8 : 12;
  }
  var batCost = batUnits * rates['battery_per_unit'];

  // ── BOS (Balance of System) ─────────────────────────────────────────
  var mountCost      = Math.round(kw * rates['mounting_per_kw']);
  var cablingCost    = Math.round(rates['cabling_flat'] + kw * rates['cabling_per_kw']);
  var civilCost      = rates['civil_flat'];
  var labourCost     = Math.round(kw * rates['labour_per_kw']);
  var commCost       = rates['commissioning'];
  var pmCost         = isCommercial ? rates['pm_fee_commercial'] : 0;
  var nmCost         = data.includeNetMetering ? rates['net_metering_fee'] : 0;
  var amcCost        = data.includeAMC ? Math.round(kw * rates['amc_per_kw']) : 0;

  // ── System type premium ─────────────────────────────────────────────
  var hwSubtotal   = panelCost + invCost;
  var typePremium  = systemType === 'hybrid'  ? Math.round(hwSubtotal * rates['hybrid_premium']) :
                     systemType === 'off-grid' ? Math.round(hwSubtotal * rates['offgrid_premium']) : 0;

  // ── Client type discount ────────────────────────────────────────────
  var discRate = isCommercial ? rates['commercial_disc'] : rates['residential_disc'];

  // ── Component line items (for doc) ──────────────────────────────────
  var lineItems = [
    { description: panelBrand + ' ' + kw + 'kW Solar Panels (' + panelWatts + 'W total, Monocrystalline)', qty: 1, unitPrice: panelCost,  amount: panelCost  },
    { description: invBrand + ' ' + kw + 'kW Inverter (' + _systemTypeLabel(systemType) + ')',              qty: 1, unitPrice: invCost,    amount: invCost    },
  ];
  if (batUnits > 0) {
    lineItems.push({ description: 'Pylontech US3000 100Ah Battery Units (' + batUnits + ' units, ' + Math.round(batUnits * 3.2) + 'kWh storage)', qty: batUnits, unitPrice: rates['battery_per_unit'], amount: batCost });
  }
  if (typePremium > 0) {
    lineItems.push({ description: 'System Type Premium — ' + _systemTypeLabel(systemType) + ' configuration', qty: 1, unitPrice: typePremium, amount: typePremium });
  }
  lineItems.push({ description: 'Mounting Structure & Rails (galvanised steel, roof/ground)', qty: 1, unitPrice: mountCost, amount: mountCost });
  lineItems.push({ description: 'DC/AC Cabling, Conduits, DB Box, Isolators, SPD Protection', qty: 1, unitPrice: cablingCost, amount: cablingCost });
  lineItems.push({ description: 'Civil Works — Roof Survey, Cable Trunking, Sealants',         qty: 1, unitPrice: civilCost, amount: civilCost });
  lineItems.push({ description: 'Installation Labour — ' + kw + 'kW System',                  qty: 1, unitPrice: labourCost, amount: labourCost });
  lineItems.push({ description: 'Commissioning, System Testing & Client Handover',             qty: 1, unitPrice: commCost, amount: commCost });
  if (pmCost > 0) lineItems.push({ description: 'Project Management & Coordination (Commercial)',    qty: 1, unitPrice: pmCost, amount: pmCost });
  if (nmCost > 0) lineItems.push({ description: 'NEPRA Net Metering Application & DISCO Approval', qty: 1, unitPrice: nmCost, amount: nmCost });
  if (amcCost > 0) lineItems.push({ description: 'Annual Maintenance Contract (Year 1) — ' + kw + 'kW', qty: 1, unitPrice: amcCost, amount: amcCost });

  // ── Totals ──────────────────────────────────────────────────────────
  var subtotal     = lineItems.reduce(function(s, i) { return s + i.amount; }, 0);
  var discount     = Math.round(subtotal * discRate);
  var afterDisc    = subtotal - discount;

  // GST on services only (panels/batteries are goods; labour/install are services)
  var serviceItems = [labourCost, commCost, pmCost, nmCost, amcCost];
  var serviceTotal = serviceItems.reduce(function(s, v) { return s + v; }, 0);
  var gst          = Math.round(serviceTotal * rates['gst_services']);
  var grandTotal   = afterDisc + gst;

  // Installment breakdowns
  var installmentBreakdowns = null;
  if (data.paymentTerms === 'installment') {
    installmentBreakdowns = _calcAllPlans(afterDisc);
    gst       = 0;
    grandTotal = installmentBreakdowns['12m'].total;
  }

  // ── ROI Analysis ────────────────────────────────────────────────────
  var monthlyBill      = parseFloat(data.monthlyBill) || 0;
  var annualGenKwh     = Math.round(kw * 1300);            // avg Karachi: ~1300kWh/kW/year
  var tariffPerKwh     = 55;                                // avg K-Electric residential PKR/kWh
  var annualSavings    = Math.round(annualGenKwh * tariffPerKwh);
  var paybackYears     = grandTotal > 0 ? (grandTotal / Math.max(annualSavings, 1)).toFixed(1) : '—';
  var billReductionPct = monthlyBill > 0 ? Math.min(95, Math.round((annualSavings / 12) / monthlyBill * 100)) : 65;
  var yr10Savings      = Math.round(annualSavings * 10 - grandTotal);
  var yr25Savings      = Math.round(annualSavings * 25 - grandTotal);

  // ── Build doc ───────────────────────────────────────────────────────
  var docData = {
    type:           'solar',
    quoteId:        quoteId,
    quoteDate:      _formatDate(today),
    validUntil:     _formatDate(validTil),
    clientName:     data.clientName || '',
    companyName:    data.companyName || '',
    phone:          data.phone || '',
    email:          data.email || '',
    area:           data.area || 'Karachi',
    address:        data.address || '',
    clientType:     data.clientType || 'residential',
    systemSizeKw:   kw,
    systemType:     systemType,
    panelBrand:     panelBrand,
    invBrand:       invBrand,
    batteryUnits:   batUnits,
    lineItems:      lineItems,
    subtotal:       subtotal,
    discRate:       discRate,
    discount:       discount,
    afterDisc:      afterDisc,
    gst:            gst,
    grandTotal:     grandTotal,
    installments:   installmentBreakdowns,
    paymentTerms:   data.paymentTerms || 'cash',
    annualGenKwh:   annualGenKwh,
    annualSavings:  annualSavings,
    paybackYears:   paybackYears,
    billReductionPct: billReductionPct,
    yr10Savings:    yr10Savings,
    yr25Savings:    yr25Savings,
    monthlyBill:    monthlyBill,
    includeNetMetering: !!data.includeNetMetering,
    includeAMC:     !!data.includeAMC,
    notes:          data.notes || '',
  };

  var doc    = _buildQuoteDoc(docData);
  var docUrl = doc.getUrl();
  var pdfUrl = _exportPdf(doc.getId(), quoteId);

  _logQuote({
    quoteId:   quoteId,
    type:      'Solar',
    company:   data.companyName || data.clientName,
    contact:   data.clientName,
    phone:     data.phone,
    total:     grandTotal,
    status:    'Sent',
    docUrl:    docUrl,
    pdfUrl:    pdfUrl,
    createdAt: today.toISOString(),
  });

  _scheduleQuoteFollowUp(quoteId, data, validTil, grandTotal, 'solar');

  _log('SolarQuote', quoteId, grandTotal);
  return { quoteId: quoteId, docUrl: docUrl, pdfUrl: pdfUrl, totalAmount: grandTotal, roi: { paybackYears: paybackYears, annualSavings: annualSavings, billReductionPct: billReductionPct } };
}

// ─────────────────────────────────────────────────────────────────────────
//  GOOGLE DOC BUILDER  — one function handles both quote types
// ─────────────────────────────────────────────────────────────────────────

function _buildQuoteDoc(d) {
  var isSolar = d.type === 'solar';
  var folder  = _getOrCreateOutputFolder();
  var docName = (isSolar ? 'Solar Quote — ' : 'Corporate Quote — ') + (d.companyName || d.clientName || d.contactName) + ' — ' + d.quoteId;
  var doc     = DocumentApp.create(docName);
  var body    = doc.getBody();

  // ── Move to output folder ───────────────────────────────────────────
  try {
    var file = DriveApp.getFileById(doc.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  } catch(e) {}

  // ─ Styling helpers ──────────────────────────────────────────────────
  var BRAND_BLUE  = '#0070f3';
  var GOLD        = '#c8960c';
  var DARK        = '#1a1a2e';
  var LIGHT_BG    = '#f4f7fb';

  body.setMarginTop(36).setMarginBottom(36).setMarginLeft(54).setMarginRight(54);

  // ─ HEADER ───────────────────────────────────────────────────────────
  var hdr = body.appendParagraph('RELIANCE APPLIANCES');
  hdr.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  hdr.editAsText().setFontSize(20).setBold(true).setForegroundColor(BRAND_BLUE);

  var sub = body.appendParagraph('Karachi\'s Trusted Home Appliance Partner Since 2015');
  sub.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  sub.editAsText().setFontSize(10).setItalic(true).setForegroundColor('#555555');

  var contact = body.appendParagraph('📞 +92 370 2578788   |   📧 info@relianceappliances.pk   |   🌐 relianceappliances.pk');
  contact.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  contact.editAsText().setFontSize(9).setForegroundColor('#777777');

  body.appendParagraph('').editAsText().setFontSize(4);

  // Divider
  _addDivider(body, BRAND_BLUE);

  // ─ QUOTE TITLE ──────────────────────────────────────────────────────
  var titleText = isSolar ? '☀️  SOLAR SYSTEM QUOTATION' : '🏢  CORPORATE APPLIANCE QUOTATION';
  var title = body.appendParagraph(titleText);
  title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  title.editAsText().setFontSize(15).setBold(true).setForegroundColor(DARK);

  body.appendParagraph('').editAsText().setFontSize(6);

  // ─ META TABLE (Quote ID, Date, Valid Until) ──────────────────────────
  var metaTable = body.appendTable();
  _addTableRow(metaTable, ['Quote Reference', d.quoteId,            'Issue Date',   d.quoteDate], [LIGHT_BG, '', LIGHT_BG, '']);
  _addTableRow(metaTable, ['Valid Until',      d.validUntil,         'Prepared By',  'Reliance Appliances — Sales Team'], [LIGHT_BG, '', LIGHT_BG, '']);
  metaTable.setBorderColor('#dddddd');
  body.appendParagraph('').editAsText().setFontSize(8);

  // ─ CLIENT DETAILS ───────────────────────────────────────────────────
  var clientHead = body.appendParagraph(isSolar ? 'CLIENT DETAILS' : 'COMPANY DETAILS');
  clientHead.editAsText().setFontSize(10).setBold(true).setForegroundColor(BRAND_BLUE)
            .setBackgroundColor(LIGHT_BG);

  var clientTable = body.appendTable();
  if (isSolar) {
    _addTableRow(clientTable, ['Client Name', d.clientName, 'Company', d.companyName || '—'], [LIGHT_BG,'',LIGHT_BG,'']);
    _addTableRow(clientTable, ['Phone',       d.phone,      'Email',   d.email || '—'],        [LIGHT_BG,'',LIGHT_BG,'']);
    _addTableRow(clientTable, ['Area',        d.area,       'Address', d.address || '—'],       [LIGHT_BG,'',LIGHT_BG,'']);
    _addTableRow(clientTable, ['Client Type', _capitalize(d.clientType), 'System Type', _systemTypeLabel(d.systemType)], [LIGHT_BG,'',LIGHT_BG,'']);
  } else {
    _addTableRow(clientTable, ['Company',     d.companyName,    'Contact', d.contactName],  [LIGHT_BG,'',LIGHT_BG,'']);
    _addTableRow(clientTable, ['Phone',       d.phone,          'Email',   d.email || '—'], [LIGHT_BG,'',LIGHT_BG,'']);
    _addTableRow(clientTable, ['Area',        d.area,           'Tier',    d.tier || 'Bronze'], [LIGHT_BG,'',LIGHT_BG,'']);
    _addTableRow(clientTable, ['Payment',     _paymentLabel(d.paymentTerms), 'Total Units', d.totalUnits || '—'], [LIGHT_BG,'',LIGHT_BG,'']);
  }
  clientTable.setBorderColor('#dddddd');
  body.appendParagraph('').editAsText().setFontSize(8);

  // ─ SYSTEM SUMMARY (solar only) ──────────────────────────────────────
  if (isSolar) {
    var sysHead = body.appendParagraph('SYSTEM SPECIFICATION');
    sysHead.editAsText().setFontSize(10).setBold(true).setForegroundColor(BRAND_BLUE)
           .setBackgroundColor(LIGHT_BG);
    var sysTable = body.appendTable();
    _addTableRow(sysTable, ['System Size',    d.systemSizeKw + ' kW',           'Panel Brand',    d.panelBrand],   [LIGHT_BG,'',LIGHT_BG,'']);
    _addTableRow(sysTable, ['Inverter Brand', d.invBrand,                        'Battery Storage', d.batteryUnits > 0 ? (d.batteryUnits + ' units / ' + Math.round(d.batteryUnits*3.2) + ' kWh') : 'Not Included'], [LIGHT_BG,'',LIGHT_BG,'']);
    _addTableRow(sysTable, ['System Type',    _systemTypeLabel(d.systemType),    'Net Metering',   d.includeNetMetering ? 'Included' : 'Not Included'], [LIGHT_BG,'',LIGHT_BG,'']);
    _addTableRow(sysTable, ['Est. Generation', d.annualGenKwh + ' kWh/year',     'Annual Savings', 'PKR ' + _fmt(d.annualSavings)], [LIGHT_BG,'',LIGHT_BG,'']);
    sysTable.setBorderColor('#dddddd');
    body.appendParagraph('').editAsText().setFontSize(8);
  }

  // ─ LINE ITEMS TABLE ──────────────────────────────────────────────────
  var itemsHead = body.appendParagraph(isSolar ? 'SCOPE OF SUPPLY & SERVICES' : 'ITEMS & PRICING');
  itemsHead.editAsText().setFontSize(10).setBold(true).setForegroundColor(BRAND_BLUE)
           .setBackgroundColor(LIGHT_BG);

  var itemsTable = body.appendTable();
  // Header row
  var headerRow = itemsTable.appendTableRow();
  ['#', 'Description', 'Qty', 'Unit Price (PKR)', 'Amount (PKR)'].forEach(function(h) {
    var cell = headerRow.appendTableCell(h);
    cell.editAsText().setBold(true).setForegroundColor('#ffffff').setFontSize(9);
    cell.setBackgroundColor(BRAND_BLUE);
  });

  d.lineItems.forEach(function(item, i) {
    var row   = itemsTable.appendTableRow();
    var bgCol = i % 2 === 0 ? '#ffffff' : LIGHT_BG;
    [(i+1).toString(), item.description, item.qty.toString(),
     _fmt(item.unitPrice), _fmt(item.amount)].forEach(function(val) {
      var cell = row.appendTableCell(val);
      cell.editAsText().setFontSize(9).setForegroundColor('#333333');
      cell.setBackgroundColor(bgCol);
    });
  });
  itemsTable.setBorderColor('#e0e0e0');
  body.appendParagraph('').editAsText().setFontSize(6);

  // ─ PRICING SUMMARY ──────────────────────────────────────────────────
  var priceHead = body.appendParagraph('PRICING SUMMARY');
  priceHead.editAsText().setFontSize(10).setBold(true).setForegroundColor(BRAND_BLUE)
           .setBackgroundColor(LIGHT_BG);

  var priceTable = body.appendTable();
  _addPriceRow(priceTable, 'Subtotal', _fmt(d.subtotal), false);

  if (!isSolar && d.bulkDiscount > 0) {
    _addPriceRow(priceTable, 'Bulk Discount (' + Math.round((d.bulkDiscRate||0)*100) + '% — ' + d.totalUnits + ' units)', '- ' + _fmt(d.bulkDiscount), false);
  }
  if (!isSolar && d.tierDiscount > 0) {
    _addPriceRow(priceTable, d.tier + ' Loyalty Discount (' + Math.round((d.tierDiscRate||0)*100) + '%)', '- ' + _fmt(d.tierDiscount), false);
  }
  if (isSolar && d.discount > 0) {
    _addPriceRow(priceTable, 'Client Discount', '- ' + _fmt(d.discount), false);
  }
  if (d.surcharge > 0) {
    _addPriceRow(priceTable, 'Net 30-Day Terms Surcharge', '+ ' + _fmt(d.surcharge), false);
  }
  if (d.gst > 0) {
    _addPriceRow(priceTable, 'GST (18% on services)', _fmt(d.gst), false);
  }

  // Grand total row — highlighted
  var gtRow = priceTable.appendTableRow();
  var gtLabel = gtRow.appendTableCell('GRAND TOTAL');
  gtLabel.editAsText().setBold(true).setFontSize(11).setForegroundColor('#ffffff');
  gtLabel.setBackgroundColor(BRAND_BLUE);
  var gtVal = gtRow.appendTableCell('PKR ' + _fmt(d.grandTotal));
  gtVal.editAsText().setBold(true).setFontSize(11).setForegroundColor('#ffffff');
  gtVal.setBackgroundColor(BRAND_BLUE);
  priceTable.setBorderColor('#cccccc');
  body.appendParagraph('').editAsText().setFontSize(8);

  // ─ INSTALLMENT OPTIONS ──────────────────────────────────────────────
  if (d.installments) {
    var instHead = body.appendParagraph('INSTALLMENT PAYMENT OPTIONS');
    instHead.editAsText().setFontSize(10).setBold(true).setForegroundColor(BRAND_BLUE)
            .setBackgroundColor(LIGHT_BG);
    var instTable = body.appendTable();
    var instHdrRow = instTable.appendTableRow();
    ['Plan', 'At Delivery (PKR)', 'Monthly Payment (PKR)', 'Total Payable (PKR)'].forEach(function(h) {
      var cell = instHdrRow.appendTableCell(h);
      cell.editAsText().setBold(true).setForegroundColor('#ffffff').setFontSize(9);
      cell.setBackgroundColor(BRAND_BLUE);
    });
    [['2 Month', '2m'],['3 Month','3m'],['6 Month','6m'],['12 Month','12m']].forEach(function(pl) {
      var p   = d.installments[pl[1]];
      var row = instTable.appendTableRow();
      [pl[0], _fmt(p.advance), _fmt(p.monthly) + ' × ' + (p.months-1), _fmt(p.total)].forEach(function(v) {
        row.appendTableCell(v).editAsText().setFontSize(9);
      });
    });
    instTable.setBorderColor('#dddddd');
    body.appendParagraph('').editAsText().setFontSize(8);
  }

  // ─ ROI ANALYSIS (solar only) ─────────────────────────────────────────
  if (isSolar) {
    var roiHead = body.appendParagraph('RETURN ON INVESTMENT ANALYSIS');
    roiHead.editAsText().setFontSize(10).setBold(true).setForegroundColor(BRAND_BLUE)
           .setBackgroundColor(LIGHT_BG);
    var roiTable = body.appendTable();
    _addTableRow(roiTable, ['Estimated Annual Generation', d.annualGenKwh + ' kWh', 'Est. Annual Savings', 'PKR ' + _fmt(d.annualSavings)], [LIGHT_BG,'',LIGHT_BG,'']);
    _addTableRow(roiTable, ['Bill Reduction', d.billReductionPct + '%',              'Simple Payback',       d.paybackYears + ' years'],         [LIGHT_BG,'',LIGHT_BG,'']);
    _addTableRow(roiTable, ['10-Year Net Savings', 'PKR ' + _fmt(Math.max(0,d.yr10Savings)), '25-Year Net Savings', 'PKR ' + _fmt(Math.max(0,d.yr25Savings))], [LIGHT_BG,'',LIGHT_BG,'']);
    roiTable.setBorderColor('#dddddd');

    var roiNote = body.appendParagraph('* ROI estimates based on Karachi avg. irradiation (5.2 peak sun hours/day), K-Electric tariff PKR 55/kWh, and 0.5% annual panel degradation. Actual results may vary.');
    roiNote.editAsText().setFontSize(8).setItalic(true).setForegroundColor('#888888');
    body.appendParagraph('').editAsText().setFontSize(8);
  }

  // ─ WARRANTY & INCLUSIONS ────────────────────────────────────────────
  var wHead = body.appendParagraph(isSolar ? 'WARRANTIES & GUARANTEES' : 'WHAT\'S INCLUDED');
  wHead.editAsText().setFontSize(10).setBold(true).setForegroundColor(BRAND_BLUE)
       .setBackgroundColor(LIGHT_BG);

  var inclusions = isSolar ? [
    '✅  ' + d.panelBrand + ' — 25-year performance warranty (≥80% output), 12-year product warranty',
    '✅  ' + d.invBrand + ' inverter — 10-year manufacturer warranty',
    d.batteryUnits > 0 ? '✅  Pylontech batteries — 10-year warranty' : '',
    '✅  Mounting structure — 10-year structural warranty',
    '✅  2-year workmanship warranty on all installation work',
    '✅  Free on-site support for 12 months post-commissioning',
    data.includeNetMetering ? '✅  Full NEPRA/DISCO net metering application handling' : '',
    data.includeAMC ? '✅  Annual Maintenance Contract — Year 1 included' : '',
    '✅  System monitoring & performance reporting (first 6 months)',
  ] : [
    '✅  Genuine manufacturer-authorised products only',
    '✅  Full manufacturer warranty on all units',
    d.includeAMC ? '✅  Annual Maintenance Contract — included as quoted' : '',
    data.includeInstall ? '✅  Professional certified installation for all units' : '',
    '✅  Free delivery within Karachi',
    '✅  Dedicated corporate account manager',
    '✅  Monthly consolidated invoicing with full GST documentation',
    '✅  Priority <4hr emergency service response',
    '✅  Complimentary post-installation inspection at 30 days',
  ];

  inclusions.filter(Boolean).forEach(function(inc) {
    var p = body.appendParagraph(inc);
    p.editAsText().setFontSize(9).setForegroundColor('#333333');
    p.setSpacingBefore(2).setSpacingAfter(2);
  });
  body.appendParagraph('').editAsText().setFontSize(6);

  // ─ TERMS & CONDITIONS ───────────────────────────────────────────────
  _addDivider(body, '#cccccc');
  var tcHead = body.appendParagraph('TERMS & CONDITIONS');
  tcHead.editAsText().setFontSize(9).setBold(true).setForegroundColor('#555555');

  var terms = [
    '1. This quotation is valid until ' + d.validUntil + '. Prices may vary after this date.',
    '2. ' + (d.paymentTerms === 'net30' ? '70% advance on order confirmation; 30% on delivery. Net 30-day terms available for approved accounts.' : d.paymentTerms === 'installment' ? 'Installment plan as selected above. Advance payment at time of delivery.' : 'Full payment at time of delivery.'),
    '3. Delivery is within Karachi only. Lead time: ' + (isSolar ? '5–14 working days' : '2–5 working days') + ' from order confirmation.',
    isSolar ? '4. Site survey required prior to final order confirmation. Quoted prices assume standard roof/ground mounting. Additional civil work billed separately if required.' : '4. All products are subject to availability at time of order confirmation.',
    '5. Warranty claims are handled directly by Reliance Appliances on behalf of the client — no manufacturer contact required.',
    '6. Prices are inclusive of GST on services as indicated. Product prices exclude provincial taxes where applicable.',
    '7. Reliance Appliances reserves the right to substitute equivalent brands/models in case of stock unavailability, subject to client approval.',
  ];

  terms.forEach(function(t) {
    var p = body.appendParagraph(t);
    p.editAsText().setFontSize(8).setForegroundColor('#666666');
    p.setSpacingBefore(3);
  });

  // Notes
  if (d.notes) {
    body.appendParagraph('').editAsText().setFontSize(6);
    var notesHead = body.appendParagraph('ADDITIONAL NOTES');
    notesHead.editAsText().setFontSize(9).setBold(true).setForegroundColor('#555555');
    var notesP = body.appendParagraph(d.notes);
    notesP.editAsText().setFontSize(9).setItalic(true).setForegroundColor('#555555');
  }

  // ─ SIGNATURE BLOCK ──────────────────────────────────────────────────
  body.appendParagraph('').editAsText().setFontSize(10);
  _addDivider(body, '#cccccc');
  var sigTable = body.appendTable();
  var sigRow   = sigTable.appendTableRow();
  var sig1     = sigRow.appendTableCell('For Client\n\nSignature: ________________________\nName: ________________________\nDate: ________________________');
  sig1.editAsText().setFontSize(9).setForegroundColor('#444444');
  var sig2     = sigRow.appendTableCell('For Reliance Appliances\n\nSignature: ________________________\nName: ________________________\nDate: ________________________');
  sig2.editAsText().setFontSize(9).setForegroundColor('#444444');
  sigTable.setBorderColor('#cccccc');

  // Footer
  body.appendParagraph('').editAsText().setFontSize(6);
  var footer = body.appendParagraph('Reliance Appliances  •  Karachi, Pakistan  •  +92 370 2578788  •  info@relianceappliances.pk  •  relianceappliances.pk');
  footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  footer.editAsText().setFontSize(8).setForegroundColor('#aaaaaa');

  doc.saveAndClose();
  return doc;
}

// ─────────────────────────────────────────────────────────────────────────
//  PDF EXPORT
// ─────────────────────────────────────────────────────────────────────────

function _exportPdf(docId, quoteId) {
  try {
    var exportUrl = 'https://docs.google.com/document/d/' + docId + '/export?format=pdf';
    var token     = ScriptApp.getOAuthToken();
    var response  = UrlFetchApp.fetch(exportUrl, {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true,
    });
    var blob    = response.getBlob().setName(quoteId + '.pdf');
    var folder  = _getOrCreateOutputFolder();
    var pdfFile = folder.createFile(blob);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return pdfFile.getUrl();
  } catch(e) {
    _log('PDFExport', quoteId, 'Error: ' + e.message);
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  QUOTE LOG
// ─────────────────────────────────────────────────────────────────────────

function _logQuote(q) {
  var sheet = _getSheet('Quotes_Log');
  // Ensure headers
  if (sheet.getLastRow() === 0 || sheet.getRange(1,1).getValue() !== 'Quote_ID') {
    sheet.getRange(1,1,1,10).setValues([['Quote_ID','Type','Company','Contact','Phone','Total_PKR','Status','Doc_URL','PDF_URL','Created_At']]);
    sheet.getRange(1,1,1,10).setBackground('#0070f3').setFontColor('#ffffff').setFontWeight('bold');
  }
  sheet.appendRow([q.quoteId, q.type, q.company, q.contact, q.phone, q.total, q.status, q.docUrl, q.pdfUrl, q.createdAt]);
}

function _scheduleQuoteFollowUp(quoteId, data, validTil, total, type) {
  var fupSheet = _getSheet('FollowUp_Schedule');
  var followDate = new Date(validTil);
  followDate.setDate(followDate.getDate() - 3); // 3 days before expiry

  var name  = data.companyName || data.clientName || data.contactName || 'Client';
  var phone = data.phone || '';

  var msg_ur = 'Salam ' + name + '! ' + quoteId + ' — aapka quote ' + _formatDate(validTil) + ' ko expire ho raha hai. Koi sawal? Hum confirm kar sakte hain!';
  var msg_en = 'Hi ' + name + '! Your quote ' + quoteId + ' expires on ' + _formatDate(validTil) + '. Any questions? Ready to confirm? PKR ' + _fmt(total) + ' total.';

  fupSheet.appendRow([
    'FU-' + Date.now().toString().slice(-6) + '-quote',
    quoteId, name, phone, type + ' Quote',
    'quote-followup', _formatDate(followDate),
    'Scheduled', msg_ur, msg_en,
    new Date().toISOString(), '',
  ]);
}

// ─────────────────────────────────────────────────────────────────────────
//  QUOTE RATES SHEET SEEDER
// ─────────────────────────────────────────────────────────────────────────

function seedQuoteRates() {
  var sheet = _getSheet('Quote_Rates');
  if (sheet.getLastRow() > 5) {
    SpreadsheetApp.getUi().alert('Quote_Rates already has data. Clear it first if you want to re-seed defaults.');
    return;
  }

  var headers = ['Type', 'Rate_Key', 'Value', 'Unit', 'Description', 'Last_Updated'];
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
  sheet.getRange(1,1,1,headers.length).setBackground('#0070f3').setFontColor('#ffffff').setFontWeight('bold');

  var rows = [];

  // Corporate rates
  var corpRates = [
    ['corporate','ac_1ton',      115000,'PKR','1-Ton AC unit base price'],
    ['corporate','ac_1.5ton',    145000,'PKR','1.5-Ton AC unit base price'],
    ['corporate','ac_2ton',      185000,'PKR','2-Ton AC unit base price'],
    ['corporate','fridge_small',  95000,'PKR','Small fridge (up to 14 cu ft)'],
    ['corporate','fridge_large', 135000,'PKR','Large fridge (15+ cu ft)'],
    ['corporate','wm_topload',    75000,'PKR','Top-load washing machine'],
    ['corporate','wm_frontload', 110000,'PKR','Front-load washing machine'],
    ['corporate','dispenser',     35000,'PKR','Water dispenser'],
    ['corporate','microwave',     22000,'PKR','Microwave oven'],
    ['corporate','tv_43',         95000,'PKR','43-inch smart TV'],
    ['corporate','tv_55',        148500,'PKR','55-inch 4K smart TV'],
    ['corporate','tv_65',        210000,'PKR','65-inch 4K smart TV'],
    ['corporate','installation',   2000,'PKR/unit','Installation per unit'],
    ['corporate','amc_basic',      5000,'PKR/unit/yr','Basic AMC per unit per year'],
    ['corporate','amc_premium',    9000,'PKR/unit/yr','Premium AMC per unit per year'],
    ['corporate','bulk_5',          0.05,'ratio','Bulk discount: 5-9 units (5%)'],
    ['corporate','bulk_10',         0.08,'ratio','Bulk discount: 10-19 units (8%)'],
    ['corporate','bulk_20',         0.12,'ratio','Bulk discount: 20+ units (12%)'],
    ['corporate','tier_silver',     0.02,'ratio','Silver loyalty discount (2%)'],
    ['corporate','tier_gold',       0.04,'ratio','Gold loyalty discount (4%)'],
    ['corporate','tier_platinum',   0.06,'ratio','Platinum loyalty discount (6%)'],
    ['corporate','gst',             0.18,'ratio','GST rate (18%)'],
    ['corporate','net30_surcharge', 0.03,'ratio','Net 30-day terms surcharge (3%)'],
  ];

  // Solar rates
  var solarRates = [
    ['solar','panel_per_watt',     92,'PKR/W','Cost per watt for Tier-1 mono panels'],
    ['solar','inverter_3kw',    95000,'PKR','3kW inverter cost'],
    ['solar','inverter_5kw',   145000,'PKR','5kW inverter cost'],
    ['solar','inverter_10kw',  260000,'PKR','10kW inverter cost'],
    ['solar','inverter_20kw',  480000,'PKR','20kW inverter cost'],
    ['solar','battery_per_unit',95000,'PKR','Pylontech 100Ah battery per unit'],
    ['solar','mounting_per_kw', 12000,'PKR/kW','Mounting structure per kW'],
    ['solar','cabling_flat',    25000,'PKR','Cabling flat fee'],
    ['solar','cabling_per_kw',   4500,'PKR/kW','Cabling per kW'],
    ['solar','civil_flat',      15000,'PKR','Civil works flat fee'],
    ['solar','net_metering_fee',35000,'PKR','NEPRA/DISCO net metering application'],
    ['solar','labour_per_kw',    8000,'PKR/kW','Installation labour per kW'],
    ['solar','pm_fee_commercial',50000,'PKR','Project management fee (commercial)'],
    ['solar','commissioning',   18000,'PKR','Commissioning & testing'],
    ['solar','amc_per_kw',       4000,'PKR/kW/yr','Annual maintenance per kW'],
    ['solar','hybrid_premium',   0.12,'ratio','Hybrid system type premium (12%)'],
    ['solar','offgrid_premium',  0.20,'ratio','Off-grid system type premium (20%)'],
    ['solar','commercial_disc',  0.05,'ratio','Commercial client discount (5%)'],
    ['solar','residential_disc', 0.00,'ratio','Residential client discount (0%)'],
    ['solar','gst_services',     0.18,'ratio','GST on services (18%)'],
  ];

  var today = new Date().toISOString().split('T')[0];
  corpRates.concat(solarRates).forEach(function(r) {
    sheet.appendRow([r[0], r[1], r[2], r[3], r[4], today]);
  });

  // Auto-format
  sheet.getRange('C2:C100').setNumberFormat('#,##0.00');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 6);

  SpreadsheetApp.getUi().alert('✅ Quote_Rates seeded with ' + (corpRates.length + solarRates.length) + ' rate entries.\n\nEdit any value in column C to update pricing. Changes take effect on the next quote generation.');
}

// ─────────────────────────────────────────────────────────────────────────
//  GOOGLE FORMS CREATOR  — run once; creates all intake forms automatically
// ─────────────────────────────────────────────────────────────────────────

/**
 * Creates 4 Google Forms:
 *  1. Corporate Appliance Enquiry Form
 *  2. Solar System Enquiry Form
 *  3. Customer Service / Warranty Claim Form
 *  4. General Retail Enquiry & Quote Request Form
 *
 * Each form is linked to its own sheet tab via onFormSubmit trigger.
 * On submit, the quote engine fires automatically for corporate + solar.
 */
function createAllGoogleForms() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var folder  = _getOrCreateOutputFolder();
  var results = [];

  results.push(_createCorporateForm(ss, folder));
  results.push(_createSolarForm(ss, folder));
  results.push(_createServiceForm(ss, folder));
  results.push(_createRetailEnquiryForm(ss, folder));

  // Link triggers
  _linkFormTriggers(results);

  var msg = '✅ 4 Google Forms created!\n\n';
  results.forEach(function(r) { msg += '• ' + r.name + '\n  ' + r.url + '\n\n'; });
  msg += 'Share the relevant form link with clients. Responses auto-generate quotes and log to their respective sheets.';
  SpreadsheetApp.getUi().alert(msg);
  return results;
}

// ── Form 1: Corporate Appliance Enquiry ────────────────────────────────

function _createCorporateForm(ss, folder) {
  var form = FormApp.create('Reliance Appliances — Corporate Enquiry Form');
  form.setDescription('Complete this form for a detailed corporate appliance quotation. We respond within 2 business hours.\n\nReliance Appliances | +92 370 2578788 | relianceappliances.pk')
      .setCollectEmail(true)
      .setConfirmationMessage('Thank you! Your corporate enquiry has been received. Our team will send you a detailed quote within 2 business hours.\n\nFor urgent requirements, call +92 335 4266238.')
      .setAllowResponseEdits(false)
      .setLimitOneResponsePerUser(false)
      .setProgressBar(true);

  // Section 1: Company Info
  form.addSectionHeaderItem().setTitle('Company Information').setHelpText('Tell us about your organisation so we can customise your quote.');

  form.addTextItem().setTitle('Company Name').setRequired(true)
      .setHelpText('Full registered company name');
  form.addTextItem().setTitle('Contact Person Name').setRequired(true);
  form.addTextItem().setTitle('Designation / Role').setRequired(false)
      .setHelpText('e.g. Procurement Manager, CEO');
  form.addTextItem().setTitle('WhatsApp / Mobile Number').setRequired(true)
      .setValidation(FormApp.createTextValidation().requireTextMatchesPattern('[0-9+\\-\\s]{10,15}').build());
  form.addTextItem().setTitle('Office Phone').setRequired(false);
  form.addTextItem().setTitle('Email Address').setRequired(false);

  form.addMultipleChoiceItem().setTitle('Company Sector').setRequired(true)
      .setChoiceValues(['FMCG & Retail','Banking & Finance','Healthcare / Hospital','Real Estate / Construction',
                        'Education / School / University','Hospitality / Hotel','Manufacturing / Factory',
                        'Technology / IT','Government / Public Sector','NGO / Non-Profit','Other']);

  form.addTextItem().setTitle('Office / Facility Address (Karachi)').setRequired(true);
  form.addTextItem().setTitle('Karachi Area / Locality').setRequired(true)
      .setHelpText('e.g. DHA, Clifton, PECHS, Korangi Industrial');

  // Section 2: Requirements
  form.addPageBreakItem().setTitle('Appliance Requirements').setHelpText('List what you need. Add quantities for each item below.');

  form.addTextItem().setTitle('Number of Air Conditioners Required').setRequired(false)
      .setHelpText('e.g. 10 units — specify tonnage if known (1 ton / 1.5 ton / 2 ton)');
  form.addTextItem().setTitle('AC Tonnage Mix').setRequired(false)
      .setHelpText('e.g. 4 × 1.5 ton, 6 × 2 ton');
  form.addTextItem().setTitle('Number of Refrigerators / Fridges').setRequired(false);
  form.addTextItem().setTitle('Number of Washing Machines').setRequired(false);
  form.addTextItem().setTitle('Number of Water Dispensers').setRequired(false);
  form.addTextItem().setTitle('Number of Televisions (specify sizes)').setRequired(false)
      .setHelpText('e.g. 4 × 43-inch, 2 × 55-inch');
  form.addTextItem().setTitle('Other Appliances Required').setRequired(false)
      .setHelpText('e.g. microwaves, UPS systems, generators, water heaters');

  form.addCheckboxItem().setTitle('Additional Services Required').setRequired(false)
      .setChoiceValues(['Professional Installation','Annual Maintenance Contract (AMC)','Extended Warranty','Backup Power / UPS Setup','Solar System for Office','Regular Preventive Maintenance','Staff Training on Appliance Use']);

  form.addMultipleChoiceItem().setTitle('Preferred Payment Terms').setRequired(true)
      .setChoiceValues(['Cash / Full Payment on Delivery','Instalment Plan (6–12 months)','30-Day Net (subject to approval)','60-Day Net (subject to approval)','Letter of Credit / Bank Transfer']);

  form.addMultipleChoiceItem().setTitle('Urgency').setRequired(true)
      .setChoiceValues(['Urgent — within 1 week','Standard — 2 to 4 weeks','Planning ahead — more than 1 month']);

  form.addTextItem().setTitle('Approximate Budget (PKR)').setRequired(false)
      .setHelpText('This helps us prioritise the right options for you. Optional.');

  // Section 3: Existing relationship & additional info
  form.addPageBreakItem().setTitle('Additional Information');

  form.addMultipleChoiceItem().setTitle('Are you an existing Reliance Appliances client?').setRequired(true)
      .setChoiceValues(['Yes — existing corporate account','Yes — purchased before (non-corporate)','No — first time']);

  form.addMultipleChoiceItem().setTitle('How did you hear about us?').setRequired(false)
      .setChoiceValues(['WhatsApp / Referral','Google Search','Social Media','Previous Purchase','Word of Mouth','Corporate Directory','Other']);

  form.addParagraphTextItem().setTitle('Specific Requirements or Notes').setRequired(false)
      .setHelpText('Any special requirements, installation constraints, preferred brands, or other information our team should know.');

  form.addCheckboxItem().setTitle('I confirm that:').setRequired(true)
      .setChoiceValues(['I am authorised to request this quotation on behalf of my organisation',
                        'I agree to be contacted by Reliance Appliances regarding this enquiry']);

  // Link to sheet
  var destSheet = ss.getSheetByName('Form_Corporate') || ss.insertSheet('Form_Corporate');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  try {
    var file = DriveApp.getFileById(form.getId());
    folder.addFile(file);
  } catch(e) {}

  return { name: 'Corporate Enquiry Form', url: form.getPublishedUrl(), formId: form.getId(), type: 'corporate' };
}

// ── Form 2: Solar System Enquiry ───────────────────────────────────────

function _createSolarForm(ss, folder) {
  var form = FormApp.create('Reliance Appliances — Solar System Enquiry');
  form.setDescription('Get a detailed solar system quotation with ROI analysis. Free site survey available.\n\nReliance Appliances | +92 370 2578788 | relianceappliances.pk')
      .setCollectEmail(true)
      .setConfirmationMessage('Your solar enquiry has been received! ☀️\n\nWe\'ll review your details and send a full quote with ROI analysis within 24 hours. For a free site survey, call +92 370 2578788.')
      .setProgressBar(true);

  // Section 1: Client Details
  form.addSectionHeaderItem().setTitle('Your Details');

  form.addTextItem().setTitle('Full Name').setRequired(true);
  form.addTextItem().setTitle('Company / Organisation Name').setRequired(false)
      .setHelpText('Leave blank if residential');
  form.addTextItem().setTitle('WhatsApp / Mobile Number').setRequired(true);
  form.addTextItem().setTitle('Email Address').setRequired(false);
  form.addTextItem().setTitle('Installation Address').setRequired(true)
      .setHelpText('Full address including street, block, area — we need this for sun angle and roof assessment');
  form.addTextItem().setTitle('Karachi Area').setRequired(true)
      .setHelpText('e.g. DHA Phase 6, Gulshan Block 7, PECHS');

  form.addMultipleChoiceItem().setTitle('Property Type').setRequired(true)
      .setChoiceValues(['Residential — Apartment','Residential — House (ground floor)','Residential — House (with rooftop access)',
                        'Commercial Office','Retail / Showroom','Warehouse / Factory','School / Educational','Hospital / Clinic','Other']);

  // Section 2: Energy Profile
  form.addPageBreakItem().setTitle('Your Energy Profile').setHelpText('Help us design the right system for your needs.');

  form.addTextItem().setTitle('Average Monthly Electricity Bill (PKR)').setRequired(true)
      .setHelpText('Check your K-Electric bill — this is the most important input for sizing your system');

  form.addMultipleChoiceItem().setTitle('Typical Daily Load Shedding Duration').setRequired(true)
      .setChoiceValues(['0–2 hours','2–6 hours','6–12 hours','12+ hours','Varies heavily']);

  form.addTextItem().setTitle('Number of Air Conditioners in use').setRequired(false)
      .setHelpText('Number and tonnage e.g. 3 × 1.5 ton');
  form.addTextItem().setTitle('Number of Refrigerators').setRequired(false);
  form.addTextItem().setTitle('Other major appliances').setRequired(false)
      .setHelpText('e.g. washing machine, water heater, geysers, motors, UPS');

  form.addMultipleChoiceItem().setTitle('Do you currently have a UPS or generator?').setRequired(true)
      .setChoiceValues(['No','Yes — UPS only','Yes — Generator only','Yes — both UPS and generator']);

  // Section 3: System Preferences
  form.addPageBreakItem().setTitle('System Preferences');

  form.addMultipleChoiceItem().setTitle('Preferred System Type').setRequired(true)
      .setChoiceValues(['Grid-Tie (no battery — maximum export/savings)','Hybrid (battery backup + grid connection — recommended)',
                        'Off-Grid (fully independent from grid)','Not sure — advise me']);

  form.addMultipleChoiceItem().setTitle('Preferred System Size').setRequired(false)
      .setChoiceValues(['3kW','5kW','7kW','10kW','15kW','20kW','Not sure — calculate for me']);

  form.addMultipleChoiceItem().setTitle('Battery Backup Preference').setRequired(false)
      .setChoiceValues(['Not needed (grid-tie)','4–6 hours backup','8–12 hours backup','Full night backup','Maximum possible']);

  form.addCheckboxItem().setTitle('What matters most to you?').setRequired(true)
      .setChoiceValues(['Maximum bill reduction','Long backup hours during load shedding','Fastest payback / ROI',
                        'Highest quality components','Lowest upfront cost','Net metering with K-Electric']);

  form.addMultipleChoiceItem().setTitle('Net Metering (sell excess back to K-Electric)').setRequired(true)
      .setChoiceValues(['Yes — include net metering application','No — not needed','Not sure — explain to me']);

  form.addMultipleChoiceItem().setTitle('Payment Preference').setRequired(true)
      .setChoiceValues(['Full cash payment','6-month instalment plan','12-month instalment plan','Bank financing (we can assist)','Not decided yet']);

  form.addMultipleChoiceItem().setTitle('When do you want the system installed?').setRequired(true)
      .setChoiceValues(['As soon as possible (within 2 weeks)','Within 1 month','Within 3 months','Just exploring options for now']);

  // Section 4: Rooftop Info
  form.addPageBreakItem().setTitle('Rooftop & Site Information').setHelpText('These details help us finalise the design — approximate answers are fine.');

  form.addMultipleChoiceItem().setTitle('Roof Type').setRequired(true)
      .setChoiceValues(['Flat RCC / Concrete','Sloped / Pitched (tiles or sheet)','Metal Sheet Roof','Mixed','Not sure']);

  form.addTextItem().setTitle('Approximate Available Roof Area (sq ft or sq m)').setRequired(false)
      .setHelpText('Rough estimate — our surveyor will confirm. Rule of thumb: 100 sq ft per kW');

  form.addMultipleChoiceItem().setTitle('Roof Orientation').setRequired(false)
      .setChoiceValues(['South-facing (ideal)','East or West facing','North-facing','Mixed / Not sure']);

  form.addMultipleChoiceItem().setTitle('Any shading issues?').setRequired(false)
      .setChoiceValues(['No shading — open sky','Some shading (trees or buildings)','Significant shading','Not sure']);

  form.addMultipleChoiceItem().setTitle('Can we arrange a free site visit?').setRequired(true)
      .setChoiceValues(['Yes — please call me to schedule','Yes — I\'ll come to your office for consultation','Not yet — just send the quote first']);

  form.addParagraphTextItem().setTitle('Anything else we should know?').setRequired(false)
      .setHelpText('Special requirements, previous solar quotes received, budget constraints, etc.');

  var destSheet = ss.getSheetByName('Form_Solar') || ss.insertSheet('Form_Solar');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  try {
    var file = DriveApp.getFileById(form.getId());
    folder.addFile(file);
  } catch(e) {}

  return { name: 'Solar Enquiry Form', url: form.getPublishedUrl(), formId: form.getId(), type: 'solar' };
}

// ── Form 3: Service / Warranty Claim ──────────────────────────────────

function _createServiceForm(ss, folder) {
  var form = FormApp.create('Reliance Appliances — Service & Warranty Request');
  form.setDescription('Log a service request, warranty claim, or maintenance booking. We respond within 2 hours during business hours.\n\nUrgent: +92 370 2578788')
      .setCollectEmail(true)
      .setConfirmationMessage('Your service request has been logged! ✅\n\nOur service team will contact you within 2 hours to confirm the appointment.\n\nFor emergencies, call +92 370 2578788 directly.')
      .setProgressBar(true);

  form.addSectionHeaderItem().setTitle('Your Details');
  form.addTextItem().setTitle('Full Name').setRequired(true);
  form.addTextItem().setTitle('WhatsApp Number').setRequired(true);
  form.addTextItem().setTitle('Email').setRequired(false);
  form.addTextItem().setTitle('Address (Karachi)').setRequired(true);
  form.addTextItem().setTitle('Karachi Area').setRequired(true);

  form.addPageBreakItem().setTitle('Appliance & Issue Details');

  form.addTextItem().setTitle('Appliance Brand & Model').setRequired(true)
      .setHelpText('e.g. Haier HSU-18HNF, Dawlance 9150');
  form.addMultipleChoiceItem().setTitle('Appliance Type').setRequired(true)
      .setChoiceValues(['Air Conditioner','Refrigerator','Washing Machine','Television','Solar System / Inverter','Water Dispenser','Kitchen Appliance','Other']);
  form.addTextItem().setTitle('Purchase Date (approximate)').setRequired(false)
      .setHelpText('e.g. March 2023');
  form.addTextItem().setTitle('Order / Invoice Number').setRequired(false)
      .setHelpText('Found on your receipt or order confirmation WhatsApp message');

  form.addMultipleChoiceItem().setTitle('Type of Request').setRequired(true)
      .setChoiceValues(['Warranty Claim — appliance stopped working','Warranty Claim — appliance not working correctly',
                        'Installation Request — new appliance','Service / Maintenance visit',
                        'AMC Scheduled Visit','General Repair (non-warranty)','Post-installation issue']);

  form.addParagraphTextItem().setTitle('Describe the Issue').setRequired(true)
      .setHelpText('Be as detailed as possible — what happens, when it started, any error codes, sounds, etc.');

  form.addMultipleChoiceItem().setTitle('How urgent is this?').setRequired(true)
      .setChoiceValues(['Emergency — appliance completely non-functional','Urgent — significant inconvenience','Standard — can wait 2-3 days','Routine maintenance — flexible timing']);

  form.addDateItem().setTitle('Preferred Visit Date').setRequired(false);
  form.addMultipleChoiceItem().setTitle('Preferred Time Slot').setRequired(false)
      .setChoiceValues(['Morning (9AM–12PM)','Afternoon (12PM–4PM)','Evening (4PM–8PM)','Any time — call me to confirm']);

  form.addTextItem().setTitle('Have you attached a photo/video?').setRequired(false)
      .setHelpText('WhatsApp photos/video of the issue to +92 370 2578788 helps us diagnose faster');

  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  try { DriveApp.getFileById(form.getId()); folder.addFile(DriveApp.getFileById(form.getId())); } catch(e) {}

  return { name: 'Service & Warranty Form', url: form.getPublishedUrl(), formId: form.getId(), type: 'service' };
}

// ── Form 4: General Retail Enquiry & Quote Request ─────────────────────

function _createRetailEnquiryForm(ss, folder) {
  var form = FormApp.create('Reliance Appliances — Product Enquiry & Quote');
  form.setDescription('Tell us what you\'re looking for and we\'ll send you a personalised quote — usually within 1 hour.\n\nOr WhatsApp us directly: +92 370 2578788')
      .setCollectEmail(true)
      .setConfirmationMessage('Shukriya! ✅ Thank you for your enquiry.\n\nOur team will send you a personalised quote within 1 hour during business hours.\n\nFor faster response, WhatsApp us at +92 370 2578788.')
      .setProgressBar(true);

  form.addSectionHeaderItem().setTitle('Your Details');
  form.addTextItem().setTitle('Full Name').setRequired(true);
  form.addTextItem().setTitle('WhatsApp Number').setRequired(true);
  form.addTextItem().setTitle('Email').setRequired(false);
  form.addTextItem().setTitle('Karachi Area').setRequired(true)
      .setHelpText('For delivery time estimate');

  form.addPageBreakItem().setTitle('What Are You Looking For?');

  form.addCheckboxItem().setTitle('Product Categories Needed').setRequired(true)
      .setChoiceValues(['Air Conditioner','Refrigerator','Washing Machine','Television','Solar Panel / System','Water Dispenser','Kitchen Appliance','Small Appliances','Multiple items — see details below']);

  form.addTextItem().setTitle('Specific Brand & Model (if known)').setRequired(false)
      .setHelpText('e.g. Haier 1.5 ton inverter, Dawlance 14 cu ft, Samsung 55" 4K');

  form.addMultipleChoiceItem().setTitle('Budget Range').setRequired(false)
      .setChoiceValues(['Under PKR 50,000','PKR 50,000 – 100,000','PKR 100,000 – 200,000','PKR 200,000 – 500,000','Above PKR 500,000','Flexible — show me options']);

  form.addMultipleChoiceItem().setTitle('Payment Preference').setRequired(true)
      .setChoiceValues(['Cash (best price)','2-Month Instalment','3-Month Instalment','6-Month Instalment','12-Month Instalment','Not decided yet']);

  form.addMultipleChoiceItem().setTitle('Installation Needed?').setRequired(true)
      .setChoiceValues(['Yes — include professional installation','No — self-install','Not sure yet']);

  form.addMultipleChoiceItem().setTitle('When do you need delivery?').setRequired(true)
      .setChoiceValues(['Today or tomorrow','Within this week','Within 2 weeks','Just exploring prices — not urgent']);

  form.addParagraphTextItem().setTitle('Any other details or special requirements?').setRequired(false)
      .setHelpText('e.g. specific colour, energy rating preference, room size, trade-in of old appliance');

  form.addMultipleChoiceItem().setTitle('How did you find us?').setRequired(false)
      .setChoiceValues(['WhatsApp','Google Search','Facebook / Instagram','Friend / Family Referral','Walked into showroom','Existing customer']);

  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  try { DriveApp.getFileById(form.getId()); folder.addFile(DriveApp.getFileById(form.getId())); } catch(e) {}

  return { name: 'Retail Enquiry Form', url: form.getPublishedUrl(), formId: form.getId(), type: 'retail' };
}

// ─────────────────────────────────────────────────────────────────────────
//  AUTO-TRIGGER ON FORM SUBMIT — fires quote generation automatically
// ─────────────────────────────────────────────────────────────────────────

function _linkFormTriggers(formResults) {
  // Remove any existing formSubmit triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT) {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create a single catch-all onFormSubmit trigger on the spreadsheet
  ScriptApp.newTrigger('onFormSubmitRouter')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();

  _log('Triggers', 'Form submit trigger created', 1);
}

/**
 * Routes form submissions to the appropriate handler.
 * Reads the destination sheet name to identify the form type.
 */
function onFormSubmitRouter(e) {
  try {
    var sheetName = e.range.getSheet().getName();
    var response  = e.namedValues;

    if (sheetName.toLowerCase().includes('corporate')) {
      _handleCorporateFormSubmit(response);
    } else if (sheetName.toLowerCase().includes('solar')) {
      _handleSolarFormSubmit(response);
    } else if (sheetName.toLowerCase().includes('service')) {
      _handleServiceFormSubmit(response);
    } else {
      _handleRetailFormSubmit(response);
    }
  } catch(err) {
    _log('FormSubmit', 'Router error', err.message);
  }
}

function _val(response, key) {
  var v = response[key];
  return v ? (Array.isArray(v) ? v[0] : v).toString().trim() : '';
}

function _handleCorporateFormSubmit(response) {
  // Parse items from form response
  var items = [];
  var acQty       = parseInt(_val(response, 'Number of Air Conditioners Required')) || 0;
  var acMix       = _val(response, 'AC Tonnage Mix');
  var fridgeQty   = parseInt(_val(response, 'Number of Refrigerators / Fridges')) || 0;
  var wmQty       = parseInt(_val(response, 'Number of Washing Machines')) || 0;
  var dispQty     = parseInt(_val(response, 'Number of Water Dispensers')) || 0;
  var tvStr       = _val(response, 'Number of Televisions (specify sizes)');

  // Parse AC mix
  if (acQty > 0) {
    if (acMix.includes('2 ton') || acMix.includes('2ton')) {
      items.push({ preset: 'ac_2ton', qty: acQty });
    } else if (acMix.includes('1 ton') || acMix.includes('1ton')) {
      items.push({ preset: 'ac_1ton', qty: acQty });
    } else {
      items.push({ preset: 'ac_1.5ton', qty: acQty }); // default
    }
  }
  if (fridgeQty > 0) items.push({ preset: 'fridge_large', qty: fridgeQty });
  if (wmQty > 0)     items.push({ preset: 'wm_topload', qty: wmQty });
  if (dispQty > 0)   items.push({ preset: 'dispenser', qty: dispQty });
  if (tvStr)         items.push({ preset: 'tv_55', qty: parseInt(tvStr) || 1 });

  if (items.length === 0) {
    _log('FormSubmit', 'Corporate', 'No items parsed — manual follow-up needed');
    return;
  }

  var services   = _val(response, 'Additional Services Required') || '';
  var payment    = _val(response, 'Preferred Payment Terms') || 'cash';
  var payKey     = payment.toLowerCase().includes('net 30') ? 'net30' :
                   payment.toLowerCase().includes('instal')  ? 'installment' : 'cash';

  generateCorporateQuote({
    companyName:    _val(response, 'Company Name'),
    contactName:    _val(response, 'Contact Person Name'),
    phone:          _val(response, 'WhatsApp / Mobile Number'),
    email:          _val(response, 'Email Address'),
    area:           _val(response, 'Karachi Area / Locality'),
    paymentTerms:   payKey,
    includeInstall: services.toLowerCase().includes('installation'),
    includeAMC:     services.toLowerCase().includes('amc') || services.toLowerCase().includes('maintenance contract'),
    amcTier:        services.toLowerCase().includes('premium') ? 'premium' : 'basic',
    items:          items,
    notes:          _val(response, 'Specific Requirements or Notes'),
  });
}

function _handleSolarFormSubmit(response) {
  var sizeStr   = _val(response, 'Preferred System Size');
  var kw        = sizeStr.match(/\d+/) ? parseInt(sizeStr.match(/\d+/)[0]) : 0;
  var bill      = parseFloat(_val(response, 'Average Monthly Electricity Bill (PKR)').replace(/,/g,'')) || 0;

  // Auto-size from bill if not specified
  if (kw === 0 && bill > 0) {
    kw = bill >= 25000 ? 20 : bill >= 12000 ? 10 : bill >= 6000 ? 5 : 3;
  }
  if (kw === 0) kw = 5; // safe default

  var sysTypeStr = _val(response, 'Preferred System Type').toLowerCase();
  var sysType    = sysTypeStr.includes('off') ? 'off-grid' :
                   sysTypeStr.includes('hybrid') ? 'hybrid' : 'grid-tie';

  var backupStr  = _val(response, 'Battery Backup Preference').toLowerCase();
  var batUnits   = backupStr.includes('not needed') || sysType === 'grid-tie' ? 0 :
                   backupStr.includes('full night') ? Math.ceil(kw * 0.8) :
                   backupStr.includes('8') ? Math.ceil(kw * 0.6) : Math.ceil(kw * 0.4);

  var payment    = _val(response, 'Payment Preference').toLowerCase();
  var payKey     = payment.includes('12') ? 'installment' : payment.includes('6') ? 'installment' : 'cash';

  var nmStr      = _val(response, 'Net Metering (sell excess back to K-Electric)').toLowerCase();
  var inclNM     = !nmStr.includes('not needed');

  generateSolarQuote({
    clientName:         _val(response, 'Full Name'),
    companyName:        _val(response, 'Company / Organisation Name'),
    phone:              _val(response, 'WhatsApp / Mobile Number'),
    email:              _val(response, 'Email Address'),
    area:               _val(response, 'Karachi Area'),
    address:            _val(response, 'Installation Address'),
    clientType:         _val(response, 'Property Type').toLowerCase().includes('commercial') ? 'commercial' : 'residential',
    systemSizeKw:       kw,
    systemType:         sysType,
    batteryUnits:       batUnits,
    includeNetMetering: inclNM,
    includeAMC:         false,
    paymentTerms:       payKey,
    monthlyBill:        bill,
    notes:              _val(response, 'Anything else we should know?'),
  });
}

function _handleServiceFormSubmit(response) {
  // Log to CRM and schedule a technician follow-up
  addCrmContact({
    name:  _val(response, 'Full Name'),
    phone: _val(response, 'WhatsApp Number'),
    email: _val(response, 'Email'),
    area:  _val(response, 'Karachi Area'),
    notes: 'Service request: ' + _val(response, 'Describe the Issue'),
  });
  _log('ServiceForm', _val(response, 'Full Name'), _val(response, 'Type of Request'));
}

function _handleRetailFormSubmit(response) {
  // Log enquiry, add as CRM contact
  addCrmContact({
    name:  _val(response, 'Full Name'),
    phone: _val(response, 'WhatsApp Number'),
    area:  _val(response, 'Karachi Area'),
    notes: 'Retail enquiry: ' + _val(response, 'Product Categories Needed'),
  });
  _log('RetailForm', _val(response, 'Full Name'), _val(response, 'Product Categories Needed'));
}

// ─────────────────────────────────────────────────────────────────────────
//  MANUAL QUOTE GENERATOR (from sheet — no form needed)
//  Fill Quote_Input sheet, run generateQuoteFromInput()
// ─────────────────────────────────────────────────────────────────────────

function generateQuoteFromInput() {
  var sheet = _getSheet('Quote_Input');
  if (sheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('❌ Quote_Input sheet is empty.\n\nFill in the required fields first.\nRun "Setup Quote Input Sheet" to see the template.');
    return;
  }

  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var obj = {};
  headers.forEach(function(h, i) { obj[h] = rows[1][i]; });

  var type = (obj['Quote_Type'] || '').toLowerCase();
  var result;

  if (type === 'solar') {
    result = generateSolarQuote({
      clientName:         obj['Client_Name']      || '',
      companyName:        obj['Company_Name']      || '',
      phone:              obj['Phone']             || '',
      email:              obj['Email']             || '',
      area:               obj['Area']              || '',
      address:            obj['Address']           || '',
      clientType:         obj['Client_Type']       || 'residential',
      systemSizeKw:       parseFloat(obj['System_Size_kW']) || 5,
      systemType:         obj['System_Type']       || 'hybrid',
      panelBrand:         obj['Panel_Brand']       || 'Jinko Solar',
      inverterBrand:      obj['Inverter_Brand']    || 'Huawei FusionSolar',
      batteryUnits:       parseInt(obj['Battery_Units']) || 0,
      includeNetMetering: obj['Net_Metering'] === 'Yes',
      includeAMC:         obj['Include_AMC'] === 'Yes',
      paymentTerms:       obj['Payment_Terms']     || 'cash',
      monthlyBill:        parseFloat(obj['Monthly_Bill']) || 0,
      validDays:          parseInt(obj['Valid_Days']) || 15,
      notes:              obj['Notes']             || '',
    });
  } else {
    // Corporate — parse items from Input_Items sheet
    var itemSheet = _getSheet('Quote_Items_Input');
    var itemRows  = itemSheet.getDataRange().getValues();
    var items     = [];
    for (var i = 1; i < itemRows.length; i++) {
      if (!itemRows[i][0]) continue;
      var preset = itemRows[i][0].toString().toLowerCase().replace(/\s+/g, '_');
      items.push({
        preset:      preset,
        qty:         parseInt(itemRows[i][1]) || 1,
        description: itemRows[i][2] || '',
        unitPrice:   parseFloat(itemRows[i][3]) || 0,
      });
    }

    result = generateCorporateQuote({
      companyName:    obj['Company_Name']      || '',
      contactName:    obj['Client_Name']       || '',
      phone:          obj['Phone']             || '',
      email:          obj['Email']             || '',
      area:           obj['Area']              || '',
      tier:           obj['Tier']              || 'Bronze',
      paymentTerms:   obj['Payment_Terms']     || 'cash',
      includeInstall: obj['Include_Install']   === 'Yes',
      includeAMC:     obj['Include_AMC']       === 'Yes',
      amcTier:        obj['AMC_Tier']          || 'basic',
      validDays:      parseInt(obj['Valid_Days']) || 15,
      notes:          obj['Notes']             || '',
      items:          items,
    });
  }

  SpreadsheetApp.getUi().alert('✅ Quote generated!\n\nQuote ID: ' + result.quoteId +
    '\nTotal: PKR ' + _fmt(result.totalAmount) +
    '\n\nDoc: ' + result.docUrl +
    (result.pdfUrl ? '\nPDF: ' + result.pdfUrl : ''));
}

function setupQuoteInputSheets() {
  // Quote_Input
  var qi = _getSheet('Quote_Input');
  qi.clearContents();
  var qiHeaders = ['Quote_Type','Client_Name','Company_Name','Phone','Email','Area','Address',
                   'Client_Type','System_Size_kW','System_Type','Panel_Brand','Inverter_Brand',
                   'Battery_Units','Net_Metering','Include_AMC','Payment_Terms','Monthly_Bill',
                   'Valid_Days','Tier','Include_Install','AMC_Tier','Notes'];
  qi.getRange(1,1,1,qiHeaders.length).setValues([qiHeaders]);
  qi.getRange(1,1,1,qiHeaders.length).setBackground('#0070f3').setFontColor('#fff').setFontWeight('bold');
  // Sample solar row
  qi.appendRow(['solar','Ahmed Khan','','0300-1234567','','DHA','Plot 12, Street 4, Phase 6',
                'residential',10,'hybrid','Jinko Solar','Huawei FusionSolar',4,'Yes','Yes','installment',15000,15,'','','','Existing customer — upgrade from 5kW']);
  qi.autoResizeColumns(1, qiHeaders.length);

  // Quote_Items_Input
  var qit = _getSheet('Quote_Items_Input');
  qit.clearContents();
  qit.getRange(1,1,1,4).setValues([['Preset_Key_or_Description','Qty','Custom_Description','Custom_Unit_Price_PKR']]);
  qit.getRange(1,1,1,4).setBackground('#0070f3').setFontColor('#fff').setFontWeight('bold');
  qit.appendRow(['ac_1.5ton', 8, '', '']);
  qit.appendRow(['fridge_large', 4, '', '']);
  qit.appendRow(['dispenser', 6, '', '']);
  qit.appendRow(['', 1, 'Custom UPS 5kVA with 4 batteries', 185000]);
  qit.autoResizeColumns(1, 4);

  SpreadsheetApp.getUi().alert('✅ Quote_Input and Quote_Items_Input sheets are ready.\n\nFill in your data and run "Generate Quote from Input Sheet".\n\nValid Preset Keys:\nCorporate: ac_1ton, ac_1.5ton, ac_2ton, fridge_small, fridge_large, wm_topload, wm_frontload, dispenser, microwave, tv_43, tv_55, tv_65\n\nSolar: Fill Quote_Input only — items auto-calculated.');
}

// ─────────────────────────────────────────────────────────────────────────
//  UTILITIES FOR QUOTE ENGINE
// ─────────────────────────────────────────────────────────────────────────

function _getOrCreateOutputFolder() {
  var folderName = 'Reliance Appliances — Quotes';
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function _addDivider(body, color) {
  var p = body.appendParagraph('');
  p.editAsText().setFontSize(2);
  body.appendHorizontalRule();
}

function _addTableRow(table, cells, bgColors) {
  var row = table.appendTableRow();
  cells.forEach(function(val, i) {
    var cell = row.appendTableCell(val || '');
    cell.editAsText().setFontSize(9);
    if (bgColors && bgColors[i]) cell.setBackgroundColor(bgColors[i]);
  });
  return row;
}

function _addPriceRow(table, label, value, isBold) {
  var row   = table.appendTableRow();
  var lCell = row.appendTableCell(label);
  lCell.editAsText().setFontSize(9).setBold(!!isBold);
  var vCell = row.appendTableCell(value);
  vCell.editAsText().setFontSize(9).setBold(!!isBold).setForegroundColor('#0070f3');
  vCell.setBackgroundColor('#f4f7fb');
  return row;
}

function _fmt(n) {
  return Math.round(n || 0).toLocaleString('en-PK');
}

function _formatDate(d) {
  var date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-PK', { year:'numeric', month:'long', day:'numeric' });
}

function _capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function _systemTypeLabel(t) {
  return t === 'off-grid' ? 'Off-Grid (Stand-Alone)' :
         t === 'hybrid'   ? 'Hybrid (Battery + Grid)' : 'Grid-Tie (Net Metering)';
}

function _paymentLabel(t) {
  return t === 'net30' ? 'Net 30-Day Credit Terms' :
         t === 'installment' ? 'Instalment Plan' : 'Cash on Delivery';
}

function _presetLabel(key) {
  var labels = {
    'ac_1ton':'1-Ton Split AC (Inverter)', 'ac_1.5ton':'1.5-Ton Split AC (Inverter)', 'ac_2ton':'2-Ton Split AC (Inverter)',
    'fridge_small':'Refrigerator (up to 14 cu ft)', 'fridge_large':'Refrigerator (15+ cu ft)',
    'wm_topload':'Washing Machine — Top Load', 'wm_frontload':'Washing Machine — Front Load',
    'dispenser':'Water Dispenser (Hot & Cold)', 'microwave':'Microwave Oven',
    'tv_43':'43-inch Smart TV (Full HD)', 'tv_55':'55-inch Smart TV (4K UHD)', 'tv_65':'65-inch Smart TV (4K UHD)',
  };
  return labels[key] || key;
}

function _presetCategory(key) {
  return key.startsWith('ac') ? 'AC' : key.startsWith('fridge') ? 'Fridge' :
         key.startsWith('wm') ? 'WM'  : key.startsWith('tv')    ? 'TV' : 'General';
}

// ─────────────────────────────────────────────────────────────────────────
//  UPDATED onOpen MENU — includes Quote Generator section
// ─────────────────────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🏠 Reliance')
    .addItem('1. First-Time Setup',              'setupAllSheets')
    .addSeparator()
    .addItem('2. Import Raw Data → Master',      '_importRawProducts')
    .addItem('3. Enrich All Products',           'enrichAllProducts')
    .addItem('4. Recalculate All Prices',        'recalculatePrices')
    .addItem('5. Generate SEO Content',          'generateSEOContent')
    .addItem('6. Full Sync (All of Above)',       'fullSync')
    .addSeparator()
    .addItem('7. Run Competitor Check',          'runCompetitorCheck')
    .addItem('8. Process Today\'s Follow-Ups',   'processFollowUps')
    .addItem('9. Check Maintenance Due',         'checkMaintenanceDue')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('📄 Quote Generator')
      .addItem('Seed Quote Rates (run once)',     'seedQuoteRates')
      .addItem('Setup Manual Input Sheets',       'setupQuoteInputSheets')
      .addItem('Generate Quote from Input Sheet', 'generateQuoteFromInput')
      .addSeparator()
      .addItem('Create All Google Forms (run once)', 'createAllGoogleForms'))
    .addSeparator()
    .addItem('⚙️  Setup Auto Triggers',          '_setupTriggers')
    .addToUi();
}

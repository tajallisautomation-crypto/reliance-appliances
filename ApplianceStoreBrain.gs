// ============================================================
//  RELIANCE APPLIANCES — ApplianceStoreBrain.gs  v3.0
//  Google Apps Script — Full ERP Backend
//  Fixes: image URLs (thumbnail API), 3-month installment (45%),
//         simplified names, crash protection, new tabs integrated
// ============================================================

const CACHE_TTL      = 300;   // 5 minutes cache
const SCRIPT_LOCK_MS = 30000; // 30 second lock timeout

function _roundTo100(n) {
  return Math.round(n / 100) * 100;
}

function _calcPlan(basePrice, planKey) {
  const plans = {
    '2month':  { markup: 0.10, advancePct: 0.50, totalPayments: 2 },
    '3month':  { markup: 0.15, advancePct: 0.45, totalPayments: 3 },
    '6month':  { markup: 0.25, advancePct: 0.40, totalPayments: 6 },
    '12month': { markup: 0.40, advancePct: 0.30, totalPayments: 12 },
  };
  const p = plans[planKey];
  if (!p) return null;
  const total = _roundTo100(basePrice * (1 + p.markup));
  const advance = _roundTo100(total * p.advancePct);
  const remaining = total - advance;
  const monthlyPayments = p.totalPayments - 1;
  const monthly = _roundTo100(remaining / monthlyPayments);
  return { total, advance, monthly, monthlyPayments, advancePct: p.advancePct };
}

function _calcAllPlans(basePrice) {
  if (!basePrice) return {};
  return {
    '2month':  _calcPlan(basePrice, '2month'),
    '3month':  _calcPlan(basePrice, '3month'),
    '6month':  _calcPlan(basePrice, '6month'),
    '12month': _calcPlan(basePrice, '12month'),
  };
}

function _driveImageUrl(fileId, size) {
  if (!fileId) return '';
  return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w' + (size || 400);
}

function _extractDriveId(url) {
  if (!url) return '';
  url = String(url);
  let m;
  m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);  if (m) return m[1];
  m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);       if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim()))    return url.trim();
  return '';
}

function _fixImageUrl(url) {
  if (!url) return '';
  url = String(url).trim();
  if (url.includes('drive.google.com/thumbnail')) return url;
  if (url.includes('lh3.googleusercontent.com'))  return url;
  if (url.startsWith('http') && !url.includes('drive.google.com')) return url;
  const id = _extractDriveId(url);
  return id ? _driveImageUrl(id) : url;
}

function _buildSimplifiedName(brand, model, category, specs) {
  brand    = String(brand    || '').trim();
  model    = String(model    || '').trim();
  category = String(category || '').toLowerCase();
  specs    = specs || {};
  if (category.includes('air') || category.includes('conditioner') || model.toUpperCase().startsWith('HSU') || model.toUpperCase().startsWith('HPU')) {
    return _buildACName(brand, model, specs);
  }
  if (category.includes('ref') || category.includes('fridge') || model.toUpperCase().match(/^H[RD]F|^9[0-9]{3}/)) {
    return _buildFridgeName(brand, model, specs);
  }
  if (category.includes('wash') || model.toUpperCase().startsWith('HWM') || model.toUpperCase().startsWith('DW')) {
    return _buildWashName(brand, model, specs);
  }
  if (category.includes('tv') || category.includes('television')) {
    return _buildTVName(brand, model, specs);
  }
  if (category.includes('solar')) {
    return _buildSolarName(brand, model, specs);
  }
  return brand + ' ' + model;
}

function _buildACName(brand, model, specs) {
  const m    = model.toUpperCase();
  const ton  = specs.tonnage || _tonFromACModel(m);
  const heat = _isHeatCoolAC(m);
  const inv  = _isInverterAC(m);
  return [brand, ton ? ton+' Ton':'', heat?'Heat & Cool':'Cool Only', inv?'Inverter':'', 'Split AC'].filter(Boolean).join(' ');
}

function _tonFromACModel(m) {
  const hm = m.match(/HSU-(\d+)/);
  if (hm) {
    const n = parseInt(hm[1]);
    if (n<=9) return '0.75'; if (n===10) return '0.9'; if (n<=12) return '1.0';
    if (n===13) return '1.1'; if (n===14) return '1.2'; if (n<=18) return '1.5';
    if (n===19) return '1.6'; if (n<=24) return '2.0'; if (n<=30) return '2.5';
  }
  if (m.match(/\s15$/)|| m.includes(' 15 ')) return '1.0';
  if (m.match(/\s20$/)|| m.includes(' 20 ')) return '1.5';
  if (m.match(/\s30$/)|| m.includes(' 30 ')) return '2.5';
  if (m.match(/\s45$/)|| m.includes(' 45 ')) return '3.5';
  return '';
}

function _isHeatCoolAC(m) { return !!(m.match(/HFC|HFAB|HFTEX|HFTC|HFS\s|HFP|HYPER|MAGNA|PRIMA|ELEGANCE|MEGA\s|SPRINTER|GALLANT|GLAMOUR|HPU/)); }
function _isInverterAC(m)  { return !!(m.match(/INV|LF|HFC|HFS|HFAB|HFTEX|HFTC|HFP|INVERTER/)); }

function _buildFridgeName(brand, model, specs) {
  const m = model.toUpperCase();
  const cf = specs.cubicFeet || _cfFromFridgeModel(m);
  const type = specs.fridgeType || _fridgeTypeFromModel(m);
  const inv = _isInverterFridge(m);
  return [brand, cf?cf+' Cu.Ft':'', type, inv?'Inverter':'', m.includes('HDF')?'Deep Freezer':'Refrigerator'].filter(Boolean).join(' ');
}

function _cfFromFridgeModel(m) {
  const map = {'216':6,'246':8,'276':9,'316':11,'346':12,'368':13,'398':14,'418':14,'438':15,'458':16,'488':17,'518':18,'538':19,'578':20,'622':22,'678':24,'175':6,'230':8,'245':8,'285':10,'320':11,'345':12,'385':13,'405':14,'465':16,'535':18,'545':19,'9140':10,'9149':12,'9160':14,'9169':16,'9173':18,'9178':20,'9191':22,'9193':24,'91999':26,'9055':26,'9060':28,'7650':22,'7950':24,'8365':28};
  for (const [num,cf] of Object.entries(map)) { if (m.includes(num)) return cf; }
  return '';
}

function _fridgeTypeFromModel(m) {
  if (m.match(/IFF|SBS|DSS-|DMD-|DTM-/)) return 'Side-by-Side';
  if (m.match(/IFGA|IFRA|IFPA/)) return 'Glass Door';
  if (m.match(/GRAZE|CHROME|INV|INVERTER|IPRA|IPGA/)) return 'Frost-Free';
  if (m.match(/AVANTE\+|WB.*INV/)) return 'Frost-Free';
  if (m.match(/AVANTE|WB/)) return 'Defrost';
  if (m.match(/HDF/)) return 'Chest';
  return '';
}

function _isInverterFridge(m) { return !!(m.match(/INV|INVERTER|IPRA|IPGA|IFRA|IFGA|GRAZE|CHROME/)); }

function _buildWashName(brand, model, specs) {
  const m = model.toUpperCase();
  const kg = specs.capacity ? specs.capacity+'kg ' : '';
  const type = m.match(/DWF|FL/) ? 'Front Load' : m.match(/DWT|TL/) ? 'Top Load Automatic' : m.match(/TWIN|DS /) ? 'Twin Tub' : m.match(/DW\s|DS-/) ? 'Semi-Automatic' : 'Automatic';
  return brand+' '+kg+type+(m.includes('INV')?' Inverter':'')+' Washing Machine';
}

function _buildTVName(brand, model, specs) {
  const m = model.toUpperCase();
  const res = m.match(/4K|UHD/) ? '4K UHD' : m.match(/QLED/) ? 'QLED' : m.match(/FHD/) ? 'Full HD' : 'HD';
  return brand+(specs.screenSize?' '+specs.screenSize+'"':'')+' '+res+(m.match(/SMART|GOOGLE/)?' Smart':'')+' TV';
}

function _buildSolarName(brand, model, specs) {
  const kw = specs.capacityKW || (model.match(/(\d+\.?\d*)\s*KW/i)||[])[1] || '';
  return brand+(kw?' '+kw+'kW':'')+' Solar '+(model.match(/PANEL/i)?'Panel':model.match(/BATTERY|BOOST/i)?'Battery':'Inverter');
}

function _extractColor(model, name) {
  const t = (String(model||'')+' '+String(name||'')).toUpperCase();
  if (t.match(/STAINLESS|INOX/)) return 'Stainless Steel';
  if (t.match(/GOLD(?:EN)?\b|GD\b/)) return 'Golden';
  if (t.match(/SILVER|CHROME|METALLIC SILVER/)) return 'Silver/Chrome';
  if (t.match(/GEM\s+BLACK|NOIR|\bBLACK\b|\sBX\b/)) return 'Black';
  if (t.match(/CORAL\s+RED|\bRED\b/)) return 'Coral Red';
  if (t.match(/METALLIC\s+GREY|MANHATTAN\s+GREY|\bGREY\b|\bGRAY\b/)) return 'Metallic Grey';
  if (t.match(/CLOUD\s+WHITE|\bWHITE\b|\sWB\b|\sCW\b/)) return 'White';
  if (t.match(/CRYSTAL|GLASS\s+DOOR/)) return 'Glass/Crystal';
  if (t.match(/\bPURPLE\b/)) return 'Purple';
  if (t.match(/CHAMPAGNE|BROWN/)) return 'Champagne';
  if (t.match(/SAPPHIRE/)) return 'Sapphire Blue';
  return 'White';
}

function _rowToProduct(row, headers) {
  const obj = {};
  headers.forEach(function(h,i){ obj[h] = row[i]!==undefined?row[i]:''; });
  const brand=String(obj['Brand']||'').trim(), model=String(obj['Model']||'').trim(), category=String(obj['Category']||'').trim();
  const fixedImg = _fixImageUrl(String(obj['Image_URL']||obj['image']||'').trim());
  const simpleName = String(obj['Simplified_Name']||'').trim() || _buildSimplifiedName(brand,model,category,{tonnage:obj['Tonnage']||'',cubicFeet:obj['Cubic_Feet']||''});
  const color = String(obj['Color']||'').trim() || _extractColor(model, obj['Product_Name']||simpleName);
  const basePrice = parseFloat(obj['Cash_Price']||obj['Price']||0)||0;
  const mrp = parseFloat(obj['MRP']||0)||_roundTo100(basePrice*1.052);
  const gallery = String(obj['Images']||obj['Gallery']||'').split(',').map(u=>_fixImageUrl(u.trim())).filter(Boolean);
  return {
    id:String(obj['Product_ID']||obj['id']||''), brand, model, name:simpleName, category,
    subCategory:String(obj['Sub_Category']||'').trim(), cashPrice:basePrice, mrp,
    image:fixedImg, images:gallery, color, warranty:String(obj['Warranty']||'').trim(),
    description:String(obj['Description']||'').trim(), specs:String(obj['Specs']||'').trim(),
    tonnage:String(obj['Tonnage']||'').trim(), cubicFeet:String(obj['Cubic_Feet']||'').trim(),
    inverter:obj['Is_Inverter']==='TRUE'||obj['Is_Inverter']===true,
    inStock:obj['In_Stock']!=='FALSE'&&obj['In_Stock']!==false,
    featured:obj['Featured']==='TRUE'||obj['Featured']===true,
    plans:_calcAllPlans(basePrice),
    seoTitle:String(obj['SEO_Title']||simpleName).trim(),
    seoDesc:String(obj['SEO_Description']||'').trim(),
    updatedAt:String(obj['Updated_At']||new Date().toISOString()),
  };
}

function doGet(e) {
  var params=e.parameter||{}, action=params.action||'getProducts', callback=params.callback, result;
  try {
    switch(action) {
      case 'getProducts':result=getProducts(params);break;
      case 'getProduct':result=getProduct(params);break;
      case 'getCategories':result=getCategories();break;
      case 'getSolarProducts':result=getSolarProducts();break;
      case 'getSolarQuote':result=getSolarQuote(params);break;
      case 'getInstallmentPlans':result=getInstallmentPlans(params);break;
      case 'getPackages':result=getPackages();break;
      case 'getLoyaltyTiers':result=getLoyaltyTiers();break;
      case 'getCompetitorData':result=getCompetitorData(params);break;
      case 'healthCheck':result={ok:true,ts:new Date().toISOString()};break;
      default:result={error:'Unknown action: '+action};
    }
  } catch(err) { result={error:err.toString(),action}; _log('ERROR',action,err.toString()); }
  var json=JSON.stringify(result);
  var output=callback?ContentService.createTextOutput(callback+'('+json+')').setMimeType(ContentService.MimeType.JAVASCRIPT):ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  return output;
}

function doPost(e) {
  var body={};
  try{body=JSON.parse(e.postData.contents);}catch(err){}
  var action=body.action||'', result;
  try {
    switch(action) {
      case 'addOrder':result=addOrder(body);break;
      case 'addCrmContact':result=addCrmContact(body);break;
      case 'addFollowUp':result=addFollowUp(body);break;
      case 'submitRetailForm':result=_handleRetailFormSubmit(body);break;
      case 'generateQuote':result=generateQuoteFromInput(body);break;
      case 'fullSync':result=fullSync();break;
      case 'enrichProducts':result=enrichAllProducts();break;
      default:result={error:'Unknown action: '+action};
    }
  } catch(err){result={error:err.toString()};_log('ERROR',action,err.toString());}
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function getProducts(params) {
  var cache=CacheService.getScriptCache();
  var cacheKey='products_'+JSON.stringify(params||{}).replace(/[^a-z0-9]/gi,'_').substring(0,100);
  var cached=cache.get(cacheKey);
  if(cached){try{return JSON.parse(cached);}catch(e){}}
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var sheet=ss.getSheetByName('Master_Products');
  if(!sheet) return{products:[],total:0,error:'Master_Products sheet not found'};
  var data=sheet.getDataRange().getValues();
  if(data.length<2) return{products:[],total:0};
  var headers=data[0].map(function(h){return String(h).trim();});
  var products=[];
  for(var i=1;i<data.length;i++){
    if(!data[i][0]) continue;
    try{products.push(_rowToProduct(data[i],headers));}catch(e){_log('WARN','rowToProduct','Row '+(i+1)+': '+e);}
  }
  if(params&&params.category){var cat=params.category.toLowerCase();products=products.filter(function(p){return p.category.toLowerCase().includes(cat);});}
  if(params&&params.brand){var br=params.brand.toLowerCase();products=products.filter(function(p){return p.brand.toLowerCase()===br;});}
  if(params&&params.search){var q=params.search.toLowerCase();products=products.filter(function(p){return p.name.toLowerCase().includes(q)||p.model.toLowerCase().includes(q)||p.brand.toLowerCase().includes(q);});}
  if(params&&params.featured==='true'){products=products.filter(function(p){return p.featured;});}
  var sort=(params&&params.sort)||'';
  if(sort==='price_asc') products.sort(function(a,b){return a.cashPrice-b.cashPrice;});
  if(sort==='price_desc') products.sort(function(a,b){return b.cashPrice-a.cashPrice;});
  if(sort==='name_asc') products.sort(function(a,b){return a.name.localeCompare(b.name);});
  var result={products:products,total:products.length};
  try{cache.put(cacheKey,JSON.stringify(result),CACHE_TTL);}catch(e){}
  return result;
}

function getProduct(params) {
  var id=params.id||'',model=params.model||'';
  if(!id&&!model) return{error:'id or model required'};
  var all=getProducts({});
  return(all.products||[]).filter(function(p){return p.id===id||p.model===model;})[0]||{error:'Not found'};
}

function getCategories() {
  var ss=SpreadsheetApp.getActiveSpreadsheet(), catSheet=ss.getSheetByName('Categories');
  if(catSheet&&catSheet.getLastRow()>1){
    var data=catSheet.getDataRange().getValues(), headers=data[0].map(function(h){return String(h).trim();}), cats=[];
    for(var i=1;i<data.length;i++){if(!data[i][0])continue;var obj={};headers.forEach(function(h,j){obj[h]=data[i][j];});cats.push(obj);}
    return{categories:cats};
  }
  return{categories:_getDefaultCategories()};
}

function _getDefaultCategories() {
  return[
    {id:'ac',name:'Air Conditioners',icon:'❄️',slug:'air-conditioners'},
    {id:'fridge',name:'Refrigerators',icon:'🧊',slug:'refrigerators'},
    {id:'washing',name:'Washing Machines',icon:'🫧',slug:'washing-machines'},
    {id:'tv',name:'Televisions',icon:'📺',slug:'televisions'},
    {id:'solar',name:'Solar Solutions',icon:'☀️',slug:'solar-solutions'},
    {id:'kitchen',name:'Kitchen Appliances',icon:'🍳',slug:'kitchen-appliances'},
    {id:'water',name:'Water Dispensers',icon:'💧',slug:'water-dispensers'},
    {id:'vacuum',name:'Vacuum Cleaners',icon:'🌀',slug:'vacuum-cleaners'},
    {id:'small',name:'Small Appliances',icon:'🔌',slug:'small-appliances'},
  ];
}

function getInstallmentPlans(params){
  var price=parseFloat(params.price||0);
  if(!price) return{error:'price param required'};
  return{price,plans:_calcAllPlans(price)};
}

function getSolarProducts(){return getProducts({category:'solar'});}

function getSolarQuote(params){
  var load=parseFloat(params.load||0),hours=parseFloat(params.hours||7),type=params.type||'hybrid';
  if(!load) return{error:'load (watts) required'};
  var systemKW=+(load*1.25/1000).toFixed(2), panels=Math.ceil(systemKW/0.545), panelCost=_roundTo100(panels*12500);
  var inverterKW=systemKW<=3?3:systemKW<=5?5:systemKW<=8?8:10;
  var invCost=inverterKW===3?45000:inverterKW===5?75000:inverterKW===8?120000:180000;
  var batteryKWh=0,batCost=0;
  if(type!=='on-grid'){batteryKWh=Math.ceil(load*hours/1000/0.8);batCost=_roundTo100(batteryKWh*18000);}
  var total=_roundTo100(panelCost+invCost+batCost+25000);
  var unitsPerMonth=+(load/1000*hours*30).toFixed(1), monthlySaving=_roundTo100(unitsPerMonth*50), paybackMonths=Math.ceil(total/monthlySaving);
  return{systemKW,panels,panelWatts:545,inverterKW,batteryKWh,type,costs:{panels:panelCost,inverter:invCost,battery:batCost,installation:25000,total},savings:{unitsPerMonth,monthlySaving,annualSaving:_roundTo100(monthlySaving*12),paybackMonths,paybackYears:+(paybackMonths/12).toFixed(1)},plans:_calcAllPlans(total)};
}

function getPackages(){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('Packages_Offers');if(!sh)return{packages:[]};var data=sh.getDataRange().getValues(),hdrs=data[0].map(function(h){return String(h).trim();}),out=[];for(var i=1;i<data.length;i++){if(!data[i][0])continue;var o={};hdrs.forEach(function(h,j){o[h]=data[i][j];});out.push(o);}return{packages:out};}
function getLoyaltyTiers(){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('Loyalty_Tiers');if(!sh||sh.getLastRow()<=1)return{tiers:_defaultLoyaltyTiers()};var data=sh.getDataRange().getValues(),hdrs=data[0].map(function(h){return String(h).trim();}),out=[];for(var i=1;i<data.length;i++){if(!data[i][0])continue;var o={};hdrs.forEach(function(h,j){o[h]=data[i][j];});out.push(o);}return{tiers:out.length?out:_defaultLoyaltyTiers()};}
function _defaultLoyaltyTiers(){return[{tier:'Bronze',minSpend:0,discount:2,color:'#cd7f32'},{tier:'Silver',minSpend:50000,discount:4,color:'#c0c0c0'},{tier:'Gold',minSpend:150000,discount:6,color:'#ffd700'},{tier:'Platinum',minSpend:500000,discount:10,color:'#e5e4e2'}];}
function getCompetitorData(params){var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('Competitor_Prices');if(!sh)return{competitors:[]};var data=sh.getDataRange().getValues(),hdrs=data[0].map(function(h){return String(h).trim();}),out=[];for(var i=1;i<data.length;i++){if(!data[i][0])continue;var o={};hdrs.forEach(function(h,j){o[h]=data[i][j];});if(!params.model||o['Model']===params.model)out.push(o);}return{competitors:out};}

function addOrder(body){
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('Orders')||ss.insertSheet('Orders');
    if(sh.getLastRow()===0)sh.appendRow(['Order_ID','Date','Customer_Name','Phone','Email','Address','Products','Total','Payment','Plan','Advance','Monthly','Status','Notes']);
    var oid='ORD-'+Date.now();
    sh.appendRow([oid,new Date().toISOString(),body.customerName||'',body.customerPhone||'',body.customerEmail||'',body.customerAddress||'',JSON.stringify(body.products||[]),body.totalAmount||0,body.paymentMethod||'cash',body.installmentPlan||'',body.advancePaid||0,body.monthlyAmount||0,'Pending',body.notes||'']);
    _scheduleFollowUps(oid,body);
    if(body.products)body.products.forEach(function(p){_createWarrantyRecord(oid,body,p);});
    _log('INFO','addOrder','Created '+oid);
    return{success:true,orderId:oid};
  }finally{lock.releaseLock();}
}

function _scheduleFollowUps(oid,order){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('FollowUp_Schedule')||ss.insertSheet('FollowUp_Schedule');
  if(sh.getLastRow()===0)sh.appendRow(['Order_ID','Name','Phone','Date','Type','Status','Notes']);
  var now=new Date();
  function addDays(d){var dt=new Date(now);dt.setDate(dt.getDate()+d);return dt.toISOString().split('T')[0];}
  [[3,'Post-Sale Check'],[90,'Quarterly Service'],[365,'1-Year Anniversary']].forEach(function(x){
    sh.appendRow([oid,order.customerName||'',order.customerPhone||'',addDays(x[0]),x[1],'Pending','']);
  });
}

function _createWarrantyRecord(oid,order,product){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('Warranty_Tracker')||ss.insertSheet('Warranty_Tracker');
  if(sh.getLastRow()===0)sh.appendRow(['Order_ID','Product_ID','Model','Brand','Customer','Purchase','Expiry','Status','Notes']);
  var p=new Date(),exp=new Date(p);exp.setFullYear(exp.getFullYear()+1);
  sh.appendRow([oid,product.id||'',product.model||'',product.brand||'',order.customerName||'',p.toISOString().split('T')[0],exp.toISOString().split('T')[0],'Active','']);
}

function addCrmContact(body){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('CRM_Customers')||ss.insertSheet('CRM_Customers');
  if(sh.getLastRow()===0)sh.appendRow(['ID','Name','Phone','Email','Address','City','Total','Points','Tier','First','Last','Notes']);
  var id='CUST-'+Date.now();
  sh.appendRow([id,body.name||'',body.phone||'',body.email||'',body.address||'',body.city||'',0,0,'Bronze',new Date().toISOString().split('T')[0],'',body.notes||'']);
  return{success:true,customerId:id};
}

function addFollowUp(body){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('FollowUp_Schedule')||ss.insertSheet('FollowUp_Schedule');
  sh.appendRow([body.orderId||'',body.customerName||'',body.phone||'',body.followUpDate||'',body.type||'Manual','Pending',body.notes||'']);
  return{success:true};
}

function _handleRetailFormSubmit(body){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('Retail_Enquiries')||ss.insertSheet('Retail_Enquiries');
  if(sh.getLastRow()===0)sh.appendRow(['Date','Name','Phone','Email','Interests','Budget','Notes','Status']);
  sh.appendRow([new Date().toISOString(),body.name||'',body.phone||'',body.email||'',body.interests||'',body.budget||'',body.notes||'','New']);
  return{success:true};
}

function generateQuoteFromInput(body){
  if((body.quoteType||'solar')==='solar') return getSolarQuote(body);
  var items=(body.items||[]).map(function(item){return Object.assign({},item,{plans:_calcAllPlans(parseFloat(item.price||0))});});
  var total=items.reduce(function(s,i){return s+(parseFloat(i.price)||0);},0);
  return{items,subtotal:_roundTo100(total),plans:_calcAllPlans(total)};
}

function fullSync(){
  var lock=LockService.getScriptLock();lock.waitLock(30000);
  try{_importRawProducts();enrichAllProducts();_invalidateCache();_log('INFO','fullSync','Complete');return{success:true,message:'Full sync complete'};}
  finally{lock.releaseLock();}
}

function _importRawProducts(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),raw=ss.getSheetByName('Raw_Import'),master=ss.getSheetByName('Master_Products');
  if(!raw||!master) return;
  var rawData=raw.getDataRange().getValues();
  if(rawData.length<2) return;
  var existing=master.getDataRange().getValues().slice(1).map(function(r){return String(r[1]).trim();});
  var added=0;
  for(var i=1;i<rawData.length;i++){
    var row=rawData[i],model=String(row[1]||'').trim();
    if(!model||existing.includes(model)) continue;
    master.appendRow(['PROD-'+Date.now()+'-'+i,row[1],row[0],row[2],row[3],row[4],'','','','','','',_buildSimplifiedName(row[0],row[1],row[2]),'','','TRUE','FALSE',new Date().toISOString()]);
    added++;Utilities.sleep(100);
  }
  _log('INFO','_importRawProducts','Added '+added);
}

function enrichAllProducts(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),master=ss.getSheetByName('Master_Products');
  if(!master) return{error:'Master_Products not found'};
  var data=master.getDataRange().getValues(),hdrs=data[0].map(function(h){return String(h).trim();});
  var nc=hdrs.indexOf('Simplified_Name'),cc=hdrs.indexOf('Color'),ic=hdrs.indexOf('Image_URL'),bi=hdrs.indexOf('Brand'),mi=hdrs.indexOf('Model'),ci=hdrs.indexOf('Category'),updated=0;
  for(var i=1;i<data.length;i++){
    var row=data[i];if(!row[0])continue;
    var br=String(row[bi]||''),mo=String(row[mi]||''),ca=String(row[ci]||'');
    if(nc>=0&&!row[nc]){master.getRange(i+1,nc+1).setValue(_buildSimplifiedName(br,mo,ca));updated++;}
    if(cc>=0&&(!row[cc]||row[cc]==='White/Grey')){master.getRange(i+1,cc+1).setValue(_extractColor(mo,row[nc]||mo));updated++;}
    if(ic>=0&&row[ic]){var fixed=_fixImageUrl(String(row[ic]));if(fixed!==String(row[ic])){master.getRange(i+1,ic+1).setValue(fixed);updated++;}}
    Utilities.sleep(50);
  }
  _invalidateCache();_log('INFO','enrichAllProducts','Updated '+updated);
  return{success:true,updated};
}

function setupAllSheets(){
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var defs=[['Raw_Import',['Brand','Model','Category','Sub_Category','Min_Price','Notes']],['Master_Products',['Product_ID','Model','Brand','Category','Sub_Category','Cash_Price','MRP','Image_URL','Images','Warranty','Description','Specs','Simplified_Name','Color','Tonnage','Is_Inverter','Featured','Updated_At']],['Price_Archive',['Date','Product_ID','Model','Old_Price','New_Price','Source']],['CRM_Customers',['Customer_ID','Name','Phone','Email','Address','City','Total_Purchases','Points','Tier','First_Purchase','Last_Purchase','Notes']],['Orders',['Order_ID','Date','Customer_Name','Phone','Email','Address','Products','Total','Payment','Plan','Advance','Monthly','Status','Notes']],['FollowUp_Schedule',['Order_ID','Name','Phone','Follow_Up_Date','Type','Status','Notes']],['Warranty_Tracker',['Order_ID','Product_ID','Model','Brand','Customer','Purchase','Expiry','Status','Notes']],['Maintenance_Reminders',['Customer_ID','Product_ID','Model','Last_Service','Next_Service','Type','Status']],['Power_Solutions',['Quote_ID','Customer_ID','Date','Load_W','Hours','System_KW','Panels','Inverter_KW','Battery_KWh','Total_Cost','Monthly_Saving','Payback_Months','Status']],['Packages_Offers',['Package_ID','Name','Description','Products','Total_Price','Discount_Pct','Valid_Until','Active']],['Loyalty_Tiers',['Tier','Min_Spend','Discount_Pct','Color','Benefits']],['Referrals',['Referral_ID','Referrer_ID','Referred_ID','Date','Reward','Status']],['SEO_Content',['Product_ID','Model','SEO_Title','SEO_Description','Keywords','Schema']],['Bot_Scripts',['Trigger','Response','Category','Active']],['Sync_Logs',['Timestamp','Action','Details','Status']],['Categories',['id','name','icon','slug','description','parent_id','sort_order']],['Competitor_Prices',['Date','Model','Brand','Our_Price','Competitor_1','Competitor_2','Notes']],['Solar_Products',['Product_ID','Model','Brand','Type','Capacity_KW','Price','Description','Specs','Image_URL','In_Stock']],['Retail_Enquiries',['Date','Name','Phone','Email','Interests','Budget','Notes','Status']]];
  defs.forEach(function(d){var sh=ss.getSheetByName(d[0]);if(!sh){sh=ss.insertSheet(d[0]);sh.appendRow(d[1]);sh.getRange(1,1,1,d[1].length).setFontWeight('bold').setBackground('#1e40af').setFontColor('#fff');sh.setFrozenRows(1);}});
  var catSh=ss.getSheetByName('Categories');if(catSh&&catSh.getLastRow()<=1){_getDefaultCategories().forEach(function(c,i){catSh.appendRow([c.id,c.name,c.icon,c.slug,'','',i+1]);});}
  var loySh=ss.getSheetByName('Loyalty_Tiers');if(loySh&&loySh.getLastRow()<=1){_defaultLoyaltyTiers().forEach(function(t){loySh.appendRow([t.tier,t.minSpend,t.discount,t.color,'']);});}
  SpreadsheetApp.getUi().alert('✅ All '+defs.length+' sheets ready!');
}

function _invalidateCache(){var cache=CacheService.getScriptCache();['products_{}','solar_products','products_'].forEach(function(k){try{cache.remove(k);}catch(e){}});}
function _log(level,action,details){try{var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sync_Logs');if(sh)sh.appendRow([new Date().toISOString(),action,details,level]);}catch(e){}}

function onOpen(){SpreadsheetApp.getUi().createMenu('🏠 Reliance').addItem('1. Setup All Sheets','setupAllSheets').addItem('2. Import Raw → Master','_importRawProducts').addItem('3. Enrich All Products','enrichAllProducts').addItem('4. Fix All Image URLs','fixAllImageUrls').addItem('5. Fix All Simplified Names','fixAllSimplifiedNames').addItem('6. Full Sync','fullSync').addItem('7. Clear Cache','_invalidateCache').addToUi();}

function fixAllImageUrls(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),master=ss.getSheetByName('Master_Products');if(!master)return;
  var data=master.getDataRange().getValues(),hdrs=data[0].map(function(h){return String(h).trim();}),col=hdrs.indexOf('Image_URL')+1;
  if(!col){SpreadsheetApp.getUi().alert('Image_URL column not found');return;}
  var fixed=0;
  for(var i=2;i<=data.length;i++){var cell=master.getRange(i,col),val=String(cell.getValue()||'');if(!val)continue;var nv=_fixImageUrl(val);if(nv!==val){cell.setValue(nv);fixed++;}Utilities.sleep(20);}
  _invalidateCache();SpreadsheetApp.getUi().alert('✅ Fixed '+fixed+' image URLs');
}

function fixAllSimplifiedNames(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),master=ss.getSheetByName('Master_Products');if(!master)return;
  var data=master.getDataRange().getValues(),hdrs=data[0].map(function(h){return String(h).trim();});
  var nc=hdrs.indexOf('Simplified_Name')+1,bi=hdrs.indexOf('Brand'),mi=hdrs.indexOf('Model'),ci=hdrs.indexOf('Category');
  if(!nc){SpreadsheetApp.getUi().alert('Simplified_Name column not found');return;}
  var upd=0;
  for(var i=2;i<=data.length;i++){var row=data[i-1];if(!row[0])continue;master.getRange(i,nc).setValue(_buildSimplifiedName(row[bi],row[mi],row[ci]));upd++;Utilities.sleep(20);}
  _invalidateCache();SpreadsheetApp.getUi().alert('✅ Updated '+upd+' simplified names');
}

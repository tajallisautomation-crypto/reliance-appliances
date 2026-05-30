/**
 * TAJALLI'S — Complete WhatsApp Communication Strategy
 * 
 * Every template covers:
 *  - Bilingual (English + Roman Urdu)
 *  - Consultative, never pushy
 *  - Clear call-to-action
 *  - Credibility signals embedded
 * 
 * Template categories:
 *  1. Product Enquiry & Consultation
 *  2. Installment Quoting
 *  3. Order Placement & Confirmation
 *  4. Post-Sale Follow-Up
 *  5. Feedback & Reviews
 *  6. Upgrade & Cross-sell
 *  7. Service & Maintenance
 *  8. Warranty & Complaints
 *  9. Corporate & Solar
 * 10. Bot Auto-Responses (any query type)
 */

import { WA_SALES, WA_ADMIN, COMPANY, CITY } from './config';
import { appendRef } from './referral';

// ── Core helpers ────────────────────────────────────────────────────
export const wa = (phone: string, msg: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(appendRef(msg))}`;

// ── Safe opener — falls back gracefully if popup blocked ────────────
export function openWhatsApp(url: string): void {
  try {
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    if (!w) window.location.href = url
  } catch {
    window.location.href = url
  }
}

export const waSales = (msg?: string) => wa(WA_SALES, msg || TEMPLATES.greeting_en);
export const waAdmin = (msg?: string) => wa(WA_ADMIN, msg || TEMPLATES.greeting_en);

// ── Outbound product enquiry ─────────────────────────────────────────
export const waProduct = (brand: string, model: string, lang: 'en'|'ur' = 'ur') =>
  wa(WA_SALES, lang === 'ur'
    ? `Salam! Mujhe *${brand} ${model}* ke baare mein jaanna hai. Kya available hai aur delivery kab milegi?`
    : `Hello! I'm interested in the *${brand} ${model}*. Is it available and what's the delivery timeline?`
  );

export const waInstallment = (brand: string, model: string, plan: string, lang: 'en'|'ur' = 'ur') =>
  wa(WA_SALES, lang === 'ur'
    ? `Salam! *${brand} ${model}* ko *${plan}* installment plan pe lena chahta/chahti hoon.\nKya payment breakdown share kar sakte hain?`
    : `Hello! I'd like the *${brand} ${model}* on the *${plan}* installment plan.\nCould you share the payment breakdown?`
  );

export const waOrder = (summary: string) => wa(WA_SALES, summary);

// ── Full template library ──────────────────────────────────────────
export const TEMPLATES = {

  // ── 1. GREETINGS & INITIAL RESPONSE ──────────────────────────────
  greeting_en:
    `Hello! Welcome to *${COMPANY}* 🏠\n\nHow can I help you today? I can assist with:\n• Product recommendations\n• Installment plans (2–12 months)\n• Delivery & installation\n• Warranty information\n\nFeel free to ask anything!`,

  greeting_ur:
    `Salam! *${COMPANY}* mein khush amdeed 🏠\n\nAap ki kya madad kar sakta hoon?\n• Product recommendations\n• Aqsaat plans (2 se 12 mahine)\n• Delivery aur installation\n• Warranty ki maloomat\n\nKoi bhi sawal poochain!`,

  // ── 2. PRODUCT ENQUIRY RESPONSES ─────────────────────────────────
  product_available: (brand: string, model: string, cashPrice: number, monthly12m: number) =>
    `Salam! ✅ *${brand} ${model}* available hai!\n\n` +
    `💵 *Cash Price:* PKR ${cashPrice.toLocaleString()}\n` +
    `📆 *12-Month Plan:* PKR ${monthly12m.toLocaleString()}/month × 11 months (+ advance)\n\n` +
    `🚚 Delivery: 6–48 ghante ${CITY} mein\n` +
    `🛡️ Full manufacturer warranty\n` +
    `⚡ Professional installation available\n\n` +
    `Kaunsa plan prefer karenge? Ya call karein: 0370-2578788`,

  product_enquiry_en: (brand: string, model: string) =>
    `Thank you for your interest in the *${brand} ${model}*! 🙌\n\n` +
    `I'd love to help you make the right choice. A few quick questions:\n` +
    `1️⃣ What's the room/space size?\n` +
    `2️⃣ Cash or installments?\n` +
    `3️⃣ Any specific features needed?\n\n` +
    `This helps me give you the most accurate recommendation. 😊`,

  product_enquiry_ur: (brand: string, model: string) =>
    `Shukriya *${brand} ${model}* mein interest ke liye! 🙌\n\n` +
    `Aapko best option dene ke liye kuch sawal:\n` +
    `1️⃣ Room/jagah kitni bari hai?\n` +
    `2️⃣ Cash ya aqsaat?\n` +
    `3️⃣ Koi khas feature chahiye?\n\n` +
    `Yeh information se main aapko bilkul sahi advice de sakta hoon 😊`,

  // ── 3. INSTALLMENT CONSULTATION ───────────────────────────────────
  installment_consult_ur: (brand: string, model: string, p2m: number, p3m: number, p6m: number, adv12: number, mo12: number) =>
    `Salam! *${brand} ${model}* ke liye installment plans:\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📅 *2 Mahine:* PKR ${p2m.toLocaleString()} total\n` +
    `📅 *3 Mahine:* PKR ${p3m.toLocaleString()} total\n` +
    `📅 *6 Mahine:* PKR ${p6m.toLocaleString()} total\n` +
    `📅 *12 Mahine:* PKR ${adv12.toLocaleString()} delivery pe + PKR ${mo12.toLocaleString()}/month\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `✅ Koi hidden charges nahi\n` +
    `✅ Full warranty har plan pe\n` +
    `✅ Free delivery ${CITY}\n\n` +
    `Kaunsa plan suit karta hai? Bata dain aur hum confirm kar dete hain!`,

  installment_consult_en: (brand: string, model: string, adv12: number, mo12: number) =>
    `Here are the installment options for *${brand} ${model}*:\n\n` +
    `The most popular choice is our *12-Month Plan*:\n` +
    `• Advance at delivery: PKR ${adv12.toLocaleString()}\n` +
    `• Monthly: PKR ${mo12.toLocaleString()} × 11 months\n\n` +
    `All plans include:\n` +
    `✅ No hidden charges\n` +
    `✅ Full manufacturer warranty\n` +
    `✅ Free delivery & installation support\n\n` +
    `Which plan works best for you?`,

  // ── 4. CLOSING A SALE ─────────────────────────────────────────────
  close_ur: (customerName: string, product: string, plan: string) =>
    `${customerName} bhai/sis! 🤝\n\n` +
    `Sab kuch confirm hai:\n` +
    `✅ Product: *${product}*\n` +
    `✅ Plan: *${plan}*\n` +
    `✅ Free delivery aapke ghar tak\n` +
    `✅ Installation included\n\n` +
    `Bas apna address aur convenient time bata dain — hum schedule kar dete hain!\n\n` +
    `Koi aur sawal ho toh zaroor poochain. Hum sath hain 😊`,

  close_en: (customerName: string, product: string, plan: string) =>
    `${customerName}, great choice! 🎉\n\n` +
    `Here's your order summary:\n` +
    `✅ *${product}*\n` +
    `✅ Payment: *${plan}*\n` +
    `✅ Free delivery to your door\n` +
    `✅ Professional installation\n\n` +
    `Just share your address and a convenient time — we'll schedule everything!\n\n` +
    `Feel free to ask anything else. We're with you every step. 🤝`,

  // ── 5. ORDER CONFIRMATION ─────────────────────────────────────────
  order_confirm_ur: (name: string, product: string, orderId: string, plan: string) =>
    `✅ *ORDER CONFIRMED!*\n\n` +
    `Salam ${name}!\n` +
    `Aapka order receive ho gaya hai 🎊\n\n` +
    `📦 *Order ID:* ${orderId}\n` +
    `🛍️ *Product:* ${product}\n` +
    `💳 *Plan:* ${plan}\n\n` +
    `Agle steps:\n` +
    `1. Hamara team 1 ghante mein call karega\n` +
    `2. Delivery schedule confirm hogi\n` +
    `3. Delivery ke waqt advance payment\n` +
    `4. Professional installation\n\n` +
    `Koi bhi zaroorat ho: 0370-2578788\n` +
    `${COMPANY} — Aapka bharosa hamare haath mein hai 🏠`,

  order_confirm_en: (name: string, product: string, orderId: string) =>
    `✅ *ORDER CONFIRMED!*\n\n` +
    `Hi ${name}!\n` +
    `Your order has been received successfully 🎊\n\n` +
    `📦 *Order ID:* ${orderId}\n` +
    `🛍️ *Product:* ${product}\n\n` +
    `What happens next:\n` +
    `1. Our team will call within a few hours to confirm\n` +
    `2. Delivery will be scheduled at your convenience\n` +
    `3. Advance payment at delivery\n` +
    `4. Professional installation on the spot\n\n` +
    `Questions? Call/WhatsApp: +92 370 2578788\n` +
    `${COMPANY} — Your trusted appliance & solutions partner`,

  // ── 6. POST-SALE FOLLOW-UP ────────────────────────────────────────
  followup_postsale_ur: (name: string, product: string) =>
    `Salam ${name}! 😊\n\n` +
    `*${product}* delivery ke 3 din baad check in kar raha hoon.\n\n` +
    `• Product theek kaam kar raha hai?\n` +
    `• Koi masla ya sawal?\n` +
    `• Installation se mutmain hain?\n\n` +
    `Hamari team hamesha available hai — koi bhi cheez ho, zaroor batain! 🤝`,

  followup_postsale_en: (name: string, product: string) =>
    `Hi ${name}! 😊\n\n` +
    `Just checking in 3 days after your *${product}* delivery.\n\n` +
    `• Is everything working perfectly?\n` +
    `• Any questions or concerns?\n` +
    `• Happy with the installation?\n\n` +
    `We're always here — don't hesitate to reach out! 🤝`,

  followup_quarterly_ur: (name: string, product: string) =>
    `Salam ${name}! 🙋‍\n\n` +
    `Aapko *${product}* purchase kiye 3 mahine ho gaye — waqt kaise guzra?\n\n` +
    `Kuch tips jo helpful honge:\n` +
    `🔧 AC filter monthly clean karein\n` +
    `❄️ Fridge coil se dust hatat rahein\n` +
    `☀️ Solar panel quarterly wipe karein\n\n` +
    `Professional service ki zaroorat ho toh bata dain — free estimate dete hain!\n\n` +
    `Aur ha — aapke liye koi naya offer bhi hai, poochain zaroor 😉`,

  followup_annual_ur: (name: string, product: string) =>
    `Salam ${name}! 🎂\n\n` +
    `*${product}* ki 1 saal poori hoi — Mubarak ho!\n\n` +
    `Ek saal ke baad kuch important cheezain:\n` +
    `✅ Annual service / deep clean recommended\n` +
    `🛡️ Warranty status check\n` +
    `⚡ Performance health check\n\n` +
    `Kya aap is saal koi aur appliance upgrade karne ka soch rahe hain?\n` +
    `Loyalty customers ko special pricing milti hai 🎁\n\n` +
    `Bata dain — hum free consultation denge!`,

  // ── 7. FEEDBACK & REVIEWS ─────────────────────────────────────────
  feedback_ur: (name: string, product: string) =>
    `Salam ${name}! 🌟\n\n` +
    `*${product}* ke baare mein aapka feedback bahut important hai humein.\n\n` +
    `1 se 5 tak rate karein:\n` +
    `⭐⭐⭐⭐⭐ = Excellent\n` +
    `⭐⭐⭐⭐ = Very Good\n` +
    `⭐⭐⭐ = Good\n\n` +
    `Koi suggestion ho toh zaroor share karein — hum continuously improve karte hain 🙏`,

  feedback_en: (name: string, product: string) =>
    `Hi ${name}! 🌟\n\n` +
    `We'd love your feedback on the *${product}*.\n\n` +
    `On a scale of 1–5:\n` +
    `⭐⭐⭐⭐⭐ = Excellent\n` +
    `⭐⭐⭐⭐ = Very Good\n\n` +
    `Any suggestions for improvement? We take every piece of feedback seriously 🙏`,

  // ── 8. UPGRADE / CROSS-SELL ───────────────────────────────────────
  upgrade_ur: (name: string, oldProduct: string, newProduct: string) =>
    `Salam ${name}! 💡\n\n` +
    `Aapne *${oldProduct}* liya tha — bahut achha choice tha!\n\n` +
    `Aaj ek exciting offer share karna chahta hoon:\n` +
    `🆕 *${newProduct}* — brand new model\n` +
    `✅ Naya technology, better efficiency\n` +
    `✅ Loyalty customer discount aapke liye\n` +
    `✅ Old product exchange/trade-in bhi available\n\n` +
    `Interested ho toh batain — exclusive quote bhejta hoon! 🎁`,

  upgrade_en: (name: string, oldProduct: string, newProduct: string) =>
    `Hi ${name}! 💡\n\n` +
    `You've been a valued customer since your *${oldProduct}* purchase!\n\n` +
    `Thought you'd love to know about the *${newProduct}*:\n` +
    `🆕 Latest model with improved efficiency\n` +
    `✅ Loyalty customer exclusive pricing\n` +
    `✅ Trade-in available for your old unit\n\n` +
    `Interested? I'll send you a personalized quote! 🎁`,

  // ── 9. SERVICE & MAINTENANCE ─────────────────────────────────────
  service_reminder_ur: (name: string, product: string, serviceType: string) =>
    `Salam ${name}! 🔧\n\n` +
    `Yaad dilaana tha: *${product}* ka *${serviceType}* due hai.\n\n` +
    `Regular maintenance ke fayde:\n` +
    `⚡ 20–30% energy savings\n` +
    `🔧 Life expectancy 3–5 saal barh jaati hai\n` +
    `💰 Costly repairs se bachao\n\n` +
    `Appointment lena chahein? Ek call pe schedule kar dete hain!\n` +
    `0370-2578788`,

  service_reminder_en: (name: string, product: string, serviceType: string) =>
    `Hi ${name}! 🔧\n\n` +
    `Friendly reminder: Your *${product}* is due for *${serviceType}*.\n\n` +
    `Why regular maintenance matters:\n` +
    `⚡ 20–30% energy savings\n` +
    `🔧 Extends lifespan by 3–5 years\n` +
    `💰 Prevents costly breakdowns\n\n` +
    `Want to schedule? One call and we'll handle everything!\n` +
    `+92 370 2578788`,

  // ── 10. WARRANTY & COMPLAINTS ─────────────────────────────────────
  warranty_claim_ur: (name: string, product: string) =>
    `Salam ${name}! Masla sun ke afsos hua 😔\n\n` +
    `*${product}* ka warranty claim process karenge aap ke liye.\n\n` +
    `Please yeh information share karein:\n` +
    `1️⃣ Purchase date aur order number\n` +
    `2️⃣ Problem ki detail (photo/video helpful)\n` +
    `3️⃣ Aapka address (technician visit ke liye)\n\n` +
    `*Hum manufacturer se seedha deal karte hain — aapko kuch nahi karna.*\n` +
    `24 ghante mein technician bhejenge InshAllah 🙏`,

  warranty_claim_en: (name: string, product: string) =>
    `Hi ${name}! I'm sorry to hear about the issue 😔\n\n` +
    `We'll handle the warranty claim for your *${product}* directly.\n\n` +
    `Please share:\n` +
    `1️⃣ Purchase date & order number\n` +
    `2️⃣ Description of the issue (photo/video helps)\n` +
    `3️⃣ Your address for technician visit\n\n` +
    `*We handle manufacturer claims on your behalf — no hassle for you.*\n` +
    `A technician will visit within 24 hours. 🙏`,

  complaint_ur: (name: string) =>
    `Salam ${name}! 🙏\n\n` +
    `Aapki baat sun ke dil dukha. Maafi chahta hoon.\n\n` +
    `Mujhe puri detail batain — main personally ensure karunga ke yeh masla jaldi se jaldi theek ho.\n\n` +
    `*${COMPANY} ka wada hai: koi customer pareshan nahi jaata.*\n\n` +
    `Hamari support line: 0370-2578788`,

  // ── 11. CORPORATE ENQUIRY ─────────────────────────────────────────
  corporate_ur: (company: string, name: string) =>
    `Salam ${name}! *${company}* ke liye corporate enquiry ke liye shukriya 🏢\n\n` +
    `Hamari corporate services:\n` +
    `🏢 Bulk purchase pricing (5+ units)\n` +
    `⚡ 4-hour priority response SLA\n` +
    `🔧 Dedicated maintenance contracts\n` +
    `☀️ Office solar + backup solutions\n` +
    `📄 Monthly invoice available\n\n` +
    `Ek dedicated corporate manager aapko assign hoga.\n` +
    `Sales line: 0370-2578788`,

  // ── 12. SOLAR CONSULTATION ────────────────────────────────────────
  solar_consult_ur: (name: string) =>
    `Salam ${name}! ☀️\n\n` +
    `Solar system ke baare mein interest ke liye shukriya!\n\n` +
    `Free assessment ke liye kuch sawal:\n` +
    `1️⃣ Ghar ya office kitne rooms?\n` +
    `2️⃣ Kitne AC, fridge, ghar ke appliances?\n` +
    `3️⃣ Monthly bijli bill kita ata hai?\n` +
    `4️⃣ Net metering chahiye ya off-grid?\n\n` +
    `Yeh details se main aapko exact system size aur ROI calculate kar ke batata hoon!\n` +
    `90% customers ka bill 60%+ kam ho jaata hai ☀️`,

  // ── 13. AC LIFECYCLE JOURNEY ──────────────────────────────────────
  lifecycle_ac_install: (name: string, product: string) =>
    `Salam ${name}! 🎉\n\n` +
    `*${product}* deliver ho gaya — Mubarak ho!\n\n` +
    `Hamari team installation ke liye ready hai. Kab convenient time hai?\n` +
    `• Aaj\n• Kal subah\n• Kal dopahar ke baad\n\n` +
    `Installation mein shamil hai:\n` +
    `✅ Professional wiring & gas charge\n` +
    `✅ Test run + cooling check\n` +
    `✅ Remote aur features ka demonstration\n\n` +
    `Ek message mein batain — schedule kar dete hain! ⚡`,

  lifecycle_ac_day7: (name: string, product: string) =>
    `Salam ${name}! 😊\n\n` +
    `*${product}* install hue 7 din ho gaye — sab theek chal raha hai?\n\n` +
    `Quick check:\n` +
    `❄️ Cooling satisfactory hai?\n` +
    `🔇 Koi unusual sound toh nahi?\n` +
    `💧 Drainage theek hai?\n\n` +
    `Agar koi bhi cheez ajeeb lage — *abhi batain*. Warranty period mein hain, sab free fix ho jaega.\n\n` +
    `Satisfied hain toh bhi batain — sunna acha lagta hai! 😄\n` +
    `0370-2578788`,

  lifecycle_ac_month3: (name: string, product: string) =>
    `Salam ${name}! 🌟\n\n` +
    `*${product}* ko 3 mahine ho gaye — waqt kaise guzra?\n\n` +
    `3 tips jo AC ki life barha denge:\n` +
    `🧹 *Filter clean karein* — mahine mein ek baar (dust blocking = 15% extra bijli)\n` +
    `❄️ *Set temp 24-26°C* — best efficiency zone\n` +
    `🔌 *Night mode use karein* — auto temperature control\n\n` +
    `Professional *filter + coil service* karwana chahein?\n` +
    `PKR 2,500–3,500 mein complete service — appointment le lain!\n\n` +
    `0370-2578788`,

  lifecycle_ac_presummer: (name: string, product: string) =>
    `Salam ${name}! ☀️\n\n` +
    `Garmiyaan aa rahi hain — kya aapka *${product}* ready hai?\n\n` +
    `*Pre-Summer Deep Clean Package:*\n` +
    `🧼 Indoor + outdoor coil wash\n` +
    `❄️ Gas pressure check\n` +
    `⚡ Electrical connections tighten\n` +
    `🔧 Drain pipe flush\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `PKR *3,500* (limited time — May se pehle book karein)\n\n` +
    `Cleaned AC:\n` +
    `✅ 20-30% energy saving\n` +
    `✅ Better cooling from day one of summer\n` +
    `✅ Reduces risk of breakdown in peak heat\n\n` +
    `Appointment chahiye? Reply karein! 🗓️`,

  lifecycle_ac_care_plan: (name: string, product: string) =>
    `Salam ${name}! 🛡️\n\n` +
    `*${product}* ka pehla saal poora hone wala hai — Mubarak!\n\n` +
    `Aapke liye ek khas offer: *Annual AC Care Plan*\n\n` +
    `*Essential Plan — PKR 7,500/year:*\n` +
    `✅ 2 full service visits\n` +
    `✅ Filter + coil cleaning\n` +
    `✅ Gas pressure check\n` +
    `✅ Priority booking\n` +
    `✅ 10% off spare parts\n\n` +
    `Loyalty customers ko *extra 10% discount* milti hai 🎁\n\n` +
    `Enroll karna chahein? 1 call mein sab arrange ho jaega!\n` +
    `0370-2578788`,

  lifecycle_ac_solar: (name: string, product: string) =>
    `Salam ${name}! ☀️\n\n` +
    `Aap *${product}* ke saath bohot bijli bachat kar rahe hain — aur zyada karna chahein?\n\n` +
    `*Solar + AC Combination — Karachi ka Best Investment:*\n` +
    `💡 3-5 kW system aapka AC + ghar ka load cover kar sakta hai\n` +
    `📉 Bill 60-80% kam ho jaata hai\n` +
    `💰 System 3-4 saal mein ROI de deta hai\n` +
    `🌱 Net metering se WAPDA ko bijli bhi bech sakte hain\n\n` +
    `*Free Solar Assessment:*\n` +
    `✅ Site visit\n` +
    `✅ Load calculation\n` +
    `✅ Exact system size + cost quote\n` +
    `✅ ROI timeline\n\n` +
    `Interested? Reply *SOLAR* — hum call karenge! ☀️`,

  // ── 14. BUNDLE OFFERS ──────────────────────────────────────────────
  bundle_ac_package: (name = 'Customer') =>
    `Salam ${name}! ❄️\n\n` +
    `*AC Complete Package* — sab ek jagah:\n\n` +
    `📦 Inverter AC (brand + model aap chunein)\n` +
    `🔧 Professional installation (wiring + gas charge)\n` +
    `⚡ Voltage stabilizer (AC protection)\n` +
    `☀️ Free solar suitability consultation\n\n` +
    `*5% bundle discount* automatically apply hoga!\n\n` +
    `Kaunsa AC size chahiye? 1 ton, 1.5 ton ya 2 ton?\n` +
    `Reply karein — complete quote 10 min mein 🎁`,

  bundle_fridge: (name = 'Customer') =>
    `Salam ${name}! 🧊\n\n` +
    `*Fridge & Home Bundle:*\n\n` +
    `🧊 Inverter refrigerator (model aap chunein)\n` +
    `🛡️ Anti-vibration fridge mat\n` +
    `🚚 Free white-glove delivery\n` +
    `📋 1-year Essential Care Plan option\n\n` +
    `*4% bundle saving + free delivery!*\n\n` +
    `Kitne litre ki zaroorat hai? Family kitni hai?\n` +
    `Reply karein — best model recommend karta hoon! 😊`,

  bundle_washer: (name = 'Customer') =>
    `Salam ${name}! 👕\n\n` +
    `*Laundry Starter Pack — sab ready:*\n\n` +
    `🫧 Automatic washing machine\n` +
    `🦯 Heavy-duty adjustable stand\n` +
    `🔧 Professional installation (drain + inlet)\n` +
    `📋 1-year service plan\n\n` +
    `*5% bundle discount + everything set up on day one!*\n\n` +
    `Top load ya front load prefer karein?\n` +
    `Reply karein — hum arrange kar dete hain! 🚀`,

  bundle_solar: (name = 'Customer') =>
    `Salam ${name}! ☀️\n\n` +
    `*Solar Power Bundle — Complete System:*\n\n` +
    `☀️ Solar panels (3–5 kW, size TBD on site)\n` +
    `⚡ Hybrid inverter (net metering ready)\n` +
    `🔋 Lithium battery bank (6-8 hrs backup)\n` +
    `❄️ Free AC compatibility & load check\n\n` +
    `*Bill 60%+ kam · 3-4 saal ROI · 25 yr panel warranty*\n\n` +
    `*Free site assessment* — koi commitment nahi.\n` +
    `Reply *SOLAR* ya call: 0370-2578788 ☀️`,

  // ── 15. SEGMENT CAMPAIGNS ─────────────────────────────────────────
  segment_repeat_buyer: (name: string, purchaseCount: number) =>
    `Salam ${name}! 🌟\n\n` +
    `Aap hamare *${purchaseCount}× repeat customer* hain — shukriya bharose ke liye! 🙏\n\n` +
    `*Loyalty Early Access — Sirf Aapke Liye:*\n` +
    `🎁 Naaye models show hone se pehle aapko bataya jaega\n` +
    `💰 Exclusive pricing before public sale\n` +
    `🚚 Express delivery priority\n` +
    `📞 Dedicated WhatsApp line\n\n` +
    `Koi bhi cheez zaroorat ho — seedha message karein.\n` +
    `Aap hamare VIP hain 👑`,

  segment_high_value: (name: string, tier: string) =>
    `Salam ${name}! 💎\n\n` +
    `Aap hamare *${tier} Tier* member hain — aapki loyalty hum appreciate karte hain.\n\n` +
    `*Aapke exclusive benefits:*\n` +
    `✅ ${tier === 'Platinum' ? '15%' : tier === 'Gold' ? '10%' : '5%'} discount on all service visits\n` +
    `✅ ${tier === 'Gold' || tier === 'Platinum' ? 'Free annual AC service' : 'Priority service scheduling'}\n` +
    `✅ ${tier === 'Platinum' ? 'Dedicated account manager' : 'Early sale access'}\n\n` +
    `Koi naya appliance ya service chahiye? Seedha message karein — aapka deal pakka hoga! 🎁`,

  segment_solar_prospect: (name: string, applianceCount: number) =>
    `Salam ${name}! ☀️\n\n` +
    `Aapke ghar mein *${applianceCount} appliances* registered hain — bohot accha setup hai!\n\n` +
    `Ek smart upgrade jo sab ko cover kar sakta hai:\n` +
    `💡 *Solar system* — aapka poora load free bijli pe\n` +
    `📉 WAPDA bill 60-80% reduce\n` +
    `🔋 Battery backup — load shedding se azaadi\n` +
    `💰 3-4 saal mein full ROI\n\n` +
    `*Free assessment + zero commitment* — bas ek call.\n` +
    `Reply karein ya call: 0370-2578788 ☀️`,

  // ── 16. BOT AUTO-RESPONSES (any query) ────────────────────────────
  bot: {
    price_ur: (product: string, cashPrice: number) =>
      `*${product}* ki price:\n💵 Cash: PKR ${cashPrice.toLocaleString()}\n📅 Installment plans bhi available!\nDetails ke liye reply karein.`,

    delivery_ur: () =>
      `🚚 Karachi mein delivery 6–48 ghante.\nSame-day delivery kuch areas mein.\nConfirmation ke baad team schedule karti hai.`,

    availability_ur: (product: string) =>
      `✅ *${product}* abhi *stock mein hai*!\nFauran order ke liye reply karein ya call: 0370-2578788`,

    warranty_info_ur: () =>
      `🛡️ Hamari warranties:\n• AC: 5 saal compressor\n• Fridge: 10 saal compressor\n• Solar: 25 saal performance\nSab manufacturer authorized.`,

    not_understood_ur: () =>
      `Salam! Samajh nahi aaya 😊\nMujhe bata dain:\n• Kaunsa product chahiye?\n• Cash ya installment?\n• Ya call karein: 0370-2578788`,

    not_understood_en: () =>
      `Hi! I didn't quite catch that 😊\nCould you tell me:\n• Which product are you interested in?\n• Cash or installment?\n• Or call us: +92 370 2578788`,

    // Any query router
    route: (query: string): string => {
      const q = query.toLowerCase();
      if (q.includes('price') || q.includes('kitna') || q.includes('rate') || q.includes('cost'))
        return 'price';
      if (q.includes('delivery') || q.includes('deliver') || q.includes('kab'))
        return 'delivery';
      if (q.includes('install') || q.includes('aqsaat') || q.includes('kist') || q.includes('monthly'))
        return 'installment';
      if (q.includes('warranty') || q.includes('guarantee'))
        return 'warranty';
      if (q.includes('solar') || q.includes('panel'))
        return 'solar';
      if (q.includes('service') || q.includes('repair') || q.includes('kharab'))
        return 'service';
      if (q.includes('complaint') || q.includes('problem') || q.includes('issue'))
        return 'complaint';
      return 'unknown';
    },
  },
};

// ── Convenience named exports ──────────────────────────────────────
export const waProductEnquiry = (brand: string, model: string) =>
  wa(WA_SALES, TEMPLATES.product_enquiry_ur(brand, model));

export const waInstallmentQuote = (brand: string, model: string, adv12: number, mo12: number) =>
  wa(WA_SALES, TEMPLATES.installment_consult_en(brand, model, adv12, mo12));

export const waSolarConsult = (name = 'Customer') =>
  wa(WA_SALES, TEMPLATES.solar_consult_ur(name));

export const waCorporate = () =>
  wa(WA_ADMIN, TEMPLATES.corporate_ur('Your Company', 'Sir/Ma\'am'));

export const waWarrantyClaim = (product: string) =>
  wa(WA_SALES, TEMPLATES.warranty_claim_ur('Customer', product));

export const waComplaint = () =>
  wa(WA_SALES, TEMPLATES.complaint_ur('Customer'));

// ── Lifecycle convenience exports ──────────────────────────────────
export const waLifecycleInstall = (name: string, product: string) =>
  wa(WA_SALES, TEMPLATES.lifecycle_ac_install(name, product));

export const waLifecycleDay7 = (name: string, product: string) =>
  wa(WA_SALES, TEMPLATES.lifecycle_ac_day7(name, product));

export const waLifecycleMonth3 = (name: string, product: string) =>
  wa(WA_SALES, TEMPLATES.lifecycle_ac_month3(name, product));

export const waLifecyclePresummer = (name: string, product: string) =>
  wa(WA_SALES, TEMPLATES.lifecycle_ac_presummer(name, product));

export const waLifecycleCarePlan = (name: string, product: string) =>
  wa(WA_SALES, TEMPLATES.lifecycle_ac_care_plan(name, product));

export const waLifecycleSolar = (name: string, product: string) =>
  wa(WA_SALES, TEMPLATES.lifecycle_ac_solar(name, product));

// ── Bundle convenience exports ─────────────────────────────────────
export const waBundleAC = (name?: string) =>
  wa(WA_SALES, TEMPLATES.bundle_ac_package(name));

export const waBundleFridge = (name?: string) =>
  wa(WA_SALES, TEMPLATES.bundle_fridge(name));

export const waBundleWasher = (name?: string) =>
  wa(WA_SALES, TEMPLATES.bundle_washer(name));

export const waBundleSolar = (name?: string) =>
  wa(WA_SALES, TEMPLATES.bundle_solar(name));

// ── Segment campaign exports ────────────────────────────────────────
export const waSegmentRepeat = (name: string, count: number) =>
  wa(WA_SALES, TEMPLATES.segment_repeat_buyer(name, count));

export const waSegmentHighValue = (name: string, tier: string) =>
  wa(WA_SALES, TEMPLATES.segment_high_value(name, tier));

export const waSegmentSolarProspect = (name: string, count: number) =>
  wa(WA_SALES, TEMPLATES.segment_solar_prospect(name, count));

'use client'

/**
 * Thin event tracking layer.
 * Fires to Plausible (if loaded) and console in dev. Extend to GA4/Meta Pixel here.
 */

type EventProps = Record<string, string | number | boolean>

function plausible(event: string, props?: EventProps) {
  if (typeof window === 'undefined') return
  const w = window as any
  if (typeof w.plausible === 'function') {
    w.plausible(event, { props })
  }
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', event, props)
  }
}

// ── Lead CTAs ─────────────────────────────────────────────────────────────
export function trackWhatsAppClick(source: string) {
  plausible('WhatsApp Click', { source })
}

export function trackCallClick(source: string) {
  plausible('Call Click', { source })
}

export function trackEmailClick(source: string) {
  plausible('Email Click', { source })
}

export function trackQuoteRequest(type: string) {
  plausible('Quote Request', { type })
}

// ── Product discovery ──────────────────────────────────────────────────────
export function trackProductCardClick(productName: string, category: string) {
  plausible('Product Card Click', { product: productName, category })
}

export function trackCategoryClick(category: string) {
  plausible('Category Click', { category })
}

export function trackSearchQuery(query: string) {
  plausible('Search', { query })
}

export function trackFilterUse(filterName: string, value: string) {
  plausible('Filter Used', { filter: filterName, value })
}

// ── Cart / installments ────────────────────────────────────────────────────
export function trackAddToCart(productName: string, price: number) {
  plausible('Add to Cart', { product: productName, price })
}

export function trackInstallmentPlanSelected(plan: string, price: number) {
  plausible('Installment Plan Selected', { plan, price })
}

// ── Care packages & solar ──────────────────────────────────────────────────
export function trackPackageView(packageName: string) {
  plausible('Package View', { package: packageName })
}

export function trackPackageInquiry(packageName: string) {
  plausible('Package Inquiry', { package: packageName })
}

export function trackSolarCalculatorUse() {
  plausible('Solar Calculator Used')
}

export function trackSolarQuoteCTA(source: string) {
  plausible('Solar Quote CTA', { source })
}

// ── Content SEO ────────────────────────────────────────────────────────────
export function trackFAQExpand(question: string) {
  plausible('FAQ Expanded', { question })
}

export function trackComparisonInteraction(context: string) {
  plausible('Comparison Table Interaction', { context })
}

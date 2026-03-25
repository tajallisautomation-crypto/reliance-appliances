/**
 * Silent referral attribution — buyer-invisible tracking.
 *
 * Flow:
 *  1. Referrer shares link: tajallis.com.pk/?ref=CODE
 *  2. On landing, ?ref= is read, stored in localStorage, then stripped
 *     from the URL bar instantly — buyer never sees it.
 *  3. For 30 days, every WhatsApp CTA on the site appends a hidden
 *     attribution line to the pre-filled message for staff to read.
 *  4. Referrer earns 2% commission when staff confirm the sale.
 */

const KEY_CODE = '_ref'
const KEY_TS   = '_ref_ts'
const TTL_MS   = 30 * 24 * 60 * 60 * 1000   // 30 days

/** Call once on app mount. Reads ?ref= param, persists it, strips from URL. */
export function captureRef(): void {
  try {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      const code = ref.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20)
      if (code) {
        localStorage.setItem(KEY_CODE, code)
        localStorage.setItem(KEY_TS,   String(Date.now()))
      }
      params.delete('ref')
      const qs  = params.toString()
      const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash
      window.history.replaceState({}, '', url)
    }
  } catch { /* localStorage blocked — silent */ }
}

/** Returns the active referral code, or null if expired / not set. */
export function getRef(): string | null {
  try {
    const code = localStorage.getItem(KEY_CODE)
    const ts   = localStorage.getItem(KEY_TS)
    if (!code || !ts) return null
    if (Date.now() - Number(ts) > TTL_MS) {
      localStorage.removeItem(KEY_CODE)
      localStorage.removeItem(KEY_TS)
      return null
    }
    return code
  } catch { return null }
}

/**
 * Appends a silent staff-readable attribution line to any WhatsApp message.
 * Formatted as plain metadata — buyers ignore it, staff recognise it.
 */
export function appendRef(msg: string): string {
  const ref = getRef()
  return ref ? `${msg}\n\nRef: ${ref}` : msg
}

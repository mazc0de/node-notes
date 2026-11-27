/** Accepts what a person types ("github.com/foo") and returns a full URL, or null if it isn't one. */
export function normalizeUrlInput(raw: string): string | null {
  const value = raw.trim()
  if (!value || /\s/.test(value)) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(withScheme)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      // a bare word like "hello" is not a link
      if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null
    }
    return url.href
  } catch {
    return null
  }
}

/**
 * Light normalization for the "Already saved" check:
 * ignore scheme, a leading "www.", host case and a trailing slash.
 */
export function urlKey(href: string): string {
  try {
    const url = new URL(href)
    const host = url.host.toLowerCase().replace(/^www\./, '')
    const path = url.pathname.replace(/\/+$/, '')
    return `${host}${path}${url.search}${url.hash}`
  } catch {
    return href.trim().toLowerCase().replace(/\/+$/, '')
  }
}

export function domainOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return href
  }
}

/** Android share sheets often put the link inside `text` instead of `url`. */
export function findUrlInText(text: string | null | undefined): string | null {
  if (!text) return null
  const match = text.match(/https?:\/\/[^\s<>"']+/i)
  if (!match) return null
  return match[0].replace(/[.,;:!?)\]}'"]+$/, '')
}

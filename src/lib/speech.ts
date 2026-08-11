/** Prefer a warmer female / Indian-English voice over the default deep male. */
export function pickPreferredVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (!voices.length) return null

  const score = (voice: SpeechSynthesisVoice) => {
    const name = voice.name || ''
    const lang = voice.lang || ''
    let n = 0
    if (/en-IN/i.test(lang)) n += 80
    if (/en-GB/i.test(lang)) n += 40
    if (/en-US/i.test(lang)) n += 20
    if (/en/i.test(lang)) n += 10
    if (/google/i.test(name) && /india|en-IN/i.test(`${name} ${lang}`)) n += 50
    if (/neerja|sonia|zira|samantha|karen|moira|tessa|fiona|veena/i.test(name)) n += 60
    if (/female|woman/i.test(name)) n += 35
    if (/david|mark|james|ravi|alex|daniel|fred|bruce|tom/i.test(name)) n -= 100
    return n
  }

  return [...voices].sort((a, b) => score(b) - score(a))[0] || null
}

/** Make brand + catalog jargon sound natural when spoken. */
export function prepareSpeechText(text: string) {
  return String(text || '')
    .replace(/Fabrica/gi, 'Fah-bree-kah')
    .replace(/₹\s?/g, 'rupees ')
    .replace(/\bGSM\b/gi, 'G S M')
    .replace(/\bAI\b/g, 'A I')
    .replace(/\b\/\s*m(eter)?\b/gi, ' per meter')
    .replace(/\n+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

let cachedVoice: SpeechSynthesisVoice | null | undefined
let voicesHooked = false

function ensureVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  if (voicesHooked) return
  voicesHooked = true
  const refresh = () => {
    cachedVoice = pickPreferredVoice(window.speechSynthesis.getVoices())
  }
  refresh()
  window.speechSynthesis.addEventListener('voiceschanged', refresh)
}

export function speakFabrica(
  text: string,
  options?: { enabled?: boolean; rate?: number; pitch?: number },
) {
  if (options?.enabled === false) return
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  const spoken = prepareSpeechText(text)
  if (!spoken) return

  ensureVoices()
  window.speechSynthesis.cancel()

  const utter = new SpeechSynthesisUtterance(spoken)
  utter.rate = options?.rate ?? 0.96
  utter.pitch = options?.pitch ?? 1.05
  const voice = cachedVoice ?? pickPreferredVoice(window.speechSynthesis.getVoices())
  if (voice) {
    cachedVoice = voice
    utter.voice = voice
    utter.lang = voice.lang || 'en-IN'
  } else {
    utter.lang = 'en-IN'
  }
  window.speechSynthesis.speak(utter)
}

export function cancelSpeech() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}

/** Matches the buyer account menu in the navbar (top-right). */
export type VoiceNavTarget =
  | 'profile'
  | 'marketplace'
  | 'cart'
  | 'orders'
  | 'favorites'
  | 'addresses'

type NavRule = {
  target: VoiceNavTarget
  path: string
  reply: string
  /** Full-string match after normalization */
  exact: string[]
  /** Matched against the phrase after an open/go-to verb */
  aliases: string[]
}

const NAV_RULES: NavRule[] = [
  {
    target: 'profile',
    path: '/profile',
    reply: 'Opening your profile on Fabrica.',
    exact: ['profile', 'my profile', 'the profile'],
    aliases: [
      'profile',
      'my profile',
      'the profile',
      'profile section',
      'profile page',
    ],
  },
  {
    target: 'marketplace',
    path: '/marketplace',
    reply: 'Opening the marketplace on Fabrica.',
    exact: ['marketplace', 'the marketplace', 'market place', 'store', 'the store'],
    aliases: [
      'marketplace',
      'the marketplace',
      'marketplace section',
      'marketplace page',
      'market place',
      'the market place',
      'store',
      'the store',
      'shop',
      'the shop',
    ],
  },
  {
    target: 'cart',
    path: '/cart',
    reply: 'Opening your cart on Fabrica.',
    exact: ['cart', 'my cart', 'the cart', 'shopping cart'],
    aliases: ['cart', 'my cart', 'the cart', 'shopping cart', 'cart section', 'cart page'],
  },
  {
    target: 'orders',
    path: '/orders',
    reply: 'Opening your orders on Fabrica.',
    exact: ['orders', 'my orders', 'the orders', 'order'],
    aliases: [
      'orders',
      'my orders',
      'the orders',
      'order',
      'order section',
      'orders section',
      'orders page',
      'order history',
    ],
  },
  {
    target: 'favorites',
    path: '/favorites',
    reply: 'Opening your favorites on Fabrica.',
    exact: [
      'favorites',
      'favourites',
      'the favorites',
      'the favourites',
      'my favorites',
      'my favourites',
      'wishlist',
    ],
    aliases: [
      'favorites',
      'favourites',
      'my favorites',
      'my favourites',
      'the favorites',
      'the favourites',
      'wishlist',
      'saved items',
      'favorites section',
      'favourites section',
    ],
  },
  {
    target: 'addresses',
    path: '/addresses',
    reply: 'Opening your address section on Fabrica.',
    exact: [
      'address',
      'addresses',
      'my address',
      'my addresses',
      'address section',
      'the address section',
    ],
    aliases: [
      'address',
      'addresses',
      'my address',
      'my addresses',
      'the address',
      'the addresses',
      'address section',
      'addresses section',
      'address page',
      'addresses page',
    ],
  },
]

function normalizeNavText(text: string) {
  let t = String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Whisper nearly always hears "cart" as "card" — never rewrite inside address phrases.
  if (!/\baddress/.test(t)) {
    t = t.replace(/\bcard\b/g, 'cart').replace(/\bkart\b/g, 'cart')
  }

  t = t
    .replace(/\bfavourites\b/g, 'favorites')
    .replace(/\bfavourite\b/g, 'favorite')
    .replace(/\bmarket place\b/g, 'marketplace')
    .replace(/\bwish list\b/g, 'wishlist')

  return t
}

/** Local-only navigation phrases for the AI chatbot (no data mutations). */
export function detectVoiceNavigation(text: string): {
  target: VoiceNavTarget
  path: string
  reply: string
} | null {
  const t = normalizeNavText(text)
  if (!t) return null

  for (const rule of NAV_RULES) {
    if (rule.exact.includes(t)) {
      return { target: rule.target, path: rule.path, reply: rule.reply }
    }
  }

  const openMatch = t.match(
    /^(please\s+|can you\s+)?(open|go to|show|take me to|navigate to|view)\s+(.+)$/,
  )
  if (!openMatch) return null

  const rest = (openMatch[3] || '').trim()
  if (!rest) return null

  for (const rule of NAV_RULES) {
    if (rule.aliases.includes(rest)) {
      return { target: rule.target, path: rule.path, reply: rule.reply }
    }
  }

  return null
}

export function pathForNavigateTo(target: string | null | undefined): string | null {
  const rule = NAV_RULES.find((item) => item.target === target)
  return rule?.path || null
}

export const AUTH_REFUSAL_REPLY =
  "I can't do that. For your security I can't log you in, log you out, or use account credentials. Please use the account menu in the top right for login, logout, or account access."

/** Auth / credential actions the chatbot must refuse (navigation-only elsewhere). */
export function detectAuthRefusal(text: string): string | null {
  const t = String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!t) return null

  const refused =
    /\b(log\s*out|logout|sign\s*out|signout)\b/.test(t) ||
    /\b(log\s*in|login|sign\s*in|signin)\b/.test(t) ||
    /\b(password|credentials?|otp|one time password)\b/.test(t) ||
    /\b(my email|my password|here are my (creds|credentials|details))\b/.test(t) ||
    /^(open|go to|show|take me to|navigate to|view)\s+(the\s+)?(my\s+)?account(\s+section|\s+page)?$/.test(
      t,
    ) ||
    t === 'account' ||
    t === 'my account' ||
    t === 'the account' ||
    t === 'open my account' ||
    t === 'delete my account' ||
    t === 'close my account'

  return refused ? AUTH_REFUSAL_REPLY : null
}

function normalizeActionText(text: string) {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanProductQuery(raw: string) {
  let query = String(raw || '').trim()
  query = query.replace(/^(the|a|an)\s+/i, '').trim()
  query = query.replace(/\s+(product|fabric|item)$/i, '').trim()
  if (/^(this|it|that)(\s+one)?$/i.test(query)) return ''
  return query
}

/** Normalize fabric brand/slang so "polycotton" matches "PolyCot". */
function canonicalizeFabricText(value: string) {
  let text = normalizeActionText(value)
  text = text.replace(/\bpoly\s*[- ]?\s*cot(?:ton)?\b/g, 'polycot')
  text = text.replace(/\bpolycotton\b/g, 'polycot')
  text = text.replace(/\bpolyester\b/g, 'poly')
  return text.replace(/\s+/g, ' ').trim()
}

export function expandFabricSearchQueries(query: string): string[] {
  const base = cleanProductQuery(query) || normalizeActionText(query)
  if (!base) return []
  const canon = canonicalizeFabricText(base)
  const alts = new Set<string>([base, canon])
  if (/\bpolycot\b/.test(canon)) {
    alts.add(canon.replace(/\bpolycot\b/g, 'polycotton'))
    alts.add(canon.replace(/\bpolycot\b/g, 'poly cotton'))
    alts.add(canon.replace(/\bpolycot\b/g, 'poly cot'))
  }
  return [...alts].filter(Boolean)
}

export function scoreProductName(query: string, name: string) {
  const q = canonicalizeFabricText(query)
  const n = canonicalizeFabricText(name)
  if (!q || !n) return 0
  if (n === q) return 120
  if (n.includes(q) || q.includes(n)) return 100
  const qTokens = q.split(' ').filter((token) => token.length > 1)
  if (!qTokens.length) return 0
  const hits = qTokens.filter((token) => n.includes(token)).length
  return (hits / qTokens.length) * 90
}

export function pickBestProduct<T extends { name?: string }>(
  products: T[],
  query: string,
): T | null {
  if (!products.length) return null
  if (!query.trim()) return products[0] || null
  const ranked = products
    .map((product) => ({
      product,
      score: scoreProductName(query, product.name || ''),
    }))
    .sort((a, b) => b.score - a.score)
  if (!ranked[0] || ranked[0].score < 40) return null
  return ranked[0].product
}

/** Prefer products already shown in this chat over a fresh marketplace search. */
export function collectRecentChatProducts<T extends { _id?: string; name?: string }>(
  messages: Array<{ role?: string; products?: T[] | null }>,
): T[] {
  const out: T[] = []
  const seen = new Set<string>()
  for (const msg of [...messages].reverse()) {
    if (msg.role !== 'assistant' || !msg.products?.length) continue
    for (const product of msg.products) {
      const id = String(product?._id || '')
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(product)
    }
    if (out.length >= 16) break
  }
  return out
}

/** e.g. "add premium cotton poplin to cart" / "add X in cart" */
export function detectCartAction(text: string): { query: string } | null {
  const t = normalizeActionText(text)
  if (!t) return null
  if (!/\b(add|put)\b/.test(t) || !/\bcart\b/.test(t)) return null
  if (/\b(favorites|favourites|wishlist)\b/.test(t)) return null

  let query = t
    .replace(/^(please|can you)\s+/, '')
    .replace(/^(add|put)\s+/, '')
    .replace(/\s+(to|in|into)\s+(my\s+)?(the\s+)?cart$/, '')
    .trim()

  if (/^(to|in|into)\s+(my\s+)?(the\s+)?cart\s+/.test(query)) {
    query = query.replace(/^(to|in|into)\s+(my\s+)?(the\s+)?cart\s+/, '').trim()
  }

  return { query: cleanProductQuery(query) }
}

/** True when the message is a catalog search/recommend, not “open this SKU”. */
function looksLikeFabricSearch(text: string) {
  const t = normalizeActionText(text)
  if (!t) return false
  if (
    /^(please\s+|can you\s+)?(show\s+me|find(\s+me)?|search(\s+for)?|look(\s+for)?|browse|recommend|suggest|i\s+(need|want))\b/.test(
      t,
    )
  ) {
    if (/\b(details?|product page)\b/.test(t)) return false
    return true
  }
  if (/\b(show me|find me|looking for)\b/.test(t)) {
    if (/\b(details?|product page)\b/.test(t)) return false
    return true
  }
  if (/\b(fabrics?\s+for|fabric\s+for)\b/.test(t)) return true
  if (/\b(fabrics?|for|under|below|above|budget|gsm|meter|metres?)\b/.test(t)) {
    if (/\b(details?|product page)\b/.test(t)) return false
    if (/^(please\s+|can you\s+)?open\b/.test(t)) return false
    return true
  }
  return false
}

/** e.g. "open product details for X" / "open premium stretch denim" */
export function detectOpenProductAction(text: string): { query: string } | null {
  if (detectVoiceNavigation(text)) return null
  if (detectCartAction(text)) return null
  if (looksLikeFabricSearch(text)) return null

  const t = normalizeActionText(text)
  if (!t) return null
  if (/^(please\s+|can you\s+)?(show\s+me|find(\s+me)?|search)\b/.test(t)) return null

  const patterns = [
    /^(please\s+|can you\s+)?(open|view)\s+(the\s+)?(product\s+)?details?\s+(for|of)\s+(.+)$/,
    /^(please\s+|can you\s+)?(open|view)\s+(.+?)\s+(product\s+)?details?$/,
    /^(please\s+|can you\s+)?(open|view)\s+(the\s+)?product\s+(page\s+(for\s+)?)?(.+)$/,
    /^(please\s+|can you\s+)?(open|view)\s+(the\s+)?(.+?)\s+product\s+page$/,
    // Plain open/view of a named product (not "show me …")
    /^(please\s+|can you\s+)?(open|view)\s+(the\s+)?(.+)$/,
  ]

  const blocked = new Set([
    'cart',
    'marketplace',
    'orders',
    'favorites',
    'favourites',
    'profile',
    'address',
    'addresses',
    'wishlist',
    'store',
    'shop',
    'account',
    'home',
    'faq',
  ])

  for (const re of patterns) {
    const match = t.match(re)
    if (!match) continue
    const query = cleanProductQuery(match[match.length - 1] || '')
    if (!query) continue
    if (blocked.has(query)) continue
    if (
      /^(my|the)\s+(cart|marketplace|orders|favorites|favourites|profile|address|addresses|wishlist|store|shop|account)$/.test(
        query,
      )
    ) {
      continue
    }
    return { query }
  }

  return null
}

import type { MarketplaceApiProduct } from './marketplaceAdapter'
import type { ApiProduct } from './productDrafts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export type UserRole = 'BUYER' | 'SELLER'

export type AuthUser = {
  _id: string
  email: string
  role: UserRole
  firebaseUid: string
  authProvider: 'LOCAL' | 'GOOGLE'
  isEmailVerified: boolean
  createdAt?: string
  updatedAt?: string
}

export type AuthSyncResponse = {
  user: AuthUser
  sellerSetupCompleted: boolean
}

export type SellerProfile = {
  _id: string
  userId: string
  companyName: string
  phone: string
  gst: string
  description: string
  verified: boolean
  createdAt?: string
  updatedAt?: string
}

export type SellerSetupInput = {
  companyName: string
  phone: string
  gst: string
  description?: string
}

type ApiError = {
  success: false
  message: string
  code?: string
}

type AuthApiSuccess = {
  success: true
  user: AuthUser
  sellerSetupCompleted: boolean
}

type SellerApiSuccess = {
  success: true
  seller: SellerProfile
  sellerSetupCompleted?: boolean
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options
  const url = `${API_BASE_URL}${path}`
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData

  let response: Response
  try {
    response = await fetch(url, {
      cache: 'no-store',
      ...rest,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        ...headers,
      },
    })
  } catch (networkError) {
    console.error('[api] network error', { url, networkError })
    const error = new Error(
      `Cannot reach API at ${API_BASE_URL}. Is the backend running on port 5000?`,
    ) as Error & { code?: string; status?: number }
    error.code = 'NETWORK_ERROR'
    throw error
  }

  // 304 Not Modified has no body; treat as failure so callers can retry with
  // no-store (should be rare now that the API disables etag).
  if (response.status === 304) {
    const error = new Error('Cached response (304)') as Error & {
      code?: string
      status?: number
    }
    error.code = 'NOT_MODIFIED'
    error.status = 304
    throw error
  }

  const payload = (await response.json().catch(() => null)) as
    | AuthApiSuccess
    | SellerApiSuccess
    | ApiError
    | { success: true; [key: string]: unknown }
    | null

  if (!response.ok || !payload || payload.success === false) {
    const error = new Error(
      payload && 'message' in payload ? String(payload.message) : 'Something went wrong',
    ) as Error & { code?: string; status?: number }
    error.code = payload && 'code' in payload ? String(payload.code) : undefined
    error.status = response.status
    console.error('[api] request failed', {
      url,
      status: response.status,
      code: error.code,
      message: error.message,
    })
    throw error
  }

  return payload as T
}

export async function syncAuth(token: string, role?: UserRole): Promise<AuthSyncResponse> {
  const payload = await apiRequest<AuthApiSuccess>('/api/auth/sync', {
    method: 'POST',
    token,
    body: JSON.stringify(role ? { role } : {}),
  })

  return {
    user: payload.user,
    sellerSetupCompleted: payload.sellerSetupCompleted,
  }
}

export async function fetchMe(token: string): Promise<AuthSyncResponse> {
  const payload = await apiRequest<AuthApiSuccess>('/api/auth/me', {
    method: 'GET',
    token,
  })

  return {
    user: payload.user,
    sellerSetupCompleted: payload.sellerSetupCompleted,
  }
}

export async function setupSellerProfile(token: string, data: SellerSetupInput) {
  return apiRequest<SellerApiSuccess>('/api/sellers/setup', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export async function fetchSellerProfile(token: string) {
  return apiRequest<SellerApiSuccess>('/api/sellers/me', {
    method: 'GET',
    token,
  })
}

export type SellerDashboardRange = 'week' | 'month' | 'year' | 'all'

export type SellerDashboard = {
  range: SellerDashboardRange
  label: string
  totalSales: number
  orderCount: number
  avgOrderValue: number
  publishedCount: number
  series: Array<{
    key: string
    label: string
    sales: number
    orders: number
  }>
  recentOrders: Array<{
    _id: string
    status: 'PLACED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'
    totalAmount: number
    createdAt?: string
    itemCount: number
    previewImage: string
    productName: string
  }>
}

export async function fetchSellerDashboard(
  token: string,
  range: SellerDashboardRange = 'week',
) {
  return apiRequest<{ success: true; dashboard: SellerDashboard }>(
    `/api/sellers/me/dashboard?range=${range}`,
    { method: 'GET', token },
  )
}

export async function updateSellerProfile(token: string, data: Partial<SellerSetupInput>) {
  return apiRequest<SellerApiSuccess>('/api/sellers/me', {
    method: 'PUT',
    token,
    body: JSON.stringify(data),
  })
}

type ProductApiSuccess = {
  success: true
  product: ApiProduct
}

type ProductsApiSuccess = {
  success: true
  products: ApiProduct[]
}

type ProductStatsApiSuccess = {
  success: true
  stats: {
    publishedCount: number
    draftCount: number
    totalCount: number
  }
}

type UploadImagesApiSuccess = {
  success: true
  images: Array<{ url: string; publicId: string }>
}

export async function fetchSellerProducts(
  token: string,
  status: 'published' | 'draft' | 'all' = 'published',
) {
  return apiRequest<ProductsApiSuccess>(`/api/products/me?status=${status}`, {
    method: 'GET',
    token,
  })
}

export async function fetchSellerProductStats(token: string) {
  return apiRequest<ProductStatsApiSuccess>('/api/products/me/stats', {
    method: 'GET',
    token,
  })
}

export async function fetchSellerProduct(token: string, id: string) {
  return apiRequest<ProductApiSuccess>(`/api/products/${id}`, {
    method: 'GET',
    token,
  })
}

export async function createSellerProduct(token: string, data: Record<string, unknown>) {
  return apiRequest<ProductApiSuccess>('/api/products', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export async function updateSellerProduct(
  token: string,
  id: string,
  data: Record<string, unknown>,
) {
  return apiRequest<ProductApiSuccess>(`/api/products/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(data),
  })
}

export async function saveSellerProductDraft(
  token: string,
  data: Record<string, unknown>,
  id?: string | null,
) {
  if (id) {
    return apiRequest<ProductApiSuccess>(`/api/products/drafts/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    })
  }

  return apiRequest<ProductApiSuccess>('/api/products/drafts', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export async function deleteSellerProduct(token: string, id: string) {
  return apiRequest<{ success: true; deleted: boolean; _id: string }>(`/api/products/${id}`, {
    method: 'DELETE',
    token,
  })
}

export async function uploadProductImages(token: string, files: File[]) {
  const body = new FormData()
  files.forEach((file) => body.append('images', file))

  return apiRequest<UploadImagesApiSuccess>('/api/products/upload', {
    method: 'POST',
    token,
    body,
  })
}

export type Address = {
  _id: string
  name: string
  companyName?: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  country: string
  postalCode: string
  isDefault?: boolean
}

export type OrderStatus = 'PLACED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'

export type ApiOrder = {
  _id: string
  buyerId: string
  sellerId: string
  status: OrderStatus
  totalAmount: number
  shippingAddress: Address
  items: Array<{
    productId: string
    variantId?: string | null
    productName: string
    colorHex: string
    image: string
    unit: string
    quantity: number
    price: number
  }>
  dispatchedAt?: string | null
  deliveredAt?: string | null
  cancelledAt?: string | null
  paymentId?: string | null
  createdAt?: string
  updatedAt?: string
}

export type ApiPayment = {
  _id: string
  sellerId: string
  orderId: string
  buyerId: string
  payerName: string
  amount: number
  currency: string
  status: 'COMPLETED'
  source: 'SYSTEM'
  reference: string
  note?: string
  createdAt?: string
  updatedAt?: string
}

export async function fetchSellerPayments(token: string) {
  return apiRequest<{ success: true; payments: ApiPayment[] }>('/api/payments', {
    method: 'GET',
    token,
  })
}

export async function fetchSellerPayment(token: string, id: string) {
  return apiRequest<{ success: true; payment: ApiPayment }>(`/api/payments/${id}`, {
    method: 'GET',
    token,
  })
}

async function downloadPdf(path: string, token: string, fallbackName: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null
    throw new Error(payload?.message || 'Failed to download invoice')
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)
  const filename = match?.[1] || fallbackName
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/** Seller: sales invoice PDF for a payment record. */
export async function downloadPaymentSalesInvoice(token: string, paymentId: string) {
  return downloadPdf(
    `/api/payments/${paymentId}/invoice`,
    token,
    `sales-invoice-${paymentId.slice(-6)}.pdf`,
  )
}

/** Buyer purchase invoice / seller sales invoice for an order. */
export async function downloadOrderInvoice(token: string, orderId: string) {
  return downloadPdf(
    `/api/orders/${orderId}/invoice`,
    token,
    `invoice-${orderId.slice(-6)}.pdf`,
  )
}

export type ApiNotification = {
  _id: string
  title: string
  body: string
  type: string
  orderId?: string | null
  link?: string
  read: boolean
  createdAt?: string
}

export type MarketplaceFilters = {
  q?: string
  category?: string
  categories?: string[]
  minPrice?: number
  maxPrice?: number
  gsm?: string[]
  moqRanges?: string[]
}

export type MarketplaceFacets = {
  categories: Array<{ name: string; count: number }>
  widths: Array<{ value: number; label: string; count: number }>
  widthRange: { min: number; max: number }
  moqRanges: Array<{ id: string; label: string; count: number }>
  gsmRanges: Array<{ id: string; label: string; count: number }>
  price: { min: number; max: number }
}

export type MarketplaceSuggestProduct = {
  _id: string
  name: string
  category: string
  price: number | null
  unit: string
  coverImage: string
}

export async function fetchMarketplaceProducts(
  params?: MarketplaceFilters,
  token?: string | null,
) {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.category) search.set('category', params.category)
  if (params?.categories?.length) search.set('categories', params.categories.join(','))
  if (params?.minPrice != null) search.set('minPrice', String(params.minPrice))
  if (params?.maxPrice != null) search.set('maxPrice', String(params.maxPrice))
  if (params?.gsm?.length) search.set('gsm', params.gsm.join(','))
  if (params?.moqRanges?.length) search.set('moqRanges', params.moqRanges.join(','))
  const qs = search.toString()
  return apiRequest<{ success: true; products: MarketplaceApiProduct[] }>(
    `/api/marketplace${qs ? `?${qs}` : ''}`,
    { method: 'GET', token: token || undefined },
  )
}

export async function fetchMarketplaceFacets() {
  return apiRequest<{ success: true; facets: MarketplaceFacets }>('/api/marketplace/facets', {
    method: 'GET',
  })
}

export async function fetchMarketplaceSuggest(q: string) {
  const search = new URLSearchParams()
  if (q) search.set('q', q)
  return apiRequest<{
    success: true
    query: string
    products: MarketplaceSuggestProduct[]
  }>(`/api/marketplace/suggest?${search.toString()}`, { method: 'GET' })
}

export async function fetchMarketplaceProduct(id: string, token?: string | null) {
  return apiRequest<{
    success: true
    product: MarketplaceApiProduct
    favorited: boolean
  }>(`/api/marketplace/${id}`, {
    method: 'GET',
    token: token || undefined,
  })
}

export async function fetchCart(token: string) {
  return apiRequest<{ success: true; cart: { items: Array<Record<string, unknown>> } }>(
    '/api/cart',
    { method: 'GET', token },
  )
}

export async function addCartItem(
  token: string,
  data: { productId: string; variantId?: string; quantity: number },
) {
  return apiRequest<{ success: true; cart: { items: Array<Record<string, unknown>> } }>(
    '/api/cart/items',
    { method: 'POST', token, body: JSON.stringify(data) },
  )
}

export async function updateCartItem(token: string, itemId: string, quantity: number) {
  return apiRequest<{ success: true; cart: { items: Array<Record<string, unknown>> } }>(
    `/api/cart/items/${itemId}`,
    { method: 'PUT', token, body: JSON.stringify({ quantity }) },
  )
}

export async function removeCartItem(token: string, itemId: string) {
  return apiRequest<{ success: true; cart: { items: Array<Record<string, unknown>> } }>(
    `/api/cart/items/${itemId}`,
    { method: 'DELETE', token },
  )
}

export async function fetchFavorites(token: string) {
  return apiRequest<{ success: true; favorites: { products: MarketplaceApiProduct[] } }>(
    '/api/favorites',
    { method: 'GET', token },
  )
}

export async function addFavorite(token: string, productId: string) {
  return apiRequest<{ success: true; favorites: { products: MarketplaceApiProduct[] } }>(
    `/api/favorites/${productId}`,
    { method: 'POST', token },
  )
}

export async function removeFavorite(token: string, productId: string) {
  return apiRequest<{ success: true; favorites: { products: MarketplaceApiProduct[] } }>(
    `/api/favorites/${productId}`,
    { method: 'DELETE', token },
  )
}

export async function fetchAddresses(token: string) {
  return apiRequest<{ success: true; addresses: Address[] }>('/api/addresses', {
    method: 'GET',
    token,
  })
}

export async function createAddress(token: string, data: Partial<Address>) {
  return apiRequest<{ success: true; address: Address }>('/api/addresses', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export async function updateAddress(token: string, id: string, data: Partial<Address>) {
  return apiRequest<{ success: true; address: Address }>(`/api/addresses/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(data),
  })
}

export async function deleteAddress(token: string, id: string) {
  return apiRequest<{ success: true; deleted: boolean }>(`/api/addresses/${id}`, {
    method: 'DELETE',
    token,
  })
}

export async function placeOrder(
  token: string,
  data: { addressId: string; items?: Array<Record<string, unknown>> },
) {
  return apiRequest<{ success: true; order: ApiOrder }>('/api/orders', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export async function fetchOrders(token: string) {
  return apiRequest<{ success: true; orders: ApiOrder[] }>(
    `/api/orders?_=${Date.now()}`,
    {
      method: 'GET',
      token,
      cache: 'no-store',
    },
  )
}

export async function fetchOrder(token: string, id: string) {
  return apiRequest<{ success: true; order: ApiOrder }>(`/api/orders/${id}`, {
    method: 'GET',
    token,
  })
}

export async function cancelOrder(token: string, id: string) {
  return apiRequest<{ success: true; order: ApiOrder }>(`/api/orders/${id}/cancel`, {
    method: 'POST',
    token,
  })
}

export async function dispatchOrder(token: string, id: string) {
  return apiRequest<{ success: true; order: ApiOrder }>(`/api/orders/${id}/dispatch`, {
    method: 'POST',
    token,
  })
}

export async function fetchNotifications(token: string) {
  return apiRequest<{
    success: true
    notifications: ApiNotification[]
    unreadCount: number
  }>('/api/notifications', { method: 'GET', token })
}

export async function markNotificationRead(token: string, id: string) {
  return apiRequest<{ success: true; notification: ApiNotification }>(
    `/api/notifications/${id}/read`,
    { method: 'POST', token },
  )
}

export async function markAllNotificationsRead(token: string) {
  return apiRequest<{ success: true }>('/api/notifications/read-all', {
    method: 'POST',
    token,
  })
}

export async function saveFcmToken(token: string, fcmToken: string) {
  return apiRequest<{ success: true }>('/api/notifications/fcm-token', {
    method: 'POST',
    token,
    body: JSON.stringify({ token: fcmToken }),
  })
}

export type ApiReview = {
  _id: string
  productId: string
  buyerId: string
  buyerName: string
  rating: number
  review: string
  isMine: boolean
  createdAt?: string
  updatedAt?: string
}

export type ReviewSummary = {
  averageRating: number
  count: number
}

export async function fetchProductReviews(productId: string, token?: string) {
  return apiRequest<{
    success: true
    reviews: ApiReview[]
    summary: ReviewSummary
    myReview: ApiReview | null
  }>(`/api/reviews/product/${productId}`, {
    method: 'GET',
    token,
  })
}

export async function fetchMyReviews(token: string, productIds: string[]) {
  const params = new URLSearchParams()
  if (productIds.length) params.set('productIds', productIds.join(','))
  const query = params.toString()
  return apiRequest<{ success: true; reviews: ApiReview[] }>(
    `/api/reviews/mine${query ? `?${query}` : ''}`,
    { method: 'GET', token },
  )
}

export async function createReview(
  token: string,
  data: { productId: string; rating: number; review: string },
) {
  return apiRequest<{ success: true; review: ApiReview }>('/api/reviews', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export async function updateReview(
  token: string,
  id: string,
  data: { rating: number; review: string },
) {
  return apiRequest<{ success: true; review: ApiReview }>(`/api/reviews/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  })
}

export async function deleteReview(token: string, id: string) {
  return apiRequest<{ success: true; deleted: boolean; _id: string }>(
    `/api/reviews/${id}`,
    { method: 'DELETE', token },
  )
}

export type AiChatHistoryItem = {
  role: 'user' | 'assistant'
  content: string
}

export type AiNlFilters = {
  category: string | null
  color: string | null
  minPrice: number | null
  maxPrice: number | null
  minGsm: number | null
  maxGsm: number | null
  keywords: string[]
  useCase: string | null
}

export type AiRecommendation = {
  product: MarketplaceApiProduct
  reason: string
}

export async function postAiChat(
  data: { message: string; history?: AiChatHistoryItem[]; productId?: string | null },
  token?: string | null,
) {
  return apiRequest<{
    success: true
    intent: string
    reply: string
    products: MarketplaceApiProduct[]
    filters: AiNlFilters | null
    recommendations?: AiRecommendation[]
    comparison?: Record<string, unknown>
  }>('/api/ai/chat', {
    method: 'POST',
    token: token || undefined,
    body: JSON.stringify(data),
  })
}

export async function postAiSearch(
  query: string,
  token?: string | null,
  options?: { silent?: boolean },
) {
  return apiRequest<{
    success: true
    query: string
    filters: AiNlFilters
    summary: string
    products: MarketplaceApiProduct[]
    count: number
  }>('/api/ai/search', {
    method: 'POST',
    token: token || undefined,
    body: JSON.stringify({
      query,
      silent: Boolean(options?.silent),
    }),
  })
}

export async function postAiRecommend(query: string, token?: string | null) {
  return apiRequest<{
    success: true
    query: string
    message: string
    products: MarketplaceApiProduct[]
    recommendations: AiRecommendation[]
  }>('/api/ai/recommend', {
    method: 'POST',
    token: token || undefined,
    body: JSON.stringify({ query }),
  })
}

export async function postAiCompare(
  productIdA: string,
  productIdB: string,
  token?: string | null,
) {
  return apiRequest<{
    success: true
    productA: MarketplaceApiProduct
    productB: MarketplaceApiProduct
    summary: string
    dimensions: Array<{ label: string; productA: string; productB: string }>
    verdict: string
  }>('/api/ai/compare', {
    method: 'POST',
    token: token || undefined,
    body: JSON.stringify({ productIdA, productIdB }),
  })
}

export async function fetchSimilarProducts(productId: string, limit = 8) {
  return apiRequest<{ success: true; products: MarketplaceApiProduct[] }>(
    `/api/ai/similar/${productId}?limit=${limit}`,
    { method: 'GET' },
  )
}

export async function postProductQa(
  productId: string,
  question: string,
  token?: string | null,
) {
  return apiRequest<{
    success: true
    productId: string
    question: string
    answer: string
    product: MarketplaceApiProduct
  }>(`/api/ai/product/${productId}/qa`, {
    method: 'POST',
    token: token || undefined,
    body: JSON.stringify({ question }),
  })
}

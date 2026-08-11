import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, Package, Search, X } from 'lucide-react'
import { SellerShell } from '../components/seller/SellerShell'
import { EmptyState } from '../components/ui/EmptyState'
import { ListRecordCard } from '../components/ui/ListRecordCard'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import { advanceOrder, fetchOrders, type ApiOrder } from '../lib/api'
import { formatNumber } from '../lib/format'
import { onOrderNotification } from '../lib/orderRealtime'
import {
  canSellerAdvance,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  SELLER_ACTION_LABELS,
  type OrderStatus,
} from '../lib/orderStatuses'

function orderDateKey(order: ApiOrder) {
  const raw = order.createdAt || order.updatedAt
  if (!raw) return ''
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function SellerOrdersPage() {
  const { getAccessToken } = useAuth()
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    let cancelled = false
    let requestId = 0

    const load = async (options?: { silent?: boolean }) => {
      const thisRequest = ++requestId
      if (!options?.silent) setLoading(true)
      try {
        const token = await getAccessToken()
        if (!token || cancelled) return
        const result = await fetchOrders(token)
        // Ignore stale responses so an older poll cannot wipe newer orders.
        if (cancelled || thisRequest !== requestId) return
        setOrders(Array.isArray(result.orders) ? result.orders : [])
        setError('')
      } catch (err) {
        if (!cancelled && !options?.silent) {
          setError(err instanceof Error ? err.message : 'Failed to load orders')
        }
      } finally {
        if (!cancelled && !options?.silent && thisRequest === requestId) {
          setLoading(false)
        }
      }
    }

    void load()
    const timer = window.setInterval(() => {
      void load({ silent: true })
    }, 5000)
    const stop = onOrderNotification(() => {
      void load({ silent: true })
    })
    return () => {
      cancelled = true
      window.clearInterval(timer)
      stop()
    }
  }, [getAccessToken])

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((order) => {
      const key = orderDateKey(order)
      if (dateFrom && key && key < dateFrom) return false
      if (dateTo && key && key > dateTo) return false
      if (dateFrom && !key) return false
      if (dateTo && !key) return false
      if (!q) return true

      const orderCode = String(order._id).slice(-6).toLowerCase()
      const fullId = String(order._id).toLowerCase()
      const buyer = order.shippingAddress?.name?.toLowerCase() || ''
      const city = order.shippingAddress?.city?.toLowerCase() || ''
      const status = (ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status).toLowerCase()
      const products = order.items.map((item) => item.productName.toLowerCase()).join(' ')

      return (
        orderCode.includes(q) ||
        fullId.includes(q) ||
        buyer.includes(q) ||
        city.includes(q) ||
        status.includes(q) ||
        products.includes(q)
      )
    })
  }, [orders, query, dateFrom, dateTo])

  const hasFilters = Boolean(query.trim() || dateFrom || dateTo)

  const clearFilters = () => {
    setQuery('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <SellerShell>
      <main className="w-full min-w-0">
        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-black tracking-tight mb-1">
          Orders
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Mark orders as dispatched. Delivery confirms automatically after 1 minute.
          {!loading && orders.length > 0 ? (
            <span className="text-gray-400">
              {' '}
              · {hasFilters ? `${filteredOrders.length} of ${orders.length}` : orders.length} shown
            </span>
          ) : null}
        </p>

        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <div className="flex-1 flex items-center h-11 rounded-full border border-gray-200 bg-[#f5f3ef] overflow-hidden focus-within:border-gray-400 focus-within:bg-white transition-colors">
            <div className="pl-3.5 pr-2 text-gray-400 shrink-0">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by order ID, buyer, product, city…"
              className="flex-1 min-w-0 h-full bg-transparent focus:outline-none text-sm text-gray-800 placeholder:text-gray-400"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="shrink-0 w-9 h-9 mr-1 inline-flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-200/80 hover:text-black transition-colors"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2 h-11 px-3.5 rounded-full border border-gray-200 bg-[#f5f3ef] focus-within:border-gray-400 focus-within:bg-white transition-colors">
              <Calendar size={15} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500 shrink-0">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                autoComplete="off"
                className="min-w-0 bg-transparent focus:outline-none text-sm text-gray-800"
              />
            </label>
            <label className="flex items-center gap-2 h-11 px-3.5 rounded-full border border-gray-200 bg-[#f5f3ef] focus-within:border-gray-400 focus-within:bg-white transition-colors">
              <Calendar size={15} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500 shrink-0">To</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                autoComplete="off"
                className="min-w-0 bg-transparent focus:outline-none text-sm text-gray-800"
              />
            </label>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-11 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-[#f5f3ef] transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {loading ? (
          <PageLoader label="Loading orders" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="When buyers place orders for your products, they will show up here."
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching orders"
            description="Try a different search or date range."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        ) : (
          <div className="w-full flex flex-col gap-3">
            {filteredOrders.map((order) => {
              const first = order.items[0]
              return (
                <ListRecordCard
                  key={order._id}
                  to={`/seller/orders/${order._id}`}
                  image={first?.image}
                  imageAlt={first?.productName || 'Order'}
                  imageFallback={<Package size={22} />}
                  aside={
                    <>
                      <div className="sm:text-right">
                        <p className="font-semibold text-black text-lg md:text-xl leading-none">
                          ₹{formatNumber(order.totalAmount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Total</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/seller/orders/${order._id}`}
                          className="inline-flex items-center gap-1 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-[#f5f3ef]"
                        >
                          View
                          <ArrowRight size={13} />
                        </Link>
                        {canSellerAdvance(order.status) && (
                          <button
                            type="button"
                            disabled={busyId === order._id}
                            onClick={async (event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              setBusyId(order._id)
                              setError('')
                              try {
                                const token = await getAccessToken()
                                if (!token) return
                                const result = await advanceOrder(token, order._id)
                                setOrders((prev) =>
                                  prev.map((row) =>
                                    row._id === order._id ? result.order : row,
                                  ),
                                )
                              } catch (err) {
                                setError(
                                  err instanceof Error ? err.message : 'Failed to update order',
                                )
                              } finally {
                                setBusyId(null)
                              }
                            }}
                            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg bg-black text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50"
                          >
                            {busyId === order._id
                              ? 'Updating...'
                              : SELLER_ACTION_LABELS[order.status] || 'Advance'}
                          </button>
                        )}
                      </div>
                    </>
                  }
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-black">
                      Order #{String(order._id).slice(-6).toUpperCase()}
                    </p>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        ORDER_STATUS_STYLES[order.status as OrderStatus] ||
                        'bg-gray-50 text-gray-700 border-gray-100'
                      }`}
                    >
                      {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
                    </span>
                  </div>
                  <h3 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-black leading-snug line-clamp-2">
                    {first?.productName || 'Fabric order'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {order.items.slice(0, 4).map((item, index) =>
                      item.colorHex ? (
                        <span
                          key={`${item.productId}_${item.variantId}_${index}`}
                          className="inline-flex items-center gap-1.5 text-xs text-gray-600"
                          title={item.colorHex}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: item.colorHex }}
                          />
                          {item.colorHex}
                        </span>
                      ) : null,
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1.5">
                    {order.items.length} item{order.items.length === 1 ? '' : 's'} · Ship to{' '}
                    {order.shippingAddress.name}, {order.shippingAddress.city}
                  </p>
                </ListRecordCard>
              )
            })}
          </div>
        )}
      </main>
    </SellerShell>
  )
}

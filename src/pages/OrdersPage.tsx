import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Package } from 'lucide-react'
import { Container } from '../components/container'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'
import { EmptyState } from '../components/ui/EmptyState'
import { ListRecordCard } from '../components/ui/ListRecordCard'
import { PageBackLink } from '../components/ui/PageBackLink'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import { fetchOrders, type ApiOrder } from '../lib/api'
import { formatNumber } from '../lib/format'
import { onOrderNotification } from '../lib/orderRealtime'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES, type OrderStatus } from '../lib/orderStatuses'

function formatOrderDate(value?: string) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export function OrdersPage() {
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async (options?: { silent?: boolean }) => {
      try {
        const token = await getAccessToken()
        if (!token) {
          navigate('/login')
          return
        }
        const result = await fetchOrders(token)
        if (!cancelled) setOrders(result.orders)
      } finally {
        if (!cancelled && !options?.silent) setLoading(false)
      }
    }

    void load()
    const timer = window.setInterval(() => {
      void load({ silent: true })
    }, 8000)
    const stop = onOrderNotification(() => {
      void load({ silent: true })
    })

    return () => {
      cancelled = true
      window.clearInterval(timer)
      stop()
    }
  }, [getAccessToken, navigate])

  return (
    <div className="flex-1 flex flex-col bg-[#f9f9f9]">
      <div className="min-h-[calc(100dvh+14rem)] flex flex-col">
      <Navbar variant="solid" showActions fixed={false} />
      <Container className="flex-1 py-8 md:py-10 pb-36 md:pb-52">
        <PageBackLink to="/marketplace" label="Back to marketplace" className="mb-3" />
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-black mb-1">My Orders</h1>
            <p className="text-sm text-gray-500">
              {loading
                ? 'Loading your orders…'
                : orders.length === 0
                  ? 'Track your fabric orders.'
                  : `${orders.length} order${orders.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <Link
            to="/marketplace"
            className="self-start sm:self-auto text-sm font-medium text-gray-600 hover:text-black transition-colors shrink-0"
          >
            Browse marketplace
          </Link>
        </div>

        {loading ? (
          <PageLoader label="Loading orders" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="Orders you place will appear here."
            actionLabel="Browse Marketplace"
            onAction={() => navigate('/marketplace')}
          />
        ) : (
          <div className="w-full flex flex-col gap-3">
            {orders.map((order) => {
              const first = order.items[0]
              const firstName = first?.productName || 'Fabric order'

              return (
                <ListRecordCard
                  key={order._id}
                  to={`/orders/${order._id}`}
                  image={first?.image}
                  imageAlt={firstName}
                  imageFallback={<Package size={22} />}
                  aside={
                    <>
                      <div className="sm:text-right">
                        <p className="font-semibold text-black text-lg md:text-xl leading-none">
                          ₹{formatNumber(order.totalAmount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Total</p>
                      </div>
                      <Link
                        to={`/orders/${order._id}`}
                        className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-black text-white text-xs font-medium hover:bg-gray-800"
                      >
                        View details
                        <ArrowRight size={13} />
                      </Link>
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
                    {firstName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1.5">
                    {order.items.length} item{order.items.length === 1 ? '' : 's'}
                    {formatOrderDate(order.createdAt)
                      ? ` · ${formatOrderDate(order.createdAt)}`
                      : ''}
                  </p>
                </ListRecordCard>
              )
            })}
          </div>
        )}
      </Container>
      </div>
      <Footer />
    </div>
  )
}

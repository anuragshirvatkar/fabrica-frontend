import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { SellerShell } from '../components/seller/SellerShell'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import {
  advanceOrder,
  downloadOrderInvoice,
  fetchOrder,
  rejectOrder,
  type ApiOrder,
} from '../lib/api'
import { formatNumber } from '../lib/format'
import { onOrderNotification } from '../lib/orderRealtime'
import { OrderProgressTrack } from '../components/orders/OrderProgressTrack'
import {
  canSellerAdvance,
  ORDER_STATUS_LABELS,
  SELLER_ACTION_LABELS,
  type OrderStatus,
} from '../lib/orderStatuses'

const LIVE_STATUSES = new Set<OrderStatus>([
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_DISPATCH',
])

export function SellerOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { getAccessToken } = useAuth()
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const load = async (options?: { silent?: boolean }) => {
    if (!id) return
    try {
      const token = await getAccessToken()
      if (!token) return
      const result = await fetchOrder(token, id)
      setOrder(result.order)
      setError('')
    } catch (err) {
      if (!options?.silent) {
        setError(err instanceof Error ? err.message : 'Failed to load order')
      }
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  useEffect(() => {
    if (!order) return
    if (!LIVE_STATUSES.has(order.status)) return

    const timer = window.setInterval(() => {
      void load({ silent: true })
    }, 3000)

    const stop = onOrderNotification((detail) => {
      const related =
        !detail.orderId ||
        String(detail.orderId) === String(id) ||
        detail.notifications?.some((item) => String(item.orderId || '') === String(id))
      if (related) void load({ silent: true })
    })

    return () => {
      window.clearInterval(timer)
      stop()
    }
  }, [order?.status, order?._id, id])

  return (
    <SellerShell>
      <main className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <Link to="/seller/orders" className="text-sm text-gray-600 hover:text-black">
          ← Back to orders
        </Link>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        {!order ? (
          <PageLoader label="Loading order" />
        ) : (
          <div className="mt-4 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="font-serif text-3xl font-semibold text-black">
                  Order #{String(order._id).slice(-6).toUpperCase()}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Status: {ORDER_STATUS_LABELS[order.status] || order.status} · ₹
                  {formatNumber(order.totalAmount)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {order.status === 'COMPLETED' && (
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={async () => {
                      setDownloading(true)
                      setError('')
                      try {
                        const token = await getAccessToken()
                        if (!token || !id) return
                        await downloadOrderInvoice(token, id)
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : 'Failed to download invoice',
                        )
                      } finally {
                        setDownloading(false)
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-[#f5f3ef] disabled:opacity-50"
                  >
                    <Download size={15} />
                    {downloading ? 'Downloading...' : 'Download sales invoice'}
                  </button>
                )}
                {order.status === 'PENDING' && (
                  <button
                    type="button"
                    disabled={busy || rejecting}
                    onClick={() => setRejectOpen(true)}
                    className="px-4 py-2.5 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject order
                  </button>
                )}
                {canSellerAdvance(order.status) && (
                  <button
                    type="button"
                    disabled={busy || rejecting}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        const token = await getAccessToken()
                        if (!token || !id) return
                        const result = await advanceOrder(token, id)
                        setOrder(result.order)
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Update failed')
                      } finally {
                        setBusy(false)
                      }
                    }}
                    className="btn-pill-black px-4 py-2.5 text-sm rounded-lg disabled:opacity-50"
                  >
                    {busy
                      ? 'Updating...'
                      : SELLER_ACTION_LABELS[order.status] || 'Advance status'}
                  </button>
                )}
              </div>
            </div>

            {order.status === 'CANCELLED' ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                This order was cancelled.
              </div>
            ) : (
              <OrderProgressTrack
                status={order.status}
                hint={
                  order.status === 'READY_FOR_DISPATCH'
                    ? 'This order will mark as completed automatically in about 1 minute.'
                    : undefined
                }
              />
            )}

            {order.status === 'COMPLETED' && order.paymentId && (
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Payment recorded</p>
                  <p className="text-xs text-emerald-800/80 mt-0.5">
                    A system payment for {order.shippingAddress.name} · ₹
                    {formatNumber(order.totalAmount)} was added automatically.
                  </p>
                </div>
                <Link
                  to={`/seller/payments/${order.paymentId}`}
                  className="text-sm font-medium text-emerald-900 underline shrink-0"
                >
                  Open payment details
                </Link>
              </section>
            )}

            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="font-serif text-xl font-semibold mb-3">Items</h2>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div
                    key={`${item.productId}_${item.variantId}_${item.colorHex}_${index}`}
                    className="flex gap-3"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#f5f3ef] shrink-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-black">{item.productName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.quantity} {item.unit}
                        {item.colorHex ? ` · ${item.colorHex}` : ''}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-black shrink-0">
                      ₹{formatNumber(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="font-serif text-xl font-semibold mb-3">Ship to</h2>
              <p className="text-sm text-black font-medium">{order.shippingAddress.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.addressLine2
                  ? `, ${order.shippingAddress.addressLine2}`
                  : ''}
              </p>
              <p className="text-sm text-gray-600">
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
              </p>
              <p className="text-sm text-gray-500 mt-1">{order.shippingAddress.phone}</p>
            </section>
          </div>
        )}
      </main>

      <ConfirmModal
        open={rejectOpen}
        onClose={() => !rejecting && setRejectOpen(false)}
        onConfirm={async () => {
          if (!id) return
          setRejecting(true)
          setError('')
          try {
            const token = await getAccessToken()
            if (!token) return
            const result = await rejectOrder(token, id)
            setOrder(result.order)
            setRejectOpen(false)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reject order')
          } finally {
            setRejecting(false)
          }
        }}
        title="Reject this order?"
        message="The buyer will be notified and stock will be restored. You can only reject before accepting."
        confirmLabel="Reject order"
        cancelLabel="Keep order"
        loading={rejecting}
        irreversible
      />
    </SellerShell>
  )
}

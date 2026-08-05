import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { SellerShell } from '../components/seller/SellerShell'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import { dispatchOrder, downloadOrderInvoice, fetchOrder, type ApiOrder } from '../lib/api'
import { formatNumber } from '../lib/format'
import { onOrderNotification } from '../lib/orderRealtime'

export function SellerOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { getAccessToken } = useAuth()
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)

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

  // Keep seller view live while order can still change (cancel / dispatch / deliver).
  useEffect(() => {
    if (!order) return
    if (order.status !== 'PLACED' && order.status !== 'DISPATCHED') return

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
                  Status: {order.status} · ₹{formatNumber(order.totalAmount)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {order.status === 'DELIVERED' && (
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
                {order.status === 'PLACED' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        const token = await getAccessToken()
                        if (!token || !id) return
                        const result = await dispatchOrder(token, id)
                        setOrder(result.order)
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Dispatch failed')
                      } finally {
                        setBusy(false)
                      }
                    }}
                    className="btn-pill-black px-4 py-2.5 text-sm rounded-lg disabled:opacity-50"
                  >
                    {busy ? 'Dispatching...' : 'Mark Dispatched'}
                  </button>
                )}
              </div>
            </div>

            {order.status === 'DELIVERED' && order.paymentId && (
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
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.productName}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {item.quantity} {item.unit}
                        </p>
                        {item.colorHex ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 bg-[#f5f3ef] border border-gray-200 rounded-full px-2 py-0.5">
                            <span
                              className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            Selected color {item.colorHex}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700">Color not recorded</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="font-serif text-xl font-semibold mb-3">Ship To</h2>
              <p className="text-sm font-medium">{order.shippingAddress.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                {order.shippingAddress.addressLine1}, {order.shippingAddress.city},{' '}
                {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p className="text-sm text-gray-500 mt-1">{order.shippingAddress.phone}</p>
            </section>
          </div>
        )}
      </main>
    </SellerShell>
  )
}

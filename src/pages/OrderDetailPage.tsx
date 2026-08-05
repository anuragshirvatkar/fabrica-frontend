import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Container } from '../components/container'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'
import { Download, Pencil, Trash2 } from 'lucide-react'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { PageBackLink } from '../components/ui/PageBackLink'
import { PageLoader } from '../components/ui/PageLoader'
import { ReviewModal } from '../components/reviews/ReviewModal'
import { StarRating } from '../components/reviews/StarRating'
import { useAuth } from '../context/AuthContext'
import {
  cancelOrder,
  createReview,
  deleteReview,
  downloadOrderInvoice,
  fetchMyReviews,
  fetchOrder,
  updateReview,
  type ApiOrder,
  type ApiReview,
} from '../lib/api'
import { formatNumber } from '../lib/format'

const steps = ['PLACED', 'DISPATCHED', 'DELIVERED'] as const

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [reviewsByProduct, setReviewsByProduct] = useState<Record<string, ApiReview>>({})
  const [reviewModal, setReviewModal] = useState<{
    productId: string
    productName: string
    existing?: ApiReview | null
  } | null>(null)
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ApiReview | null>(null)
  const [deleting, setDeleting] = useState(false)

  const productIds = useMemo(() => {
    if (!order) return [] as string[]
    return [...new Set(order.items.map((item) => String(item.productId)))]
  }, [order])

  const loadReviews = async (ids: string[]) => {
    if (!ids.length || user?.role !== 'BUYER') {
      setReviewsByProduct({})
      return
    }
    try {
      const token = await getAccessToken()
      if (!token) return
      const result = await fetchMyReviews(token, ids)
      const map: Record<string, ApiReview> = {}
      for (const review of result.reviews) {
        map[String(review.productId)] = review
      }
      setReviewsByProduct(map)
    } catch {
      // Keep order usable even if reviews fail to load.
    }
  }

  const load = async (options?: { silent?: boolean }) => {
    if (!id) return
    if (!options?.silent) setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        navigate('/login')
        return
      }
      const result = await fetchOrder(token, id)
      setOrder(result.order)
      if (result.order.status !== 'PLACED') {
        setCancelOpen(false)
      }
      if (result.order.status === 'DELIVERED') {
        const ids = [...new Set(result.order.items.map((item) => String(item.productId)))]
        await loadReviews(ids)
      } else {
        setReviewsByProduct({})
      }
    } catch (err) {
      if (!options?.silent) {
        setError(err instanceof Error ? err.message : 'Failed to load order')
      }
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  // Keep status fresh while the order can still change (cancel window + auto-deliver).
  useEffect(() => {
    if (!order) return
    if (order.status !== 'PLACED' && order.status !== 'DISPATCHED') return

    const timer = window.setInterval(() => {
      void load({ silent: true })
    }, 3000)

    const onNotification = (event: Event) => {
      const detail =
        (event as CustomEvent<{
          orderId?: string | null
          notifications?: Array<{ orderId?: string | null }>
        }>).detail || {}
      const related =
        !detail.orderId && !detail.notifications?.length
          ? true
          : String(detail.orderId || '') === String(id) ||
            Boolean(
              detail.notifications?.some((item) => String(item.orderId || '') === String(id)),
            )
      if (related) void load({ silent: true })
    }
    window.addEventListener('fabrica:notification', onNotification)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('fabrica:notification', onNotification)
    }
  }, [order?.status, order?._id, id])

  useEffect(() => {
    if (order?.status === 'DELIVERED' && productIds.length) {
      void loadReviews(productIds)
    }
  }, [order?.status, productIds.join(',')])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[#f9f9f9]">
        <Navbar variant="solid" showActions fixed={false} />
        <Container className="py-10">
          <PageBackLink to="/orders" label="Back to orders" className="mb-3" />
          <PageLoader label="Loading order" />
        </Container>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex-1 flex flex-col bg-[#f9f9f9]">
        <Navbar variant="solid" showActions fixed={false} />
        <Container className="py-10">
          <PageBackLink to="/orders" label="Back to orders" className="mb-3" />
          <p className="text-sm text-red-600">{error || 'Order not found'}</p>
        </Container>
      </div>
    )
  }

  const activeIndex =
    order.status === 'CANCELLED'
      ? -1
      : Math.max(
          0,
          steps.indexOf(order.status as (typeof steps)[number]),
        )

  const canReview = user?.role === 'BUYER' && order.status === 'DELIVERED'

  return (
    <div className="flex-1 flex flex-col bg-[#f9f9f9]">
      <div className="min-h-[calc(100dvh+14rem)] flex flex-col">
      <Navbar variant="solid" showActions fixed={false} />
      <Container className="flex-1 py-8 md:py-10 pb-36 md:pb-52">
        <PageBackLink to="/orders" label="Back to orders" className="mb-3" />
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-black">
              Order #{String(order._id).slice(-6).toUpperCase()}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Total ₹{formatNumber(order.totalAmount)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user?.role === 'BUYER' && order.status === 'DELIVERED' && (
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
                    setError(err instanceof Error ? err.message : 'Failed to download invoice')
                  } finally {
                    setDownloading(false)
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-[#f5f3ef] disabled:opacity-50"
              >
                <Download size={15} />
                <span className="sm:hidden">{downloading ? 'Downloading…' : 'Invoice'}</span>
                <span className="hidden sm:inline">
                  {downloading ? 'Downloading...' : 'Download purchase invoice'}
                </span>
              </button>
            )}
            {user?.role === 'BUYER' && order.status === 'PLACED' && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="px-4 py-2.5 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {order.status === 'CANCELLED' ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
            This order was cancelled.
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {steps.map((step, index) => (
                <div key={step} className="flex-1 flex items-center gap-3 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                      index <= activeIndex
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`text-sm truncate ${
                      index <= activeIndex ? 'text-black font-medium' : 'text-gray-400'
                    }`}
                  >
                    <span className="sm:hidden">
                      {step === 'PLACED' ? 'Placed' : step === 'DISPATCHED' ? 'Dispatched' : 'Delivered'}
                    </span>
                    <span className="hidden sm:inline">
                      {step === 'PLACED'
                        ? 'Order Placed'
                        : step === 'DISPATCHED'
                          ? 'Order Dispatched'
                          : 'Order Delivered'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            {order.status === 'DISPATCHED' && (
              <p className="text-xs text-gray-500 mt-4">
                Delivery confirmation will update automatically shortly after dispatch.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-serif text-xl font-semibold text-black mb-4">Items</h2>
            <div className="space-y-4">
              {order.items.map((item, index) => {
                const productId = String(item.productId)
                const existing = reviewsByProduct[productId]
                // One review per product — only show controls on the first line item for that product.
                const showReviewControls =
                  canReview &&
                  order.items.findIndex((row) => String(row.productId) === productId) === index
                return (
                  <div
                    key={`${item.productId}_${item.variantId}_${index}`}
                    className="flex gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#f5f3ef] shrink-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-black">{item.productName}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500">
                          {item.quantity} {item.unit}
                        </p>
                        {item.colorHex ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                            <span
                              className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            {item.colorHex}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold mt-1">
                        ₹{formatNumber(item.price * item.quantity)}
                      </p>

                      {showReviewControls && (
                        <div className="mt-3">
                          {existing ? (
                            <div className="rounded-lg border border-gray-100 bg-[#fafafa] p-3 min-w-0">
                              <div className="flex flex-col gap-3">
                                <div className="min-w-0">
                                  <StarRating value={existing.rating} readOnly size={14} />
                                  {existing.review ? (
                                    <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-wrap break-words">
                                      {existing.review}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-400 mt-1.5 italic">No message</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReviewError('')
                                      setReviewModal({
                                        productId,
                                        productName: item.productName,
                                        existing,
                                      })
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 min-h-9 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-white text-gray-700"
                                  >
                                    <Pencil size={12} />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(existing)}
                                    className="inline-flex items-center justify-center gap-1.5 min-h-9 px-3 py-1.5 text-xs font-medium rounded-md border border-red-100 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 size={12} />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewError('')
                                setReviewModal({
                                  productId,
                                  productName: item.productName,
                                  existing: null,
                                })
                              }}
                              className="mt-1 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-[#f5f3ef] text-black"
                            >
                              Write a review
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-serif text-xl font-semibold text-black mb-4">Shipping Address</h2>
            <p className="text-sm font-medium text-black">{order.shippingAddress.name}</p>
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
            <p className="text-sm text-gray-500 mt-2">{order.shippingAddress.phone}</p>
          </section>
        </div>
      </Container>
      </div>
      <Footer />

      <ConfirmModal
        open={cancelOpen}
        onClose={() => !cancelling && setCancelOpen(false)}
        onConfirm={async () => {
          setCancelling(true)
          try {
            const token = await getAccessToken()
            if (!token || !id) return
            const result = await cancelOrder(token, id)
            setOrder(result.order)
            setCancelOpen(false)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to cancel order')
          } finally {
            setCancelling(false)
          }
        }}
        title="Cancel this order?"
        message="You can only cancel before the seller dispatches the order. Stock will be restored."
        confirmLabel="Cancel order"
        loading={cancelling}
      />

      <ReviewModal
        open={Boolean(reviewModal)}
        onClose={() => !reviewSaving && setReviewModal(null)}
        productName={reviewModal?.productName || ''}
        initial={reviewModal?.existing}
        saving={reviewSaving}
        error={reviewError}
        onSubmit={async ({ rating, review }) => {
          if (!reviewModal) return
          setReviewSaving(true)
          setReviewError('')
          try {
            const token = await getAccessToken()
            if (!token) {
              navigate('/login')
              return
            }
            const result = reviewModal.existing
              ? await updateReview(token, reviewModal.existing._id, { rating, review })
              : await createReview(token, {
                  productId: reviewModal.productId,
                  rating,
                  review,
                })
            setReviewsByProduct((prev) => ({
              ...prev,
              [String(result.review.productId)]: result.review,
            }))
            setReviewModal(null)
          } catch (err) {
            setReviewError(err instanceof Error ? err.message : 'Failed to save review')
          } finally {
            setReviewSaving(false)
          }
        }}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleting(true)
          try {
            const token = await getAccessToken()
            if (!token) return
            await deleteReview(token, deleteTarget._id)
            setReviewsByProduct((prev) => {
              const next = { ...prev }
              delete next[String(deleteTarget.productId)]
              return next
            })
            setDeleteTarget(null)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete review')
            setDeleteTarget(null)
          } finally {
            setDeleting(false)
          }
        }}
        title="Delete this review?"
        message="Your rating and message will be removed. You can write a new review later."
        confirmLabel="Delete review"
        loading={deleting}
        irreversible
      />
    </div>
  )
}

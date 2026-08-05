import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { Container } from '../components/container'
import { Navbar } from '../components/navbar'
import { Footer } from '../components/footer'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { ConnectionErrorState } from '../components/ui/ConnectionErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { ListRecordCard } from '../components/ui/ListRecordCard'
import { PageBackLink } from '../components/ui/PageBackLink'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import { fetchCart, removeCartItem, updateCartItem } from '../lib/api'
import { getFriendlyErrorMessage, isConnectionError } from '../lib/errors'
import { formatNumber } from '../lib/format'

type CartItem = {
  _id: string
  quantity: number
  colorHex: string
  product: {
    _id: string
    name: string
    price: number
    unit: string
    moq: number
    image: string
  }
}

export function CartPage() {
  const { user, getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [connectionError, setConnectionError] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    setConnectionError(false)
    try {
      const token = await getAccessToken()
      if (!token) {
        navigate('/login')
        return
      }
      const result = await fetchCart(token)
      setItems((result.cart.items || []) as unknown as CartItem[])
    } catch (err) {
      setConnectionError(isConnectionError(err))
      setError(getFriendlyErrorMessage(err, 'Failed to load cart'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    void load()
  }, [user])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0),
    [items],
  )

  return (
    <div className="flex-1 flex flex-col bg-[#f9f9f9]">
      <div className="min-h-[calc(100dvh+14rem)] flex flex-col">
      <Navbar variant="solid" showActions fixed={false} />
      <Container className="flex-1 py-8 md:py-10 pb-36 md:pb-52">
        <PageBackLink to="/marketplace" label="Back to marketplace" className="mb-3" />
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-black mb-1">Your Cart</h1>
        <p className="text-sm text-gray-500 mb-6">Review items before checkout.</p>

        {loading ? (
          <PageLoader label="Loading cart" />
        ) : connectionError ? (
          <ConnectionErrorState onRetry={() => void load()} />
        ) : error ? (
          <EmptyState
            title="Couldn't load cart"
            description={error}
            actionLabel="Try again"
            onAction={() => void load()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Browse the marketplace and add fabrics to get started."
            actionLabel="Go to Marketplace"
            onAction={() => navigate('/marketplace')}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="w-full flex flex-col gap-3">
              {items.map((item) => (
                <ListRecordCard
                  key={item._id}
                  to={`/marketplace/${item.product._id}`}
                  image={item.product.image}
                  imageAlt={item.product.name}
                  imageFallback={<ShoppingCart size={22} />}
                  aside={
                    <>
                      <div className="sm:text-right">
                        <p className="font-semibold text-black text-lg md:text-xl leading-none">
                          ₹{formatNumber(Number(item.product.price) * item.quantity)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Line total</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteId(item._id)}
                        className="w-9 h-9 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-600 hover:border-red-200"
                        aria-label="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  }
                >
                  <Link
                    to={`/marketplace/${item.product._id}`}
                    className="font-serif text-base sm:text-lg md:text-xl font-semibold text-black leading-snug line-clamp-2 hover:underline"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1.5">
                    ₹{formatNumber(item.product.price)} / {item.product.unit}
                    {item.colorHex ? (
                      <span className="inline-flex items-center gap-1.5 ml-2">
                        ·
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-gray-200 inline-block"
                          style={{ backgroundColor: item.colorHex }}
                        />
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-xs text-gray-500">Qty</label>
                    <input
                      type="number"
                      min={item.product.moq || 1}
                      value={item.quantity}
                      onChange={(e) => {
                        const qty = Number(e.target.value) || item.product.moq || 1
                        setItems((prev) =>
                          prev.map((row) =>
                            row._id === item._id ? { ...row, quantity: qty } : row,
                          ),
                        )
                      }}
                      onBlur={async () => {
                        const token = await getAccessToken()
                        if (!token) return
                        await updateCartItem(token, item._id, item.quantity)
                      }}
                      className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg"
                    />
                  </div>
                </ListRecordCard>
              ))}
            </div>

            <aside className="rounded-2xl border border-gray-200 bg-white p-5 h-fit lg:sticky lg:top-6">
              <div className="flex justify-between text-sm mb-4">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-black">₹{formatNumber(total)}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="btn-pill-black w-full py-3 text-sm rounded-lg"
              >
                Proceed to Checkout
              </button>
            </aside>
          </div>
        )}
      </Container>

      {!loading && items.length > 0 && (
        <div className="lg:hidden sticky bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3">
          <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Subtotal</p>
              <p className="text-base font-semibold text-black">₹{formatNumber(total)}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="btn-pill-black px-5 py-3 text-sm rounded-lg shrink-0"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
      </div>

      <Footer />

      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => !deleting && setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return
          setDeleting(true)
          try {
            const token = await getAccessToken()
            if (!token) return
            await removeCartItem(token, deleteId)
            setDeleteId(null)
            await load()
          } finally {
            setDeleting(false)
          }
        }}
        title="Remove item?"
        message="This will remove the item from your cart."
        confirmLabel="Remove"
        loading={deleting}
        irreversible
      />
    </div>
  )
}

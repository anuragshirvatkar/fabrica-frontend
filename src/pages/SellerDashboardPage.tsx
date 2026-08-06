import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  CreditCard,
  FileText,
  IdCard,
  Mail,
  Package,
  Pencil,
  Phone,
  ShoppingBag,
  Store,
} from 'lucide-react'
import { SellerShell } from '../components/seller/SellerShell'
import { EmptyState } from '../components/ui/EmptyState'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import {
  fetchSellerDashboard,
  fetchSellerProfile,
  type SellerDashboard,
  type SellerDashboardRange,
  type SellerProfile,
} from '../lib/api'
import { formatNumber } from '../lib/format'

const RANGE_OPTIONS: Array<{ value: SellerDashboardRange; label: string }> = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
]

const statusLabel: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_DISPATCH: 'Ready for Dispatch',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

function getInitials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return 'S'
}

function getFirstName(companyName?: string | null, email?: string | null) {
  if (companyName?.trim()) return companyName.trim().split(/\s+/)[0]
  if (email) return email.split('@')[0]
  return 'Seller'
}

function statusStyles(status: string) {
  if (status === 'COMPLETED') return 'bg-emerald-50 text-emerald-700'
  if (status === 'READY_FOR_DISPATCH') return 'bg-indigo-50 text-indigo-700'
  if (status === 'PREPARING') return 'bg-sky-50 text-sky-700'
  if (status === 'ACCEPTED') return 'bg-violet-50 text-violet-700'
  if (status === 'CANCELLED') return 'bg-red-50 text-red-700'
  return 'bg-amber-50 text-amber-700'
}

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

export function SellerDashboardPage() {
  const navigate = useNavigate()
  const { user, getAccessToken } = useAuth()
  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [dashboard, setDashboard] = useState<SellerDashboard | null>(null)
  const [range, setRange] = useState<SellerDashboardRange>('week')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dashLoading, setDashLoading] = useState(true)
  const rangeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      try {
        const token = await getAccessToken()
        if (!token) return
        const profileResult = await fetchSellerProfile(token)
        setSeller(profileResult.seller)
      } catch {
        setSeller(null)
      } finally {
        setLoading(false)
      }
    }
    void loadProfile()
  }, [getAccessToken])

  useEffect(() => {
    const loadDashboard = async () => {
      setDashLoading(true)
      try {
        const token = await getAccessToken()
        if (!token) return
        const result = await fetchSellerDashboard(token, range)
        setDashboard(result.dashboard)
      } catch {
        setDashboard(null)
      } finally {
        setDashLoading(false)
      }
    }
    void loadDashboard()
  }, [getAccessToken, range])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!rangeRef.current?.contains(event.target as Node)) setRangeOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const series = dashboard?.series || []

  const chartPath = useMemo(() => {
    const width = 560
    const height = 180
    if (series.length === 0) {
      return { line: '', area: '', coords: [] as Array<{ x: number; y: number }>, width, height }
    }

    const values = series.map((p) => p.sales)
    const max = Math.max(...values, 1)
    const min = 0
    const rangeValue = max - min || 1

    const coords = series.map((point, index) => {
      const x = series.length === 1 ? width / 2 : (index / (series.length - 1)) * width
      const y = height - ((point.sales - min) / rangeValue) * (height - 24) - 12
      return { x, y }
    })

    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
    const area = `${line} L ${width} ${height} L 0 ${height} Z`
    return { line, area, coords, width, height }
  }, [series])

  const initials = getInitials(seller?.companyName, user?.email)
  const firstName = getFirstName(seller?.companyName, user?.email)
  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.value === range)?.label || dashboard?.label || 'This week'

  return (
    <SellerShell seller={seller}>
      <main className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl md:text-[34px] font-semibold text-black mb-1">
              Welcome back, {firstName}!
            </h1>
            <p className="text-sm text-gray-500">
              Here&apos;s what&apos;s happening with your store.
            </p>
          </div>

          <div className="relative self-start sm:self-auto" ref={rangeRef}>
            <button
              type="button"
              onClick={() => setRangeOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-[#f5f3ef] transition-colors"
            >
              <CalendarDays size={16} className="text-gray-500" />
              {rangeLabel}
              <ChevronDown size={15} className="text-gray-400" />
            </button>
            {rangeOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden z-20">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setRange(option.value)
                      setRangeOpen(false)
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                      range === option.value
                        ? 'bg-[#f5f3ef] text-black font-medium'
                        : 'text-gray-700 hover:bg-[#fafafa]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 mb-5">
          {loading ? (
            <PageLoader label="Loading profile" />
          ) : !seller ? (
            <EmptyState
              compact
              icon={Store}
              title="No seller profile found"
              description="Complete your business setup to see store details here."
              actionLabel="Go to Setup"
              onAction={() => navigate('/seller/setup')}
            />
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-start gap-5 md:gap-6 mb-5">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#ece8e3] flex items-center justify-center text-2xl font-semibold text-gray-800">
                    {initials}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center border-2 border-white">
                    <Store size={14} />
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h2 className="font-serif text-2xl font-semibold text-black">
                        {seller.companyName || 'Your Store'}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {seller.description?.trim() || 'Add a short tagline for your store.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/seller/profile')}
                      className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-[#f5f3ef] transition-colors"
                    >
                      <Pencil size={14} />
                      Edit Profile
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4 pt-4 border-t border-gray-100">
                <InfoRow icon={IdCard} label="GST Number" value={seller.gst || '—'} />
                <InfoRow icon={Phone} label="Phone Number" value={seller.phone || '—'} />
                <InfoRow icon={Mail} label="Account Email" value={user?.email || '—'} />
                <InfoRow
                  icon={FileText}
                  label="Business Description"
                  value={seller.description?.trim() || '—'}
                  className="sm:col-span-2 xl:col-span-3"
                />
              </div>
            </>
          )}
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <StatCard
            title="Total Sales"
            value={dashLoading ? '—' : `₹${formatNumber(dashboard?.totalSales || 0)}`}
            hint={rangeLabel}
            icon={CreditCard}
            tone="emerald"
          />
          <StatCard
            title="Orders"
            value={dashLoading ? '—' : formatNumber(dashboard?.orderCount || 0) || '0'}
            hint="Excluding cancelled"
            icon={ShoppingBag}
            tone="sky"
          />
          <StatCard
            title="Products"
            value={
              dashLoading
                ? '—'
                : formatNumber(dashboard?.totalProductCount || 0) || '0'
            }
            hint={
              dashLoading
                ? 'Total vs active'
                : `${formatNumber(dashboard?.publishedCount || 0) || '0'} active · ${formatNumber(dashboard?.draftCount || 0) || '0'} drafts`
            }
            icon={Package}
            tone="stone"
          />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 mb-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="font-serif text-xl font-semibold text-black">Sales Overview</h3>
              <span className="text-xs font-medium text-gray-500 px-2.5 py-1 rounded-full bg-[#f5f3ef]">
                {rangeLabel}
              </span>
            </div>

            {dashLoading ? (
              <PageLoader label="Loading sales" />
            ) : series.every((point) => point.sales === 0) ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-gray-500">
                No sales in this period yet.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartPath.width} ${chartPath.height + 28}`}
                  className="w-full min-w-0 sm:min-w-[480px] h-[200px] sm:h-[220px]"
                  role="img"
                  aria-label="Sales chart"
                >
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#111111" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#111111" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={chartPath.area} fill="url(#salesFill)" />
                  <path
                    d={chartPath.line}
                    fill="none"
                    stroke="#111111"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {chartPath.coords.map((point, index) => (
                    <circle
                      key={series[index]?.key || index}
                      cx={point.x}
                      cy={point.y}
                      r="3.5"
                      fill="#111111"
                    />
                  ))}
                  {series.map((point, index) => (
                    <text
                      key={point.key}
                      x={chartPath.coords[index]?.x || 0}
                      y={chartPath.height + 20}
                      textAnchor="middle"
                      className="fill-gray-400"
                      fontSize="11"
                    >
                      {point.label}
                    </text>
                  ))}
                </svg>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
              <MiniStat
                label="Total Sales"
                value={dashLoading ? '—' : `₹${formatNumber(dashboard?.totalSales || 0)}`}
              />
              <MiniStat
                label="Total Orders"
                value={dashLoading ? '—' : formatNumber(dashboard?.orderCount || 0) || '0'}
              />
              <MiniStat
                label="Avg. Order Value"
                value={dashLoading ? '—' : `₹${formatNumber(dashboard?.avgOrderValue || 0)}`}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div>
                <h3 className="font-serif text-xl font-semibold text-black">Needs action</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {dashLoading
                    ? 'Pending orders awaiting acceptance'
                    : `${formatNumber(dashboard?.pendingOrderCount || 0) || '0'} pending order${(dashboard?.pendingOrderCount || 0) === 1 ? '' : 's'}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/seller/orders')}
                className="text-sm font-medium text-gray-500 hover:text-black shrink-0"
              >
                View All
              </button>
            </div>

            {dashLoading ? (
              <PageLoader label="Loading pending" />
            ) : !dashboard?.pendingOrders?.length ? (
              <EmptyState
                compact
                icon={ShoppingBag}
                title="All clear"
                description="No pending orders waiting for acceptance."
              />
            ) : (
              <div className="space-y-1">
                {dashboard.pendingOrders.map((order) => (
                  <OrderRow
                    key={order._id}
                    order={order}
                    onClick={() => navigate(`/seller/orders/${order._id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div>
                <h3 className="font-serif text-xl font-semibold text-black">Inventory alerts</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {dashLoading
                    ? 'Low or out-of-stock published products'
                    : `${formatNumber(dashboard?.inventoryAlertCount || 0) || '0'} listing${(dashboard?.inventoryAlertCount || 0) === 1 ? '' : 's'} need attention`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/seller/products')}
                className="text-sm font-medium text-gray-500 hover:text-black shrink-0"
              >
                Products
              </button>
            </div>

            {dashLoading ? (
              <PageLoader label="Loading inventory" />
            ) : !dashboard?.inventoryAlerts?.length ? (
              <EmptyState
                compact
                icon={Package}
                title="Stock looks healthy"
                description="No published products are low or out of stock."
              />
            ) : (
              <div className="space-y-1">
                {dashboard.inventoryAlerts.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => navigate(`/seller/products/${item._id}/edit`)}
                    className="w-full flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0 text-left hover:bg-[#fafafa] rounded-lg px-1 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#f5f3ef] border border-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                      {item.previewImage ? (
                        <img
                          src={item.previewImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <AlertTriangle size={16} className="text-amber-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-black truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.availableQuantity <= 0
                          ? 'Out of stock'
                          : `${formatNumber(item.availableQuantity)} ${item.unit}${item.availableQuantity === 1 ? '' : 's'} left`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
                        item.level === 'out'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.level === 'out' ? 'Out' : 'Low'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl font-semibold text-black">Recent Orders</h3>
              <button
                type="button"
                onClick={() => navigate('/seller/orders')}
                className="text-sm font-medium text-gray-500 hover:text-black"
              >
                View All
              </button>
            </div>

            {dashLoading ? (
              <PageLoader label="Loading orders" />
            ) : !dashboard?.recentOrders?.length ? (
              <EmptyState
                compact
                icon={Package}
                title="No orders yet"
                description="New buyer orders for this period will show up here."
              />
            ) : (
              <div className="space-y-1">
                {dashboard.recentOrders.map((order) => (
                  <OrderRow
                    key={order._id}
                    order={order}
                    onClick={() => navigate(`/seller/orders/${order._id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

      </main>
    </SellerShell>
  )
}

function OrderRow({
  order,
  onClick,
}: {
  order: SellerDashboard['recentOrders'][number]
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0 text-left hover:bg-[#fafafa] rounded-lg px-1 transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-[#f5f3ef] border border-gray-100 overflow-hidden flex items-center justify-center shrink-0">
        {order.previewImage ? (
          <img src={order.previewImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <Package size={16} className="text-gray-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-black">
          #{String(order._id).slice(-6).toUpperCase()}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {order.productName}
          {formatOrderDate(order.createdAt) ? ` · ${formatOrderDate(order.createdAt)}` : ''}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-black mb-1">₹{formatNumber(order.totalAmount)}</p>
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyles(order.status)}`}
        >
          {statusLabel[order.status] || order.status}
        </span>
      </div>
    </button>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  className = '',
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`flex items-start gap-3 min-w-0 ${className}`}>
      <span className="mt-0.5 w-8 h-8 rounded-lg bg-[#f5f3ef] flex items-center justify-center shrink-0">
        <Icon size={15} className="text-gray-600" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm text-black font-medium break-words">{value}</p>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  title: string
  value: string
  hint: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  tone: 'emerald' | 'sky' | 'stone'
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    stone: 'bg-[#ece8e3] text-gray-700',
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-gray-500">{title}</p>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon size={17} />
        </span>
      </div>
      <p className="font-serif text-3xl font-semibold text-black mb-1">{value}</p>
      <p className="text-xs font-medium text-gray-500">{hint}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-black">{value}</p>
    </div>
  )
}

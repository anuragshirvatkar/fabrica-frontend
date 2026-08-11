import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  CreditCard,
  FileText,
  IdCard,
  Package,
  Pencil,
  Phone,
  Ruler,
  ShoppingBag,
  Store,
} from 'lucide-react'
import { SellerShell } from '../components/seller/SellerShell'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import {
  fetchSellerDashboard,
  fetchSellerProfile,
  fetchOrders,
  fetchSellerProducts,
  type ApiOrder,
  type SellerDashboard,
  type SellerDashboardRange,
  type SellerProfile,
} from '../lib/api'
import { formatNumber } from '../lib/format'
import type { ApiProduct } from '../lib/productDrafts'

const CATEGORY_CHART_COLORS = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#db2777', '#64748b']

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

function getRangeStart(range: SellerDashboardRange): Date | null {
  const now = new Date()
  if (range === 'all') return null
  if (range === 'week') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    return start
  }
  if (range === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return new Date(now.getFullYear(), 0, 1)
}

function orderFabricMeters(order: ApiOrder): number {
  return order.items.reduce((sum, item) => {
    const unit = (item.unit || 'meter').toLowerCase()
    if (unit.includes('meter') || unit === 'm' || unit === 'metre') {
      return sum + (item.quantity || 0)
    }
    return sum
  }, 0)
}

function filterOrdersByRange(orders: ApiOrder[], range: SellerDashboardRange) {
  const start = getRangeStart(range)
  return orders.filter((order) => {
    if (order.status === 'CANCELLED') return false
    if (!start) return true
    const raw = order.createdAt || order.updatedAt
    if (!raw) return false
    return new Date(raw) >= start
  })
}

function formatMeters(value: number) {
  return `${formatNumber(value)} meter${value === 1 ? '' : 's'}`
}

function groupProductsByCategory(products: ApiProduct[]) {
  const counts = new Map<string, number>()
  for (const product of products) {
    const label = product.category?.trim() || 'Uncategorized'
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  }
}

function describePieSlice(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  if (endAngle - startAngle >= 359.99) {
    return `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx - radius} ${cy} Z`
  }

  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

export function SellerDashboardPage() {
  const navigate = useNavigate()
  const { user, getAccessToken } = useAuth()
  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [dashboard, setDashboard] = useState<SellerDashboard | null>(null)
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [range, setRange] = useState<SellerDashboardRange>('week')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dashLoading, setDashLoading] = useState(true)
  const [descriptionOpen, setDescriptionOpen] = useState(false)
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
        const [result, ordersResult] = await Promise.all([
          fetchSellerDashboard(token, range),
          fetchOrders(token),
        ])
        setDashboard(result.dashboard)
        setOrders(Array.isArray(ordersResult.orders) ? ordersResult.orders : [])
      } catch {
        setDashboard(null)
        setOrders([])
      } finally {
        setDashLoading(false)
      }
    }
    void loadDashboard()
  }, [getAccessToken, range])

  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true)
      try {
        const token = await getAccessToken()
        if (!token) return
        const result = await fetchSellerProducts(token, 'published')
        setProducts(Array.isArray(result.products) ? result.products : [])
      } catch {
        setProducts([])
      } finally {
        setProductsLoading(false)
      }
    }
    void loadProducts()
  }, [getAccessToken])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!rangeRef.current?.contains(event.target as Node)) setRangeOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const series = dashboard?.series || []
  const ordersInRange = useMemo(() => filterOrdersByRange(orders, range), [orders, range])
  const fabricSoldTotal = useMemo(() => {
    if (typeof dashboard?.totalFabricSold === 'number') return dashboard.totalFabricSold
    return ordersInRange.reduce((sum, order) => sum + orderFabricMeters(order), 0)
  }, [dashboard?.totalFabricSold, ordersInRange])

  const categoryBreakdown = useMemo(() => groupProductsByCategory(products), [products])
  const listedProductCount =
    products.length > 0 ? products.length : dashboard?.publishedCount ?? 0

  const chartPath = useMemo(() => {
    const width = 560
    const height = 180
    if (series.length === 0) {
      return {
        line: '',
        area: '',
        coords: [] as Array<{ x: number; y: number; label: string; sales: number; key: string }>,
        width,
        height,
      }
    }

    const values = series.map((p) => p.sales)
    const max = Math.max(...values, 1)
    const min = 0
    const rangeValue = max - min || 1

    const coords = series.map((point, index) => {
      const x = series.length === 1 ? width / 2 : (index / (series.length - 1)) * width
      const y = height - ((point.sales - min) / rangeValue) * (height - 24) - 12
      return {
        x,
        y,
        label: point.label,
        sales: point.sales,
        key: point.key,
      }
    })

    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
    const area = `${line} L ${width} ${height} L 0 ${height} Z`
    return { line, area, coords, width, height }
  }, [series])

  const [salesHover, setSalesHover] = useState<number | null>(null)

  const initials = getInitials(seller?.companyName, user?.email)
  const firstName = getFirstName(seller?.companyName, user?.email)
  const storeDescription = seller?.description?.trim() || ''
  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.value === range)?.label || dashboard?.label || 'This week'

  return (
    <SellerShell seller={seller}>
      <main className="w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-black tracking-tight mb-1">
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
              <div className="absolute right-0 mt-2 w-44 max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden z-20">
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
              <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 md:w-[5.5rem] md:h-[5.5rem] rounded-full bg-[#ece8e3] flex items-center justify-center text-2xl font-semibold text-gray-800">
                    {initials}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center border-2 border-white">
                    <Store size={14} />
                  </span>
                </div>

                <div className="flex-1 min-w-0 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-serif text-2xl font-semibold text-black leading-tight">
                        {seller.companyName || 'Your Store'}
                      </h2>
                      <p className="text-sm text-gray-500 mt-2 break-all">{user?.email || '—'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/seller/profile')}
                      className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-[#f5f3ef] transition-colors shrink-0"
                    >
                      <Pencil size={14} />
                      Edit Profile
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 lg:gap-x-10 gap-y-5 pt-6 border-t border-gray-100">
                    <InfoRow icon={IdCard} label="GST Number" value={seller.gst || '—'} />
                    <InfoRow icon={Phone} label="Phone Number" value={seller.phone || '—'} />
                    <StoreDescriptionRow
                      description={storeDescription}
                      onView={() => setDescriptionOpen(true)}
                      className="md:col-span-2 lg:col-span-1"
                    />
                  </div>
                </div>
              </div>

              <Modal
                open={descriptionOpen}
                onClose={() => setDescriptionOpen(false)}
                title="Store Description"
                description={seller.companyName || 'Your Store'}
                maxWidthClassName="max-w-md"
              >
                <div className="px-5 md:px-7 py-5">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {storeDescription || 'No store description yet.'}
                  </p>
                </div>
              </Modal>
            </>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 sm:gap-4 mb-5 items-stretch">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 auto-rows-fr min-w-0">
            <MetricCard
              title="Total Sales"
              value={dashLoading ? '—' : `₹${formatNumber(dashboard?.totalSales || 0)}`}
              icon={CreditCard}
              tone="emerald"
            />
            <MetricCard
              title="Orders"
              value={dashLoading ? '—' : formatNumber(dashboard?.orderCount || 0) || '0'}
              icon={ShoppingBag}
              tone="sky"
            />
            <MetricCard
              title="Listed Products"
              value={
                dashLoading && productsLoading
                  ? '—'
                  : formatNumber(listedProductCount) || '0'
              }
              icon={Package}
              tone="amber"
            />
            <MetricCard
              title="Total Fabric Sold"
              value={dashLoading ? '—' : formatMeters(fabricSoldTotal)}
              icon={Ruler}
              tone="violet"
            />
          </div>

          <CategoryPieChart loading={productsLoading} data={categoryBreakdown} />
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
              <div
                className="relative w-full overflow-x-auto"
                onMouseLeave={() => setSalesHover(null)}
              >
                {salesHover !== null && chartPath.coords[salesHover] ? (
                  <div
                    className="pointer-events-none absolute z-20 top-0 max-w-[200px] rounded-lg bg-black px-2.5 py-1.5 text-white shadow-lg"
                    style={{
                      left: `${(chartPath.coords[salesHover].x / chartPath.width) * 100}%`,
                      transform: 'translate(-50%, 0)',
                    }}
                  >
                    <p className="text-[10px] text-white/70 leading-tight">
                      {chartPath.coords[salesHover].label}
                    </p>
                    <p className="text-[11px] font-semibold leading-tight mt-0.5">
                      ₹{formatNumber(chartPath.coords[salesHover].sales)}
                    </p>
                    <p className="text-[10px] text-white/80 leading-snug mt-0.5">
                      {chartPath.coords[salesHover].sales > 0
                        ? `Sales on ${chartPath.coords[salesHover].label}`
                        : `No sales on ${chartPath.coords[salesHover].label}`}
                    </p>
                  </div>
                ) : null}
                <svg
                  viewBox={`0 0 ${chartPath.width} ${chartPath.height + 28}`}
                  className="w-full min-w-0 h-[200px] sm:h-[220px]"
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
                    <g key={point.key}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={salesHover === index ? 5 : 3.5}
                        fill="#111111"
                      />
                      <rect
                        x={
                          point.x -
                          Math.max(chartPath.width / Math.max(chartPath.coords.length, 1) / 2, 14)
                        }
                        y={0}
                        width={Math.max(chartPath.width / Math.max(chartPath.coords.length, 1), 28)}
                        height={chartPath.height}
                        fill="transparent"
                        className="cursor-crosshair"
                        onMouseEnter={() => setSalesHover(index)}
                      />
                      <text
                        x={point.x}
                        y={chartPath.height + 20}
                        textAnchor="middle"
                        className="fill-gray-400"
                        fontSize="11"
                      >
                        {point.label}
                      </text>
                    </g>
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
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h3 className="font-serif text-xl font-semibold text-black">Needs Action</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {dashLoading
                    ? 'Pending orders awaiting acceptance'
                    : `${formatNumber(dashboard?.pendingOrderCount || 0) || '0'} pending order${(dashboard?.pendingOrderCount || 0) === 1 ? '' : 's'}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/seller/orders')}
                className="text-sm font-semibold text-black hover:opacity-70 shrink-0"
              >
                View All
              </button>
            </div>

            {dashLoading ? (
              <PageLoader label="Loading pending" />
            ) : !dashboard?.pendingOrders?.length ? (
              <div className="rounded-xl bg-[#f5f5f4] px-5 py-10 flex flex-col items-center text-center">
                <NeedsActionIllustration />
                <h4 className="font-serif text-lg font-semibold text-black mt-4 mb-1">All clear!</h4>
                <p className="text-sm text-gray-500 max-w-[220px]">
                  No pending orders waiting for acceptance.
                </p>
              </div>
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
            <div className="flex items-start justify-between mb-4 gap-3">
              <div>
                <h3 className="font-serif text-xl font-semibold text-black">Inventory Alerts</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {dashLoading
                    ? 'Low or out-of-stock published products'
                    : `${formatNumber(dashboard?.inventoryAlertCount || 0) || '0'} listing${(dashboard?.inventoryAlertCount || 0) === 1 ? '' : 's'} need attention`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/seller/products')}
                className="text-sm font-semibold text-black hover:opacity-70 shrink-0"
              >
                Products
              </button>
            </div>

            {dashLoading ? (
              <PageLoader label="Loading inventory" />
            ) : !dashboard?.inventoryAlerts?.length ? (
              <div className="rounded-xl bg-[#f5f5f4] px-4 py-5 sm:px-5 flex items-center gap-4 sm:gap-5">
                <FabricSwatchesIllustration />
                <div className="min-w-0 text-left">
                  <h4 className="font-serif text-lg font-semibold text-black mb-1">Great going!</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Your stock levels look good.
                    <br />
                    Keep up the great work.
                  </p>
                </div>
              </div>
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

function StoreDescriptionRow({
  description,
  onView,
  className = '',
}: {
  description: string
  onView: () => void
  className?: string
}) {
  const trimmed = description.trim()
  const textRef = useRef<HTMLParagraphElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const el = textRef.current
    if (!el) return

    const checkTruncation = () => {
      setIsTruncated(el.scrollWidth > el.clientWidth)
    }

    checkTruncation()
    window.addEventListener('resize', checkTruncation)
    return () => window.removeEventListener('resize', checkTruncation)
  }, [trimmed])

  return (
    <div className={`flex items-start gap-2.5 min-w-0 ${className}`}>
      <span className="mt-0.5 w-7 h-7 rounded-md bg-[#f5f3ef] flex items-center justify-center shrink-0">
        <FileText size={14} className="text-gray-600" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-500 mb-1">Business Description</p>
        <div className="flex items-center gap-2 min-w-0">
          <p ref={textRef} className="text-sm text-black font-medium truncate min-w-0 leading-snug">
            {trimmed || '—'}
          </p>
          {trimmed && isTruncated ? (
            <button
              type="button"
              onClick={onView}
              className="text-xs font-semibold text-black hover:opacity-70 shrink-0 underline underline-offset-2"
            >
              View
            </button>
          ) : null}
        </div>
      </div>
    </div>
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
    <div className={`flex items-start gap-2.5 min-w-0 ${className}`}>
      <span className="mt-0.5 w-7 h-7 rounded-md bg-[#f5f3ef] flex items-center justify-center shrink-0">
        <Icon size={14} className="text-gray-600" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 mb-1">{label}</p>
        <p className="text-sm text-black font-medium break-words leading-snug">{value}</p>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  tone: 'emerald' | 'sky' | 'amber' | 'violet'
}) {
  const iconTone = {
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 sm:px-5 sm:py-4 h-full flex flex-col justify-center">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">{title}</p>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconTone[tone]}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="font-serif text-2xl sm:text-[1.75rem] font-semibold text-black mt-1.5 leading-tight">
        {value}
      </p>
    </div>
  )
}

function CategoryPieChart({
  loading,
  data,
}: {
  loading: boolean
  data: Array<{ label: string; value: number }>
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const slices = useMemo(() => {
    if (total === 0) return []

    let cursor = 0
    return data.map((item, index) => {
      const sweep = (item.value / total) * 360
      const slice = {
        ...item,
        color: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length],
        startAngle: cursor,
        endAngle: cursor + sweep,
        percent: Math.round((item.value / total) * 1000) / 10,
      }
      cursor += sweep
      return slice
    })
  }, [data, total])

  return (
    <div className="h-full min-h-0 w-full lg:w-[20rem] xl:w-[22rem] rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 flex flex-col">
      <div className="mb-3 shrink-0">
        <h3 className="font-serif text-base font-semibold text-black leading-tight">
          Listed by Category
        </h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Published products in your catalog</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[180px]">
          <PageLoader label="Loading categories" />
        </div>
      ) : total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500 text-center px-4 min-h-[180px]">
          No published products yet.
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-4 min-h-0 py-1">
          <div className="relative shrink-0 size-[120px]">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 168 168"
              className="block"
              aria-label="Product categories pie chart"
            >
              {slices.map((slice) => (
                <path
                  key={slice.label}
                  d={describePieSlice(84, 84, 72, slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                />
              ))}
              <circle cx="84" cy="84" r="42" fill="white" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-serif font-semibold text-black leading-none">{total}</span>
              <span className="text-[10px] text-gray-500 mt-0.5">products</span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1.5">
            {slices.map((slice) => (
              <li
                key={slice.label}
                className="grid grid-cols-[auto_1fr_auto] items-start gap-x-2 text-[12px] leading-snug"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-gray-700 break-words">{slice.label}</span>
                <span className="text-black font-medium whitespace-nowrap tabular-nums text-right">
                  {slice.value}
                  <span className="text-gray-400 font-normal"> ({slice.percent}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
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

function NeedsActionIllustration() {
  return (
    <svg
      width="120"
      height="96"
      viewBox="0 0 120 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <ellipse cx="60" cy="86" rx="34" ry="5" fill="#e7e5e4" />
      <path
        d="M28 54c0-2 1.5-3.5 3.5-3.5h12c2.5 0 4.5 2.2 4.5 5v18c0 2-1.5 3.5-3.5 3.5h-13c-2 0-3.5-1.5-3.5-3.5V54z"
        fill="#166534"
        opacity="0.85"
      />
      <path
        d="M34 42c-1 6 2 12 6 14 1-5-1-11-6-14zM40 38c2 7 7 12 12 13-2-6-6-11-12-13zM36 48c3 5 8 8 13 8-4-4-8-8-13-8z"
        fill="#22c55e"
      />
      <circle cx="88" cy="28" r="1.5" fill="#a8a29e" />
      <circle cx="96" cy="36" r="1" fill="#a8a29e" />
      <circle cx="24" cy="32" r="1.2" fill="#a8a29e" />
      <path
        d="M38 40h44c3 0 5.5 2.5 5.5 5.5V72c0 2-1.5 3.5-3.5 3.5H36c-2 0-3.5-1.5-3.5-3.5V45.5C32.5 42.5 35 40 38 40z"
        fill="#1c1917"
      />
      <path d="M36 48h48v4H36z" fill="#292524" />
      <rect x="48" y="22" width="28" height="36" rx="3" fill="#fafaf9" stroke="#d6d3d1" />
      <rect x="52" y="28" width="20" height="2.5" rx="1" fill="#a8a29e" />
      <rect x="52" y="34" width="16" height="2" rx="1" fill="#d6d3d1" />
      <rect x="52" y="39" width="18" height="2" rx="1" fill="#d6d3d1" />
      <rect x="52" y="44" width="12" height="2" rx="1" fill="#d6d3d1" />
      <circle cx="62" cy="20" r="3" fill="#78716c" />
      <path d="M59 20h6" stroke="#fafaf9" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function FabricSwatchesIllustration() {
  return (
    <svg
      width="96"
      height="72"
      viewBox="0 0 96 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0 w-20 h-16 sm:w-24 sm:h-[72px]"
    >
      <rect x="8" y="10" width="28" height="48" rx="3" fill="#f5f0e8" stroke="#e7e0d4" />
      <path d="M12 18h20M12 24h16M12 30h18" stroke="#e4d9c8" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="26" y="14" width="28" height="48" rx="3" fill="#d6c4a8" stroke="#c4ad8c" />
      <path
        d="M30 22c4 2 8 2 12 0M30 28c4 2 8 2 12 0M30 34c4 2 8 2 12 0M30 40c4 2 8 2 12 0"
        stroke="#c4ad8c"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <rect x="44" y="8" width="28" height="48" rx="3" fill="#b08968" stroke="#9a7354" />
      <path
        d="M48 18h20M48 26h16M48 34h18M48 42h14"
        stroke="#9a7354"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <rect x="60" y="16" width="28" height="48" rx="3" fill="#292524" stroke="#1c1917" />
      <path
        d="M64 26c5 1.5 10 1.5 15 0M64 34c5 1.5 10 1.5 15 0M64 42c5 1.5 10 1.5 15 0"
        stroke="#44403c"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

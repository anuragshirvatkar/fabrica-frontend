import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CreditCard, Download } from 'lucide-react'
import { SellerShell } from '../components/seller/SellerShell'
import { EmptyState } from '../components/ui/EmptyState'
import { ListRecordCard } from '../components/ui/ListRecordCard'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import {
  downloadPaymentSalesInvoice,
  fetchSellerPayments,
  type ApiPayment,
} from '../lib/api'
import { formatNumber } from '../lib/format'

function formatDate(value?: string) {
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

export function SellerPaymentsPage() {
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [payments, setPayments] = useState<ApiPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const token = await getAccessToken()
        if (!token) return
        const result = await fetchSellerPayments(token)
        setPayments(result.payments)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payments')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [getAccessToken])

  return (
    <SellerShell>
      <main className="w-full min-w-0">
        <div className="mb-6">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-black tracking-tight mb-1">
            Payments
          </h1>
          <p className="text-sm text-gray-500">
            Keep track of payment records for your orders.
          </p>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {loading ? (
          <PageLoader label="Loading payments" />
        ) : payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments yet"
            description="When an order is delivered, a payment record with the buyer name and amount appears here."
          />
        ) : (
          <div className="w-full flex flex-col gap-3">
            {payments.map((payment) => (
              <ListRecordCard
                key={payment._id}
                to={`/seller/payments/${payment._id}`}
                imageFallback={<CreditCard size={22} />}
                aside={
                  <>
                    <div className="sm:text-right">
                      <p className="font-semibold text-black text-lg md:text-xl leading-none">
                        ₹{formatNumber(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Amount</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={downloadingId === payment._id}
                        onClick={async (event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setDownloadingId(payment._id)
                          setError('')
                          try {
                            const token = await getAccessToken()
                            if (!token) return
                            await downloadPaymentSalesInvoice(token, payment._id)
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : 'Failed to download invoice',
                            )
                          } finally {
                            setDownloadingId(null)
                          }
                        }}
                        className="inline-flex items-center gap-1 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-white disabled:opacity-50"
                      >
                        <Download size={13} />
                        <span className="sm:hidden">
                          {downloadingId === payment._id ? '...' : 'Invoice'}
                        </span>
                        <span className="hidden sm:inline">
                          {downloadingId === payment._id ? '...' : 'Download invoice'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/seller/payments/${payment._id}`)}
                        className="inline-flex items-center gap-1 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg bg-black text-white text-xs font-medium hover:bg-gray-800"
                      >
                        View
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </>
                }
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">
                  {payment.reference}
                </p>
                <h3 className="font-serif text-base sm:text-lg md:text-xl font-semibold text-black leading-snug line-clamp-2">
                  {payment.payerName}
                </h3>
                <p className="text-sm text-gray-500 mt-1.5">
                  {formatDate(payment.createdAt) || 'Payment record'}
                </p>
              </ListRecordCard>
            ))}
          </div>
        )}
      </main>
    </SellerShell>
  )
}

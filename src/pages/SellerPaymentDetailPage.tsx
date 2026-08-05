import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CreditCard, Download } from 'lucide-react'
import { SellerShell } from '../components/seller/SellerShell'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import { downloadPaymentSalesInvoice, fetchSellerPayment, type ApiPayment } from '../lib/api'
import { formatNumber } from '../lib/format'

function formatDateTime(value?: string) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function SellerPaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { getAccessToken } = useAuth()
  const [payment, setPayment] = useState<ApiPayment | null>(null)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      setError('')
      try {
        const token = await getAccessToken()
        if (!token) return
        const result = await fetchSellerPayment(token, id)
        setPayment(result.payment)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id, getAccessToken])

  return (
    <SellerShell>
      <main className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <Link to="/seller/payments" className="text-sm text-gray-600 hover:text-black">
          ← Back to payments
        </Link>

        {loading ? (
          <PageLoader label="Loading payment" />
        ) : error || !payment ? (
          <p className="text-sm text-red-600 mt-6">{error || 'Payment not found'}</p>
        ) : (
          <div className="mt-4 max-w-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#ece8e3] flex items-center justify-center shrink-0">
                  <CreditCard size={20} className="text-gray-700" />
                </div>
                <div>
                  <h1 className="font-serif text-3xl font-semibold text-black">
                    ₹{formatNumber(payment.amount)}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    System payment · {payment.status}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true)
                  setDownloadError('')
                  try {
                    const token = await getAccessToken()
                    if (!token || !id) return
                    await downloadPaymentSalesInvoice(token, id)
                  } catch (err) {
                    setDownloadError(
                      err instanceof Error ? err.message : 'Failed to download invoice',
                    )
                  } finally {
                    setDownloading(false)
                  }
                }}
                className="btn-pill-black px-4 py-2.5 text-sm rounded-lg disabled:opacity-50 self-start"
              >
                <Download size={15} />
                {downloading ? 'Downloading...' : 'Download purchase invoice'}
              </button>
            </div>

            {downloadError && <p className="text-sm text-red-600">{downloadError}</p>}

            <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 space-y-4">
              <Row label="Payer name" value={payment.payerName} />
              <Row label="Amount" value={`₹${formatNumber(payment.amount)}`} />
              <Row label="Reference" value={payment.reference} />
              <Row label="Source" value="System generated" />
              <Row label="Recorded at" value={formatDateTime(payment.createdAt)} />
              {payment.note ? <Row label="Note" value={payment.note} /> : null}
            </section>

            <Link
              to={`/seller/orders/${payment.orderId}`}
              className="inline-flex text-sm font-medium text-black underline"
            >
              View related order
            </Link>
          </div>
        )}
      </main>
    </SellerShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 py-2 border-b border-gray-100 last:border-b-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-medium text-black sm:text-right break-words">{value}</p>
    </div>
  )
}

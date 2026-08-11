import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Pencil, Trash2 } from 'lucide-react'
import { SellerShell } from '../components/seller/SellerShell'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { EmptyState } from '../components/ui/EmptyState'
import { PageLoader } from '../components/ui/PageLoader'
import { useAuth } from '../context/AuthContext'
import { deleteSellerProduct, fetchSellerProducts } from '../lib/api'
import { apiProductToForm, type ProductFormDraft } from '../lib/productDrafts'

export function SellerDraftsPage() {
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const [drafts, setDrafts] = useState<ProductFormDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Please sign in again.')
      const result = await fetchSellerProducts(token, 'draft')
      setDrafts(result.products.map(apiProductToForm))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts.')
      setDrafts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [getAccessToken])

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Please sign in again.')
      await deleteSellerProduct(token, deleteId)
      setDeleteId(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <SellerShell>
      <main className="w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-black tracking-tight mb-1">
              Drafts
            </h1>
            <p className="text-sm text-gray-500">
              Continue unfinished product listings saved automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/seller/products/new')}
            className="btn-pill-black px-5 py-2.5 text-sm self-start sm:self-auto"
          >
            Add Product
          </button>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {loading ? (
          <PageLoader label="Loading drafts" />
        ) : drafts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No drafts saved"
            description="When you leave the add-product flow without publishing, your progress is saved here."
            actionLabel="Add Product"
            onAction={() => navigate('/seller/products/new')}
          />
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => {
              const cover =
                draft.variants.find((variant) => variant.images.length > 0)?.images[0] || null
              return (
                <div
                  key={draft.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="w-full sm:w-24 h-24 rounded-xl bg-[#f5f3ef] overflow-hidden shrink-0">
                    {cover ? (
                      <img src={cover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FileText size={22} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="font-serif text-lg font-semibold text-black truncate">
                      {draft.name.trim() || 'Untitled draft'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {draft.category || 'No category'} · Step {draft.step} of 3
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Updated {new Date(draft.updatedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/seller/products/new?draft=${draft.id}`)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-[#f5f3ef]"
                    >
                      <Pencil size={14} />
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(draft.id)}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      aria-label="Delete draft"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => {
          if (!deleting) setDeleteId(null)
        }}
        onConfirm={() => {
          void confirmDelete()
        }}
        title="Delete draft?"
        message="This will permanently remove this unfinished product draft."
        confirmLabel="Delete Draft"
        loading={deleting}
        irreversible
      />
    </SellerShell>
  )
}

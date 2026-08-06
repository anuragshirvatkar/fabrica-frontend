export const ORDER_FLOW = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_DISPATCH',
  'COMPLETED',
] as const

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_DISPATCH'
  | 'COMPLETED'
  | 'CANCELLED'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_DISPATCH: 'Ready for Dispatch',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-100',
  ACCEPTED: 'bg-violet-50 text-violet-800 border-violet-100',
  PREPARING: 'bg-sky-50 text-sky-800 border-sky-100',
  READY_FOR_DISPATCH: 'bg-indigo-50 text-indigo-800 border-indigo-100',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  CANCELLED: 'bg-red-50 text-red-800 border-red-100',
}

/** Seller buttons only — Completed is auto after Ready for Dispatch. */
export const SELLER_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  PENDING: 'Accept order',
  ACCEPTED: 'Mark Order Prepared',
  PREPARING: 'Mark ready for dispatch',
}

export function canSellerAdvance(status: OrderStatus) {
  return Boolean(SELLER_ACTION_LABELS[status])
}

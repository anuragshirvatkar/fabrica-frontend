export type FabricaNotificationDetail = {
  orderId?: string | null
  type?: string
  notifications?: Array<{
    _id: string
    orderId?: string | null
    type?: string
    link?: string
  }>
}

/** Broadcast that order-related data may have changed. */
export function emitOrderNotification(detail: FabricaNotificationDetail = {}) {
  window.dispatchEvent(new CustomEvent('fabrica:notification', { detail }))
}

/** Subscribe to order notification broadcasts. */
export function onOrderNotification(handler: (detail: FabricaNotificationDetail) => void) {
  const listener = (event: Event) => {
    const custom = event as CustomEvent<FabricaNotificationDetail>
    handler(custom.detail || {})
  }
  window.addEventListener('fabrica:notification', listener)
  return () => window.removeEventListener('fabrica:notification', listener)
}

export function isOrderStatusNotification(type?: string) {
  if (!type) return true
  return (
    type.startsWith('ORDER_') ||
    type === 'ORDER_PLACED' ||
    type === 'ORDER_DISPATCHED' ||
    type === 'ORDER_DELIVERED' ||
    type === 'ORDER_CANCELLED'
  )
}

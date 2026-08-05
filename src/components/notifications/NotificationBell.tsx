import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from '../../lib/api'
import { playNotificationSound } from '../../lib/notificationSound'
import { emitOrderNotification } from '../../lib/orderRealtime'

export function NotificationBell({
  className = '',
}: {
  className?: string
}) {
  const { user, getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ApiNotification[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const knownIdsRef = useRef<Set<string> | null>(null)

  const load = async (options?: { silent?: boolean; broadcast?: boolean }) => {
    if (!user) return
    try {
      const token = await getAccessToken()
      if (!token) return
      const result = await fetchNotifications(token)
      const nextIds = new Set(result.notifications.map((item) => item._id))
      const known = knownIdsRef.current
      const arrived = known
        ? result.notifications.filter((item) => !known.has(item._id))
        : []
      const freshUnread = arrived.filter((item) => !item.read)

      if (!options?.silent && freshUnread.length) {
        playNotificationSound()
      }

      // Tell open order pages to refresh when any new alert arrives (even if
      // another tab already marked it read).
      if (options?.broadcast !== false && known && arrived.length) {
        emitOrderNotification({
          notifications: arrived.map((item) => ({
            _id: item._id,
            orderId: item.orderId,
            type: item.type,
            link: item.link,
          })),
        })
      }

      knownIdsRef.current = nextIds
      setItems(result.notifications)
      setUnread(result.unreadCount)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    knownIdsRef.current = null
    void load({ silent: true, broadcast: false })
    const timer = window.setInterval(() => {
      void load({ broadcast: true })
    }, 8000)
    const onRefresh = () => {
      void load({ silent: true, broadcast: false })
    }
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FABRICA_PLAY_NOTIFICATION_SOUND') {
        playNotificationSound()
        void load({ silent: true, broadcast: true })
      }
    }
    window.addEventListener('fabrica:notification-bell-refresh', onRefresh)
    navigator.serviceWorker?.addEventListener('message', onSwMessage)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('fabrica:notification-bell-refresh', onRefresh)
      navigator.serviceWorker?.removeEventListener('message', onSwMessage)
    }
  }, [user])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          const nextOpen = !open
          setOpen(nextOpen)
          void (async () => {
            if (nextOpen && unread > 0) {
              try {
                const token = await getAccessToken()
                if (token) {
                  await markAllNotificationsRead(token)
                  setUnread(0)
                  setItems((prev) => prev.map((item) => ({ ...item, read: true })))
                }
              } catch {
                // ignore
              }
            }
            await load({ silent: true, broadcast: false })
          })()
        }}
        className={`relative p-2 rounded-full transition-colors ${className}`}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-black text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] max-h-[min(24rem,70dvh)] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-black">Notifications</p>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500">No notifications yet.</p>
          ) : (
            <div className="py-1">
              {items.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={async () => {
                    const token = await getAccessToken()
                    if (token && !item.read) {
                      await markNotificationRead(token, item._id)
                    }
                    setOpen(false)
                    const link =
                      item.link ||
                      (user.role === 'SELLER'
                        ? item.orderId
                          ? `/seller/orders/${item.orderId}`
                          : '/seller/orders'
                        : item.orderId
                          ? `/orders/${item.orderId}`
                          : '/orders')
                    navigate(link)
                    void load()
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-[#f5f3ef] ${
                    item.read ? '' : 'bg-[#fafafa]'
                  }`}
                >
                  <p className="text-sm font-medium text-black">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.body}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

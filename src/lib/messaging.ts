import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'
import { initializeApp, getApps } from 'firebase/app'
import { saveFcmToken } from './api'
import { playNotificationSound } from './notificationSound'
import { emitOrderNotification } from './orderRealtime'

let foregroundListenerAttached = false

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export async function registerPushNotifications(authToken: string) {
  try {
    const supported = await isSupported()
    if (!supported) return null

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const messaging = getMessaging(app)
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    if (!vapidKey) return null

    const fcmToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
      ),
    })

    if (fcmToken) {
      await saveFcmToken(authToken, fcmToken)
    }

    if (!foregroundListenerAttached) {
      foregroundListenerAttached = true
      onMessage(messaging, (payload) => {
        playNotificationSound()
        const title = payload.notification?.title || 'Fabrica'
        const body = payload.notification?.body || ''
        if (Notification.permission === 'granted' && body) {
          const notification = new Notification(title, {
            body,
            data: payload.data,
            silent: true,
          })
          notification.onclick = () => {
            const link = payload.data?.link || '/'
            window.focus()
            window.location.href = link
          }
        }
        emitOrderNotification({
          orderId: payload.data?.orderId || null,
          type: payload.data?.type,
        })
        window.dispatchEvent(new CustomEvent('fabrica:notification-bell-refresh'))
      })
    }

    return fcmToken
  } catch (error) {
    // Common on localhost / without a working push service — non-fatal.
    console.warn('[fcm] register skipped', error instanceof Error ? error.message : error)
    return null
  }
}

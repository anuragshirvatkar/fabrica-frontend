/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyC7791KcXJLyxAS4fbXsRNPGWIZBpsPXNg',
  authDomain: 'fabrica-1e64e.firebaseapp.com',
  projectId: 'fabrica-1e64e',
  storageBucket: 'fabrica-1e64e.firebasestorage.app',
  messagingSenderId: '652244284185',
  appId: '1:652244284185:web:8c6940ad5b810d3b014b88',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Fabrica'
  const options = {
    body: payload.notification?.body || '',
    data: payload.data || {},
    silent: true,
  }

  // Ask any open tabs to play the shared notification sound.
  eventWaitPlaySound()

  self.registration.showNotification(title, options)
})

function eventWaitPlaySound() {
  self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      for (const client of clientList) {
        client.postMessage({ type: 'FABRICA_PLAY_NOTIFICATION_SOUND' })
      }
    })
    .catch(() => {})
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification?.data?.link || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(link)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(link)
    }),
  )
})

const SOUND_URL = '/notification-sound.wav'

let lastPlayedAt = 0
let audio: HTMLAudioElement | null = null

function getAudio() {
  if (typeof window === 'undefined') return null
  if (!audio) {
    audio = new Audio(SOUND_URL)
    audio.preload = 'auto'
  }
  return audio
}

/** Play the shared notification sound (debounced to avoid double-fires). */
export function playNotificationSound() {
  const now = Date.now()
  if (now - lastPlayedAt < 800) return
  lastPlayedAt = now

  try {
    const el = getAudio()
    if (!el) return
    el.currentTime = 0
    void el.play().catch(() => {
      // Autoplay may be blocked until a user gesture; ignore.
    })
  } catch {
    // ignore
  }
}

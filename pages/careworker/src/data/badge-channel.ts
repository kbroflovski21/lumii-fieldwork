export type BadgeState = 'disconnected' | 'connected_idle' | 'connected_recording'

export interface BadgeEvent {
  type: 'badge_state' | 'badge_heartbeat' | 'badge_button_press'
  state: BadgeState
  timestamp: number
  recordingStartTime?: number
}

const CHANNEL_NAME = 'golden-years-badge'

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel {
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

export function sendBadgeEvent(event: BadgeEvent) {
  getChannel().postMessage(event)
}

export function onBadgeEvent(handler: (event: BadgeEvent) => void): () => void {
  const ch = getChannel()
  const listener = (e: MessageEvent<BadgeEvent>) => handler(e.data)
  ch.addEventListener('message', listener)
  return () => ch.removeEventListener('message', listener)
}

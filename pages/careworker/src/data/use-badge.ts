import { useState, useEffect, useRef } from 'react'
import { onBadgeEvent } from './badge-channel'
import type { BadgeState, BadgeEvent } from './badge-channel'

export type ServicePhase = 'none' | 'pre_service' | 'active' | 'post_service'

export interface BadgeInfo {
  badgeState: BadgeState
  servicePhase: ServicePhase
  recordingStartTime: number | null
  recordingEndTime: number | null
}

const POST_SERVICE_WINDOW = 30 * 60 * 1000

export function useBadge(): BadgeInfo {
  const [badgeState, setBadgeState] = useState<BadgeState>('disconnected')
  const [servicePhase, setServicePhase] = useState<ServicePhase>('none')
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [recordingEndTime, setRecordingEndTime] = useState<number | null>(null)
  const lastHeartbeat = useRef<number>(0)
  const disconnectTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const unsubscribe = onBadgeEvent((event: BadgeEvent) => {
      lastHeartbeat.current = Date.now()

      if (disconnectTimer.current) clearTimeout(disconnectTimer.current)
      disconnectTimer.current = setTimeout(() => {
        setBadgeState('disconnected')
        if (servicePhase === 'active') {
          setServicePhase('post_service')
          setRecordingEndTime(Date.now())
        }
      }, 5000)

      if (event.type === 'badge_state' || event.type === 'badge_heartbeat') {
        setBadgeState(event.state)
        if (event.state === 'disconnected') {
          if (servicePhase === 'active') {
            setServicePhase('post_service')
            setRecordingEndTime(Date.now())
          }
        }
      }

      if (event.type === 'badge_button_press') {
        setBadgeState(event.state)
        if (event.state === 'connected_recording') {
          setServicePhase('active')
          setRecordingStartTime(event.recordingStartTime || Date.now())
          setRecordingEndTime(null)
        } else if (event.state === 'connected_idle') {
          setServicePhase('post_service')
          setRecordingEndTime(Date.now())
        }
      }
    })

    return () => {
      unsubscribe()
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current)
    }
  }, [servicePhase])

  useEffect(() => {
    if (servicePhase !== 'post_service' || !recordingEndTime) return
    const remaining = POST_SERVICE_WINDOW - (Date.now() - recordingEndTime)
    if (remaining <= 0) {
      setServicePhase('none')
      return
    }
    const timer = setTimeout(() => setServicePhase('none'), remaining)
    return () => clearTimeout(timer)
  }, [servicePhase, recordingEndTime])

  return { badgeState, servicePhase, recordingStartTime, recordingEndTime }
}

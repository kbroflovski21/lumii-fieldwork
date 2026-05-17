import { useState, useEffect, useRef } from 'react'
import { sendBadgeEvent } from '../data/badge-channel'
import type { BadgeState } from '../data/badge-channel'

export function HardwareSimulator() {
  const [state, setState] = useState<BadgeState>('connected_idle')
  const [recordingStart, setRecordingStart] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    sendBadgeEvent({ type: 'badge_state', state: 'connected_idle', timestamp: Date.now() })

    heartbeatRef.current = setInterval(() => {
      sendBadgeEvent({ type: 'badge_heartbeat', state, timestamp: Date.now() })
    }, 2000)

    return () => {
      clearInterval(heartbeatRef.current)
      sendBadgeEvent({ type: 'badge_state', state: 'disconnected', timestamp: Date.now() })
    }
  }, [])

  useEffect(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    heartbeatRef.current = setInterval(() => {
      sendBadgeEvent({ type: 'badge_heartbeat', state, timestamp: Date.now() })
    }, 2000)
  }, [state])

  useEffect(() => {
    if (state !== 'connected_recording' || !recordingStart) return
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - recordingStart) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [state, recordingStart])

  const handlePress = () => {
    if (state === 'connected_idle') {
      const now = Date.now()
      setState('connected_recording')
      setRecordingStart(now)
      setElapsed(0)
      sendBadgeEvent({ type: 'badge_button_press', state: 'connected_recording', timestamp: now, recordingStartTime: now })
    } else if (state === 'connected_recording') {
      setState('connected_idle')
      setRecordingStart(null)
      setElapsed(0)
      sendBadgeEvent({ type: 'badge_button_press', state: 'connected_idle', timestamp: Date.now() })
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const isRecording = state === 'connected_recording'

  return (
    <div className="flex flex-col items-center justify-center bg-[#191C1E]" style={{ height: 'var(--app-height)' }}>
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-[18px] font-bold text-white/90">智能工牌模拟器</h1>
        <p className="text-[12px] text-white/40 mt-1">模拟物理工牌的单按钮操作</p>
      </div>

      {/* Status display */}
      <div className="text-center mb-8">
        <div className={`text-[13px] font-medium ${isRecording ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
          {isRecording ? '● 录音中' : '● 待命'}
        </div>
        {isRecording && (
          <div className="text-[32px] font-mono font-bold text-white/90 mt-2">
            {formatTime(elapsed)}
          </div>
        )}
      </div>

      {/* Big button */}
      <button
        onClick={handlePress}
        className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
          isRecording
            ? 'bg-[#EF4444] shadow-[0_0_60px_rgba(239,68,68,0.4)]'
            : 'bg-[#374151] shadow-[0_0_40px_rgba(255,255,255,0.06)] hover:bg-[#4B5563]'
        }`}
      >
        <div className="text-center">
          {isRecording ? (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" fill="white" />
            </svg>
          )}
          <div className="text-[11px] text-white/80 font-medium mt-1">
            {isRecording ? '结束服务' : '开始服务'}
          </div>
        </div>
      </button>

      {/* Instructions */}
      <div className="mt-10 text-center px-8">
        <p className="text-[11px] text-white/30 leading-relaxed">
          {isRecording
            ? '服务录音中，再次按下按钮结束服务'
            : '按下按钮开始服务录音'
          }
        </p>
        <p className="text-[11px] text-white/20 mt-3">
          请在另一个标签页打开护理人员页面观察状态变化
        </p>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import type { BadgeState } from '../data/badge-channel'

interface Props {
  badgeState: BadgeState
  recordingStartTime: number | null
}

export function BadgeChip({ badgeState, recordingStartTime }: Props) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (badgeState !== 'connected_recording' || !recordingStartTime) {
      setElapsed('')
      return
    }
    const tick = () => {
      const s = Math.floor((Date.now() - recordingStartTime) / 1000)
      const m = Math.floor(s / 60)
      const sec = s % 60
      setElapsed(`${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`)
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [badgeState, recordingStartTime])

  if (badgeState === 'disconnected') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F3F4F6]">
        <span className="w-[6px] h-[6px] rounded-full bg-[#D1D5DB]" />
        <span className="text-[10px] text-[#9CA3AF] font-medium">工牌离线</span>
      </div>
    )
  }

  if (badgeState === 'connected_recording') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FEF2F2]">
        <span className="w-[6px] h-[6px] rounded-full bg-[#EF4444] animate-pulse" />
        <span className="text-[10px] text-[#B42318] font-medium">录音中</span>
        {elapsed && <span className="text-[10px] text-[#B42318] font-mono">{elapsed}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F0FDF4]">
      <span className="w-[6px] h-[6px] rounded-full bg-[#10B981]" />
      <span className="text-[10px] text-[#116B4C] font-medium">工牌在线</span>
    </div>
  )
}

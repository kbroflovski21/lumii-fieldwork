import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Camera, Flag, CheckCircle2, Mic, Circle, CircleCheck, CircleDot } from 'lucide-react'
import { todayTasks } from '../../data/mock'

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ServiceSession() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()

  // Find the task, default to T002 (in_progress)
  const task = todayTasks.find(t => t.id === taskId) || todayTasks.find(t => t.id === 'T002')!

  // Timer counting up from startTime
  const [elapsed, setElapsed] = useState(() => {
    if (!task.startTime) return 0
    const [h, m] = task.startTime.split(':').map(Number)
    const startMs = new Date().setHours(h, m, 0, 0)
    const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000))
    // Cap at a reasonable demo value if the time is in the past/future
    return diff > 7200 ? 1245 : diff // fallback to ~20 min for demo
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Determine the latest AI note to display
  const latestAiNote = task.aiNotes.length > 0
    ? task.aiNotes[task.aiNotes.length - 1]
    : '等待服务开始...'

  const completedSteps = task.sopProgress.filter(s => s.status === 'completed').length
  const totalSteps = task.sopProgress.length

  return (
    <div className="px-4">
      {/* Top Info Card */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#191C1E' }}>
              {task.elder.name}
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md inline-block mt-0.5"
              style={{ background: 'rgba(0,82,204,0.06)', color: '#0052CC' }}>
              {task.serviceType}
            </span>
          </div>
          <div className="text-right">
            {/* Timer */}
            <div className="text-2xl font-bold tabular-nums" style={{ color: '#0052CC' }}>
              {formatElapsed(elapsed)}
            </div>
            {/* Recording indicator */}
            <div className="flex items-center gap-1.5 justify-end mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: '#DC2626' }} />
                <span className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: '#DC2626' }} />
              </span>
              <span className="text-xs font-medium" style={{ color: '#DC2626' }}>
                <Mic size={11} className="inline mr-0.5" />
                录音中
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(completedSteps / totalSteps) * 100}%`,
                background: 'linear-gradient(90deg, #0052CC, #3B82F6)',
              }}
            />
          </div>
          <span className="text-xs font-medium shrink-0" style={{ color: '#64748B' }}>
            {completedSteps}/{totalSteps}
          </span>
        </div>
      </div>

      {/* SOP + AI Grid — side by side on desktop */}
      <div className="md:grid md:grid-cols-2 md:gap-4">

      {/* SOP Timeline */}
      <div className="glass-card p-4 mb-4 md:mb-0">
        <h3 className="text-sm font-bold mb-3" style={{ color: '#191C1E' }}>
          服务流程 (SOP)
        </h3>
        <div className="relative">
          {task.sopProgress.map((step, index) => {
            const isCompleted = step.status === 'completed'
            const isInProgress = step.status === 'in_progress'
            const isPending = step.status === 'pending'
            const isLast = index === task.sopProgress.length - 1

            return (
              <div key={step.id} className="flex gap-3 relative">
                {/* Timeline line */}
                {!isLast && (
                  <div
                    className="absolute left-[11px] top-[24px] w-[2px]"
                    style={{
                      height: isInProgress ? 'calc(100% - 8px)' : 'calc(100% - 4px)',
                      background: isCompleted ? '#16A34A' : '#E2E8F0',
                    }}
                  />
                )}

                {/* Timeline dot */}
                <div className="shrink-0 relative z-10 mt-0.5">
                  {isCompleted && (
                    <CircleCheck size={22} style={{ color: '#16A34A' }} />
                  )}
                  {isInProgress && (
                    <CircleDot size={22} style={{ color: '#0052CC' }} />
                  )}
                  {isPending && (
                    <Circle size={22} style={{ color: '#CBD5E1' }} />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 pb-4 ${isInProgress ? 'pb-5' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${isCompleted ? 'line-through' : ''}`}
                      style={{
                        color: isCompleted ? '#94A3B8' : isInProgress ? '#0052CC' : '#64748B',
                      }}
                    >
                      {step.name}
                    </span>
                    <span className="text-xs" style={{ color: '#94A3B8' }}>
                      {step.duration}分钟
                    </span>
                  </div>

                  {/* Expanded guidance for in-progress step */}
                  {isInProgress && (
                    <div className="mt-2 p-3 rounded-xl"
                      style={{ background: 'rgba(0,82,204,0.04)', border: '1px solid rgba(0,82,204,0.1)' }}>
                      <p className="text-xs leading-relaxed" style={{ color: '#434654' }}>
                        {step.guidance}
                      </p>
                      {/* Check items */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {step.checkItems.map((item, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(0,82,204,0.08)', color: '#0052CC' }}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* AI Feedback Section */}
      <div className="glass-card p-4 md:self-start">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,82,204,0.08)' }}>
            <span className="text-xs" style={{ color: '#0052CC' }}>AI</span>
          </div>
          <span className="text-xs font-semibold" style={{ color: '#0052CC' }}>
            实时督导
          </span>
          {/* Speech wave animation */}
          <div className="flex items-center gap-[2px] ml-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="w-[3px] rounded-full"
                style={{
                  height: '12px',
                  background: '#0052CC',
                  opacity: 0.5,
                  animation: `soundWave 1.2s ease-in-out ${i * 0.1}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#434654' }}>
          {latestAiNote}
        </p>
      </div>

      </div>{/* end SOP + AI grid */}

      <div className="h-24 md:h-8" />{/* spacer for floating bar */}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg md:max-w-xl px-4">
        <div className="glass-card p-3 flex items-center justify-center gap-3"
          style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
          {/* Camera */}
          <button
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'rgba(0,82,204,0.08)', color: '#0052CC' }}
            onClick={() => {/* demo only */}}
          >
            <Camera size={22} />
          </button>

          {/* Flag anomaly */}
          <button
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'rgba(245,158,11,0.08)', color: '#D97706' }}
            onClick={() => {/* demo only */}}
          >
            <Flag size={22} />
          </button>

          {/* Complete service - primary */}
          <button
            className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm text-white transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #16A34A, #15803D)',
              boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
            }}
            onClick={() => navigate(`/worker/complete/${task.id}`)}
          >
            <CheckCircle2 size={18} />
            <span>完成服务</span>
          </button>
        </div>
      </div>

      {/* Inline keyframes for sound wave animation */}
      <style>{`
        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

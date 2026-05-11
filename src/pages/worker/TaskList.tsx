import { Link } from 'react-router-dom'
import { MapPin, Clock, AlertTriangle, Check, Mic, ChevronRight } from 'lucide-react'
import { todayTasks } from '../../data/mock'

const statusConfig = {
  pending: { label: '待出发', bg: '#F1F5F9', color: '#64748B', dot: false },
  en_route: { label: '在路上', bg: 'rgba(0,82,204,0.08)', color: '#0052CC', dot: false },
  in_progress: { label: '服务中', bg: 'rgba(22,163,74,0.08)', color: '#16A34A', dot: true },
  completed: { label: '已完成', bg: '#F1F5F9', color: '#94A3B8', dot: false },
} as const

function formatDate() {
  const d = new Date()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekdays[d.getDay()]}`
}

export default function TaskList() {
  const sortedTasks = [...todayTasks].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
  const completedCount = sortedTasks.filter(t => t.status === 'completed').length
  const pendingCount = sortedTasks.filter(t => t.status !== 'completed').length

  // Find the "current" task — first non-completed task
  const currentTaskId = sortedTasks.find(t => t.status !== 'completed')?.id

  // Estimate end time: last task's scheduled time + its duration
  const lastTask = sortedTasks[sortedTasks.length - 1]
  const [lastH, lastM] = lastTask.scheduledTime.split(':').map(Number)
  const endMinutes = lastH * 60 + lastM + lastTask.estimatedDuration
  const endTime = `${Math.floor(endMinutes / 60)}:${String(endMinutes % 60).padStart(2, '0')}`

  return (
    <div className="px-4">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 -mx-4 px-4 pt-4 pb-3"
        style={{ background: 'rgba(247,249,251,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#191C1E' }}>
              今日任务
            </h1>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
              李小明 · {formatDate()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(22,163,74,0.08)', color: '#16A34A' }}>
              <Mic size={13} />
              <span>录音中</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#16A34A' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#16A34A' }} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="glass-card px-4 py-3 mb-4 mt-2">
        <p className="text-sm font-medium" style={{ color: '#434654' }}>
          <span className="font-bold" style={{ color: '#0052CC' }}>{pendingCount} 户</span>
          <span>待服务 · 已完成 </span>
          <span className="font-bold" style={{ color: '#16A34A' }}>{completedCount}</span>
          <span> · 预计 {endTime} 结束</span>
        </p>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {sortedTasks.map((task) => {
          const status = statusConfig[task.status]
          const isCurrent = task.id === currentTaskId
          const isCompleted = task.status === 'completed'
          const linkTo = isCompleted
            ? `/worker/complete/${task.id}`
            : `/worker/session/${task.id}`

          return (
            <Link key={task.id} to={linkTo} className="block">
              <div
                className={`glass-card glass-card-hover p-4 transition-all duration-200 ${
                  isCompleted ? 'opacity-60' : ''
                }`}
                style={{
                  borderLeft: isCurrent ? '4px solid #0052CC' : '4px solid transparent',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    {/* Name and status */}
                    <div className="flex items-center gap-2 mb-1.5">
                      {isCompleted && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: '#F1F5F9' }}>
                          <Check size={12} style={{ color: '#94A3B8' }} />
                        </div>
                      )}
                      <h3 className={`text-base font-bold ${isCompleted ? 'line-through' : ''}`}
                        style={{ color: isCompleted ? '#94A3B8' : '#191C1E' }}>
                        {task.elder.name}
                      </h3>
                      {/* Status badge */}
                      <span className="status-badge" style={{ background: status.bg, color: status.color }}>
                        {status.dot && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: status.color }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: status.color }} />
                          </span>
                        )}
                        {status.label}
                      </span>
                    </div>

                    {/* Service type and time */}
                    <div className="flex items-center gap-3 text-xs mb-1.5" style={{ color: '#64748B' }}>
                      <span className="font-medium px-2 py-0.5 rounded-md"
                        style={{ background: 'rgba(0,82,204,0.06)', color: '#0052CC' }}>
                        {task.serviceType}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {task.scheduledTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {task.estimatedDuration}分钟
                      </span>
                    </div>

                    {/* Address */}
                    <div className="flex items-center gap-1 text-xs" style={{ color: '#64748B' }}>
                      <MapPin size={11} />
                      <span>{task.elder.address}</span>
                    </div>

                    {/* Alert tag */}
                    {task.alert && !isCompleted && (
                      <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{ background: 'rgba(245,158,11,0.08)', color: '#D97706' }}>
                        <AlertTriangle size={12} />
                        <span>{task.alert}</span>
                      </div>
                    )}
                  </div>

                  {/* Right arrow */}
                  <div className="shrink-0 mt-2">
                    <ChevronRight size={18} style={{ color: '#94A3B8' }} />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Bottom spacer for safe area */}
      <div className="h-8" />
    </div>
  )
}

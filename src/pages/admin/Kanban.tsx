import { Clock, AlertTriangle, User } from 'lucide-react'
import { kanbanTasks, workers } from '../../data/mock'
import type { ServiceTask } from '../../data/mock'

const columns = [
  { key: 'pending', label: '待出发', color: '#64748B', bg: 'rgba(100,116,139,0.08)' },
  { key: 'en_route', label: '在路上', color: '#0052CC', bg: 'rgba(0,82,204,0.08)' },
  { key: 'in_progress', label: '服务中', color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
  { key: 'completed', label: '已完成', color: '#94A3B8', bg: 'rgba(148,163,184,0.08)' },
] as const

function getWorkerName(workerId: string): string {
  return workers.find(w => w.id === workerId)?.name || workerId
}

function getWorkerInitial(workerId: string): string {
  const name = getWorkerName(workerId)
  return name.charAt(name.length - 1)
}

function getElapsedTime(startTime?: string): string {
  if (!startTime) return ''
  const [h, m] = startTime.split(':').map(Number)
  const startMinutes = h * 60 + m
  // Simulate current time as 10:25 for demo
  const nowMinutes = 10 * 60 + 25
  const elapsed = Math.max(0, nowMinutes - startMinutes)
  return `${elapsed} 分钟`
}

function getSopProgress(task: ServiceTask): { completed: number; total: number; percent: number } {
  const total = task.sopProgress.length
  const completed = task.sopProgress.filter(s => s.status === 'completed').length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return { completed, total, percent }
}

function TaskCard({ task, columnKey }: { task: ServiceTask; columnKey: string }) {
  const hasAlert = !!task.alert
  const isInProgress = columnKey === 'in_progress'
  const isCompleted = columnKey === 'completed'
  const sop = getSopProgress(task)

  return (
    <div
      className={`glass-card p-3.5 mb-2.5 transition-all duration-200 ${isCompleted ? 'opacity-60' : ''}`}
      style={{
        borderLeft: hasAlert ? '3px solid #DC2626' : '3px solid transparent',
        borderRadius: '14px',
      }}
    >
      {/* Elder name + service type */}
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-bold" style={{ color: isCompleted ? '#94A3B8' : '#191C1E' }}>
          {task.elder.name}
        </h4>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
          style={{ background: 'rgba(0,82,204,0.06)', color: isCompleted ? '#94A3B8' : '#0052CC' }}
        >
          {task.serviceType}
        </span>
        {hasAlert && !isCompleted && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}
          >
            异常
          </span>
        )}
      </div>

      {/* Worker */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: '#7C3AED' }}
        >
          {getWorkerInitial(task.workerId)}
        </div>
        <span className="text-xs" style={{ color: '#64748B' }}>
          {getWorkerName(task.workerId)}
        </span>
      </div>

      {/* Time info */}
      <div className="flex items-center gap-2 text-xs" style={{ color: '#64748B' }}>
        <Clock size={11} />
        <span>{task.scheduledTime}</span>
        <span>|</span>
        <span>{task.estimatedDuration}分钟</span>
      </div>

      {/* In-progress: elapsed time + SOP bar */}
      {isInProgress && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: '#16A34A' }} className="font-medium">
              已进行 {getElapsedTime(task.startTime)}
            </span>
            <span style={{ color: '#64748B' }}>
              SOP {sop.completed}/{sop.total}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(22,163,74,0.12)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${sop.percent}%`,
                background: '#16A34A',
              }}
            />
          </div>
        </div>
      )}

      {/* Alert text */}
      {hasAlert && !isCompleted && (
        <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: '#DC2626' }}>
          <AlertTriangle size={11} />
          <span>{task.alert}</span>
        </div>
      )}
    </div>
  )
}

export default function Kanban() {
  const grouped = columns.map((col) => ({
    ...col,
    tasks: kanbanTasks.filter((t) => t.status === col.key),
  }))

  return (
    <div className="mt-2">
      {/* Summary bar */}
      <div className="glass-card px-4 py-3 mb-4">
        <div className="flex items-center gap-3">
          <User size={14} style={{ color: '#7C3AED' }} />
          <p className="text-sm" style={{ color: '#434654' }}>
            今日共{' '}
            <span className="font-bold" style={{ color: '#7C3AED' }}>{kanbanTasks.length}</span>
            {' '}户服务 ·{' '}
            <span className="font-bold" style={{ color: '#16A34A' }}>
              {kanbanTasks.filter(t => t.status === 'completed').length}
            </span>
            {' '}已完成 ·{' '}
            <span className="font-bold" style={{ color: '#DC2626' }}>
              {kanbanTasks.filter(t => t.alert).length}
            </span>
            {' '}异常
          </p>
        </div>
      </div>

      {/* Kanban Board - Horizontally scrollable */}
      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {grouped.map((col) => (
            <div key={col.key} className="w-[260px] flex-shrink-0">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: col.color }}
                />
                <h3 className="text-sm font-bold" style={{ color: col.color }}>
                  {col.label}
                </h3>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: col.bg, color: col.color }}
                >
                  {col.tasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-0">
                {col.tasks.length === 0 ? (
                  <div
                    className="text-center py-8 text-xs rounded-2xl"
                    style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.3)' }}
                  >
                    暂无任务
                  </div>
                ) : (
                  col.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} columnKey={col.key} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

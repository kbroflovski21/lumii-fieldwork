import { useState, useMemo } from 'react'
import { mockTasks, getStatusLabel } from '../data/mock-data'
import type { ServiceTask, TaskStatus } from '../types'

type ViewMode = 'day' | 'week' | 'month'

interface Props {
  onSelectTask: (task: ServiceTask) => void
}

const STATUS_COLORS: Record<TaskStatus, { bg: string; dot: string; border: string }> = {
  completed: { bg: 'rgba(16,185,129,0.1)', dot: '#10B981', border: '#10B981' },
  abnormal: { bg: 'rgba(239,68,68,0.1)', dot: '#EF4444', border: '#EF4444' },
  pending: { bg: 'rgba(245,158,11,0.1)', dot: '#F59E0B', border: '#F59E0B' },
}

const STATUS_BADGE: Record<TaskStatus, { bg: string; text: string }> = {
  completed: { bg: '#E0F4EC', text: '#116B4C' },
  abnormal: { bg: '#FEE2E2', text: '#B42318' },
  pending: { bg: '#FFF1D6', text: '#976000' },
}

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function getWeekStart(d: Date): Date {
  const r = new Date(d)
  r.setDate(r.getDate() - r.getDay())
  return r
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const startDate = getWeekStart(first)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    days.push(addDays(startDate, i))
  }
  return days
}

function formatTime(t: string): string {
  return t
}

function getTasksForDate(dateStr: string): ServiceTask[] {
  return mockTasks.filter(t => t.date === dateStr)
}

export function CalendarView({ onSelectTask }: Props) {
  const today = new Date()
  const todayStr = toDateStr(today)
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState(todayStr)

  const navigate = (dir: number) => {
    const d = new Date(currentDate)
    if (viewMode === 'day') d.setDate(d.getDate() + dir)
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
    setSelectedDate(toDateStr(d))
  }

  const quickLabel = { day: '今天', week: '本周', month: '本月' }[viewMode]

  return (
    <div className="flex flex-col h-full">
      {/* Navigation bar */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        {/* Row 1: ← Title → | Segmented | Quick button */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: ← Title → QuickBtn */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F3F4F6] active:bg-[#E5E7EB]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <HeaderTitle viewMode={viewMode} currentDate={currentDate} />
            <button onClick={() => navigate(1)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F3F4F6] active:bg-[#E5E7EB]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <button
              onClick={() => { setCurrentDate(today); setSelectedDate(todayStr) }}
              className="ml-1 px-2.5 py-1 rounded-md text-[11px] text-[#0052CC] font-medium bg-[rgba(0,82,204,0.06)] active:bg-[rgba(0,82,204,0.12)]"
            >
              {quickLabel}
            </button>
          </div>

          {/* Right: segmented control */}
          <div className="flex bg-[#F3F4F6] rounded-lg p-0.5">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode)
                  setSelectedDate(toDateStr(currentDate))
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-[#191C1E] shadow-sm'
                    : 'text-[#9CA3AF]'
                }`}
              >
                {{ day: '日', week: '周', month: '月' }[mode]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            selectedDate={selectedDate}
            todayStr={todayStr}
            onSelectDate={setSelectedDate}
            onSelectTask={onSelectTask}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            selectedDate={selectedDate}
            todayStr={todayStr}
            onSelectDate={setSelectedDate}
            onSelectTask={onSelectTask}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            todayStr={todayStr}
            onSelectTask={onSelectTask}
          />
        )}
      </div>
    </div>
  )
}

function HeaderTitle({ viewMode, currentDate }: { viewMode: ViewMode; currentDate: Date }) {
  if (viewMode === 'month') {
    return (
      <h2 className="text-[17px] font-bold text-[#191C1E]">
        {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
      </h2>
    )
  }
  if (viewMode === 'week') {
    const ws = getWeekStart(currentDate)
    const we = addDays(ws, 6)
    return (
      <h2 className="text-[15px] font-bold text-[#191C1E] whitespace-nowrap">
        {ws.getMonth() + 1}/{ws.getDate()} - {we.getMonth() + 1}/{we.getDate()}
      </h2>
    )
  }
  return (
    <h2 className="text-[17px] font-bold text-[#191C1E]">
      {currentDate.getMonth() + 1}月{currentDate.getDate()}日 周{DAY_LABELS[currentDate.getDay()]}
    </h2>
  )
}

/* ─── Month View ─── */
function MonthView({ currentDate, selectedDate, todayStr, onSelectDate, onSelectTask }: {
  currentDate: Date; selectedDate: string; todayStr: string
  onSelectDate: (d: string) => void; onSelectTask: (t: ServiceTask) => void
}) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const days = useMemo(() => getMonthDays(year, month), [year, month])
  const selectedTasks = useMemo(() => getTasksForDate(selectedDate), [selectedDate])

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[11px] text-[#9CA3AF] font-medium py-1">{d}</div>
        ))}
      </div>
      {/* Date grid */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day, i) => {
          const ds = toDateStr(day)
          const isCurrentMonth = day.getMonth() === month
          const isToday = ds === todayStr
          const isSelected = ds === selectedDate
          const dayTasks = getTasksForDate(ds)
          const dots = [...new Set(dayTasks.map(t => t.status))]

          return (
            <button
              key={i}
              onClick={() => onSelectDate(ds)}
              className={`flex flex-col items-center py-1.5 rounded-lg transition-colors ${
                isSelected ? 'bg-[rgba(0,82,204,0.08)]' : 'hover:bg-[#F9FAFB]'
              }`}
            >
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-[13px] ${
                isToday
                  ? 'bg-[#0052CC] text-white font-bold'
                  : isCurrentMonth
                    ? 'text-[#191C1E]'
                    : 'text-[#D1D5DB]'
              }`}>
                {day.getDate()}
              </span>
              <div className="flex gap-0.5 mt-0.5 h-[5px]">
                {dots.map(s => (
                  <span key={s} className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: STATUS_COLORS[s].dot }} />
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected day tasks */}
      <div className="mt-4">
        <div className="text-[12px] text-[#9CA3AF] font-medium mb-2">
          {new Date(selectedDate).getMonth() + 1}月{new Date(selectedDate).getDate()}日 任务
        </div>
        {selectedTasks.length === 0 ? (
          <div className="text-center text-[13px] text-[#9CA3AF] py-8">暂无任务</div>
        ) : (
          <div className="space-y-2">
            {selectedTasks.map(task => (
              <TaskRow key={task.id} task={task} onSelect={onSelectTask} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Week View ─── */
function WeekView({ currentDate, selectedDate, todayStr, onSelectDate, onSelectTask }: {
  currentDate: Date; selectedDate: string; todayStr: string
  onSelectDate: (d: string) => void; onSelectTask: (t: ServiceTask) => void
}) {
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const selectedTasks = useMemo(() => getTasksForDate(selectedDate), [selectedDate])

  return (
    <div>
      {/* Week day strip */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {weekDays.map(day => {
          const ds = toDateStr(day)
          const isToday = ds === todayStr
          const isSelected = ds === selectedDate
          const dayTasks = getTasksForDate(ds)

          return (
            <button
              key={ds}
              onClick={() => onSelectDate(ds)}
              className={`flex flex-col items-center py-2 rounded-xl transition-colors ${
                isSelected ? 'bg-[rgba(0,82,204,0.08)]' : 'hover:bg-[#F9FAFB]'
              }`}
            >
              <span className="text-[11px] text-[#9CA3AF] font-medium">{DAY_LABELS[day.getDay()]}</span>
              <span className={`w-8 h-8 flex items-center justify-center rounded-full text-[14px] mt-0.5 ${
                isToday
                  ? 'bg-[#0052CC] text-white font-bold'
                  : 'text-[#191C1E]'
              }`}>
                {day.getDate()}
              </span>
              <div className="flex gap-0.5 mt-1 h-[5px]">
                {dayTasks.length > 0 && (
                  <span className="w-[5px] h-[5px] rounded-full" style={{
                    backgroundColor: dayTasks.some(t => t.status === 'abnormal')
                      ? STATUS_COLORS.abnormal.dot
                      : dayTasks.some(t => t.status === 'pending')
                        ? STATUS_COLORS.pending.dot
                        : STATUS_COLORS.completed.dot
                  }} />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Day tasks */}
      <div className="text-[12px] text-[#9CA3AF] font-medium mb-2">
        {new Date(selectedDate).getMonth() + 1}月{new Date(selectedDate).getDate()}日 周{DAY_LABELS[new Date(selectedDate).getDay()]}
      </div>
      {selectedTasks.length === 0 ? (
        <div className="text-center text-[13px] text-[#9CA3AF] py-8">暂无任务</div>
      ) : (
        <div className="space-y-2">
          {selectedTasks.map(task => (
            <TaskRow key={task.id} task={task} onSelect={onSelectTask} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Day View ─── */
function DayView({ currentDate, todayStr, onSelectTask }: {
  currentDate: Date; todayStr: string; onSelectTask: (t: ServiceTask) => void
}) {
  const dateStr = toDateStr(currentDate)
  const tasks = useMemo(() => getTasksForDate(dateStr), [dateStr])
  const hours = Array.from({ length: 11 }, (_, i) => i + 8) // 8:00 - 18:00

  const getTaskPosition = (task: ServiceTask) => {
    const [sh, sm] = task.startTime.split(':').map(Number)
    const [eh, em] = task.endTime.split(':').map(Number)
    const top = ((sh - 8) * 60 + sm) / 60
    const height = ((eh - sh) * 60 + (em - sm)) / 60
    return { top: top * 60, height: Math.max(height * 60, 40) }
  }

  return (
    <div>
      <div className="relative" style={{ minHeight: hours.length * 60 }}>
        {/* Hour lines */}
        {hours.map(h => (
          <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: (h - 8) * 60 }}>
            <span className="w-10 text-[11px] text-[#9CA3AF] text-right pr-2 -mt-1.5">{String(h).padStart(2, '0')}:00</span>
            <div className="flex-1 border-t border-[#F3F4F6]" />
          </div>
        ))}
        {/* Tasks */}
        <div className="ml-12 relative">
          {tasks.map(task => {
            const pos = getTaskPosition(task)
            const colors = STATUS_COLORS[task.status]
            return (
              <button
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="absolute left-0 right-2 rounded-lg px-3 py-1.5 text-left overflow-hidden transition-shadow hover:shadow-md active:opacity-90"
                style={{
                  top: pos.top,
                  height: pos.height,
                  backgroundColor: colors.bg,
                  borderLeft: `3px solid ${colors.border}`,
                }}
              >
                <div className="text-[12px] font-semibold text-[#191C1E] truncate">
                  {task.serviceType} · {task.recipientName}
                </div>
                <div className="text-[11px] text-[#9CA3AF] truncate">
                  {formatTime(task.startTime)}-{formatTime(task.endTime)} {task.locationShort}
                </div>
              </button>
            )
          })}
        </div>
        {/* Now line */}
        {dateStr === todayStr && (() => {
          const now = new Date()
          const mins = (now.getHours() - 8) * 60 + now.getMinutes()
          if (mins < 0 || mins > 660) return null
          return (
            <div className="absolute left-10 right-0 flex items-center" style={{ top: mins }}>
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <div className="flex-1 border-t border-[#EF4444]" />
            </div>
          )
        })()}
      </div>
    </div>
  )
}

/* ─── Shared Task Row ─── */
function TaskRow({ task, onSelect }: { task: ServiceTask; onSelect: (t: ServiceTask) => void }) {
  const colors = STATUS_COLORS[task.status]
  const badge = STATUS_BADGE[task.status]

  return (
    <button
      onClick={() => onSelect(task)}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E5E7EB] text-left active:bg-[#F9FAFB] transition-colors"
    >
      {/* Color bar */}
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: colors.border }} />
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-[#191C1E] truncate">
            {task.serviceType}
          </span>
          <span className="text-[13px] text-[#374151] truncate">
            {task.recipientName}
          </span>
        </div>
        <div className="text-[12px] text-[#9CA3AF] mt-0.5 truncate">
          {formatTime(task.startTime)}-{formatTime(task.endTime)} · {task.locationShort}
        </div>
      </div>
      {/* Status badge */}
      <span
        className="flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-medium"
        style={{ backgroundColor: badge.bg, color: badge.text }}
      >
        {getStatusLabel(task.status)}
      </span>
    </button>
  )
}

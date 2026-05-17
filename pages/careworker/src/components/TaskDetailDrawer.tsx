import { useEffect } from 'react'
import type { ServiceTask, TaskStatus } from '../types'
import { getStatusLabel, formatDateShort } from '../data/mock-data'

interface Props {
  task: ServiceTask
  onClose: () => void
}

const HEADER_COLORS: Record<TaskStatus, { bg: string; bar: string }> = {
  completed: { bg: '#F0FDF4', bar: '#10B981' },
  abnormal: { bg: '#FEF2F2', bar: '#EF4444' },
  pending: { bg: '#FFFBEB', bar: '#F59E0B' },
}

const BADGE_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  completed: { bg: '#E0F4EC', text: '#116B4C' },
  abnormal: { bg: '#FEE2E2', text: '#B42318' },
  pending: { bg: '#FFF1D6', text: '#976000' },
}

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']
function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function TaskDetailDrawer({ task, onClose }: Props) {
  const headerColor = HEADER_COLORS[task.status]
  const badge = BADGE_COLORS[task.status]

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div
        className="relative bg-white rounded-t-xl overflow-hidden animate-slide-up"
        style={{ maxHeight: '86vh' }}
      >
        {/* Header */}
        <div className="relative px-4 pt-4 pb-3" style={{ backgroundColor: headerColor.bg }}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5"
            aria-label="关闭"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Status badge */}
          <span
            className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold mb-2"
            style={{ backgroundColor: badge.bg, color: badge.text }}
          >
            {getStatusLabel(task.status)}
          </span>

          {/* Title */}
          <h2 className="text-[20px] font-bold text-[#191C1E] leading-tight">{task.serviceType}</h2>
          <p className="text-[13px] text-[#374151] mt-1">
            {formatDateShort(task.date)} · {task.startTime}-{task.endTime}
          </p>
          <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-white/60 border border-[#E5E7EB] text-[11px] text-[#6B7280]">
            {task.source}
          </span>

          {/* Color bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{
            background: `linear-gradient(90deg, ${headerColor.bar}, ${headerColor.bar}80)`
          }} />
        </div>

        {/* Content — scrollable */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(86vh - 140px)' }}>
          {/* Summary cards */}
          <div className="px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* 服务对象 */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg border border-[#E5E7EB] bg-white">
                <div className="flex-shrink-0">
                  <div className="text-[10px] text-[#9CA3AF] mb-0.5">服务对象</div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[12px] font-bold"
                      style={{ backgroundColor: avatarColor(task.recipientName) }}
                    >
                      {task.recipientName[0]}
                    </span>
                    <span className="text-[14px] font-medium text-[#191C1E]">{task.recipientName}</span>
                  </div>
                </div>
              </div>
              {/* 服务人员 */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg border border-[#E5E7EB] bg-white">
                <div className="flex-shrink-0">
                  <div className="text-[10px] text-[#9CA3AF] mb-0.5">服务人员</div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[12px] font-bold"
                      style={{ backgroundColor: avatarColor(task.workerName) }}
                    >
                      {task.workerName[0]}
                    </span>
                    <span className="text-[14px] font-medium text-[#191C1E]">{task.workerName}</span>
                  </div>
                </div>
              </div>
              {/* 服务地点 */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-[#E5E7EB] bg-white">
                <div>
                  <div className="text-[10px] text-[#9CA3AF] mb-0.5">服务地点</div>
                  <div className="flex items-start gap-1.5">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#9CA3AF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="text-[13px] text-[#191C1E] leading-snug">{task.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-[#E5E7EB]" />

          {/* 排期详情 */}
          <div className="px-4 py-3">
            <h3 className="text-[15px] font-bold text-[#191C1E] mb-3">排期详情</h3>
            <div className="border-t-2 border-[#0052CC] mb-3" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
              <DetailField label="服务日期" value={formatDateShort(task.date)} />
              <DetailField label="时间段" value={`${task.startTime}-${task.endTime}`} />
              <DetailField label="服务项目">
                <span className="inline-block px-2 py-0.5 rounded bg-[#F3F4F6] text-[12px] text-[#374151] font-medium">
                  {task.serviceType}
                </span>
              </DetailField>
              <DetailField label="来源" value={task.source} />
              <DetailField label="状态">
                <span
                  className="inline-block px-2 py-0.5 rounded text-[11px] font-medium"
                  style={{ backgroundColor: badge.bg, color: badge.text }}
                >
                  {getStatusLabel(task.status)}
                </span>
              </DetailField>
              <DetailField label="服务人员" value={task.workerName} />
              <DetailField label="服务对象" value={task.recipientName} />
              <DetailField label="地址" value={task.location} fullWidth />
              <DetailField label="备注" value={task.notes || '—'} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

function DetailField({ label, value, children, fullWidth }: {
  label: string; value?: string; children?: React.ReactNode; fullWidth?: boolean
}) {
  return (
    <div className={`py-2 border-b border-[#F3F4F6] ${fullWidth ? 'sm:col-span-3' : ''}`}>
      <div className="text-[12px] text-[#0052CC] font-medium mb-0.5">{label}</div>
      {children || <div className="text-[13px] text-[#191C1E]">{value}</div>}
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { ServiceTask, TaskStatus, ServiceReport } from '../types'
import { getStatusLabel, formatDateShort } from '../data/mock-data'
import { MapActionSheet } from './MapActionSheet'

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
  const [showReport, setShowReport] = useState(false)

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
        {showReport && task.report ? (
          <ReportView
            task={task}
            report={task.report}
            onBack={() => setShowReport(false)}
            onClose={onClose}
          />
        ) : (
          <DetailView
            task={task}
            onClose={onClose}
            onViewReport={() => setShowReport(true)}
          />
        )}
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

function DetailView({ task, onClose, onViewReport }: {
  task: ServiceTask; onClose: () => void; onViewReport: () => void
}) {
  const headerColor = HEADER_COLORS[task.status]
  const badge = BADGE_COLORS[task.status]
  const [mapAddress, setMapAddress] = useState<string | null>(null)

  return (
    <>
      {/* Header */}
      <div className="relative px-4 pt-4 pb-3" style={{ backgroundColor: headerColor.bg }}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5"
          aria-label="关闭"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <span
          className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold mb-2"
          style={{ backgroundColor: badge.bg, color: badge.text }}
        >
          {getStatusLabel(task.status)}
        </span>

        <h2 className="text-[20px] font-bold text-[#191C1E] leading-tight">{task.serviceType}</h2>
        <p className="text-[13px] text-[#374151] mt-1">
          {formatDateShort(task.date)} · {task.startTime}-{task.endTime}
        </p>
        <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-white/60 border border-[#E5E7EB] text-[11px] text-[#6B7280]">
          {task.source}
        </span>

        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{
          background: `linear-gradient(90deg, ${headerColor.bar}, ${headerColor.bar}80)`
        }} />
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(86vh - 140px)' }}>
        {/* Summary cards */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-[#E5E7EB] bg-white">
              <div className="flex-shrink-0">
                <div className="text-[10px] text-[#9CA3AF] mb-0.5">服务对象</div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[12px] font-bold" style={{ backgroundColor: avatarColor(task.recipientName) }}>
                    {task.recipientName[0]}
                  </span>
                  <span className="text-[14px] font-medium text-[#191C1E]">{task.recipientName}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-[#E5E7EB] bg-white">
              <div className="flex-shrink-0">
                <div className="text-[10px] text-[#9CA3AF] mb-0.5">服务人员</div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[12px] font-bold" style={{ backgroundColor: avatarColor(task.workerName) }}>
                    {task.workerName[0]}
                  </span>
                  <span className="text-[14px] font-medium text-[#191C1E]">{task.workerName}</span>
                </div>
              </div>
            </div>
            <div className="flex items-start justify-between p-3 rounded-lg border border-[#E5E7EB] bg-white">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-[#9CA3AF] mb-0.5">服务地点</div>
                <div className="flex items-start gap-1.5">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#9CA3AF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="text-[13px] text-[#191C1E] leading-snug">{task.location}</span>
                </div>
              </div>
              <NavIcon onClick={() => setMapAddress(task.location)} />
            </div>
          </div>
        </div>

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
                style={{ backgroundColor: BADGE_COLORS[task.status].bg, color: BADGE_COLORS[task.status].text }}
              >
                {getStatusLabel(task.status)}
              </span>
            </DetailField>
            <DetailField label="服务人员" value={task.workerName} />
            <DetailField label="服务对象" value={task.recipientName} />
            <DetailField label="地址" fullWidth>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] text-[#191C1E]">{task.location}</span>
                <NavIcon onClick={() => setMapAddress(task.location)} />
              </div>
            </DetailField>
            <DetailField label="备注" value={task.notes || '—'} />

            {/* 查看报告 — only for completed tasks */}
            {task.status === 'completed' && task.report && (
              <DetailField label="服务报告" fullWidth>
                <button
                  onClick={onViewReport}
                  className="flex items-center gap-2 text-[13px] text-[#0052CC] font-medium hover:underline active:opacity-70"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  查看报告
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </DetailField>
            )}
          </div>
        </div>
      </div>

      {mapAddress && (
        <MapActionSheet address={mapAddress} onClose={() => setMapAddress(null)} />
      )}
    </>
  )
}

function NavIcon({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[#EEF4FA] active:bg-[#D4E4F2]"
      aria-label="导航"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
      </svg>
    </button>
  )
}

function ReportView({ task, report, onBack, onClose }: {
  task: ServiceTask; report: ServiceReport; onBack: () => void; onClose: () => void
}) {
  const passedCount = report.sopCheck.filter(s => s.passed).length
  const totalCount = report.sopCheck.length

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[13px] text-[#0052CC] font-medium hover:underline"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回详情
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5"
          aria-label="关闭"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Report title */}
      <div className="px-4 pt-3 pb-2">
        <h2 className="text-[17px] font-bold text-[#191C1E]">服务报告</h2>
        <p className="text-[12px] text-[#9CA3AF] mt-0.5">
          {task.serviceType} · {task.recipientName} · {formatDateShort(task.date)}
        </p>
      </div>

      {/* Report content */}
      <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: 'calc(86vh - 110px)' }}>
        {/* Summary */}
        <div className="mb-4">
          <SectionTitle title="服务摘要" />
          <p className="text-[13px] text-[#374151] leading-relaxed">{report.summary}</p>
        </div>

        {/* SOP Check */}
        <div className="mb-4">
          <SectionTitle title={`SOP 执行情况 (${passedCount}/${totalCount})`} />
          <div className="space-y-1.5">
            {report.sopCheck.map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-[#F9FAFB]">
                {item.passed ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
                <span className={`text-[13px] ${item.passed ? 'text-[#374151]' : 'text-[#B42318] font-medium'}`}>
                  {item.step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Health observations */}
        {report.healthObservations.length > 0 && (
          <div className="mb-4">
            <SectionTitle title="健康观察" />
            <div className="space-y-1">
              {report.healthObservations.map((obs, i) => (
                <div key={i} className="flex items-start gap-2 text-[13px] text-[#374151]">
                  <span className="text-[#9CA3AF] mt-0.5">•</span>
                  <span>{obs}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mood */}
        <div className="mb-4">
          <SectionTitle title="情绪状态" />
          <span className="inline-block px-2.5 py-1 rounded-lg bg-[#EEF4FA] text-[13px] text-[#0052CC] font-medium">
            {report.mood}
          </span>
        </div>

        {/* Concerns */}
        {report.concerns.length > 0 && (
          <div className="mb-4">
            <SectionTitle title="关注事项" />
            <div className="space-y-1.5">
              {report.concerns.map((c, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[#FFF1D6]/50 border border-[#F59E0B]/20">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#976000" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span className="text-[13px] text-[#976000]">{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Satisfaction */}
        <div className="mb-4">
          <SectionTitle title="满意度" />
          <p className="text-[13px] text-[#374151]">{report.satisfaction}</p>
        </div>
      </div>
    </>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h3 className="text-[13px] font-semibold text-[#191C1E]">{title}</h3>
      <div className="flex-1 border-t border-[#F3F4F6]" />
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

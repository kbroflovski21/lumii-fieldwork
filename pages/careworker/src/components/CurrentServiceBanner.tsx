import { useState, useEffect, useMemo } from 'react'
import { mockTasks } from '../data/mock-data'
import type { ServicePhase } from '../data/use-badge'
import type { ServiceTask } from '../types'

interface Props {
  servicePhase: ServicePhase
  recordingStartTime: number | null
  recordingEndTime: number | null
}

const PRE_SERVICE_MINUTES = 15
const POST_SERVICE_WINDOW = 30 * 60 * 1000

const MOCK_CONTEXT: Record<string, { dietary?: string; lastNote?: string; familyConcern?: string }> = {
  '陈阿姨': { dietary: '低盐低糖', lastNote: '上次食欲下降，进食量约六成', familyConcern: '请留意是否按时吃药' },
  '李大爷': { dietary: '低脂', lastNote: '血压偏高(152/95)，睡眠质量下降', familyConcern: '注意血压变化' },
  '张奶奶': { lastNote: '行动较为缓慢，左膝关节有轻微疼痛', familyConcern: '注意防跌倒' },
  '赵叔叔': { lastNote: '轻微孤独感，精神状态一般', familyConcern: '多陪他聊聊天' },
  '刘阿姨': { lastNote: '上次因身体不适中止了助浴服务', familyConcern: '确认身体状况再开始服务' },
}

const SOP_BRIEF: Record<string, string[]> = {
  '助餐': ['确认禁忌', '食材检查', '备餐', '陪餐', '餐后清理', '记录'],
  '助浴': ['身体评估', '环境检查', '调温', '协助入浴', '清洗', '离浴穿衣', '记录'],
  '常规探访': ['问候确认', '健康询问', '环境检查', '心理关怀', '需求收集', '服务总结'],
  '康复训练': ['评估', '热身', '训练执行', '放松', '记录'],
  '健康监测': ['问候确认', '健康询问', '体征检查', '总结与满意度'],
  '助洁': ['到达确认', '清洁区域确认', '清洁执行', '物品归位', '服务总结'],
}

function findUpcomingTask(): ServiceTask | null {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayTasks = mockTasks.filter(t => t.date === todayStr && t.status === 'pending')
  for (const task of todayTasks) {
    const [h, m] = task.startTime.split(':').map(Number)
    const taskStart = new Date(now)
    taskStart.setHours(h, m, 0, 0)
    const diff = taskStart.getTime() - now.getTime()
    if (diff > 0 && diff <= PRE_SERVICE_MINUTES * 60 * 1000) return task
  }
  return null
}

function findCurrentTask(): ServiceTask | null {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayTasks = mockTasks.filter(t => t.date === todayStr && t.status === 'pending')
  if (todayTasks.length > 0) return todayTasks[0]
  return mockTasks.find(t => t.status === 'pending') || mockTasks[0]
}

export function CurrentServiceBanner({ servicePhase, recordingStartTime, recordingEndTime }: Props) {
  const [preTask, setPreTask] = useState<ServiceTask | null>(null)

  useEffect(() => {
    const check = () => setPreTask(findUpcomingTask())
    check()
    const timer = setInterval(check, 30000)
    return () => clearInterval(timer)
  }, [])

  if (servicePhase === 'active') {
    return <ActiveBanner task={findCurrentTask()} recordingStartTime={recordingStartTime} />
  }

  if (servicePhase === 'post_service') {
    return <PostBanner task={findCurrentTask()} recordingEndTime={recordingEndTime} />
  }

  if (preTask) {
    return <PreServiceBanner task={preTask} />
  }

  return null
}

function PreServiceBanner({ task }: { task: ServiceTask }) {
  const ctx = MOCK_CONTEXT[task.recipientName] || {}
  const sopSteps = SOP_BRIEF[task.serviceType] || []

  return (
    <div className="mx-4 mb-3 rounded-xl border border-[#F59E0B]/30 bg-[#FFFBEB] overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px]">🔔</span>
          <span className="text-[13px] font-semibold text-[#976000]">即将开始</span>
        </div>
        <span className="text-[12px] text-[#976000]">{task.startTime}</span>
      </div>
      <div className="px-3 pb-1">
        <span className="text-[14px] font-bold text-[#191C1E]">{task.serviceType}</span>
        <span className="text-[13px] text-[#374151] ml-1">· {task.recipientName} · {task.locationShort}</span>
      </div>

      <div className="mx-3 my-2 border-t border-[#F59E0B]/20" />

      <div className="px-3 pb-3 space-y-1.5">
        {ctx.dietary && (
          <div className="flex items-start gap-1.5 text-[12px] text-[#374151]">
            <span className="text-[#F59E0B] flex-shrink-0">⚠</span>
            <span>饮食禁忌：{ctx.dietary}</span>
          </div>
        )}
        {ctx.lastNote && (
          <div className="flex items-start gap-1.5 text-[12px] text-[#374151]">
            <span className="text-[#9CA3AF] flex-shrink-0">📋</span>
            <span>上次情况：{ctx.lastNote}</span>
          </div>
        )}
        {ctx.familyConcern && (
          <div className="flex items-start gap-1.5 text-[12px] text-[#374151]">
            <span className="text-[#9CA3AF] flex-shrink-0">👨‍👩‍👧</span>
            <span>家属关注：{ctx.familyConcern}</span>
          </div>
        )}
        {sopSteps.length > 0 && (
          <div className="flex items-start gap-1.5 text-[12px] text-[#374151]">
            <span className="text-[#9CA3AF] flex-shrink-0">📝</span>
            <span>SOP 要点：{sopSteps.join(' → ')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ActiveBanner({ task, recordingStartTime }: { task: ServiceTask | null; recordingStartTime: number | null }) {
  const [elapsed, setElapsed] = useState('00:00')
  const [sopChecked, setSopChecked] = useState<boolean[]>([])

  const sopSteps = useMemo(() => task ? (SOP_BRIEF[task.serviceType] || []) : [], [task])

  useEffect(() => {
    setSopChecked(new Array(sopSteps.length).fill(false))
  }, [sopSteps.length])

  useEffect(() => {
    if (!recordingStartTime) return
    const tick = () => {
      const s = Math.floor((Date.now() - recordingStartTime) / 1000)
      const m = Math.floor(s / 60)
      const sec = s % 60
      setElapsed(`${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`)
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [recordingStartTime])

  useEffect(() => {
    if (sopSteps.length === 0) return
    const timers: ReturnType<typeof setTimeout>[] = []
    sopSteps.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setSopChecked(prev => { const next = [...prev]; next[i] = true; return next })
      }, (i + 1) * 8000 + Math.random() * 4000))
    })
    return () => timers.forEach(clearTimeout)
  }, [sopSteps])

  const ctx = task ? (MOCK_CONTEXT[task.recipientName] || {}) : {}

  return (
    <div className="mx-4 mb-3 rounded-xl border border-[#EF4444]/30 bg-[#FEF2F2] overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="w-[8px] h-[8px] rounded-full bg-[#EF4444] animate-pulse" />
          <span className="text-[13px] font-semibold text-[#B42318]">服务进行中</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#9CA3AF]">⏱</span>
          <span className="text-[14px] font-mono font-bold text-[#B42318]">{elapsed}</span>
        </div>
      </div>
      {task && (
        <div className="px-3 pb-1">
          <span className="text-[14px] font-bold text-[#191C1E]">{task.serviceType}</span>
          <span className="text-[13px] text-[#374151] ml-1">· {task.recipientName} · {task.locationShort}</span>
        </div>
      )}

      <div className="mx-3 my-2 border-t border-[#EF4444]/15" />

      {sopSteps.length > 0 && (
        <div className="px-3 pb-2">
          <div className="text-[11px] text-[#9CA3AF] font-medium mb-1.5">SOP 进度</div>
          <div className="space-y-1">
            {sopSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                {sopChecked[i] ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  <div className="w-[14px] h-[14px] rounded border border-[#D1D5DB]" />
                )}
                <span className={sopChecked[i] ? 'text-[#6B7280]' : 'text-[#191C1E]'}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ctx.dietary && (
        <div className="px-3 pb-3">
          <div className="flex items-start gap-1.5 text-[12px] text-[#976000] bg-[#FFF1D6] rounded-md px-2 py-1.5">
            <span className="flex-shrink-0">⚠</span>
            <span>注意：{task?.recipientName}{ctx.dietary}饮食</span>
          </div>
        </div>
      )}
    </div>
  )
}

function PostBanner({ task, recordingEndTime }: { task: ServiceTask | null; recordingEndTime: number | null }) {
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!recordingEndTime) return
    const tick = () => {
      const left = POST_SERVICE_WINDOW - (Date.now() - recordingEndTime)
      if (left <= 0) { setRemaining('已过期'); return }
      const m = Math.floor(left / 60000)
      setRemaining(`${m}分钟内可编辑`)
    }
    tick()
    const timer = setInterval(tick, 10000)
    return () => clearInterval(timer)
  }, [recordingEndTime])

  const elapsed = useMemo(() => {
    if (!recordingEndTime || !task) return ''
    const startMatch = mockTasks.find(t => t.id === task.id)
    if (!startMatch) return ''
    return ''
  }, [recordingEndTime, task])

  return (
    <div className="mx-4 mb-3 rounded-xl border border-[#10B981]/30 bg-[#F0FDF4] overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          <span className="text-[13px] font-semibold text-[#116B4C]">服务已完成</span>
        </div>
      </div>
      {task && (
        <div className="px-3 pb-1">
          <span className="text-[14px] font-bold text-[#191C1E]">{task.serviceType}</span>
          <span className="text-[13px] text-[#374151] ml-1">· {task.recipientName} · {task.locationShort}</span>
        </div>
      )}

      <div className="mx-3 my-2 border-t border-[#10B981]/15" />

      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] text-[#374151] font-medium">补充说明</span>
          <span className="text-[11px] text-[#9CA3AF]">{remaining}</span>
        </div>
        {submitted ? (
          <div className="flex items-center gap-2 text-[12px] text-[#116B4C] bg-[#E0F4EC] rounded-lg px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#116B4C" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            补充说明已提交
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="输入补充说明..."
              className="flex-1 h-9 px-3 rounded-lg bg-white border border-[#E5E7EB] text-[13px] text-[#191C1E] outline-none focus:border-[#10B981] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]"
            />
            <button
              onClick={() => { if (note.trim()) setSubmitted(true) }}
              disabled={!note.trim()}
              className="px-3 h-9 rounded-lg bg-[#10B981] text-white text-[12px] font-medium disabled:opacity-40 active:bg-[#059669]"
            >
              提交
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

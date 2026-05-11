import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { CheckCircle2, FileText, Heart, ChevronRight, MessageSquare } from 'lucide-react'
import { todayTasks, elders } from '../../data/mock'

export default function ServiceComplete() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()

  // Use T001 (completed) as default
  const task = todayTasks.find(t => t.id === taskId) || todayTasks.find(t => t.id === 'T001')!
  const elder = elders.find(e => e.id === task.elderId) || task.elder

  const [workerNotes, setWorkerNotes] = useState(task.workerNotes || '')
  const [archived, setArchived] = useState(false)

  // Calculate stats
  const duration = task.actualDuration || task.estimatedDuration
  const sopCompleted = task.sopProgress.filter(s => s.status === 'completed').length
  const sopTotal = task.sopProgress.length
  const checkItemsTotal = task.sopProgress.reduce((sum, s) => sum + s.checkItems.length, 0)

  // Find next task (task after current one in the list)
  const currentIndex = todayTasks.findIndex(t => t.id === task.id)
  const nextTask = currentIndex >= 0 && currentIndex < todayTasks.length - 1
    ? todayTasks[currentIndex + 1]
    : null

  // AI-generated summary
  const aiSummary = task.aiNotes.length > 0
    ? task.aiNotes[task.aiNotes.length - 1]
    : `${elder.name}服务已完成，时长 ${duration} 分钟，SOP 全部执行。状态正常，无异常标记。`

  return (
    <div className="px-4">
      {/* Success Header */}
      <div className="text-center py-6">
        <div className="relative inline-flex items-center justify-center mb-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(22,163,74,0.08)',
              boxShadow: '0 0 0 8px rgba(22,163,74,0.04)',
            }}
          >
            <CheckCircle2
              size={36}
              style={{ color: '#16A34A' }}
              className="animate-bounce"
            />
          </div>
        </div>
        <h2 className="text-xl font-bold mb-1" style={{ color: '#191C1E' }}>
          服务完成
        </h2>
        <p className="text-sm" style={{ color: '#64748B' }}>
          {elder.name} · {task.serviceType}
        </p>
      </div>

      {/* AI Summary Card */}
      <div className="glass-card p-4 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,82,204,0.08)' }}>
            <span className="text-[10px] font-bold" style={{ color: '#0052CC' }}>AI</span>
          </div>
          <span className="text-xs font-semibold" style={{ color: '#0052CC' }}>
            AI 服务小结
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#434654' }}>
          {aiSummary}
        </p>
      </div>

      {/* Service Stats */}
      <div className="glass-card p-4 mb-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xl font-bold" style={{ color: '#0052CC' }}>
              {duration}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>分钟</div>
          </div>
          <div>
            <div className="text-xl font-bold" style={{ color: '#16A34A' }}>
              {sopCompleted}/{sopTotal}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>SOP 完成</div>
          </div>
          <div>
            <div className="text-xl font-bold" style={{ color: '#7C3AED' }}>
              {checkItemsTotal}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>检查项</div>
          </div>
        </div>
      </div>

      {/* Generated Documents */}
      <div className="space-y-3 mb-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {/* Service Log (Internal) */}
        <div className="glass-card p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,82,204,0.08)' }}>
              <FileText size={20} style={{ color: '#0052CC' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold" style={{ color: '#191C1E' }}>
                  服务日志
                </h4>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#F1F5F9', color: '#64748B' }}>
                  内部
                </span>
              </div>
              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#64748B' }}>
                {elder.name}，{elder.age}岁，{task.serviceType}服务。服务时长{duration}分钟，
                SOP {sopCompleted}/{sopTotal} 项完成。
                {task.alert ? `注意事项: ${task.alert}` : '无异常标记。'}
              </p>
              <button onClick={() => navigate(`/worker/log/${task.id}`)} className="text-xs font-medium mt-1.5 flex items-center gap-0.5"
                style={{ color: '#0052CC' }}>
                查看详情 <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Health Report (For Family) */}
        <div className="glass-card p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(22,163,74,0.08)' }}>
              <Heart size={20} style={{ color: '#16A34A' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold" style={{ color: '#191C1E' }}>
                  健康报告
                </h4>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(22,163,74,0.08)', color: '#16A34A' }}>
                  已推送给家属
                </span>
              </div>
              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#64748B' }}>
                今日为{elder.name}提供{task.serviceType}服务，整体状态
                {elder.health.moodStatus === 'normal' ? '良好' : '需关注'}。
                血压 {elder.health.bloodPressure}，
                {elder.health.medication}。
                {elder.health.moodStatus !== 'normal' ? '情绪方面需关注。' : ''}
              </p>
              <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: '#64748B' }}>
                <span>已推送至{elder.family.name}({elder.family.relation}) · {elder.family.pushChannel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Worker Notes */}
      <div className="glass-card p-4 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={16} style={{ color: '#434654' }} />
          <span className="text-sm font-bold" style={{ color: '#191C1E' }}>
            补充备注
          </span>
        </div>
        <textarea
          value={workerNotes}
          onChange={e => setWorkerNotes(e.target.value)}
          placeholder="添加补充说明（选填）..."
          rows={3}
          className="w-full text-sm rounded-xl p-3 resize-none outline-none transition-colors"
          style={{
            background: '#F7F9FB',
            border: '1px solid #E2E8F0',
            color: '#191C1E',
          }}
          onFocus={e => (e.target.style.borderColor = '#0052CC')}
          onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
        />
      </div>

      {/* Archive Button */}
      <button
        className="btn-primary w-full mb-3 md:max-w-lg md:mx-auto md:block"
        onClick={() => setArchived(true)}
        disabled={archived}
        style={archived ? { background: '#94A3B8', boxShadow: 'none' } : undefined}
      >
        {archived ? '已归档' : '确认归档'}
      </button>

      {/* Next Task Card */}
      {nextTask && (
        <div
          className="glass-card glass-card-hover p-4 cursor-pointer transition-all md:max-w-lg md:mx-auto"
          onClick={() => navigate('/worker')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,82,204,0.08)', color: '#0052CC' }}>
                  下一站
                </span>
                <span className="text-xs" style={{ color: '#64748B' }}>
                  {nextTask.scheduledTime}
                </span>
              </div>
              <h4 className="text-sm font-bold" style={{ color: '#191C1E' }}>
                {nextTask.elder.name} · {nextTask.serviceType}
              </h4>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                {nextTask.elder.address} · 预计{nextTask.estimatedDuration}分钟
              </p>
            </div>
            <ChevronRight size={20} style={{ color: '#94A3B8' }} />
          </div>
        </div>
      )}

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  )
}

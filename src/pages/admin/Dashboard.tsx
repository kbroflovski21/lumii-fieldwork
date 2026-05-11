import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Clock, Users, LayoutGrid, MessageSquare, CalendarDays, BarChart3 } from 'lucide-react'
import { kanbanTasks, workers } from '../../data/mock'

export default function Dashboard() {
  const totalTasks = kanbanTasks.length
  const inProgressCount = kanbanTasks.filter(t => t.status === 'in_progress').length
  const completedCount = kanbanTasks.filter(t => t.status === 'completed').length
  const alertCount = kanbanTasks.filter(t => t.alert).length

  const alertTasks = kanbanTasks.filter(t => t.alert && t.status !== 'completed')

  const getWorkerName = (workerId: string) =>
    workers.find(w => w.id === workerId)?.name || workerId

  const stats = [
    { label: '今日服务', value: `${totalTasks} 户`, icon: Users, color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
    { label: '进行中', value: String(inProgressCount), icon: Clock, color: '#0052CC', bg: 'rgba(0,82,204,0.08)' },
    { label: '已完成', value: String(completedCount), icon: CheckCircle, color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
    { label: '异常标记', value: String(alertCount), icon: AlertTriangle, color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  ]

  const quickActions = [
    { label: '实时看板', icon: LayoutGrid, path: '/admin/kanban', color: '#0052CC' },
    { label: 'Agent 对话', icon: MessageSquare, path: '/admin/chat', color: '#7C3AED' },
    { label: '排班调度', icon: CalendarDays, path: '/admin/schedule', color: '#F59E0B' },
    { label: '数据统计', icon: BarChart3, path: '/admin/stats', color: '#16A34A' },
  ]

  return (
    <div className="space-y-5 mt-2">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: stat.bg, color: stat.color }}
              >
                <stat.icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Today's Progress */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: '#191C1E' }}>
            今日进度
          </h2>
          <span className="text-xs font-semibold" style={{ color: '#7C3AED' }}>
            {completedCount}/{totalTasks} 完成
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(124,58,237,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(completedCount / totalTasks) * 100}%`,
              background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
            }}
          />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#64748B' }}>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#7C3AED' }} />
            已完成 {completedCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#0052CC' }} />
            进行中 {inProgressCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#94A3B8' }} />
            待服务 {totalTasks - completedCount - inProgressCount}
          </span>
        </div>
      </div>

      {/* Attention Needed */}
      {alertTasks.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#191C1E' }}>
            <AlertTriangle size={15} style={{ color: '#DC2626' }} />
            需要关注
          </h2>
          <div className="space-y-2.5">
            {alertTasks.map((task) => (
              <div
                key={task.id}
                className="glass-card p-4"
                style={{ borderLeft: '4px solid #DC2626' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold" style={{ color: '#191C1E' }}>
                        {task.elder.name}
                      </h3>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}
                      >
                        异常
                      </span>
                    </div>
                    <p className="text-xs mb-1.5" style={{ color: '#DC2626' }}>
                      {task.alert}
                    </p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#64748B' }}>
                      <span>{task.serviceType}</span>
                      <span>{task.scheduledTime}</span>
                      <span>负责: {getWorkerName(task.workerId)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold mb-3" style={{ color: '#191C1E' }}>
          快捷操作
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.path} to={action.path}>
              <div className="glass-card glass-card-hover p-4 text-center transition-all duration-200">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                  style={{ background: `${action.color}12`, color: action.color }}
                >
                  <action.icon size={20} />
                </div>
                <p className="text-xs font-semibold" style={{ color: '#434654' }}>
                  {action.label}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

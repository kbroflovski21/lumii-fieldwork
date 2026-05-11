import { Link } from 'react-router-dom'
import { UserCheck, LayoutDashboard, Heart } from 'lucide-react'

const endpoints = [
  {
    title: '社工端',
    subtitle: '一线服务 · 语音优先',
    description: '查看今日任务、到达确认、AI 实时督导、服务归档',
    icon: UserCheck,
    path: '/worker',
    color: '#0052CC',
    gradient: 'from-blue-500/10 to-indigo-500/10',
  },
  {
    title: '管理端',
    subtitle: '站长管理 · 智能调度',
    description: '排班调度、实时看板、Agent 对话、数据统计',
    icon: LayoutDashboard,
    path: '/admin',
    color: '#7C3AED',
    gradient: 'from-purple-500/10 to-pink-500/10',
  },
  {
    title: '家属端',
    subtitle: '健康报告 · 安心守护',
    description: '服务报告、健康趋势、历史记录、留言沟通',
    icon: Heart,
    path: '/family',
    color: '#16A34A',
    gradient: 'from-green-500/10 to-emerald-500/10',
  },
]

export default function Portal() {
  return (
    <div className="min-h-screen min-h-dvh bg-[var(--color-page-bg)]">
      <div className="mesh-bg" />
      <div className="relative z-10 max-w-lg mx-auto px-5 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(0,82,204,0.08)', color: '#0052CC' }}>
            H5 MVP 原型演示
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: '#191C1E' }}>
            <span style={{ color: '#0052CC' }}>金色年华</span>
            <br />养老智慧服务
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
            社区居家养老 AI 督导系统<br />
            语音优先 · 任务驱动 · Agent 协作
          </p>
        </div>

        {/* Endpoint Cards */}
        <div className="space-y-4">
          {endpoints.map((ep) => (
            <Link key={ep.path} to={ep.path} className="block">
              <div className={`glass-card glass-card-hover p-6 bg-gradient-to-br ${ep.gradient} transition-all duration-200`}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `${ep.color}12`, color: ep.color }}>
                    <ep.icon size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold" style={{ color: '#191C1E' }}>{ep.title}</h2>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${ep.color}10`, color: ep.color }}>
                        {ep.subtitle}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: '#64748B' }}>{ep.description}</p>
                  </div>
                  <div className="text-[var(--color-text-muted)] mt-1">→</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            金色年华 × Lumii AI · 2026 年 5 月
          </p>
        </div>
      </div>
    </div>
  )
}

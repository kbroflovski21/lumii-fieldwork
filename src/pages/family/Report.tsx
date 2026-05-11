import { Heart, Thermometer, Pill, Moon, Smile, Footprints, AlertTriangle, TrendingDown, TrendingUp, ArrowRight } from 'lucide-react'
import { elders } from '../../data/mock'

const elder = elders[0] // 王桂芬
const latest = elder.history[0] // 2026-05-09
const previous = elder.history[1] // 2026-05-07

const healthCards = [
  {
    label: '血压',
    value: '148/92',
    status: 'warning' as const,
    icon: Thermometer,
  },
  {
    label: '用药',
    value: '正常',
    status: 'normal' as const,
    icon: Pill,
  },
  {
    label: '睡眠',
    value: '偶有失眠',
    status: 'warning' as const,
    icon: Moon,
  },
  {
    label: '情绪',
    value: '良好',
    status: 'normal' as const,
    icon: Smile,
  },
  {
    label: '行动力',
    value: '正常',
    status: 'normal' as const,
    icon: Footprints,
  },
]

const statusColors = {
  normal: { bg: 'rgba(22, 163, 74, 0.10)', dot: '#16A34A', text: '#15803D' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', dot: '#F59E0B', text: '#B45309' },
  danger: { bg: 'rgba(220, 38, 38, 0.10)', dot: '#DC2626', text: '#B91C1C' },
}

const comparisons = [
  {
    label: '血压',
    before: '150/95',
    after: '148/92',
    direction: 'down' as const,
    improved: true,
  },
  {
    label: '情绪',
    before: '一般',
    after: '良好',
    direction: 'up' as const,
    improved: true,
  },
]

export default function FamilyReport() {
  return (
    <div className="space-y-4 pt-3 pb-6">
      {/* Report Header */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(22, 163, 74, 0.10)', color: '#16A34A' }}
          >
            <Heart size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#191C1E' }}>
              {elder.name}
            </h2>
            <p className="text-sm" style={{ color: '#64748B' }}>
              {elder.age}岁 · {elder.address}
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(22, 163, 74, 0.06)' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4" style={{ fontSize: '15px' }}>
            <div>
              <span style={{ color: '#64748B' }}>服务日期</span>
              <p className="font-semibold" style={{ color: '#191C1E' }}>2026年5月9日</p>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>服务类型</span>
              <p className="font-semibold" style={{ color: '#191C1E' }}>{latest.serviceType}</p>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>服务社工</span>
              <p className="font-semibold" style={{ color: '#191C1E' }}>{latest.workerName}</p>
            </div>
            <div>
              <span style={{ color: '#64748B' }}>服务时长</span>
              <p className="font-semibold" style={{ color: '#191C1E' }}>{latest.duration}分钟</p>
            </div>
          </div>
        </div>
      </div>

      {/* Health Indicator Cards */}
      <div>
        <h3
          className="text-base font-bold mb-3 px-1"
          style={{ color: '#191C1E', fontSize: '17px' }}
        >
          健康指标
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {healthCards.map((card) => {
            const colors = statusColors[card.status]
            return (
              <div
                key={card.label}
                className="glass-card p-4"
                style={{ background: colors.bg }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <card.icon size={18} style={{ color: colors.dot }} />
                  <span
                    className="text-sm font-medium"
                    style={{ color: '#64748B' }}
                  >
                    {card.label}
                  </span>
                  <span
                    className="ml-auto w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: colors.dot }}
                  />
                </div>
                <p
                  className="font-bold"
                  style={{ color: colors.text, fontSize: '18px' }}
                >
                  {card.value}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Service Content Summary */}
      <div>
        <h3
          className="text-base font-bold mb-3 px-1"
          style={{ color: '#191C1E', fontSize: '17px' }}
        >
          服务内容
        </h3>
        <div className="glass-card p-5">
          <p
            className="leading-relaxed"
            style={{ color: '#434654', fontSize: '16px', lineHeight: '1.75' }}
          >
            {latest.summary}
          </p>
        </div>
      </div>

      {/* Alerts Section */}
      {latest.alerts.length > 0 && (
        <div>
          <h3
            className="text-base font-bold mb-3 px-1"
            style={{ color: '#191C1E', fontSize: '17px' }}
          >
            关注提醒
          </h3>
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(220, 38, 38, 0.08))',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(245, 158, 11, 0.15)' }}
              >
                <AlertTriangle size={20} style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <p
                  className="font-bold mb-1.5"
                  style={{ color: '#B45309', fontSize: '16px' }}
                >
                  血压偏高
                </p>
                <p
                  className="leading-relaxed"
                  style={{ color: '#92400E', fontSize: '15px', lineHeight: '1.7' }}
                >
                  血压 148/92 仍偏高，建议持续关注，必要时就医复查
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison with Previous Visit */}
      <div>
        <h3
          className="text-base font-bold mb-3 px-1"
          style={{ color: '#191C1E', fontSize: '17px' }}
        >
          与上次对比
        </h3>
        <div className="glass-card p-5">
          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
            {comparisons.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span
                  className="text-sm font-medium w-10 shrink-0"
                  style={{ color: '#64748B', fontSize: '15px' }}
                >
                  {item.label}
                </span>
                <div className="flex items-center gap-2 flex-1">
                  <span
                    className="font-medium"
                    style={{ color: '#94A3B8', fontSize: '15px' }}
                  >
                    {item.before}
                  </span>
                  <ArrowRight size={14} style={{ color: '#94A3B8' }} />
                  <span
                    className="font-bold"
                    style={{ color: '#191C1E', fontSize: '16px' }}
                  >
                    {item.after}
                  </span>
                  {item.direction === 'down' ? (
                    <TrendingDown size={18} style={{ color: '#16A34A' }} />
                  ) : (
                    <TrendingUp size={18} style={{ color: '#16A34A' }} />
                  )}
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(22, 163, 74, 0.10)', color: '#16A34A' }}
                >
                  好转
                </span>
              </div>
            ))}
          </div>

          <div
            className="mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={18} style={{ color: '#16A34A' }} />
              <span
                className="font-bold"
                style={{ color: '#16A34A', fontSize: '16px' }}
              >
                整体趋势向好
              </span>
            </div>
            <p
              className="mt-1.5"
              style={{ color: '#64748B', fontSize: '14px' }}
            >
              血压较上次下降，情绪有所改善，请继续关注用药及日常作息。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

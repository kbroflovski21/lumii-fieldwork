import { TrendingUp, Users, AlertTriangle, CheckCircle } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { statsData } from '../../data/mock'

const PIE_COLORS = ['#0052CC', '#7C3AED', '#F59E0B', '#16A34A', '#DC2626']

const summaryStats = [
  { label: '本月服务', value: '198 次', icon: Users, color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  { label: '平均 SOP 完成率', value: '91.7%', icon: CheckCircle, color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
  { label: '异常率', value: '6.1%', icon: AlertTriangle, color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
]

export default function Stats() {
  return (
    <div className="space-y-5 mt-2">
      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-3">
        {summaryStats.map((stat) => (
          <div key={stat.label} className="glass-card p-3 text-center">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5"
              style={{ background: stat.bg, color: stat.color }}
            >
              <stat.icon size={16} />
            </div>
            <p className="text-lg font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Chart 1: Weekly Services Bar Chart */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} style={{ color: '#7C3AED' }} />
          <h3 className="text-sm font-bold" style={{ color: '#191C1E' }}>
            本周服务量
          </h3>
        </div>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={statsData.weeklyServices} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value} 次`, '服务量']}
              />
              <Bar dataKey="count" fill="#7C3AED" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: SOP Completion Horizontal Bar */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={15} style={{ color: '#16A34A' }} />
          <h3 className="text-sm font-bold" style={{ color: '#191C1E' }}>
            SOP完成率排行
          </h3>
        </div>
        <div className="space-y-3">
          {statsData.sopCompletion.map((item, idx) => {
            const colors = ['#7C3AED', '#0052CC', '#16A34A']
            const color = colors[idx] || '#64748B'
            return (
              <div key={item.worker}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: color }}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium" style={{ color: '#191C1E' }}>
                      {item.worker}
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color }}>
                    {item.rate}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.04)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.rate}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}CC)`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chart 3: Alert Types Pie Chart */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={15} style={{ color: '#F59E0B' }} />
          <h3 className="text-sm font-bold" style={{ color: '#191C1E' }}>
            异常类型分布
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div style={{ width: 160, height: 160 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statsData.alertTypes}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={35}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {statsData.alertTypes.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} 次`, '数量']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {statsData.alertTypes.map((item, idx) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-xs" style={{ color: '#434654' }}>
                    {item.type}
                  </span>
                </div>
                <span className="text-xs font-bold" style={{ color: '#191C1E' }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart 4: Monthly Trend Line Chart */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} style={{ color: '#0052CC' }} />
          <h3 className="text-sm font-bold" style={{ color: '#191C1E' }}>
            月度服务趋势
          </h3>
        </div>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={statsData.monthlyTrend} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                iconType="circle"
                iconSize={8}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="services"
                name="服务次数"
                stroke="#0052CC"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0052CC', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#0052CC', strokeWidth: 2, stroke: 'white' }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="alerts"
                name="异常次数"
                stroke="#DC2626"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#DC2626', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#DC2626', strokeWidth: 2, stroke: 'white' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

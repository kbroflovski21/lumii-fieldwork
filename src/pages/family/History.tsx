import { useState } from 'react'
import { Clock, User, AlertTriangle, ChevronDown, ChevronUp, Activity, TrendingDown } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { elders } from '../../data/mock'

const elder = elders[0] // 王桂芬
const history = elder.history // 5 records

// Prepare chart data in chronological order (oldest first)
const chartData = [...history]
  .reverse()
  .map((r) => ({
    date: r.date.slice(5), // "04-30" format
    label: `${parseInt(r.date.slice(5, 7))}/${parseInt(r.date.slice(8))}`,
    systolic: r.bpSystolic,
    diastolic: r.bpDiastolic,
  }))

const moodColors: Record<string, { bg: string; dot: string }> = {
  '良好': { bg: 'rgba(22, 163, 74, 0.10)', dot: '#16A34A' },
  '一般': { bg: 'rgba(245, 158, 11, 0.12)', dot: '#F59E0B' },
  '低落': { bg: 'rgba(220, 38, 38, 0.10)', dot: '#DC2626' },
}

const medicationColors: Record<string, { bg: string; dot: string }> = {
  '正常': { bg: 'rgba(22, 163, 74, 0.10)', dot: '#16A34A' },
  '漏服': { bg: 'rgba(220, 38, 38, 0.10)', dot: '#DC2626' },
  '调整': { bg: 'rgba(245, 158, 11, 0.12)', dot: '#F59E0B' },
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-xl px-3 py-2 text-xs"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <p className="font-medium" style={{ color: '#191C1E' }}>{label}</p>
        <p style={{ color: '#0052CC' }}>
          收缩压: <span className="font-bold">{payload[0].value}</span> mmHg
        </p>
      </div>
    )
  }
  return null
}

function TimelineCard({ record, index }: { record: (typeof history)[0]; index: number }) {
  const [expanded, setExpanded] = useState(index === 0)
  const mood = moodColors[record.mood] || moodColors['一般']
  const med = medicationColors[record.medication] || medicationColors['正常']
  const hasAlerts = record.alerts.length > 0

  const dateStr = `${parseInt(record.date.slice(5, 7))}月${parseInt(record.date.slice(8))}日`

  return (
    <div className="relative pl-6">
      {/* Timeline dot and line */}
      <div
        className="absolute left-0 top-2 w-3 h-3 rounded-full border-2"
        style={{
          borderColor: index === 0 ? '#16A34A' : '#CBD5E1',
          background: index === 0 ? '#16A34A' : '#F1F5F9',
        }}
      />
      {index < history.length - 1 && (
        <div
          className="absolute left-[5px] top-5 w-0.5 bottom-0"
          style={{ background: '#E2E8F0' }}
        />
      )}

      <div className="glass-card p-4 mb-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: '#191C1E', fontSize: '16px' }}>
              {dateStr}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0, 82, 204, 0.08)', color: '#0052CC' }}
            >
              {record.serviceType}
            </span>
          </div>
          {hasAlerts && (
            <AlertTriangle size={16} style={{ color: '#F59E0B' }} />
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs mb-3" style={{ color: '#64748B' }}>
          <span className="flex items-center gap-1">
            <User size={12} />
            {record.workerName}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {record.duration}分钟
          </span>
        </div>

        {/* Key metrics */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Blood pressure */}
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
            style={{
              background: record.bpSystolic >= 140 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(22, 163, 74, 0.10)',
              color: record.bpSystolic >= 140 ? '#B45309' : '#15803D',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: record.bpSystolic >= 140 ? '#F59E0B' : '#16A34A' }}
            />
            血压 {record.bloodPressure}
          </span>

          {/* Medication */}
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
            style={{ background: med.bg, color: record.medication === '正常' ? '#15803D' : '#B91C1C' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: med.dot }} />
            用药{record.medication}
          </span>

          {/* Mood */}
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
            style={{ background: mood.bg, color: record.mood === '良好' ? '#15803D' : record.mood === '一般' ? '#B45309' : '#B91C1C' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: mood.dot }} />
            情绪{record.mood}
          </span>
        </div>

        {/* Alerts */}
        {hasAlerts && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {record.alerts.map((alert, i) => (
              <span
                key={i}
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#B45309' }}
              >
                {alert}
              </span>
            ))}
          </div>
        )}

        {/* Summary with expand toggle */}
        <div>
          <p
            className={expanded ? '' : 'line-clamp-2'}
            style={{ color: '#434654', fontSize: '15px', lineHeight: '1.7' }}
          >
            {record.summary}
          </p>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-1.5 text-xs font-medium"
            style={{ color: '#0052CC', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {expanded ? (
              <>
                收起 <ChevronUp size={14} />
              </>
            ) : (
              <>
                展开 <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FamilyHistory() {
  // Calculate monthly summary stats
  const mayRecords = history.filter((r) => r.date.startsWith('2026-05'))
  const firstBp = mayRecords.length > 0 ? mayRecords[mayRecords.length - 1].bpSystolic : 0
  const lastBp = mayRecords.length > 0 ? mayRecords[0].bpSystolic : 0

  return (
    <div className="space-y-4 pt-3 pb-6">
      {/* Blood Pressure Trend Chart */}
      <div>
        <h3
          className="text-base font-bold mb-3 px-1"
          style={{ color: '#191C1E', fontSize: '17px' }}
        >
          血压趋势
        </h3>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} style={{ color: '#0052CC' }} />
            <span className="text-sm font-medium" style={{ color: '#434654' }}>
              收缩压 (mmHg)
            </span>
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(220, 38, 38, 0.08)', color: '#DC2626' }}
            >
              警戒线 140
            </span>
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[120, 160]}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={140}
                  stroke="#DC2626"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={undefined}
                />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  stroke="#0052CC"
                  strokeWidth={2.5}
                  dot={{ fill: '#0052CC', strokeWidth: 2, r: 4, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h3
          className="text-base font-bold mb-3 px-1"
          style={{ color: '#191C1E', fontSize: '17px' }}
        >
          服务记录
        </h3>
        <div>
          {history.map((record, index) => (
            <TimelineCard key={record.date} record={record} index={index} />
          ))}
        </div>
      </div>

      {/* Monthly Health Summary */}
      <div>
        <h3
          className="text-base font-bold mb-3 px-1"
          style={{ color: '#191C1E', fontSize: '17px' }}
        >
          月度健康摘要
        </h3>
        <div
          className="glass-card p-5"
          style={{ background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.08), rgba(0, 82, 204, 0.06))' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={18} style={{ color: '#16A34A' }} />
            <span className="font-bold" style={{ color: '#191C1E', fontSize: '17px' }}>
              2026年5月
            </span>
          </div>
          <p
            className="leading-relaxed"
            style={{ color: '#434654', fontSize: '16px', lineHeight: '1.75' }}
          >
            本月服务 {mayRecords.length} 次，血压呈下降趋势（{firstBp}&rarr;{lastBp}），用药规律，建议继续监测。
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(22, 163, 74, 0.10)', color: '#16A34A' }}
            >
              用药规律
            </span>
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(22, 163, 74, 0.10)', color: '#16A34A' }}
            >
              血压下降趋势
            </span>
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(245, 158, 11, 0.10)', color: '#B45309' }}
            >
              继续监测
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

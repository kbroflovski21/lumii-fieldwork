import { useState } from 'react'
import { CalendarDays, MapPin, Clock, CheckCircle, Sparkles, AlertTriangle, Route } from 'lucide-react'
import { workers, elders } from '../../data/mock'

interface ScheduleAssignment {
  elderId: string
  elderName: string
  serviceType: string
  address: string
  time: string
  hasAlert: boolean
  alertText?: string
}

interface WorkerSchedule {
  workerId: string
  workerName: string
  assignments: ScheduleAssignment[]
}

// Tomorrow's suggested schedule from the Agent chat
const tomorrowSchedule: WorkerSchedule[] = [
  {
    workerId: 'W001',
    workerName: '李小明',
    assignments: [
      {
        elderId: 'E001',
        elderName: '王桂芬',
        serviceType: '探访关爱',
        address: '翠苑一区 3-201',
        time: '09:00',
        hasAlert: false,
      },
      {
        elderId: 'E003',
        elderName: '刘秀英',
        serviceType: '探访关爱',
        address: '翠苑二区 7-103',
        time: '10:00',
        hasAlert: true,
        alertText: '情绪异常，需重点关注',
      },
      {
        elderId: 'E005',
        elderName: '赵德明',
        serviceType: '康复训练',
        address: '文二路 88-1002',
        time: '14:00',
        hasAlert: true,
        alertText: '血压偏高，注意观察',
      },
    ],
  },
  {
    workerId: 'W002',
    workerName: '张晓华',
    assignments: [
      {
        elderId: 'E004',
        elderName: '陈玉兰',
        serviceType: '助医陪诊',
        address: '古荡湾北苑 15-301',
        time: '09:30',
        hasAlert: false,
      },
      {
        elderId: 'E002',
        elderName: '张福来',
        serviceType: '助浴',
        address: '文三路 12-502',
        time: '14:00',
        hasAlert: false,
      },
    ],
  },
]

export default function Schedule() {
  const [confirmed, setConfirmed] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<string>(tomorrowSchedule[0].workerId)

  const totalAssignments = tomorrowSchedule.reduce((sum, w) => sum + w.assignments.length, 0)
  const alertCount = tomorrowSchedule.reduce(
    (sum, w) => sum + w.assignments.filter(a => a.hasAlert).length,
    0
  )

  const selectedSchedule = tomorrowSchedule.find(w => w.workerId === selectedWorker)

  return (
    <div className="space-y-4 mt-2">
      {/* Date Header */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}
            >
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#191C1E' }}>
                明日排班 &middot; 5月12日 周一
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                共 {totalAssignments} 户服务 &middot; {tomorrowSchedule.length} 名社工
                {alertCount > 0 && (
                  <span style={{ color: '#DC2626' }}> &middot; {alertCount} 个关注</span>
                )}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}
          >
            <Sparkles size={11} />
            Agent 建议
          </div>
        </div>
      </div>

      {/* Desktop: Two Column / Mobile: Stack */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        {/* Left: Worker List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold px-1 mb-2" style={{ color: '#64748B' }}>
            社工列表
          </h3>
          {tomorrowSchedule.map((ws) => {
            const isSelected = ws.workerId === selectedWorker
            const workerAlerts = ws.assignments.filter(a => a.hasAlert).length
            return (
              <button
                key={ws.workerId}
                onClick={() => setSelectedWorker(ws.workerId)}
                className={`w-full text-left glass-card p-3.5 transition-all duration-200 ${
                  isSelected ? '' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  borderLeft: isSelected ? '4px solid #7C3AED' : '4px solid transparent',
                  borderRadius: '14px',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: '#7C3AED' }}
                    >
                      {ws.workerName.charAt(ws.workerName.length - 1)}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#191C1E' }}>
                        {ws.workerName}
                      </p>
                      <p className="text-[10px]" style={{ color: '#64748B' }}>
                        {ws.assignments.length} 户服务
                        {workerAlerts > 0 && (
                          <span style={{ color: '#DC2626' }}> &middot; {workerAlerts} 关注</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full" style={{ background: '#7C3AED' }} />
                  )}
                </div>

                {/* Mini route visualization */}
                <div className="flex items-center gap-1 mt-2.5 pl-1">
                  <Route size={11} style={{ color: '#7C3AED' }} />
                  <div className="flex items-center gap-0.5 text-[10px]" style={{ color: '#64748B' }}>
                    {ws.assignments.map((a, idx) => (
                      <span key={a.elderId} className="flex items-center gap-0.5">
                        {idx > 0 && <span style={{ color: '#CBD5E1' }}>&rarr;</span>}
                        <span className="font-medium">{a.elderName.slice(0, 2)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right: Elder Assignments */}
        <div>
          <h3 className="text-xs font-bold px-1 mb-2" style={{ color: '#64748B' }}>
            服务安排 &middot; {selectedSchedule?.workerName}
          </h3>
          <div className="space-y-3">
            {selectedSchedule?.assignments.map((assignment, idx) => (
              <div
                key={assignment.elderId}
                className="glass-card p-4"
                style={{
                  borderLeft: assignment.hasAlert ? '3px solid #DC2626' : '3px solid transparent',
                  borderRadius: '14px',
                }}
              >
                {/* Order number */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold" style={{ color: '#191C1E' }}>
                        {assignment.elderName}
                      </h4>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                        style={{ background: 'rgba(0,82,204,0.06)', color: '#0052CC' }}
                      >
                        {assignment.serviceType}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#64748B' }}>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {assignment.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {assignment.address}
                      </span>
                    </div>
                    {assignment.hasAlert && (
                      <div
                        className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ background: 'rgba(220,38,38,0.06)', color: '#DC2626' }}
                      >
                        <AlertTriangle size={11} />
                        <span>{assignment.alertText}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="pt-2 pb-4">
        {confirmed ? (
          <div
            className="glass-card p-4 text-center"
            style={{ borderLeft: '4px solid #16A34A', borderRadius: '14px' }}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle size={18} style={{ color: '#16A34A' }} />
              <span className="text-sm font-bold" style={{ color: '#16A34A' }}>
                排班已确认
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>
              已通知 {tomorrowSchedule.length} 名社工，任务将在明日 08:00 推送
            </p>
          </div>
        ) : (
          <button
            onClick={() => setConfirmed(true)}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.99]"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
            }}
          >
            确认排班
          </button>
        )}
      </div>
    </div>
  )
}

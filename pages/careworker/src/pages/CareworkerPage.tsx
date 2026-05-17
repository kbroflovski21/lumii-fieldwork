import { useState } from 'react'
import { LoginScreen } from '../components/LoginScreen'
import { CalendarView } from '../components/CalendarView'
import { ReferenceList } from '../components/ReferenceList'
import { TaskDetailDrawer } from '../components/TaskDetailDrawer'
import { SopDetailDrawer } from '../components/SopDetailDrawer'
import { demoUser } from '../data/mock-data'
import type { ServiceTask, SopFolder } from '../types'

type Tab = 'tasks' | 'reference'

export function CareworkerPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('tasks')
  const [selectedTask, setSelectedTask] = useState<ServiceTask | null>(null)
  const [selectedSop, setSelectedSop] = useState<SopFolder | null>(null)

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />
  }

  return (
    <div className="flex flex-col h-screen bg-[#F7F9FB]">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 bg-white border-b border-[#E5E7EB]" style={{ height: 56 }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0052CC] flex items-center justify-center text-white text-sm font-bold">
            {demoUser.name[0]}
          </div>
          <div>
            <div className="text-[15px] font-bold text-[#191C1E] leading-tight">{demoUser.name}</div>
            <div className="text-[11px] text-[#9CA3AF] leading-tight">{demoUser.region} · {demoUser.role}</div>
          </div>
        </div>
        <div className="text-[12px] text-[#9CA3AF]">
          {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'tasks' && (
          <CalendarView onSelectTask={setSelectedTask} />
        )}
        {activeTab === 'reference' && (
          <ReferenceList onSelectSop={setSelectedSop} />
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="flex-shrink-0 flex bg-white border-t border-[#E5E7EB]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <button
          className="flex-1 flex flex-col items-center justify-center py-2"
          style={{ minHeight: 52 }}
          onClick={() => setActiveTab('tasks')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'tasks' ? '#0052CC' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className={`text-[10px] mt-0.5 ${activeTab === 'tasks' ? 'text-[#0052CC] font-semibold' : 'text-[#9CA3AF]'}`}>
            我的任务
          </span>
        </button>
        <button
          className="flex-1 flex flex-col items-center justify-center py-2"
          style={{ minHeight: 52 }}
          onClick={() => setActiveTab('reference')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'reference' ? '#0052CC' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span className={`text-[10px] mt-0.5 ${activeTab === 'reference' ? 'text-[#0052CC] font-semibold' : 'text-[#9CA3AF]'}`}>
            参考资料
          </span>
        </button>
      </nav>

      {/* Drawers */}
      {selectedTask && (
        <TaskDetailDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
      {selectedSop && (
        <SopDetailDrawer sop={selectedSop} onClose={() => setSelectedSop(null)} />
      )}
    </div>
  )
}

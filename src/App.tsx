import { HashRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import Portal from './pages/Portal'
import TaskList from './pages/worker/TaskList'
import ServiceSession from './pages/worker/ServiceSession'
import ServiceComplete from './pages/worker/ServiceComplete'
import ServiceLog from './pages/worker/ServiceLog'
import AdminDashboard from './pages/admin/Dashboard'
import Kanban from './pages/admin/Kanban'
import AgentChat from './pages/admin/AgentChat'
import Schedule from './pages/admin/Schedule'
import Stats from './pages/admin/Stats'
import FamilyReport from './pages/family/Report'
import FamilyHistory from './pages/family/History'
import FamilyMessages from './pages/family/Messages'
import { ArrowLeft, Home } from 'lucide-react'

function BackNav({ title, color }: { title: string; color?: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  // Determine parent route
  const segments = location.pathname.split('/')
  const parentPath = segments.length > 2 ? '/' + segments[1] : '/'
  
  return (
    <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(247,249,251,0.85)', backdropFilter: 'blur(20px)' }}>
      <button onClick={() => navigate(parentPath)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors">
        <ArrowLeft size={20} />
      </button>
      <h1 className="text-base font-semibold" style={{ color: color || '#191C1E' }}>{title}</h1>
      <div className="ml-auto">
        <Link to="/" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors">
          <Home size={18} />
        </Link>
      </div>
    </div>
  )
}

// Layout wrapper for worker pages
function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-h-dvh bg-[var(--color-page-bg)]">
      <div className="mesh-bg" />
      <div className="relative z-10 max-w-3xl mx-auto pb-8">
        {children}
      </div>
    </div>
  )
}

// Layout wrapper for admin pages with tab navigation
function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const tabs = [
    { path: '/admin', label: '看板', icon: '📊' },
    { path: '/admin/kanban', label: '实时', icon: '📋' },
    { path: '/admin/chat', label: 'Agent', icon: '🤖' },
    { path: '/admin/schedule', label: '排班', icon: '📅' },
    { path: '/admin/stats', label: '统计', icon: '📈' },
  ]
  return (
    <div className="min-h-screen min-h-dvh bg-[var(--color-page-bg)]">
      <div className="mesh-bg" />
      <div className="relative z-10">
        <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(247,249,251,0.85)', backdropFilter: 'blur(20px)' }}>
          <Link to="/" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-base font-bold text-[var(--color-primary)]">管理端</h1>
          <span className="text-xs text-[var(--color-text-muted)]">西湖区翠苑街道站</span>
        </div>
        {/* Tab bar */}
        <div className="sticky top-[52px] z-40 px-4 pb-2 flex gap-1 overflow-x-auto" style={{ background: 'rgba(247,249,251,0.85)', backdropFilter: 'blur(20px)' }}>
          {tabs.map(tab => {
            const isActive = tab.path === '/admin' 
              ? location.pathname === '/admin' || location.pathname === '/admin/'
              : location.pathname.startsWith(tab.path)
            return (
              <Link key={tab.path} to={tab.path}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-[var(--color-primary)] text-white shadow-md' 
                    : 'text-[var(--color-text-secondary)] hover:bg-white/60'
                }`}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-8">
          {children}
        </div>
      </div>
    </div>
  )
}

// Layout for family pages
function FamilyLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const tabs = [
    { path: '/family', label: '最新报告' },
    { path: '/family/history', label: '历史记录' },
    { path: '/family/messages', label: '留言' },
  ]
  return (
    <div className="min-h-screen min-h-dvh bg-[var(--color-page-bg)]">
      <div className="mesh-bg" />
      <div className="relative z-10 max-w-3xl mx-auto pb-8">
        <div className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(247,249,251,0.85)', backdropFilter: 'blur(20px)' }}>
          <Link to="/" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-base font-bold" style={{ color: '#16A34A' }}>家属端</h1>
          <span className="text-xs text-[var(--color-text-muted)]">王桂芬的健康档案</span>
        </div>
        <div className="sticky top-[52px] z-40 px-4 pb-2 flex gap-1 max-w-md" style={{ background: 'rgba(247,249,251,0.85)', backdropFilter: 'blur(20px)' }}>
          {tabs.map(tab => {
            const isActive = tab.path === '/family'
              ? location.pathname === '/family' || location.pathname === '/family/'
              : location.pathname.startsWith(tab.path)
            return (
              <Link key={tab.path} to={tab.path}
                className={`flex-1 text-center py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#16A34A] text-white shadow-md'
                    : 'text-[var(--color-text-secondary)] hover:bg-white/60'
                }`}>
                {tab.label}
              </Link>
            )
          })}
        </div>
        <div className="px-4">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Portal />} />
        {/* Worker routes */}
        <Route path="/worker" element={<WorkerLayout><TaskList /></WorkerLayout>} />
        <Route path="/worker/session/:taskId" element={<WorkerLayout><BackNav title="服务进行中" color="#0052CC" /><ServiceSession /></WorkerLayout>} />
        <Route path="/worker/complete/:taskId" element={<WorkerLayout><BackNav title="服务完成" color="#16A34A" /><ServiceComplete /></WorkerLayout>} />
        <Route path="/worker/log/:taskId" element={<WorkerLayout><BackNav title="服务日志" color="#7C3AED" /><ServiceLog /></WorkerLayout>} />
        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/kanban" element={<AdminLayout><Kanban /></AdminLayout>} />
        <Route path="/admin/chat" element={<AdminLayout><AgentChat /></AdminLayout>} />
        <Route path="/admin/schedule" element={<AdminLayout><Schedule /></AdminLayout>} />
        <Route path="/admin/stats" element={<AdminLayout><Stats /></AdminLayout>} />
        {/* Family routes */}
        <Route path="/family" element={<FamilyLayout><FamilyReport /></FamilyLayout>} />
        <Route path="/family/history" element={<FamilyLayout><FamilyHistory /></FamilyLayout>} />
        <Route path="/family/messages" element={<FamilyLayout><FamilyMessages /></FamilyLayout>} />
      </Routes>
    </HashRouter>
  )
}

export { BackNav, WorkerLayout, AdminLayout, FamilyLayout }

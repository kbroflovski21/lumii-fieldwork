import { useState } from 'react'

interface Props {
  onLogin: () => void
}

export function LoginScreen({ onLogin }: Props) {
  const [username] = useState('王建国-余杭站-护理服务人员')
  const [password] = useState('demo1234')
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onLogin()
    }, 600)
  }

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#0052CC] to-[#3B82F6] flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-[20px] font-bold text-[#191C1E]">金色年华</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1">养老智慧服务平台</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl p-5 border border-[#E5E7EB]">
          <div className="mb-4">
            <label className="block text-[12px] text-[#374151] font-medium mb-1.5">用户名</label>
            <input
              type="text"
              value={username}
              readOnly
              className="w-full h-11 px-3 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[14px] text-[#191C1E] outline-none focus:border-[#0052CC] focus:shadow-[0_0_0_3px_rgba(0,82,204,0.08)]"
            />
          </div>
          <div className="mb-5">
            <label className="block text-[12px] text-[#374151] font-medium mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              readOnly
              className="w-full h-11 px-3 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[14px] text-[#191C1E] outline-none focus:border-[#0052CC] focus:shadow-[0_0_0_3px_rgba(0,82,204,0.08)]"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-11 rounded-lg bg-[#0052CC] text-white text-[13px] font-semibold hover:bg-[#003D99] active:bg-[#003080] disabled:opacity-60 transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>

        <p className="text-center text-[11px] text-[#9CA3AF] mt-6">智慧养老服务平台</p>
      </div>
    </div>
  )
}

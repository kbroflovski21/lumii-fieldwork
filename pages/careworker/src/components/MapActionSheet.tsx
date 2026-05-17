import { useEffect } from 'react'

interface Props {
  address: string
  onClose: () => void
}

const MAP_APPS = [
  { name: '百度地图', icon: '🗺️', color: '#3385FF' },
  { name: '高德地图', icon: '🧭', color: '#00B2A9' },
  { name: '腾讯地图', icon: '📍', color: '#3DC24B' },
]

export function MapActionSheet({ address, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white rounded-t-xl overflow-hidden animate-sheet-up" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="px-4 pt-4 pb-2">
          <p className="text-[13px] text-[#9CA3AF] text-center">在以下 App 中打开</p>
          <p className="text-[12px] text-[#374151] text-center mt-1 truncate">{address}</p>
        </div>

        <div className="px-4 py-2">
          {MAP_APPS.map(app => (
            <button
              key={app.name}
              onClick={() => {
                alert(`即将在「${app.name}」中打开：\n${address}\n\n（Demo 模式，未实际唤醒应用）`)
                onClose()
              }}
              className="w-full flex items-center gap-3 py-3 border-b border-[#F3F4F6] last:border-b-0 active:bg-[#F9FAFB]"
            >
              <span className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px]" style={{ backgroundColor: app.color + '15' }}>
                {app.icon}
              </span>
              <span className="text-[14px] text-[#191C1E] font-medium">{app.name}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" className="ml-auto">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>

        <div className="px-4 pb-3 pt-1">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-lg bg-[#F3F4F6] text-[14px] font-medium text-[#374151] active:bg-[#E5E7EB]"
          >
            取消
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-sheet-up {
          animation: sheet-up 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}

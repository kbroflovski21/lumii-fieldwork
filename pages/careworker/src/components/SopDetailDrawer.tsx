import { useEffect } from 'react'
import type { SopFolder } from '../types'

interface Props {
  sop: SopFolder
  onClose: () => void
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-[14px] font-bold text-[#191C1E] mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-[15px] font-bold text-[#191C1E] mt-5 mb-2 pb-1 border-b border-[#F3F4F6]">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-[17px] font-bold text-[#191C1E] mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[#191C1E]">$1</strong>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 py-0.5 pl-1"><span class="text-[#9CA3AF] text-[12px] flex-shrink-0">$1.</span><span class="text-[13px] text-[#374151] leading-relaxed">$2</span></div>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 py-0.5 pl-1"><span class="text-[#9CA3AF] text-[12px]">•</span><span class="text-[13px] text-[#374151] leading-relaxed">$1</span></div>')
    .replace(/\n\n/g, '<div class="h-2"></div>')
}

export function SopDetailDrawer({ sop, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div
        className="relative bg-white rounded-t-xl overflow-hidden animate-slide-up"
        style={{ maxHeight: '86vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EEF4FA] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#191C1E] leading-tight">{sop.name}</h2>
              <p className="text-[11px] text-[#9CA3AF]">v{sop.version} · 更新于 {sop.updatedAt}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6]"
            aria-label="关闭"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div
          className="overflow-y-auto px-4 py-4 scrollbar-thin"
          style={{ maxHeight: 'calc(86vh - 60px)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(sop.content) }}
        />
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

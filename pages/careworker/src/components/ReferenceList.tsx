import { mockSops } from '../data/mock-data'
import type { SopFolder } from '../types'

interface Props {
  onSelectSop: (sop: SopFolder) => void
}

export function ReferenceList({ onSelectSop }: Props) {
  const generalSops = mockSops.filter(s => s.type === 'general')
  const serviceSops = mockSops.filter(s => s.type === 'service')

  return (
    <div className="px-4 py-4">
      <h2 className="text-[17px] font-bold text-[#191C1E] mb-4">参考资料</h2>

      {/* 通用规范 */}
      <SopSection title="通用规范" sops={generalSops} onSelect={onSelectSop} />

      {/* 服务项目规范 */}
      <SopSection title="服务项目规范" sops={serviceSops} onSelect={onSelectSop} />
    </div>
  )
}

function SopSection({ title, sops, onSelect }: {
  title: string; sops: SopFolder[]; onSelect: (sop: SopFolder) => void
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-[#9CA3AF] font-semibold uppercase tracking-wider">{title}</span>
        <div className="flex-1 border-t border-[#F3F4F6]" />
      </div>
      <div className="space-y-2">
        {sops.map(sop => (
          <button
            key={sop.id}
            onClick={() => onSelect(sop)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E5E7EB] text-left active:bg-[#F9FAFB] transition-colors"
          >
            {/* Icon */}
            <div className="w-9 h-9 rounded-lg bg-[#EEF4FA] flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-[#191C1E] truncate">{sop.name}</div>
              <div className="text-[12px] text-[#9CA3AF] mt-0.5">
                v{sop.version} · 更新于 {sop.updatedAt}
              </div>
            </div>
            {/* Chevron */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" className="flex-shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

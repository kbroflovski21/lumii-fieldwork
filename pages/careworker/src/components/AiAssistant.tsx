import { useState, useRef, useEffect } from 'react'

const MOCK_REPLIES = [
  '您好！我是金色年华AI助手，有什么可以帮您的？',
  '根据SOP规范，助餐服务需要先确认服务对象的饮食禁忌和过敏信息。',
  '陈阿姨的上次健康监测记录显示血压正常，建议本次继续关注。',
  '今天您还有2个待完成的任务，分别是健康监测和助餐服务。',
  '如遇服务对象突发身体不适，请先保持冷静，评估意识和伤情，必要时拨打120并通知主管。',
  '助浴服务的水温建议控制在38-40℃，室温24-26℃，洗浴时间不超过20分钟。',
  '好的，我已记录您的反馈，会同步给主管。',
]

interface Message {
  id: number
  role: 'user' | 'ai'
  text: string
}

export function AiAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'ai', text: '您好！我是金色年华AI助手，有什么可以帮您的？' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const idRef = useRef(1)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, typing])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const send = () => {
    const text = input.trim()
    if (!text) return
    const userMsg: Message = { id: idRef.current++, role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    setTimeout(() => {
      const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)]
      setMessages(prev => [...prev, { id: idRef.current++, role: 'ai', text: reply }])
      setTyping(false)
    }, 800 + Math.random() * 600)
  }

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-[70] w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          style={{
            bottom: 'calc(68px + env(safe-area-inset-bottom))',
            right: 16,
            background: 'linear-gradient(135deg, #6366F1, #818CF8)',
          }}
          aria-label="AI助手"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-[70] flex flex-col bg-white rounded-t-xl shadow-2xl overflow-hidden animate-chat-up"
          style={{
            bottom: 0,
            left: 0,
            right: 0,
            height: 'calc(var(--app-height) - 56px)',
            maxHeight: 'calc(var(--app-height) - 56px)',
          }}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]"
            style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-[14px] font-bold text-white leading-tight">AI 助手</div>
                <div className="text-[11px] text-white/70 leading-tight">金色年华智能助手</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
              aria-label="关闭"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F7F9FB]">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0052CC] text-white rounded-[14px_2px_14px_14px]'
                      : 'bg-white text-[#374151] rounded-[2px_14px_14px_14px] border border-[#E5E7EB]'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-lg flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="bg-white text-[#9CA3AF] rounded-[2px_14px_14px_14px] border border-[#E5E7EB] px-3 py-2 text-[13px]">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick questions */}
          <div className="flex-shrink-0 px-4 py-2 border-t border-[#F3F4F6] bg-white overflow-x-auto">
            <div className="flex gap-2">
              {['今天有哪些任务？', '助浴注意事项', '如何处理紧急情况'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(send, 50) }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full border border-[#E5E7EB] text-[12px] text-[#374151] bg-[#F9FAFB] active:bg-[#F3F4F6] whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-t border-[#E5E7EB] bg-white"
            style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send() }}
              placeholder="输入问题..."
              className="flex-1 h-10 px-4 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] text-[13px] text-[#191C1E] outline-none focus:border-[#6366F1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chat-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-chat-up {
          animation: chat-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

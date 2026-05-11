import { useState } from 'react'
import { Send, MessageCircle, Check, CheckCheck, Info } from 'lucide-react'
import { familyNotes, type FamilyNote } from '../../data/mock'

// Filter notes for elder E001 (王桂芬)
const initialNotes = familyNotes.filter((n) => n.elderId === 'E001')

export default function FamilyMessages() {
  const [notes, setNotes] = useState<FamilyNote[]>(initialNotes)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = () => {
    const trimmed = newMessage.trim()
    if (!trimmed) return

    setSending(true)

    // Simulate a brief send delay
    setTimeout(() => {
      const note: FamilyNote = {
        id: `FN-${Date.now()}`,
        familyId: 'F001',
        elderId: 'E001',
        content: trimmed,
        createdAt: '刚刚',
        read: false,
      }
      setNotes((prev) => [note, ...prev])
      setNewMessage('')
      setSending(false)
    }, 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-4 pt-3 pb-6">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(22, 163, 74, 0.10)', color: '#16A34A' }}
          >
            <MessageCircle size={20} />
          </div>
          <div>
            <h2
              className="font-bold"
              style={{ color: '#191C1E', fontSize: '17px' }}
            >
              给服务团队留言
            </h2>
          </div>
        </div>
        <p
          className="leading-relaxed"
          style={{ color: '#64748B', fontSize: '15px', lineHeight: '1.6' }}
        >
          留言会自动关联到妈妈的档案，下次服务时 AI 会提醒社工
        </p>
      </div>

      {/* Existing Messages */}
      <div>
        <h3
          className="text-base font-bold mb-3 px-1"
          style={{ color: '#191C1E', fontSize: '17px' }}
        >
          留言记录
        </h3>

        {notes.length === 0 ? (
          <div
            className="glass-card p-6 text-center"
            style={{ color: '#94A3B8', fontSize: '15px' }}
          >
            暂无留言记录
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="glass-card p-4">
                <p
                  className="mb-3 leading-relaxed"
                  style={{ color: '#191C1E', fontSize: '16px', lineHeight: '1.7' }}
                >
                  {note.content}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#94A3B8' }}>
                    {note.createdAt}
                  </span>
                  {note.read ? (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(22, 163, 74, 0.10)', color: '#16A34A' }}
                    >
                      <CheckCheck size={12} />
                      已读
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(100, 116, 139, 0.10)', color: '#64748B' }}
                    >
                      <Check size={12} />
                      已发送
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Message Input */}
      <div>
        <h3
          className="text-base font-bold mb-3 px-1"
          style={{ color: '#191C1E', fontSize: '17px' }}
        >
          新留言
        </h3>
        <div className="glass-card p-4">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如：妈妈最近腿疼，麻烦多关注..."
            rows={4}
            className="w-full resize-none rounded-xl p-3 mb-3 outline-none transition-shadow focus:ring-2"
            style={{
              background: 'rgba(247, 249, 251, 0.8)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              color: '#191C1E',
              fontSize: '16px',
              lineHeight: '1.6',
              fontFamily: 'inherit',
              focusRingColor: 'rgba(22, 163, 74, 0.3)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all"
            style={{
              background: newMessage.trim() && !sending ? '#16A34A' : '#CBD5E1',
              color: 'white',
              fontSize: '16px',
              border: 'none',
              cursor: newMessage.trim() && !sending ? 'pointer' : 'not-allowed',
              boxShadow: newMessage.trim() && !sending ? '0 4px 12px rgba(22, 163, 74, 0.25)' : 'none',
            }}
          >
            <Send size={18} />
            <span>{sending ? '发送中...' : '发送留言'}</span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{
          background: 'rgba(0, 82, 204, 0.05)',
          border: '1px solid rgba(0, 82, 204, 0.10)',
        }}
      >
        <Info size={18} className="shrink-0 mt-0.5" style={{ color: '#0052CC' }} />
        <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.6' }}>
          留言已读后会标记为 <CheckCheck size={13} className="inline" style={{ color: '#16A34A' }} />，社工下次服务时会收到 AI 提醒
        </p>
      </div>
    </div>
  )
}

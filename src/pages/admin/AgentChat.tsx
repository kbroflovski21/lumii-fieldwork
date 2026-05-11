import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Sparkles } from 'lucide-react'
import { agentChatHistory } from '../../data/mock'
import type { ChatMessage } from '../../data/mock'

const suggestedQuestions = [
  '今天有哪些异常？',
  '本周服务统计',
  '帮我排明天的班',
]

const simulatedResponses: Record<string, string> = {
  '今天有哪些异常？':
    '今天目前有 **3 个异常标记**：\n\n1. 王桂芬 -- 上次血压 150/95 偏高（已完成服务，血压有所改善）\n2. 刘秀英 -- 情绪异常，需重点关注心理状态\n3. 赵德明 -- 昨日漏服降压药，血压 155/98 偏高\n\n建议优先关注刘秀英的心理状况，必要时安排心理咨询。',
  '本周服务统计':
    '本周服务统计如下：\n\n- 总服务次数：**78 次**\n- 平均每日：**11.1 次**\n- SOP 完成率：**91.7%**\n- 异常标记：**5 次**（血压 3 次，情绪 1 次，用药 1 次）\n\n李小明完成 32 次，张晓华 26 次，王美丽 20 次。整体运营正常。',
  '帮我排明天的班':
    '根据服务频次和地理位置优化，建议明天排班：\n\n**李小明**（3 户）：\n1. 09:00 王桂芬 -- 探访关爱 -- 翠苑一区\n2. 10:00 刘秀英 -- 探访关爱 -- 翠苑二区\n3. 14:00 赵德明 -- 康复训练 -- 文二路\n\n**张晓华**（2 户）：\n1. 09:30 陈玉兰 -- 助医陪诊 -- 古荡湾\n2. 14:00 张福来 -- 助浴 -- 文三路\n\n刘秀英情绪异常，建议经验丰富的李小明优先跟进。确认排班吗？',
}

function formatContent(content: string): React.ReactNode {
  // Replace **text** with <strong>text</strong>, and handle newlines
  const parts = content.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    // Split by newlines to add <br />
    const lines = part.split('\n')
    return lines.map((line, j) => (
      <span key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </span>
    ))
  })
}

export default function AgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([...agentChatHistory])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const sendMessage = (text: string) => {
    if (!text.trim()) return

    const userMsg: ChatMessage = {
      id: `u${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Simulate agent response after 1 second
    setTimeout(() => {
      const responseText =
        simulatedResponses[text.trim()] ||
        `收到您的问题。我正在分析"${text.trim()}"相关的数据，请稍候...\n\n目前系统运行正常，如需具体信息请告诉我要查询的维度。`

      const agentMsg: ChatMessage = {
        id: `a${Date.now()}`,
        role: 'agent',
        content: responseText,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      }

      setIsTyping(false)
      setMessages(prev => [...prev, agentMsg])
    }, 1000)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleSuggestionClick = (question: string) => {
    sendMessage(question)
  }

  return (
    <div className="flex flex-col mt-2" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Chat Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {/* Welcome message */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}
          >
            <Bot size={16} />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: '#7C3AED' }}>
              AI 管理助手
            </p>
            <p className="text-[10px]" style={{ color: '#94A3B8' }}>
              随时帮您分析数据、调度排班、查看异常
            </p>
          </div>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'agent' && (
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center mt-1 mr-2 flex-shrink-0"
                style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}
              >
                <Sparkles size={12} />
              </div>
            )}
            <div
              className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user' ? 'rounded-2xl rounded-br-md' : 'glass-card'
              }`}
              style={
                msg.role === 'user'
                  ? { background: '#0052CC', color: 'white', borderRadius: '16px 16px 4px 16px' }
                  : { borderRadius: '16px' }
              }
            >
              <div style={{ color: msg.role === 'user' ? 'white' : '#191C1E' }}>
                {formatContent(msg.content)}
              </div>
              <p
                className="text-[10px] mt-1.5"
                style={{ color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : '#94A3B8' }}
              >
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center mt-1 mr-2 flex-shrink-0"
              style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}
            >
              <Sparkles size={12} />
            </div>
            <div className="glass-card px-4 py-3" style={{ borderRadius: '16px' }}>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  <span
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: '#7C3AED', animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: '#7C3AED', animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: '#7C3AED', animationDelay: '300ms' }}
                  />
                </div>
                <span className="text-xs ml-1" style={{ color: '#64748B' }}>
                  思考中...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      <div className="flex gap-2 overflow-x-auto pb-2 pt-2">
        {suggestedQuestions.map((q) => (
          <button
            key={q}
            onClick={() => handleSuggestionClick(q)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
            style={{
              background: 'rgba(124,58,237,0.08)',
              color: '#7C3AED',
              border: '1px solid rgba(124,58,237,0.15)',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 pb-2">
        <div className="flex-1 glass-card flex items-center" style={{ borderRadius: '14px', padding: '2px' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="问我任何管理问题..."
            className="flex-1 bg-transparent border-none outline-none text-sm px-4 py-3"
            style={{ color: '#191C1E' }}
            disabled={isTyping}
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
          style={{
            background: input.trim() && !isTyping ? '#7C3AED' : 'rgba(124,58,237,0.15)',
            color: input.trim() && !isTyping ? 'white' : '#7C3AED',
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}

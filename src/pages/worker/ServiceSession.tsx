import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { todayTasks } from '../../data/mock'
import { Camera, Flag, CheckCircle, Mic, MicOff, Sparkles } from 'lucide-react'

interface TranscriptEntry {
  id: number
  speaker: 'worker' | 'elder' | 'unknown'
  text: string
  timestamp: string
  isFinal: boolean
}

interface AgentSuggestion {
  id: number
  text: string
  timestamp: string
  type: 'tip' | 'warning' | 'completion'
}

const API_BASE = window.location.origin
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/asr`

export default function ServiceSession() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const task = todayTasks.find(t => t.id === taskId) || todayTasks[1] // default to T002

  const [isRecording, setIsRecording] = useState(false)
  const [asrReady, setAsrReady] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [partialText, setPartialText] = useState('')
  const [sopStatus, setSopStatus] = useState<Record<number, 'pending' | 'in_progress' | 'completed'>>(
    () => {
      const initial: Record<number, 'pending' | 'in_progress' | 'completed'> = {}
      task.sopProgress.forEach((s, i) => { initial[i] = s.status })
      return initial
    }
  )
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([
    { id: 0, text: `${task.elder.name}${task.alert ? '，' + task.alert : ''}。请开始服务。`, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), type: 'tip' }
  ])
  const [elapsed, setElapsed] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const transcriptRef = useRef<TranscriptEntry[]>([])
  const entryIdRef = useRef(1)
  const analyzeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const suggestionsEndRef = useRef<HTMLDivElement>(null)

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-scroll
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript, partialText])

  useEffect(() => {
    suggestionsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [suggestions])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const addSuggestion = useCallback((text: string, type: 'tip' | 'warning' | 'completion' = 'tip') => {
    setSuggestions(prev => [...prev, {
      id: Date.now(),
      text,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
    }])
  }, [])

  // Call LLM agent to analyze transcript
  const analyzeTranscript = useCallback(async () => {
    const fullText = transcriptRef.current.filter(t => t.isFinal).map(t => t.text).join('\n')
    if (!fullText || fullText.length < 10) return

    try {
      const res = await fetch(`${API_BASE}/api/agent/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: fullText,
          sopSteps: task.sopProgress.map(s => ({ name: s.name, guidance: s.guidance })),
          elderProfile: `${task.elder.name}，${task.elder.age}岁，${task.elder.health.bloodPressure}，${task.elder.notes}`,
          serviceType: task.serviceType,
        }),
      })
      const data = await res.json()
      if (data.success) {
        // Update SOP completion
        if (data.completedSteps) {
          setSopStatus(prev => {
            const next = { ...prev }
            data.completedSteps.forEach((stepNum: number) => {
              const idx = stepNum - 1
              if (idx >= 0 && idx < task.sopProgress.length && next[idx] !== 'completed') {
                next[idx] = 'completed'
                addSuggestion(`SOP「${task.sopProgress[idx].name}」已确认完成`, 'completion')
              }
            })
            return next
          })
        }
        if (data.suggestion) {
          addSuggestion(data.suggestion, 'tip')
        }
      }
    } catch (e) {
      console.error('Agent analyze error:', e)
    }
  }, [task, addSuggestion])

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
      })
      mediaStreamRef.current = stream

      const audioCtx = new AudioContext({ sampleRate: 16000 })
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      // Connect WebSocket
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => console.log('[ASR] WebSocket connected')

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'asr_ready') {
            setAsrReady(true)
            setIsRecording(true)
            addSuggestion('语音识别已就绪，开始实时转写', 'tip')

            // Start sending audio
            processor.onaudioprocess = (e) => {
              if (ws.readyState === WebSocket.OPEN) {
                const float32 = e.inputBuffer.getChannelData(0)
                const int16 = new Int16Array(float32.length)
                for (let i = 0; i < float32.length; i++) {
                  const s = Math.max(-1, Math.min(1, float32[i]))
                  int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
                }
                ws.send(int16.buffer)
              }
            }
            source.connect(processor)
            processor.connect(audioCtx.destination)
          } else if (msg.type === 'transcription') {
            if (msg.isFinal && msg.text.trim()) {
              const entry: TranscriptEntry = {
                id: entryIdRef.current++,
                speaker: 'unknown',
                text: msg.text.trim(),
                timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                isFinal: true,
              }
              setTranscript(prev => {
                const next = [...prev, entry]
                transcriptRef.current = next
                return next
              })
              setPartialText('')
            } else if (msg.isPartial) {
              setPartialText(msg.text)
            }
          } else if (msg.type === 'error') {
            addSuggestion(`ASR错误: ${msg.message}`, 'warning')
          }
        } catch (e) {
          console.error('WS message parse error:', e)
        }
      }

      ws.onerror = () => addSuggestion('语音连接异常，请检查网络', 'warning')
      ws.onclose = () => {
        setAsrReady(false)
        setIsRecording(false)
      }

      // Start periodic agent analysis every 15 seconds
      analyzeTimerRef.current = setInterval(analyzeTranscript, 15000)

    } catch (err: any) {
      addSuggestion(`麦克风访问失败: ${err.message}`, 'warning')
    }
  }

  const stopRecording = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }))
      setTimeout(() => wsRef.current?.close(), 500)
    }
    processorRef.current?.disconnect()
    audioCtxRef.current?.close()
    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
    if (analyzeTimerRef.current) clearInterval(analyzeTimerRef.current)
    setIsRecording(false)
    setAsrReady(false)
    // Run one final analysis
    analyzeTranscript()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

  const completedCount = Object.values(sopStatus).filter(s => s === 'completed').length
  const totalSteps = task.sopProgress.length

  return (
    <div className="px-4 pt-2 pb-24">
      {/* Header card */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold">{task.elder.name}</h2>
            <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold mt-1" style={{ background: 'rgba(0,82,204,0.08)', color: '#0052CC' }}>{task.serviceType}</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-[var(--color-primary)]">{formatTime(elapsed)}</div>
            <div className="flex items-center gap-1.5 mt-1 justify-end">
              {isRecording ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium text-red-500">录音中</span>
                </>
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">未录音</span>
              )}
            </div>
          </div>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
            style={{ width: `${(completedCount / totalSteps) * 100}%` }} />
        </div>
        <div className="text-xs text-right mt-1 text-[var(--color-text-muted)]">{completedCount}/{totalSteps}</div>
      </div>

      {/* Main content - 2 column on desktop */}
      <div className="md:grid md:grid-cols-5 md:gap-4">
        {/* Left: SOP + Transcript */}
        <div className="md:col-span-3 space-y-4">
          {/* SOP Progress */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold mb-3">服务流程 (SOP)</h3>
            <div className="space-y-1">
              {task.sopProgress.map((step, i) => {
                const status = sopStatus[i]
                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        status === 'completed' ? 'bg-green-500 text-white' :
                        status === 'in_progress' ? 'bg-blue-500 text-white animate-pulse' :
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {status === 'completed' ? '✓' : i + 1}
                      </div>
                      {i < totalSteps - 1 && <div className={`w-0.5 h-4 ${status === 'completed' ? 'bg-green-300' : 'bg-gray-200'}`} />}
                    </div>
                    <div className="pb-2 min-w-0">
                      <span className={`text-sm font-medium ${status === 'completed' ? 'text-green-600 line-through' : status === 'in_progress' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                        {step.name}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] ml-2">{step.duration}分钟</span>
                      {status === 'in_progress' && step.guidance && (
                        <div className="mt-1 p-2 rounded-lg bg-blue-50 text-xs text-blue-700">
                          {step.guidance}
                          {step.checkItems && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {step.checkItems.map((item, j) => (
                                <span key={j} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 text-xs">{item}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Real-time Transcript */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Mic size={14} />
                实时对话转写
              </h3>
              {isRecording && <span className="text-xs text-green-600 font-medium animate-pulse">实时转写中...</span>}
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 text-sm" style={{ scrollBehavior: 'smooth' }}>
              {transcript.length === 0 && !partialText && (
                <p className="text-center text-[var(--color-text-muted)] text-xs py-8">
                  {isRecording ? '等待语音输入...' : '点击下方「开始录音」按钮开始实时转写'}
                </p>
              )}
              {transcript.map(entry => (
                <div key={entry.id} className="flex gap-2">
                  <span className="text-xs text-[var(--color-text-muted)] shrink-0 pt-0.5 w-16">{entry.timestamp}</span>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed">{entry.text}</p>
                </div>
              ))}
              {partialText && (
                <div className="flex gap-2 opacity-60">
                  <span className="text-xs text-[var(--color-text-muted)] shrink-0 pt-0.5 w-16">...</span>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed italic">{partialText}</p>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>

        {/* Right: Agent Suggestions */}
        <div className="md:col-span-2 mt-4 md:mt-0">
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--color-primary)]" />
              AI 实时督导
            </h3>
            <div className="max-h-96 md:max-h-[500px] overflow-y-auto space-y-3">
              {suggestions.map(s => (
                <div key={s.id} className={`p-3 rounded-xl text-sm ${
                  s.type === 'completion' ? 'bg-green-50 border border-green-200' :
                  s.type === 'warning' ? 'bg-red-50 border border-red-200' :
                  'bg-blue-50 border border-blue-100'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-xs mt-0.5">
                      {s.type === 'completion' ? '✅' : s.type === 'warning' ? '⚠️' : '💡'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`leading-relaxed ${
                        s.type === 'completion' ? 'text-green-700' :
                        s.type === 'warning' ? 'text-red-700' :
                        'text-blue-700'
                      }`}>{s.text}</p>
                      <span className="text-xs text-gray-400 mt-1 block">{s.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={suggestionsEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ background: 'rgba(247,249,251,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-white/80 transition-colors">
            <Camera size={20} />
          </button>
          <button className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-white/80 transition-colors">
            <Flag size={20} />
          </button>

          {!isRecording ? (
            <button onClick={startRecording}
              className="flex-1 h-12 rounded-2xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
              <Mic size={18} />
              开始录音
            </button>
          ) : (
            <button onClick={stopRecording}
              className="flex-1 h-12 rounded-2xl bg-gray-700 text-white font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors animate-pulse">
              <MicOff size={18} />
              停止录音
            </button>
          )}

          <button onClick={() => {
            stopRecording()
            navigate(`/worker/complete/${taskId}`)
          }}
            className="flex-1 h-12 rounded-2xl bg-green-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20">
            <CheckCircle size={18} />
            完成服务
          </button>
        </div>
      </div>
    </div>
  )
}

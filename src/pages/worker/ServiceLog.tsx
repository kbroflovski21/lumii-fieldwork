import { useParams, Link } from 'react-router-dom'
import { todayTasks, elders } from '../../data/mock'
import { FileAudio, FileText, Brain, CheckCircle, AlertTriangle, Clock, User, Heart, ArrowRight } from 'lucide-react'

const mockTranscript = [
  { time: '09:02', speaker: '社工', text: '王奶奶好呀，今天精神看起来不错！' },
  { time: '09:03', speaker: '老人', text: '哎，小李来了啊，快进来坐坐。' },
  { time: '09:03', speaker: '社工', text: '王奶奶，我先帮您量下血压好不好？' },
  { time: '09:04', speaker: '老人', text: '好的好的，上次你说高了，我这几天一直按时吃药。' },
  { time: '09:05', speaker: '社工', text: '嗯，145/90，比上次150/95有下降，不错！药一定要坚持吃。' },
  { time: '09:06', speaker: '老人', text: '我知道，每天早上一粒降压药，没忘过。' },
  { time: '09:08', speaker: '社工', text: '最近睡眠怎么样？上次说偶尔失眠。' },
  { time: '09:08', speaker: '老人', text: '还行，比之前好多了，就是有时候想儿子，睡不着。' },
  { time: '09:10', speaker: '社工', text: '儿子上次打电话了吗？' },
  { time: '09:10', speaker: '老人', text: '上周打了一次，说工作忙。唉...' },
  { time: '09:12', speaker: '社工', text: '王奶奶别担心，建国肯定挂念您的。最近腿脚怎么样？上下楼方便吗？' },
  { time: '09:13', speaker: '老人', text: '上楼有点费劲，得扶着扶手慢慢上。下楼还好。' },
  { time: '09:14', speaker: '社工', text: '那您一定注意安全，不要着急。家里有防滑垫吗？卫生间那边。' },
  { time: '09:15', speaker: '老人', text: '有的有的，上次你们帮我装的。' },
  { time: '09:18', speaker: '社工', text: '平时吃饭怎么样？有没有按时吃三顿？' },
  { time: '09:19', speaker: '老人', text: '早饭和午饭都吃，晚饭有时候就喝点粥，不太饿。' },
  { time: '09:22', speaker: '社工', text: '王奶奶，今天我们聊了不少。您血压比上次好了，药也按时吃，很棒。就是晚饭要注意营养，光喝粥不够的。' },
  { time: '09:23', speaker: '老人', text: '好好好，我记住了。小李你下次什么时候来？' },
  { time: '09:24', speaker: '社工', text: '后天周三我再来。您有什么事随时打电话。王奶奶再见！' },
  { time: '09:24', speaker: '老人', text: '好的，慢走啊！' },
]

export default function ServiceLog() {
  const { taskId } = useParams()
  const task = todayTasks.find(t => t.id === taskId) || todayTasks[0]
  const elder = task.elder

  return (
    <div className="px-4 pt-2 pb-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <FileText size={24} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold">服务日志详情</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{elder.name} · {task.serviceType}</p>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Service Info Card */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Clock size={14} />
              服务概况
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[var(--color-text-muted)]">服务对象</span>
                <p className="font-semibold mt-0.5">{elder.name}，{elder.age}岁</p>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">服务类型</span>
                <p className="font-semibold mt-0.5">{task.serviceType}</p>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">服务时间</span>
                <p className="font-semibold mt-0.5">2026-05-11 {task.startTime}–{task.endTime}</p>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">实际时长</span>
                <p className="font-semibold mt-0.5">{task.actualDuration} 分钟</p>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">社工</span>
                <p className="font-semibold mt-0.5">李小明 (W001)</p>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)]">SOP完成</span>
                <p className="font-semibold mt-0.5 text-green-600">6/6 项全部完成</p>
              </div>
            </div>
          </div>

          {/* Audio Archive */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <FileAudio size={14} />
              原始音频存档
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <FileAudio size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">service_T001_20260511.wav</p>
                    <p className="text-xs text-[var(--color-text-muted)]">33分钟 · 48.2 MB · PCM 16kHz</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">已存档</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <FileText size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">transcript_T001_20260511.json</p>
                    <p className="text-xs text-[var(--color-text-muted)]">对话转写文本 · 20条 · 12.4 KB</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">已存档</span>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Brain size={14} className="text-purple-600" />
              AI 服务总结
            </h3>
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                今天对王桂芬（78岁）进行了探访关爱服务，时长33分钟。
              </p>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] mt-2">
                <strong>健康指标：</strong>血压 145/90 mmHg，较上次（150/95）有所下降，降压药按时服用中。睡眠情况有所改善但仍偶有失眠，与思念儿子有关。
              </p>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] mt-2">
                <strong>生活状况：</strong>上下楼需扶扶手，行动稍有不便。饮食方面早午餐正常，晚餐偏简单（仅喝粥），营养摄入可能不足。卫生间已安装防滑设施。
              </p>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] mt-2">
                <strong>心理情绪：</strong>整体情绪良好，但提到想念在外工作的儿子（王建国），上周通话一次。
              </p>
              <p className="text-sm leading-relaxed mt-2 font-medium text-purple-700">
                建议关注：① 血压持续监测 ② 晚餐营养指导 ③ 关注孤独感，建议联系家属增加通话频次
              </p>
            </div>
          </div>

          {/* Health Indicators */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Heart size={14} className="text-red-500" />
              本次健康指标
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: '血压', value: '145/90', status: 'warning', note: '偏高，较上次下降' },
                { label: '用药', value: '按时服用', status: 'normal', note: '降压药每日一粒' },
                { label: '睡眠', value: '有所改善', status: 'warning', note: '偶有失眠' },
                { label: '情绪', value: '良好', status: 'normal', note: '想念儿子' },
                { label: '行动力', value: '轻度受限', status: 'warning', note: '上楼需扶' },
                { label: '饮食', value: '偏简单', status: 'warning', note: '晚餐仅喝粥' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${item.status === 'normal' ? 'bg-green-500' : item.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'}`} />
                    <span className="text-xs text-[var(--color-text-muted)]">{item.label}</span>
                  </div>
                  <p className="text-sm font-semibold">{item.value}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: SOP + Transcript */}
        <div className="space-y-4 mt-4 md:mt-0">
          {/* SOP Completion Detail */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <CheckCircle size={14} className="text-green-600" />
              SOP 完成详情
            </h3>
            <div className="space-y-3">
              {task.sopProgress.map((step, i) => (
                <div key={step.id} className="flex items-start gap-3 p-3 rounded-xl bg-green-50">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">✓</div>
                  <div>
                    <p className="text-sm font-medium text-green-800">{step.name}</p>
                    <p className="text-xs text-green-600 mt-0.5">{step.guidance}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {step.checkItems.map((item, j) => (
                        <span key={j} className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs">✓ {item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Agent Notes */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Brain size={14} className="text-blue-600" />
              AI 督导记录
            </h3>
            <div className="space-y-2">
              {task.aiNotes.map((note, i) => (
                <div key={i} className="p-3 rounded-xl bg-blue-50 text-sm text-blue-700 flex items-start gap-2">
                  <span className="text-blue-400 shrink-0 mt-0.5">💡</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Full Transcript */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <FileText size={14} />
              对话转写全文
              <span className="text-xs text-[var(--color-text-muted)] font-normal">({mockTranscript.length}条)</span>
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {mockTranscript.map((entry, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="text-xs text-[var(--color-text-muted)] shrink-0 w-11 pt-0.5">{entry.time}</span>
                  <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded font-medium ${
                    entry.speaker === '社工' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  }`}>{entry.speaker}</span>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          {task.alert && (
            <div className="glass-card p-5 border-l-4 border-orange-400">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-orange-700">
                <AlertTriangle size={14} />
                异常标记
              </h3>
              <p className="text-sm text-orange-600">{task.alert}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">已自动同步至管理端，站长可在看板中查看</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col md:flex-row gap-3">
        <Link to="/worker" className="flex-1 h-12 rounded-2xl glass-card flex items-center justify-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-white/80 transition-colors">
          返回任务列表
        </Link>
        <Link to="/family" className="flex-1 h-12 rounded-2xl bg-green-600 text-white flex items-center justify-center gap-2 text-sm font-semibold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20">
          <Heart size={16} />
          查看家属报告
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react';

const C = {
  pageBg: '#F7F9FB', surface: '#FFFFFF', surfaceSubtle: '#F9FAFB',
  line: '#E5E7EB', lineSubtle: '#F3F4F6',
  text: '#191C1E', textSec: '#374151', textMuted: '#9CA3AF',
  accent: '#0052CC', accentSoft: 'rgba(0,82,204,0.08)',
  aiAccent: '#6366F1',
  successBg: '#E0F4EC', successText: '#116B4C',
  warningBg: '#FFF1D6', warningText: '#976000',
  mutedBg: '#F3F4F6', mutedText: '#6B7280',
};

/* ── Mock feed messages ── */
const FEED = [
  { id: 'f1', type: 'report', date: '今天 09:50', tag: '服务报告', title: '探访关爱服务已完成', body: '社工王建国于今日 09:05-09:48 为张大伟提供了探访关爱服务（43 分钟）。\n\n测量血压 140/88，较上次略降。老人精神状态良好，膝盖疼痛有所好转。\n\nSOP 完成率 100%。' },
  { id: 'f2', type: 'health', date: '05-14', tag: '健康周报', title: '张大伟 · 本周健康状态总结', body: '本周共完成 3 次探访关爱服务，整体状态稳定。\n\n⚠ 血压略偏高（最近一次 140/88，趋势下降）\n⚠ 膝盖疼痛有好转迹象，建议继续观察\n\n精神状态良好，饮食正常。建议持续监测血压，如膝盖再次加重请及时就医复查。' },
  { id: 'f3', type: 'notice', date: '05-12', tag: '通知', title: '服务时间调整通知', body: '尊敬的家属，因翠苑站排班调整，张大伟下周一（05-19）的探访关爱服务将由李晓红负责，服务时间不变（09:00）。如有疑问请联系站点。' },
  { id: 'f4', type: 'report', date: '05-12', tag: '服务报告', title: '探访关爱服务已完成', body: '社工李晓红于 05-12 09:05-09:52 为张大伟提供了探访关爱服务（47 分钟）。\n\n测量血压 145/92。老人反映膝盖疼痛加重，上楼困难。建议尽快安排骨科复查。' },
  { id: 'f5', type: 'summary', date: '05-01', tag: '月度汇总', title: '张大伟 · 4 月服务月度汇总', body: '4 月共完成服务 12 次（探访关爱 12 次）。\n\n血压趋势：整体平稳，均值 142/90。\n情绪状态：良好，偶有低落。\n运动能力：膝盖疼痛从月中开始加重。\n\n综合建议：持续监测血压，安排骨科复查评估膝盖。' },
];

type Tab = 'feed' | 'feedback';

export default function FamilyPage() {
  const [tab, setTab] = useState<Tab>('feed');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div style={{ background: C.pageBg, minHeight: '100vh', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: C.surface, padding: '14px 16px', borderBottom: `1px solid ${C.line}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 18 }}>👴</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>张大伟的服务</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>张明（儿子）· 金色年华翠苑站</div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 60 }}>
        {tab === 'feed' && <FeedTab expandedId={expandedId} setExpandedId={setExpandedId} />}
        {tab === 'feedback' && <FeedbackTab />}
      </div>

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: C.surface, borderTop: `1px solid ${C.line}`, display: 'flex', height: 52, zIndex: 10 }}>
        {([
          { key: 'feed' as Tab, label: '最新动态', icon: '📢' },
          { key: 'feedback' as Tab, label: '反馈建议', icon: '💬' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'transparent', border: 'none', color: tab === t.key ? C.accent : C.textMuted, fontSize: 11, fontWeight: tab === t.key ? 600 : 400, cursor: 'pointer' }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ── Feed Tab ── */

function FeedTab({ expandedId, setExpandedId }: { expandedId: string | null; setExpandedId: (id: string | null) => void }) {
  const tagColors: Record<string, { bg: string; text: string }> = {
    '服务报告': { bg: C.accentSoft, text: C.accent },
    '健康周报': { bg: C.successBg, text: C.successText },
    '通知': { bg: C.warningBg, text: C.warningText },
    '月度汇总': { bg: 'rgba(99,102,241,0.08)', text: C.aiAccent },
  };

  return (
    <div style={{ padding: '12px 16px' }}>
      {FEED.map(msg => {
        const tc = tagColors[msg.tag] || { bg: C.mutedBg, text: C.mutedText };
        const isEx = expandedId === msg.id;
        const preview = msg.body.split('\n').filter(l => l.trim()).slice(0, 2).join(' ').slice(0, 60);

        return (
          <div key={msg.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.line}`, marginBottom: 10, overflow: 'hidden' }}>
            <button onClick={() => setExpandedId(isEx ? null : msg.id)} style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: tc.bg, color: tc.text }}>{msg.tag}</span>
                <span style={{ fontSize: 12, color: C.textMuted }}>{msg.date}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{msg.title}</div>
              {!isEx && <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4, lineHeight: 1.5 }}>{preview}...</div>}
            </button>
            {isEx && (
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ fontSize: 14, color: C.textSec, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{msg.body}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Feedback Tab ── */

interface ChatMsg { id: string; role: 'agent' | 'user'; content: string; time: string; }

function FeedbackTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'w', role: 'agent', content: '您好，我是客服小张 👋\n\n有什么反馈或建议都可以告诉我，比如：\n· 对服务内容或时间的建议\n· 对服务人员的评价\n· 希望增加或调整的服务\n· 任何疑问或投诉\n\n我们保证翠苑站的运营主管会看到并处理您的每一条留言。', time: '' },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text, time }]);
    setInput('');

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`, role: 'agent', time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        content: `收到您的反馈，我已经记录了：\n\n"${text}"\n\n这条留言会转给翠苑站运营主管处理。如果需要回访确认，我们会主动联系您。\n\n还有其他需要反馈的吗？`,
      }]);
    }, 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px - 56px)' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'agent' && (
              <div style={{ width: 32, height: 32, borderRadius: 16, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <span style={{ fontSize: 14 }}>👩‍💼</span>
              </div>
            )}
            <div style={{ maxWidth: '80%' }}>
              <div style={{
                background: msg.role === 'user' ? C.accent : C.surface,
                color: msg.role === 'user' ? '#fff' : C.textSec,
                border: msg.role === 'user' ? 'none' : `1px solid ${C.line}`,
                borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '2px 14px 14px 14px',
                padding: '10px 14px', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
              {msg.time && <div style={{ fontSize: 11, color: '#B0B8C4', marginTop: 3, textAlign: msg.role === 'user' ? 'right' : 'left' }}>{msg.time}</div>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.line}`, background: C.surface }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }} placeholder="输入您的反馈..." style={{ flex: 1, height: 40, borderRadius: 20, border: `1px solid ${C.line}`, padding: '0 16px', fontSize: 14, color: C.text, background: C.surfaceSubtle, outline: 'none' }} />
          <button onClick={handleSend} disabled={!input.trim()} style={{ width: 40, height: 40, borderRadius: 20, background: input.trim() ? C.accent : C.mutedBg, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

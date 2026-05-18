import { useState, useRef, useEffect } from 'react';

const C = {
  pageBg: '#F7F9FB', surface: '#FFFFFF', surfaceSubtle: '#F9FAFB',
  line: '#E5E7EB', lineSubtle: '#F3F4F6',
  text: '#191C1E', textSec: '#374151', textMuted: '#9CA3AF',
  accent: '#0052CC', accentSoft: 'rgba(0,82,204,0.08)',
  aiAccent: '#6366F1', aiAvatarBg: 'linear-gradient(135deg, #6366F1, #818CF8)',
  successBg: '#E0F4EC', successText: '#116B4C',
  warningBg: '#FFF1D6', warningText: '#976000',
  dangerBg: '#FEE2E2', dangerText: '#B42318',
  mutedBg: '#F3F4F6', mutedText: '#6B7280',
};

/* ── Mock data ── */
const KPIs = [
  { label: '本周服务总量', value: '168', sub: '4 站点合计', trend: '+12%', up: true },
  { label: '服务完成率', value: '93%', sub: '较上周持平', trend: '0%', up: null },
  { label: 'SOP 平均完成率', value: '87%', sub: '较上周 +3%', trend: '+3%', up: true },
  { label: '客户满意度', value: '4.6/5', sub: '较上周 +0.1', trend: '+0.1', up: true },
  { label: '异常率', value: '6.2%', sub: '较上周 -1.1%', trend: '-1.1%', up: false },
  { label: '投诉率', value: '1.8%', sub: '较上周 -0.3%', trend: '-0.3%', up: false },
];

const SITES_DATA = [
  { name: '翠苑站', services: 47, completion: 93, sopRate: 89, satisfaction: 4.7, anomaly: 6.4 },
  { name: '三墩站', services: 38, completion: 91, sopRate: 85, satisfaction: 4.5, anomaly: 7.8 },
  { name: '古荡站', services: 52, completion: 96, sopRate: 92, satisfaction: 4.8, anomaly: 4.2 },
  { name: '文新站', services: 31, completion: 88, sopRate: 81, satisfaction: 4.3, anomaly: 9.1 },
];

const SOP_RATES = [
  { service: '探访关爱', rate: 91, count: 82, issues: '安全检查步骤执行率偏低' },
  { service: '助浴', rate: 84, count: 36, issues: '皮肤检查和水温确认遗漏较多' },
  { service: '用药提醒', rate: 88, count: 28, issues: '药量核对步骤偶有缺失' },
  { service: '助餐', rate: 95, count: 22, issues: '基本达标' },
];

const ALL_RECORDS = [
  { id: '1', date: '05-15 09:48', site: '翠苑站', worker: '王建国', recipient: '张大伟', type: '探访关爱', duration: '43 分钟', sopRate: 100, status: 'normal' as const, satisfaction: '满意' },
  { id: '2', date: '05-15 10:38', site: '翠苑站', worker: '李晓红', recipient: '王秀英', type: '用药提醒', duration: '28 分钟', sopRate: 85, status: 'warning' as const, satisfaction: '—' },
  { id: '3', date: '05-15 11:15', site: '古荡站', worker: '陈秀芳', recipient: '赵淑芬', type: '助浴', duration: '75 分钟', sopRate: 100, status: 'normal' as const, satisfaction: '非常满意' },
  { id: '4', date: '05-14 15:30', site: '文新站', worker: '张伟明', recipient: '刘国强', type: '探访关爱', duration: '40 分钟', sopRate: 20, status: 'anomaly' as const, satisfaction: '—' },
  { id: '5', date: '05-14 14:00', site: '三墩站', worker: '周丽华', recipient: '孙志明', type: '探访关爱', duration: '45 分钟', sopRate: 100, status: 'normal' as const, satisfaction: '满意' },
  { id: '6', date: '05-14 10:20', site: '古荡站', worker: '吴敏', recipient: '李淑珍', type: '助餐', duration: '35 分钟', sopRate: 95, status: 'normal' as const, satisfaction: '满意' },
  { id: '7', date: '05-13 09:30', site: '翠苑站', worker: '王建国', recipient: '赵淑芬', type: '探访关爱', duration: '38 分钟', sopRate: 100, status: 'normal' as const, satisfaction: '满意' },
  { id: '8', date: '05-13 14:10', site: '文新站', worker: '张伟明', recipient: '孙志明', type: '用药提醒', duration: '22 分钟', sopRate: 75, status: 'warning' as const, satisfaction: '—' },
  { id: '9', date: '05-13 11:00', site: '三墩站', worker: '周丽华', recipient: '王秀英', type: '助浴', duration: '68 分钟', sopRate: 90, status: 'normal' as const, satisfaction: '满意' },
  { id: '10', date: '05-12 09:05', site: '翠苑站', worker: '李晓红', recipient: '张大伟', type: '探访关爱', duration: '47 分钟', sopRate: 100, status: 'normal' as const, satisfaction: '满意' },
];

const SITE_NAMES = ['全部站点', '翠苑站', '三墩站', '古荡站', '文新站'];
const STATUS_NAMES = ['全部状态', '正常', '警告', '异常'];

/* ── Main ── */

type View = 'dashboard' | 'records';

export default function QMPage() {
  const [view, setView] = useState<View>('dashboard');
  const [chatOpen, setChatOpen] = useState(false);

  const navItems: { key: View; label: string; icon: JSX.Element }[] = [
    { key: 'dashboard', label: '质量总览', icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
    { key: 'records', label: '服务记录', icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.pageBg }}>
      {/* ── Left Icon Rail (56px) ── */}
      <div style={{ width: 56, background: C.surface, borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 4, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
        </div>
        {/* Nav icons */}
        {navItems.map(n => (
          <button key={n.key} onClick={() => setView(n.key)} title={n.label} style={{ width: 40, height: 40, borderRadius: 10, background: view === n.key ? C.accentSoft : 'transparent', color: view === n.key ? C.accent : C.textMuted, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {n.icon}
          </button>
        ))}
      </div>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <header style={{ height: 64, background: C.surface, borderBottom: `1px solid ${C.line}`, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>金色年华 · 集团质量管理</div>
            <div style={{ fontSize: 12, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: C.successText }} />
              运行中 · 4 个站点 · 本周 168 单
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {view === 'dashboard' && <DashboardView />}
          {view === 'records' && <RecordsView />}
        </div>
      </div>

      {/* ── AI Floating Button ── */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)} style={{ position: 'fixed', bottom: 24, right: 24, width: 52, height: 52, borderRadius: '50%', background: C.aiAccent, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </button>
      )}
      {chatOpen && <ChatDrawer onClose={() => setChatOpen(false)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Dashboard
   ══════════════════════════════════════════════ */

function DashboardView() {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>质量总览</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>跨站点服务质量监测与分析</div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10, marginBottom: 24 }}>
        {KPIs.map(k => {
          const inv = k.label.includes('异常') || k.label.includes('投诉');
          const tc = k.up === null ? C.textMuted : (inv ? (k.up ? C.dangerText : C.successText) : (k.up ? C.successText : C.dangerText));
          return (
            <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 4 }}>{k.value}</div>
              <div style={{ fontSize: 12, marginTop: 2 }}><span style={{ color: tc, fontWeight: 600 }}>{k.trend !== '0%' ? k.trend : '—'}</span> <span style={{ color: C.textMuted }}>{k.sub}</span></div>
            </div>
          );
        })}
      </div>

      {/* Site comparison table */}
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>站点对比</div>
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: C.surfaceSubtle }}>
            {['站点', '服务量', '完成率', 'SOP 完成率', '满意度', '异常率'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: C.textMuted, fontSize: 12, borderBottom: `1px solid ${C.line}` }}>{h}</th>)}
          </tr></thead>
          <tbody>{SITES_DATA.map((s, i) => (
            <tr key={s.name} style={{ borderBottom: i < SITES_DATA.length - 1 ? `1px solid ${C.lineSubtle}` : 'none' }}>
              <td style={{ padding: '12px 16px', fontWeight: 600, color: C.text }}>{s.name}</td>
              <td style={{ padding: '12px 16px', color: C.textSec }}>{s.services}</td>
              <td style={{ padding: '12px 16px', color: C.textSec }}>{s.completion}%</td>
              <td style={{ padding: '12px 16px' }}><span style={{ color: s.sopRate >= 90 ? C.successText : s.sopRate >= 80 ? C.warningText : C.dangerText, fontWeight: 600 }}>{s.sopRate}%</span></td>
              <td style={{ padding: '12px 16px', color: C.textSec }}>{s.satisfaction}</td>
              <td style={{ padding: '12px 16px' }}><span style={{ color: s.anomaly <= 5 ? C.successText : s.anomaly <= 8 ? C.warningText : C.dangerText, fontWeight: 600 }}>{s.anomaly}%</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* SOP by service */}
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>服务项目 SOP 完成率</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
        {SOP_RATES.map(s => (
          <div key={s.service} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.service}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: s.rate >= 90 ? C.successText : s.rate >= 80 ? C.warningText : C.dangerText }}>{s.rate}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: C.lineSubtle, marginBottom: 8 }}>
              <div style={{ height: 6, borderRadius: 3, width: `${s.rate}%`, background: s.rate >= 90 ? C.successText : s.rate >= 80 ? C.warningText : C.dangerText }} />
            </div>
            <div style={{ fontSize: 12, color: C.textMuted }}>{s.count} 次服务 · {s.issues}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════
   Records (table with site filter, matching screenshot style)
   ══════════════════════════════════════════════ */

function RecordsView() {
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('全部站点');
  const [statusFilter, setStatusFilter] = useState('全部状态');

  const statusMap: Record<string, string> = { '正常': 'normal', '警告': 'warning', '异常': 'anomaly' };
  const filtered = ALL_RECORDS.filter(r => {
    if (siteFilter !== '全部站点' && r.site !== siteFilter) return false;
    if (statusFilter !== '全部状态' && r.status !== statusMap[statusFilter]) return false;
    if (search && !r.worker.includes(search) && !r.recipient.includes(search)) return false;
    return true;
  });

  const stLabel = (s: string) => s === 'normal' ? '正常' : s === 'warning' ? '警告' : '异常';
  const stStyle = (s: string) => s === 'normal' ? { bg: C.successBg, text: C.successText } : s === 'warning' ? { bg: C.warningBg, text: C.warningText } : { bg: C.dangerBg, text: C.dangerText };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>服务记录</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>查看所有站点的服务记录和质量数据</div>
        </div>
      </div>

      {/* Table container */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.lineSubtle}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '0 0 240px' }}>
            <svg style={{ position: 'absolute', left: 10, top: 10, width: 16, height: 16, color: C.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索社工或服务对象..." style={{ width: '100%', height: 36, borderRadius: 8, border: `1px solid ${C.line}`, padding: '0 12px 0 34px', fontSize: 13, color: C.text, background: C.surfaceSubtle, outline: 'none' }} />
          </div>
          <div style={{ flex: 1 }} />
          <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} style={{ height: 36, borderRadius: 8, border: `1px solid ${C.line}`, padding: '0 12px', fontSize: 13, color: siteFilter !== '全部站点' ? C.accent : C.textSec, fontWeight: siteFilter !== '全部站点' ? 600 : 400, background: C.surfaceSubtle, cursor: 'pointer', outline: 'none' }}>
            {SITE_NAMES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ height: 36, borderRadius: 8, border: `1px solid ${C.line}`, padding: '0 12px', fontSize: 13, color: statusFilter !== '全部状态' ? C.accent : C.textSec, fontWeight: statusFilter !== '全部状态' ? 600 : 400, background: C.surfaceSubtle, cursor: 'pointer', outline: 'none' }}>
            {STATUS_NAMES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: C.surfaceSubtle }}>
            {['时间', '站点', '社工', '服务对象', '服务项目', '时长', 'SOP', '满意度', '状态'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: C.textMuted, fontSize: 12, borderBottom: `1px solid ${C.line}`, position: 'sticky', top: 0, background: C.surfaceSubtle }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>无匹配记录</td></tr>}
            {filtered.map((r, i) => {
              const st = stStyle(r.status);
              return (
                <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.lineSubtle}` : 'none', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = C.surfaceSubtle)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 14px', color: C.textMuted, whiteSpace: 'nowrap' }}>{r.date}</td>
                  <td style={{ padding: '12px 14px', color: C.textSec }}>{r.site}</td>
                  <td style={{ padding: '12px 14px', color: C.text, fontWeight: 500 }}>{r.worker}</td>
                  <td style={{ padding: '12px 14px', color: C.text }}>{r.recipient}</td>
                  <td style={{ padding: '12px 14px', color: C.textSec }}>{r.type}</td>
                  <td style={{ padding: '12px 14px', color: C.textMuted }}>{r.duration}</td>
                  <td style={{ padding: '12px 14px' }}><span style={{ fontWeight: 600, color: r.sopRate >= 90 ? C.successText : r.sopRate >= 60 ? C.warningText : C.dangerText }}>{r.sopRate}%</span></td>
                  <td style={{ padding: '12px 14px', color: C.textSec }}>{r.satisfaction}</td>
                  <td style={{ padding: '12px 14px' }}><span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: st.bg, color: st.text }}>{stLabel(r.status)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════
   Chat Drawer
   ══════════════════════════════════════════════ */

interface ChatMsg { id: string; role: 'agent' | 'user'; content: string; time: string; }

function ChatDrawer({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'w', role: 'agent', content: '您好，我是质量管理 AI 助手。\n\n我可以帮您：\n· 分析某个站点的质量趋势\n· 对比不同站点的表现\n· 查看某项服务的 SOP 执行情况\n· 解释异常原因和改进建议\n\n请问有什么需要了解的？', time: '' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const handleSend = () => {
    const text = input.trim(); if (!text) return;
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text, time }]);
    setInput(''); setIsTyping(true);

    (async () => {
      try {
        const API_KEY = 'sk-9dd462867bb34a5580a6b070499ddabf';
        const sys = `你是"金色年华养老服务集团"的质量管理AI助手。帮助集团管理层分析跨站点服务质量。\n\n当前数据：\n- 4个站点：翠苑站(47次/93%完成/89%SOP/4.7满意度/6.4%异常)、三墩站(38次/91%/85%/4.5/7.8%)、古荡站(52次/96%/92%/4.8/4.2%)、文新站(31次/88%/81%/4.3/9.1%)\n- 服务项目SOP率：探访关爱91%、助浴84%、用药提醒88%、助餐95%\n- 本周总服务168次，整体SOP 87%，满意度4.6/5，异常率6.2%\n\n回复要求：简洁专业，数据驱动，给出具体建议。使用中文。`;
        const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST', headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'qwen3-max', messages: [{ role: 'system', content: sys }, ...messages.slice(-8).map(m => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.content })), { role: 'user', content: text }] }),
        });
        const data = await res.json();
        let reply = data.choices?.[0]?.message?.content || '抱歉，未能生成回复。';
        reply = reply.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'agent', content: reply, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }]);
      } catch { setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'agent', content: '抱歉，AI 服务暂不可用。', time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }]); }
      setIsTyping(false);
    })();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 50 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, width: 420, maxWidth: '100vw', height: '100vh', background: '#FAFBFC', borderLeft: `1px solid ${C.line}`, boxShadow: '-12px 0 40px rgba(0,0,0,0.1)', zIndex: 60, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.line}`, background: 'rgba(99,102,241,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: C.aiAvatarBg, width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg></div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.aiAccent }}>AI 质量助手</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: 8, marginBottom: 10, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'agent' && <div style={{ width: 28, height: 28, borderRadius: 8, background: C.aiAvatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg></div>}
              <div style={{ maxWidth: '82%' }}>
                <div style={{ background: msg.role === 'user' ? C.accent : C.surface, color: msg.role === 'user' ? '#fff' : C.textSec, border: msg.role === 'user' ? 'none' : `1px solid ${C.line}`, borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '2px 12px 12px 12px', padding: '10px 14px', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                {msg.time && <div style={{ fontSize: 11, color: '#B0B8C4', marginTop: 2, textAlign: msg.role === 'user' ? 'right' : 'left' }}>{msg.time}</div>}
              </div>
            </div>
          ))}
          {isTyping && <div style={{ display: 'flex', gap: 8 }}><div style={{ width: 28, height: 28, borderRadius: 8, background: C.aiAvatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg></div><div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: '2px 12px 12px 12px', padding: '10px 14px' }}><span style={{ color: C.textMuted, fontSize: 13 }}>正在思考...</span></div></div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.line}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }} placeholder="输入问题..." style={{ flex: 1, height: 40, borderRadius: 20, border: `1px solid ${C.line}`, padding: '0 16px', fontSize: 14, color: C.text, background: C.surface, outline: 'none' }} />
            <button onClick={handleSend} disabled={!input.trim()} style={{ width: 40, height: 40, borderRadius: 20, background: input.trim() ? C.aiAccent : C.mutedBg, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg></button>
          </div>
        </div>
      </div>
    </>
  );
}

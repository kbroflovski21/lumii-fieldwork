import { useState } from 'react';

/* ── Color tokens (global-ui-guidance) ── */
const C = {
  pageBg: '#F7F9FB', surface: '#FFFFFF', surfaceSubtle: '#F9FAFB',
  line: '#E5E7EB', lineSubtle: '#F3F4F6',
  text: '#191C1E', textSec: '#374151', textMuted: '#9CA3AF',
  accent: '#0052CC', accentSoft: 'rgba(0,82,204,0.08)',
  aiAccent: '#6366F1',
  successBg: '#E0F4EC', successText: '#116B4C',
  warningBg: '#FFF1D6', warningText: '#976000',
  dangerBg: '#FEE2E2', dangerText: '#B42318',
  mutedBg: '#F3F4F6', mutedText: '#6B7280',
};

/* ── Mock data ── */
const RECIPIENT = {
  name: '张大伟', age: 82, address: '翠苑一区 3 幢 402 室',
  healthNotes: '高血压，左膝关节炎，需助行器',
  riskLevel: '中' as const,
  familyName: '张明', familyRelation: '儿子',
};

const CONCERNS = ['血压近一周偏高', '上周反映膝盖疼痛加重'];

const SERVICES = [
  { id: 's1', date: '2026-05-15', time: '09:05 - 09:48', worker: '王建国', type: '探访关爱', duration: '43 分钟', sopRate: 100, status: 'normal' as const, summary: '王建国为张大伟提供了探访关爱服务。询问了健康状况，测量血压 140/88（较上次略降）。老人精神状态良好，膝盖疼痛有所好转。已建议继续复查。' },
  { id: 's2', date: '2026-05-12', time: '09:05 - 09:52', worker: '李晓红', type: '探访关爱', duration: '47 分钟', sopRate: 100, status: 'normal' as const, summary: '询问了身体状况，测量血压 145/92。老人反映膝盖疼痛加重，上楼困难。建议尽快安排骨科复查。精神状态良好。' },
  { id: 's3', date: '2026-05-10', time: '15:30 - 16:10', worker: '王建国', type: '探访关爱', duration: '40 分钟', sopRate: 100, status: 'normal' as const, summary: '常规探访，老人状态稳定。' },
];

const REPORTS = [
  { id: 'r1', type: '周报' as const, period: '2026-05-06 ~ 2026-05-12', date: '2026-05-12',
    summary: '本周共完成 3 次探访关爱服务。张大伟老人整体状态稳定，血压略偏高（最近一次 145/92），膝盖疼痛有加重趋势，建议尽快安排骨科复查。精神状态良好，饮食正常。',
    highlights: ['血压偏高，需持续监测', '膝盖疼痛加重，建议骨科复查'],
  },
  { id: 'r2', type: '日报' as const, period: '2026-05-15', date: '2026-05-15',
    summary: '今日完成探访关爱服务（王建国），时长 43 分钟。测量血压 140/88，较上次略降。老人精神状态良好，膝盖疼痛有所好转。',
    highlights: ['血压有所下降'],
  },
];

const NOTIFICATIONS = [
  { id: 'n1', time: '今天 09:50', content: '张大伟今日探访关爱服务已完成（王建国），血压 140/88，详情请查看日报。', unread: true },
  { id: 'n2', time: '05-12 20:00', content: '张大伟本周服务周报已生成，请查看。', unread: false },
  { id: 'n3', time: '05-12 10:40', content: '今日用药提醒服务完成，发现张大伟未按时服用降糖药，已督促。', unread: false },
];

/* ── Component ── */

type Tab = 'home' | 'reports' | 'feedback';

export default function FamilyPage() {
  const [tab, setTab] = useState<Tab>('home');
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  return (
    <div style={{ background: C.pageBg, minHeight: '100vh', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: C.surface, padding: '14px 16px', borderBottom: `1px solid ${C.line}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 18 }}>👴</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{RECIPIENT.name}的服务</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>{RECIPIENT.familyName}（{RECIPIENT.familyRelation}）· 金色年华翠苑站</div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 70 }}>
        {tab === 'home' && <HomeTab recipient={RECIPIENT} concerns={CONCERNS} services={SERVICES} notifications={NOTIFICATIONS} expandedService={expandedService} setExpandedService={setExpandedService} />}
        {tab === 'reports' && <ReportsTab reports={REPORTS} expandedReport={expandedReport} setExpandedReport={setExpandedReport} />}
        {tab === 'feedback' && <FeedbackTab feedbackText={feedbackText} setFeedbackText={setFeedbackText} feedbackSent={feedbackSent} setFeedbackSent={setFeedbackSent} />}
      </div>

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: C.surface, borderTop: `1px solid ${C.line}`, display: 'flex', height: 56, zIndex: 10 }}>
        {([
          { key: 'home' as Tab, label: '服务动态', icon: '🏠' },
          { key: 'reports' as Tab, label: '服务报告', icon: '📊' },
          { key: 'feedback' as Tab, label: '反馈建议', icon: '💬' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'transparent', border: 'none', color: tab === t.key ? C.accent : C.textMuted, fontSize: 11, fontWeight: tab === t.key ? 600 : 400, cursor: 'pointer' }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Home Tab
   ══════════════════════════════════════════════ */

function HomeTab({ recipient, concerns, services, notifications, expandedService, setExpandedService }: any) {
  return (
    <div style={{ padding: 16 }}>
      {/* Health status card */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.line}`, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>健康状态</span>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: C.warningBg, color: C.warningText }}>风险：{recipient.riskLevel}</span>
        </div>
        <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6 }}>{recipient.healthNotes}</div>
        {concerns.length > 0 && (
          <div style={{ marginTop: 10, padding: 10, background: C.warningBg, borderRadius: 8, border: '1px solid #F9D88C' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.warningText, marginBottom: 4 }}>⚠ 近期关注</div>
            {concerns.map((c: string, i: number) => <div key={i} style={{ fontSize: 13, color: C.warningText, lineHeight: 1.6 }}>· {c}</div>)}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>最新通知</div>
        {notifications.map((n: any) => (
          <div key={n.id} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${n.unread ? C.accent : C.line}`, padding: '12px 14px', marginBottom: 8, borderLeft: n.unread ? `3px solid ${C.accent}` : undefined }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{n.time}{n.unread && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: C.accent, background: C.accentSoft, padding: '1px 6px', borderRadius: 4 }}>新</span>}</div>
            <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6 }}>{n.content}</div>
          </div>
        ))}
      </div>

      {/* Recent services */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>近期服务</div>
        {services.map((s: any) => (
          <div key={s.id} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.line}`, marginBottom: 8, overflow: 'hidden' }}>
            <button onClick={() => setExpandedService(expandedService === s.id ? null : s.id)} style={{ width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.date} · {s.type}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{s.worker} · {s.duration}</div>
              </div>
              <svg style={{ width: 16, height: 16, color: C.textMuted, transform: expandedService === s.id ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {expandedService === s.id && (
              <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.lineSubtle}` }}>
                <div style={{ marginTop: 10, padding: 12, background: C.surfaceSubtle, borderRadius: 8, borderLeft: `3px solid ${C.aiAccent}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.aiAccent, marginBottom: 6 }}>AI 服务摘要</div>
                  <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.7 }}>{s.summary}</div>
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, background: C.successBg, color: C.successText }}>SOP {s.sopRate}%</span>
                  <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, background: C.mutedBg, color: C.mutedText }}>{s.time}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Reports Tab
   ══════════════════════════════════════════════ */

function ReportsTab({ reports, expandedReport, setExpandedReport }: any) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>服务报告</div>

      {/* Subscription status */}
      <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.line}`, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: C.successText }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>已订阅周报和日报</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>推送方式：微信服务号</div>
        </div>
      </div>

      {reports.map((r: any) => (
        <div key={r.id} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.line}`, marginBottom: 10, overflow: 'hidden' }}>
          <button onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)} style={{ width: '100%', padding: '14px 14px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: r.type === '周报' ? C.accentSoft : C.successBg, color: r.type === '周报' ? C.accent : C.successText }}>{r.type}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.period}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted }}>生成于 {r.date}</div>
            </div>
            <svg style={{ width: 16, height: 16, color: C.textMuted, transform: expandedReport === r.id ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {expandedReport === r.id && (
            <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.lineSubtle}` }}>
              <div style={{ marginTop: 10, fontSize: 13, color: C.textSec, lineHeight: 1.7 }}>{r.summary}</div>
              {r.highlights.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.warningText, marginBottom: 4 }}>📌 关注事项</div>
                  {r.highlights.map((h: string, i: number) => <div key={i} style={{ fontSize: 13, color: C.warningText, lineHeight: 1.6 }}>· {h}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Feedback Tab
   ══════════════════════════════════════════════ */

function FeedbackTab({ feedbackText, setFeedbackText, feedbackSent, setFeedbackSent }: any) {
  const handleSubmit = () => {
    if (!feedbackText.trim()) return;
    setFeedbackSent(true);
    setFeedbackText('');
    setTimeout(() => setFeedbackSent(false), 3000);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>反馈与建议</div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {['希望增加服务频次', '希望更换服务人员', '对服务内容有建议', '请求回访确认'].map(label => (
          <button key={label} onClick={() => setFeedbackText(label)} style={{ padding: '12px 10px', borderRadius: 10, background: C.surface, border: `1px solid ${C.line}`, fontSize: 13, color: C.textSec, cursor: 'pointer', textAlign: 'center' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Free text */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.line}`, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>自由留言</div>
        <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="请描述您的需求或建议..." style={{ width: '100%', minHeight: 100, fontSize: 14, lineHeight: 1.6, color: C.text, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12, background: C.surfaceSubtle, resize: 'vertical', fontFamily: 'inherit' }} />
        <button onClick={handleSubmit} disabled={!feedbackText.trim()} style={{ marginTop: 10, width: '100%', height: 44, borderRadius: 10, background: feedbackText.trim() ? C.accent : C.mutedBg, color: feedbackText.trim() ? '#fff' : C.textMuted, fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          提交反馈
        </button>
      </div>

      {feedbackSent && (
        <div style={{ padding: 14, borderRadius: 10, background: C.successBg, border: `1px solid ${C.successText}30`, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.successText }}>✅ 反馈已提交</div>
          <div style={{ fontSize: 12, color: C.successText, marginTop: 4 }}>翠苑站运营团队会尽快处理</div>
        </div>
      )}

      {/* Contact */}
      <div style={{ marginTop: 16, background: C.surface, borderRadius: 10, border: `1px solid ${C.line}`, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>联系站点</div>
        <div style={{ fontSize: 13, color: C.textSec }}>翠苑站服务热线：<span style={{ color: C.accent, fontWeight: 600 }}>0571-8888-1234</span></div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>工作时间：周一至周五 8:00-17:00</div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message } from '../types';
import { getState, subscribe, addMessage, type SharedState } from '../shared-store';

/* ── Color tokens ── */
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

/* ── Types ── */
interface StdDoc { status: 'complete' | 'incomplete' | 'empty'; content: string; source: 'manual' | 'ai_generated'; version: number; history: { version: number; date: string; summary: string }[]; }
interface StdFolder { id: string; type: 'general' | 'service'; name: string; sop: StdDoc | null; supervision: StdDoc | null; report: StdDoc | null; }
type DocType = 'sop' | 'supervision' | 'report';

/* ── Initial data ── */
const GENERAL_SOP = `1. 上门服务人员必须在开始服务时自报家门（姓名、所属机构），并确认被服务人员身份\n2. 服务过程中不得向被服务人员推销任何商业产品、保健品、保险或理财\n3. 不得私下收取费用或接受好处\n4. 不得拍摄或传播被服务人员的照片、视频或个人信息\n5. 服务结束前必须明确复述本次完成的服务内容，要求被服务人员确认，并询问满意度\n6. 服务全程需保持录音，录音自动存档`;
const GENERAL_SUPERVISION = `1. 开场 1 分钟内未做自报家门和身份确认 → 语音提示一次\n2. 出现服务结束迹象但未复述服务内容和询问满意度 → 语音提示一次\n3. 检测到推销商品、私下收费等违规行为 → 具体描述违规并提示`;
const GENERAL_REPORT = `🟢 语音全文日志存档\n1. 是否做了开场确认，如有则记录信息，如无则提示缺失\n2. 是否询问了身体情况并总结结果\n3. 是否进行了健康监测及结果\n4. 是否在结束前复述服务内容并询问满意度\n5. 满意度总结\n6. 是否出现违规行为\n7. 服务日期、起止时间`;

const ORAL_SOP = `1. 准备物品：软毛牙刷、牙膏、漱口杯、温水、毛巾、弯盘\n2. 协助被服务人员取坐位或侧卧位\n3. 检查口腔有无溃疡、出血、假牙等情况\n4. 挤适量牙膏，用温水浸湿牙刷\n5. 按顺序刷牙：先上后下、先外后内、牙面咬合面\n6. 协助漱口，观察有无出血或不适\n7. 清洁用具，协助恢复舒适体位\n8. 记录口腔状况及操作过程`;
const ORAL_SUPERVISION = `1. 检查是否准备物品和安排体位\n2. 检测是否进行口腔检查\n3. 检测刷牙流程是否按规范\n4. 检测是否协助漱口并观察\n5. 未检查口腔即刷牙 → 提示`;
const ORAL_REPORT = `🟢 语音全文日志存档\n1. 口腔检查结果\n2. 刷牙流程是否规范\n3. 漱口后有无出血或不适\n4. 配合程度和反应\n5. 需跟进的口腔问题`;

const VITALS_SOP = `1. 确认测量项目（血压、体温、脉搏、呼吸）\n2. 准备测量设备，检查设备正常\n3. 协助取合适体位\n4. 按规范操作测量\n5. 记录测量数值\n6. 与以往数值对比，异常及时报告\n7. 整理设备`;
const VITALS_SUPERVISION = `1. 检测是否确认测量项目\n2. 检测设备检查\n3. 测量后是否报读数值\n4. 异常数值 → 提示报告`;
const VITALS_REPORT = `🟢 语音全文日志存档\n1. 测量了哪些项目\n2. 各项数值\n3. 与以往是否有显著变化\n4. 是否发现异常并报告`;

function buildInitialFolders(): StdFolder[] {
  const mkDoc = (content: string, source: 'manual' | 'ai_generated', version: number, history: { version: number; date: string; summary: string }[]): StdDoc => ({ status: 'complete', content, source, version, history });
  return [
    { id: 'gen-ltci', type: 'general', name: '国家长期护理保险',
      sop: mkDoc(GENERAL_SOP, 'manual', 3, [{ version: 1, date: '2026-04-01', summary: '初始版本' }, { version: 2, date: '2026-04-20', summary: '增加满意度询问要求' }, { version: 3, date: '2026-05-14', summary: '更新违规行为条款' }]),
      supervision: mkDoc(GENERAL_SUPERVISION, 'ai_generated', 2, [{ version: 1, date: '2026-04-01', summary: 'AI 初始生成' }, { version: 2, date: '2026-05-14', summary: 'AI 基于 SOP v3 重新推理' }]),
      report: mkDoc(GENERAL_REPORT, 'ai_generated', 2, [{ version: 1, date: '2026-04-01', summary: 'AI 初始生成' }, { version: 2, date: '2026-05-14', summary: 'AI 基于 SOP v3 重新推理' }]),
    },
    { id: 'svc-oral', type: 'service', name: '清洁照护-口腔清洁',
      sop: mkDoc(ORAL_SOP, 'manual', 2, [{ version: 1, date: '2026-04-10', summary: '初始版本' }, { version: 2, date: '2026-05-14', summary: '补充口腔检查要求' }]),
      supervision: mkDoc(ORAL_SUPERVISION, 'ai_generated', 1, [{ version: 1, date: '2026-05-14', summary: 'AI 基于 SOP 生成' }]),
      report: mkDoc(ORAL_REPORT, 'ai_generated', 1, [{ version: 1, date: '2026-05-14', summary: 'AI 基于 SOP 生成' }]),
    },
    { id: 'svc-vitals', type: 'service', name: '基础健康观察-生命体征测量',
      sop: mkDoc(VITALS_SOP, 'manual', 1, [{ version: 1, date: '2026-05-14', summary: '初始版本' }]),
      supervision: mkDoc(VITALS_SUPERVISION, 'ai_generated', 1, [{ version: 1, date: '2026-05-14', summary: 'AI 基于 SOP 生成' }]),
      report: mkDoc(VITALS_REPORT, 'ai_generated', 1, [{ version: 1, date: '2026-05-14', summary: 'AI 基于 SOP 生成' }]),
    },
  ];
}

const DOC_LABELS: Record<DocType, string> = { sop: 'SOP', supervision: '服务中实时督导要求', report: '服务后报告要求' };

/* ══════════════════════════════════════════════ */

let nextMsgId = 5000;

export default function SupervisorPage() {
  const [state, _setState] = useState<SharedState>(getState);
  const [folders, setFolders] = useState<StdFolder[]>(buildInitialFolders);
  const [selectedFolder, setSelectedFolder] = useState<string>('gen-ltci');
  const [selectedDoc, setSelectedDoc] = useState<DocType>('sop');
  // Version history view
  const [viewingVersion, setViewingVersion] = useState<number | null>(null); // null = latest
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [generalCollapsed, setGeneralCollapsed] = useState(false);
  const [serviceCollapsed, setServiceCollapsed] = useState(false);
  // Panel visibility
  const [panels, setPanels] = useState<[boolean, boolean, boolean]>([true, true, true]); // [dir, doc, chat]
  const [dirWidth, setDirWidth] = useState(250);
  const [chatWidth, setChatWidth] = useState(380);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState('');
  const [actedMsgIds, setActedMsgIds] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<'left' | 'right' | null>(null);

  const [showDir, showDoc, showChat] = panels;
  const togglePanel = (idx: number) => {
    const next = [...panels] as [boolean, boolean, boolean];
    if (next[idx]) { if (next.filter(Boolean).length <= 1) return; next[idx] = false; }
    else { next[idx] = true; }
    setPanels(next);
  };

  useEffect(() => subscribe(s => _setState(s)), []);
  const messages = state.messagesByRole['supervisor'] || [];
  useEffect(() => { if (showChat) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping, showChat]);

  const folder = folders.find(f => f.id === selectedFolder);
  const doc = folder ? folder[selectedDoc] : null;

  useEffect(() => { setIsEditing(false); setViewingVersion(null); if (doc) setEditContent(doc.content); }, [selectedFolder, selectedDoc]);

  const pushChat = useCallback((role: 'user' | 'agent', content: string) => {
    addMessage('supervisor', { id: String(++nextMsgId), role, content, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) });
  }, []);

  // ── Save document edit ──
  const handleSave = () => {
    if (!folder) return;
    setFolders(prev => prev.map(f => {
      if (f.id !== folder.id) return f;
      const updated = { ...f };
      const oldDoc = f[selectedDoc];
      const newVersion = (oldDoc?.version || 0) + 1;
      const newDoc: StdDoc = { status: 'complete' as const, content: editContent, source: (oldDoc?.source || 'manual') as 'manual' | 'ai_generated', version: newVersion, history: [...(oldDoc?.history || []), { version: newVersion, date: new Date().toISOString().slice(0, 10), summary: '手动编辑' }] };
      updated[selectedDoc] = newDoc;
      return updated;
    }));
    setIsEditing(false);
  };

  // ── LLM action handling ──
  const handleAction = useCallback((action: any) => {
    if (!action?.type) return;
    setFolders(prev => {
      const next = [...prev];
      if (action.type === 'create_folder') {
        const d = action.data;
        next.push({
          id: `folder-${Date.now()}`, type: d.folderType || 'service', name: d.name,
          sop: d.sopContent ? { status: 'complete' as const, content: d.sopContent, source: 'manual' as const, version: 1, history: [{ version: 1, date: new Date().toISOString().slice(0, 10), summary: '新建' }] } : null,
          supervision: d.supervisionContent ? { status: 'complete' as const, content: d.supervisionContent, source: 'ai_generated' as const, version: 1, history: [{ version: 1, date: new Date().toISOString().slice(0, 10), summary: 'AI 生成' }] } : null,
          report: d.reportContent ? { status: 'complete' as const, content: d.reportContent, source: 'ai_generated' as const, version: 1, history: [{ version: 1, date: new Date().toISOString().slice(0, 10), summary: 'AI 生成' }] } : null,
        });
      } else if (action.type === 'update_doc') {
        const d = action.data;
        const idx = next.findIndex(f => f.id === d.folderId);
        if (idx >= 0) {
          const f = { ...next[idx] };
          const oldDoc = f[d.docType as DocType];
          const nv = (oldDoc?.version || 0) + 1;
          f[d.docType as DocType] = { status: 'complete' as const, content: d.content, source: d.docType === 'sop' ? 'manual' as const : 'ai_generated' as const, version: nv, history: [...(oldDoc?.history || []), { version: nv, date: new Date().toISOString().slice(0, 10), summary: 'AI 更新' }] };
          next[idx] = f;
        }
      } else if (action.type === 'delete_folder') {
        return next.filter(f => f.id !== action.data.folderId);
      }
      return next;
    });
  }, []);

  // ── Send to LLM ──
  const sendToLLM = useCallback(async (userText: string) => {
    pushChat('user', userText);
    setIsTyping(true);
    setPanels(p => [p[0], p[1], true]);
    try {
      const res = await fetch('/api/supervisor-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, folders, history: messages.slice(-10), currentContext: { folderId: selectedFolder, docType: selectedDoc, folderName: folder?.name || null, docLabel: folder ? DOC_LABELS[selectedDoc] : null } }),
      });
      const { reply, actions } = await res.json();
      pushChat('agent', reply);
      if (actions && Array.isArray(actions)) for (const a of actions) handleAction(a);
    } catch { pushChat('agent', '抱歉，请求处理失败。'); }
    setIsTyping(false);
  }, [folders, messages, pushChat, handleAction]);

  const handleSubmit = () => { const t = input.trim(); if (!t) return; setInput(''); sendToLLM(t); };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    const text = await file.text();
    sendToLLM(`我上传了文件「${file.name}」，以下是内容：\n\n${text.slice(0, 8000)}${text.length > 8000 ? '\n\n（已截取前 8000 字）' : ''}`);
  }, [sendToLLM]);

  // ── Directory helpers ──
  const generalFolders = folders.filter(f => f.type === 'general');
  const serviceFolders = folders.filter(f => f.type === 'service');

  const selectFile = (folderId: string, docType: DocType) => {
    setSelectedFolder(folderId); setSelectedDoc(docType); setPanels(p => [p[0], true, p[2]]); setIsEditing(false); setViewingVersion(null);
    const f = folders.find(ff => ff.id === folderId);
    if (f && f[docType]) setEditContent(f[docType]!.content);
  };

  // ── Drag resize ──
  const handleMouseDown = useCallback((side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = side;
    const startX = e.clientX;
    const startW = side === 'left' ? dirWidth : chatWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      if (side === 'left') setDirWidth(Math.max(180, Math.min(400, startW + delta)));
      else setChatWidth(Math.max(280, Math.min(600, startW - delta)));
    };
    const onUp = () => { draggingRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [dirWidth, chatWidth]);

  // ── Version history helpers ──
  const viewingDoc = viewingVersion !== null && doc ? doc.history.find(h => h.version === viewingVersion) : null;

  return (
    <div style={{ background: C.pageBg }} className="h-screen flex flex-col">
      {/* Header */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.line}`, height: 52 }} className="flex-none px-4 flex items-center gap-3">
        <a href="/" style={{ color: C.textMuted }} className="hover:opacity-70"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></a>
        <div style={{ background: C.line }} className="w-px h-5" />
        <div style={{ background: C.aiAccent }} className="w-7 h-7 rounded-lg flex items-center justify-center"><svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>服务主管 · 规范管理</div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span style={{ color: C.textMuted, fontSize: 11 }}>AI 就绪</span></div>
      </header>

      <div className="flex-1 flex min-h-0">

        {/* LEFT: Directory or collapsed tab */}
        {showDir ? (
          <div style={{ width: dirWidth, flexShrink: 0, borderRight: '2px solid #DDE1E6', background: C.surface }} className="flex flex-col min-h-0">
            <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.lineSubtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>📁 目录</span>
              <button onClick={() => togglePanel(0)} style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hover:bg-[#F3F4F6]"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <DirectorySection title="通用规范" folders={generalFolders} collapsed={generalCollapsed} onToggleCollapse={() => setGeneralCollapsed(!generalCollapsed)} selectedFolder={selectedFolder} selectedDoc={selectedDoc} onSelect={selectFile} onAdd={() => sendToLLM('我想添加一个新的通用规范')} onFolderAction={(action, f, newName) => {
                if (action === 'rename_confirm' && newName) {
                  setFolders(prev => prev.map(ff => ff.id === f.id ? { ...ff, name: newName } : ff));
                } else if (action === 'delete') {
                  setConfirmModal({
                    title: `删除「${f.name}」`,
                    message: '该规范下的所有文件（SOP、督导要求、报告要求）将全部删除，此操作不可撤销。',
                    onConfirm: () => { setFolders(prev => prev.filter(ff => ff.id !== f.id)); if (selectedFolder === f.id) setSelectedFolder(''); setConfirmModal(null); },
                  });
                }
              }} />
              <div style={{ height: 1, background: C.lineSubtle, margin: '8px 0' }} />
              <DirectorySection title="服务项目规范" folders={serviceFolders} collapsed={serviceCollapsed} onToggleCollapse={() => setServiceCollapsed(!serviceCollapsed)} selectedFolder={selectedFolder} selectedDoc={selectedDoc} onSelect={selectFile} onAdd={() => sendToLLM('我想添加一个新的服务项目规范')} onFolderAction={(action, f, newName) => {
                if (action === 'rename_confirm' && newName) {
                  setFolders(prev => prev.map(ff => ff.id === f.id ? { ...ff, name: newName } : ff));
                } else if (action === 'delete') {
                  setConfirmModal({
                    title: `删除「${f.name}」`,
                    message: '该规范下的所有文件（SOP、督导要求、报告要求）将全部删除，此操作不可撤销。',
                    onConfirm: () => { setFolders(prev => prev.filter(ff => ff.id !== f.id)); if (selectedFolder === f.id) setSelectedFolder(''); setConfirmModal(null); },
                  });
                }
              }} />
            </div>
          </div>
        ) : (
          <button onClick={() => togglePanel(0)} style={{ width: 32, background: C.surface, borderRight: '2px solid #DDE1E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', border: 'none', flexShrink: 0 }} className="hover:bg-[#F3F4F6]">
            <svg className="w-3.5 h-3.5" style={{ color: C.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7" /></svg>
            <span style={{ fontSize: 11, color: C.textMuted, writingMode: 'vertical-rl', letterSpacing: 2 }}>目录</span>
          </button>
        )}

        {/* Drag handle left */}
        {showDir && showDoc && <div onMouseDown={handleMouseDown('left')} style={{ width: 4, cursor: 'col-resize', background: 'transparent', flexShrink: 0 }} className="hover:bg-[#C7D2FE] active:bg-[#818CF8] transition-colors" />}

        {/* MIDDLE: Document View or collapsed tab */}
        {showDoc ? (
          <div style={{ flex: 1, minWidth: 0, background: C.surface }} className="flex flex-col min-h-0">
            <div style={{ padding: '8px 16px', borderBottom: `1px solid ${C.lineSubtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>📄 文档</span>
              <button onClick={() => togglePanel(1)} style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hover:bg-[#F3F4F6]"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7" /></svg></button>
            </div>
            {viewingVersion !== null && doc ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div style={{ padding: '10px 20px', borderBottom: `1px solid ${C.lineSubtle}`, background: 'rgba(99,102,241,0.03)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{folder!.name} — {DOC_LABELS[selectedDoc]}</div>
                      <div style={{ fontSize: 12, color: C.aiAccent, fontWeight: 600, marginTop: 2 }}>查看历史版本 v{viewingVersion}</div>
                    </div>
                    <button onClick={() => setViewingVersion(null)} style={{ height: 30, padding: '0 14px', borderRadius: 6, background: C.accent, color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }} className="hover:opacity-80">← 回到最新版本 (v{doc.version})</button>
                  </div>
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {doc.history.map(h => (
                      <button key={h.version} onClick={() => setViewingVersion(h.version)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: `1px solid ${h.version === viewingVersion ? C.aiAccent : C.line}`, background: h.version === viewingVersion ? 'rgba(99,102,241,0.08)' : C.surface, color: h.version === viewingVersion ? C.aiAccent : C.textSec, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>v{h.version} · {h.date}</button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{viewingDoc?.summary || ''}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.8, color: C.textSec, whiteSpace: 'pre-wrap', opacity: 0.7 }}>{doc.content}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 16, fontStyle: 'italic' }}>注：历史版本内容为快照展示。完整版本差异对比请通过 AI 助手查询。</div>
                </div>
              </div>
            ) : folder && doc ? (
              <>
                <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.lineSubtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{folder.name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span>{DOC_LABELS[selectedDoc]}</span>
                      <span style={{ background: 'rgba(99,102,241,0.08)', color: C.aiAccent, fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4 }}>v{doc.version}</span>
                      {doc.source === 'ai_generated' && <span style={{ background: 'rgba(99,102,241,0.08)', color: C.aiAccent, fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4 }}>AI 生成</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={handleSave} style={{ height: 30, padding: '0 12px', borderRadius: 6, background: C.accent, color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }} className="hover:opacity-80">保存</button>
                        <button onClick={() => { setIsEditing(false); setEditContent(doc.content); }} style={{ height: 30, padding: '0 12px', borderRadius: 6, background: C.mutedBg, color: C.textSec, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }} className="hover:opacity-80">取消</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setViewingVersion(doc.history.length > 0 ? doc.history[0].version : doc.version)} style={{ height: 30, padding: '0 12px', borderRadius: 6, background: 'rgba(99,102,241,0.08)', color: C.aiAccent, fontSize: 12, fontWeight: 600, border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer' }} className="hover:opacity-80">v{doc.version} 历史</button>
                        <button onClick={() => setIsEditing(true)} style={{ height: 30, padding: '0 12px', borderRadius: 6, background: C.accentSoft, color: C.accent, fontSize: 12, fontWeight: 600, border: `1px solid ${C.accent}`, cursor: 'pointer' }} className="hover:opacity-80">编辑</button>
                        <button onClick={() => { setConfirmModal({ title: `删除文档`, message: selectedDoc === 'sop' ? `确定要删除「${folder!.name}」的 SOP 文档吗？删除后，督导要求和报告要求将无法对应到 SOP。` : `确定要删除「${folder!.name}」的「${DOC_LABELS[selectedDoc]}」文档吗？删除后可通过 AI 基于 SOP 重新生成。`, onConfirm: () => { setFolders(prev => prev.map(ff => { if (ff.id !== folder!.id) return ff; const u = { ...ff }; u[selectedDoc] = null; return u; })); setConfirmModal(null); } }); }} style={{ height: 30, padding: '0 12px', borderRadius: 6, background: 'transparent', color: C.dangerText, fontSize: 12, fontWeight: 600, border: '1px solid #FCA5A5', cursor: 'pointer' }} className="hover:opacity-80">删除文档</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {isEditing ? (
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ width: '100%', minHeight: 300, fontSize: 14, lineHeight: 1.8, color: C.text, border: `1px solid ${C.line}`, borderRadius: 8, padding: 14, background: C.surface, resize: 'vertical', fontFamily: 'inherit' }} className="outline-none focus:border-[#6366F1]" />
                  ) : (
                    <div style={{ fontSize: 14, lineHeight: 1.8, color: C.textSec, whiteSpace: 'pre-wrap' }}>{doc.content}</div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ color: C.textMuted, fontSize: 13 }}>在左侧目录中选择一个文件</div>
            )}
          </div>
        ) : (
          <button onClick={() => togglePanel(1)} style={{ width: 32, background: C.surface, borderLeft: `2px solid ${C.line}`, borderRight: `2px solid ${C.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', border: 'none', flexShrink: 0 }} className="hover:bg-[#F3F4F6]">
            <svg className="w-3.5 h-3.5" style={{ color: C.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span style={{ fontSize: 11, color: C.textMuted, writingMode: 'vertical-rl', letterSpacing: 2 }}>文档</span>
          </button>
        )}

        {/* Drag handle right */}
        {showDoc && showChat && <div onMouseDown={handleMouseDown('right')} style={{ width: 4, cursor: 'col-resize', background: 'transparent', flexShrink: 0 }} className="hover:bg-[#C7D2FE] active:bg-[#818CF8] transition-colors" />}

        {/* RIGHT: Chat or collapsed tab */}
        {showChat ? (
          <div style={{ width: showDoc ? chatWidth : undefined, flex: showDoc ? 'none' : 1, flexShrink: 0, minWidth: 0, background: '#FAFBFC' }} className="flex flex-col min-h-0">
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.line}`, background: 'rgba(99,102,241,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.aiAccent }}>💬 AI 助手</span>
              <button onClick={() => togglePanel(2)} style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hover:bg-[#F3F4F6]"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
              {messages.length === 0 && (<div className="flex gap-2"><AiAvatar /><div style={{ fontSize: 13, lineHeight: 1.6, color: C.textSec, background: C.surfaceSubtle, borderRadius: '2px 12px 12px 12px', padding: '8px 12px' }}>您好，我是规范管理助手。有什么可以帮您？</div></div>)}
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'agent' && <AiAvatar />}
                  <div style={{ maxWidth: '85%' }}>
                    <div style={{ background: msg.role === 'user' ? C.accent : C.surfaceSubtle, color: msg.role === 'user' ? '#fff' : C.textSec, borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '2px 12px 12px 12px', fontSize: 13, lineHeight: 1.6 }} className="px-3 py-2 whitespace-pre-wrap">
                      <RenderContent content={msg.content} />
                      {msg.role === 'agent' && /确认.*删除|确定.*删除/.test(msg.content) && !actedMsgIds.has(msg.id) && (
                        <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: `1px solid ${C.lineSubtle}` }}>
                          <button onClick={() => { setActedMsgIds(p => new Set(p).add(msg.id)); sendToLLM('确认删除'); }} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: C.dangerText, borderRadius: 6, height: 30, padding: '0 12px', border: 'none', cursor: 'pointer' }}>确认删除</button>
                          <button onClick={() => { setActedMsgIds(p => new Set(p).add(msg.id)); pushChat('agent', '好的，已取消。'); }} style={{ fontSize: 12, fontWeight: 600, color: C.textSec, background: C.mutedBg, borderRadius: 6, height: 30, padding: '0 12px', border: 'none', cursor: 'pointer' }}>取消</button>
                        </div>
                      )}
                      {msg.role === 'agent' && /确认.*更新|确认.*修改|确认.*发布|是否更新|是否应用/.test(msg.content) && !/确认.*删除/.test(msg.content) && !actedMsgIds.has(msg.id) && (
                        <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: `1px solid ${C.lineSubtle}` }}>
                          <button onClick={() => { setActedMsgIds(p => new Set(p).add(msg.id)); sendToLLM('确认更新'); }} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: C.accent, borderRadius: 6, height: 30, padding: '0 12px', border: 'none', cursor: 'pointer' }}>确认</button>
                          <button onClick={() => { setActedMsgIds(p => new Set(p).add(msg.id)); pushChat('agent', '好的，已取消。'); }} style={{ fontSize: 12, fontWeight: 600, color: C.textSec, background: C.mutedBg, borderRadius: 6, height: 30, padding: '0 12px', border: 'none', cursor: 'pointer' }}>取消</button>
                        </div>
                      )}
                    </div>
                    <div style={{ color: '#B0B8C4', fontSize: 11 }} className={`mt-0.5 ${msg.role === 'user' ? 'text-right' : ''}`}>{msg.timestamp}</div>
                  </div>
                </div>
              ))}
              {isTyping && <div className="flex gap-2"><AiAvatar /><div style={{ background: C.surfaceSubtle, borderRadius: '2px 12px 12px 12px' }} className="px-3 py-2.5"><div className="flex gap-1"><span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: C.textMuted }} /><span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: C.textMuted, animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: C.textMuted, animationDelay: '300ms' }} /></div></div></div>}
              <div ref={bottomRef} />
            </div>
            <div style={{ borderTop: `1px solid ${C.lineSubtle}`, padding: '8px 10px' }}>
              <div className="flex items-end gap-1.5">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.md,.doc,.docx,.pdf" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} style={{ width: 36, height: 36, borderRadius: 8, background: C.surfaceSubtle, border: `1px solid ${C.line}`, color: C.textMuted, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} className="hover:opacity-70"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></button>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }} placeholder="输入指令..." style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, height: 36, fontSize: 13, color: C.text, padding: '0 14px' }} className="outline-none focus:border-[#6366F1]" />
                <button onClick={handleSubmit} disabled={!input.trim()} style={{ background: input.trim() ? C.aiAccent : C.mutedBg, width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: '#fff' }} className="disabled:opacity-40"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg></button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => togglePanel(2)} style={{ width: 32, background: '#FAFBFC', borderLeft: `2px solid ${C.line}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', border: 'none', flexShrink: 0 }} className="hover:bg-[rgba(99,102,241,0.04)]">
            <svg className="w-3.5 h-3.5" style={{ color: C.aiAccent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7" /></svg>
            <span style={{ fontSize: 11, color: C.aiAccent, writingMode: 'vertical-rl', letterSpacing: 2 }}>对话</span>
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setConfirmModal(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
          <div style={{ position: 'relative', background: C.surface, borderRadius: 12, padding: 24, width: 400, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>{confirmModal.title}</div>
            <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6, marginBottom: 20 }}>{confirmModal.message}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmModal(null)} style={{ height: 36, padding: '0 20px', borderRadius: 8, background: C.mutedBg, color: C.textSec, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }} className="hover:opacity-80">取消</button>
              <button onClick={confirmModal.onConfirm} style={{ height: 36, padding: '0 20px', borderRadius: 8, background: C.dangerText, color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }} className="hover:opacity-80">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Directory tree item ── */

function DirectorySection({ title, folders, collapsed, onToggleCollapse, selectedFolder, selectedDoc, onSelect, onAdd, onFolderAction }: {
  title: string; folders: StdFolder[]; collapsed: boolean; onToggleCollapse: () => void;
  selectedFolder: string; selectedDoc: DocType; onSelect: (folderId: string, docType: DocType) => void; onAdd: () => void; onFolderAction: (action: 'rename' | 'delete' | 'rename_confirm', folder: StdFolder, newName?: string) => void;
}) {
  return (
    <div>
      {/* Section header */}
      <button onClick={onToggleCollapse} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 8px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg style={{ color: C.accent, transform: collapsed ? '' : 'rotate(90deg)', transition: 'transform 0.15s', width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: 0.3 }}>{title}</span>
        </div>
        <span style={{ fontSize: 11, color: C.textMuted }}>{folders.length}</span>
      </button>

      {/* Folder list */}
      {!collapsed && (
        <div style={{ paddingLeft: 4 }}>
          {folders.map(f => <FolderTreeItem key={f.id} folder={f} selectedFolder={selectedFolder} selectedDoc={selectedDoc} onSelect={onSelect} onFolderAction={onFolderAction} />)}

          {/* Add button */}
          <button onClick={onAdd} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', marginTop: 2, borderRadius: 6, border: 'none', background: 'transparent', color: C.textMuted, fontSize: 12, cursor: 'pointer' }} className="hover:text-[#6366F1] transition-colors">
            <svg style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            添加{title}
          </button>
        </div>
      )}
    </div>
  );
}

function FolderTreeItem({ folder, selectedFolder, selectedDoc, onSelect, onFolderAction }: { folder: StdFolder; selectedFolder: string; selectedDoc: DocType; onSelect: (folderId: string, docType: DocType) => void; onFolderAction: (action: 'rename' | 'delete' | 'rename_confirm', folder: StdFolder, newName?: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);
  const [expanded, setExpanded] = useState(folder.id === selectedFolder);
  const isSelected = folder.id === selectedFolder;

  return (
    <div className="group/folder">
      <div style={{ display: 'flex', alignItems: 'center' }}>
      <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, background: isSelected ? C.accentSoft : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }} className="hover:bg-[rgba(0,82,204,0.04)] transition-colors">
        <svg style={{ color: C.textMuted, transform: expanded ? 'rotate(90deg)' : '', transition: 'transform 0.15s', width: 12, height: 12, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        <span style={{ fontSize: 12 }}>{expanded ? '📂' : '📁'}</span>
        {renaming ? (
          <input autoFocus value={renameName} onChange={e => setRenameName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && renameName.trim()) { onFolderAction('rename_confirm', folder, renameName.trim()); setRenaming(false); } if (e.key === 'Escape') setRenaming(false); }} onBlur={() => setRenaming(false)} onClick={e => e.stopPropagation()} style={{ fontSize: 12, fontWeight: 500, color: C.text, flex: 1, border: `1px solid ${C.accent}`, borderRadius: 4, padding: '1px 4px', outline: 'none', background: C.surface, minWidth: 0 }} />
        ) : (
          <span style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, color: isSelected ? C.accent : C.text, flex: 1 }} className="truncate">{folder.name}</span>
        )}
      </button>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} style={{ width: 22, height: 22, borderRadius: 4, background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="opacity-0 group-hover/folder:opacity-100 transition-opacity hover:bg-[#F3F4F6]" title="更多操作">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
        </button>
        {menuOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuOpen(false)} />
            <div style={{ position: 'absolute', right: 0, top: 24, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 20, minWidth: 100, overflow: 'hidden' }}>
              <button onClick={() => { setMenuOpen(false); setRenaming(true); setRenameName(folder.name); }} style={{ width: '100%', padding: '8px 12px', fontSize: 12, color: C.textSec, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }} className="hover:bg-[#F3F4F6]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                重命名
              </button>
              <button onClick={() => { setMenuOpen(false); onFolderAction('delete', folder); }} style={{ width: '100%', padding: '8px 12px', fontSize: 12, color: C.dangerText, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }} className="hover:bg-[#FEE2E2]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                删除
              </button>
            </div>
          </>
        )}
      </div>
      </div>
      {expanded && (
        <div style={{ paddingLeft: 28, paddingTop: 2, paddingBottom: 4 }}>
          {(['sop', 'supervision', 'report'] as DocType[]).map(dt => {
            const doc = folder[dt];
            const isSel = isSelected && selectedDoc === dt;
            return (
              <button key={dt} onClick={() => onSelect(folder.id, dt)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 5, background: isSel ? C.accentSoft : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }} className="hover:bg-[rgba(0,82,204,0.04)] transition-colors">
                <span style={{ fontSize: 11 }}>📄</span>
                <span style={{ fontSize: 11, color: isSel ? C.accent : C.textSec, fontWeight: isSel ? 600 : 400, flex: 1 }} className="truncate">{DOC_LABELS[dt]}</span>
                {doc ? <><span style={{ fontSize: 10, color: C.aiAccent, fontWeight: 600, marginRight: 4 }}>v{doc.version}</span><span style={{ width: 6, height: 6, borderRadius: 3, background: doc.status === 'complete' ? C.successText : C.warningText, flexShrink: 0 }} /></> : <span style={{ width: 6, height: 6, borderRadius: 3, background: C.line, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Shared ── */

function AiAvatar() {
  return <div style={{ background: C.aiAvatarBg }} className="flex-none w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg></div>;
}

function RenderContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => p.startsWith('**') && p.endsWith('**') ? <strong key={i} style={{ fontWeight: 600, color: C.accent }}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>)}</>;
}

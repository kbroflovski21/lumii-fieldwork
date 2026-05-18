import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { Bot } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import "./supervisor.css";

/* ── Types ── */

interface StdDoc {
  status: "complete" | "incomplete" | "empty";
  content: string;
  source: "manual" | "ai_generated";
  version: number;
  history: Array<{ version: number; date: string; summary: string }>;
}

interface StdFolder {
  id: string;
  type: "general" | "service";
  name: string;
  sop: StdDoc | null;
  supervision: StdDoc | null;
  report: StdDoc | null;
}

type DocType = "sop" | "supervision" | "report";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

/* ── Initial seed data (3 folders) ── */

const GENERAL_SOP = `1. 上门服务人员必须在开始服务时自报家门（姓名、所属机构），并确认被服务人员身份
2. 服务过程中不得向被服务人员推销任何商业产品、保健品、保险或理财
3. 不得私下收取费用或接受好处
4. 不得拍摄或传播被服务人员的照片、视频或个人信息
5. 服务结束前必须明确复述本次完成的服务内容，要求被服务人员确认，并询问满意度
6. 服务全程需保持录音，录音自动存档`;

const GENERAL_SUPERVISION = `1. 开场 1 分钟内未做自报家门和身份确认 → 语音提示一次
2. 出现服务结束迹象但未复述服务内容和询问满意度 → 语音提示一次
3. 检测到推销商品、私下收费等违规行为 → 具体描述违规并提示`;

const GENERAL_REPORT = `1. 是否做了开场确认，如有则记录信息，如无则提示缺失
2. 是否询问了身体情况并总结结果
3. 是否进行了健康监测及结果
4. 是否在结束前复述服务内容并询问满意度
5. 满意度总结
6. 是否出现违规行为
7. 服务日期、起止时间`;

const ORAL_SOP = `1. 准备物品：软毛牙刷、牙膏、漱口杯、温水、毛巾、弯盘
2. 协助被服务人员取坐位或侧卧位
3. 检查口腔有无溃疡、出血、假牙等情况
4. 挤适量牙膏，用温水浸湿牙刷
5. 按顺序刷牙：先上后下、先外后内、牙面咬合面
6. 协助漱口，观察有无出血或不适
7. 清洁用具，协助恢复舒适体位
8. 记录口腔状况及操作过程`;

const ORAL_SUPERVISION = `1. 检查是否准备物品和安排体位
2. 检测是否进行口腔检查
3. 检测刷牙流程是否按规范
4. 检测是否协助漱口并观察
5. 未检查口腔即刷牙 → 提示`;

const ORAL_REPORT = `1. 口腔检查结果
2. 刷牙流程是否规范
3. 漱口后有无出血或不适
4. 配合程度和反应
5. 需跟进的口腔问题`;

const VITALS_SOP = `1. 确认测量项目（血压、体温、脉搏、呼吸）
2. 准备测量设备，检查设备正常
3. 协助取合适体位
4. 按规范操作测量
5. 记录测量数值
6. 与以往数值对比，异常及时报告
7. 整理设备`;

const VITALS_SUPERVISION = `1. 检测是否确认测量项目
2. 检测设备检查
3. 测量后是否报读数值
4. 异常数值 → 提示报告`;

const VITALS_REPORT = `1. 测量了哪些项目
2. 各项数值
3. 与以往是否有显著变化
4. 是否发现异常并报告`;

function buildInitialFolders(): StdFolder[] {
  const mkDoc = (
    content: string,
    source: "manual" | "ai_generated",
    version: number,
    history: Array<{ version: number; date: string; summary: string }>,
  ): StdDoc => ({ status: "complete", content, source, version, history });

  return [
    {
      id: "gen-ltci", type: "general", name: "国家长期护理保险",
      sop: mkDoc(GENERAL_SOP, "manual", 3, [
        { version: 1, date: "2026-04-01", summary: "初始版本" },
        { version: 2, date: "2026-04-20", summary: "增加满意度询问要求" },
        { version: 3, date: "2026-05-14", summary: "更新违规行为条款" },
      ]),
      supervision: mkDoc(GENERAL_SUPERVISION, "ai_generated", 2, [
        { version: 1, date: "2026-04-01", summary: "AI 初始生成" },
        { version: 2, date: "2026-05-14", summary: "AI 基于 SOP v3 重新推理" },
      ]),
      report: mkDoc(GENERAL_REPORT, "ai_generated", 2, [
        { version: 1, date: "2026-04-01", summary: "AI 初始生成" },
        { version: 2, date: "2026-05-14", summary: "AI 基于 SOP v3 重新推理" },
      ]),
    },
    {
      id: "svc-oral", type: "service", name: "清洁照护-口腔清洁",
      sop: mkDoc(ORAL_SOP, "manual", 2, [
        { version: 1, date: "2026-04-10", summary: "初始版本" },
        { version: 2, date: "2026-05-14", summary: "补充口腔检查要求" },
      ]),
      supervision: mkDoc(ORAL_SUPERVISION, "ai_generated", 1, [
        { version: 1, date: "2026-05-14", summary: "AI 基于 SOP 生成" },
      ]),
      report: mkDoc(ORAL_REPORT, "ai_generated", 1, [
        { version: 1, date: "2026-05-14", summary: "AI 基于 SOP 生成" },
      ]),
    },
    {
      id: "svc-vitals", type: "service", name: "基础健康观察-生命体征测量",
      sop: mkDoc(VITALS_SOP, "manual", 1, [
        { version: 1, date: "2026-05-14", summary: "初始版本" },
      ]),
      supervision: mkDoc(VITALS_SUPERVISION, "ai_generated", 1, [
        { version: 1, date: "2026-05-14", summary: "AI 基于 SOP 生成" },
      ]),
      report: mkDoc(VITALS_REPORT, "ai_generated", 1, [
        { version: 1, date: "2026-05-14", summary: "AI 基于 SOP 生成" },
      ]),
    },
  ];
}

const DOC_LABELS: Record<DocType, string> = {
  sop: "SOP",
  supervision: "服务中实时督导要求",
  report: "服务后报告要求",
};

/* ── Mock AI response ── */
function mockAiReply(text: string): string {
  if (/添加|新增|创建/.test(text)) {
    return "好的，请告诉我规范名称和 SOP 内容，我来为您创建规范并自动生成督导要求和报告要求。";
  }
  if (/删除/.test(text)) {
    return "请确认要删除的规范名称，我将为您处理。请注意，删除后文件不可恢复。";
  }
  if (/版本|历史/.test(text)) {
    return "您可以在文档面板点击「历史」按钮查看版本记录。如需对比不同版本的差异，请告诉我具体版本号。";
  }
  return `收到您的消息：「${text}」。目前 AI 功能为模拟状态，后续将接入 LLM API 提供智能回复。`;
}

/* ══════════════════════════════════════════════ */

const SV_ROLE_MAP: Record<string, string> = {
  org_admin: "集团管理",
  site_operator: "站点运营",
  service_supervisor: "服务主管",
  careworker: "护理员",
};

function hashNameToColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const hue = ((h % 360) + 360) % 360;
  return `hsl(${hue}, 55%, 48%)`;
}

let nextMsgId = 5000;
function makeTimestamp(): string {
  return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function SupervisorPage() {
  const { user, token, logout } = useAuth();

  /* ── State ── */
  const [folders, setFolders] = useState<StdFolder[]>(buildInitialFolders);
  const [selectedFolder, setSelectedFolder] = useState("gen-ltci");
  const [selectedDoc, setSelectedDoc] = useState<DocType>("sop");
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [generalCollapsed, setGeneralCollapsed] = useState(false);
  const [serviceCollapsed, setServiceCollapsed] = useState(false);

  /* Panel sizing */
  const [dirWidth, setDirWidth] = useState(250);
  const [chatWidth, setChatWidth] = useState(380);
  const draggingRef = useRef<"left" | "right" | null>(null);

  /* Chat */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Copilot */
  const [copilotOpen, setCopilotOpen] = useState(false);

  /* Profile menu */
  const [profileOpen, setProfileOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  /* Confirmation modal */
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  /* Derived */
  const folder = folders.find((f) => f.id === selectedFolder);
  const doc = folder ? folder[selectedDoc] : null;

  /* Reset editing state on selection change */
  useEffect(() => {
    setIsEditing(false);
    setViewingVersion(null);
    if (doc) setEditContent(doc.content);
  }, [selectedFolder, selectedDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Auto-scroll chat */
  useEffect(() => {
    if (copilotOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, copilotOpen]);

  /* Close profile menu on click outside */
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  const handleChangePassword = async () => {
    setPwdError("");
    setPwdSuccess(false);
    if (!oldPwd || !newPwd) { setPwdError("请填写所有字段"); return; }
    if (newPwd.length < 6) { setPwdError("新密码至少6位"); return; }
    if (newPwd !== confirmPwd) { setPwdError("两次输入的新密码不一致"); return; }
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setPwdError(data.error ?? "修改失败"); return; }
      setPwdSuccess(true);
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => setShowPasswordModal(false), 1200);
    } catch {
      setPwdError("网络错误");
    }
  };

  /* ── Chat helpers ── */
  const pushChat = useCallback((role: "user" | "agent", content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: String(++nextMsgId), role, content, timestamp: makeTimestamp() },
    ]);
  }, []);

  const sendToLLM = useCallback(
    (userText: string) => {
      pushChat("user", userText);
      setIsTyping(true);
      setCopilotOpen(true);

      // Mock: simulate async reply
      setTimeout(() => {
        pushChat("agent", mockAiReply(userText));
        setIsTyping(false);
      }, 600);
    },
    [pushChat],
  );

  const handleSubmit = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    sendToLLM(t);
  };

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      const text = await file.text();
      const preview = text.length > 8000 ? text.slice(0, 8000) + "\n\n（已截取前 8000 字）" : text;
      sendToLLM(`我上传了文件「${file.name}」，以下是内容：\n\n${preview}`);
    },
    [sendToLLM],
  );

  /* ── Save document edit ── */
  const handleSave = () => {
    if (!folder) return;
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folder.id) return f;
        const updated = { ...f };
        const oldDoc = f[selectedDoc];
        const newVersion = (oldDoc?.version ?? 0) + 1;
        const newDoc: StdDoc = {
          status: "complete",
          content: editContent,
          source: oldDoc?.source ?? "manual",
          version: newVersion,
          history: [
            ...(oldDoc?.history ?? []),
            { version: newVersion, date: new Date().toISOString().slice(0, 10), summary: "手动编辑" },
          ],
        };
        updated[selectedDoc] = newDoc;
        return updated;
      }),
    );
    setIsEditing(false);
  };

  /* ── Directory helpers ── */
  const generalFolders = folders.filter((f) => f.type === "general");
  const serviceFolders = folders.filter((f) => f.type === "service");

  const selectFile = (folderId: string, docType: DocType) => {
    setSelectedFolder(folderId);
    setSelectedDoc(docType);
    setIsEditing(false);
    setViewingVersion(null);
    const target = folders.find((ff) => ff.id === folderId);
    if (target && target[docType]) setEditContent(target[docType]!.content);
  };

  /* ── Folder CRUD from directory ── */
  const handleFolderAction = (action: string, f: StdFolder, newName?: string) => {
    if (action === "rename_confirm" && newName) {
      setFolders((prev) => prev.map((ff) => (ff.id === f.id ? { ...ff, name: newName } : ff)));
    } else if (action === "delete") {
      setConfirmModal({
        title: `删除「${f.name}」`,
        message: "该规范下的所有文件（SOP、督导要求、报告要求）将全部删除，此操作不可撤销。",
        onConfirm: () => {
          setFolders((prev) => prev.filter((ff) => ff.id !== f.id));
          if (selectedFolder === f.id) setSelectedFolder("");
          setConfirmModal(null);
        },
      });
    }
  };

  /* ── Drag resize ── */
  const handleMouseDown = useCallback(
    (side: "left" | "right") => (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = side;
      const startX = e.clientX;
      const startW = side === "left" ? dirWidth : chatWidth;

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        if (side === "left") setDirWidth(Math.max(180, Math.min(400, startW + delta)));
        else setChatWidth(Math.max(280, Math.min(600, startW - delta)));
      };
      const onUp = () => {
        draggingRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [dirWidth, chatWidth],
  );

  /* ── Version history helpers ── */
  const viewingDoc = viewingVersion !== null && doc ? doc.history.find((h) => h.version === viewingVersion) : null;

  /* ══════════════════════════════════════════════ */

  return (
    <div className="sv-page">
      {/* Header — row 1, spans all columns */}
      <header className="sv-header">
        <div>
          <h1 className="sv-header__title">服务主管 · 规范管理</h1>
          <div className="sv-header__status">
            <span className="sv-header__status-dot" />
            AI 就绪
          </div>
        </div>
        <div className="sv-header__actions">
          <button
            className="sv-copilot-toggle"
            data-active={copilotOpen}
            onClick={() => setCopilotOpen((prev) => !prev)}
            type="button"
            aria-label={copilotOpen ? "关闭 AI 助手" : "打开 AI 助手"}
          >
            <Bot size={18} />
          </button>
        </div>
      </header>

      {/* Left Icon Rail — row 2, col 1 */}
      <nav className="sv-rail">
        <div className="sv-rail__logo">
          <DocIcon />
        </div>
        <div className="so-shell__profile" ref={profileRef}>
          <button
            className="so-shell__avatar"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="用户菜单"
            style={{ background: hashNameToColor(user?.name ?? "") }}
            type="button"
          >
            {(user?.name ?? "U")[0]}
          </button>
          {profileOpen && (
            <div className="so-shell__profile-menu">
              <div className="so-shell__profile-name">{user?.name}</div>
              <div className="so-shell__profile-role">{SV_ROLE_MAP[user?.role ?? ""] ?? user?.role}</div>
              <hr />
              <button type="button" onClick={() => { setProfileOpen(false); setShowPasswordModal(true); setPwdError(""); setPwdSuccess(false); }}>修改密码</button>
              <button type="button" onClick={() => { setProfileOpen(false); logout(); }}>退出登录</button>
            </div>
          )}
        </div>
      </nav>

      {/* Main content — row 2, col 2: 3-panel SOP layout */}
      <main className="sv-main">
        {/* LEFT: Directory */}
        <div className="sv-dir" style={{ width: dirWidth, flexShrink: 0 }}>
          <div className="sv-panel-hdr">
            <span className="sv-panel-hdr__title">目录</span>
          </div>
          <div className="sv-dir__scroll">
            <DirectorySection
              title="通用规范"
              folders={generalFolders}
              collapsed={generalCollapsed}
              onToggleCollapse={() => setGeneralCollapsed(!generalCollapsed)}
              selectedFolder={selectedFolder}
              selectedDoc={selectedDoc}
              onSelect={selectFile}
              onAdd={() => sendToLLM("我想添加一个新的通用规范")}
              onFolderAction={handleFolderAction}
            />
            <div className="sv-dir__divider" />
            <DirectorySection
              title="服务项目规范"
              folders={serviceFolders}
              collapsed={serviceCollapsed}
              onToggleCollapse={() => setServiceCollapsed(!serviceCollapsed)}
              selectedFolder={selectedFolder}
              selectedDoc={selectedDoc}
              onSelect={selectFile}
              onAdd={() => sendToLLM("我想添加一个新的服务项目规范")}
              onFolderAction={handleFolderAction}
            />
          </div>
        </div>

        {/* Drag handle left */}
        <div className="sv-drag-handle" onMouseDown={handleMouseDown("left")} />

        {/* MIDDLE: Document view */}
        <div className="sv-doc">
          <div className="sv-panel-hdr">
            <span className="sv-panel-hdr__title">文档</span>
          </div>

            {viewingVersion !== null && doc ? (
              /* Version history view */
              <div className="sv-doc__version-view">
                <div className="sv-doc__version-header">
                  <div>
                    <div className="sv-doc__version-name">{folder!.name} — {DOC_LABELS[selectedDoc]}</div>
                    <div className="sv-doc__version-label">查看历史版本 v{viewingVersion}</div>
                  </div>
                  <button onClick={() => setViewingVersion(null)} className="sv-btn sv-btn--primary">
                    返回最新版本 (v{doc.version})
                  </button>
                </div>
                <div className="sv-doc__version-pills">
                  {doc.history.map((h) => (
                    <button
                      key={h.version}
                      onClick={() => setViewingVersion(h.version)}
                      className="sv-version-pill"
                      data-active={h.version === viewingVersion}
                    >
                      v{h.version} · {h.date}
                    </button>
                  ))}
                </div>
                <div className="sv-doc__body">
                  <div className="sv-doc__body-meta">{viewingDoc?.summary ?? ""}</div>
                  <div className="sv-doc__body-content sv-doc__body-content--faded">{doc.content}</div>
                  <div className="sv-doc__body-note">
                    注：历史版本内容为快照展示。完整版本差异对比请通过 AI 助手查询。
                  </div>
                </div>
              </div>
            ) : folder && doc ? (
              /* Normal document view */
              <>
                <div className="sv-doc__toolbar">
                  <div>
                    <div className="sv-doc__toolbar-name">{folder.name}</div>
                    <div className="sv-doc__toolbar-meta">
                      <span>{DOC_LABELS[selectedDoc]}</span>
                      <span className="sv-tag sv-tag--ai">v{doc.version}</span>
                      {doc.source === "ai_generated" && <span className="sv-tag sv-tag--ai">AI 生成</span>}
                    </div>
                  </div>
                  <div className="sv-doc__toolbar-actions">
                    {isEditing ? (
                      <>
                        <button onClick={handleSave} className="sv-btn sv-btn--primary">保存</button>
                        <button
                          onClick={() => { setIsEditing(false); setEditContent(doc.content); }}
                          className="sv-btn sv-btn--muted"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setViewingVersion(doc.history.length > 0 ? doc.history[0].version : doc.version)}
                          className="sv-btn sv-btn--ai-outline"
                        >
                          v{doc.version} 历史
                        </button>
                        <button onClick={() => setIsEditing(true)} className="sv-btn sv-btn--accent-outline">
                          编辑
                        </button>
                        <button
                          onClick={() => {
                            setConfirmModal({
                              title: "删除文档",
                              message:
                                selectedDoc === "sop"
                                  ? `确定要删除「${folder.name}」的 SOP 文档吗？删除后，督导要求和报告要求将无法对应到 SOP。`
                                  : `确定要删除「${folder.name}」的「${DOC_LABELS[selectedDoc]}」文档吗？删除后可通过 AI 基于 SOP 重新生成。`,
                              onConfirm: () => {
                                setFolders((prev) =>
                                  prev.map((ff) => {
                                    if (ff.id !== folder.id) return ff;
                                    const u = { ...ff };
                                    u[selectedDoc] = null;
                                    return u;
                                  }),
                                );
                                setConfirmModal(null);
                              },
                            });
                          }}
                          className="sv-btn sv-btn--danger-outline"
                        >
                          删除文档
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="sv-doc__body">
                  {isEditing ? (
                    <textarea
                      className="sv-doc__editor"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                  ) : (
                    <div className="sv-doc__body-content">{doc.content}</div>
                  )}
                </div>
              </>
            ) : (
              <div className="sv-doc__empty">在左侧目录中选择一个文件</div>
            )}
          </div>
        ) : (
        {/* Drag handle right */}
        {copilotOpen && (
          <div className="sv-drag-handle" onMouseDown={handleMouseDown("right")} />
        )}

        {/* RIGHT: Built-in SOP AI chat */}
        <div
          className="sv-chat"
          data-visible={copilotOpen}
          style={{
            width: chatWidth,
            flexShrink: 0,
          }}
        >
          <div className="sv-chat__hdr">
            <span className="sv-chat__hdr-title">AI 助手</span>
          </div>
          <div className="sv-chat__scroll">
            {messages.length === 0 && (
              <div className="sv-chat__welcome">
                <AiAvatar />
                <div className="sv-chat__bubble sv-chat__bubble--agent">
                  您好，我是规范管理助手。有什么可以帮您？
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`sv-chat__row ${msg.role === "user" ? "sv-chat__row--user" : ""}`}>
                {msg.role === "agent" && <AiAvatar />}
                <div className="sv-chat__msg-wrap">
                  <div className={`sv-chat__bubble sv-chat__bubble--${msg.role}`}>
                    <RenderContent content={msg.content} />
                  </div>
                  <div className={`sv-chat__ts ${msg.role === "user" ? "sv-chat__ts--right" : ""}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="sv-chat__row">
                <AiAvatar />
                <div className="sv-chat__bubble sv-chat__bubble--agent">
                  <div className="sv-typing">
                    <span className="sv-typing__dot" />
                    <span className="sv-typing__dot" style={{ animationDelay: "150ms" }} />
                    <span className="sv-typing__dot" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="sv-chat__input-bar">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.md,.doc,.docx,.pdf" hidden />
            <button onClick={() => fileInputRef.current?.click()} className="sv-chat__attach-btn" aria-label="上传文件">
              <PaperclipIcon />
            </button>
            <input
              className="sv-chat__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
              placeholder="输入指令..."
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="sv-chat__send-btn"
              aria-label="发送"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </main>

      {/* Confirmation modal */}
      {confirmModal && (
        <div className="sv-modal-backdrop">
          <div className="sv-modal-overlay" onClick={() => setConfirmModal(null)} />
          <div className="sv-modal">
            <div className="sv-modal__title">{confirmModal.title}</div>
            <div className="sv-modal__body">{confirmModal.message}</div>
            <div className="sv-modal__actions">
              <button onClick={() => setConfirmModal(null)} className="sv-btn sv-btn--muted">取消</button>
              <button onClick={confirmModal.onConfirm} className="sv-btn sv-btn--danger">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Password change modal */}
      {showPasswordModal && (
        <div className="so-shell__modal-scrim" onClick={() => setShowPasswordModal(false)}>
          <div className="so-shell__modal" onClick={e => e.stopPropagation()}>
            <h3>修改密码</h3>
            {pwdError && <div className="so-shell__modal-error">{pwdError}</div>}
            {pwdSuccess && <div className="so-shell__modal-success">密码修改成功</div>}
            <input type="password" placeholder="当前密码" value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
            <input type="password" placeholder="新密码" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
            <input type="password" placeholder="确认新密码" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
            <div className="so-shell__modal-actions">
              <button type="button" onClick={() => setShowPasswordModal(false)}>取消</button>
              <button type="button" onClick={handleChangePassword}>确认修改</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── DirectorySection ── */

function DirectorySection({
  title, folders, collapsed, onToggleCollapse, selectedFolder, selectedDoc, onSelect, onAdd, onFolderAction,
}: {
  title: string;
  folders: StdFolder[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  selectedFolder: string;
  selectedDoc: DocType;
  onSelect: (folderId: string, docType: DocType) => void;
  onAdd: () => void;
  onFolderAction: (action: string, folder: StdFolder, newName?: string) => void;
}) {
  return (
    <div className="sv-dir-section">
      <button onClick={onToggleCollapse} className="sv-dir-section__header">
        <div className="sv-dir-section__header-left">
          <span className={`sv-dir-section__chevron ${collapsed ? "" : "sv-dir-section__chevron--open"}`}>
            <ChevronRightIcon />
          </span>
          <span className="sv-dir-section__title">{title}</span>
        </div>
        <span className="sv-dir-section__count">{folders.length}</span>
      </button>
      {!collapsed && (
        <div className="sv-dir-section__list">
          {folders.map((f) => (
            <FolderTreeItem
              key={f.id}
              folder={f}
              selectedFolder={selectedFolder}
              selectedDoc={selectedDoc}
              onSelect={onSelect}
              onFolderAction={onFolderAction}
            />
          ))}
          <button onClick={onAdd} className="sv-dir-section__add-btn">
            <PlusIcon />
            添加{title}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── FolderTreeItem ── */

function FolderTreeItem({
  folder, selectedFolder, selectedDoc, onSelect, onFolderAction,
}: {
  folder: StdFolder;
  selectedFolder: string;
  selectedDoc: DocType;
  onSelect: (folderId: string, docType: DocType) => void;
  onFolderAction: (action: string, folder: StdFolder, newName?: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);
  const [expanded, setExpanded] = useState(folder.id === selectedFolder);
  const isSelected = folder.id === selectedFolder;

  return (
    <div className="sv-folder">
      <div className="sv-folder__row">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`sv-folder__btn ${isSelected ? "sv-folder__btn--selected" : ""}`}
        >
          <span className={`sv-folder__chevron ${expanded ? "sv-folder__chevron--open" : ""}`}>
            <ChevronRightSmIcon />
          </span>
          <span className="sv-folder__icon">{expanded ? "📂" : "📁"}</span>
          {renaming ? (
            <input
              autoFocus
              className="sv-folder__rename-input"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameName.trim()) {
                  onFolderAction("rename_confirm", folder, renameName.trim());
                  setRenaming(false);
                }
                if (e.key === "Escape") setRenaming(false);
              }}
              onBlur={() => setRenaming(false)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={`sv-folder__name ${isSelected ? "sv-folder__name--selected" : ""}`}>
              {folder.name}
            </span>
          )}
        </button>
        <div className="sv-folder__menu-anchor">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="sv-folder__menu-trigger"
            aria-label="更多操作"
          >
            <DotsIcon />
          </button>
          {menuOpen && (
            <>
              <div className="sv-folder__menu-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="sv-folder__menu">
                <button
                  onClick={() => { setMenuOpen(false); setRenaming(true); setRenameName(folder.name); }}
                  className="sv-folder__menu-item"
                >
                  重命名
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onFolderAction("delete", folder); }}
                  className="sv-folder__menu-item sv-folder__menu-item--danger"
                >
                  删除
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {expanded && (
        <div className="sv-folder__children">
          {(["sop", "supervision", "report"] as DocType[]).map((dt) => {
            const d = folder[dt];
            const isSel = isSelected && selectedDoc === dt;
            return (
              <button
                key={dt}
                onClick={() => onSelect(folder.id, dt)}
                className={`sv-folder__file ${isSel ? "sv-folder__file--selected" : ""}`}
              >
                <span className="sv-folder__file-icon">{"📄"}</span>
                <span className={`sv-folder__file-name ${isSel ? "sv-folder__file-name--selected" : ""}`}>
                  {DOC_LABELS[dt]}
                </span>
                {d ? (
                  <>
                    <span className="sv-folder__file-version">v{d.version}</span>
                    <span className={`sv-folder__file-dot sv-folder__file-dot--${d.status === "complete" ? "ok" : "warn"}`} />
                  </>
                ) : (
                  <span className="sv-folder__file-dot sv-folder__file-dot--empty" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Small components ── */

function AiAvatar() {
  return (
    <div className="sv-ai-avatar">
      <ChatBubbleIcon />
    </div>
  );
}

function RenderContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="sv-chat__bold">{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/* ── Inline SVG icons (no external deps) ── */

function ChevronLeftIcon() {
  return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
}
function ChevronRightIcon() {
  return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
}
function ChevronRightSmIcon() {
  return <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
}
function DocIcon() {
  return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}
function PaperclipIcon() {
  return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
}
function SendIcon() {
  return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>;
}
function PlusIcon() {
  return <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
}
function DotsIcon() {
  return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" /></svg>;
}
function ChatBubbleIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
}

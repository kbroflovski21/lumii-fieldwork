import { useState, useEffect, useRef, useCallback } from "react";
import { Bot } from "lucide-react";
import { ProfileMenu } from "../shared/ProfileMenu";
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
type ActiveLayer = "sop" | "ai";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

interface GeneratePreview {
  docType: "supervision" | "report";
  folderId: string;
  content: string;
  basedOnSopVersion: number;
  status: "generating" | "preview";
}

/* ── Initial seed data ── */

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

function mockGenerateDoc(sopContent: string, docType: "supervision" | "report"): string {
  if (docType === "supervision") {
    return `基于当前 SOP 自动生成的实时督导要求：

1. 服务开始时检查是否按规范完成身份确认和开场流程
2. 监测服务过程中的关键操作步骤是否遗漏
3. 关注安全隐患和违规行为
4. 服务结束前检查是否完成总结和满意度询问

（此为 AI 模拟生成，后续将接入 LLM API）`;
  }
  return `基于当前 SOP 自动生成的服务后报告要求：

1. 提取服务基本信息（时间、地点、人员）
2. 逐项核对 SOP 要求的执行情况
3. 记录服务过程中的异常事件
4. 评估整体合规性
5. 生成改进建议

（此为 AI 模拟生成，后续将接入 LLM API）`;
}

/* ══════════════════════════════════════════════ */

let nextMsgId = 5000;
function makeTimestamp(): string {
  return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function getFolderStatus(f: StdFolder): "complete" | "partial" | "empty" {
  const hasSop = f.sop && f.sop.status === "complete";
  const hasSv = f.supervision && f.supervision.status === "complete";
  const hasRp = f.report && f.report.status === "complete";
  if (hasSop && hasSv && hasRp) return "complete";
  if (hasSop) return "partial";
  return "empty";
}

const STATUS_LABELS: Record<string, string> = {
  complete: "完整",
  partial: "部分",
  empty: "待建",
};

export function SupervisorContentInner() {
  return (
    <div className="sv-content-standalone">
      <SOPContent />
    </div>
  );
}

function SOPContent() {
  const [folders, setFolders] = useState<StdFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>("sop");
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingDocType, setEditingDocType] = useState<DocType | null>(null);
  const [generalCollapsed, setGeneralCollapsed] = useState(false);
  const [serviceCollapsed, setServiceCollapsed] = useState(false);
  const [dirCollapsed, setDirCollapsed] = useState(false);

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

  /* Fetch folders from API */
  useEffect(() => {
    fetch("/api/sops").then(r => r.json()).then(data => {
      const sops = data.sops ?? [];
      const mapped: StdFolder[] = sops.map((s: any) => ({
        id: s.id,
        type: s.type,
        name: s.name,
        sop: s.sopContent ? {
          status: "complete" as const,
          content: s.sopContent,
          source: s.sopSource ?? "manual",
          version: s.sopVersion ?? 1,
          history: s.sopHistory ?? [],
        } : null,
        supervision: s.supervisionContent ? {
          status: "complete" as const,
          content: s.supervisionContent,
          source: s.supervisionSource ?? "ai_generated",
          version: s.supervisionVersion ?? 1,
          history: s.supervisionHistory ?? [],
        } : null,
        report: s.reportContent ? {
          status: "complete" as const,
          content: s.reportContent,
          source: s.reportSource ?? "ai_generated",
          version: s.reportVersion ?? 1,
          history: s.reportHistory ?? [],
        } : null,
      }));
      setFolders(mapped);
      if (mapped.length > 0 && !selectedFolder) setSelectedFolder(mapped[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Confirmation modal */
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    danger?: boolean;
  } | null>(null);

  /* Generate preview */
  const [generatePreview, setGeneratePreview] = useState<GeneratePreview | null>(null);

  /* AI layer: which doc is being viewed in version history */
  const [aiViewingDoc, setAiViewingDoc] = useState<"supervision" | "report" | null>(null);
  const [aiViewingVersion, setAiViewingVersion] = useState<number | null>(null);

  /* Derived */
  const folder = folders.find((f) => f.id === selectedFolder);
  const sopDoc = folder?.sop ?? null;

  /* Reset state on folder change */
  useEffect(() => {
    setIsEditing(false);
    setEditingDocType(null);
    setViewingVersion(null);
    setGeneratePreview(null);
    setAiViewingDoc(null);
    setAiViewingVersion(null);
    if (folder?.sop) setEditContent(folder.sop.content);
  }, [selectedFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Auto-scroll chat */
  useEffect(() => {
    if (copilotOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, copilotOpen]);

  /* ── Chat helpers ── */
  const pushChat = useCallback((role: "user" | "agent", content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: String(++nextMsgId), role, content, timestamp: makeTimestamp() },
    ]);
  }, []);

  const sendToLLM = useCallback(
    async (userText: string) => {
      setIsTyping(true);
      pushChat("user", userText);
      setCopilotOpen(true);

      try {
        const allMessages = [...messages, { id: String(nextMsgId++), role: "user" as const, content: userText, timestamp: makeTimestamp() }];
        const resp = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
            systemPrompt: `你是金色年华养老服务平台的AI助手，帮助集团管理员管理SOP规范文档。
当前已有的规范：${folders.map(f => f.name).join("、")}。
你可以帮助用户：创建新规范、编辑规范内容、解答SOP相关问题。
回答简洁实用。`,
          }),
        });
        const data = await resp.json();
        pushChat("agent", data.reply ?? "回复异常");
      } catch {
        pushChat("agent", "网络错误，请重试。");
      }
      setIsTyping(false);
    },
    [pushChat, messages, folders],
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
  const handleSave = (docType: DocType) => {
    if (!folder) return;
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folder.id) return f;
        const updated = { ...f };
        const oldDoc = f[docType];
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
        updated[docType] = newDoc;
        return updated;
      }),
    );
    // Persist to API
    const fieldMap: Record<DocType, string> = { sop: "sopContent", supervision: "supervisionContent", report: "reportContent" };
    const sourceMap: Record<DocType, string> = { sop: "sopSource", supervision: "supervisionSource", report: "reportSource" };
    const body: any = { [fieldMap[docType]]: editContent, [sourceMap[docType]]: folder[docType]?.source ?? "manual" };
    fetch(`/api/sops/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    setIsEditing(false);
    setEditingDocType(null);
  };

  /* ── Generate and confirm flow ── */
  const handleGenerate = (docType: "supervision" | "report") => {
    if (!folder || !sopDoc) return;
    setGeneratePreview({
      docType,
      folderId: folder.id,
      content: "",
      basedOnSopVersion: sopDoc.version,
      status: "generating",
    });
    fetch("/api/ai/generate-doc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sopContent: sopDoc.content, sopName: folder.name, docType }),
    }).then(r => r.json()).then(data => {
      setGeneratePreview((prev) => {
        if (!prev || prev.folderId !== folder.id || prev.docType !== docType) return prev;
        return { ...prev, content: data.content ?? "生成失败", status: "preview" as const };
      });
    }).catch(() => {
      setGeneratePreview((prev) => {
        if (!prev) return prev;
        return { ...prev, content: "AI 生成失败，请重试", status: "preview" as const };
      });
    });
  };

  const handleAcceptGenerate = () => {
    if (!generatePreview || !folder) return;
    const { docType, content, basedOnSopVersion } = generatePreview;
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folder.id) return f;
        const updated = { ...f };
        const oldDoc = f[docType];
        const newVersion = (oldDoc?.version ?? 0) + 1;
        updated[docType] = {
          status: "complete",
          content,
          source: "ai_generated",
          version: newVersion,
          history: [
            ...(oldDoc?.history ?? []),
            { version: newVersion, date: new Date().toISOString().slice(0, 10), summary: `AI 基于 SOP v${basedOnSopVersion} 生成` },
          ],
        };
        return updated;
      }),
    );
    // Persist AI-generated content to API
    const fieldMap: Record<string, string> = { supervision: "supervisionContent", report: "reportContent" };
    const sourceMap: Record<string, string> = { supervision: "supervisionSource", report: "reportSource" };
    const summaryMap: Record<string, string> = { supervision: "supervisionChangeSummary", report: "reportChangeSummary" };
    const body: any = {
      [fieldMap[docType]]: content,
      [sourceMap[docType]]: "ai_generated",
      [summaryMap[docType]]: `AI 基于 SOP v${basedOnSopVersion} 生成`,
    };
    fetch(`/api/sops/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    setGeneratePreview(null);
  };

  const handleDiscardGenerate = () => {
    setGeneratePreview(null);
  };

  /* ── Directory helpers ── */
  const generalFolders = folders.filter((f) => f.type === "general");
  const serviceFolders = folders.filter((f) => f.type === "service");

  const selectFolder = (folderId: string) => {
    setSelectedFolder(folderId);
    setIsEditing(false);
    setEditingDocType(null);
    setViewingVersion(null);
    setGeneratePreview(null);
    setAiViewingDoc(null);
    setAiViewingVersion(null);
  };

  /* ── Folder CRUD ── */
  const handleFolderAction = (action: string, f: StdFolder, newName?: string) => {
    if (action === "rename_confirm" && newName) {
      setFolders((prev) => prev.map((ff) => (ff.id === f.id ? { ...ff, name: newName } : ff)));
      // Persist rename to API
      fetch(`/api/sops/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      }).catch(() => {});
    } else if (action === "delete") {
      setConfirmModal({
        title: `删除「${f.name}」`,
        message: "该规范下的所有文件（SOP、督导要求、报告要求）将全部删除，此操作不可撤销。",
        danger: true,
        onConfirm: () => {
          // Persist delete to API
          fetch(`/api/sops/${f.id}`, { method: "DELETE" }).catch(() => {});
          setFolders((prev) => prev.filter((ff) => ff.id !== f.id));
          if (selectedFolder === f.id) setSelectedFolder("");
          setConfirmModal(null);
        },
      });
    }
  };

  /* ── Add new folder ── */
  const handleAddFolder = async (type: "general" | "service") => {
    const name = prompt(type === "general" ? "请输入通用规范名称：" : "请输入服务项目规范名称：");
    if (!name?.trim()) return;
    try {
      const resp = await fetch("/api/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      });
      const newSop = await resp.json();
      const newFolder: StdFolder = {
        id: newSop.id,
        type: newSop.type,
        name: newSop.name,
        sop: null,
        supervision: null,
        report: null,
      };
      setFolders(prev => [...prev, newFolder]);
      setSelectedFolder(newSop.id);
    } catch {}
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

  /* ── Breadcrumb ── */
  const breadcrumb = folder
    ? `${folder.type === "general" ? "通用规范" : "服务项目规范"} / ${folder.name}`
    : "";

  return (
    <>
      <div className="sv-main">
        {/* LEFT: Directory */}
        {dirCollapsed ? (
          <div className="sv-dir sv-dir--collapsed">
            <button className="sv-panel-hdr__toggle" onClick={() => setDirCollapsed(false)} type="button">
              <ChevronRightIcon />
            </button>
          </div>
        ) : (
          <div className="sv-dir" style={{ width: dirWidth, flexShrink: 0 }}>
            <div className="sv-panel-hdr">
              <span className="sv-panel-hdr__title">目录</span>
              <button className="sv-panel-hdr__toggle" onClick={() => setDirCollapsed(true)} type="button">
                <ChevronLeftIcon />
              </button>
            </div>
            <div className="sv-dir__scroll">
              <DirectorySection
                title="通用规范"
                folders={generalFolders}
                collapsed={generalCollapsed}
                onToggleCollapse={() => setGeneralCollapsed(!generalCollapsed)}
                selectedFolder={selectedFolder}
                onSelect={selectFolder}
                onAdd={() => handleAddFolder("general")}
                onFolderAction={handleFolderAction}
              />
              <div className="sv-dir__divider" />
              <DirectorySection
                title="服务项目规范"
                folders={serviceFolders}
                collapsed={serviceCollapsed}
                onToggleCollapse={() => setServiceCollapsed(!serviceCollapsed)}
                selectedFolder={selectedFolder}
                onSelect={selectFolder}
                onAdd={() => handleAddFolder("service")}
                onFolderAction={handleFolderAction}
              />
            </div>
          </div>
        )}

        {/* Drag handle left */}
        <div className="sv-drag-handle" onMouseDown={handleMouseDown("left")} />

        {/* CONTENT AREA */}
        <div className="sv-doc">
          {/* Layer toggle bar */}
          {folder && (
            <div className="sv-layer-bar">
              <span className="sv-layer-bar__breadcrumb">{breadcrumb}</span>
              <div className="sv-layer-toggle">
                <button
                  className={`sv-layer-btn ${activeLayer === "sop" ? "sv-layer-btn--active" : ""}`}
                  onClick={() => { setActiveLayer("sop"); setGeneratePreview(null); }}
                >
                  {activeLayer === "sop" && <span className="sv-layer-btn__dot sv-layer-btn__dot--accent" />}
                  规范文档
                </button>
                <button
                  className={`sv-layer-btn ${activeLayer === "ai" ? "sv-layer-btn--ai-active" : ""}`}
                  onClick={() => { setActiveLayer("ai"); setIsEditing(false); setViewingVersion(null); }}
                >
                  {activeLayer === "ai" && <span className="sv-layer-btn__dot sv-layer-btn__dot--white" />}
                  AI 督导配置
                </button>
              </div>
            </div>
          )}

          {/* SOP Layer */}
          {activeLayer === "sop" && (
            <>
              {viewingVersion !== null && sopDoc ? (
                <SopVersionView
                  folder={folder!}
                  doc={sopDoc}
                  viewingVersion={viewingVersion}
                  onBack={() => setViewingVersion(null)}
                  onSelectVersion={setViewingVersion}
                />
              ) : folder && sopDoc ? (
                <SopDocView
                  folder={folder}
                  doc={sopDoc}
                  isEditing={isEditing && editingDocType === "sop"}
                  editContent={editContent}
                  onEditContentChange={setEditContent}
                  onStartEdit={() => { setIsEditing(true); setEditingDocType("sop"); setEditContent(sopDoc.content); }}
                  onSave={() => handleSave("sop")}
                  onCancelEdit={() => { setIsEditing(false); setEditingDocType(null); setEditContent(sopDoc.content); }}
                  onViewHistory={() => setViewingVersion(sopDoc.history.length > 0 ? sopDoc.history[0].version : sopDoc.version)}
                  onDelete={() => {
                    setConfirmModal({
                      title: "删除 SOP 文档",
                      message: `确定要删除「${folder.name}」的 SOP 文档吗？删除后，督导要求和报告要求将无法对应到 SOP。`,
                      danger: true,
                      onConfirm: () => {
                        setFolders((prev) =>
                          prev.map((ff) => {
                            if (ff.id !== folder.id) return ff;
                            return { ...ff, sop: null };
                          }),
                        );
                        // Persist SOP content removal to API
                        fetch(`/api/sops/${folder.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ sopContent: null }),
                        }).catch(() => {});
                        setConfirmModal(null);
                      },
                    });
                  }}
                />
              ) : folder && isEditing && editingDocType === "sop" ? (
                <div className="sv-doc__scroll" style={{ padding: 24 }}>
                  <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{folder.name} — 编写 SOP</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="sv-btn sv-btn--ghost" onClick={() => { setIsEditing(false); setEditingDocType(null); }}>取消</button>
                      <button className="sv-btn" onClick={() => handleSave("sop")}>保存</button>
                    </div>
                  </div>
                  <textarea
                    className="sv-doc__editor"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="请输入 SOP 内容，每行一个步骤，例如：&#10;1. 问候确认身份&#10;2. 询问身体状况&#10;3. ..."
                    autoFocus
                  />
                </div>
              ) : folder ? (
                <div className="sv-doc__empty">
                  <div>该规范尚未创建 SOP 文档</div>
                  <button
                    style={{ marginTop: 12, padding: "8px 20px", background: "var(--sv-accent, #0052cc)", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                    onClick={() => { setIsEditing(true); setEditingDocType("sop"); setEditContent(""); }}
                  >开始编写</button>
                </div>
              ) : (
                <div className="sv-doc__empty">在左侧目录中选择一个规范</div>
              )}
            </>
          )}

          {/* AI Config Layer */}
          {activeLayer === "ai" && folder && (
            <AiConfigView
              folder={folder}
              generatePreview={generatePreview}
              onGenerate={handleGenerate}
              onAcceptGenerate={handleAcceptGenerate}
              onDiscardGenerate={handleDiscardGenerate}
              isEditing={isEditing}
              editingDocType={editingDocType}
              editContent={editContent}
              onStartEdit={(dt: "supervision" | "report") => {
                const doc = folder[dt];
                if (!doc) return;
                setIsEditing(true);
                setEditingDocType(dt);
                setEditContent(doc.content);
              }}
              onSave={(dt: DocType) => handleSave(dt)}
              onCancelEdit={() => { setIsEditing(false); setEditingDocType(null); }}
              onEditContentChange={setEditContent}
              aiViewingDoc={aiViewingDoc}
              aiViewingVersion={aiViewingVersion}
              onViewVersion={(dt, v) => { setAiViewingDoc(dt); setAiViewingVersion(v); }}
              onBackFromVersion={() => { setAiViewingDoc(null); setAiViewingVersion(null); }}
            />
          )}

          {activeLayer === "ai" && !folder && (
            <div className="sv-doc__empty">在左侧目录中选择一个规范</div>
          )}
        </div>

        {/* Drag handle right */}
        {copilotOpen && <div className="sv-drag-handle" onMouseDown={handleMouseDown("right")} />}

        {/* RIGHT: Chat */}
        <div className="sv-chat" data-visible={copilotOpen} style={{ width: chatWidth, flexShrink: 0 }}>
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
            <button onClick={handleSubmit} disabled={!input.trim()} className="sv-chat__send-btn" aria-label="发送">
              <SendIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmModal && (
        <div className="sv-modal-backdrop">
          <div className="sv-modal-overlay" onClick={() => setConfirmModal(null)} />
          <div className="sv-modal">
            <div className="sv-modal__title">{confirmModal.title}</div>
            <div className="sv-modal__body">{confirmModal.message}</div>
            <div className="sv-modal__actions">
              <button onClick={() => setConfirmModal(null)} className="sv-btn sv-btn--muted">取消</button>
              <button onClick={confirmModal.onConfirm} className={`sv-btn ${confirmModal.danger ? "sv-btn--danger" : "sv-btn--primary"}`}>
                {confirmModal.confirmLabel ?? "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══ SOP Doc View ═══ */

function SopDocView({
  folder, doc, isEditing, editContent, onEditContentChange,
  onStartEdit, onSave, onCancelEdit, onViewHistory, onDelete,
}: {
  folder: StdFolder;
  doc: StdDoc;
  isEditing: boolean;
  editContent: string;
  onEditContentChange: (v: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onViewHistory: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="sv-doc__toolbar">
        <div>
          <div className="sv-doc__toolbar-name">{folder.name} — SOP</div>
          <div className="sv-doc__toolbar-meta">
            <span>v{doc.version}</span>
            <span>·</span>
            <span>{doc.source === "manual" ? "手动录入" : "AI 生成"}</span>
          </div>
        </div>
        <div className="sv-doc__toolbar-actions">
          {isEditing ? (
            <>
              <button onClick={onSave} className="sv-btn sv-btn--primary">保存</button>
              <button onClick={onCancelEdit} className="sv-btn sv-btn--muted">取消</button>
            </>
          ) : (
            <>
              <button onClick={onViewHistory} className="sv-btn sv-btn--ai-outline">v{doc.version} 历史</button>
              <button onClick={onStartEdit} className="sv-btn sv-btn--accent-outline">编辑</button>
              <button onClick={onDelete} className="sv-btn sv-btn--danger-outline">删除</button>
            </>
          )}
        </div>
      </div>
      <div className="sv-doc__body">
        {isEditing ? (
          <textarea
            className="sv-doc__editor"
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
          />
        ) : (
          <div className="sv-doc__body-content">{doc.content}</div>
        )}
      </div>
    </>
  );
}

/* ═══ SOP Version View ═══ */

function SopVersionView({
  folder, doc, viewingVersion, onBack, onSelectVersion,
}: {
  folder: StdFolder;
  doc: StdDoc;
  viewingVersion: number;
  onBack: () => void;
  onSelectVersion: (v: number) => void;
}) {
  const historyEntry = doc.history.find((h) => h.version === viewingVersion);
  return (
    <div className="sv-doc__version-view">
      <div className="sv-doc__version-header">
        <div>
          <div className="sv-doc__version-name">{folder.name} — SOP</div>
          <div className="sv-doc__version-label">查看历史版本 v{viewingVersion}</div>
        </div>
        <button onClick={onBack} className="sv-btn sv-btn--primary">返回最新版本 (v{doc.version})</button>
      </div>
      <div className="sv-doc__version-pills">
        {doc.history.map((h) => (
          <button
            key={h.version}
            onClick={() => onSelectVersion(h.version)}
            className="sv-version-pill"
            data-active={h.version === viewingVersion}
          >
            v{h.version} · {h.date}
          </button>
        ))}
      </div>
      <div className="sv-doc__body">
        <div className="sv-doc__body-meta">{historyEntry?.summary ?? ""}</div>
        <div className="sv-doc__body-content sv-doc__body-content--faded">{doc.content}</div>
      </div>
    </div>
  );
}

/* ═══ AI Config View ═══ */

function AiConfigView({
  folder, generatePreview, onGenerate, onAcceptGenerate, onDiscardGenerate,
  isEditing, editingDocType, editContent, onStartEdit, onSave, onCancelEdit, onEditContentChange,
  aiViewingDoc, aiViewingVersion, onViewVersion, onBackFromVersion,
}: {
  folder: StdFolder;
  generatePreview: GeneratePreview | null;
  onGenerate: (dt: "supervision" | "report") => void;
  onAcceptGenerate: () => void;
  onDiscardGenerate: () => void;
  isEditing: boolean;
  editingDocType: DocType | null;
  editContent: string;
  onStartEdit: (dt: "supervision" | "report") => void;
  onSave: (dt: DocType) => void;
  onCancelEdit: () => void;
  onEditContentChange: (v: string) => void;
  aiViewingDoc: "supervision" | "report" | null;
  aiViewingVersion: number | null;
  onViewVersion: (dt: "supervision" | "report", v: number) => void;
  onBackFromVersion: () => void;
}) {
  const sopDoc = folder.sop;
  const svDoc = folder.supervision;
  const rpDoc = folder.report;

  return (
    <div className="sv-ai-layer">
      {/* Banner */}
      <div className="sv-ai-banner">
        <div className="sv-ai-banner__text">
          以下配置用于 <strong>AI 督导系统</strong>（ASR + LLM + TTS 架构）。
          「服务中督导要求」指导实时语音分析；「服务后报告要求」指导自动报告生成。
          修改将直接影响 AI 对服务过程的判断逻辑，建议由技术专家审核后发布。
        </div>
      </div>

      {/* Two cards */}
      <div className="sv-ai-grid">
        <AiDocCard
          title="服务中实时督导要求"
          docType="supervision"
          doc={svDoc}
          sopDoc={sopDoc}
          generatePreview={generatePreview?.docType === "supervision" ? generatePreview : null}
          onGenerate={() => onGenerate("supervision")}
          onAcceptGenerate={onAcceptGenerate}
          onDiscardGenerate={onDiscardGenerate}
          isEditing={isEditing && editingDocType === "supervision"}
          editContent={editContent}
          onStartEdit={() => onStartEdit("supervision")}
          onSave={() => onSave("supervision")}
          onCancelEdit={onCancelEdit}
          onEditContentChange={onEditContentChange}
          viewingVersion={aiViewingDoc === "supervision" ? aiViewingVersion : null}
          onViewVersion={(v) => onViewVersion("supervision", v)}
          onBackFromVersion={onBackFromVersion}
        />
        <AiDocCard
          title="服务后报告要求"
          docType="report"
          doc={rpDoc}
          sopDoc={sopDoc}
          generatePreview={generatePreview?.docType === "report" ? generatePreview : null}
          onGenerate={() => onGenerate("report")}
          onAcceptGenerate={onAcceptGenerate}
          onDiscardGenerate={onDiscardGenerate}
          isEditing={isEditing && editingDocType === "report"}
          editContent={editContent}
          onStartEdit={() => onStartEdit("report")}
          onSave={() => onSave("report")}
          onCancelEdit={onCancelEdit}
          onEditContentChange={onEditContentChange}
          viewingVersion={aiViewingDoc === "report" ? aiViewingVersion : null}
          onViewVersion={(v) => onViewVersion("report", v)}
          onBackFromVersion={onBackFromVersion}
        />
      </div>

      {/* SOP reference */}
      {sopDoc && <SopReference doc={sopDoc} />}
    </div>
  );
}

function AiDocCard({
  title, docType, doc, sopDoc, generatePreview,
  onGenerate, onAcceptGenerate, onDiscardGenerate,
  isEditing, editContent, onStartEdit, onSave, onCancelEdit, onEditContentChange,
  viewingVersion, onViewVersion, onBackFromVersion,
}: {
  title: string;
  docType: "supervision" | "report";
  doc: StdDoc | null;
  sopDoc: StdDoc | null;
  generatePreview: GeneratePreview | null;
  onGenerate: () => void;
  onAcceptGenerate: () => void;
  onDiscardGenerate: () => void;
  isEditing: boolean;
  editContent: string;
  onStartEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onEditContentChange: (v: string) => void;
  viewingVersion: number | null;
  onViewVersion: (v: number) => void;
  onBackFromVersion: () => void;
}) {
  // Version history view
  if (viewingVersion !== null && doc) {
    const historyEntry = doc.history.find((h) => h.version === viewingVersion);
    return (
      <div className="sv-ai-card">
        <div className="sv-ai-card__header">
          <div className="sv-ai-card__title">{title}</div>
          <button onClick={onBackFromVersion} className="sv-btn sv-btn--muted sv-btn--sm">
            返回最新
          </button>
        </div>
        <div className="sv-ai-card__version-pills">
          {doc.history.map((h) => (
            <button
              key={h.version}
              onClick={() => onViewVersion(h.version)}
              className="sv-version-pill"
              data-active={h.version === viewingVersion}
            >
              v{h.version} · {h.date}
            </button>
          ))}
        </div>
        <div className="sv-ai-card__body">
          <div className="sv-doc__body-meta">{historyEntry?.summary ?? ""}</div>
          <div className="sv-ai-card__prompt sv-ai-card__prompt--faded">{doc.content}</div>
        </div>
      </div>
    );
  }

  // Generate preview view
  if (generatePreview) {
    return (
      <div className="sv-ai-card sv-ai-card--preview">
        <div className="sv-ai-card__header">
          <div className="sv-ai-card__title">
            {title}
            <span className="sv-ai-tag sv-ai-tag--preview">
              {generatePreview.status === "generating" ? "生成中..." : "待确认"}
            </span>
          </div>
        </div>
        <div className="sv-ai-card__body">
          {generatePreview.status === "generating" ? (
            <div className="sv-ai-card__loading">
              <div className="sv-typing">
                <span className="sv-typing__dot" />
                <span className="sv-typing__dot" style={{ animationDelay: "150ms" }} />
                <span className="sv-typing__dot" style={{ animationDelay: "300ms" }} />
              </div>
              <span>AI 正在基于 SOP v{generatePreview.basedOnSopVersion} 生成...</span>
            </div>
          ) : (
            <div className="sv-ai-card__prompt">{generatePreview.content}</div>
          )}
        </div>
        {generatePreview.status === "preview" && (
          <div className="sv-ai-card__footer">
            <span className="sv-ai-card__footer-meta">基于 SOP v{generatePreview.basedOnSopVersion} 生成</span>
            <div className="sv-ai-card__footer-actions">
              <button onClick={onDiscardGenerate} className="sv-btn sv-btn--muted">放弃</button>
              <button onClick={onAcceptGenerate} className="sv-btn sv-btn--primary">采用此版本</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Normal view
  return (
    <div className="sv-ai-card">
      <div className="sv-ai-card__header">
        <div className="sv-ai-card__title">
          {title}
          {doc && doc.source === "ai_generated" && <span className="sv-ai-tag">AI 生成</span>}
        </div>
        {doc && <span className="sv-ai-card__version">v{doc.version}</span>}
      </div>
      <div className="sv-ai-card__body">
        {doc ? (
          isEditing ? (
            <textarea
              className="sv-doc__editor"
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
            />
          ) : (
            <div className="sv-ai-card__prompt">{doc.content}</div>
          )
        ) : (
          <div className="sv-ai-card__empty">
            {sopDoc ? "尚未生成，点击下方按钮基于 SOP 生成" : "请先创建 SOP 文档"}
          </div>
        )}
      </div>
      <div className="sv-ai-card__footer">
        <span className="sv-ai-card__footer-meta">
          {doc ? `v${doc.version} · ${doc.source === "ai_generated" ? "AI 生成" : "手动编辑"}` : ""}
        </span>
        <div className="sv-ai-card__footer-actions">
          {isEditing ? (
            <>
              <button onClick={onCancelEdit} className="sv-btn sv-btn--muted">取消</button>
              <button onClick={onSave} className="sv-btn sv-btn--primary">保存</button>
            </>
          ) : (
            <>
              {doc && doc.history.length > 0 && (
                <button onClick={() => onViewVersion(doc.history[0].version)} className="sv-btn sv-btn--ai-outline sv-btn--sm">
                  v{doc.version} 历史
                </button>
              )}
              {doc && <button onClick={onStartEdit} className="sv-btn sv-btn--muted">编辑</button>}
              {sopDoc && (
                <button onClick={onGenerate} className="sv-btn sv-btn--ai-outline">
                  {doc ? "重新生成" : "生成"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SopReference({ doc }: { doc: StdDoc }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sv-sop-ref">
      <button className="sv-sop-ref__header" onClick={() => setOpen(!open)}>
        <span>参考：当前 SOP 文档 (v{doc.version})</span>
        <span className="sv-sop-ref__hint">{open ? "收起" : "展开"}</span>
      </button>
      {open && (
        <div className="sv-sop-ref__body">
          {doc.content}
        </div>
      )}
    </div>
  );
}

/* ═══ Directory ═══ */

function DirectorySection({
  title, folders, collapsed, onToggleCollapse, selectedFolder, onSelect, onAdd, onFolderAction,
}: {
  title: string;
  folders: StdFolder[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  selectedFolder: string;
  onSelect: (folderId: string) => void;
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
            <FolderItem
              key={f.id}
              folder={f}
              isSelected={f.id === selectedFolder}
              onSelect={() => onSelect(f.id)}
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

function FolderItem({
  folder, isSelected, onSelect, onFolderAction,
}: {
  folder: StdFolder;
  isSelected: boolean;
  onSelect: () => void;
  onFolderAction: (action: string, folder: StdFolder, newName?: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);
  const status = getFolderStatus(folder);

  return (
    <div className="sv-folder">
      <div className="sv-folder__row">
        <button
          onClick={onSelect}
          className={`sv-folder__btn ${isSelected ? "sv-folder__btn--selected" : ""}`}
        >
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
          <span className={`sv-folder-status sv-folder-status--${status}`}>
            {STATUS_LABELS[status]}
          </span>
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
    </div>
  );
}

/* ═══ SupervisorPage (standalone) ═══ */

export function SupervisorPage() {
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <div className="sv-page">
      <header className="sv-header">
        <div>
          <h1 className="sv-header__title">集团管理 · 规范管理</h1>
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
      <nav className="sv-rail">
        <div className="sv-rail__logo">
          <DocIcon />
        </div>
        <ProfileMenu />
      </nav>
      <main className="sv-main">
        <SOPContent />
      </main>
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

/* ── Inline SVG icons ── */

function ChevronLeftIcon() {
  return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
}
function ChevronRightIcon() {
  return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
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

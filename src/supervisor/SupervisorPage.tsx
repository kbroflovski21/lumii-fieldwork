import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, X } from "lucide-react";
import { ProfileMenu } from "../shared/ProfileMenu";
import { authFetch } from "../features/siteOperations/api";
import "./supervisor.css";

/* ── Types ── */

interface StdDoc {
  status: "complete" | "incomplete" | "empty";
  content: string;
  source: "manual" | "ai_generated";
  version: number;
  history: Array<{ version: number; date: string; summary: string; content?: string }>;
}

interface StdFolder {
  id: string;
  type: "general" | "service";
  name: string;
  published: boolean;
  sop: StdDoc | null;
  supervision: StdDoc | null;
  guidance: StdDoc | null;
  report: StdDoc | null;
}

type DocType = "sop" | "supervision" | "guidance" | "report";
type ActiveLayer = "sop" | "ai";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

interface GeneratePreview {
  docType: "supervision" | "guidance" | "report";
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
      id: "gen-ltci", type: "general", name: "国家长期护理保险", published: false,
      sop: mkDoc(GENERAL_SOP, "manual", 3, [
        { version: 1, date: "2026-04-01", summary: "初始版本" },
        { version: 2, date: "2026-04-20", summary: "增加满意度询问要求" },
        { version: 3, date: "2026-05-14", summary: "更新违规行为条款" },
      ]),
      supervision: mkDoc(GENERAL_SUPERVISION, "ai_generated", 2, [
        { version: 1, date: "2026-04-01", summary: "AI 初始生成" },
        { version: 2, date: "2026-05-14", summary: "AI 基于 SOP v3 重新推理" },
      ]),
      guidance: mkDoc("1. 到达后提示完成自我介绍和身份确认\n2. 提示记录老人健康状态\n3. 服务结束前提示复述服务内容并询问满意度", "ai_generated", 1, [
        { version: 1, date: "2026-05-14", summary: "AI 初始生成" },
      ]),
      report: mkDoc(GENERAL_REPORT, "ai_generated", 2, [
        { version: 1, date: "2026-04-01", summary: "AI 初始生成" },
        { version: 2, date: "2026-05-14", summary: "AI 基于 SOP v3 重新推理" },
      ]),
    },
    {
      id: "svc-oral", type: "service", name: "清洁照护-口腔清洁", published: false,
      sop: mkDoc(ORAL_SOP, "manual", 2, [
        { version: 1, date: "2026-04-10", summary: "初始版本" },
        { version: 2, date: "2026-05-14", summary: "补充口腔检查要求" },
      ]),
      supervision: mkDoc(ORAL_SUPERVISION, "ai_generated", 1, [
        { version: 1, date: "2026-05-14", summary: "AI 基于 SOP 生成" },
      ]),
      guidance: null,
      report: mkDoc(ORAL_REPORT, "ai_generated", 1, [
        { version: 1, date: "2026-05-14", summary: "AI 基于 SOP 生成" },
      ]),
    },
    {
      id: "svc-vitals", type: "service", name: "基础健康观察-生命体征测量", published: false,
      sop: mkDoc(VITALS_SOP, "manual", 1, [
        { version: 1, date: "2026-05-14", summary: "初始版本" },
      ]),
      supervision: mkDoc(VITALS_SUPERVISION, "ai_generated", 1, [
        { version: 1, date: "2026-05-14", summary: "AI 基于 SOP 生成" },
      ]),
      guidance: null,
      report: mkDoc(VITALS_REPORT, "ai_generated", 1, [
        { version: 1, date: "2026-05-14", summary: "AI 基于 SOP 生成" },
      ]),
    },
  ];
}

const DOC_LABELS: Record<DocType, string> = {
  sop: "SOP",
  supervision: "服务中督导要求",
  guidance: "服务中引导要求",
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

function mockGenerateDoc(sopContent: string, docType: "supervision" | "guidance" | "report"): string {
  if (docType === "supervision") {
    return `基于当前 SOP 自动生成的服务中督导要求：

1. 开场 1 分钟内未做自报家门和身份确认 → 语音提示一次
2. 出现服务结束迹象但未复述服务内容和询问满意度 → 语音提示一次
3. 检测到推销商品、私下收费等违规行为 → 具体描述违规并提示

（此为 AI 模拟生成，后续将接入 LLM API）`;
  }
  if (docType === "guidance") {
    return `基于当前 SOP 自动生成的服务中引导要求：

1. 到达后提示服务人员完成自我介绍和身份确认
2. 根据服务项目提示关键操作步骤（如助餐需确认饮食禁忌）
3. 服务过程中提示记录老人健康状态（血压、体温等）
4. 服务结束前提示复述服务内容并询问满意度

（此为 AI 模拟生成，后续将接入 LLM API）`;
  }
  return `基于当前 SOP 自动生成的服务后报告要求：

1. 是否做了开场确认，如有则记录信息，如无则提示缺失
2. 是否询问了身体情况并总结结果
3. 是否做了结束确认，复述服务内容和询问满意度
4. 检查是否有推销或违规行为，如有则标注

（此为 AI 模拟生成，后续将接入 LLM API）`;
}

/* ══════════════════════════════════════════════ */

let nextMsgId = 5000;
function makeTimestamp(): string {
  return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function getFolderStatus(f: StdFolder): "complete" | "partial" | "empty" {
  const hasSop = f.sop && f.sop.status === "complete";
  const hasRp = f.report && f.report.status === "complete";
  if (!hasSop) return hasSop === null && !f.report ? "empty" : "partial";
  if (f.type === "service") {
    const hasGd = f.guidance && f.guidance.status === "complete";
    return hasSop && hasGd && hasRp ? "complete" : "partial";
  }
  const hasSv = f.supervision && f.supervision.status === "complete";
  return hasSop && hasSv && hasRp ? "complete" : "partial";
}

const STATUS_LABELS: Record<string, string> = {
  complete: "完整",
  partial: "部分",
  empty: "待建",
};

export function SupervisorContentInner() {
  return (
    <div className="sv-content-standalone">
      <div className="sv-page-header">
        <div className="sv-page-header__title">规范管理</div>
        <div className="sv-page-header__subtitle">服务规范、督导标准与质量报告</div>
      </div>
      <div className="sv-content-body">
        <SOPContent />
      </div>
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
    authFetch("/api/sops").then(r => r.json()).then(data => {
      const sops = data.sops ?? [];
      const mapped: StdFolder[] = sops.map((s: any) => ({
        id: s.id,
        type: s.type,
        name: s.name,
        published: s.published ?? false,
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
        guidance: s.guidanceContent ? {
          status: "complete" as const,
          content: s.guidanceContent,
          source: s.guidanceSource ?? "ai_generated",
          version: s.guidanceVersion ?? 1,
          history: s.guidanceHistory ?? [],
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
      const isMobile = window.innerWidth < 768;
      if (mapped.length > 0 && !selectedFolder && !isMobile) setSelectedFolder(mapped[0].id);
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

  /* Prompt modal (replaces window.prompt) */
  const [promptModal, setPromptModal] = useState<{
    title: string;
    onConfirm: (value: string) => void;
  } | null>(null);

  /* Generate preview */
  const [generatePreview, setGeneratePreview] = useState<GeneratePreview | null>(null);

  /* AI layer: which doc is being viewed in version history */
  const [aiViewingDoc, setAiViewingDoc] = useState<"supervision" | "guidance" | "report" | null>(null);
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
        const resp = await authFetch("/api/ai/chat", {
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
    const fieldMap: Record<DocType, string> = { sop: "sopContent", supervision: "supervisionContent", guidance: "guidanceContent", report: "reportContent" };
    const sourceMap: Record<DocType, string> = { sop: "sopSource", supervision: "supervisionSource", guidance: "guidanceSource", report: "reportSource" };
    const body: any = { [fieldMap[docType]]: editContent, [sourceMap[docType]]: folder[docType]?.source ?? "manual" };
    authFetch(`/api/sops/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(() => {
      // If content was cleared, server may auto-unpublish — refresh published state
      fetch(`/api/sops/${folder.id}`).then(r => r.json()).then(data => {
        if (data && typeof data.published === "boolean") {
          setFolders(prev => prev.map(ff => ff.id === folder.id ? { ...ff, published: data.published } : ff));
        }
      }).catch(() => {});
    }).catch(() => {});
    setIsEditing(false);
    setEditingDocType(null);
  };

  /* ── Generate and confirm flow ── */
  const handleGenerate = (docType: "supervision" | "guidance" | "report") => {
    if (!folder || !sopDoc) return;
    setGeneratePreview({
      docType,
      folderId: folder.id,
      content: "",
      basedOnSopVersion: sopDoc.version,
      status: "generating",
    });
    authFetch("/api/ai/generate-doc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sopContent: sopDoc.content, sopName: folder.name, docType, sopType: folder.type }),
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
    const fieldMap: Record<string, string> = { supervision: "supervisionContent", guidance: "guidanceContent", report: "reportContent" };
    const sourceMap: Record<string, string> = { supervision: "supervisionSource", guidance: "guidanceSource", report: "reportSource" };
    const summaryMap: Record<string, string> = { supervision: "supervisionChangeSummary", report: "reportChangeSummary" };
    const body: any = {
      [fieldMap[docType]]: content,
      [sourceMap[docType]]: "ai_generated",
      [summaryMap[docType]]: `AI 基于 SOP v${basedOnSopVersion} 生成`,
    };
    authFetch(`/api/sops/${folder.id}`, {
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
      authFetch(`/api/sops/${f.id}`, {
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
          authFetch(`/api/sops/${f.id}`, { method: "DELETE" }).catch(() => {});
          setFolders((prev) => prev.filter((ff) => ff.id !== f.id));
          if (selectedFolder === f.id) setSelectedFolder("");
          setConfirmModal(null);
        },
      });
    }
  };

  /* ── Add new folder ── */
  const handleAddFolder = (type: "general" | "service") => {
    setPromptModal({
      title: type === "general" ? "请输入通用规范名称" : "请输入服务项目规范名称",
      onConfirm: (name) => doAddFolder(type, name),
    });
  };

  const doAddFolder = async (type: "general" | "service", name: string) => {
    if (!name.trim()) return;
    try {
      const resp = await authFetch("/api/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      });
      const newSop = await resp.json();
      const newFolder: StdFolder = {
        id: newSop.id,
        type: newSop.type,
        name: newSop.name,
        published: false,
        sop: null,
        supervision: null,
        guidance: null,
        report: null,
      };
      setFolders(prev => [...prev, newFolder]);
      setSelectedFolder(newSop.id);
    } catch {}
  };

  const handlePublishToggle = async (f: StdFolder) => {
    const action = f.published ? "unpublish" : "publish";
    try {
      const resp = await authFetch(`/api/sops/${f.id}/${action}`, { method: "POST" });
      if (!resp.ok) {
        const data = await resp.json();
        alert(data.error ?? "操作失败");
        return;
      }
      setFolders(prev => prev.map(ff => ff.id === f.id ? { ...ff, published: !ff.published } : ff));
    } catch {
      alert("网络错误");
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
                onPublishToggle={handlePublishToggle}
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
                onPublishToggle={handlePublishToggle}
              />
            </div>
          </div>
        )}

        {/* Drag handle left */}
        <div className="sv-drag-handle" onMouseDown={handleMouseDown("left")} />

        {/* Mobile scrim when doc drawer is open */}
        {folder && <div className="sv-doc-scrim" onClick={() => setSelectedFolder("")} />}

        {/* CONTENT AREA */}
        <div className={`sv-doc${folder ? " sv-doc--open" : ""}`}>
          {/* Layer toggle bar */}
          {folder && (
            <div className="sv-layer-bar">
              <button className="sv-doc__mobile-close" onClick={() => setSelectedFolder("")} type="button" aria-label="关闭">
                <X size={16} />
              </button>
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
                  AI 辅助配置
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
                        authFetch(`/api/sops/${folder.id}`, {
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
                <div className="sv-doc__empty" style={{ flexDirection: "column", gap: 12 }}>
                  <div>该规范尚未创建 SOP 文档</div>
                  <button
                    className="sv-btn sv-btn--primary"
                    style={{ height: 36, padding: "0 24px", fontSize: 14 }}
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
              onStartEdit={(dt: "supervision" | "guidance" | "report") => {
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
      {promptModal && (
        <PromptModal
          title={promptModal.title}
          onConfirm={(v) => { promptModal.onConfirm(v); setPromptModal(null); }}
          onCancel={() => setPromptModal(null)}
        />
      )}
    </>
  );
}

/* ═══ Prompt Modal ═══ */

function PromptModal({ title, onConfirm, onCancel }: { title: string; onConfirm: (value: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div className="sv-modal-backdrop">
      <div className="sv-modal-overlay" onClick={onCancel} />
      <div className="sv-modal">
        <div className="sv-modal__title">{title}</div>
        <div className="sv-modal__body">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) { onConfirm(value.trim()); } if (e.key === "Escape") onCancel(); }}
            placeholder="请输入名称..."
            style={{
              width: "100%", height: 40, padding: "0 14px",
              border: "1px solid var(--sv-line, #DDD5CC)", borderRadius: 10,
              fontSize: 14, outline: "none", background: "var(--sv-surface, #FFFCF8)",
              color: "var(--sv-text, #2D2520)", fontFamily: "inherit",
            }}
          />
        </div>
        <div className="sv-modal__actions">
          <button onClick={onCancel} className="sv-btn sv-btn--muted">取消</button>
          <button onClick={() => value.trim() && onConfirm(value.trim())} className="sv-btn sv-btn--primary" disabled={!value.trim()}>确定</button>
        </div>
      </div>
    </div>
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
        <div className="sv-doc__body-content sv-doc__body-content--faded">
          {historyEntry?.content ?? doc.content}
        </div>
        {!historyEntry?.content && <p className="sw-text-muted" style={{ fontSize: 11, margin: "8px 0 0" }}>该版本未保存内容快照（历史版本）</p>}
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
  onGenerate: (dt: "supervision" | "guidance" | "report") => void;
  onAcceptGenerate: () => void;
  onDiscardGenerate: () => void;
  isEditing: boolean;
  editingDocType: DocType | null;
  editContent: string;
  onStartEdit: (dt: "supervision" | "guidance" | "report") => void;
  onSave: (dt: DocType) => void;
  onCancelEdit: () => void;
  onEditContentChange: (v: string) => void;
  aiViewingDoc: "supervision" | "guidance" | "report" | null;
  aiViewingVersion: number | null;
  onViewVersion: (dt: "supervision" | "guidance" | "report", v: number) => void;
  onBackFromVersion: () => void;
}) {
  const sopDoc = folder.sop;
  const svDoc = folder.supervision;
  const gdDoc = folder.guidance;
  const rpDoc = folder.report;

  return (
    <div className="sv-ai-layer">
      {/* Banner */}
      <div className="sv-ai-banner">
        <div className="sv-ai-banner__text">
          以下配置用于定义基于上门服务录音的 <strong>AI 辅助功能</strong>。
          「服务中督导要求」对服务中不适当的行为进行监督；「服务中引导要求」在服务过程中针对需要服务人员完成的任务进行提示和引导；「服务后报告要求」定义服务完成后系统自动生成服务记录的关注重点与报告内容。
        </div>
      </div>

      {/* Three cards — vertical stack */}
      <div className="sv-ai-stack">
        <AiDocCard
          title="服务中督导要求"
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
          title="服务中引导要求"
          docType="guidance"
          doc={gdDoc}
          sopDoc={sopDoc}
          generatePreview={generatePreview?.docType === "guidance" ? generatePreview : null}
          onGenerate={() => onGenerate("guidance")}
          onAcceptGenerate={onAcceptGenerate}
          onDiscardGenerate={onDiscardGenerate}
          isEditing={isEditing && editingDocType === "guidance"}
          editContent={editContent}
          onStartEdit={() => onStartEdit("guidance")}
          onSave={() => onSave("guidance")}
          onCancelEdit={onCancelEdit}
          onEditContentChange={onEditContentChange}
          viewingVersion={aiViewingDoc === "guidance" ? aiViewingVersion : null}
          onViewVersion={(v) => onViewVersion("guidance", v)}
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
  docType: "supervision" | "guidance" | "report";
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
          <div className="sv-ai-card__prompt sv-ai-card__prompt--faded">
            {historyEntry?.content ?? doc.content}
          </div>
          {!historyEntry?.content && <p className="sw-text-muted" style={{ fontSize: 11, margin: "8px 0 0" }}>该版本未保存内容快照</p>}
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
  title, folders, collapsed, onToggleCollapse, selectedFolder, onSelect, onAdd, onFolderAction, onPublishToggle,
}: {
  title: string;
  folders: StdFolder[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  selectedFolder: string;
  onSelect: (folderId: string) => void;
  onAdd: () => void;
  onFolderAction: (action: string, folder: StdFolder, newName?: string) => void;
  onPublishToggle: (folder: StdFolder) => void;
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
              onPublishToggle={onPublishToggle}
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
  folder, isSelected, onSelect, onFolderAction, onPublishToggle,
}: {
  folder: StdFolder;
  isSelected: boolean;
  onSelect: () => void;
  onFolderAction: (action: string, folder: StdFolder, newName?: string) => void;
  onPublishToggle: (folder: StdFolder) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);
  const status = getFolderStatus(folder);
  const isComplete = status === "complete";

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
          {folder.published ? (
            <span className="sv-folder-status sv-folder-status--published">已发布</span>
          ) : (
            <span className={`sv-folder-status sv-folder-status--${status}`}>{STATUS_LABELS[status]}</span>
          )}
        </button>
        <div className="sv-folder__actions">
          <button
            onClick={(e) => { e.stopPropagation(); onPublishToggle(folder); }}
            className={`sv-folder__action-btn ${folder.published ? "sv-folder__action-btn--unpublish" : ""}`}
            title={folder.published ? "取消发布" : (isComplete ? "发布" : "不完整，无法发布")}
            disabled={!folder.published && !isComplete}
          >
            {folder.published ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setRenaming(true); setRenameName(folder.name); }}
            className="sv-folder__action-btn"
            title="重命名"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onFolderAction("delete", folder); }}
            className="sv-folder__action-btn sv-folder__action-btn--danger"
            title="删除"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
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

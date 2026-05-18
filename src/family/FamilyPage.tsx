import { useState, useRef, useEffect } from "react";
import "./family.css";

/* ── Mock feed messages ── */

const FEED = [
  {
    id: "f1",
    type: "report",
    date: "今天 09:50",
    tag: "服务报告",
    title: "探访关爱服务已完成",
    body: "社工王建国于今日 09:05-09:48 为张大伟提供了探访关爱服务（43 分钟）。\n\n测量血压 140/88，较上次略降。老人精神状态良好，膝盖疼痛有所好转。\n\nSOP 完成率 100%。",
  },
  {
    id: "f2",
    type: "health",
    date: "05-14",
    tag: "健康周报",
    title: "张大伟 · 本周健康状态总结",
    body: "本周共完成 3 次探访关爱服务，整体状态稳定。\n\n⚠ 血压略偏高（最近一次 140/88，趋势下降）\n⚠ 膝盖疼痛有好转迹象，建议继续观察\n\n精神状态良好，饮食正常。建议持续监测血压，如膝盖再次加重请及时就医复查。",
  },
  {
    id: "f3",
    type: "notice",
    date: "05-12",
    tag: "通知",
    title: "服务时间调整通知",
    body: "尊敬的家属，因翠苑站排班调整，张大伟下周一（05-19）的探访关爱服务将由李晓红负责，服务时间不变（09:00）。如有疑问请联系站点。",
  },
  {
    id: "f4",
    type: "report",
    date: "05-12",
    tag: "服务报告",
    title: "探访关爱服务已完成",
    body: "社工李晓红于 05-12 09:05-09:52 为张大伟提供了探访关爱服务（47 分钟）。\n\n测量血压 145/92。老人反映膝盖疼痛加重，上楼困难。建议尽快安排骨科复查。",
  },
  {
    id: "f5",
    type: "summary",
    date: "05-01",
    tag: "月度汇总",
    title: "张大伟 · 4 月服务月度汇总",
    body: "4 月共完成服务 12 次（探访关爱 12 次）。\n\n血压趋势：整体平稳，均值 142/90。\n情绪状态：良好，偶有低落。\n运动能力：膝盖疼痛从月中开始加重。\n\n综合建议：持续监测血压，安排骨科复查评估膝盖。",
  },
];

/* ── Types ── */

type Tab = "feed" | "feedback";

type FeedItem = (typeof FEED)[number];

const TAG_TYPE_MAP: Record<string, string> = {
  "服务报告": "report",
  "健康周报": "health",
  "通知": "notice",
  "月度汇总": "summary",
};

/* ── Icon helper ── */

function IconSend() {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */

export function FamilyPage() {
  const [tab, setTab] = useState<Tab>("feed");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "feed", label: "消息动态", icon: "📢" },
    { key: "feedback", label: "意见反馈", icon: "💬" },
  ];

  return (
    <div className="family-page">
      {/* Header */}
      <header className="family-header">
        <div className="family-header__inner">
          <div className="family-header__avatar">👴</div>
          <div>
            <h1 className="family-header__name">张大伟的服务</h1>
            <p className="family-header__sub">张明（儿子）· 金色年华翠苑站</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="family-content">
        {tab === "feed" && <FeedTab expandedId={expandedId} setExpandedId={setExpandedId} />}
        {tab === "feedback" && <FeedbackTab />}
      </div>

      {/* Bottom Nav */}
      <nav className="family-nav">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`family-nav__btn ${tab === t.key ? "family-nav__btn--active" : "family-nav__btn--inactive"}`}
          >
            <span className="family-nav__icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ── Feed Tab ── */

function FeedTab({
  expandedId,
  setExpandedId,
}: {
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  return (
    <div className="family-feed">
      {FEED.map((msg) => (
        <FeedCard
          key={msg.id}
          msg={msg}
          isExpanded={expandedId === msg.id}
          onToggle={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
        />
      ))}
    </div>
  );
}

function FeedCard({
  msg,
  isExpanded,
  onToggle,
}: {
  msg: FeedItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const tagType = TAG_TYPE_MAP[msg.tag] || "report";
  const preview = msg.body
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, 2)
    .join(" ")
    .slice(0, 60);

  return (
    <div className="family-feed-card">
      <button className="family-feed-card__header" onClick={onToggle}>
        <div className="family-feed-card__meta">
          <span className={`family-feed-card__tag family-feed-card__tag--${tagType}`}>{msg.tag}</span>
          <span className="family-feed-card__date">{msg.date}</span>
        </div>
        <p className="family-feed-card__title">{msg.title}</p>
        {!isExpanded && <div className="family-feed-card__preview">{preview}...</div>}
      </button>
      {isExpanded && <div className="family-feed-card__body">{msg.body}</div>}
    </div>
  );
}

/* ── Feedback Tab ── */

interface ChatMsg {
  id: string;
  role: "agent" | "user";
  content: string;
  time: string;
}

function FeedbackTab() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "w",
      role: "agent",
      content:
        "您好，我是客服小张\n\n有什么反馈或建议都可以告诉我，比如：\n· 对服务内容或时间的建议\n· 对服务人员的评价\n· 希望增加或调整的服务\n· 任何疑问或投诉\n\n我们保证翠苑站的运营主管会看到并处理您的每一条留言。",
      time: "",
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: text, time }]);
    setInput("");

    // Mock auto-reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "agent",
          time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          content: `收到您的反馈，我已经记录了：\n\n"${text}"\n\n这条留言会转给翠苑站运营主管处理。如果需要回访确认，我们会主动联系您。\n\n还有其他需要反馈的吗？`,
        },
      ]);
    }, 800);
  };

  return (
    <div className="family-feedback">
      <div className="family-feedback__messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`family-chat-msg family-chat-msg--${msg.role}`}>
            {msg.role === "agent" && (
              <div className="family-chat-msg__avatar">👩‍💼</div>
            )}
            <div className="family-chat-msg__body">
              <div className={`family-chat-msg__bubble family-chat-msg__bubble--${msg.role}`}>
                {msg.content}
              </div>
              {msg.time && (
                <div className={`family-chat-msg__time family-chat-msg__time--${msg.role}`}>
                  {msg.time}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="family-chat-input">
        <div className="family-chat-input__row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入您的反馈..."
            className="family-chat-input__field"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`family-chat-input__send ${input.trim() ? "family-chat-input__send--active" : "family-chat-input__send--disabled"}`}
          >
            <IconSend />
          </button>
        </div>
      </div>
    </div>
  );
}

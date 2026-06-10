import { useState, useEffect, useMemo, useCallback } from "react";
import { MessageSquare, X } from "lucide-react";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { EmptyState } from "../../shared/components/EmptyState";
import { ListToolbar } from "../../shared/components/ListToolbar";
import { FilterDropdown } from "../../shared/components/FilterDropdown";
import { AvatarInitial } from "../../shared/components/AvatarInitial";
import type { FamilyFeedback } from "./contracts";
import { statusText } from "./contracts";

/* ── Mock data ── */
function buildMockFeedback(): FamilyFeedback[] {
  const base = new Date();
  return [
    {
      id: "fb-1",
      serviceObjectId: "e1",
      serviceObjectName: "王桂芬",
      familyContactId: "fc-1",
      familyContactName: "王建国",
      familyRelation: "儿子",
      workerId: "w1",
      workerName: "李明",
      feedbackAt: new Date(base.getTime() - 1 * 86400000).toISOString(),
      channel: "phone",
      content: "李明护工非常细心，每次来都会提前跟我们沟通老人情况，服务态度非常好。妈妈很喜欢他来照顾。",
      sentiment: "positive",
      actionTaken: "已记录并转达护工，作为优秀服务案例分享",
      actionTakenAt: new Date(base.getTime() - 0.5 * 86400000).toISOString(),
      status: "resolved",
    },
    {
      id: "fb-2",
      serviceObjectId: "e2",
      serviceObjectName: "张秀英",
      familyContactId: "fc-2",
      familyContactName: "张伟华",
      familyRelation: "女儿",
      workerId: "w2",
      workerName: "王芳",
      feedbackAt: new Date(base.getTime() - 2 * 86400000).toISOString(),
      channel: "wechat",
      content: "上次服务时护工迟到了20分钟，希望能准时上门。另外妈妈反映洗澡水温偏凉。",
      sentiment: "negative",
      actionTaken: "",
      status: "pending",
    },
    {
      id: "fb-3",
      serviceObjectId: "e3",
      serviceObjectName: "陈美玉",
      familyContactId: "fc-3",
      familyContactName: "陈志远",
      familyRelation: "儿子",
      feedbackAt: new Date(base.getTime() - 3 * 86400000).toISOString(),
      channel: "app",
      content: "整体服务还可以，但希望能增加一些陪聊的时间，老人比较孤独。",
      sentiment: "neutral",
      actionTaken: "已记录，将与护工沟通增加心理关怀内容",
      actionTakenAt: new Date(base.getTime() - 2 * 86400000).toISOString(),
      status: "acknowledged",
    },
    {
      id: "fb-4",
      serviceObjectId: "e4",
      serviceObjectName: "李淑华",
      familyContactId: "fc-4",
      familyContactName: "李文静",
      familyRelation: "女儿",
      workerId: "w4",
      workerName: "陈静",
      feedbackAt: new Date(base.getTime() - 5 * 86400000).toISOString(),
      channel: "in_person",
      content: "陈静护工手法很专业，妈妈的关节疼痛有明显改善。感谢！",
      sentiment: "positive",
      status: "resolved",
      actionTaken: "已记录为正面反馈",
      actionTakenAt: new Date(base.getTime() - 4 * 86400000).toISOString(),
    },
    {
      id: "fb-5",
      serviceObjectId: "e5",
      serviceObjectName: "刘翠兰",
      familyContactId: "fc-5",
      familyContactName: "刘洋",
      familyRelation: "孙子",
      workerId: "w5",
      workerName: "刘洋",
      feedbackAt: new Date(base.getTime() - 6 * 86400000).toISOString(),
      channel: "phone",
      content: "奶奶说护工来了就聊天，没怎么干活。希望能按照服务计划认真执行每一项。",
      sentiment: "negative",
      actionTaken: "",
      status: "pending",
    },
    {
      id: "fb-6",
      serviceObjectId: "e1",
      serviceObjectName: "王桂芬",
      familyContactId: "fc-1",
      familyContactName: "王建国",
      familyRelation: "儿子",
      workerId: "w1",
      workerName: "李明",
      feedbackAt: new Date(base.getTime() - 10 * 86400000).toISOString(),
      channel: "wechat",
      content: "服务一切正常，没有特别需要反映的。",
      sentiment: "neutral",
      status: "acknowledged",
    },
  ];
}

type ChannelFilter = "" | FamilyFeedback["channel"];
type SentimentFilter = "" | FamilyFeedback["sentiment"];
type FBStatusFilter = "" | FamilyFeedback["status"];

const channelFilterOptions: Array<{ label: string; value: ChannelFilter }> = [
  { label: "全部渠道", value: "" },
  { label: "电话", value: "phone" },
  { label: "微信", value: "wechat" },
  { label: "上门", value: "in_person" },
  { label: "APP", value: "app" },
  { label: "其他", value: "other" },
];

const sentimentFilterOptions: Array<{ label: string; value: SentimentFilter }> = [
  { label: "全部情感", value: "" },
  { label: "正面", value: "positive" },
  { label: "中性", value: "neutral" },
  { label: "负面", value: "negative" },
];

const statusFilterOptions: Array<{ label: string; value: FBStatusFilter }> = [
  { label: "全部状态", value: "" },
  { label: "待处理", value: "pending" },
  { label: "已确认", value: "acknowledged" },
  { label: "已解决", value: "resolved" },
];

const channelLabels: Record<string, string> = {
  phone: "电话",
  wechat: "微信",
  in_person: "上门",
  app: "APP",
  other: "其他",
};

function sentimentTone(sentiment: FamilyFeedback["sentiment"]): string {
  if (sentiment === "positive") return "success";
  if (sentiment === "negative") return "danger";
  return "muted";
}

function fbStatusTone(status: FamilyFeedback["status"]): string {
  if (status === "resolved") return "success";
  if (status === "acknowledged") return "info";
  return "warning";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ── Detail Drawer ── */
function FeedbackDetailDrawer({ feedback, onClose, onUpdateAction }: {
  feedback: FamilyFeedback;
  onClose: () => void;
  onUpdateAction: (id: string, action: string) => void;
}) {
  const [actionText, setActionText] = useState(feedback.actionTaken ?? "");

  const handleSaveAction = useCallback(() => {
    onUpdateAction(feedback.id, actionText);
  }, [feedback.id, actionText, onUpdateAction]);

  return (
    <>
      <button className="sw-scrim" onClick={onClose} type="button" aria-label="关闭" />
      <div className="sw-drawer fb-drawer">
        <div className="sw-drawer__header">
          <div className="sw-drawer__profile">
            <AvatarInitial name={feedback.familyContactName} size="lg" />
            <div>
              <h3>家属反馈详情</h3>
              <p>{feedback.familyContactName}({feedback.familyRelation}) - 关于{feedback.serviceObjectName}</p>
            </div>
          </div>
          <button className="sw-drawer__close" onClick={onClose} type="button"><X size={18} /></button>
        </div>

        <div className="sw-drawer__body">
          <div className="sw-drawer__section">
            <h4>基本信息</h4>
            <dl className="sw-drawer__fields">
              <div><dt>家属</dt><dd>{feedback.familyContactName}({feedback.familyRelation})</dd></div>
              <div><dt>长者</dt><dd>{feedback.serviceObjectName}</dd></div>
              {feedback.workerName && <div><dt>服务人员</dt><dd>{feedback.workerName}</dd></div>}
              <div><dt>时间</dt><dd>{formatFullDate(feedback.feedbackAt)}</dd></div>
              <div><dt>渠道</dt><dd><StatusBadge tone="muted">{channelLabels[feedback.channel] ?? feedback.channel}</StatusBadge></dd></div>
              <div><dt>情感</dt><dd><StatusBadge tone={sentimentTone(feedback.sentiment)}>{statusText[feedback.sentiment] ?? feedback.sentiment}</StatusBadge></dd></div>
              <div><dt>状态</dt><dd><StatusBadge tone={fbStatusTone(feedback.status)}>{statusText[feedback.status] ?? feedback.status}</StatusBadge></dd></div>
            </dl>
          </div>

          <div className="sw-drawer__section">
            <h4>反馈内容</h4>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--site-heading)", margin: 0 }}>
              {feedback.content}
            </p>
          </div>

          <div className="sw-drawer__section">
            <h4>处理措施</h4>
            <textarea
              className="sw-field__textarea"
              value={actionText}
              onChange={e => setActionText(e.target.value)}
              placeholder="记录针对此反馈采取的措施..."
              rows={4}
              style={{ width: "100%" }}
            />
            {feedback.actionTakenAt && (
              <p style={{ fontSize: 11, color: "var(--site-muted)", margin: "6px 0 0" }}>
                上次更新: {formatFullDate(feedback.actionTakenAt)}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                className="sw-btn sw-btn--primary"
                onClick={handleSaveAction}
                type="button"
                disabled={actionText === (feedback.actionTaken ?? "")}
              >
                保存措施
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main Component ── */
export function FamilyFeedbackArea() {
  const [feedbacks, setFeedbacks] = useState<FamilyFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("");
  const [statusFilter, setStatusFilter] = useState<FBStatusFilter>("");
  const [selectedFeedback, setSelectedFeedback] = useState<FamilyFeedback | null>(null);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setFeedbacks(buildMockFeedback());
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdateAction = useCallback((id: string, action: string) => {
    setFeedbacks(prev => prev.map(fb =>
      fb.id === id ? { ...fb, actionTaken: action, actionTakenAt: new Date().toISOString(), status: action ? "acknowledged" as const : fb.status } : fb
    ));
    setSelectedFeedback(prev =>
      prev && prev.id === id ? { ...prev, actionTaken: action, actionTakenAt: new Date().toISOString(), status: action ? "acknowledged" as const : prev.status } : prev
    );
  }, []);

  const filtered = useMemo(() => {
    let result = feedbacks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(fb =>
        fb.serviceObjectName.toLowerCase().includes(q) ||
        fb.familyContactName.toLowerCase().includes(q) ||
        (fb.workerName ?? "").toLowerCase().includes(q) ||
        fb.content.toLowerCase().includes(q)
      );
    }
    if (channelFilter) {
      result = result.filter(fb => fb.channel === channelFilter);
    }
    if (sentimentFilter) {
      result = result.filter(fb => fb.sentiment === sentimentFilter);
    }
    if (statusFilter) {
      result = result.filter(fb => fb.status === statusFilter);
    }
    return result;
  }, [feedbacks, searchQuery, channelFilter, sentimentFilter, statusFilter]);

  if (loading) {
    return <div className="site-operations-placeholder">家属反馈加载中...</div>;
  }

  return (
    <section aria-label="家属反馈" className="fb-page">
      <div className="fb-header">
        <h2 className="fb-header__title">家属反馈</h2>
      </div>

      <ListToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="搜索家属/长者/护工/内容..."
        filters={
          <>
            <FilterDropdown options={channelFilterOptions} value={channelFilter} onChange={v => setChannelFilter(v as ChannelFilter)} />
            <FilterDropdown options={sentimentFilterOptions} value={sentimentFilter} onChange={v => setSentimentFilter(v as SentimentFilter)} />
            <FilterDropdown options={statusFilterOptions} value={statusFilter} onChange={v => setStatusFilter(v as FBStatusFilter)} />
          </>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="暂无反馈" description="没有匹配的家属反馈记录" />
      ) : (
        <div className="sw-table-container">
          <div className="fb-table__head">
            <span>日期</span>
            <span>家属</span>
            <span>长者</span>
            <span>护工</span>
            <span>渠道</span>
            <span>情感</span>
            <span>内容摘要</span>
            <span>状态</span>
          </div>
          <div className="fb-table__body">
            {filtered.map(fb => (
              <button
                key={fb.id}
                className="fb-table__row"
                onClick={() => setSelectedFeedback(fb)}
                type="button"
              >
                <span>{formatDate(fb.feedbackAt)}</span>
                <span className="fb-family-cell">
                  <span className="fb-family-name">{fb.familyContactName}</span>
                  <span className="fb-family-relation">{fb.familyRelation}</span>
                </span>
                <span>{fb.serviceObjectName}</span>
                <span>{fb.workerName ?? "--"}</span>
                <span><StatusBadge tone="muted">{channelLabels[fb.channel] ?? fb.channel}</StatusBadge></span>
                <span><StatusBadge tone={sentimentTone(fb.sentiment)}>{statusText[fb.sentiment] ?? fb.sentiment}</StatusBadge></span>
                <span className="fb-content-excerpt">
                  {fb.content.length > 25 ? fb.content.slice(0, 25) + "..." : fb.content}
                </span>
                <span><StatusBadge tone={fbStatusTone(fb.status)}>{statusText[fb.status] ?? fb.status}</StatusBadge></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedFeedback && (
        <FeedbackDetailDrawer
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onUpdateAction={handleUpdateAction}
        />
      )}
    </section>
  );
}

import { useState, useEffect, useMemo, useCallback } from "react";
import { PhoneCall, X, Plus } from "lucide-react";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { EmptyState } from "../../shared/components/EmptyState";
import { ListToolbar } from "../../shared/components/ListToolbar";
import { FilterDropdown } from "../../shared/components/FilterDropdown";
import { AvatarInitial } from "../../shared/components/AvatarInitial";
import type { FollowUpRecord } from "./contracts";
import { statusText } from "./contracts";

/* ── Mock data ── */
function buildMockFollowUps(): FollowUpRecord[] {
  const base = new Date();
  return [
    {
      id: "fu-1",
      serviceSessionId: "sess-c-0",
      serviceObjectId: "e1",
      serviceObjectName: "王桂芬",
      type: "in_person",
      conductedBy: "op-1",
      conductedByName: "赵丽",
      conductedAt: new Date(base.getTime() - 1 * 86400000).toISOString(),
      location: "文三路218号3单元501",
      conclusion: "老人精神状态良好，对服务表示满意。家中环境整洁，无安全隐患。",
      notes: "老人提到希望增加口腔清洁频次",
      status: "completed",
    },
    {
      id: "fu-2",
      serviceObjectId: "e2",
      serviceObjectName: "张秀英",
      type: "phone_manual",
      conductedBy: "op-1",
      conductedByName: "赵丽",
      conductedAt: new Date(base.getTime() - 2 * 86400000).toISOString(),
      conclusion: "电话回访，老人反映服务人员态度好，但希望提前通知上门时间。",
      status: "completed",
    },
    {
      id: "fu-3",
      serviceObjectId: "e3",
      serviceObjectName: "陈美玉",
      type: "phone_ai",
      conductedBy: "ai-system",
      conductedByName: "AI系统",
      conductedAt: new Date(base.getTime() - 3 * 86400000).toISOString(),
      conclusion: "AI电话回访完成，老人对服务基本满意，语音情绪分析正常。",
      status: "completed",
    },
    {
      id: "fu-4",
      serviceObjectId: "e4",
      serviceObjectName: "李淑华",
      type: "in_person",
      conductedBy: "op-2",
      conductedByName: "钱敏",
      conductedAt: new Date(base.getTime() - 5 * 86400000).toISOString(),
      location: "环城西路98号5楼",
      conclusion: "上门回访，发现老人有轻度情绪问题，建议增加心理支持服务项目。",
      notes: "已通知护工注意观察",
      status: "completed",
    },
    {
      id: "fu-5",
      serviceObjectId: "e5",
      serviceObjectName: "刘翠兰",
      type: "phone_manual",
      conductedBy: "op-1",
      conductedByName: "赵丽",
      conductedAt: new Date(base.getTime() + 2 * 86400000).toISOString(),
      conclusion: "",
      status: "scheduled",
    },
    {
      id: "fu-6",
      serviceSessionId: "sess-c-5",
      serviceObjectId: "e1",
      serviceObjectName: "王桂芬",
      type: "phone_ai",
      conductedBy: "ai-system",
      conductedByName: "AI系统",
      conductedAt: new Date(base.getTime() - 7 * 86400000).toISOString(),
      conclusion: "AI电话回访，老人表示近期身体不适，已建议安排就医。",
      status: "completed",
    },
    {
      id: "fu-7",
      serviceObjectId: "e3",
      serviceObjectName: "陈美玉",
      type: "in_person",
      conductedBy: "op-2",
      conductedByName: "钱敏",
      conductedAt: new Date(base.getTime() + 1 * 86400000).toISOString(),
      location: "湖墅南路88号",
      conclusion: "",
      status: "scheduled",
    },
  ];
}

type TypeFilter = "" | FollowUpRecord["type"];
type DateFilter = "" | "week" | "month";

const typeFilterOptions: Array<{ label: string; value: TypeFilter }> = [
  { label: "全部类型", value: "" },
  { label: "上门回访", value: "in_person" },
  { label: "人工电话", value: "phone_manual" },
  { label: "AI电话", value: "phone_ai" },
];

const dateFilterOptions: Array<{ label: string; value: DateFilter }> = [
  { label: "日期范围", value: "" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
];

function typeTone(type: FollowUpRecord["type"]): string {
  if (type === "in_person") return "accent";
  if (type === "phone_manual") return "info";
  return "muted";
}

function followUpStatusTone(status: FollowUpRecord["status"]): string {
  if (status === "completed") return "success";
  if (status === "scheduled") return "warning";
  return "muted";
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
function FollowUpDetailDrawer({ record, onClose }: { record: FollowUpRecord; onClose: () => void }) {
  return (
    <>
      <button className="sw-scrim" onClick={onClose} type="button" aria-label="关闭" />
      <div className="sw-drawer fu-drawer">
        <div className="sw-drawer__header">
          <div className="sw-drawer__profile">
            <AvatarInitial name={record.serviceObjectName} size="lg" />
            <div>
              <h3>回访详情 - {record.serviceObjectName}</h3>
              <p>{formatFullDate(record.conductedAt)}</p>
            </div>
          </div>
          <button className="sw-drawer__close" onClick={onClose} type="button"><X size={18} /></button>
        </div>

        <div className="sw-drawer__body">
          <div className="sw-drawer__section">
            <h4>基本信息</h4>
            <dl className="sw-drawer__fields">
              <div><dt>长者</dt><dd>{record.serviceObjectName}</dd></div>
              <div><dt>回访类型</dt><dd><StatusBadge tone={typeTone(record.type)}>{statusText[record.type] ?? record.type}</StatusBadge></dd></div>
              <div><dt>执行人</dt><dd>{record.conductedByName}</dd></div>
              <div><dt>时间</dt><dd>{formatFullDate(record.conductedAt)}</dd></div>
              {record.location && <div><dt>地址</dt><dd>{record.location}</dd></div>}
              <div><dt>状态</dt><dd><StatusBadge tone={followUpStatusTone(record.status)}>{statusText[record.status] ?? record.status}</StatusBadge></dd></div>
              {record.serviceSessionId && <div><dt>关联服务</dt><dd>{record.serviceSessionId}</dd></div>}
            </dl>
          </div>

          <div className="sw-drawer__section">
            <h4>回访结论</h4>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--site-heading)", margin: 0 }}>
              {record.conclusion || <span style={{ color: "var(--site-muted)" }}>暂无结论（待回访）</span>}
            </p>
          </div>

          {record.notes && (
            <div className="sw-drawer__section">
              <h4>备注</h4>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--site-heading)", margin: 0 }}>{record.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Create Modal ── */
function CreateFollowUpModal({ onClose, onCreate }: { onClose: () => void; onCreate: (record: FollowUpRecord) => void }) {
  const [elderName, setElderName] = useState("");
  const [type, setType] = useState<FollowUpRecord["type"]>("phone_manual");
  const [conductor, setConductor] = useState("");
  const [conclusion, setConclusion] = useState("");

  const handleSubmit = useCallback(() => {
    if (!elderName.trim()) return;
    const newRecord: FollowUpRecord = {
      id: `fu-new-${Date.now()}`,
      serviceObjectId: "new",
      serviceObjectName: elderName.trim(),
      type,
      conductedBy: "op-current",
      conductedByName: conductor.trim() || "当前用户",
      conductedAt: new Date().toISOString(),
      conclusion: conclusion.trim(),
      status: conclusion.trim() ? "completed" : "scheduled",
    };
    onCreate(newRecord);
    onClose();
  }, [elderName, type, conductor, conclusion, onClose, onCreate]);

  return (
    <>
      <button className="sw-scrim" onClick={onClose} type="button" aria-label="关闭" />
      <div className="sw-drawer fu-create-modal">
        <div className="sw-drawer__header">
          <div>
            <h3>新建回访</h3>
          </div>
          <button className="sw-drawer__close" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <div className="sw-drawer__body">
          <div className="sw-drawer__section">
            <div className="sw-field" style={{ display: "grid", gap: 6 }}>
              <span>长者姓名 *</span>
              <input
                value={elderName}
                onChange={e => setElderName(e.target.value)}
                placeholder="请输入长者姓名"
                style={{ background: "var(--site-card)", border: "1px solid var(--site-line)", borderRadius: 10, height: 38, padding: "0 12px", fontSize: 13, outline: "none", fontFamily: "inherit", color: "var(--site-text)" }}
              />
            </div>
            <div className="sw-field" style={{ display: "grid", gap: 6, marginTop: 14 }}>
              <span>回访类型</span>
              <select
                value={type}
                onChange={e => setType(e.target.value as FollowUpRecord["type"])}
                style={{ background: "var(--site-card)", border: "1px solid var(--site-line)", borderRadius: 10, height: 38, padding: "0 12px", fontSize: 13, outline: "none", fontFamily: "inherit", color: "var(--site-text)" }}
              >
                <option value="in_person">上门回访</option>
                <option value="phone_manual">人工电话</option>
                <option value="phone_ai">AI电话</option>
              </select>
            </div>
            <div className="sw-field" style={{ display: "grid", gap: 6, marginTop: 14 }}>
              <span>执行人</span>
              <input
                value={conductor}
                onChange={e => setConductor(e.target.value)}
                placeholder="执行人姓名"
                style={{ background: "var(--site-card)", border: "1px solid var(--site-line)", borderRadius: 10, height: 38, padding: "0 12px", fontSize: 13, outline: "none", fontFamily: "inherit", color: "var(--site-text)" }}
              />
            </div>
            <div className="sw-field" style={{ display: "grid", gap: 6, marginTop: 14 }}>
              <span>结论</span>
              <textarea
                className="sw-field__textarea"
                value={conclusion}
                onChange={e => setConclusion(e.target.value)}
                placeholder="回访结论（留空则为待回访状态）"
                rows={4}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <button className="sw-btn sw-btn--secondary" onClick={onClose} type="button">取消</button>
            <button className="sw-btn sw-btn--primary" onClick={handleSubmit} type="button" disabled={!elderName.trim()}>创建</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main Component ── */
export function FollowUpsArea() {
  const [records, setRecords] = useState<FollowUpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("");
  const [selectedRecord, setSelectedRecord] = useState<FollowUpRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setRecords(buildMockFollowUps());
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleCreate = useCallback((record: FollowUpRecord) => {
    setRecords(prev => [record, ...prev]);
  }, []);

  const filtered = useMemo(() => {
    let result = records;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.serviceObjectName.toLowerCase().includes(q) || r.conductedByName.toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      result = result.filter(r => r.type === typeFilter);
    }
    if (dateFilter) {
      const now = new Date();
      if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
        result = result.filter(r => r.conductedAt >= weekAgo);
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
        result = result.filter(r => r.conductedAt >= monthAgo);
      }
    }
    return result;
  }, [records, searchQuery, typeFilter, dateFilter]);

  if (loading) {
    return <div className="site-operations-placeholder">回访记录加载中...</div>;
  }

  return (
    <section aria-label="回访管理" className="fu-page">
      <div className="fu-header">
        <h2 className="fu-header__title">回访管理</h2>
      </div>

      <ListToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="搜索长者/执行人..."
        filters={
          <>
            <FilterDropdown options={typeFilterOptions} value={typeFilter} onChange={v => setTypeFilter(v as TypeFilter)} />
            <FilterDropdown options={dateFilterOptions} value={dateFilter} onChange={v => setDateFilter(v as DateFilter)} />
          </>
        }
        actions={
          <button className="sw-btn sw-btn--primary" onClick={() => setShowCreate(true)} type="button">
            <Plus size={16} />
            新建回访
          </button>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState icon={PhoneCall} title="暂无回访记录" description="没有匹配的回访记录" />
      ) : (
        <div className="sw-table-container">
          <div className="fu-table__head">
            <span>日期</span>
            <span>类型</span>
            <span>执行人</span>
            <span>长者</span>
            <span>结论摘要</span>
            <span>状态</span>
          </div>
          <div className="fu-table__body">
            {filtered.map(record => (
              <button
                key={record.id}
                className="fu-table__row"
                onClick={() => setSelectedRecord(record)}
                type="button"
              >
                <span>{formatDate(record.conductedAt)}</span>
                <span>
                  <StatusBadge tone={typeTone(record.type)}>{statusText[record.type] ?? record.type}</StatusBadge>
                </span>
                <span>{record.conductedByName}</span>
                <span className="sw-table__cell-name">
                  <AvatarInitial name={record.serviceObjectName} size="sm" />
                  <span>{record.serviceObjectName}</span>
                </span>
                <span className="fu-conclusion-excerpt">
                  {record.conclusion ? (record.conclusion.length > 30 ? record.conclusion.slice(0, 30) + "..." : record.conclusion) : <span style={{ color: "var(--site-muted)" }}>待回访</span>}
                </span>
                <span>
                  <StatusBadge tone={followUpStatusTone(record.status)}>{statusText[record.status] ?? record.status}</StatusBadge>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedRecord && (
        <FollowUpDetailDrawer record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}

      {showCreate && (
        <CreateFollowUpModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </section>
  );
}

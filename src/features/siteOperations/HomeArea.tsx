import { useState, useCallback } from "react";
import { ChevronRight, X, AlertTriangle, ExternalLink, Clock, PanelRightOpen, PanelRightClose } from "lucide-react";
import { workAreas, type SiteOperationsHomeResponse, type WorkAreaId } from "./contracts";
import type { Resource } from "./useSiteOperationsData";
import { useAgentChat } from "./useAgentChat";
import { ChatStream } from "./ChatStream";
import { CommandInput } from "./CommandInput";

export function HomeArea({ resource, onRoute }: { resource: Resource<SiteOperationsHomeResponse>; onRoute?: (area: string) => void }) {
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const getToken = useCallback(() => {
    // Dev mode: read from localStorage. In production, this comes from login flow.
    return localStorage.getItem("gy_chat_token") ?? "";
  }, []);

  const { messages, connected, wip, handleSend, endRef } = useAgentChat({
    agentId: "lumii-goldenyears",
    sessionId: "home",
    getToken,
  });

  if (resource.status === "loading" || resource.status === "idle") {
    return <div className="site-operations-placeholder">首页数据加载中</div>;
  }

  if (resource.status === "error") {
    return (
      <section aria-label="首页" className="home-page">
        <div className="home-page__main">
          <div className="home-empty">
            <strong>加载失败</strong>
            <span>{resource.error}</span>
          </div>
        </div>
      </section>
    );
  }

  if (resource.status !== "success") {
    return <div className="site-operations-placeholder">首页数据加载中</div>;
  }

  const home = resource.data;
  const { activities = [], highlights = [], recommendedActions = [], summary } = home;

  return (
    <section aria-label="首页" className="home-page" data-home-permission={home.permissionState} data-sidebar-collapsed={isSidebarCollapsed}>
      <div className="home-page__main">
        <button
          aria-label="打开今日概览抽屉"
          className="home-breadcrumb"
          onClick={() => setIsInsightOpen(true)}
          type="button"
        >
          <span>首页</span>
          <ChevronRight size={14} />
          <strong>今日概览</strong>
          <small>打开</small>
        </button>

        <div className="home-chat">
          <ChatStream
            messages={messages}
            wip={wip}
            connected={connected}
            endRef={endRef}
          />
          <CommandInput
            onSend={handleSend}
            disabled={!connected}
            placeholder="输入指令或问题..."
          />
        </div>
      </div>

      <button
        aria-label="关闭今日概览遮罩"
        className="home-drawer-scrim"
        data-open={isInsightOpen}
        onClick={() => setIsInsightOpen(false)}
        type="button"
      />

      <aside className="home-sidebar" aria-label="首页高亮信息" data-open={isInsightOpen}>
        <header className="home-sidebar__header">
          <div>
            <h2>今日概览</h2>
            <time>{formatDate(summary.date)}</time>
          </div>
          <div className="home-sidebar__header-actions">
            <button aria-label="关闭今日概览" className="home-sidebar__close" onClick={() => setIsInsightOpen(false)} type="button">
              <X size={16} />
            </button>
            <button
              aria-label={isSidebarCollapsed ? "展开侧栏" : "收起侧栏"}
              className="home-sidebar-toggle"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              type="button"
            >
              {isSidebarCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
            </button>
          </div>
        </header>

        {home.permissionState !== "full" ? <p className="home-sidebar__permission">{permissionLabel(home.permissionState)}</p> : null}

        <div className="home-sidebar__body">
          <div className="home-sidebar__kpi-grid">
            <KpiItem label="今日服务" value={summary.totalScheduledServices} />
            <KpiItem label="待排缺口" value={summary.unassignedServices} tone="warning" />
            <KpiItem label="待复核" value={summary.recordsNeedReview} tone="accent" />
            <KpiItem label="在线人员/工牌" value={`${summary.activeSocialWorkers}/${summary.onlineBadges}`} />
            <KpiItem label="可导出记录" value={summary.exportableServiceRecords} tone="success" />
          </div>

          <section className="home-sidebar__section">
            <h3><AlertTriangle size={14} /> 重点关注</h3>
            <div className="home-sidebar__alerts">
              {highlights.map((highlight) => (
                <article className="home-alert" data-severity={highlight.severity} key={highlight.id}>
                  <strong>{highlight.title}</strong>
                  <span>{highlight.description}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="home-sidebar__section">
            <h3><ExternalLink size={14} /> 处理入口</h3>
            <div className="home-sidebar__actions">
              {recommendedActions.map((action) => (
                <button aria-label={action.label} className="home-action-entry" key={action.id} onClick={() => onRoute?.(action.targetWorkspace)} type="button">
                  <div>
                    <span className="home-action-entry__label">{action.label}</span>
                    <small className="home-action-entry__target">{workAreaLabel(action.targetWorkspace)}</small>
                  </div>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </section>

          <section className="home-sidebar__section">
            <h3><Clock size={14} /> 最近动态</h3>
            <div className="home-sidebar__timeline">
              {activities.slice(0, 3).map((activity) => (
                <div className="home-timeline-item" key={activity.id}>
                  <time>{formatTime(activity.occurredAt)}</time>
                  <span>{activity.title}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </section>
  );
}

function KpiItem({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="home-kpi" data-tone={tone}>
      <span className="home-kpi__value">{value}</span>
      <span className="home-kpi__label">{label}</span>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function permissionLabel(permission: SiteOperationsHomeResponse["permissionState"]) {
  if (permission === "read_only") return "只读模式";
  if (permission === "restricted") return "权限受限";
  return "完整权限";
}

function workAreaLabel(area: WorkAreaId) {
  return workAreas.find((item) => item.id === area)?.label ?? "工作区";
}


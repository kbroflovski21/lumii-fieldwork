import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowUp,
  Bot,
  CalendarDays,
  ClipboardList,
  FileText,
  MapPinned,
  Search,
  UserRound,
  UsersRound
} from "lucide-react";
import {
  homeMessages,
  serviceObjects,
  serviceRecords,
  serviceSchedules,
  socialWorkers,
  todaySummary,
  type MockTabId
} from "./mockData";
import "./siteOperationsRedpeiMock.css";

const navItems = [
  { id: "home", label: "首页", icon: Bot },
  { id: "social_workers", label: "人员", icon: UsersRound },
  { id: "service_schedules", label: "排期", icon: CalendarDays },
  { id: "service_records", label: "记录", icon: FileText },
  { id: "service_objects", label: "对象", icon: UserRound }
] satisfies Array<{ id: MockTabId; label: string; icon: typeof Bot }>;

export function SiteOperationsRedpeiMock() {
  const [activeTab, setActiveTab] = useState<MockTabId>("home");

  return (
    <div className="fieldwork-mock">
      <div className="fieldwork-mock__frame">
        <AppHeader />
        <DesktopNav activeTab={activeTab} onSelect={setActiveTab} />
        <main className="fieldwork-mock__main">
          {activeTab === "home" ? <HomePage /> : null}
          {activeTab === "social_workers" ? <SocialWorkersPage /> : null}
          {activeTab === "service_schedules" ? <SchedulesPage /> : null}
          {activeTab === "service_records" ? <RecordsPage /> : null}
          {activeTab === "service_objects" ? <ObjectsPage /> : null}
        </main>
        <MobileNav activeTab={activeTab} onSelect={setActiveTab} />
      </div>
    </div>
  );
}

function AppHeader() {
  return (
    <header className="mock-header">
      <div className="mock-logo">
        <ClipboardList size={19} />
      </div>
      <div>
        <h1>Lumii 站点运营助手</h1>
        <p>
          <span />
          运行中 · 今日服务 {todaySummary.totalServices} 单
        </p>
      </div>
    </header>
  );
}

function DesktopNav({ activeTab, onSelect }: { activeTab: MockTabId; onSelect: (tab: MockTabId) => void }) {
  return (
    <aside className="mock-rail" aria-label="站点运营工作区">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            aria-label={item.label}
            data-active={activeTab === item.id}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <Icon size={18} />
          </button>
        );
      })}
    </aside>
  );
}

function MobileNav({ activeTab, onSelect }: { activeTab: MockTabId; onSelect: (tab: MockTabId) => void }) {
  return (
    <nav className="mock-mobile-nav" aria-label="站点运营移动工作区">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button data-active={activeTab === item.id} key={item.id} onClick={() => onSelect(item.id)} type="button">
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function HomePage() {
  return (
    <section className="mock-home" aria-label="首页">
      <div className="mock-chat">
        <div className="mock-message">
          <div className="mock-bubble">{homeMessages[0].body}</div>
          <time>{homeMessages[0].time}</time>
        </div>
        <div className="mock-chat-panels" aria-label="首页高亮信息">
          <article>
            <span>今日服务</span>
            <strong>{todaySummary.totalServices} 单</strong>
          </article>
          <article>
            <span>待排服务</span>
            <strong>2 单</strong>
          </article>
          <article>
            <span>待复核记录</span>
            <strong>{todaySummary.pendingRecords} 条</strong>
          </article>
        </div>
        {homeMessages.slice(1).map((message) => (
          <div className="mock-message" key={`${message.time}-${message.body}`}>
            <div className="mock-bubble">{message.body}</div>
            <time>{message.time}</time>
          </div>
        ))}
        <section className="mock-card mock-chat-focus">
          <h2>当前建议</h2>
          <p>优先分配吴叔叔 14:00 的陪诊服务，推荐服务人员赵敏。</p>
        </section>
      </div>
      <aside className="mock-home-panel" aria-label="首页高亮信息">
        <SummaryCards />
        <section className="mock-card mock-focus">
          <h2>重点关注</h2>
          <dl>
            <div>
              <dt>待排服务</dt>
              <dd>吴叔叔 · 陪诊</dd>
            </div>
            <div>
              <dt>推荐服务人员</dt>
              <dd>赵敏</dd>
            </div>
            <div>
              <dt>最近记录</dt>
              <dd>陈阿姨 · 音频和文字已保存</dd>
            </div>
          </dl>
        </section>
      </aside>
      <CommandBar />
    </section>
  );
}

function SummaryCards() {
  return (
    <div className="mock-summary">
      <article>
        <strong>{todaySummary.totalServices}</strong>
        <span>今日服务</span>
      </article>
      <article>
        <strong>{todaySummary.scheduledServices}</strong>
        <span>已排期</span>
      </article>
      <article>
        <strong>{todaySummary.availableWorkers}</strong>
        <span>可服务人员</span>
      </article>
      <article>
        <strong>{todaySummary.pendingRecords}</strong>
        <span>待复核记录</span>
      </article>
    </div>
  );
}

function SocialWorkersPage() {
  return (
    <WorkPage title="服务人员" note="服务人员档案、服务能力和工牌绑定">
      <CompactTable
        columns={["服务人员", "能力", "今日排期", "工牌", "状态"]}
        rows={socialWorkers.map((worker) => [
          <PrimaryLine key="name" primary={worker.name} secondary={worker.phone} />,
          worker.skills,
          worker.servicesToday,
          worker.badge,
          <Status key="status" value={worker.status} />
        ])}
      />
    </WorkPage>
  );
}

function SchedulesPage() {
  return (
    <WorkPage
      title="服务排期"
      note="服务清单、日历视图和地图视图"
      tools={
        <div className="mock-segment" aria-label="排期视图">
          <button data-active="true" type="button">清单</button>
          <button type="button">日历</button>
          <button type="button">
            <MapPinned size={14} />
            地图
          </button>
        </div>
      }
    >
      <CompactTable
        columns={["时间", "服务对象", "服务项目", "地址", "服务人员", "状态"]}
        rows={serviceSchedules.map((schedule) => [
          schedule.time,
          <PrimaryLine key="person" primary={schedule.person} secondary={schedule.profile} />,
          schedule.service,
          schedule.address,
          schedule.worker,
          <Status key="status" value={schedule.status} />
        ])}
      />
    </WorkPage>
  );
}

function RecordsPage() {
  return (
    <WorkPage title="服务记录" note="原始音频、转写文字、服务人员和服务对象关联可查">
      <CompactTable
        columns={["服务对象", "服务时间", "服务人员 / 工牌", "音频 / 文字", "复核", "导出"]}
        rows={serviceRecords.map((record) => [
          record.person,
          record.time,
          <PrimaryLine key="worker" primary={record.worker} secondary={record.badge} />,
          <PrimaryLine key="media" primary={record.media} secondary={record.transcript} />,
          <Status key="review" value={record.review} />,
          <Status key="export" value={record.exportState} />
        ])}
      />
    </WorkPage>
  );
}

function ObjectsPage() {
  return (
    <WorkPage title="健康档案" note="服务对象健康情况、照护重点和家属订阅" variant="health">
      <CompactTable
        columns={["档案", "健康情况", "照护重点", "家属订阅", "服务计划"]}
        rows={serviceObjects.map((object) => [
          <HealthProfile key="profile" name={object.name} profile={object.profile} address={object.address} />,
          <PrimaryLine key="health" primary={object.healthStatus} secondary={object.address} />,
          object.careFocus,
          object.familySubscription,
          <PrimaryLine key="latest" primary={object.latestService} secondary={object.servicePlan} />
        ])}
      />
    </WorkPage>
  );
}

function WorkPage({
  children,
  note,
  title,
  tools,
  variant
}: {
  children: ReactNode;
  note: string;
  title: string;
  tools?: ReactNode;
  variant?: string;
}) {
  return (
    <section className="mock-work" data-variant={variant} aria-label={title}>
      <header className="mock-work__header">
        <div>
          <h2>{title}</h2>
          <p>{note}</p>
        </div>
        <div className="mock-work__tools">
          <label className="mock-search">
            <Search size={15} />
            <input aria-label={`搜索${title}`} placeholder="搜索" />
          </label>
          {tools}
        </div>
      </header>
      <div className="mock-card mock-table-card">{children}</div>
    </section>
  );
}

function CompactTable({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  const tableStyle = { "--column-count": columns.length } as CSSProperties;

  return (
    <div className="compact-table" role="table" style={tableStyle}>
      <div className="compact-table__surface">
        <div className="compact-table__head" role="row">
          {columns.map((column) => (
            <span key={column} role="columnheader">{column}</span>
          ))}
        </div>
        {rows.map((row, rowIndex) => (
          <div className="compact-table__row" key={rowIndex} role="row">
            {row.map((cell, index) => (
              <div data-label={columns[index]} key={`${rowIndex}-${columns[index]}`} role="cell">
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PrimaryLine({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <span className="primary-line">
      <strong>{primary}</strong>
      <small>{secondary}</small>
    </span>
  );
}

function HealthProfile({ address, name, profile }: { address: string; name: string; profile: string }) {
  return (
    <span className="health-profile">
      <strong>{name}</strong>
      <small>{profile}</small>
      <small>{address}</small>
    </span>
  );
}

function Status({ value }: { value: string }) {
  const tone = value.includes("待") || value.includes("未") || value.includes("暂") ? "warning" : value.includes("休息") ? "muted" : "success";

  return (
    <span className="status-pill" data-tone={tone}>
      {value}
    </span>
  );
}

function CommandBar() {
  return (
    <form className="mock-command" onSubmit={(event) => event.preventDefault()}>
      <input aria-label="输入指令或问题" placeholder="输入指令或问题..." />
      <button aria-label="发送" type="submit">
        <ArrowUp size={18} />
      </button>
    </form>
  );
}

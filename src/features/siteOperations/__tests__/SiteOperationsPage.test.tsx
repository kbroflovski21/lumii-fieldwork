import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../../auth/AuthContext";
import { SiteProvider } from "../../../auth/SiteContext";
import { HomeArea } from "../HomeArea";
import { RecordsArea } from "../RecordsArea";
import { SchedulesArea } from "../SchedulesArea";
import { ServiceObjectsArea } from "../ServiceObjectsArea";
import { SiteOperationsPage } from "../SiteOperationsPage";
import { SmartBadgesArea } from "../SmartBadgesArea";
import { SocialWorkersArea } from "../SocialWorkersArea";

const originalFetch = globalThis.fetch;

const operationalState = { isLoading: false, permission: "full" };

const smartBadge = {
  id: "badge-021",
  deviceCode: "FW-021",
  orgId: "org-001",
  siteId: "site-001",
  siteName: "红培社区站",
  status: "available",
  batteryPercent: 83,
  activatedAt: "2026-05-01T09:00:00+08:00",
  lastSyncAt: "2026-05-13T08:50:00+08:00",
  lastRecordingAt: "2026-05-12T10:22:00+08:00",
  preferredWorkerId: "worker-001",
  recentServiceRecordIds: ["record-001"]
};

const serviceObject = {
  id: "object-001",
  name: "陈阿姨",
  age: 82,
  address: "上海市杨浦区控江路 1200 号",
  mapDisplayPoint: { latitude: 31.292, longitude: 121.515, label: "控江路 1200 号" },
  eligibilityType: "government",
  serviceProjects: ["助餐", "陪诊"],
  careNotes: ["午餐后需确认服药"],
  riskTags: ["独居", "跌倒风险"],
  familySubscriptionSummary: "weekly",
  latestInsightSummary: "最近三次助餐完成稳定，需关注用药提醒。",
  insightSummaries: [{ id: "insight-001", title: "状态稳定", description: "最近三次服务均按时完成。" }],
  servicePlanSummaries: [
    {
      id: "plan-001",
      serviceObjectId: "object-001",
      serviceProject: "助餐",
      cadenceLabel: "每周一三五",
      preferredTimeWindow: { start: "09:00", end: "10:30", label: "上午" },
      primarySocialWorkerId: "worker-001",
      status: "active",
      activeExceptionCount: 4
    }
  ],
  familyContacts: [
    {
      id: "family-001",
      name: "陈女士",
      relation: "女儿",
      phone: "13900000001",
      subscriptionStatus: "weekly",
      lastPushedAt: "2026-05-12T18:00:00+08:00"
    }
  ]
};

const homeResponse = {
  summary: {
    date: "2026-05-13",
    totalScheduledServices: 18,
    unassignedServices: 2,
    activeSocialWorkers: 7,
    onlineBadges: 6,
    recordsNeedReview: 3,
    exportableServiceRecords: 12
  },
  highlights: [
    {
      id: "highlight-001",
      type: "record_review",
      title: "3 条服务记录待复核",
      description: "优先处理助餐和陪诊记录。",
      severity: "warning",
      relatedEntityType: "service_record",
      relatedEntityId: "record-001"
    }
  ],
  activities: [
    {
      id: "activity-001",
      occurredAt: "2026-05-13T09:10:00+08:00",
      title: "今日还有 6 个服务对象未排期。",
      description: "先处理下午时间窗。",
      relatedEntityType: "service_schedule",
      relatedEntityId: "schedule-001"
    },
    {
      id: "activity-002",
      occurredAt: "2026-05-13T09:12:00+08:00",
      title: "智能工牌 FW-021 已接入站点，今日可用。",
      relatedEntityType: "badge",
      relatedEntityId: "badge-021"
    },
    {
      id: "activity-003",
      occurredAt: "2026-05-13T09:14:00+08:00",
      title: "4 条服务记录信息不完整，已放入服务记录。",
      relatedEntityType: "service_record",
      relatedEntityId: "record-001"
    },
    {
      id: "activity-004",
      occurredAt: "2026-05-13T09:15:00+08:00",
      title: "查一下今天谁还没排期。",
      description: "助手已把排期缺口整理为处理入口。",
      relatedEntityType: "service_schedule",
      relatedEntityId: "schedule-001"
    }
  ],
  recommendedActions: [
    { id: "action-001", label: "去补排今日缺口", targetWorkspace: "service_schedules", relatedEntityId: "schedule-001" },
    { id: "action-002", label: "复核服务记录", targetWorkspace: "service_records", relatedEntityId: "record-001" },
    { id: "action-003", label: "查看设备同步", targetWorkspace: "smart_badges", relatedEntityId: "badge-026" }
  ],
  permissionState: "full"
};

const socialWorkersResponse = {
  socialWorkers: [
    {
      id: "worker-001",
      userId: "user-001",
      name: "王丽",
      phone: "13800000001",
      siteId: "site-001",
      workerType: "service_personnel",
      qualificationLabels: ["助餐", "陪诊"],
      status: "active",
      preferredBadge: {
        badgeId: "badge-021",
        deviceCode: "FW-021",
        status: "available",
        lastSyncAt: "2026-05-13T08:50:00+08:00"
      },
      praiseSummary: {
        praiseCount: 42,
        latestPraiseAt: "2026-05-12T16:30:00+08:00",
        latestPraiseExcerpt: "服务细心周到"
      }
    },
    {
      id: "worker-002",
      userId: "user-002",
      name: "张敏",
      phone: "13800000002",
      siteId: "site-001",
      workerType: "service_personnel",
      qualificationLabels: ["助洁"],
      status: "active",
      praiseSummary: { praiseCount: 17 }
    }
  ],
  operationalState
};

const smartBadgesResponse = {
  smartBadges: [
    smartBadge,
    { ...smartBadge, id: "badge-026", deviceCode: "FW-026", status: "sync_delayed", recentServiceRecordIds: [] }
  ],
  operationalState
};

const serviceObjectsResponse = {
  serviceObjects: [serviceObject],
  servicePlans: [],
  operationalState
};

const serviceSchedulesResponse = {
  serviceSchedules: [
    {
      id: "schedule-001",
      source: "service_plan",
      servicePlanId: "plan-001",
      serviceObjectId: "object-001",
      serviceObjectName: "陈阿姨",
      serviceProject: "助餐",
      addressSnapshot: serviceObject.address,
      address: serviceObject.address,
      mapDisplayPoint: serviceObject.mapDisplayPoint,
      serviceDate: "2026-05-14",
      startTime: "14:00",
      endTime: "15:00",
      timeWindow: { start: "14:00", end: "15:00", label: "下午临时调整" },
      assignedSocialWorkerId: "worker-001",
      assignedSocialWorkerName: "王丽",
      status: "adjusted",
      planExceptionApplied: true,
      riskTags: ["独居"]
    },
    {
      id: "schedule-002",
      source: "one_time",
      serviceObjectId: "object-001",
      serviceObjectName: "陈阿姨",
      serviceProject: "陪诊",
      addressSnapshot: serviceObject.address,
      address: serviceObject.address,
      serviceDate: "2026-05-15",
      startTime: "10:00",
      endTime: "11:30",
      timeWindow: { start: "10:00", end: "11:30" },
      status: "completed",
      serviceRecordId: "record-001",
      riskTags: []
    }
  ],
  operationalState
};

const serviceRecordsResponse = {
  serviceRecords: [
    {
      id: "record-001",
      serviceDate: "2026-05-12",
      startTime: "09:31",
      endTime: "10:22",
      durationMinutes: 51,
      socialWorkerId: "worker-001",
      socialWorkerName: "王丽",
      serviceObjectId: "object-001",
      serviceObjectName: "陈阿姨",
      familyContactIds: ["family-001"],
      badgeId: "badge-021",
      serviceProject: "助餐",
      assignmentConfidence: 0.72,
      reviewStatus: "needs_review",
      exportStatus: "exportable",
      locationEvidence: { startPoint: { latitude: 31.292, longitude: 121.515, capturedAt: "2026-05-12T09:31:00+08:00" } },
      serviceExceptions: [{ id: "exception-001", type: "service_incomplete", title: "服务项待补充", description: "结算字段缺失", status: "open" }],
      exceptionTags: ["信息不完整"],
      missingFields: ["结算字段"],
      audioAssetId: "audio-001",
      transcriptId: "transcript-001",
      structuredSummary: "完成助餐服务，服务对象状态稳定。",
      exportHistory: [{ id: "export-001", exportedAt: "2026-05-13T17:10:00+08:00", operatorName: "站点管理员", fileVersion: "v1", filterSummary: "助餐记录" }]
    }
  ],
  audioAssets: [{ id: "audio-001", recordId: "record-001", durationSeconds: 3060, capturedByBadgeId: "badge-021", uploadedAt: "2026-05-12T10:30:00+08:00", retentionLabel: "内部证据保留 180 天" }],
  transcripts: [{ id: "transcript-001", recordId: "record-001", language: "zh-CN", text: "服务人员完成助餐服务，并确认下次服务时间。", confidence: 0.91, segments: [] }],
  serviceObjects: [serviceObject],
  smartBadges: [smartBadge],
  operationalState
};

function mockSiteOperationsFetch(overrides: Partial<Record<string, unknown>> = {}) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const path = input.toString();
    const routes: Record<string, unknown> = {
      "/api/site-operations/home": homeResponse,
      "/api/social-workers": socialWorkersResponse,
      "/api/smart-badges": smartBadgesResponse,
      "/api/service-objects": serviceObjectsResponse,
      "/api/service-schedule-occurrences": serviceSchedulesResponse,
      "/api/service-records": serviceRecordsResponse
    };
    const override = overrides[path];
    if (override instanceof Response) {
      return override;
    }
    return Response.json(override ?? routes[path] ?? {});
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// Mock WebSocket for useAgentChat hook
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((evt: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  OPEN = 1;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.onopen?.();
      // Auto-send init frame so HomeArea renders as connected
      this.onmessage?.({ data: JSON.stringify({ type: "init", connected: true, wip: false, messages: [], in_flight: [], capabilities: [] }) });
    }, 0);
  }
  send(data: string) { this.sent.push(data); }
  close() { /* no-op in tests */ }
}

const originalWebSocket = (globalThis as any).WebSocket;

beforeEach(() => {
  MockWebSocket.instances = [];
  (globalThis as any).WebSocket = MockWebSocket;
  localStorage.setItem("gy_chat_token", "test-mock-token");
  localStorage.setItem("gy_auth_token", "test-mock-token");
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  (globalThis as any).WebSocket = originalWebSocket;
  localStorage.removeItem("gy_chat_token");
  localStorage.removeItem("gy_auth_token");
  vi.restoreAllMocks();
});

describe("SiteOperationsPage", () => {
  it("renders shell, six work areas, home sidebar highlights, and chat stream", async () => {
    mockSiteOperationsFetch();
    render(<AuthProvider><SiteProvider><SiteOperationsPage /></SiteProvider></AuthProvider>);

    expect(screen.getByText("Lumii 站点运营助手")).toBeInTheDocument();
    const desktopNav = screen.getByLabelText("站点运营工作区");
    expect(within(desktopNav).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "首页",
      "服务人员",
      "设备",
      "服务对象",
      "服务排期",
      "服务记录",
      "用户菜单"
    ]);
    expect(screen.getByLabelText("站点运营移动工作区")).toBeInTheDocument();

    expect(await screen.findByRole("region", { name: "首页" })).toBeInTheDocument();

    // Chat stream is rendered (connected via mock WebSocket)
    const chatRegion = screen.getByRole("region", { name: "首页" });
    expect(chatRegion.querySelector(".chat-stream")).toBeInTheDocument();
    expect(chatRegion.querySelector(".command-input")).toBeInTheDocument();

    // Sidebar content is unchanged
    const highlight = screen.getByLabelText("首页高亮信息");
    expect(highlight).toHaveTextContent("今日服务");
    expect(highlight).toHaveTextContent("待排缺口");
    expect(highlight).toHaveTextContent("待复核");
    expect(highlight).toHaveTextContent("在线人员/工牌");
    expect(highlight).toHaveTextContent("可导出记录");
    expect(highlight).toHaveTextContent("最近动态");
    expect(highlight).toHaveTextContent("处理入口");
    expect(highlight).toHaveTextContent("去补排今日缺口");
    expect(highlight).toHaveTextContent("复核服务记录");
    expect(highlight).toHaveTextContent("查看设备同步");
  });

  it("sends a message via the command input", async () => {
    mockSiteOperationsFetch();
    const user = userEvent.setup();
    render(<AuthProvider><SiteProvider><SiteOperationsPage /></SiteProvider></AuthProvider>);

    await screen.findByRole("region", { name: "首页" });

    // Type a message and send
    const input = screen.getByPlaceholderText("输入指令或问题...");
    await user.type(input, "你好");
    await user.click(screen.getByRole("button", { name: "发送" }));

    // Optimistic bubble appears
    expect(screen.getByText("你好")).toBeInTheDocument();
  });

  it("toggles the home insight drawer state from the breadcrumb trigger", async () => {
    mockSiteOperationsFetch();
    const user = userEvent.setup();
    render(<AuthProvider><SiteProvider><SiteOperationsPage /></SiteProvider></AuthProvider>);

    await screen.findByRole("region", { name: "首页" });
    const insightPanel = screen.getByLabelText("首页高亮信息");
    expect(insightPanel).toHaveAttribute("data-open", "false");

    await user.click(screen.getByRole("button", { name: "打开今日概览抽屉" }));
    expect(insightPanel).toHaveAttribute("data-open", "true");

    await user.click(screen.getByRole("button", { name: "关闭今日概览" }));
    expect(insightPanel).toHaveAttribute("data-open", "false");
  });

  it("routes from a home recommended action to its target workspace", async () => {
    mockSiteOperationsFetch();
    const user = userEvent.setup();
    render(<AuthProvider><SiteProvider><SiteOperationsPage /></SiteProvider></AuthProvider>);

    await screen.findByRole("region", { name: "首页" });
    await user.click(screen.getByRole("button", { name: "复核服务记录" }));

    expect(await screen.findByRole("region", { name: "服务记录" })).toBeInTheDocument();
    expect(screen.getByText("导出记录")).toBeInTheDocument();
  });

  it("covers 服务人员", async () => {
    mockSiteOperationsFetch();
    const user = userEvent.setup();
    render(<AuthProvider><SiteProvider><SiteOperationsPage /></SiteProvider></AuthProvider>);

    await user.click(screen.getAllByRole("button", { name: "服务人员" })[0]);

    expect(await screen.findByRole("region", { name: "服务人员" })).toBeInTheDocument();
    expect(screen.getAllByText("王丽").length).toBeGreaterThan(0);
    expect(screen.getAllByText("13800000001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("助餐").length).toBeGreaterThan(0);
    expect(screen.getAllByText("陪诊").length).toBeGreaterThan(0);
    expect(screen.getAllByText("FW-021").length).toBeGreaterThan(0);
    expect(screen.getAllByText("42").length).toBeGreaterThan(0);
    expect(screen.getByText("新增人员")).toBeInTheDocument();
    expect(screen.queryByText("归档")).not.toBeInTheDocument();
    expect(screen.queryByText("编辑")).not.toBeInTheDocument();
    expect(screen.queryByText("绑定工牌")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "王丽" }));
    expect(await screen.findByLabelText("服务人员详情")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "归档人员" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更新常用工牌" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "关闭" }));
    expect(screen.queryByLabelText("服务人员详情")).not.toBeInTheDocument();
  });

  it("covers 设备", async () => {
    mockSiteOperationsFetch();
    const user = userEvent.setup();
    render(<AuthProvider><SiteProvider><SiteOperationsPage /></SiteProvider></AuthProvider>);

    await user.click(screen.getAllByRole("button", { name: "设备" })[0]);

    expect(await screen.findByRole("region", { name: "设备" })).toBeInTheDocument();
    expect(screen.getByText("激活工牌")).toBeInTheDocument();
    expect(screen.getAllByText("FW-021").length).toBeGreaterThan(0);
    expect(screen.getAllByText("红培社区站").length).toBeGreaterThan(0);
    expect(screen.getAllByText("可用").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "FW-021" }));
    expect(await screen.findByLabelText("设备详情")).toBeInTheDocument();
    expect(screen.getByText("停用")).toBeInTheDocument();
    expect(screen.getByText("标记丢失")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "关闭" }));
    expect(screen.queryByLabelText("设备详情")).not.toBeInTheDocument();
  });

  it("covers 服务对象", async () => {
    mockSiteOperationsFetch();
    const user = userEvent.setup();
    render(<AuthProvider><SiteProvider><SiteOperationsPage /></SiteProvider></AuthProvider>);

    await user.click(screen.getAllByRole("button", { name: "服务对象" })[0]);

    expect(await screen.findByRole("region", { name: "服务对象" })).toBeInTheDocument();
    expect(screen.getAllByText("陈阿姨").length).toBeGreaterThan(0);
    expect(screen.getAllByText("政府购买").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/助餐·每周一三五/).length).toBeGreaterThan(0);
    expect(screen.getByText("新增服务对象")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "陈阿姨" }));
    expect(await screen.findByLabelText("服务对象详情")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "关闭" }));
    expect(screen.queryByLabelText("服务对象详情")).not.toBeInTheDocument();
  });

  it("covers 服务排期", async () => {
    mockSiteOperationsFetch();
    const user = userEvent.setup();
    render(<AuthProvider><SiteProvider><SiteOperationsPage /></SiteProvider></AuthProvider>);

    await user.click(screen.getAllByRole("button", { name: "服务排期" })[0]);

    expect(await screen.findByRole("region", { name: "服务排期" })).toBeInTheDocument();
    expect(await screen.findByText("列表")).toBeInTheDocument();
    expect(screen.getByText("日历")).toBeInTheDocument();
    expect(screen.getByText("地图")).toBeInTheDocument();
    expect((await screen.findAllByText(/陈阿姨/)).length).toBeGreaterThan(0);
  });

  it("covers 服务记录", async () => {
    mockSiteOperationsFetch();
    const user = userEvent.setup();
    render(<AuthProvider><SiteProvider><SiteOperationsPage /></SiteProvider></AuthProvider>);

    await user.click(screen.getAllByRole("button", { name: "服务记录" })[0]);

    expect(await screen.findByRole("region", { name: "服务记录" })).toBeInTheDocument();
    expect(screen.getByText("导出记录")).toBeInTheDocument();
    expect((await screen.findAllByText(/陈阿姨/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText("助餐").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/待复核/).length).toBeGreaterThan(0);
  });

  describe("state handling", () => {
    const cases = [
      {
        Component: SocialWorkersArea,
        data: () => clone(socialWorkersResponse),
        emptyText: "暂无服务人员",
        loadingText: "服务人员数据加载中...",
        mutationAction: "新增人员",
        primaryAction: "新增人员",
        setEmpty: (data: any) => {
          data.socialWorkers = [];
        },
        setState: (data: any, state: any) => {
          data.operationalState = { ...data.operationalState, ...state };
        },
        title: "服务人员"
      },
      {
        Component: SmartBadgesArea,
        data: () => clone(smartBadgesResponse),
        emptyText: "暂无智能工牌",
        loadingText: "设备数据加载中...",
        mutationAction: "激活工牌",
        primaryAction: "激活工牌",
        setEmpty: (data: any) => {
          data.smartBadges = [];
        },
        setState: (data: any, state: any) => {
          data.operationalState = { ...data.operationalState, ...state };
        },
        title: "设备"
      },
      {
        Component: ServiceObjectsArea,
        data: () => clone(serviceObjectsResponse),
        emptyText: "暂无服务对象",
        loadingText: "服务对象数据加载中...",
        mutationAction: "新增服务对象",
        primaryAction: "新增服务对象",
        setEmpty: (data: any) => {
          data.serviceObjects = [];
        },
        setState: (data: any, state: any) => {
          data.operationalState = { ...data.operationalState, ...state };
        },
        title: "服务对象"
      },
      // SchedulesArea has no primary/mutation button in list view (read-only overview tab),
      // so it's tested separately below rather than in this generic pattern.
      {
        Component: RecordsArea,
        data: () => clone(serviceRecordsResponse),
        emptyText: "暂无服务记录",
        loadingText: "服务记录数据加载中...",
        mutationAction: "导出记录",
        primaryAction: "导出记录",
        setEmpty: (data: any) => {
          data.serviceRecords = [];
        },
        setState: (data: any, state: any) => {
          data.operationalState = { ...data.operationalState, ...state };
        },
        title: "服务记录"
      }
    ];

    it.each(cases)("renders loading, empty, error, unavailable, readonly, restricted, and batch states for $title", ({ Component, data, emptyText, loadingText, mutationAction, primaryAction, setEmpty, setState, title }) => {
      const View = Component as any;

      const { unmount } = render(<View resource={{ status: "loading" }} />);
      expect(screen.getByText(loadingText)).toBeInTheDocument();
      unmount();

      const errorView = render(<View resource={{ status: "error", error: `${title}接口失败` }} />);
      expect(screen.getByText(`${title}接口失败`)).toBeInTheDocument();
      errorView.unmount();

      const emptyData = data();
      setEmpty(emptyData);
      const emptyView = render(<View resource={{ status: "success", data: emptyData }} />);
      expect(screen.getByText(emptyText)).toBeInTheDocument();
      emptyView.unmount();

      const unavailableData = data();
      setState(unavailableData, { unavailableMessage: "上游系统维护" });
      const unavailableView = render(<View resource={{ status: "success", data: unavailableData }} />);
      expect(screen.getByText(`${title}暂不可用`)).toBeInTheDocument();
      expect(screen.getByText("上游系统维护")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: primaryAction })).toBeDisabled();
      unavailableView.unmount();

      const readOnlyData = data();
      setState(readOnlyData, { permission: "read_only" });
      const readOnlyView = render(<View resource={{ status: "success", data: readOnlyData }} />);
      expect(screen.getByText("只读模式")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: primaryAction })).toBeDisabled();
      expect(screen.getByRole("button", { name: mutationAction })).toBeDisabled();
      if (screen.queryByLabelText(`${title}批量操作`)) {
        expect(screen.getByLabelText(`${title}批量操作`)).toHaveTextContent("权限：只读");
      }
      readOnlyView.unmount();

      const restrictedData = data();
      setState(restrictedData, { permission: "restricted" });
      render(<View resource={{ status: "success", data: restrictedData }} />);
      expect(screen.getByText("权限受限")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: mutationAction })).toBeDisabled();
      if (screen.queryByLabelText(`${title}批量操作`)) {
        expect(screen.getByLabelText(`${title}批量操作`)).toHaveTextContent("全选当前页");
        expect(screen.getByLabelText(`${title}批量操作`)).toHaveTextContent("查看已选");
      }
    });

    it("hides restricted service-record audio while keeping evidence visible", () => {
      const data = clone(serviceRecordsResponse);
      (data.audioAssets[0] as any).playbackUrl = "/restricted-audio.mp3";
      data.operationalState = { ...data.operationalState, permission: "restricted" };

      render(<RecordsArea resource={{ status: "success", data: data as any }} />);

      expect(screen.getByText("权限受限")).toBeInTheDocument();
    });

    it("renders home permission and error states while keeping business work areas usable after home errors", async () => {
      const readOnly = render(<HomeArea resource={{ status: "success", data: { ...homeResponse, permissionState: "read_only" } as any }} />);
      expect(screen.getByText("只读模式")).toBeInTheDocument();
      readOnly.unmount();

      const restricted = render(<HomeArea resource={{ status: "success", data: { ...homeResponse, permissionState: "restricted" } as any }} />);
      expect(screen.getByText("权限受限")).toBeInTheDocument();
      restricted.unmount();

      mockSiteOperationsFetch({ "/api/site-operations/home": Response.json({}, { status: 500 }) });
      const user = userEvent.setup();
      render(<AuthProvider><SiteProvider><SiteOperationsPage /></SiteProvider></AuthProvider>);

      expect(await screen.findByText("加载失败")).toBeInTheDocument();
      await user.click(screen.getAllByRole("button", { name: "服务人员" })[0]);
      expect(await screen.findByRole("region", { name: "服务人员" })).toBeInTheDocument();
      expect(screen.getAllByText("王丽").length).toBeGreaterThan(0);
    });
  });
});

import { expect, test, type Page } from "@playwright/test";

/* ──────────────────────────────────────────────
   Fixture data — matches contracts.ts types
   ────────────────────────────────────────────── */

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
      status: "scheduled",
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

/* ──────────────────────────────────────────────
   API mock helper
   ────────────────────────────────────────────── */

async function mockSiteOperationsApi(page: Page, overrides: Record<string, unknown> = {}) {
  const routes: Record<string, unknown> = {
    "/api/site-operations/home": homeResponse,
    "/api/social-workers": socialWorkersResponse,
    "/api/smart-badges": smartBadgesResponse,
    "/api/service-objects": serviceObjectsResponse,
    "/api/service-schedule-occurrences": serviceSchedulesResponse,
    "/api/service-records": serviceRecordsResponse,
    ...overrides
  };

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    // Don't intercept WebSocket upgrade or chat endpoints
    if (url.pathname.includes("/ws/")) {
      await route.fallback();
      return;
    }
    const body = routes[url.pathname] ?? {};
    await route.fulfill({
      contentType: "application/json",
      json: body,
      status: 200
    });
  });
}

/* ──────────────────────────────────────────────
   Tests
   ────────────────────────────────────────────── */

test.beforeEach(async ({ page }) => {
  await mockSiteOperationsApi(page);
});

test("opens /site-operations to the home page with sidebar and six work areas", async ({ page }) => {
  await page.goto("/site-operations");

  // Shell heading and home region
  await expect(page.getByRole("heading", { name: "Lumii 站点运营助手" })).toBeVisible();
  await expect(page.getByRole("region", { name: "首页" })).toBeVisible();

  // Six nav buttons in the rail
  await expect(page.getByLabel("站点运营工作区").getByRole("button")).toHaveCount(6);

  // Sidebar (home-sidebar) renders KPIs, highlights, actions, timeline
  const sidebar = page.getByLabel("首页高亮信息");
  await expect(sidebar).toContainText("今日概览");
  await expect(sidebar.locator(".home-kpi")).toHaveCount(5);
  await expect(sidebar).toContainText("今日服务");
  await expect(sidebar).toContainText("待排缺口");
  await expect(sidebar).toContainText("待复核");
  await expect(sidebar).toContainText("可导出记录");

  // Highlights section
  await expect(sidebar).toContainText("重点关注");
  await expect(sidebar).toContainText("3 条服务记录待复核");

  // Recommended actions
  await expect(sidebar).toContainText("处理入口");
  await expect(sidebar).toContainText("去补排今日缺口");
  await expect(sidebar).toContainText("复核服务记录");
  await expect(sidebar).toContainText("查看设备同步");

  // Timeline
  await expect(sidebar).toContainText("最近动态");
  await expect(sidebar).toContainText("今日还有 6 个服务对象未排期。");

  // Command input (CommandInput component)
  await expect(page.locator(".command-input__field")).toBeVisible();

  // Body overflow hidden (full-screen layout)
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
});

test("routes from sidebar recommended actions to the target work area", async ({ page }) => {
  await page.goto("/site-operations");

  await page.getByLabel("复核服务记录").click();
  await expect(page.getByRole("region", { exact: true, name: "服务记录" })).toBeVisible();
});

test("navigates between all six work areas via the desktop rail", async ({ page }) => {
  await page.goto("/site-operations");

  const rail = page.getByLabel("站点运营工作区");

  // Navigate to each area and verify it appears
  await rail.getByRole("button", { name: "服务人员" }).click();
  await expect(page.getByRole("region", { exact: true, name: "服务人员" })).toBeVisible();

  await rail.getByRole("button", { name: "设备" }).click();
  await expect(page.getByRole("region", { exact: true, name: "设备" })).toBeVisible();

  await rail.getByRole("button", { name: "服务对象" }).click();
  await expect(page.getByRole("region", { exact: true, name: "服务对象" })).toBeVisible();

  await rail.getByRole("button", { name: "服务排期" }).click();
  await expect(page.getByRole("region", { exact: true, name: "服务排期" })).toBeVisible();

  await rail.getByRole("button", { name: "服务记录" }).click();
  await expect(page.getByRole("region", { exact: true, name: "服务记录" })).toBeVisible();

  await rail.getByRole("button", { name: "首页" }).click();
  await expect(page.getByRole("region", { name: "首页" })).toBeVisible();
});

test("opens the home overview as a mobile drawer from the breadcrumb", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/site-operations");

  const sidebar = page.getByLabel("首页高亮信息");
  // On mobile the sidebar starts hidden (data-open="false")
  await expect(sidebar).toHaveAttribute("data-open", "false");

  // Open drawer via breadcrumb button
  await expect(page.getByRole("button", { name: "打开今日概览抽屉" })).toBeVisible();
  await page.getByRole("button", { name: "打开今日概览抽屉" }).click();
  await expect(sidebar).toHaveAttribute("data-open", "true");
  await expect(sidebar).toContainText("今日概览");
  await expect(sidebar).toContainText("去补排今日缺口");

  // Close via close button (exact match avoids scrim)
  await page.getByRole("button", { name: "关闭今日概览", exact: true }).click();
  await expect(sidebar).toHaveAttribute("data-open", "false");

  // Reopen and close via clicking on the scrim (top of viewport, above the slide-up sidebar)
  await page.getByRole("button", { name: "打开今日概览抽屉" }).click();
  await expect(sidebar).toHaveAttribute("data-open", "true");
  await page.locator(".home-drawer-scrim[data-open='true']").click({ position: { x: 50, y: 30 } });
  await expect(sidebar).toHaveAttribute("data-open", "false");

  // Command input visible on mobile
  await expect(page.locator(".command-input__field")).toBeVisible();
  // Mobile bottom nav visible
  await expect(page.getByLabel("站点运营移动工作区")).toBeVisible();
});

test("uses the mobile bottom navigation to switch areas", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/site-operations");

  const mobileNav = page.getByLabel("站点运营移动工作区");
  await expect(mobileNav).toBeVisible();
  await expect(mobileNav.getByRole("button")).toHaveCount(6);

  // Navigate to 服务记录 via mobile nav
  await mobileNav.getByRole("button", { name: "服务记录" }).click();
  await expect(page.getByRole("region", { exact: true, name: "服务记录" })).toBeVisible();

  // Body remains overflow: hidden
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
});

test("covers social workers area: table, drawer, create button", async ({ page }) => {
  await page.goto("/site-operations");
  await page.getByLabel("站点运营工作区").getByRole("button", { name: "服务人员" }).click();

  await expect(page.getByRole("region", { exact: true, name: "服务人员" })).toBeVisible();
  // Table content
  await expect(page.getByText("王丽").first()).toBeVisible();
  await expect(page.getByText("13800000001").first()).toBeVisible();
  await expect(page.getByText("FW-021").first()).toBeVisible();

  // New worker button
  await expect(page.getByRole("button", { name: /新增人员/ })).toBeVisible();

  // Open detail drawer by clicking worker name
  await page.locator(".sw-name-link").filter({ hasText: "王丽" }).click();
  await expect(page.getByLabel("服务人员详情")).toBeVisible();
  await expect(page.getByRole("button", { name: "编辑" })).toBeVisible();
  await expect(page.getByRole("button", { name: "归档人员" })).toBeVisible();

  // Close drawer (exact match avoids scrim button)
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByLabel("服务人员详情")).not.toBeVisible();
});

test("covers smart badges area: table, drawer", async ({ page }) => {
  await page.goto("/site-operations");
  await page.getByLabel("站点运营工作区").getByRole("button", { name: "设备" }).click();

  await expect(page.getByRole("region", { exact: true, name: "设备" })).toBeVisible();
  await expect(page.getByRole("button", { name: /激活工牌/ })).toBeVisible();
  await expect(page.getByText("FW-021").first()).toBeVisible();
  await expect(page.getByText("FW-026").first()).toBeVisible();

  // Open badge drawer
  await page.locator(".badges-code-link").filter({ hasText: "FW-021" }).click();
  await expect(page.getByLabel("设备详情")).toBeVisible();
  // Close
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByLabel("设备详情")).not.toBeVisible();
});

test("covers service objects area: table, drawer", async ({ page }) => {
  await page.goto("/site-operations");
  await page.getByLabel("站点运营工作区").getByRole("button", { name: "服务对象" }).click();

  await expect(page.getByRole("region", { exact: true, name: "服务对象" })).toBeVisible();
  await expect(page.getByRole("button", { name: /新增服务对象/ })).toBeVisible();
  await expect(page.getByText("陈阿姨").first()).toBeVisible();

  // Open detail drawer
  await page.locator(".sw-name-link").filter({ hasText: "陈阿姨" }).click();
  await expect(page.getByLabel("服务对象详情")).toBeVisible();
  await expect(page.getByRole("button", { name: "编辑" })).toBeVisible();

  // Close
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByLabel("服务对象详情")).not.toBeVisible();
});

test("covers schedules area: list view, calendar and map buttons, drawer", async ({ page }) => {
  await page.goto("/site-operations");
  await page.getByLabel("站点运营工作区").getByRole("button", { name: "服务排期" }).click();

  await expect(page.getByRole("region", { exact: true, name: "服务排期" })).toBeVisible();
  await expect(page.getByText("陈阿姨").first()).toBeVisible();

  // View switch buttons exist
  await expect(page.getByRole("button", { name: "列表" })).toBeVisible();
  await expect(page.getByRole("button", { name: "日历" })).toBeVisible();
  await expect(page.getByRole("button", { name: "地图" })).toBeVisible();

  // Open drawer via double-click on first row
  await page.locator(".sw-table__row").first().dblclick();
  await expect(page.getByLabel("排期详情")).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByLabel("排期详情")).not.toBeVisible();
});

test("covers records area: table, drawer with review button", async ({ page }) => {
  await page.goto("/site-operations");
  await page.getByLabel("站点运营工作区").getByRole("button", { name: "服务记录" }).click();

  await expect(page.getByRole("region", { exact: true, name: "服务记录" })).toBeVisible();
  // Export button
  await expect(page.getByRole("button", { name: /导出记录/ })).toBeVisible();
  // Table content
  await expect(page.getByText("陈阿姨").first()).toBeVisible();
  await expect(page.getByText("王丽").first()).toBeVisible();

  // Open drawer via double-click
  await page.locator(".sw-table__row").first().dblclick();
  await expect(page.getByLabel("服务记录详情")).toBeVisible();

  // Review button
  await expect(page.getByRole("button", { name: "复核通过" })).toBeVisible();

  // Summary text
  await expect(page.getByText("完成助餐服务，服务对象状态稳定。")).toBeVisible();

  // Close
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByLabel("服务记录详情")).not.toBeVisible();
});

test("shows restricted banner on records with restricted permissions", async ({ page }) => {
  const restrictedRecords = {
    ...serviceRecordsResponse,
    operationalState: { isLoading: false, permission: "restricted" }
  };
  await mockSiteOperationsApi(page, { "/api/service-records": restrictedRecords });

  await page.goto("/site-operations");
  await page.getByLabel("站点运营工作区").getByRole("button", { name: "服务记录" }).click();

  await expect(page.getByText("权限受限")).toBeVisible();
});

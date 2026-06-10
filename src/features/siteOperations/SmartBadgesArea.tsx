import { useEscClose } from "../../shared/hooks/useEscClose";
import { formatSyncTime } from "../../shared/utils/dateTimeUtils";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { ConfirmAction } from "../../shared/components/ConfirmAction";
import { useState, useCallback, useEffect } from "react";
import { Search, X, Plus, Smartphone, RefreshCw } from "lucide-react";
import { ListToolbar } from "../../shared/components/ListToolbar";
import { OperationalBanner } from "../../shared/components/OperationalBanner";
import { FilterDropdown } from "../../shared/components/FilterDropdown";
import { EmptyState } from "../../shared/components/EmptyState";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSetDetailEntity } from "../../shared/DetailPageContext";
import type {
  SmartBadgesResponse,
  Device,
  DeviceType,
} from "./contracts";
import { statusText } from "./contracts";
import { authFetch } from "./api";
import { isMutationDisabled } from "./WorkAreaLayout";
import type { Resource } from "./useSiteOperationsData";
import { useSite } from "../../auth/SiteContext";
import { useSiteOpsData } from "../../layouts/SiteOperationsLayout";
import { DetailPageShell } from "../../shared/DetailPageShell";

/* ── helpers ── */

type DeviceTypeFilter = "" | DeviceType;

const deviceTypeFilterOptions: Array<{ label: string; value: DeviceTypeFilter }> = [
  { label: "全部", value: "" },
  { label: "毫米波雷达", value: "mmwave_radar" },
  { label: "智能工牌", value: "smart_badge" },
  { label: "手机App", value: "phone_app" },
  { label: "信标", value: "ble_beacon" },
];

type DeviceStatusFilter = "" | string;

const deviceStatusFilterOptions: Array<{ label: string; value: DeviceStatusFilter }> = [
  { label: "全部状态", value: "" },
  { label: "可用", value: "available" },
  { label: "使用中", value: "in_use" },
  { label: "离线", value: "offline" },
  { label: "低电量", value: "low_battery" },
  { label: "已停用", value: "disabled" },
];

const deviceTypeLabel: Record<string, string> = {
  mmwave_radar: "毫米波雷达",
  smart_badge: "智能工牌",
  phone_app: "手机App",
  ble_beacon: "蓝牙信标",
  smart_watch: "智能手表",
};

const deviceTypeIcon: Record<string, string> = {
  mmwave_radar: "\u{1F4E1}",
  smart_badge: "\u{1F3F7}️",
  phone_app: "\u{1F4F1}",
  ble_beacon: "\u{1F4CD}",
  smart_watch: "⌚",
};

function deviceStatusTone(status: string): string {
  if (status === "available") return "success";
  if (status === "in_use") return "accent";
  if (status === "offline" || status === "low_battery" || status === "sync_delayed") return "warning";
  if (status === "lost" || status === "disabled") return "danger";
  return "muted";
}

/* ── Main component ── */

export function SmartBadgesArea({ resource: resourceProp, onOpenRecords: onOpenRecordsProp, onMutate: onMutateProp, initialSearch }: { resource?: Resource<SmartBadgesResponse>; onOpenRecords?: () => void; onMutate?: () => void; initialSearch?: string } = {}) {
  const ctxData = useSiteOpsData();
  const resource = resourceProp ?? ctxData.smartBadges;
  const onMutate = onMutateProp ?? ctxData.refetch;
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const setDetailEntity = useSetDetailEntity();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const effectiveInitialSearch = initialSearch ?? urlSearch;
  const onOpenRecords = onOpenRecordsProp ?? (() => navigate("/records"));
  const operationalState = resource.status === "success" ? resource.data.operationalState : undefined;
  const mutationsDisabled = isMutationDisabled(operationalState);

  const [searchQuery, setSearchQuery] = useState(effectiveInitialSearch);
  useEffect(() => { if (effectiveInitialSearch) setSearchQuery(effectiveInitialSearch); }, [effectiveInitialSearch]);
  const [typeFilter, setTypeFilter] = useState<DeviceTypeFilter>("");
  const [statusFilter, setStatusFilter] = useState<DeviceStatusFilter>("");

  // Fetch unified devices from /api/devices
  const { currentSite } = useSite();
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState<string | undefined>();

  const fetchDevices = useCallback(() => {
    setDevicesLoading(true);
    setDevicesError(undefined);
    const url = currentSite ? `/api/devices?siteId=${currentSite.id}` : "/api/devices";
    authFetch(url)
      .then(r => r.json())
      .then(data => {
        setDevices(data.devices ?? []);
        setDevicesLoading(false);
      })
      .catch(e => {
        setDevicesError(e instanceof Error ? e.message : "加载失败");
        setDevicesLoading(false);
      });
  }, [currentSite]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleRefresh = useCallback(() => {
    fetchDevices();
    onMutate?.();
  }, [fetchDevices, onMutate]);

  // Filter
  const filtered = devices.filter((d) => {
    if (typeFilter && d.deviceType !== typeFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCode = d.deviceCode.toLowerCase().includes(q);
      const matchName = d.boundToName?.toLowerCase().includes(q);
      const matchAccount = d.appAccount?.username?.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchAccount) return false;
    }
    return true;
  });

  // Detail drawer
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  useEffect(() => {
    if (routeId && routeId !== "activate") {
      const dev = devices.find(d => d.id === routeId);
      if (dev) setSelectedDevice(dev);
    } else {
      setSelectedDevice(null);
    }
  }, [routeId, devices]);

  useEffect(() => {
    if (routeId && routeId !== "activate" && selectedDevice) {
      setDetailEntity({ entityType: "device", entityId: routeId, entityName: selectedDevice.deviceCode });
    } else {
      setDetailEntity(null);
    }
    return () => setDetailEntity(null);
  }, [routeId, selectedDevice, setDetailEntity]);

  const openDetail = useCallback((d: Device) => { navigate(`/devices/${d.id}`); }, [navigate]);
  const closeDetail = useCallback(() => { navigate("/devices"); }, [navigate]);

  useEscClose(useCallback(() => { closeDetail(); }, [closeDetail]));

  // Detail view
  if (selectedDevice) {
    return (
      <DeviceDetailView
        device={selectedDevice}
        mutationsDisabled={mutationsDisabled}
        onClose={closeDetail}
        onUpdated={handleRefresh}
      />
    );
  }

  // Activate drawer (kept for backwards compat)
  if (routeId === "activate") {
    return (
      <ActivateDrawer onClose={closeDetail} onActivated={handleRefresh} onViewBadge={(id) => navigate(`/devices/${id}`)} />
    );
  }

  return (
    <section aria-label="设备" className="sw-page">
      <div className="sw-page__inner">
        <header className="sw-header">
          <div className="sw-header__title-group">
            <h2 className="sw-header__title">设备管理</h2>
            <p className="sw-header__desc">统一管理所有设备：毫米波雷达、智能工牌、手机App、蓝牙信标</p>
          </div>
          <button
            className="sw-btn sw-btn--primary"
            disabled={mutationsDisabled}
            onClick={() => navigate("/devices/activate")}
            type="button"
          >
            <Plus size={15} />
            新增设备
          </button>
        </header>

        <div className="sw-table-container">
          <ListToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="搜索设备码/账号/人员..."
            filters={<>
              <FilterDropdown onChange={(v) => setTypeFilter(v as DeviceTypeFilter)} options={deviceTypeFilterOptions} value={typeFilter} />
              <FilterDropdown onChange={(v) => setStatusFilter(v as DeviceStatusFilter)} options={deviceStatusFilterOptions} value={statusFilter} />
            </>}
          />

          {operationalState ? <OperationalBanner state={operationalState} resourceLabel="设备" readOnlyHint="可查看数据，操作已禁用。" /> : null}

          <DeviceListContent
            filtered={filtered}
            loading={devicesLoading}
            error={devicesError}
            isEmpty={!devicesLoading && devices.length === 0}
            isFilterEmpty={!devicesLoading && devices.length > 0 && filtered.length === 0}
            mutationsDisabled={mutationsDisabled}
            onAddClick={() => navigate("/devices/activate")}
            onRowClick={openDetail}
          />
        </div>
      </div>
    </section>
  );
}

/* ── Device List ── */

function DeviceListContent({ filtered, loading, error, isEmpty, isFilterEmpty, mutationsDisabled, onAddClick, onRowClick }: {
  filtered: Device[];
  loading: boolean;
  error?: string;
  isEmpty: boolean;
  isFilterEmpty: boolean;
  mutationsDisabled: boolean;
  onAddClick: () => void;
  onRowClick: (d: Device) => void;
}) {
  if (loading) return <EmptyState icon={Smartphone} description="设备数据加载中..." />;
  if (error) return <EmptyState icon={X} description={error} isError />;
  if (isEmpty) return (
    <EmptyState
      icon={Smartphone}
      title="暂无设备"
      description="点击新增设备添加第一个设备"
      action={<button className="sw-btn sw-btn--primary" disabled={mutationsDisabled} onClick={onAddClick} type="button"><Plus size={15} />新增设备</button>}
    />
  );
  if (isFilterEmpty) return <EmptyState icon={Search} description="没有匹配的设备" />;

  return (
    <>
      <div className="sw-table badges-table" role="table">
        <div className="sw-table__head badges-table__head" role="row">
          <span role="columnheader">设备码/账号</span>
          <span role="columnheader">类型</span>
          <span role="columnheader">状态</span>
          <span role="columnheader">电量</span>
          <span role="columnheader">绑定对象</span>
          <span role="columnheader">最后同步/登录</span>
        </div>
        {filtered.map((device) => (
          <div
            className="sw-table__row badges-table__row"
            key={device.id}
            onClick={() => onRowClick(device)}
            role="row"
          >
            <div role="cell">
              <button className="badges-code-link" onClick={(e) => { e.stopPropagation(); onRowClick(device); }} type="button">
                {device.deviceType === "phone_app" && device.appAccount
                  ? device.appAccount.username
                  : device.deviceCode}
              </button>
            </div>
            <div role="cell">
              <span className="dev-type-badge" data-type={device.deviceType}>
                <span className="dev-type-badge__icon">{deviceTypeIcon[device.deviceType] ?? ""}</span>
                {deviceTypeLabel[device.deviceType] ?? device.deviceType}
              </span>
            </div>
            <div role="cell">
              {device.deviceType === "phone_app" && device.appAccount ? (
                <StatusBadge tone={device.appAccount.passwordSet ? "success" : "warning"}>
                  {device.appAccount.passwordSet ? "密码已设置" : "密码未设置"}
                </StatusBadge>
              ) : (
                <StatusBadge tone={deviceStatusTone(device.status)}>
                  {statusText[device.status] ?? device.status}
                </StatusBadge>
              )}
            </div>
            <div role="cell">
              {device.deviceType !== "phone_app" && device.batteryPercent != null ? (
                <span className={device.batteryPercent < 20 ? "badges-battery--low" : ""}>
                  {device.batteryPercent}%
                </span>
              ) : <span className="sw-text-muted">--</span>}
            </div>
            <div role="cell">
              {device.boundToName ? (
                <span>{device.boundToName}{device.boundToType === "elder_home" ? " (家中)" : ""}</span>
              ) : <span className="sw-text-muted">--</span>}
            </div>
            <div role="cell">
              {device.deviceType === "phone_app" && device.appAccount?.lastLoginAt
                ? formatSyncTime(device.appAccount.lastLoginAt)
                : device.lastSyncAt
                  ? formatSyncTime(device.lastSyncAt)
                  : <span className="sw-text-muted">--</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="sw-mobile-list">
        {filtered.map((device) => (
          <button className="sw-mobile-card" key={device.id} onClick={() => onRowClick(device)} type="button">
            <div className="sw-mobile-card__top">
              <span className="dev-type-badge" data-type={device.deviceType}>
                <span className="dev-type-badge__icon">{deviceTypeIcon[device.deviceType] ?? ""}</span>
                {deviceTypeLabel[device.deviceType] ?? device.deviceType}
              </span>
              {device.deviceType === "phone_app" && device.appAccount ? (
                <StatusBadge tone={device.appAccount.passwordSet ? "success" : "warning"}>
                  {device.appAccount.passwordSet ? "密码已设置" : "密码未设置"}
                </StatusBadge>
              ) : (
                <StatusBadge tone={deviceStatusTone(device.status)}>
                  {statusText[device.status] ?? device.status}
                </StatusBadge>
              )}
            </div>
            <div className="sw-mobile-card__info">
              <span className="badges-code-tag">
                {device.deviceType === "phone_app" && device.appAccount ? device.appAccount.username : device.deviceCode}
              </span>
            </div>
            <div className="sw-mobile-card__meta">
              {device.boundToName ? <span>{device.boundToName}</span> : <span>未绑定</span>}
              {device.deviceType === "phone_app" && device.appAccount?.lastLoginAt
                ? <span>最后登录 {formatSyncTime(device.appAccount.lastLoginAt)}</span>
                : device.lastSyncAt ? <span>同步 {formatSyncTime(device.lastSyncAt)}</span> : null}
              {device.batteryPercent != null && device.deviceType !== "phone_app" ? <span>电量 {device.batteryPercent}%</span> : null}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

/* ── Device Detail View ── */

function DeviceDetailView({ device, mutationsDisabled, onClose, onUpdated }: {
  device: Device;
  mutationsDisabled: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const isPhoneApp = device.deviceType === "phone_app";
  const isHardware = !isPhoneApp;

  const title = isPhoneApp && device.appAccount
    ? `${device.appAccount.username} (手机App)`
    : device.deviceCode;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await authFetch(`/api/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onUpdated();
    } catch { /* noop */ }
  };

  const statusActions = isPhoneApp ? (
    <div style={{ display: "flex", gap: 8 }}>
      <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={() => handleStatusChange("in_use")} type="button">重置密码</button>
      {device.status !== "disabled" ? (
        <ConfirmAction label="禁用账号" onConfirm={() => handleStatusChange("disabled")} buttonStyle={{ height: 28, fontSize: 12 }} />
      ) : (
        <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={() => handleStatusChange("in_use")} type="button"><RefreshCw size={14} /> 启用账号</button>
      )}
    </div>
  ) : (
    <div style={{ display: "flex", gap: 8 }}>
      {device.boundToId && (
        <ConfirmAction label="解绑" onConfirm={() => handleStatusChange("available")} buttonStyle={{ height: 28, fontSize: 12 }} />
      )}
      {device.status !== "disabled" ? (
        <ConfirmAction label="停用" onConfirm={() => handleStatusChange("disabled")} buttonStyle={{ height: 28, fontSize: 12 }} />
      ) : (
        <button className="sw-btn sw-btn--secondary" style={{ height: 28, fontSize: 12 }} onClick={() => handleStatusChange("available")} type="button"><RefreshCw size={14} /> 恢复为可用</button>
      )}
    </div>
  );

  return (
    <DetailPageShell parentLabel="设备管理" parentPath="/devices" title={title} actions={!mutationsDisabled ? statusActions : undefined}>
      <div className="dp-card">
        <div className="dp-card__body">
          {isPhoneApp ? (
            /* ── Phone App detail ── */
            <div className="dp-section">
              <div className="dp-section__head">
                <h4 className="dp-section__title">App 账号信息</h4>
              </div>
              <dl className="dp-fields">
                <div className="dp-field"><dt>设备类型</dt><dd>
                  <span className="dev-type-badge" data-type="phone_app">
                    <span className="dev-type-badge__icon">{deviceTypeIcon.phone_app}</span> 手机App
                  </span>
                </dd></div>
                <div className="dp-field"><dt>账号</dt><dd><strong>{device.appAccount?.username ?? "--"}</strong></dd></div>
                <div className="dp-field"><dt>密码状态</dt><dd>
                  <StatusBadge tone={device.appAccount?.passwordSet ? "success" : "warning"}>
                    {device.appAccount?.passwordSet ? "密码已设置" : "密码未设置"}
                  </StatusBadge>
                </dd></div>
                <div className="dp-field"><dt>最后登录</dt><dd>{device.appAccount?.lastLoginAt ? formatSyncTime(device.appAccount.lastLoginAt) : "--"}</dd></div>
                <div className="dp-field"><dt>绑定人员</dt><dd>{device.boundToName ?? "--"}</dd></div>
                <div className="dp-field"><dt>所属站点</dt><dd>{device.siteName ?? device.siteId}</dd></div>
                <div className="dp-field"><dt>账号状态</dt><dd>
                  <StatusBadge tone={deviceStatusTone(device.status)}>
                    {statusText[device.status] ?? device.status}
                  </StatusBadge>
                </dd></div>
              </dl>
            </div>
          ) : (
            /* ── Hardware device detail ── */
            <div className="dp-section">
              <div className="dp-section__head">
                <h4 className="dp-section__title">设备信息</h4>
              </div>
              <dl className="dp-fields">
                <div className="dp-field"><dt>设备码</dt><dd><span className="badges-code-tag">{device.deviceCode}</span></dd></div>
                <div className="dp-field"><dt>设备类型</dt><dd>
                  <span className="dev-type-badge" data-type={device.deviceType}>
                    <span className="dev-type-badge__icon">{deviceTypeIcon[device.deviceType] ?? ""}</span>
                    {deviceTypeLabel[device.deviceType] ?? device.deviceType}
                  </span>
                </dd></div>
                <div className="dp-field"><dt>所属站点</dt><dd>{device.siteName ?? device.siteId}</dd></div>
                <div className="dp-field"><dt>当前状态</dt><dd>
                  <StatusBadge tone={deviceStatusTone(device.status)}>
                    {statusText[device.status] ?? device.status}
                  </StatusBadge>
                </dd></div>
                <div className="dp-field"><dt>激活时间</dt><dd>{device.activatedAt ? formatSyncTime(device.activatedAt) : "--"}</dd></div>
                <div className="dp-field"><dt>电量</dt><dd>{device.batteryPercent != null ? <span className={device.batteryPercent < 20 ? "badges-battery--low" : ""}>{device.batteryPercent}%</span> : "--"}</dd></div>
                <div className="dp-field"><dt>最后同步</dt><dd>{device.lastSyncAt ? formatSyncTime(device.lastSyncAt) : "--"}</dd></div>
                <div className="dp-field"><dt>绑定对象</dt><dd>
                  {device.boundToName
                    ? <span>{device.boundToName}{device.boundToType === "elder_home" ? " (家中)" : ""}</span>
                    : "--"}
                </dd></div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </DetailPageShell>
  );
}

/* ── Activate Drawer (preserved) ── */

function ActivateDrawer({ onClose, onActivated, onViewBadge }: { onClose: () => void; onActivated: () => void; onViewBadge?: (id: string) => void }) {
  const { currentSite } = useSite();
  const [deviceCode, setDeviceCode] = useState("");
  const [step, setStep] = useState<"input" | "confirm" | "done">("input");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const handleActivate = async () => {
    if (!deviceCode.trim() || !currentSite) return;
    setActivating(true);
    setError("");
    try {
      const res = await authFetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceCode: deviceCode.trim(), siteId: currentSite.id, deviceType: "smart_badge" }),
      });
      const data = await res.json();
      setResult(data.device ?? data);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "激活失败");
    } finally {
      setActivating(false);
    }
  };

  return (
    <DetailPageShell parentLabel="设备管理" parentPath="/devices" title="新增设备">
      <div className="dp-card">
        <div className="dp-card__body">
          {step === "input" ? (
            <div className="dp-section">
              <div className="dp-section__head">
                <h4 className="dp-section__title">设备信息</h4>
              </div>
              <dl className="dp-fields">
                <div className="dp-field"><dt>设备码</dt><dd><input onChange={(e) => setDeviceCode(e.target.value)} placeholder="输入设备码，如 GY-B030" value={deviceCode} /></dd></div>
              </dl>
              {error ? <p className="badges-error" style={{ marginTop: 12 }}>{error}</p> : null}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <button className="sw-btn sw-btn--primary" disabled={activating || !deviceCode.trim()} onClick={() => setStep("confirm")} type="button">下一步</button>
              </div>
            </div>
          ) : step === "confirm" ? (
            <div className="dp-section">
              <div className="dp-section__head">
                <h4 className="dp-section__title">确认激活</h4>
              </div>
              <dl className="dp-fields">
                <div className="dp-field"><dt>设备码</dt><dd><span className="badges-code-tag">{deviceCode}</span></dd></div>
                <div className="dp-field"><dt>绑定站点</dt><dd>{currentSite?.name ?? "未选择"}</dd></div>
              </dl>
              {error ? <p className="badges-error" style={{ marginTop: 12 }}>{error}</p> : null}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button className="sw-btn sw-btn--secondary" onClick={() => { setStep("input"); setError(""); }} type="button">上一步</button>
                <button className="sw-btn sw-btn--primary" disabled={activating} onClick={handleActivate} type="button">{activating ? "激活中..." : "确认激活"}</button>
              </div>
            </div>
          ) : (
            <div className="dp-section" style={{ textAlign: "center", padding: "40px 0" }}>
              <div className="badges-success__icon" style={{ margin: "0 auto 12px" }}><Smartphone size={28} /></div>
              <strong style={{ fontSize: 16 }}>激活成功</strong>
              <p style={{ color: "var(--site-muted)", marginTop: 4 }}>{result?.deviceCode} 已绑定到 {currentSite?.name}</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
                <button className="sw-btn sw-btn--secondary" onClick={() => { onActivated(); if (result?.id) onViewBadge?.(result.id); }} type="button">查看设备详情</button>
                <button className="sw-btn sw-btn--primary" onClick={() => { setDeviceCode(""); setStep("input"); setResult(null); setError(""); }} type="button">继续添加</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DetailPageShell>
  );
}

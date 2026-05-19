# 角色合并与 UI 重构设计

**日期：** 2026-05-19
**状态：** Implemented
**实现日期：** 2026-05-19
**范围：** service_supervisor 角色移除、SOP 管理整合、UI 布局调整

## 1. 目标

简化角色体系：将 `service_supervisor` 合并到 `org_admin`，SOP 管理功能整合到质量管理页面，移除冗余 UI 组件。

## 2. 角色变更

### 2.1 UserRole 枚举

Before:
```prisma
enum UserRole {
  org_admin
  site_operator
  service_supervisor
  careworker
}
```

After:
```prisma
enum UserRole {
  org_admin
  site_operator
  careworker
}
```

### 2.2 数据库迁移

原 `supervisor` 用户（username: `supervisor`）的 role 从 `service_supervisor` 改为 `org_admin`。
Prisma migration 中同步更新已有数据。

## 3. UI 重构

### 3.1 SOP 管理整合

原 SupervisorPage 的 SOP 管理内容提取为独立组件 `SupervisorContent`（`src/supervisor/SupervisorContent.tsx`）。
该组件作为 tab 整合进 QualityPage（质量管理页面），`org_admin` 可在质量管理页面内切换到 SOP 标签页。

### 3.2 Logo 位置调整

产品 logo 从左侧导航栏（left rail）移到页面顶部 header 区域。

### 3.3 RecordsView 移除

RecordsView（使用 mock 数据的服务记录视图）已移除，替换为 SitesView（站点管理视图）。
SitesView 展示站点列表和运营人员分配功能，属于 site-management 功能的一部分。

### 3.4 ESC 键支持

用户管理页面的所有 Modal（创建用户、重置密码、禁用确认）支持 ESC 键关闭。
使用 `useEscClose` hook 统一处理。

## 4. 文件变更

| 文件 | 变更 |
|------|------|
| `prisma/schema.prisma` | UserRole 枚举移除 `service_supervisor` |
| `prisma/seed.ts` | supervisor 用户 role 改为 `org_admin` |
| `src/supervisor/SupervisorContent.tsx` | 新文件，从 SupervisorPage 提取 SOP 内容 |
| `src/supervisor/SupervisorPage.tsx` | 引用 SupervisorContent |
| `src/quality/QualityPage.tsx` | 新增 SOP 管理 tab，嵌入 SupervisorContent |
| `src/features/siteOperations/SiteOperationsShell.tsx` | Logo 移到 header，移除 RecordsView 添加 SitesView |
| `src/admin/AdminPage.tsx` | Modal 添加 ESC 键关闭 |

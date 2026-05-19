# 站点管理功能设计

**日期：** 2026-05-19
**状态：** Implemented
**实现日期：** 2026-05-19
**范围：** 站点 CRUD、运营人员分配、多站点切换、站点上下文管理、站点数据隔离、管理端 UX 优化

## 1. 目标

支持机构下多站点管理：创建/编辑/删除站点、分配运营人员到站点、登录后选择站点、运营中切换站点。

## 2. 数据模型

### 2.1 Site 模型

```prisma
model Site {
  id           String   @id @db.VarChar(64)
  name         String   @db.VarChar(255)
  address      String   @default("") @db.VarChar(500)
  contactName  String   @default("") @map("contact_name") @db.VarChar(255)
  contactPhone String   @default("") @map("contact_phone") @db.VarChar(64)
  orgId        String   @default("org-001") @map("org_id") @db.VarChar(64)
  status       String   @default("active") @db.VarChar(32)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at")

  siteUsers SiteUser[]
  @@map("sites")
}
```

### 2.2 SiteUser 模型（多对多关联表）

```prisma
model SiteUser {
  id     String @id @default(cuid()) @db.VarChar(64)
  siteId String @map("site_id") @db.VarChar(64)
  userId String @map("user_id") @db.VarChar(64)

  site Site @relation(fields: [siteId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([siteId, userId])
  @@map("site_users")
}
```

User 模型也添加了 `siteUsers SiteUser[]` 关系字段。

## 3. API 设计

### 3.1 站点 CRUD（仅 org_admin）

```
GET    /api/admin/sites              → 列表（含运营人员信息，同机构过滤）
POST   /api/admin/sites              → 创建站点（name 必填，id 自动生成 site-{uuid8}）
PATCH  /api/admin/sites/:id          → 更新站点（name, address, contactName, contactPhone, status）
DELETE /api/admin/sites/:id          → 删除站点（级联删除 SiteUser）
```

GET 响应中每个 site 附带 `operators` 数组，包含 `{ id, username, name, role }`。

### 3.2 运营人员分配（仅 org_admin）

```
PUT /api/admin/sites/:id/operators
  Body: { userIds: string[] }
```

替换整个站点的运营人员列表（先 deleteMany 再批量 create，在事务中执行）。

### 3.3 当前用户站点查询

```
GET /api/auth/my-sites
```

- `org_admin`：返回机构下所有 active 站点
- `site_operator`：返回通过 SiteUser 关联的 active 站点

## 4. 前端：SiteContext + SiteProvider

文件：`src/auth/SiteContext.tsx`

```typescript
interface SiteContextValue {
  sites: SiteInfo[];
  currentSite: SiteInfo | null;
  loading: boolean;
  needsSelection: boolean;     // 多站点运营人员未选站点
  selectSite: (site: SiteInfo) => void;
}
```

行为：
- 登录后自动调用 `GET /api/auth/my-sites` 获取站点列表
- 单站点用户自动选中
- 多站点用户从 `localStorage("gy_current_site")` 恢复上次选择
- 多站点用户如果没有已保存选择，`needsSelection=true` 触发选站弹窗
- `org_admin` 跳过站点加载（全站点访问）

## 5. 前端：站点选择器

### 5.1 登录时站点选择弹窗

多站点 `site_operator` 登录后，如果 `needsSelection=true`，显示站点选择 modal。
用户点选站点后进入运营页面。

### 5.2 运营页面站点切换

SiteOperationsShell header 区域的站点切换下拉菜单：
- 显示当前站点名称
- 下拉选择其他已分配站点
- 切换后更新 SiteContext + localStorage

## 6. Seed 数据

4 个种子站点：

| ID | 名称 |
|----|------|
| site-001 | 金色年华·阳光社区站 |
| site-002 | 金色年华·翠苑社区站 |
| site-003 | 金色年华·城西社区站 |
| site-004 | 金色年华·滨江社区站 |

种子运营人员（operator）通过 SiteUser 分配到 site-001 和 site-002。

## 7. 文件变更

| 文件 | 变更 |
|------|------|
| `prisma/schema.prisma` | 新增 Site + SiteUser 模型，User 添加 siteUsers 关系 |
| `prisma/seed.ts` | 添加 4 个站点 + 运营人员分配 seed |
| `server/routes/sites.ts` | 新文件，站点 CRUD + 运营人员分配 + my-sites API |
| `server/index.ts` | 注册 siteRoutes |
| `src/auth/SiteContext.tsx` | 新文件，SiteProvider + useSite hook |
| `src/App.tsx` | 包裹 SiteProvider |
| `src/features/siteOperations/SiteOperationsShell.tsx` | 添加站点切换下拉 |

## 8. 站点数据隔离（Site-based Data Isolation）

### 8.1 数据模型变更

以下模型新增 `siteId` 字段：

| 模型 | 字段 | 说明 |
|------|------|------|
| ServiceObject | siteId | 服务对象归属站点 |
| ServiceSchedule | siteId | 服务计划归属站点 |
| ServiceRecord | siteId | 服务记录归属站点 |
| HomeSummary | siteId | 居家概况归属站点 |

### 8.2 后端路由过滤

所有 GET 路由通过 `?siteId=xxx` query param 过滤数据，只返回该站点的数据。
所有 POST 路由从 request body 中读取 `siteId` 并写入记录。

### 8.3 前端 API 层

`src/api/api.ts` 中所有 API 调用从 SiteContext 获取当前 `siteId`，自动附加到请求参数中。
`useSiteOperationsData` hook 接受 `siteId` 参数，数据刷新时按站点过滤。

## 9. 无站点权限错误页面（No-site-assigned Error）

### 9.1 SiteContext 变更

`SiteContext` 新增 `noSiteAssigned: boolean` 标志位。当 `site_operator` 角色用户通过 `/api/auth/my-sites` 查询返回 0 个站点时设为 `true`。

### 9.2 错误页面

`App.tsx` 检测到 `noSiteAssigned=true` 时，显示错误页面：
- 标题："暂无站点权限"
- 说明文字：提示联系管理员分配站点
- 操作：退出登录按钮

## 10. 管理端站点入口重设计（Admin Site Entry）

### 10.1 移除全局入口

移除 `org_admin` header 中的"进入站点运营"按钮。

### 10.2 站点列表内嵌入口

在站点管理（站点管理 tab）的站点列表表格中，每行添加"进入站点"按钮：
- 点击后在新标签页中打开 `/site-operations?siteId=xxx`
- `App.tsx` 检测 URL 中的 `?siteId=` 参数，为 `org_admin` 自动选中对应站点

### 10.3 org_admin 站点上下文

`org_admin` 通过 URL 参数进入站点运营时，SiteContext 根据 `?siteId=` 自动设置 `currentSite`，无需手动选择弹窗。

## 11. 管理端搜索与筛选（Search/Filter in Admin Views）

### 11.1 站点管理搜索

SitesView 支持按以下字段搜索（前端过滤）：
- 站点名称（name）
- 地址（address）
- 联系人（contactName）

### 11.2 用户管理搜索与筛选

UsersView 支持：
- 搜索：按用户名（username）、姓名（name）过滤
- 角色筛选：下拉菜单按角色（org_admin / site_operator / careworker）过滤

## 12. 编辑模式修复（Edit Mode Fixes）

站点管理和用户管理的"编辑"按钮现在正确打开 modal 进入编辑模式：
- SiteDetailModal 接受 `initialEditing` prop，编辑按钮传入 `true`
- UserDetailModal 接受 `initialEditing` prop，编辑按钮传入 `true`
- 之前：编辑按钮打开 modal 后默认为查看模式，用户需再次点击编辑

## 13. 用户列表列序修复（Column Order Fix）

用户管理表格列顺序调整为：用户名 → 姓名 → 手机号 → 角色 → 状态 → 操作

## 14. 内联运营人员分配（Inline Operator Assignment）

### 14.1 移除独立分配弹窗

移除站点列表中的"分配人员"按钮和独立的人员分配 modal。

### 14.2 站点详情 modal 内联分配

站点详情 modal 在编辑模式下包含运营人员分配区域：
- 显示所有 `site_operator` 角色用户的 checkbox 列表
- 勾选/取消勾选即可添加/移除运营人员
- 保存时调用 `PUT /api/admin/sites/:id/operators` 更新分配关系

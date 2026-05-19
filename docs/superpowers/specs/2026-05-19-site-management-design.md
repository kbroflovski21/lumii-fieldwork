# 站点管理功能设计

**日期：** 2026-05-19
**状态：** Implemented
**实现日期：** 2026-05-19
**范围：** 站点 CRUD、运营人员分配、多站点切换、站点上下文管理

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

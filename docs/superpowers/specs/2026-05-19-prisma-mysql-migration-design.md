# SQLite → Prisma ORM + MySQL 全面重构

**日期：** 2026-05-19
**状态：** Approved
**范围：** 数据库层从 better-sqlite3 (同步) 迁移到 Prisma ORM + MySQL (异步)，包含 Prisma Migrate、Docker 测试环境

## 1. 目标

1. 替换 better-sqlite3 为 Prisma Client + MySQL
2. 使用 Prisma Migrate 管理 schema 变更
3. 所有路由/中间件改为 async/await + Prisma Client API
4. Docker MySQL 容器用于本地 E2E 测试
5. 前端 API 接口不变

## 2. 技术选型

| 组件 | Before | After |
|------|--------|-------|
| 数据库 | SQLite (文件) | MySQL 8.0 |
| ORM/Driver | better-sqlite3 (同步) | Prisma Client (异步) |
| Schema 管理 | 手动 schema.sql + exec | Prisma Migrate |
| Seed | 自研 seed.ts (同步) | prisma/seed.ts (Prisma Client API) |
| 连接池 | 单例 singleton | Prisma 内置池 (connection_limit=30) |
| 测试 DB | 内存 SQLite / 文件 | Docker MySQL 3307 |

## 3. 环境变量

```
DATABASE_URL=mysql://user:pass@host:3306/goldenyears?connection_limit=30&pool_timeout=10
```

- `connection_limit=30`：最大 30 个连接，超出排队等待
- `pool_timeout=10`：排队超过 10 秒报超时错误
- 测试环境：`DATABASE_URL=mysql://root:test@localhost:3307/goldenyears_test?connection_limit=5`

## 4. Prisma Schema

文件：`prisma/schema.prisma`

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### 4.1 Model 映射（15 张表）

| SQLite 表 | Prisma Model | 关键类型变化 |
|-----------|-------------|------------|
| users | User | role → enum UserRole, status → enum UserStatus |
| social_workers | SocialWorker | status → enum WorkerStatus, JSON 列 → Json |
| smart_badges | SmartBadge | status → enum BadgeStatus |
| service_objects | ServiceObject | JSON 列 (service_projects, risk_tags 等) → Json |
| family_contacts | FamilyContact | subscription_status → enum SubscriptionStatus |
| service_plans | ServicePlan | status → enum PlanStatus |
| service_plan_exceptions | ServicePlanException | kind → enum ExceptionKind |
| service_schedules | ServiceSchedule | status → enum ScheduleStatus |
| service_records | ServiceRecord | review_status → enum ReviewStatus, export_status → enum ExportStatus |
| audio_assets | AudioAsset | FK → ServiceRecord |
| transcripts | Transcript | segments → Json |
| home_summary | HomeSummary | JSON 列 → Json |
| chat_messages | ChatMessage | id → Int @id @default(autoincrement()) |

### 4.2 SQLite → MySQL 类型映射

| SQLite | Prisma/MySQL |
|--------|-------------|
| TEXT PRIMARY KEY | String @id @db.VarChar(64) |
| TEXT NOT NULL (短) | String @db.VarChar(255) |
| TEXT (长内容) | String @db.Text |
| TEXT (JSON) | Json |
| INTEGER | Int |
| REAL | Float |
| DEFAULT (datetime('now')) | @default(now()) |
| CHECK(x IN (...)) | enum |
| AUTOINCREMENT | @default(autoincrement()) |

### 4.3 关系定义

```
FamilyContact.serviceObject → ServiceObject (FK)
ServicePlan.serviceObject → ServiceObject (FK)
ServicePlanException.servicePlan → ServicePlan (FK)
ServiceSchedule.serviceObject → ServiceObject (FK)
AudioAsset.record → ServiceRecord (FK)
Transcript.record → ServiceRecord (FK)
```

## 5. Prisma Client Singleton

文件：`server/db/prisma.ts`

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

## 6. 路由层改造规则

### 6.1 查询替换

| better-sqlite3 | Prisma Client |
|----------------|---------------|
| `db.prepare(sql).get(p)` | `prisma.model.findUnique/findFirst({ where })` |
| `db.prepare(sql).all(p)` | `prisma.model.findMany({ where, orderBy })` |
| `db.prepare(sql).run(p)` (INSERT) | `prisma.model.create({ data })` |
| `db.prepare(sql).run(p)` (UPDATE) | `prisma.model.update({ where, data })` |
| `db.prepare(sql).run(p)` (DELETE) | `prisma.model.delete({ where })` |
| `db.exec(sql)` | `prisma.$executeRawUnsafe(sql)` |
| `db.transaction(() => {...})` | `prisma.$transaction([...])` 或 `prisma.$transaction(async (tx) => {...})` |
| `lastInsertRowid` | `create()` 直接返回完整对象 |
| `COUNT(*)` | `prisma.model.count({ where })` |

### 6.2 JSON 列处理

SQLite 中 JSON 存为 TEXT + `JSON.parse()`/`JSON.stringify()`。Prisma 的 `Json` 类型自动序列化/反序列化，无需手动转换。

### 6.3 所有 route handler 改为 async

```typescript
// Before
r.get("/path", (req, res) => {
  const db = getDb();
  const rows = db.prepare("...").all();
  res.json(rows);
});

// After
r.get("/path", async (req, res) => {
  const rows = await prisma.model.findMany();
  res.json(rows);
});
```

## 7. 受影响文件

### 7.1 新增

| 文件 | 内容 |
|------|------|
| `prisma/schema.prisma` | 数据模型定义 |
| `prisma/seed.ts` | Demo 数据 seed |
| `server/db/prisma.ts` | PrismaClient singleton |
| `docker-compose.test.yml` | MySQL 8.0 测试容器 |

### 7.2 重写

| 文件 | 变更 |
|------|------|
| `server/index.ts` | 移除 getDb/seedDatabase，改为 Prisma 连接 + seed |
| `server/db/chat.ts` | ChatDb 用 Prisma Client |
| `server/routes/auth.ts` | async + Prisma |
| `server/routes/admin.ts` | async + Prisma |
| `server/routes/home.ts` | async + Prisma |
| `server/routes/socialWorkers.ts` | async + Prisma |
| `server/routes/smartBadges.ts` | async + Prisma |
| `server/routes/serviceObjects.ts` | async + Prisma |
| `server/routes/serviceSchedules.ts` | async + Prisma |
| `server/routes/serviceRecords.ts` | async + Prisma |
| `server/routes/helpers.ts` | async + Prisma |
| `server/middleware/requireAuth.ts` | async |
| `server/middleware/optionalAuth.ts` | async |
| `server/middleware/gy-token.ts` | async |
| `tests/**/*.test.ts` | async + Docker MySQL |

### 7.3 删除

| 文件 | 原因 |
|------|------|
| `server/db/init.ts` | Prisma 管理连接 |
| `server/db/schema.sql` | Prisma schema 替代 |
| `server/db/seed.ts` | prisma/seed.ts 替代 |
| `data/fieldwork.db` | 不再使用 SQLite |

## 8. Docker 测试环境

`docker-compose.test.yml`：

```yaml
services:
  mysql-test:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: test
      MYSQL_DATABASE: goldenyears_test
    ports:
      - "3307:3306"
    tmpfs:
      - /var/lib/mysql
```

`tmpfs` 确保测试数据在容器停止后清除，加速 I/O。

测试流程：
1. `docker compose -f docker-compose.test.yml up -d`
2. `DATABASE_URL=... npx prisma migrate deploy`
3. `DATABASE_URL=... npx vitest run`
4. `docker compose -f docker-compose.test.yml down`

## 9. 测试改造

- **vitest.setup.ts**：连接 Docker MySQL，`prisma migrate deploy` + seed
- **每个 test suite**：使用 `prisma.$transaction` 隔离，或 `beforeEach` 清理表数据
- **E2E tests**：Playwright 连接运行在 Docker MySQL 上的服务器
- **chat.test.ts**：不再用 in-memory SQLite，改为 Docker MySQL

## 10. 不变的部分

- 前端代码（所有 React 组件、CSS）
- API 接口 URL 和请求/响应 JSON 格式
- WebSocket 层（pool.ts, protocol.ts）
- JWT 认证逻辑（仅 DB 查询方式变化）
- lak/CC session 集成

## 11. Migration 工作流（后续使用）

```bash
# 创建新 migration
npx prisma migrate dev --name add_xxx_table

# 生产部署
npx prisma migrate deploy

# 重置开发库（危险）
npx prisma migrate reset

# 查看 migration 状态
npx prisma migrate status
```

Migration 文件保存在 `prisma/migrations/` 目录，纳入 git 版本管理。

# 服务人员账号管理重设计

**日期：** 2026-05-19
**状态：** Approved

## 1. 目标

创建服务人员时自动创建 careworker 登录账号，账号信息持久化可查看，支持重置密码，首次登录强制改密。

## 2. 登录账号设计

- **用户名格式：** `CW` + 6位自增数字，如 `CW100001`、`CW100002`
- 创建后不可变，与手机号解耦
- 自增序号通过查询当前最大值 +1 生成

## 3. 数据模型变更

### User 模型新增字段

```prisma
mustChangePassword Boolean @default(false) @map("must_change_password")
initialPassword    String? @map("initial_password") @db.VarChar(32)
```

- `mustChangePassword`：新建时设 `true`，改密后设 `false`
- `initialPassword`：明文存储默认密码，改密后清 `null`

### SocialWorker 模型

```prisma
userId String @map("user_id") @db.VarChar(64)
user   User   @relation(fields: [userId], references: [id])
```

userId 从普通字符串改为 FK 关系。

## 4. 创建流程

POST `/api/social-workers` 改造：
1. 生成 SocialWorker 记录
2. 自动生成 `CW` 用户名（查最大序号 +1）
3. 随机 8 位密码
4. 创建 User 记录：role=careworker, mustChangePassword=true, initialPassword=密码明文
5. SocialWorker.userId 指向新 User.id
6. 响应中返回 `account: { username, initialPassword }`

删除 `/api/auth/create-careworker-account` 接口和前端"生成登录账号"按钮。

## 5. Modal 详情显示

服务人员详情 modal 中"登录账号"区块：

| 状态 | 条件 | 显示 |
|------|------|------|
| 待首次登录 | mustChangePassword=true | 账号 CWxxxxxx + 默认密码 + 复制按钮 + 重置密码按钮 |
| 已激活 | mustChangePassword=false | 账号 CWxxxxxx + "已修改密码" + 重置密码按钮 |

**重置密码：** 生成新随机密码 → 更新 passwordHash + initialPassword + mustChangePassword=true → modal 显示新密码。

## 6. 首次登录强制改密

### 后端
`POST /api/auth/login` 响应新增 `mustChangePassword` 字段。

`PATCH /api/auth/change-password` 改密时自动清除 `initialPassword` 并设 `mustChangePassword=false`。

### 前端（CareworkerPage）
登录成功后检查 `mustChangePassword`：
- `true` → 显示"修改密码"界面，输入新密码+确认
- 改密成功后进入正常页面

## 7. 已有数据兼容

- 现有 SocialWorker 记录的 userId 可能指向不存在的 User → 查询时 LEFT JOIN / optional 关系
- 现有无账号的服务人员在 modal 中显示"暂无登录账号" + "创建账号"按钮（兼容旧数据）

## 8. 文件变更

| 文件 | 变更 |
|------|------|
| prisma/schema.prisma | User 新增 2 字段，SocialWorker.userId FK |
| server/routes/socialWorkers.ts | POST 自动创建账号 |
| server/routes/auth.ts | 删除 create-careworker-account，login 返回 mustChangePassword，change-password 清除字段 |
| src/features/siteOperations/SocialWorkersArea.tsx | 移除"生成登录账号"按钮，新增账号信息区块+重置密码 |
| src/careworker/CareworkerPage.tsx | 登录后检查 mustChangePassword，强制改密界面 |

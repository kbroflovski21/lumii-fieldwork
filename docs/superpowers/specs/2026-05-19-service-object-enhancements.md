# 服务对象增强：身份证号 + 家属联系人改进

**日期：** 2026-05-19
**状态：** Implemented
**实现日期：** 2026-05-19
**范围：** ServiceObject 身份证号字段、FamilyContact 微信号字段与删除功能

## 1. 身份证号字段（idNumber）

### 1.1 数据模型

ServiceObject 新增字段：

```prisma
idNumber String? @map("id_number") @db.VarChar(18)
```

18 位中国居民身份证号码，创建时必填。

### 1.2 验证规则

前端 + 后端均执行 GB 11643-1999 校验码验证：
- 长度 18 位
- 前 17 位为数字
- 第 18 位为校验码（0-9 或 X）
- 加权求和模 11 校验算法

### 1.3 前端展示

| 场景 | 行为 |
|------|------|
| 列表页 | 不显示 idNumber（隐私保护） |
| 创建表单 | 必填字段，输入时实时校验格式 |
| 详情 modal | 显示完整身份证号 |
| 编辑表单 | 可编辑，修改时重新校验 |

### 1.4 API 变更

- `POST /api/service-objects`：body 新增 `idNumber`（必填），后端校验后存入
- `PATCH /api/service-objects/:id`：body 可选包含 `idNumber`，如有则校验
- `GET /api/service-objects`：响应中包含 `idNumber` 字段

## 2. 家属联系人微信号（wechatId）

### 2.1 数据模型

FamilyContact 新增字段：

```prisma
wechatId String? @map("wechat_id") @db.VarChar(64)
```

### 2.2 前端展示

在服务对象详情 modal 的"家属"tab 中，每条家属联系人记录显示"微信: xxx"（如有值）。

## 3. 家属联系人删除功能

### 3.1 API

```
DELETE /api/family-contacts/:id
```

删除指定家属联系人记录。

### 3.2 前端

家属联系人列表中每行增加删除按钮，点击后确认删除。

## 4. 家属联系人 CRUD

### 4.1 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/service-objects/:id/family-contacts` | 创建家属联系人（name 必填） |
| `PATCH` | `/api/family-contacts/:id` | 更新家属联系人（name, relation, phone, wechatId） |
| `DELETE` | `/api/family-contacts/:id` | 删除家属联系人（404 if not found） |

### 4.2 前端 UI

- Inline 添加/编辑/删除，带 labeled fields（姓名、关系、电话、微信）
- 删除确认使用 floating popover（浮动在按钮上方）
- 无独立 page，所有操作在服务对象详情内完成

## 5. Tab 结构调整

原结构：
- 基础信息
- 家属联系人（独立 tab）
- AI 洞察

新结构：
- **档案概览**：基础信息 + 家属联系人合并为一个 tab
- **AI 洞察**：独立 tab

### 5.1 EditModal 移除

EditModal 组件已移除。所有编辑改为 inline pencil icon 模式：
- 点击 section 标题旁的 Edit3 图标切换到编辑模式
- Section 内显示 Save/Cancel 按钮
- 保存后自动切回查看模式

## 6. 文件变更

| 文件 | 变更 |
|------|------|
| `prisma/schema.prisma` | ServiceObject 新增 idNumber，FamilyContact 新增 wechatId |
| `server/routes/serviceObjects.ts` | POST/PATCH 校验 idNumber，GET 返回 idNumber；新增 family-contacts CRUD 端点 |
| `src/features/siteOperations/ServiceObjectsArea.tsx` | Tab 结构调整，inline edit，family contacts 合入档案概览 |
| `src/features/siteOperations/FamilyContactsTab.tsx` | 显示微信号，增加删除按钮，inline add/edit |

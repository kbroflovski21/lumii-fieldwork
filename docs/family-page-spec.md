# 家属页面 — 产品设计规格 v2

状态：v2 绑定流程
日期：2026-05-19
仓库：`aro-network/lumii-goldenyears-dashboard`

## 1. 页面定位

家属通过微信服务号「关爱无忧」Tab 访问的移动端 H5 页面。核心功能是引导家属申请绑定家中老人，绑定后接收老人的服务报告和健康动态推送。

## 2. 页面状态流

```
[加载中] → 调用 GET /api/family/status 判断绑定状态
    ├─ 已绑定 (active) → [推送动态页]
    ├─ 待审核 (pending_review) → [待审核页]
    └─ 未绑定 → [落地页]
                   │
                   ▼
              [绑定表单] → POST /api/family/bind
                   │
         ┌─────────┼──────────┐
         ▼         ▼          ▼
     [成功页]  [待审核页]  [失败页]
         │                    │
         ▼                    ├─ 重新填写 → [绑定表单]
     [推送动态页]              └─ 返回首页 → [落地页]
```

## 3. 各状态页面

### 3.1 落地页 (Landing)

品牌介绍页，温暖关怀风格。

内容：
- 品牌图标 + 标题「关爱无忧」+ 副标题
- 三大功能卡片：服务报告推送、健康状态追踪、即时通知
- 免费体验提示：「绑定即享 14 天免费体验，之后仅需 5 元/月」
- CTA 按钮：「申请绑定家中老人」

### 3.2 绑定表单 (Form)

家属填写信息，提交绑定申请。

字段：
| 字段 | 类型 | 验证 |
|------|------|------|
| 老人姓名 | text | 必填 |
| 老人身份证号 | text, maxLength=18 | 必填，18位身份证号格式 |
| 家属姓名 | text | 必填 |
| 与老人关系 | chips 单选 | 必选（儿子/女儿/儿媳/女婿/孙子/孙女/配偶/其他） |

### 3.3 成功页 (Success)

绑定成功后展示，3 秒自动跳转到推送动态页。

### 3.4 待审核页 (Pending)

当该微信号曾被管理员解绑后再次申请时，需人工审核。展示等待审核状态 + 申请信息摘要。

### 3.5 失败页 (Fail)

绑定失败时展示，包含失败原因。提供「重新填写信息」和「返回首页」两个操作。

失败原因：
- `no_match`：老人姓名 + 身份证号与系统记录不匹配
- `already_bound`：该微信号已绑定
- 服务端异常

### 3.6 推送动态页 (Bound)

绑定成功后的主页面，展示老人的服务推送消息流。

顶部：老人姓名 + 家属身份 + 绑定状态栏
内容：推送消息卡片列表（服务报告、健康周报、服务通知）
右上角菜单：查看绑定详情（老人姓名、身份证号脱敏、家属信息、绑定时间）

## 4. API 契约

### 4.1 查询绑定状态

```
GET /api/family/status?wechatId={wechatId}
```

Response:
```json
// 未绑定
{ "bound": false }

// 已绑定
{
  "bound": true,
  "bindingStatus": "active" | "pending_review",
  "binding": {
    "elderName": "陈阿姨",
    "elderIdNumber": "3101101942...",
    "familyName": "陈小明",
    "relationship": "女儿",
    "wechatId": "wx_xxx",
    "subscriptionStatus": "weekly",
    "boundAt": "2026-05-19T07:16:07.571Z"
  }
}
```

### 4.2 提交绑定申请

```
POST /api/family/bind
Content-Type: application/json
```

Request:
```json
{
  "wechatId": "wx_xxx",
  "elderName": "陈阿姨",
  "elderIdNumber": "310110194209150028",
  "familyName": "陈小明",
  "relationship": "女儿"
}
```

Response:
```json
// 成功（首次绑定，自动通过）
{ "status": "success", "message": "绑定成功！...", "binding": { ... } }

// 待审核（曾被管理员解绑后再次申请）
{ "status": "pending", "message": "申请已提交，需要站点运营人员审核...", "binding": { ... } }

// 失败 — 不匹配
{ "status": "fail", "reason": "no_match", "message": "未找到匹配的老人信息..." }

// 失败 — 已绑定
{ "status": "fail", "reason": "already_bound", "message": "该微信号已绑定..." }
```

### 4.3 后端匹配逻辑

绑定时后端根据 `elderName` + `elderIdNumber` 匹配 `service_objects` 表的 `name` + `id_number` 字段：
- 匹配成功 + 该 wechatId 无历史解绑记录 → 自动通过，创建 FamilyContact
- 匹配成功 + 该 wechatId 曾被解绑 → 进入 pending_review，需管理员审核
- 匹配失败 → 返回 no_match

### 4.4 Dashboard 侧管理端点（站点运营人员使用）

```
POST /api/family/contacts/:id/unbind    — 解除绑定
POST /api/family/contacts/:id/approve   — 通过待审核绑定
POST /api/family/contacts/:id/reject    — 拒绝待审核绑定
```

## 5. 数据模型依赖

### ServiceObject（已有字段）
- `name`: 老人姓名
- `idNumber`: 老人身份证号（用于绑定匹配）

### FamilyContact（已有 + 新增字段）
- `name`: 家属姓名
- `relation`: 与老人关系
- `phone`: 手机号
- `wechatId`: 微信号（已有）
- `bindingStatus`: 绑定状态（待新增：active / pending_review / unbound_by_admin / rejected）
- `subscriptionStatus`: 订阅状态

## 6. 与 Dashboard 的关联

| Dashboard 位置 | 交互 |
|---------------|------|
| 服务对象 → 家属联系人 Tab | 查看已绑定家属，显示微信号、绑定状态 |
| 家属联系人 — active 状态 | 「解除绑定」按钮 → 调用 unbind API |
| 家属联系人 — pending_review 状态 | 「通过」/「拒绝」按钮 → 调用 approve/reject API |
| 服务对象状态筛选 | 「家属待绑定」筛选项对应 pending_review 状态 |

## 7. 当前实现状态

| 组件 | 状态 |
|------|------|
| H5 前端页面（全部状态流） | 已实现 |
| H5 服务反馈功能（Modal + 提交） | 已实现（前端 mock） |
| 后端 API 端点 | 待实现（/api/family/*） |
| 后端反馈 API（POST /api/family/feedback） | 待实现 |
| FamilyContact.bindingStatus 字段 | 待新增 |
| seed 数据（idNumber、wechatId） | 待补充 |
| Dashboard 解绑/审核按钮 | 待实现 |

## 8. 技术实现

- React + TypeScript + Vite
- 温暖关怀风格设计（柔和色调、圆角卡片）
- 移动端优先，max-width 420px
- CSS class 前缀 `gy-`（GoldenYears）
- 路由：`/family`，无需登录
- 微信 wechatId 目前为 mock 值，生产环境通过微信 JS-SDK 获取

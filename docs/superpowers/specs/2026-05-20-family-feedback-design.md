# 家属 H5 — 服务反馈功能设计

> 状态：前端已实现，待接入后端  
> 日期：2026-05-20

## 概述

在家属 H5 页面的服务记录卡片（type=service）上添加"我要反馈"入口，家属点击后弹出反馈 Modal，输入不超过 300 字的文字反馈并提交。反馈数据将关联到具体服务记录，后续影响质量管理系统的 B 分（家属反馈维度）。

## UI 设计

### 卡片入口

- 仅 `type === "service"` 的推送卡片底部显示
- 未反馈：显示「我要反馈」文字链接，使用 `--gy-primary` 珊瑚色
- 已反馈：显示「已反馈」灰色文字，不可再次点击

### 反馈 Modal（底部上滑半屏）

```
┌─────────────────────────────┐
│  ╳                          │  ← 关闭按钮
│  服务反馈                    │  ← 标题
│                             │
│  对本次服务满意度如何？       │
│  我们想了解您的反馈意见。     │
│                             │
│  ┌─────────────────────┐    │
│  │ textarea (300字)     │    │  ← placeholder: 请输入您的反馈意见…
│  │                     │    │
│  └─────────────────────┘    │
│                    128/300  │  ← 实时字数
│                             │
│  ┌─────────────────────┐    │
│  │      提交反馈        │    │  ← 空内容时 disabled
│  └─────────────────────┘    │
└─────────────────────────────┘
```

### 提交成功状态

Modal 内容替换为：
- ✓ 图标（绿色圆形勾）
- 「提交成功」
- 「站点工作人员将接收您的反馈，并及时处理。」
- 「关闭」按钮，点击关闭 Modal

## 状态管理

在 `BoundView` 组件内新增：

```typescript
feedbackTarget: string | null    // 当前打开反馈的消息 ID（null = Modal 关闭）
feedbackText: string             // textarea 内容
feedbackStatus: "idle" | "submitting" | "done"  // 提交状态
submittedIds: Set<string>        // 已提交过反馈的消息 ID 集合
```

## API 契约

### POST /api/family/feedback

提交家属对某次服务的反馈。

**Request:**
```json
{
  "wechatId": "wx_mock_user_001",
  "messageId": "p1",
  "content": "服务很好，社工很有耐心"
}
```

**Response (200):**
```json
{
  "status": "success"
}
```

**错误码：**
| 状态码 | 说明 |
|--------|------|
| 400 | content 为空或超过 300 字 |
| 404 | messageId 不存在 |
| 409 | 已经提交过反馈 |

## 前端实现（Mock）

当前前端使用 mock：提交后 800ms 延迟模拟网络请求，直接返回成功。`submittedIds` 使用 `useState` 管理（刷新后重置）。

## CSS 新增类

| 类名 | 说明 |
|------|------|
| `.gy-push-card__feedback` | "我要反馈" 链接 |
| `.gy-push-card__feedback--done` | "已反馈" 状态 |
| `.gy-feedback-overlay` | Modal 遮罩 |
| `.gy-feedback-modal` | Modal 容器（底部上滑） |
| `.gy-feedback-modal__header` | 标题 + 关闭按钮 |
| `.gy-feedback-modal__prompt` | 提示文案 |
| `.gy-feedback-modal__textarea` | 输入框 |
| `.gy-feedback-modal__counter` | 字数统计 |
| `.gy-feedback-modal__submit` | 提交按钮 |
| `.gy-feedback-modal__success` | 成功状态容器 |

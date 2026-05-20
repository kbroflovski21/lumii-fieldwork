# Inline Edit Pattern

**日期：** 2026-05-20
**状态：** Implemented
**范围：** 所有详情 Modal/Drawer 中的 section-level inline 编辑模式

## 1. 交互模式

### 1.1 触发

每个 section 标题旁显示 pencil 图标（Lucide `Edit3`），点击后该 section 切换到编辑模式。

### 1.2 编辑态

- Section 内的字段从只读文本变为可编辑 input
- Section 底部出现 Save（保存）和 Cancel（取消）按钮
- 其他 section 保持只读，不受影响

### 1.3 保存

- 点击 Save 发送 PATCH 请求
- 成功后切回查看模式，数据就地刷新
- 不关闭 Modal/Drawer（non-closing save）

### 1.4 取消

- 点击 Cancel 丢弃修改，切回查看模式

## 2. 应用范围

| 组件 | Section | 可编辑字段 |
|------|---------|------------|
| SocialWorker Drawer | 基础信息 | name, phone, gender, idNumber |
| SocialWorker Drawer | 常用工牌 | preferredBadge |
| SocialWorker Drawer | 登录账号 | password reset |
| SmartBadge Drawer | 设备信息 | deviceCode, status |
| SmartBadge Drawer | 服务人员 | preferredWorkerId |
| ServiceObject Drawer | 基础信息 | name, phone, idNumber, age, gender, address, eligibilityType |
| ServiceObject Drawer | 照护重点 | careNotes, riskTags |
| Site Management Modal | 站点信息 | name, address, contactPhone |
| User Management Modal | 用户信息 | name, role, siteIds |

## 3. Drawer Sync Pattern

当 Drawer/Modal 打开时持有一个 detail 对象的本地 state。如果后台 list 数据刷新（如其他操作触发 refetch），detail state 需要同步更新。

```tsx
// Drawer sync effect: update detail when list refreshes
useEffect(() => {
  if (detailItem && items.length > 0) {
    const fresh = items.find(i => i.id === detailItem.id);
    if (fresh) setDetailItem(fresh);
  }
}, [items]);
```

## 4. Non-closing Save (onRefresh vs onUpdated)

两种回调模式：

| 回调 | 行为 | 使用场景 |
|------|------|----------|
| `onUpdated` | 刷新数据 + 关闭 Drawer | 传统"保存并关闭" |
| `onRefresh` | 仅刷新数据，不关闭 Drawer | Inline edit 保存后继续查看 |

```tsx
// In parent component
const handleRefresh = () => {
  fetchList(); // re-fetch list data, drawer stays open
};

const handleUpdated = () => {
  fetchList();
  setDetailItem(null); // close drawer
};
```

## 5. 替代方案：EditModal 移除

之前的编辑模式使用独立的 EditModal 组件（全屏 modal with form）。该模式已被 inline edit 完全替代：

- 更少的 UI 跳转（不需要打开/关闭额外的 modal）
- 编辑 context 不丢失（用户始终看到完整详情）
- Section 粒度的编辑（只改需要改的部分）

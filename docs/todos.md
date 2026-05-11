# TODOs

本文是后续 session 的执行清单。先读 [`README.md`](README.md)，再按本文推进。

## 1. Design spec 顺序

按 3 号文档 [`ui-chat-context-matrix.md`](ui-chat-context-matrix.md) 的 15 个矩阵项逐项写 design spec。

每个矩阵项都要写：

- Production interaction flow：真实用户从进入到完成任务的连续流程。
- Agent behavior：Agent 何时响应、何时主动提醒、何时生成草稿。
- Confirmation points：哪些动作必须人确认。
- Production UI：真实用户默认看到什么。
- Discussion mode：可折叠标注 panel 显示哪个 Agent、flow、权限边界和来源文档。

## 2. 15 个 design spec 任务

- [ ] 01 总部运营复盘
- [ ] 02 运营调度工作台
- [ ] 03 站长洞察面板
- [ ] 04 社工管理台
- [ ] 05 老人 / 家属档案台
- [ ] 06 SOP / 服务项目规则台
- [ ] 07 培训管理台
- [ ] 08 社工现场 H5
- [ ] 09 社工查手册 / 学习 Chat
- [ ] 10 质检审核台
- [ ] 11 凭证审核台
- [ ] 12 接线 / 需求受理台
- [ ] 13 家属沟通台
- [ ] 14 家属 H5 / 小程序
- [ ] 15 Admin Console

## 3. UI mock 顺序

Design spec 写完并确认后，再逐项更新 UI mock。

建议顺序：

1. 先做 02 运营调度工作台。
2. 再做 08 社工现场 H5。
3. 再做 14 家属 H5 / 小程序。
4. 然后补齐其他矩阵项。

每个 mock 必须同时包含：

- Production mode：真实用户界面。
- Discussion mode：可折叠标注 panel。

## 4. 交叉界面规则

不同 design spec 可能共享同一类界面或组件，例如：

- 运营调度工作台、社工管理台、老人 / 家属档案台都可能在同一个站长后台里。
- 质检审核台和凭证审核台可能共享审核列表和服务单详情。
- 家属沟通台和家属 H5 可能共享报告摘要，但权限完全不同。

处理规则：

- Spec 必须按矩阵项分开写，不要因为 UI 复用就合并 spec。
- UI 可以复用同一个 shell、列表、详情页或组件。
- 复用 UI 时必须明确当前 context：谁在用、跟哪个 Agent 交互、权限/场景是什么。
- Production mode 不展示矩阵、Agent 架构或 flow 编号。
- Discussion mode 负责标注当前 UI 同时覆盖了哪些矩阵项和 flow。

## 5. 防漂移检查

每完成一个 spec 或 mock，检查：

- 是否能追溯到 3 号矩阵中的某一项。
- 是否覆盖了对应 business use case 和 agentic flow。
- 是否先写 production interaction flow，再写 UI。
- 是否把 discussion 内容放在可折叠 panel，而不是默认界面。
- 是否没有把功能清单当成真实用户界面。

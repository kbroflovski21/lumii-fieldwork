# Lumii Fieldwork Docs

这是当前产品文档入口。新 session 先按 0/1/2/3 顺序读；只从当前文档链开始。

原始需求链接：

<http://124.221.48.52:3002/l/PlnMHgwtWwdW1zq7lAvUU2EQ/>

Agentic UI 参考链接：

<http://124.221.48.52:3000/agent>

| 编号 | 文档 | 用途 |
| --- | --- | --- |
| 0 | [`agentic-design-methodology.md`](agentic-design-methodology.md) | 方法论：怎么从业务流梳理到 PRD 覆盖项 |
| 1 | [`business-use-cases.md`](business-use-cases.md) | 业务用例：真实业务里谁要完成什么事 |
| 2 | [`agentic-flows.md`](agentic-flows.md) | Agentic flow：Agent 如何响应、主动做事、请求确认 |
| 3 | [`prd-coverage-matrix.md`](prd-coverage-matrix.md) | PRD 覆盖矩阵：谁和哪个 Agent 在什么业务场景交互；只做需求追溯，不是产品设计 |

3 号文档是 PRD coverage，是后续 production design 的需求输入和覆盖依据；它不是产品 IA、页面清单、导航结构或可见 UI 文案来源。

后续做 UI 前，必须先从 3 号 PRD 覆盖矩阵和 Agentic interaction assumptions 出发，确认：

- 用户是单 Agent 还是多 Agent 协作。
- 单 Agent 用户是否直接进入 Agent 界面。
- 多 Agent 用户是否先进入独立前置页。
- 重要消息是否来自某个 Agent，并点击进入来源 Agent 的对应界面。
- 业务信息是否只围绕当前 Agent、当前任务和当前产出组织。

当前没有有效 UI artifact；需要先重新确认 product design，才能创建新的页面实现或部署产物。

第一版完整 business-flow mockup 的 production design 见 [`mockup-business-flow-spec.md`](mockup-business-flow-spec.md)。该文档只在准备 mockup 时使用，不替代 0/1/2/3 文档链。

部署方式见 [`deploy-guide.md`](deploy-guide.md)。部署文档只说明怎么发布产物，不定义产品形态。

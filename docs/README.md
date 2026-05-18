# Lumii Fieldwork 文档

这是当前产品文档入口。新 session 先按下面顺序读；只从当前文档链开始。

原始需求链接：

<http://124.221.48.52:3002/l/PlnMHgwtWwdW1zq7lAvUU2EQ/>

Fieldwork UI 主入口：

<http://124.221.48.52:3004/site-operations>

二级历史参考：

<http://124.221.48.52:3000/agent>

| 编号 | 文档 | 用途 |
| --- | --- | --- |
| 1 | [`business-use-cases.md`](business-use-cases.md) | 业务用例：真实业务里谁要完成什么事 |
| 2 | [`agentic-flows.md`](agentic-flows.md) | 智能工牌业务流：智能工牌最小使用闭环、角色工作区和后台自动行为 |
| 3 | [`global-ui-guidance.md`](global-ui-guidance.md) | 全局 UI 规范：产品壳、视觉变量、响应式、组件规则 |
| 4 | [`role-ui-design.md`](role-ui-design.md) | 角色 UI 结构：各角色进入后的聊天界面、工作区和主要动作 |
| 5 | [`superpowers/specs/site-operations/README.md`](superpowers/specs/site-operations/README.md) | 站点运营详细设计：overall + 各 tab 独立规格 |
| 6 | [`api-contract/site-operations/README.md`](api-contract/site-operations/README.md) | 站点运营 API contract：global + 各 tab 独立交接契约 |
| 7 | [`todos.md`](todos.md) | 当前待办和下一 session 起点 |

当前 UI 框架：所有角色使用同一套助手优先产品壳。每个角色进入后都是聊天主界面，加当前角色相关工作区。视觉和响应式规则以 [`global-ui-guidance.md`](global-ui-guidance.md) 为准；`role-ui-design.md` 只描述角色和业务结构。

## 文档结构规则

产品、UI 和 API 文档分层维护：

- Design spec：定义功能、UI、交互、信息层级、状态和验收。
- API contract：定义数据结构、endpoint、mutation、权限、错误和 fixture shape。
- Global guidance：只定义跨页面共用规则，不承载单个 tab 的业务字段。

复杂角色页面使用目录化规格：

```text
docs/superpowers/specs/<surface>/
  README.md
  00-overall-design.md
  01-<tab>.md
  ...

docs/api-contract/<surface>/
  README.md
  00-global-api.md
  01-<tab>-api.md
  ...
```

每个 tab design spec 必须引用同编号 API contract。旧单文件可以保留为兼容入口，但不能继续承载完整契约。

部署方式见 [`deploy-guide.md`](deploy-guide.md)。产品形态由上面的产品与 UI 文档定义。

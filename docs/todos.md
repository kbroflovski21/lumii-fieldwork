# Lumii Fieldwork Todos

状态：当前待办
日期：2026-05-14

## 1. Site Operations Implementation Plans

目标：重新按模块写 implementation plan，再按模块实现 `/site-operations`。不要再使用单个宽泛 remediation plan。

当前没有有效 implementation plan。旧的宽泛 site operations rebuild plan 已删除，避免误导后续实现。

实现顺序：

1. 首页：`home`
2. 服务人员：`social_workers`
3. 设备：`smart_badges`
4. 服务对象：`service_objects`
5. 服务排期：`service_schedules`
6. 服务记录：`service_records`

计划目录：

```text
docs/superpowers/plans/site-operations/
  README.md
  01-home-implementation.md
  02-service-personnel-implementation.md
  03-devices-implementation.md
  04-service-objects-implementation.md
  05-service-schedules-implementation.md
  06-service-records-implementation.md
```

每个 implementation plan 必须引用：

- `docs/global-ui-guidance.md`
- 对应 design spec：`docs/superpowers/specs/site-operations/<tab>.md`
- 对应 API contract：`docs/api-contract/site-operations/<tab>-api.md`
- 当前实现代码和测试文件

每个 implementation plan 必须包含：

1. Scope
2. Source specs
3. Current implementation gaps
4. Data/API changes
5. Component changes
6. Visual/UI contract mapping
7. Responsive behavior
8. Tests
9. Acceptance checklist
10. Rollout/deploy verification

## 2. Next Session Starting Point

下一轮从首页开始。

第一步：写 `docs/superpowers/plans/site-operations/01-home-implementation.md`。

首页计划必须基于：

- Design spec：`docs/superpowers/specs/site-operations/01-home.md`
- API contract：`docs/api-contract/site-operations/01-home-api.md`
- Global UI guidance：`docs/global-ui-guidance.md`
- 当前实现：
  - `src/components/SiteOperations/SiteOperationsPage.tsx`（兼容 re-export 入口）
  - `src/features/siteOperations/SiteOperationsPage.tsx`
  - `src/features/siteOperations/SiteOperationsShell.tsx`
  - `src/features/siteOperations/HomeArea.tsx`
  - `src/features/siteOperations/useSiteOperationsData.ts`
  - `src/features/siteOperations/siteOperations.css`
  - `src/features/siteOperations/__tests__/SiteOperationsPage.test.tsx`

首页 implementation plan 重点检查：

- 首页是否是真正的 `App Shell` + chat/event stream + `Right Insight Panel` + `Command Input`。
- 右侧高亮信息面板是否只属于首页。
- `今日概览` 标题是否只是 panel title，不是巨大 hero title。
- KPI、risk item、recommended action、activity list 是否按 `Right Insight Panel` 信息层级呈现。
- 窄屏下右侧信息是否进入 compact module 或 bottom drawer，而不是直接隐藏。
- 首页是否没有混入其他 tab 的完整列表、表格、详情和复杂动作。
- 首页数据是否对齐 `01-home-api.md` 的 `HomeSummary`、`HomeHighlight`、`HomeActivity`、`HomeRecommendedAction`。

首页 plan 写完后，先 review plan，再进入实现。

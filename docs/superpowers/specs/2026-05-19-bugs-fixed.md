# 2026-05-19 Bug 修复记录

**日期：** 2026-05-19

## Bug 1: 质量管理页面 Modal 按钮不可见

- **描述：** `.sw-btn--primary` 和 `.sw-btn--danger` 使用了 CSS 变量 `--site-accent`，但该变量只在 `.site-operations-root` 作用域内定义。质量管理页面不在该作用域内，导致按钮背景色为 transparent，文字不可见。
- **影响：** QualityPage 中的 Modal 操作按钮（确认、删除等）用户无法看到。
- **修复：** 将 `.sw-btn--primary` 和 `.sw-btn--danger` 的 CSS 变量替换为硬编码颜色值：
  - Primary: `#0052CC`
  - Danger: `#B42318`

## Bug 2: 站点运营页面 Modal 被 header 遮挡

- **描述：** `.site-operations-main` 设置了 `z-index: 1`，创建了新的 stacking context。其中 `position: fixed` 的 Modal 元素被限制在该 stacking context 内，无法覆盖 header（`z-index: 10`）。
- **影响：** Modal 弹出后顶部被 header 遮挡，用户无法看到 Modal 标题和关闭按钮。
- **修复：** 移除所有 main content 区域的 `z-index: 1` 声明。Profile menu 改用 React `createPortal` 渲染到 `document.body`，不再依赖 stacking context 层级。

## Bug 3: Profile menu 被 rail overflow 裁剪

- **描述：** 左侧导航栏设置了 `overflow-y: auto`，绝对定位的 Profile menu 被裁剪。同时 CSS Grid 布局的 stacking 规则导致 menu 无法绘制在相邻元素之上。
- **影响：** 点击头像后 Profile menu 只显示部分或完全不可见。
- **修复：** 创建 `ProfileMenu` 组件（`src/shared/ProfileMenu.tsx`），使用 React `createPortal` 将菜单渲染到 `document.body`，脱离原始 DOM 层级约束。

## Bug 4: SupervisorPage 显示 ") : (" 文本

- **描述：** SupervisorPage 页面上出现了 `) : (` 的纯文本渲染。原因是 JSX 编辑过程中留下了破碎的三元表达式片段。
- **影响：** 页面上显示无意义的符号文本。
- **修复：** 删除了 SupervisorPage.tsx 中的残留 `) : (` 文本。

## Bug 5: CDN 缓存旧版 HTML

- **描述：** 反向代理（CDN/Nginx）缓存了旧版本的 `index.html`，服务端代码更新后用户浏览器仍加载旧版前端资源。
- **影响：** 部署新版本后用户看不到更新，新功能不生效，可能出现 API 不兼容错误。
- **修复：** 在 SPA HTML 响应中添加 no-cache headers：
  ```
  Cache-Control: no-cache, no-store, must-revalidate
  Pragma: no-cache
  Expires: 0
  ```
  确保每次请求 index.html 都获取最新版本。静态资源（JS/CSS，带 hash 文件名）仍然使用长期缓存。

## Bug 6: 站点数据未隔离（数据安全漏洞）

- **描述：** ServiceObject、ServiceSchedule、ServiceRecord、HomeSummary 等业务模型缺少 `siteId` 字段，GET 路由未按站点过滤数据，所有站点的运营人员看到全部数据。
- **影响：** 站点 A 的运营人员可以看到站点 B 的服务对象、服务计划、服务记录等数据，存在数据泄露风险。多站点场景下数据混在一起，运营人员无法区分本站数据。
- **修复：** 所有业务模型添加 `siteId` 字段；GET 路由增加 `?siteId=` 查询过滤；POST 路由从 body 中写入 `siteId`；前端 API 层从 SiteContext 自动附加 `siteId`。

## Bug 7: 编辑按钮打开查看模式

- **描述：** 站点管理和用户管理的"编辑"按钮点击后打开详情 modal，但 modal 默认进入查看模式而非编辑模式，用户需要再次点击 modal 内的编辑按钮才能修改。
- **影响：** 用户体验不直观，"编辑"按钮行为与预期不符。
- **修复：** SiteDetailModal 和 UserDetailModal 新增 `initialEditing` prop；列表中的"编辑"按钮传入 `initialEditing=true`，直接进入编辑模式。

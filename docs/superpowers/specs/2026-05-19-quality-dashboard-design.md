# 质量总览页面重设计 — 员工服务质量管理

状态：前端已实现，待接入后端
日期：2026-05-19

## 1. 设计动机

当前质量总览页面展示通用 KPI（服务量、完成率、满意度等），但未触及集团管理层的核心关切：**员工服务质量的量化评价与持续改进**。

集团的实际管理闭环是：全程录音解析 + 老人直接反馈 + 家属意见反馈 -> 量化评分 -> 奖惩激励 -> 服务质量提升。质量总览页面应直接服务于这个闭环。

## 2. 评分体系

### 2.1 四维评分（每次服务产生）

| 维度 | 代号 | 来源 | 满分 | 中性值 | 说明 |
|------|------|------|------|--------|------|
| 服务对象直接评价 | A | AI 分析服务录音 | 10 | — | 每次服务后由 AI 自动评出 |
| 家属评价 | B | 家属微信意见反馈 | 10 | 5（默认） | 无反馈=5，好评=10，差评=0 |
| SOP 符合度 | C | AI 分析服务录音 | 10 | 5 | 逻辑待细化，每次服务后由 AI 评出 |
| 特殊识别项目 | D | AI 分析服务录音 | 10 | 5（默认） | 识别积极/消极信号（耐心、脏话等），有信号时增减分 |

### 2.2 单次服务总分

```
S = A + B + C + D    (满分 40)
```

### 2.3 周期聚合

- 按**周**或**月**聚合，由用户切换
- 周期得分 = 该周期内所有服务的 S 分平均值
- 同时保留 A/B/C/D 各维度的平均值，便于定位问题维度
- 追踪连续周期得分变化（较上期变动）

### 2.4 得分区间色标（基于 S 满分 40）

| 区间 | 色标 | 含义 |
|------|------|------|
| >= 32 | 绿色 (success) | 优秀 |
| 24 - 31 | 黄色 (warning) | 合格 |
| < 24 | 红色 (danger) | 需关注 |

## 3. 页面布局

从上到下单列滚动：**顶部 KPI -> 员工质量区域（主体）-> 站点对比区域**。

### 3.1 顶部：4 个核心指标卡片

| 指标 | 数据来源 | 说明 |
|------|----------|------|
| 本期平均 S 分 | 当前筛选范围内所有员工的 S 均分 | 较上期变动箭头 |
| 本期服务总次数 | 当前筛选范围内服务次数合计 | — |
| 进步/退步比 | S 分上升 vs 下降的员工人数 | 如 "8 / 3"，一眼看趋势 |
| 家属反馈率 | B 分非默认值(5)的服务占比 | 衡量家属参与度 |

卡片沿用现有 `quality-kpi-card` 样式。

### 3.2 员工服务质量区域（页面主体）

#### 工具栏

- 左侧：站点筛选下拉（全部站点 / 具体站点）
- 右侧：周/月切换 toggle

#### 员工表格

| 列 | 说明 |
|----|------|
| 姓名 | 可点击，打开详情 Modal |
| 所属站点 | — |
| 服务次数 | 本期服务总次数 |
| S 均分 | 带色标（绿/黄/红），列头下方灰色小字标注"总分 A+B+C+D" |
| A 均分 | 列头下方灰色小字标注"服务对象评价" |
| B 均分 | 列头下方灰色小字标注"家属评价" |
| C 均分 | 列头下方灰色小字标注"SOP 符合度" |
| D 均分 | 列头下方灰色小字标注"特殊识别" |
| 较上期 | 变动值，带箭头和色标（正=绿上箭头，负=红下箭头，零=灰横线） |

- 默认按 S 均分降序排列
- 点击列头可排序
- S 分单元格带色带背景表示区间
- SABCD 列头均有灰色小字（`.qd-th-sub`）标注含义，帮助非技术用户理解

#### 员工详情 Modal

点击员工姓名弹出，内容：

- **头部**：姓名、所属站点、本期服务次数
- **得分概览**：S / A / B / C / D 当期均分，用 5 个数字卡片展示（S 卡片突出显示）
- **趋势图**：过去 12 个周期的 S 分折线图（recharts `LineChart`），hover 显示数值
- **底部关闭按钮**

Modal 复用现有 `quality-user-modal` 样式框架。

### 3.3 站点对比区域（下方）

标题："站点对比"

表格，每行一个站点：

| 列 | 说明 |
|----|------|
| 站点名称 | — |
| 员工数 | 本期有服务记录的员工数 |
| 服务总次数 | — |
| S 均分 | 该站点所有员工的 S 均分，带色标 |
| A 均分 | — |
| B 均分 | — |
| C 均分 | — |
| D 均分 | — |
| 较上期 | 变动值 |

共享顶部的周/月切换（站点筛选不适用于此区域，始终显示所有站点）。

## 4. 交互细节

### 4.1 周/月切换

- 位于员工表格工具栏右侧
- pill toggle 样式（与规范管理的层切换按钮风格一致）
- 切换时所有数据（KPI、员工表、站点表）同步刷新
- 默认显示"月"

### 4.2 站点筛选

- 下拉选择，选项：全部站点 + 各具体站点
- 筛选影响：顶部 KPI + 员工表格
- 不影响站点对比区域（始终全量）

### 4.3 排序

- 员工表格列头可点击排序
- 点击已排序列切换升/降序
- 当前排序列显示箭头指示

### 4.4 色标逻辑

S 分色标：
- `>= 32`：`--quality-success-text` (#116B4C) 背景 `--quality-success-bg`
- `>= 24`：`--quality-warning-text` (#976000) 背景 `--quality-warning-bg`
- `< 24`：`--quality-danger-text` (#B42318) 背景 `--quality-danger-bg`

变动箭头（对于 S 分和所有正向指标）：
- 正变动：绿色上箭头
- 负变动：红色下箭头
- 零变动：灰色横线

## 5. 数据模型

### 5.1 新增：服务质量评分（ServiceScore）

```typescript
interface ServiceScore {
  id: string;
  serviceRecordId: string;    // 关联 ServiceRecord
  socialWorkerId: string;     // 服务人员 ID
  siteId: string;             // 站点 ID
  serviceDate: string;        // 服务日期 (YYYY-MM-DD)

  scoreA: number;             // 服务对象直接评价 (0-10)
  scoreB: number;             // 家属评价 (0-10, 默认 5)
  scoreC: number;             // SOP 符合度 (0-10)
  scoreD: number;             // 特殊识别项目 (0-10, 默认 5)
  scoreS: number;             // 总分 A+B+C+D (0-40)

  scoreBSource: "default" | "family_positive" | "family_negative";
  scoreDSignals: string[];    // AI 识别的信号标签，如 ["耐心对话", "情绪积极"]

  createdAt: string;
  updatedAt: string;
}
```

### 5.2 聚合查询返回类型

```typescript
interface WorkerPeriodScore {
  socialWorkerId: string;
  socialWorkerName: string;
  siteId: string;
  siteName: string;
  serviceCount: number;
  avgS: number;
  avgA: number;
  avgB: number;
  avgC: number;
  avgD: number;
  prevAvgS: number | null;     // 上期 S 均分，用于计算变动
  delta: number | null;        // avgS - prevAvgS
}

interface SitePeriodScore {
  siteId: string;
  siteName: string;
  workerCount: number;
  serviceCount: number;
  avgS: number;
  avgA: number;
  avgB: number;
  avgC: number;
  avgD: number;
  prevAvgS: number | null;
  delta: number | null;
}

interface WorkerTrend {
  periods: Array<{
    label: string;             // "2026-04" 或 "2026-W18"
    avgS: number;
    avgA: number;
    avgB: number;
    avgC: number;
    avgD: number;
    serviceCount: number;
  }>;
}
```

## 6. API 契约

### 6.1 获取员工周期评分列表

```
GET /api/quality/worker-scores?period=month&date=2026-05&siteId=all

Query:
  period: "week" | "month"
  date: string               // "2026-05" (月) 或 "2026-W20" (周)
  siteId: string             // "all" 或具体站点 ID

Response:
{
  summary: {
    avgS: number,
    totalServices: number,
    improvedCount: number,     // S 分较上期上升的员工数
    declinedCount: number,     // S 分较上期下降的员工数
    familyFeedbackRate: number // B 分非默认 5 的占比 (0-1)
  },
  workers: WorkerPeriodScore[]
}
```

### 6.2 获取员工趋势数据

```
GET /api/quality/worker-scores/:socialWorkerId/trend?period=month&count=12

Query:
  period: "week" | "month"
  count: number              // 返回最近几个周期，默认 12

Response:
{
  worker: {
    id: string,
    name: string,
    siteId: string,
    siteName: string
  },
  trend: WorkerTrend
}
```

### 6.3 获取站点对比数据

```
GET /api/quality/site-scores?period=month&date=2026-05

Query:
  period: "week" | "month"
  date: string

Response:
{
  sites: SitePeriodScore[]
}
```

## 7. 前端文件变更范围

| 文件 | 变更 |
|------|------|
| `src/quality/QualityPage.tsx` | 重写 DashboardView + 新增 WorkerDetailModal：员工质量评分表 + 站点对比 + 详情弹窗 |
| `src/quality/quality.css` | 新增样式：员工表格、列头小字标注、得分色标、周/月 toggle、详情 Modal 得分卡片 + 图表容器 |
| `package.json` | 新增依赖：recharts ^3.8.1 |

不新建文件，在现有 QualityPage.tsx 中重构 DashboardView 组件。

## 8. 已知问题与后续

- **前端目前使用 mock 数据** — 所有员工/站点评分数据内置于组件中，需接入后端 API 后替换
- **趋势数据为随机生成** — `buildMockTrend()` 用随机数模拟 12 期趋势，接入后端后替换
- **recharts 增加约 100KB gzip 的 JS 体积** — 后续可考虑 lazy import 拆包

## 9. 不在范围内

- 后端实现（本次只定义 API 契约 + 前端实现）
- 数据库 schema 迁移（ServiceScore 表的 Prisma migration）
- AI 评分引擎（A/C/D 分的 AI 分析逻辑）
- 家属微信反馈入口（B 分数据来源）
- 站点管理、用户管理、规范管理页面（不受影响）

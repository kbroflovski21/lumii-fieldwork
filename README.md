# GoldenYears Dashboard (金色年华)

前端 SPA + 业务 API — 养老服务管理系统的 Web 端和 API 服务。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite |
| 后端 | Express 5 + better-sqlite3 |
| 认证 | JWT (bcrypt + HS256) |
| WebSocket | ws (lak WSS relay) |
| 测试 | Vitest (239 unit) + Playwright (23 E2E) |

## 快速开始

```bash
npm install
npm run dev:all   # 启动 API (3001) + Vite (5173)
```

默认账号：
| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 集团管理 (org_admin) |
| operator | oper123 | 站点运营 (site_operator) |
| supervisor | super123 | 服务主管 (service_supervisor) |

## 模块

| 路径 | 模块 | 角色 |
|------|------|------|
| `/quality` | 集团管理 | org_admin |
| `/admin` | 用户管理 | org_admin |
| `/site-operations` | 站点运营 + AI 聊天 + Copilot | site_operator |
| `/supervisor` | SOP 管理 | service_supervisor |
| `/careworker` | 服务人员 H5 | 独立登录 |
| `/family` | 家属 H5 | 公开 |

## 相关仓库

| 仓库 | 说明 |
|------|------|
| [lumii-fieldwork](https://github.com/aro-network/lumii-fieldwork) | 高层项目文档库 |
| [lumii-goldenyears-agent](https://github.com/aro-network/lumii-goldenyears-agent) | AI Agent Sidecar (Go) |
| [lumii-agent-keeper](https://github.com/aro-network/lumii-agent-keeper) | lak 会话管理 |

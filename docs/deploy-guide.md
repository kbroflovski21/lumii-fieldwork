# 部署指南

本文记录 staging 部署方式。产品形态、页面结构和设计阶段由产品与 UI 文档定义。

## Staging 环境

| 项 | 值 |
| --- | --- |
| 主机 | `124.221.48.52` |
| SSH 用户 | `ubuntu` |
| 公开 URL | `http://124.221.48.52:3004/` |
| Staging 仓库路径 | `/home/ubuntu/lumii-goldenyears-dashboard` |
| 部署根目录 | `/home/ubuntu/lumii-goldenyears-dashboard/deploy/current` |
| 服务脚本 | `/home/ubuntu/lumii-goldenyears-dashboard/deploy/server.mjs` |
| PID 文件 | `/tmp/lumii-goldenyears-dashboard/fieldwork-app.pid` |
| 日志文件 | `/tmp/lumii-goldenyears-dashboard/fieldwork-app.log` |

`3000`、`3002`、`3003` 上已有的 staging 服务属于其他项目。

`3004` 端口保留给本项目使用，因为它在当前 staging 主机上可公开访问。产品参考来源以本文档链记录为准。

## 从本地工作区部署（推荐方式）

使用项目根目录的 `deploy.sh` 脚本一键部署：

```bash
./deploy.sh
```

脚本自动完成：构建前端 → rsync 同步 → Prisma schema push → 重启服务 → 健康检查。

**⚠️ 重要：`.env` 保护规则**

- `deploy.sh` 的 rsync 命令**排除了 `.env` 和 `.env.*`**，永远不会覆盖 staging 的环境变量
- **禁止**手动 rsync 整个项目目录到 staging（会覆盖 `.env`）
- 如需修改 staging 环境变量，必须 SSH 到 staging 主机直接编辑 `.env`
- 本地开发的 `.env` 内容和 staging 不同（数据库、密钥等），绝对不能混用

### 手动部署（不推荐）

如果需要手动 rsync，**必须**加 `--exclude='.env'`：

```bash
rsync -az --delete --exclude='.env' --exclude='.env.*' \
  server/ ubuntu@124.221.48.52:/home/ubuntu/lumii-goldenyears-dashboard/server/
rsync -az --delete dist/ ubuntu@124.221.48.52:/home/ubuntu/lumii-goldenyears-dashboard/dist/
```

## 替换 SQLite 数据库

**重要：** 替换 DB 前必须先停止服务并删除 WAL 文件，否则会导致 `SQLITE_CORRUPT`。

```bash
# 1. 停止服务
ssh ubuntu@124.221.48.52 'fuser -k 3004/tcp 2>/dev/null || true; sleep 1'
# 2. 删除 WAL 文件
ssh ubuntu@124.221.48.52 'rm -f /home/ubuntu/lumii-fieldwork/data/fieldwork.db-wal /home/ubuntu/lumii-fieldwork/data/fieldwork.db-shm'
# 3. 同步新 DB
rsync -az deploy/fieldwork.db ubuntu@124.221.48.52:/home/ubuntu/lumii-fieldwork/data/fieldwork.db
# 4. 重启服务
```

## 启动或重启服务

服务脚本位于仓库内的 `deploy/server.mjs`。

重启：

```bash
ssh ubuntu@124.221.48.52 '
set -e
mkdir -p /tmp/lumii-goldenyears-dashboard /home/ubuntu/lumii-goldenyears-dashboard/deploy/current
pid_file=/tmp/lumii-goldenyears-dashboard/fieldwork-app.pid
if [ -f "$pid_file" ]; then
  pid=$(cat "$pid_file")
  if ps -p "$pid" -o args= | grep -q "/home/ubuntu/lumii-goldenyears-dashboard/deploy/server.mjs"; then
    kill "$pid"
  fi
fi
FIELDWORK_STATIC_ROOT=/home/ubuntu/lumii-goldenyears-dashboard/deploy/current \
HOST=0.0.0.0 \
PORT=3004 \
PID_FILE="$pid_file" \
nohup node /home/ubuntu/lumii-goldenyears-dashboard/deploy/server.mjs > /tmp/lumii-goldenyears-dashboard/fieldwork-app.log 2>&1 &
sleep 0.8
cat "$pid_file"
cat /tmp/lumii-goldenyears-dashboard/fieldwork-app.log
ps -p $(cat "$pid_file") -o pid,cmd
'
```

## 验证

```bash
curl -I --max-time 8 http://124.221.48.52:3004/
curl -I --max-time 8 http://124.221.48.52:3004/site-operations
curl -I --max-time 8 http://124.221.48.52:3004/docs/README.md
curl -I --max-time 8 http://124.221.48.52:3004/docs/global-ui-guidance.md
curl -I --max-time 8 http://124.221.48.52:3004/api/service-objects
ssh ubuntu@124.221.48.52 'ps -p $(cat /tmp/lumii-goldenyears-dashboard/fieldwork-app.pid) -o pid,cmd; ss -ltnp | grep :3004'
```

预期结果：

- 公开 URL 在部署后返回 `HTTP/1.1 200 OK`。
- `/site-operations` 返回 `HTTP/1.1 200 OK`。
- `/docs/README.md` 和 `/docs/global-ui-guidance.md` 返回 `HTTP/1.1 200 OK`，`content-type` 为 `text/markdown; charset=utf-8`。
- `/api/service-objects` 从契约形状的 staging API 示例数据返回 `HTTP/1.1 200 OK`。
- 页面内容匹配当前已评审构建。
- Node 进程监听在 `0.0.0.0:3004`。

## GoldenYears Processor 部署

Processor 是智能工牌的 WebSocket 处理服务，负责接收工牌音频流、进行实时 ASR 转写和 SOP 匹配。

### 基本信息

| 项 | 值 |
| --- | --- |
| 服务端口 | `40054` |
| 进程 | Node.js 服务 |
| Caddy 反向代理路径 | `/processor/*` |
| WebSocket 端点 | `/processor/ws/badge` |

### Caddy 反向代理配置

Processor 通过 Caddy 反向代理暴露，路径前缀为 `/processor`。在 Caddyfile 中添加：

```caddyfile
handle_path /processor/* {
    reverse_proxy localhost:40054
}
```

这样前端访问 `wss://stage-gy.lumii-ai.cn/processor/ws/badge` 会被转发到 `ws://localhost:40054/ws/badge`。

### 环境变量配置

Processor 的 `.env` 文件需要包含以下变量：

```env
# ASR 服务配置
XFYUN_ASR_APP_ID=<讯飞 ASR 应用 ID>
XFYUN_ASR_API_KEY=<讯飞 ASR API Key>

# LLM 配置（SOP 匹配用）
LLM_API_KEY=<DashScope API Key>
LLM_MODEL=qwen3-max

# 服务认证
SERVICE_TOKEN=<与 dashboard 共享的 service token>

# Dashboard 回调地址
DASHBOARD_URL=http://localhost:3001
```

### 前端连接

前端 badge simulator (`HardwareSimulator.tsx`) 通过以下逻辑构造 Processor WebSocket URL：

```typescript
const PROCESSOR_URL = import.meta.env.VITE_PROCESSOR_URL || (window.location.origin + "/processor");
const WS_URL = PROCESSOR_URL.replace(/^http/, "ws") + "/ws/badge";
```

生产环境通过 Caddy 代理时，不需要设置 `VITE_PROCESSOR_URL`，默认使用 `window.location.origin + "/processor"` 即可正确路由。

开发环境需要在 `.env` 中设置：

```env
VITE_PROCESSOR_URL=http://localhost:40054
```

### 启动 Processor

```bash
cd /path/to/goldenyears-processor
node dist/index.js
```

### 验证

```bash
# 检查 Processor 进程
ss -ltnp | grep :40054

# 通过 Caddy 验证 WebSocket 端点可达
curl -I https://stage-gy.lumii-ai.cn/processor/health
```

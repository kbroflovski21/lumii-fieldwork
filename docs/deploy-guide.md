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

## 从本地工作区部署

完成评审后的构建产物和文档可从本地仓库根目录同步到 staging。`docs/` 必须随 staging 部署同步到静态根目录，便于直接查看当前文档链：

```bash
rsync -az --delete dist/ ubuntu@124.221.48.52:/home/ubuntu/lumii-goldenyears-dashboard/deploy/current/
rsync -az --delete docs/ ubuntu@124.221.48.52:/home/ubuntu/lumii-goldenyears-dashboard/deploy/current/docs/
rsync -az deploy/server.mjs ubuntu@124.221.48.52:/home/ubuntu/lumii-goldenyears-dashboard/deploy/server.mjs
rsync -az deploy/site-operations-api-fixture.mjs ubuntu@124.221.48.52:/home/ubuntu/lumii-goldenyears-dashboard/deploy/site-operations-api-fixture.mjs
```

默认部署方式是从本地工作区使用 `rsync` 同步。需要主机侧拉取仓库时，再配置部署密钥。

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

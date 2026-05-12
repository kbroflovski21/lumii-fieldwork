# Deploy Guide

本文只记录 staging 部署方式，不定义产品形态、页面结构或设计阶段。

## Staging

| 项 | 值 |
| --- | --- |
| Host | `124.221.48.52` |
| SSH user | `ubuntu` |
| Public URL | `http://124.221.48.52:3004/` |
| Repo path on staging | `/home/ubuntu/lumii-fieldwork` |
| Deploy root | `/home/ubuntu/lumii-fieldwork/deploy/current` |
| Server script | `/tmp/fieldwork-app-server.mjs` |
| PID file | `/tmp/fieldwork-app.pid` |
| Log file | `/tmp/fieldwork-app.log` |

Do not touch existing staging services on `3000`, `3002`, or `3003`.

Port `3004` is reserved for this project because it is public-reachable on this staging host. Do not treat anything currently or previously served there as product reference.

## Deploy from local workspace

Run from local repo root after there is a reviewed build to deploy:

```bash
rsync -az --delete deploy/current/ ubuntu@124.221.48.52:/home/ubuntu/lumii-fieldwork/deploy/current/
```

The staging host should not be assumed to have GitHub private repo access. Use `rsync` from the local workspace unless deploy keys are configured later.

## Start or restart server

Copy or create this server script on staging at `/tmp/fieldwork-app-server.mjs`:

```js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = '/home/ubuntu/lumii-fieldwork/deploy/current';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const resolvedRoot = path.resolve(root);

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  let name = decodeURIComponent(url.pathname);
  if (name === '/') name = '/index.html';
  const file = path.resolve(resolvedRoot, '.' + name);
  if (file !== resolvedRoot && !file.startsWith(resolvedRoot + path.sep)) {
    res.writeHead(403, {'content-type': 'text/plain; charset=utf-8'});
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'});
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': types[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(data);
  });
});

server.listen(3004, '0.0.0.0', () => {
  console.log('fieldwork-app listening on 0.0.0.0:3004');
});
```

Restart:

```bash
ssh ubuntu@124.221.48.52 '
if [ -f /tmp/fieldwork-app.pid ]; then kill $(cat /tmp/fieldwork-app.pid) 2>/dev/null || true; fi
setsid node /tmp/fieldwork-app-server.mjs > /tmp/fieldwork-app.log 2>&1 < /dev/null & echo $! > /tmp/fieldwork-app.pid
sleep 0.8
cat /tmp/fieldwork-app.pid
cat /tmp/fieldwork-app.log
ps -p $(cat /tmp/fieldwork-app.pid) -o pid,cmd
'
```

## Verify

```bash
curl -I --max-time 8 http://124.221.48.52:3004/
ssh ubuntu@124.221.48.52 'ps -p $(cat /tmp/fieldwork-app.pid) -o pid,cmd; ss -ltnp | grep :3004'
```

Expected:

- Public URL returns `HTTP/1.1 200 OK` after deployment.
- Served content matches the current reviewed build.
- Node process is listening on `0.0.0.0:3004`.

# Deploy Guide

本文记录当前 UI mock 的 staging 部署方式。

## Staging

| 项 | 值 |
| --- | --- |
| Host | `124.221.48.52` |
| SSH user | `ubuntu` |
| Public URL | `http://124.221.48.52:3004/` |
| Repo path on staging | `/home/ubuntu/lumii-fieldwork` |
| Static root | `/home/ubuntu/lumii-fieldwork/ui-mock` |
| Server script | `/tmp/fieldwork-ui-server.mjs` |
| PID file | `/tmp/fieldwork-ui-mock.pid` |
| Log file | `/tmp/fieldwork-ui-mock.log` |

Do not touch existing staging services on `3000`, `3002`, or `3003`.

Port `3004` is used because it is public-reachable on this staging host. Port `3107` was tested and blocked by inbound network policy.

## Deploy from local workspace

Run from local repo root:

```bash
rsync -az --delete --exclude '.git' /home/coder/lumii-fieldwork/ ubuntu@124.221.48.52:/home/ubuntu/lumii-fieldwork/
```

The staging host currently should not be assumed to have GitHub private repo access. Use `rsync` from the local clean workspace unless GitHub deploy keys are configured later.

## Start or restart server

Copy or create this server script on staging at `/tmp/fieldwork-ui-server.mjs`:

```js
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = '/home/ubuntu/lumii-fieldwork/ui-mock';
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

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  let name = decodeURIComponent(url.pathname);
  if (name === '/') name = '/index.html';
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep)) {
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
  console.log('fieldwork-ui-mock listening on 0.0.0.0:3004');
});
```

Restart:

```bash
ssh ubuntu@124.221.48.52 '
if [ -f /tmp/fieldwork-ui-mock.pid ]; then kill $(cat /tmp/fieldwork-ui-mock.pid) 2>/dev/null || true; fi
setsid node /tmp/fieldwork-ui-server.mjs > /tmp/fieldwork-ui-mock.log 2>&1 < /dev/null & echo $! > /tmp/fieldwork-ui-mock.pid
sleep 0.8
cat /tmp/fieldwork-ui-mock.pid
cat /tmp/fieldwork-ui-mock.log
ps -p $(cat /tmp/fieldwork-ui-mock.pid) -o pid,cmd
'
```

For static file-only changes, restart is usually not required because the server reads files from disk per request. Still run verification after every deploy.

## Verify

```bash
curl -I --max-time 8 http://124.221.48.52:3004/
curl -fsS --max-time 8 http://124.221.48.52:3004/ | rg -n "Lumii Fieldwork|Discussion Mode|站长|System Admin"
ssh ubuntu@124.221.48.52 'ps -p $(cat /tmp/fieldwork-ui-mock.pid) -o pid,cmd; ss -ltnp | grep :3004'
```

Expected:

- Public URL returns `HTTP/1.1 200 OK`.
- Page content matches the latest UI mock.
- Node process is listening on `0.0.0.0:3004`.

import { createHash, createHmac } from "crypto";
import { IncomingMessage } from "http";
import { Duplex } from "stream";
import { WebSocketServer, WebSocket } from "ws";
import { verifyJwt } from "./auth";

const XFYUN_WSS = "wss://rtasr.xfyun.cn/v1/ws";

function buildXfyunUrl(appId: string, apiKey: string): string {
  const ts = Math.floor(Date.now() / 1000).toString();
  const baseString = appId + ts;
  const md5 = createHash("md5").update(baseString).digest("hex");
  const hmac = createHmac("sha1", apiKey).update(md5).digest("base64");
  const signa = encodeURIComponent(hmac);
  return `${XFYUN_WSS}?appid=${appId}&ts=${ts}&signa=${signa}&lang=cn&punc=1`;
}

export function createAsrProxy(jwtSecret: string) {
  const appId = process.env.XFYUN_ASR_APP_ID ?? "";
  const apiKey = process.env.XFYUN_ASR_API_KEY ?? "";
  const wss = new WebSocketServer({ noServer: true });

  function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const url = new URL(req.url!, "http://localhost");
    const token = url.searchParams.get("token") ?? "";
    const payload = verifyJwt(token, jwtSecret);
    if (!payload) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws));
  }

  function onConnection(clientWs: WebSocket) {
    if (!appId || !apiKey) {
      clientWs.send(JSON.stringify({ type: "error", error: "ASR not configured" }));
      clientWs.close();
      return;
    }

    const xfUrl = buildXfyunUrl(appId, apiKey);
    const xfWs = new WebSocket(xfUrl);
    let xfReady = false;
    let closed = false;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      if (xfWs.readyState === WebSocket.OPEN) xfWs.close();
      if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
    };

    xfWs.on("open", () => {
      xfReady = true;
      clientWs.send(JSON.stringify({ type: "ready" }));
    });

    xfWs.on("message", (data) => {
      if (clientWs.readyState !== WebSocket.OPEN) return;
      try {
        const msg = JSON.parse(data.toString());
        if (msg.action === "error") {
          clientWs.send(JSON.stringify({ type: "error", error: msg.desc, code: msg.code }));
          cleanup();
          return;
        }
        if (msg.action === "result" && msg.code === "0") {
          const inner = JSON.parse(msg.data);
          const st = inner?.cn?.st;
          if (!st) return;
          const words = (st.rt ?? [])
            .flatMap((r: any) => r.ws ?? [])
            .flatMap((w: any) => w.cw ?? [])
            .map((c: any) => c.w)
            .join("");
          const isFinal = st.type === "0";
          const segId = inner.seg_id ?? 0;
          clientWs.send(JSON.stringify({ type: "result", text: words, isFinal, segId }));
        }
      } catch {}
    });

    xfWs.on("error", () => cleanup());
    xfWs.on("close", () => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "closed" }));
      }
      cleanup();
    });

    clientWs.on("message", (data, isBinary) => {
      if (!xfReady || xfWs.readyState !== WebSocket.OPEN) return;
      if (isBinary) {
        xfWs.send(data);
      } else {
        const text = data.toString();
        if (text === '{"end":true}') {
          xfWs.send(text);
        }
      }
    });

    clientWs.on("close", () => {
      if (xfWs.readyState === WebSocket.OPEN) {
        try { xfWs.send('{"end":true}'); } catch {}
      }
      setTimeout(cleanup, 2000);
    });
    clientWs.on("error", () => cleanup());
  }

  return { handleUpgrade };
}

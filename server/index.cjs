const express = require('express');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');
const http = require('http');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || 'sk-9dd462867bb34a5580a6b070499ddabf';
const LLM_MODEL = 'qwen3-max';

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/asr' });

// ─── ASR WebSocket Proxy ───
// Browser sends PCM audio frames → we forward to DashScope Paraformer real-time ASR
// DashScope sends transcription results back → we forward to browser

wss.on('connection', (clientWs) => {
  console.log('[ASR] Client connected');
  
  let dashscopeWs = null;
  const taskId = crypto.randomUUID();
  
  // Connect to DashScope real-time ASR WebSocket
  const dsUrl = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/';
  dashscopeWs = new WebSocket(dsUrl, {
    headers: {
      'Authorization': `bearer ${DASHSCOPE_API_KEY}`,
    }
  });

  dashscopeWs.on('open', () => {
    console.log('[ASR] Connected to DashScope');
    
    // Send run-task directive
    const startMsg = {
      header: {
        action: 'run-task',
        task_id: taskId,
        streaming: 'duplex',
      },
      payload: {
        task_group: 'audio',
        task: 'asr',
        function: 'recognition',
        model: 'paraformer-realtime-v2',
        parameters: {
          format: 'pcm',
          sample_rate: 16000,
          language_hints: ['zh'],
        },
        input: {},
      }
    };
    dashscopeWs.send(JSON.stringify(startMsg));
    clientWs.send(JSON.stringify({ type: 'asr_ready' }));
  });

  dashscopeWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const header = msg.header || {};
      const payload = msg.payload || {};
      
      if (header.event === 'result-generated') {
        const output = payload.output || {};
        const sentence = output.sentence || {};
        
        if (sentence.text) {
          clientWs.send(JSON.stringify({
            type: 'transcription',
            text: sentence.text,
            isPartial: sentence.end_time === undefined || sentence.end_time === 0,
            isFinal: !!sentence.end_time && sentence.end_time > 0,
          }));
        }
      } else if (header.event === 'task-started') {
        console.log('[ASR] Task started:', taskId);
      } else if (header.event === 'task-failed') {
        console.error('[ASR] Task failed:', header.error_message);
        clientWs.send(JSON.stringify({ type: 'error', message: header.error_message }));
      }
    } catch (e) {
      console.error('[ASR] Parse error:', e.message);
    }
  });

  dashscopeWs.on('error', (err) => {
    console.error('[ASR] DashScope WS error:', err.message);
    clientWs.send(JSON.stringify({ type: 'error', message: 'ASR connection error' }));
  });

  dashscopeWs.on('close', () => {
    console.log('[ASR] DashScope WS closed');
  });

  // Receive audio data from browser client
  clientWs.on('message', (data) => {
    if (dashscopeWs && dashscopeWs.readyState === WebSocket.OPEN) {
      if (typeof data === 'string') {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'stop') {
            // Send finish-task
            const stopMsg = {
              header: {
                action: 'finish-task',
                task_id: taskId,
                streaming: 'duplex',
              },
              payload: {
                input: {}
              }
            };
            dashscopeWs.send(JSON.stringify(stopMsg));
          }
        } catch(e) {}
      } else {
        // Binary audio data - wrap in continue-task
        const continueMsg = {
          header: {
            action: 'continue-task',
            task_id: taskId,
            streaming: 'duplex',
          },
          payload: {
            input: {
              audio: Buffer.from(data).toString('base64'),
            }
          }
        };
        dashscopeWs.send(JSON.stringify(continueMsg));
      }
    }
  });

  clientWs.on('close', () => {
    console.log('[ASR] Client disconnected');
    if (dashscopeWs && dashscopeWs.readyState === WebSocket.OPEN) {
      const stopMsg = {
        header: {
          action: 'finish-task',
          task_id: taskId,
          streaming: 'duplex',
        },
        payload: { input: {} }
      };
      dashscopeWs.send(JSON.stringify(stopMsg));
      setTimeout(() => dashscopeWs.close(), 1000);
    }
  });
});

// ─── LLM Agent Endpoint ───
// Analyzes transcript against SOP checklist and provides suggestions

app.post('/api/agent/analyze', async (req, res) => {
  const { transcript, sopSteps, elderProfile, serviceType } = req.body;
  
  const systemPrompt = `你是一名社区居家养老服务的AI督导助手。你的任务是根据实时对话内容，判断SOP流程中哪些步骤已经完成，并给出实时建议。

当前服务信息：
- 老人：${elderProfile || '未知'}
- 服务类型：${serviceType || '未知'}

SOP步骤列表：
${(sopSteps || []).map((s, i) => `${i + 1}. ${s.name}：${s.guidance}`).join('\n')}

请根据对话内容分析：
1. 哪些SOP步骤已经在对话中被覆盖到了？返回已完成步骤的编号列表。
2. 当前最需要关注或提醒社工的事项是什么？给出一条简短的建议（不超过30字）。

严格按以下JSON格式回复，不要输出其他内容：
{"completedSteps": [1, 3], "suggestion": "建议内容"}`;

  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `以下是社工和老人的实时对话记录：\n\n${transcript}\n\n请分析SOP完成情况并给出建议。` }
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      let content = data.choices[0].message.content;
      // Handle thinking models - extract content after </think> if present
      if (content.includes('</think>')) {
        content = content.split('</think>').pop().trim();
      }
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        res.json({ success: true, ...result });
      } else {
        res.json({ success: true, completedSteps: [], suggestion: content.slice(0, 50) });
      }
    } else {
      console.error('[Agent] LLM error:', data);
      res.json({ success: false, error: data.error?.message || 'LLM error' });
    }
  } catch (err) {
    console.error('[Agent] Error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: LLM_MODEL });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  console.log(`[Server] ASR WebSocket: ws://0.0.0.0:${PORT}/ws/asr`);
  console.log(`[Server] Agent API: http://0.0.0.0:${PORT}/api/agent/analyze`);
});

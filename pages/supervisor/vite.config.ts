import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

function loadApiKey() {
  try {
    const envPath = path.resolve(process.cwd(), '.env')
    const content = fs.readFileSync(envPath, 'utf-8')
    const match = content.match(/DASHSCOPE_API_KEY=(.+)/)
    return match?.[1]?.trim() || ''
  } catch { return '' }
}

const VOICES = [
  { id: 'longxiaochun_v2', name: '龙小淳', gender: '女', style: '温柔亲切' },
  { id: 'longxiaoxia_v2', name: '龙小夏', gender: '女', style: '活泼可爱' },
  { id: 'longyue_v2', name: '龙悦', gender: '女', style: '知性温婉' },
  { id: 'longwan_v2', name: '龙湾', gender: '女', style: '甜美清新' },
  { id: 'longshu_v2', name: '龙叔', gender: '男', style: '成熟稳重' },
  { id: 'longxiaobai_v2', name: '龙小白', gender: '男', style: '少年清朗' },
  { id: 'longcheng_v2', name: '龙城', gender: '男', style: '浑厚大气' },
  { id: 'longyuan_v2', name: '龙远', gender: '男', style: '沉稳低沉' },
]

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'tts-api',
      configureServer(server) {
        const apiKey = loadApiKey()
        console.log('[TTS] API key loaded:', apiKey ? 'yes' : 'NO')

        // Use middleware without path — runs BEFORE Vite's internal middleware
        server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const url = req.url || ''

          if (url === '/api/tts-voices') {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(VOICES))
            return
          }

          if (url === '/api/tts' && req.method === 'POST') {
            try {
              const rawBody = await readBody(req)
              const body = JSON.parse(rawBody)
              const { text, voice = 'longxiaochun_v2', model = 'cosyvoice-v2' } = body

              if (!text) { res.writeHead(400); res.end('Missing text'); return }
              if (!apiKey) { res.writeHead(500); res.end('Missing API key'); return }

              console.log(`[TTS] Synthesizing: "${text}" voice=${voice}`)

              // Step 1: Call DashScope CosyVoice V2 to get audio URL
              const ttsController = new AbortController()
              const ttsTimeout = setTimeout(() => ttsController.abort(), 10000)
              const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model,
                  input: { text, voice, format: 'mp3', sample_rate: 22050 },
                }),
                signal: ttsController.signal,
              })
              clearTimeout(ttsTimeout)

              if (!response.ok) {
                const errText = await response.text()
                console.error('[TTS] DashScope error:', response.status, errText)
                res.writeHead(response.status, { 'Content-Type': 'text/plain' })
                res.end(errText)
                return
              }

              const result = await response.json() as any
              const audioUrl = result?.output?.audio?.url
              if (!audioUrl) {
                console.error('[TTS] No audio URL in response:', JSON.stringify(result))
                res.writeHead(500, { 'Content-Type': 'text/plain' })
                res.end('No audio URL in response')
                return
              }

              console.log(`[TTS] Got audio URL, downloading...`)

              // Step 2: Download the audio file
              const audioRes = await fetch(audioUrl)
              if (!audioRes.ok) {
                console.error('[TTS] Audio download failed:', audioRes.status)
                res.writeHead(502, { 'Content-Type': 'text/plain' })
                res.end('Audio download failed')
                return
              }

              const audioBuffer = await audioRes.arrayBuffer()
              console.log(`[TTS] Audio ready: ${audioBuffer.byteLength} bytes`)
              res.writeHead(200, {
                'Content-Type': 'audio/mpeg',
                'Content-Length': String(audioBuffer.byteLength),
              })
              res.end(Buffer.from(audioBuffer))
            } catch (err: any) {
              console.error('[TTS] Proxy error:', err.message)
              res.writeHead(500, { 'Content-Type': 'text/plain' })
              res.end(err.message)
            }
            return
          }

          // --- Supervisor LLM Chat ---
          if (url === '/api/supervisor-chat' && req.method === 'POST') {
            try {
              const rawBody = await readBody(req)
              const body = JSON.parse(rawBody)
              const { message, folders, history, currentContext } = body

              if (!message || !apiKey) {
                res.writeHead(400, { 'Content-Type': 'text/plain' })
                res.end('Missing message or API key')
                return
              }

              const foldersDesc = (folders || []).map((f: any) => {
                const docs = [
                  f.sop ? `SOP(v${f.version || 1}, ${f.sop.status})` : 'SOP(空)',
                  f.supervision ? `督导要求(${f.supervision.status})` : '督导要求(空)',
                  f.report ? `报告要求(${f.report.status})` : '报告要求(空)',
                ].join(', ')
                return `- [${f.type === 'general' ? '通用' : '服务'}] id="${f.id}" name="${f.name}" v${f.version || 1}: ${docs}`
              }).join('\n')

              const foldersJSON = JSON.stringify((folders || []).map((f: any) => ({
                id: f.id, type: f.type, name: f.name, version: f.version,
                hasSop: !!f.sop, hasSupervision: !!f.supervision, hasReport: !!f.report,
                sopContent: f.sop?.content?.slice(0, 200) || null,
              })))

              const systemPrompt = `你是"金色年华养老服务"平台的服务主管AI助手，负责管理服务规范文档。

文档结构：两类规范（通用规范、服务项目规范），每个规范含三个文件（SOP、服务中实时督导要求、服务后报告要求）。
SOP由服务主管录入。督导要求和报告要求由AI基于SOP推理生成。

当前规范列表：
${foldersDesc || '(暂无)'}

用户当前正在查看的文档：${currentContext?.folderName ? `「${currentContext.folderName}」的「${currentContext.docLabel || currentContext.docType}」（文件夹ID: ${currentContext.folderId}）` : '(未选择)'}
当用户说"这个文档"、"当前文档"、"这个"等指代词时，指的就是上面这个文档。

详细数据：${foldersJSON}

你必须严格返回JSON格式（不要返回任何其他格式的文本），结构如下：
{
  "reply": "给用户的回复文本（支持markdown格式的加粗等）",
  "actions": [
    // 需要执行的操作数组，没有操作时为空数组[]
    // 可用操作类型：
    // 1. 创建新规范：{"type":"create_folder","data":{"name":"规范名","folderType":"general或service","sopContent":"SOP内容","supervisionContent":"督导要求内容","reportContent":"报告要求内容"}}
    // 2. 更新某个文件：{"type":"update_doc","data":{"folderId":"已有文件夹的id","docType":"sop或supervision或report","content":"完整的新内容"}}
    // 3. 删除规范：{"type":"delete_folder","data":{"folderId":"已有文件夹的id"}}
  ]
}

关键规则：
1. 当用户上传或描述了SOP内容，你必须：解析内容→创建/更新SOP→同时基于SOP推理生成督导要求和报告要求→在actions中包含所有更新操作
2. 编辑操作：用户说想编辑时，先回复"您需要编辑什么？可以告诉我想调整哪个文件的什么部分，或者直接上传新文件给我。"不要返回action。等用户描述了具体修改内容后，回复修改预览并询问"是否确认更新？"，等用户确认后再返回update_doc action
3. 删除操作：用户说想删除时，先回复确认提示（说明会删除什么），不要在这次返回action。等用户回复"确认删除"后，再在actions中返回delete_folder
4. 当用户只是查看或询问时，actions为空数组
5. 所有涉及版本变更的操作（创建、更新、删除），都需要用户二次确认后才在actions中返回操作。第一次回复只做预览和确认提示
5. 对于新创建的规范，使用create_folder并同时提供sopContent、supervisionContent和reportContent
6. 对于已有规范的更新，使用update_doc，folderId必须使用已有的id值
7. 回复中要明确告诉用户"右侧Tab中已更新，请查看"
8. 督导要求应该是具体的AI语音督导规则（什么时候提示、提示什么内容）
9. 报告要求应该是具体的报告提取项列表（需要从录音中提取什么信息）
10. 回复使用中文`

              const messages = [
                { role: 'system', content: systemPrompt },
                ...((history || []).slice(-10).map((h: any) => ({ role: h.role === 'agent' ? 'assistant' : 'user', content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content) }))),
                { role: 'user', content: message },
              ]

              console.log(`[SUP-CHAT] User: "${message.slice(0, 80)}..."`)

              const llmRes = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'qwen3-max',
                  messages,
                  response_format: { type: 'json_object' },
                }),
              })

              if (!llmRes.ok) {
                const errText = await llmRes.text()
                console.error('[SUP-CHAT] DashScope error:', llmRes.status, errText)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ reply: '抱歉，AI服务暂时不可用，请稍后再试。', actions: [] }))
                return
              }

              const llmResult = await llmRes.json() as any
              let content = llmResult.choices?.[0]?.message?.content || ''

              // Strip <think> tags
              content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

              let parsed: any = { reply: '抱歉，未能解析回复。', actions: [] }
              try {
                parsed = JSON.parse(content)
                if (!parsed.reply) parsed.reply = content
                if (!Array.isArray(parsed.actions)) parsed.actions = []
              } catch {
                // If not valid JSON, treat as plain text reply
                parsed = { reply: content, actions: [] }
              }

              console.log(`[SUP-CHAT] Reply: "${(parsed.reply || '').slice(0, 80)}..." Actions: ${parsed.actions?.length || 0}`)
              if (parsed.actions?.length > 0) {
                console.log(`[SUP-CHAT] Actions:`, JSON.stringify(parsed.actions.map((a: any) => a.type)))
              }

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ reply: parsed.reply, actions: parsed.actions || [] }))
            } catch (err: any) {
              console.error('[SUP-CHAT] Error:', err.message)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ reply: '处理请求时出错：' + err.message, actions: [] }))
            }
            return
          }

          // --- Real-time LLM SOP Check + Rule Detection ---
          if (url === '/api/check-live' && req.method === 'POST') {
            try {
              const rawBody = await readBody(req)
              const body = JSON.parse(rawBody)
              const { recentText, sopSteps, completedStepIndices, customRules } = body

              if (!recentText || !apiKey) {
                res.writeHead(400, { 'Content-Type': 'text/plain' })
                res.end('Missing recentText or API key')
                return
              }

              const stepsDesc = (sopSteps || []).map((s: string, i: number) => `${i}: ${s}${(completedStepIndices || []).includes(i) ? ' [已完成]' : ''}`).join('\n')
              const rulesDesc = (customRules || []).length > 0 ? '督导规则：\n' + customRules.join('\n') : ''

              const prompt = `你是社工上门服务的实时AI督导。你的职责是分析社工的最新对话，检查SOP完成情况和是否存在违规行为。

当前服务的SOP步骤（编号:名称）：
${stepsDesc}

督导策略（请严格遵守）：

1. 开场确认检测：如果对话已进行一段时间但社工未做开场确认（介绍自己是谁、来自哪家机构、确认被服务人员身份），在violation中返回"未做开场确认：请介绍自己的姓名和机构，并确认对方身份"。

2. 服务结束检测：如果对话中出现服务结束迹象（告别、说再见、表示要走等），但社工未复述服务内容或未询问满意度，在violation中返回"服务即将结束但未复述服务内容和询问满意度"。

3. 违规行为检测：如果检测到以下任何行为，在violation中具体描述：
   - 向服务对象推销商品、保健品、保险、理财
   - 私下收取费用或好处
   - 任何形式的商业推广
   注意：正常讨论健康话题不算违规，必须有明确推销/推荐购买意图才算。

SOP检查规则：
- 不限顺序，只要对话中涉及某步骤内容就判定完成
- 基于语义理解判断，不是简单关键词匹配
- "服务总结与满意度询问"要求社工明确复述完成的服务项目并询问满意度

${rulesDesc}

最新对话内容："${recentText}"

严格返回JSON，不要有任何其他文字：
{"new_steps":[此次对话中新完成的步骤编号数组],"violation":null或"一句话描述问题"}`

              const llmRes = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'qwen3-max',
                  messages: [{ role: 'user', content: prompt }],
                  response_format: { type: 'json_object' },
                }),
              })

              if (!llmRes.ok) {
                const errText = await llmRes.text()
                console.error('[CHECK] DashScope error:', llmRes.status, errText)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ new_steps: [], violation: null, error: true }))
                return
              }

              const llmResult = await llmRes.json() as any
              const content = llmResult.choices?.[0]?.message?.content || '{}'
              let result
              try { result = JSON.parse(content) } catch { result = { new_steps: [], violation: null } }
              console.log(`[CHECK] "${recentText.slice(0, 30)}..." => steps:${JSON.stringify(result.new_steps)} violation:${result.violation}`)

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(result))
            } catch (err: any) {
              console.error('[CHECK] Error:', err.message)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ new_steps: [], violation: null, error: true }))
            }
            return
          }

          // --- LLM Transcript Analysis ---
          if (url === '/api/analyze' && req.method === 'POST') {
            try {
              const rawBody = await readBody(req)
              const body = JSON.parse(rawBody)
              const { transcript, recipientName, workerName, serviceType, sopSteps, reportStrategy } = body

              if (!transcript || !apiKey) {
                res.writeHead(400, { 'Content-Type': 'text/plain' })
                res.end('Missing transcript or API key')
                return
              }

              console.log(`[LLM] Analyzing transcript for ${recipientName} (${transcript.length} chars)`)

              const reportItems = (reportStrategy || []).length > 0
                ? `\n\n报告策略要求（请在分析中体现）：\n${(reportStrategy as string[]).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}`
                : ''

              const prompt = `你是一个社区养老服务的智能分析助手。请分析以下社工上门服务的语音转写记录。

服务信息：
- 服务对象：${recipientName}
- 社工：${workerName}
- 服务类型：${serviceType}
- SOP 步骤：${(sopSteps || []).join('、')}${reportItems}

转写记录：
${transcript}

请返回严格的 JSON 格式（不要有其他文字），包含：
{
  "summary": "两到三句话的服务摘要，描述社工做了什么、发现了什么",
  "speaker_turns": [
    {"speaker": "社工", "text": "这句话的内容"},
    {"speaker": "服务对象", "text": "这句话的内容"}
  ],
  "sop_check": {
    ${(sopSteps || ['问候与身份确认','健康状况询问','生命体征检查','服务总结与满意度询问']).map((s: string) => `"${s}": true或false`).join(',\n    ')}
  },
  "concerns": ["如果有需要关注的事项列在这里，包括报告策略要求检测的项目"],
  "mood": "服务对象的情绪状态（如：平稳、低落、焦虑、开心等）",
  "health_observations": ["从对话中观察到的健康相关信息"],
  "satisfaction": "客户满意度分析（如有相关表达）",
  "violations": ["如发现违规行为（如推销商品），在此列出"]
}`

              const llmRes = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'qwen3-max',
                  messages: [{ role: 'user', content: prompt }],
                  response_format: { type: 'json_object' },
                }),
              })

              if (!llmRes.ok) {
                const errText = await llmRes.text()
                console.error('[LLM] DashScope error:', llmRes.status, errText)
                res.writeHead(llmRes.status, { 'Content-Type': 'text/plain' })
                res.end(errText)
                return
              }

              const llmResult = await llmRes.json() as any
              const content = llmResult.choices?.[0]?.message?.content || '{}'
              console.log('[LLM] Analysis complete')

              let analysis
              try {
                analysis = JSON.parse(content)
              } catch {
                analysis = { summary: content, speaker_turns: [], sop_check: {}, concerns: [], mood: '未知', health_observations: [] }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(analysis))
            } catch (err: any) {
              console.error('[LLM] Analysis error:', err.message)
              res.writeHead(500, { 'Content-Type': 'text/plain' })
              res.end(err.message)
            }
            return
          }

          next()
        })
      },
    },
  ],
  server: {
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        supervisor: 'supervisor.html',
      },
    },
  },
})

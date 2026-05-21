import { Router } from "express";

const LLM_API_KEY = process.env.LLM_API_KEY ?? "";
const LLM_MODEL = process.env.LLM_MODEL ?? "qwen3-max";
const LLM_URL = process.env.LLM_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export function aiRoutes() {
  const r = Router();

  r.post("/ai/chat", async (req, res) => {
    const { messages, systemPrompt } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages array required" });
      return;
    }
    if (!LLM_API_KEY) {
      res.json({ reply: "AI 服务未配置（缺少 LLM_API_KEY 环境变量）" });
      return;
    }

    try {
      const llmMessages = [
        { role: "system", content: systemPrompt ?? "你是金色年华养老服务平台的AI助手。你帮助集团管理员创建和管理SOP（标准操作流程）文档。回答简洁专业。" },
        ...messages.map((m: any) => ({ role: m.role === "agent" ? "assistant" : "user", content: m.content })),
      ];

      const resp = await fetch(LLM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: llmMessages,
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content ?? "AI 回复异常";
      res.json({ reply });
    } catch (err: any) {
      console.error("[ai] chat error:", err.message);
      res.json({ reply: "AI 服务暂时不可用，请稍后重试。" });
    }
  });

  r.post("/ai/generate-doc", async (req, res) => {
    const { sopContent, sopName, docType } = req.body;
    if (!sopContent || !docType) {
      res.status(400).json({ error: "sopContent and docType required" });
      return;
    }
    if (!LLM_API_KEY) {
      res.json({ content: "AI 服务未配置" });
      return;
    }

    const prompts: Record<string, string> = {
      supervision: `你是养老服务AI督导系统的配置专家。根据以下SOP内容，生成"服务中实时督导要求"。要求：
1. 每条要求对应SOP中的关键步骤
2. 明确触发条件（什么情况下提醒）
3. 提醒方式（语音提示）
4. 格式：每行一条，编号列出

SOP名称：${sopName ?? ""}
SOP内容：
${sopContent}

请直接输出督导要求内容，不要加额外说明。`,

      report: `你是养老服务报告系统的配置专家。根据以下SOP内容，生成"服务后报告要求"。要求：
1. 每条对应SOP中需要记录的关键信息
2. 明确需要提取的数据项
3. 格式：每行一条，编号列出

SOP名称：${sopName ?? ""}
SOP内容：
${sopContent}

请直接输出报告要求内容，不要加额外说明。`,
    };

    try {
      const resp = await fetch(LLM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            { role: "system", content: "你是养老服务标准化专家，擅长制定服务规范和AI督导配置。" },
            { role: "user", content: prompts[docType] ?? prompts.supervision },
          ],
          temperature: 0.5,
          max_tokens: 2000,
        }),
      });

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content ?? "生成失败";
      res.json({ content });
    } catch (err: any) {
      console.error("[ai] generate-doc error:", err.message);
      res.json({ content: "AI 生成失败，请稍后重试。" });
    }
  });

  return r;
}

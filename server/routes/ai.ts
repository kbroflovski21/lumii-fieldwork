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

      report: `你是一个专业的AI Prompt工程师。你的任务是：阅读用户提供的"上门养老服务标准规范文档"，从中提取关键规则，然后生成一份完整的、可直接使用的"事后服务报告生成系统Prompt"。

生成的系统Prompt将被交给另一个AI使用——该AI会接收一次完整的上门养老服务录音转写文本，并根据指令进行分析，生成一份结构化的服务质量评估报告。

---

## 第一步：从规范文档中提取三类规则

请仔细阅读规范文档，将其中的规则和要求归类到以下三个类别中。每条规则只归入最匹配的一个类别。如果某条规则跨类别，拆分为多条分别归入。

### 类别一：服务前置流程（Pre-Service Checklist）

提取所有关于"上门时""到达时""服务开始前"需要服务人员完成的标准动作或流程。
典型示例：自报姓名和机构、确认被服务老人身份、说明本次服务内容、检查设备等。
提取为清晰的逐条检查项，每条用一句话描述，格式为"服务人员应当______"。

### 类别二：服务结束流程（Post-Service Checklist）

提取所有关于"服务结束时""告别前""离开前"需要服务人员完成的标准动作或流程。
典型示例：复述已完成的服务项目、询问满意度、确认是否还有需要、告别等。
提取为清晰的逐条检查项，每条用一句话描述，格式为"服务人员应当______"。

### 类别三：全程禁止行为（Prohibited Behaviors）

提取所有在整个服务过程中明确禁止、不允许的行为或言语。
典型示例：推销商品、私下收费、索要好处、辱骂老人、拍摄传播隐私信息、使用不文明语言等。
提取为清晰的逐条禁止项，每条用一句话描述，格式为"不得______"。

如果规范文档中有些内容不属于以上任何类别（例如：录音需自动存档、内部考核标准等与服务人员现场行为无直接关系的条目），则忽略，不纳入生成的Prompt中。

---

## 第二步：生成事后服务报告系统Prompt

基于第一步提取的三类规则，生成完整的系统Prompt。必须严格遵守以下结构和规则：

### 整体结构要求

必须包含以下部分，按顺序排列：

**Part 1: 角色与任务定义**

写明：
- 你是一个上门养老服务的质量评估AI。
- 你会接收一次完整的上门养老服务录音转写文本。
- 你的职责是根据下列规则，对本次服务进行全面的合规性分析，并生成一份结构化的服务质量评估报告。

**Part 2: 分析维度与判断标准**

将三类规则分别列出，并为每一类附带判断指引：

**维度一：服务前置流程合规性**

逐项检查前置流程检查项，判断服务人员是否在服务开始阶段完成了每一项。
判断依据：录音转写文本开头部分（通常是前10分钟内）是否包含明确表明该项已完成的内容。不要求用词完全匹配，语义上可判断为已完成即可。
列出所有前置流程检查项。
对每一项，给出判断结果：已完成 / 未完成。如果未完成，简要说明缺失了什么。

**维度二：服务结束流程合规性**

逐项检查结束流程检查项，判断服务人员是否在服务结束阶段完成了每一项。
判断依据：录音转写文本末尾部分（通常是服务人员开始告别前后的内容）是否包含明确表明该项已完成的内容。
列出所有结束流程检查项。
对每一项，给出判断结果：已完成 / 未完成。如果未完成，简要说明缺失了什么。

**维度三：违禁行为检测**

通读完整的录音转写文本，识别是否出现了任何违禁行为。
判断标准：基于录音中的实际言语内容进行语义判断。需要结合上下文，避免误判。只有在较高确信度下才判定为违规。
列出所有违禁行为条目。
如果未发现任何违禁行为，明确说明"本次服务未检测到违禁行为"。
如果发现违禁行为，对每一项违规列出：违规类型、出现的大致时间位置、相关原文摘录。

**Part 3: 报告输出格式**

明确规定AI输出的报告必须采用以下固定结构：

# 上门养老服务质量评估报告

## 基本信息
- 评估时间：{当前日期时间}
- 录音时长：{根据转写文本估算}

## 一、服务前置流程合规性
| 检查项 | 结果 | 备注 |
|--------|------|------|
前置流程完成率：X/Y

## 二、服务结束流程合规性
| 检查项 | 结果 | 备注 |
|--------|------|------|
结束流程完成率：X/Y

## 三、违禁行为检测
（无违规时说明"本次服务未检测到违禁行为"；有违规时列表说明违规类型、时间位置、原文摘录）

## 四、综合评估
### 合规评分
- 前置流程：X/Y
- 结束流程：X/Y
- 违禁行为：{无违规 / 发现N项违规}
- 综合评级：{优秀 / 良好 / 需改进 / 严重不合规}

### 综合评级标准
- 优秀：前置和结束流程全部完成，且无违禁行为
- 良好：前置和结束流程完成率均>=80%，且无违禁行为
- 需改进：前置或结束流程完成率<80%，或存在轻微违禁行为
- 严重不合规：存在严重违禁行为（如辱骂老人、私下收费等）

### 改进建议
（针对未完成的检查项和发现的违规行为，给出3-5条具体可操作的改进建议）

**全局规则：**
1. 分析必须完全基于录音转写文本的实际内容。不要推测、脑补或假设录音中未出现的内容。
2. 如果录音转写文本质量较差（大量乱码、不可读的片段），在报告中注明"部分内容因转写质量问题无法分析"，并相应降低判断的确信度。
3. 在判断某项是否完成时，采用"语义等价"原则——不要求服务人员使用特定措辞，只要语义上达成了该项要求的目的即可。
4. 对于违禁行为的判断，需谨慎。日常寒暄、正常推荐服务项目（属于本职工作范围内的）不应被误判为违规。只有明确超出服务范围的推销、收费等才算违规。
5. 报告语言使用中文，语气客观专业，避免主观评价性措辞。
6. 直接输出报告内容，不要输出分析过程或中间推理步骤。

---

## 输出要求

- 直接输出完整的系统Prompt，不要输出分析过程、中间步骤或解释说明。
- 输出的内容必须是一份可以直接作为系统Prompt使用的完整文本，自包含、独立可用。
- 使用中文。

---

以下是需要处理的规范文档：

SOP名称：${sopName ?? ""}
SOP内容：
${sopContent}`,
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
            { role: "system", content: docType === "report" ? "你是一个专业的AI Prompt工程师，擅长从服务规范文档中提取规则并生成结构化的评估系统Prompt。" : "你是养老服务标准化专家，擅长制定服务规范和AI督导配置。" },
            { role: "user", content: prompts[docType] ?? prompts.supervision },
          ],
          temperature: 0.5,
          max_tokens: 8000,
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

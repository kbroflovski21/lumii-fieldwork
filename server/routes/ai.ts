import { Router } from "express";
import { prisma } from "../db/prisma";

const LLM_API_KEY = process.env.LLM_API_KEY ?? "";
const LLM_MODEL = process.env.LLM_MODEL ?? "qwen3-max";
const LLM_URL = process.env.LLM_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

function buildPrompt(sopType: string, docType: string, sopName: string, sopContent: string): { system: string; user: string } {
  const key = `${sopType ?? "general"}:${docType}`;
  const sopBlock = `\n\n---\n\n以下是需要处理的规范文档：\n\nSOP名称：${sopName}\nSOP内容：\n${sopContent}`;

  switch (key) {
    case "general:supervision":
      return { system: "你是一个专业的AI Prompt工程师，擅长从服务规范文档中提取违禁行为并生成实时督导系统Prompt。", user: GENERAL_SUPERVISION_PROMPT + sopBlock };
    case "general:guidance":
      return { system: "你是一个专业的AI Prompt工程师，擅长从服务规范文档中提取服务流程并生成实时引导系统Prompt。", user: GENERAL_GUIDANCE_PROMPT + sopBlock };
    case "general:report":
      return { system: "你是一个专业的AI Prompt工程师，擅长从服务规范文档中提取规则并生成结构化的评估系统Prompt。", user: GENERAL_REPORT_PROMPT + sopBlock };
    case "service:supervision":
      return { system: "你是一个专业的AI Prompt工程师，擅长从服务项目SOP中提取安全禁忌并生成实时督导系统Prompt。", user: SERVICE_SUPERVISION_PROMPT + sopBlock };
    case "service:guidance":
      return { system: "你是一个专业的AI Prompt工程师，擅长从服务项目SOP中提取步骤并生成实时引导系统Prompt。", user: SERVICE_GUIDANCE_PROMPT + sopBlock };
    case "service:report":
      return { system: "你是一个专业的AI Prompt工程师，擅长从服务项目SOP中提取流程并生成事后分析报告系统Prompt。", user: SERVICE_REPORT_PROMPT + sopBlock };
    default:
      return { system: "你是养老服务标准化专家。", user: `根据以下SOP内容生成配置要求：\n\nSOP名称：${sopName}\nSOP内容：\n${sopContent}` };
  }
}

/* ══════════════════════════════════════════════════════════════
   通用规范 × AI 实时督导（违禁行为检测 — 每句话分析）
   ══════════════════════════════════════════════════════════════ */

const GENERAL_SUPERVISION_PROMPT = `你是一个专业的AI Prompt工程师。你的任务是：阅读用户提供的"上门养老服务标准规范文档"，从中提取全程禁止行为，然后生成一份完整的、可直接使用的"实时违禁行为督导系统Prompt"。

生成的系统Prompt将被交给另一个AI使用——该AI会逐句接收上门养老服务过程中的实时录音转写文本，对每句话分析是否存在违禁行为，发现即通过TTS语音提醒。

---

## 第一步：从规范文档中提取违禁行为

提取所有在整个服务过程中明确禁止、不允许的行为或言语。
典型示例：推销商品、私下收费、索要好处、辱骂老人、拍摄传播隐私信息、使用不文明语言等。
提取为清晰的逐条禁止项，每条格式为"不得______"。

仅提取违禁行为。服务流程步骤、前置/结束流程等不属于此处，忽略不提取。

---

## 第二步：生成实时违禁行为督导系统Prompt

基于提取的违禁行为列表，生成的系统Prompt必须包含：

**角色定义**：你是上门养老服务的实时违禁行为督导AI。你逐句接收录音转写文本，职责是检测违禁行为。你不负责对话或回答问题，只负责监控和提醒。

**违禁行为列表**：列出所有提取的禁止项。

**监控逻辑**：
- 对每句话进行语义判断，识别是否构成违禁行为
- 结合上下文判断，避免误判。日常寒暄、正常服务推荐不算违规
- 只有在较高确信度下才判定为违规
- 同一类违禁行为只提醒一次，不重复

**输出格式**：
- 检测到违规时输出JSON：{"violation": true, "type": "违规类型", "reminder": "注意，请不要{违禁行为描述}。"}
- 未检测到违规时输出：{"violation": false}
- 提醒文本使用自然温和的中文口语，控制在30字以内

---

## 输出要求

直接输出完整的系统Prompt，不要输出分析过程。输出的内容必须是一份可以直接作为系统Prompt使用的完整文本。使用中文。`;

/* ══════════════════════════════════════════════════════════════
   通用规范 × AI 实时引导（前置/结束流程引导 — 定期分析）
   ══════════════════════════════════════════════════════════════ */

const GENERAL_GUIDANCE_PROMPT = `你是一个专业的AI Prompt工程师。你的任务是：阅读用户提供的"上门养老服务标准规范文档"，从中提取服务前置流程和结束流程，然后生成一份完整的、可直接使用的"实时服务引导系统Prompt"。

生成的系统Prompt将被交给另一个AI使用——该AI会定期接收完整的带时间戳录音转写文本，分析服务人员尚未完成哪些必要流程步骤，并在规定时间窗口内提醒一次。

---

## 第一步：从规范文档中提取两类流程

### 类别一：服务前置流程（Pre-Service Checklist）
提取所有关于"上门时""到达时""服务开始前"需要完成的标准动作。
每条格式为"服务人员应当______"。
对每条标注时间要求（如"服务开始5分钟内"）。

### 类别二：服务结束流程（Post-Service Checklist）
提取所有关于"服务结束时""告别前""离开前"需要完成的标准动作。
每条格式为"服务人员应当______"。

仅提取流程类要求。违禁行为由另一套系统负责，此处忽略。

---

## 第二步：生成实时服务引导系统Prompt

基于提取的流程列表，生成的系统Prompt必须包含：

**角色定义**：你是上门养老服务的实时引导AI。你定期接收完整的带时间戳录音转写文本，职责是分析服务人员尚未完成哪些必要流程，并给出简明的提醒。你不汇报已完成的步骤，只关注未完成的。你不负责对话，只负责引导提醒。

**前置流程检查项**：列出所有前置流程及其时间要求。

**前置流程监控逻辑**：
- 输入是完整的录音转写文本，每句带时间戳：[MM:SS] 文本内容
- 根据时间戳判断服务已进行了多长时间
- 逐项检查前置流程是否已完成（语义等价即可）
- 只关注未完成的步骤，不汇报已完成的
- 触发条件（满足任一）：
  - 超过规定时间（如5分钟）仍有未完成项
  - 从内容判断服务人员已跳过前置流程直接开始正式服务
- 每个检查项只提醒一次，提醒过后不再重复

**结束流程检查项**：列出所有结束流程。

**结束流程监控逻辑**：
- 检测到告别信号时（"今天就到这里""我先走了"等），检查结束流程是否完成
- 只提醒未完成的，每项只提醒一次

**输出格式**：
- 有未完成步骤需要提醒时输出JSON：{"remind": true, "missing": ["确认老人身份", "说明本次服务内容"], "reminder": "温馨提醒：您还没有确认老人身份和说明本次服务内容。"}
- 不需要提醒时输出：{"remind": false}
- reminder 文本必须包含具体的未完成事项描述（不是编号），使用自然温和的中文口语，控制在50字以内
- 不要输出已完成的步骤列表

---

## 输出要求

直接输出完整的系统Prompt，不要输出分析过程。输出的内容必须是一份可以直接作为系统Prompt使用的完整文本。使用中文。`;

/* ══════════════════════════════════════════════════════════════
   通用规范 × 服务后报告要求（不变）
   ══════════════════════════════════════════════════════════════ */

const GENERAL_REPORT_PROMPT = `你是一个专业的AI Prompt工程师。你的任务是：阅读用户提供的"上门养老服务标准规范文档"，从中提取关键规则，然后生成一份完整的、可直接使用的"事后服务报告生成系统Prompt"。

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

逐项检查以下前置流程检查项，判断服务人员是否在服务开始阶段完成了每一项。
判断依据：录音转写文本开头部分（通常是前10分钟内）是否包含明确表明该项已完成的内容。不要求用词完全匹配，语义上可判断为已完成即可。
列出从规范文档中提取的所有前置流程检查项。
对每一项，给出判断结果：已完成 / 未完成。如果未完成，简要说明缺失了什么。

**维度二：服务结束流程合规性**

逐项检查以下结束流程检查项，判断服务人员是否在服务结束阶段完成了每一项。
判断依据：录音转写文本末尾部分（通常是服务人员开始告别前后的内容）是否包含明确表明该项已完成的内容。
列出从规范文档中提取的所有结束流程检查项。
对每一项，给出判断结果：已完成 / 未完成。如果未完成，简要说明缺失了什么。

**维度三：违禁行为检测**

通读完整的录音转写文本，识别是否出现了以下任何违禁行为。
判断标准：基于录音中的实际言语内容进行语义判断。需要结合上下文，避免误判。只有在较高确信度下才判定为违规。
列出从规范文档中提取的所有违禁行为条目。
如果未发现任何违禁行为，明确说明"本次服务未检测到违禁行为"。
如果发现违禁行为，对每一项违规列出：
- 违规类型
- 出现的大致时间位置（根据录音转写文本的上下文推断，以"录音第约XX分钟"的形式标注。如果转写文本中包含时间戳信息则直接引用；如果没有时间戳，则根据文本在全文中的相对位置估算）
- 相关原文摘录（引用录音转写文本中的关键语句作为证据）

**Part 3: 最终输出格式**

LLM针对录音分析完毕后，输出一个JSON格式的报告。JSON格式的报告定义：将分析的三个维度的结果各自放在一条JSON定义的文本条目。因此，JSON会有三条文本。

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
- 使用中文。`;

/* ══════════════════════════════════════════════════════════════
   服务项目规范 × AI 实时督导（健康安全违规检测 — 每句话分析）
   ══════════════════════════════════════════════════════════════ */

const SERVICE_SUPERVISION_PROMPT = `你是一个专业的AI Prompt工程师。你的任务是：阅读用户提供的"上门养老服务项目SOP文档"，从中提取健康与安全关键禁忌事项，然后生成一份完整的、可直接使用的"实时健康安全督导系统Prompt"。

生成的系统Prompt将被交给另一个AI使用——该AI会逐句接收录音转写文本，检测是否存在违背健康安全要求的行为，发现即通过TTS语音提醒。

本Prompt只关注健康和安全风险（如食物过敏、温度危险、跌倒风险、用药错误等），不关注服务流程步骤是否执行（那由引导系统负责）。

---

## 第一步：提取健康与安全关键事项

从SOP中提取所有与被服务老人的健康和生命安全直接相关的禁忌和要求。
判断标准：如果该事项被违背，可能对老人健康或安全产生实际负面影响。

仅提取健康安全相关事项。排除：
- 纯流程性要求（如"记录进食量"）
- 服务质量偏好（如"按口味烹饪"）
- 卫生清洁要求（如"清洗餐具"）

对每个事项描述：什么情况构成违背，正确做法是什么。

---

## 第二步：生成实时健康安全督导系统Prompt

生成的系统Prompt必须包含：

**角色定义**：你是上门养老服务的实时健康安全督导AI。你逐句接收录音转写文本，职责是检测可能危害老人健康安全的行为。你不负责对话，只负责安全监控。

**健康安全事项列表**：列出所有提取的关键事项。

**监控逻辑**：
- 遵循保守原则：只有在明确的、可识别的违背迹象 + 涉及健康安全风险 + 较高确信度时才触发
- 过多提示会打断服务节奏，宁可少提示不要过度提示
- 同一事项只提醒一次

**输出格式**：
- 检测到安全风险时输出JSON：{"safety_alert": true, "type": "风险类型", "reminder": "请留意，{正确做法}。"}
- 未检测到时输出：{"safety_alert": false}
- 提醒控制在30字以内

---

## 输出要求

直接输出完整的系统Prompt，不要输出分析过程。使用中文。`;

/* ══════════════════════════════════════════════════════════════
   服务项目规范 × AI 实时引导（SOP步骤引导 — 定期分析）
   ══════════════════════════════════════════════════════════════ */

const SERVICE_GUIDANCE_PROMPT = `你是一个专业的AI Prompt工程师。你的任务是：阅读用户提供的"上门养老服务项目SOP文档"，从中提取服务流程步骤，然后生成一份完整的、可直接使用的"实时服务步骤引导系统Prompt"。

生成的系统Prompt将被交给另一个AI使用——该AI会定期接收完整的带时间戳录音转写文本，分析服务人员尚未完成SOP中的哪些步骤，并给出简明提醒。只关注未完成的步骤，不汇报已完成的。

本Prompt只关注"服务流程步骤是否按SOP执行"，不关注违禁行为或健康安全违规（那由督导系统负责）。

---

## 第一步：提取服务流程步骤

将SOP中描述的服务执行流程拆解为有序的步骤序列。

提取要求：
- 保持SOP中定义的步骤顺序
- 每个步骤聚焦一个可识别的服务动作
- 为每个步骤提取1-3个识别关键词（服务人员可能说出的自然口语）
- 如果SOP中有时间要求（如"到达后立即""用餐前"），标注时间约束

---

## 第二步：生成实时服务步骤引导系统Prompt

生成的系统Prompt必须包含：

**角色定义**：你是上门养老服务的实时引导AI，专门负责引导服务人员按SOP执行服务流程。你定期接收完整的带时间戳录音转写文本，职责是分析哪些SOP步骤尚未完成，并给出简明提醒。你不汇报已完成的步骤。

**SOP步骤列表**：列出所有步骤、识别关键词及时间约束（如有）。

**引导逻辑**：
- 输入是完整的录音转写文本，每句带时间戳：[MM:SS] 文本内容
- 根据时间戳判断服务已进行了多长时间
- 逐步判断每个SOP步骤是否已完成（语义等价即可）
- 只关注尚未完成的步骤，不汇报已完成的
- 步骤之间允许自然过渡，不要求严格顺序
- 如果某个步骤有时间约束且已超时未完成，优先提醒
- 每个步骤只提醒一次，提醒过后不再重复

**输出格式**：
- 有未完成步骤需要提醒时输出JSON：{"guide": true, "missing": ["确认饮食禁忌", "检查食材保质期"], "reminder": "温馨提醒：您还没有确认老人的饮食禁忌。"}
- 不需要提醒时输出：{"guide": false}
- reminder 文本必须包含具体的未完成步骤描述（不是编号），使用自然温和的中文口语，控制在30字以内
- 不要输出已完成的步骤列表

---

## 输出要求

直接输出完整的系统Prompt，不要输出分析过程。使用中文。`;

/* ══════════════════════════════════════════════════════════════
   服务项目规范 × 服务后报告要求（不变）
   ══════════════════════════════════════════════════════════════ */

const SERVICE_REPORT_PROMPT = `你是一个专业的AI Prompt工程师。你的任务是：阅读用户提供的"上门养老服务项目SOP文档"，从中提取该服务项目的核心流程和关键要求，然后生成一份完整的、可直接使用的"服务流程事后分析报告系统Prompt"。

生成的系统Prompt将被交给另一个AI使用——该AI会接收一次完整的上门养老服务录音转写文本，并根据指令进行分析，生成一份关于本次服务项目执行情况的分析报告。

本Prompt关注的是"具体服务项目的实际执行与SOP流程的匹配度"，而不是通用的上门礼仪、结束流程或违禁行为（那些由另一套Prompt负责）。

---

## 第一步：从SOP文档中提取服务流程

请仔细阅读SOP文档，提取以下信息：

### 服务流程步骤（Service Flow Steps）

将SOP中描述的服务执行流程拆解为有序的步骤序列。每个步骤用一句简明的话描述核心动作和要求。

提取要求：
- 保持SOP中定义的步骤顺序。
- 每个步骤聚焦一个可识别的服务动作或阶段。
- 如果SOP中某个条目包含多个独立动作，拆分为多个步骤。
- 对每个步骤，标注其中涉及的健康安全关键点（如果有）。健康安全关键点指：如果被违背，可能对老人健康或安全产生实际负面影响的事项。
- 为每个步骤提取可能在录音中出现的识别线索（关键词或典型对话片段）。

---

## 第二步：生成服务流程事后分析报告系统Prompt

基于第一步提取的流程信息，生成完整的系统Prompt。必须严格遵守以下结构和规则：

### 整体结构要求

必须包含以下部分，按顺序排列：

**Part 1: 角色与任务定义**

写明：
- 你是一个上门养老服务的流程分析AI，专门负责分析该服务项目的执行情况。
- 你会接收一次完整的上门养老服务录音转写文本。
- 你的职责是将录音中的实际服务过程与SOP定义的标准流程进行对比分析，并生成一份简练的分析报告。

**Part 2: SOP标准流程定义**

将第一步提取的完整流程步骤列出，作为分析的基准参照。

**Part 3: 分析指引**

要求系统Prompt中包含以下三个分析维度的详细指引：

**分析维度一：服务项目识别依据**

说明基于录音转写文本中的哪些内容，判断本次服务属于该服务项目。
要求：列出从录音文本中提取的关键词或关键语句（直接引用原文），简要说明这些关键词如何指向该服务项目。如果录音中涉及多个服务项目，说明本报告聚焦分析的是哪一个。

**分析维度二：流程匹配度评估**

将录音中的实际服务过程与SOP标准流程逐步对比，评估整体流程是否大致符合要求。
要求：对每个SOP步骤，判断在录音中是否有对应的执行迹象。判断采用"语义等价"原则。给出整体匹配度的定性判断：完全匹配 / 大致匹配 / 部分匹配 / 严重偏离。用一两句话概括整体情况，仅当某步骤存在明显问题时才单独说明。

**分析维度三：预警与特别提示**

重点识别以下三类需要特别关注的情况：

a) 明显不匹配：录音显示的实际操作与SOP要求存在明显矛盾或冲突。
b) 遗漏重要事项：SOP中定义的某个重要步骤在录音中完全没有出现迹象，尤其是涉及健康安全的关键步骤。
c) 明显冲突：录音中服务人员的言行与SOP要求直接相反或冲突。

对于每一项预警，需要：说明预警类型、引用录音中的相关原文片段作为依据、说明对应的SOP要求是什么。
如果没有需要预警的情况，明确说明"未发现明显问题"。

判断原则：保持客观谨慎。只标记有明确依据的问题。录音转写可能不完整，某个步骤在录音中未出现不一定意味着未执行。在判断不确定时，使用"可能""疑似"等措辞。

**Part 4: 报告输出格式**

输出一个JSON文件。JSON文件中包含基于以上规则而得到的总结性摘要，保持在200字以内。对于识别到服务人员完成的分项，可以做列举。如果识别出事项较多，文字可以较多。如果识别出事项较少，可以简单说明。如果有明确违背SOP要求的事项，或者高度存疑事项，可以列出。

**全局规则：**
1. 分析必须完全基于录音转写文本的实际内容。不要推测、脑补或假设录音中未出现的内容。
2. 文字风格要求：简练、浓缩、直击要点。每一句话都应当传递有效信息。避免套话、重复、冗余描述。整份报告控制在300字以内（不含引用原文部分）。
3. 在判断流程是否匹配时，采用"语义等价"原则——不要求服务人员使用特定措辞，只要语义上达成了该步骤要求的目的即可。
4. 预警部分是报告的核心价值。如果确实存在问题，必须明确指出，不要回避。但同时避免过度解读——没有充分依据的问题不应列入预警。
5. 如果录音转写文本质量较差（大量乱码、不可读），在报告开头注明"部分内容因转写质量问题无法分析"，并降低判断确信度。
6. 直接输出报告内容，不要输出分析过程或中间推理步骤。
7. 报告使用中文。

---

## 输出要求

- 直接输出完整的系统Prompt，不要输出分析过程、中间步骤或解释说明。
- 输出的内容必须是一份可以直接作为系统Prompt使用的完整文本，自包含、独立可用。
- 使用中文。`;

/* ══════════════════════════════════════════════════════════════
   Routes
   ══════════════════════════════════════════════════════════════ */

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
    const { sopContent, sopName, docType, sopType } = req.body;
    if (!sopContent || !docType) {
      res.status(400).json({ error: "sopContent and docType required" });
      return;
    }
    if (!LLM_API_KEY) {
      res.json({ content: "AI 服务未配置" });
      return;
    }

    const { system, user } = buildPrompt(sopType ?? "general", docType, sopName ?? "", sopContent);

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
            { role: "system", content: system },
            { role: "user", content: user },
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

  r.post("/ai/generate-schedule", async (req, res) => {
    const { prompt, today } = req.body;
    if (!prompt) { res.status(400).json({ error: "prompt required" }); return; }
    if (!LLM_API_KEY) { res.json({ error: "AI 服务未配置" }); return; }

    // Fetch published service SOPs for matching
    const sops = await prisma.sop.findMany({
      where: { type: "service", status: "active", published: true },
      select: { id: true, name: true, keywords: true },
    });
    const sopList = sops.map(s => `- ID: ${s.id}, 名称: ${s.name}, 关键词: ${JSON.stringify(s.keywords)}`).join("\n");

    // Fetch active workers for name matching
    const workers = await prisma.socialWorker.findMany({
      where: { status: "active" },
      select: { id: true, name: true, siteId: true },
    });
    const workerList = workers.map(w => `- ID: ${w.id}, 姓名: ${w.name}`).join("\n");

    const now = new Date();
    const currentDate = today || now.toISOString().slice(0, 10);
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const systemPrompt = `你是一个养老服务排期助手。用户用自然语言描述服务安排，你需要解析成结构化数据。

当前日期：${currentDate}，当前时间：${currentTime}

解析规则：
- "今天"就是当前日期本身
- "明天"是当前日期+1天
- "每周X"是周期性计划，isRecurring=true
- "每天"指每周7天（周一到周日），cadenceRule为WEEKLY:0,1,2,3,4,5,6，isRecurring=true
- 时间精确解析："下午2点到3点"→14:00-15:00，"下午4点"→16:00-17:00
- 如果只说"上午"默认9:00-11:00，只说"下午"默认14:00-16:00
- cadenceRule格式：WEEKLY:1,3,5（数字是星期几，0=周日,1=周一,...6=周六）
- 非周期性的一次性服务：isRecurring=false，cadenceRule为空字符串
- startDate规则：
  - 不能早于当前日期
  - 如果当前时间已经超过了服务的结束时间，startDate从明天开始
  - 例如：当前是17:19，服务时间是16:00-17:00，那么今天已过，startDate应为明天
- preview中的日期必须从startDate开始，且每个日期都在cadenceRule包含的星期中，不能包含过去的日期

服务项目匹配：根据用户描述的服务内容，从以下已有服务项目中匹配：
${sopList}

服务人员匹配：如果用户描述中提到了具体的服务人员姓名（如"让王丽去"、"安排张敏"等），从以下服务人员列表中匹配：
${workerList}
如果匹配到，在输出中加入 "matchedWorkerId" 和 "matchedWorkerName" 字段。如果没有提到具体人员，这两个字段为null。

输出严格JSON格式，不要输出其他文字：
{
  "plan": {
    "cadenceRule": "WEEKLY:1,3,5",
    "cadenceLabel": "每周一、三、五",
    "timeWindow": { "start": "HH:MM", "end": "HH:MM" },
    "startDate": "YYYY-MM-DD",
    "isRecurring": true,
    "serviceContent": "用户描述的服务内容摘要"
  },
  "matchedSopIds": ["sop-id-1", "sop-id-2"],
  "matchedWorkerId": "worker-id or null",
  "matchedWorkerName": "worker name or null",
  "preview": [
    { "date": "YYYY-MM-DD", "dayLabel": "周X", "timeLabel": "上午/下午 HH:MM-HH:MM" }
  ]
}

preview只输出前3条。matchedSopIds只包含上面列表中存在的ID。`;

    try {
      const resp = await fetch(LLM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LLM_API_KEY}` },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        }),
      });
      const data = await resp.json();
      let content = data.choices?.[0]?.message?.content ?? "";
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      const parsed = JSON.parse(content);

      // Resolve matched SOP names
      const matchedSops = sops
        .filter(s => (parsed.matchedSopIds ?? []).includes(s.id))
        .map(s => ({ id: s.id, name: s.name }));

      // Server-side safety: filter out past dates
      const plan = parsed.plan ?? {};
      const endTime = plan.timeWindow?.end ?? "23:59";
      const cutoff = currentDate + "T" + currentTime;
      let preview = (parsed.preview ?? []).filter((p: any) => {
        const pEnd = p.date + "T" + endTime;
        return pEnd >= cutoff;
      });
      if (plan.startDate && (plan.startDate + "T" + endTime) < cutoff) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        plan.startDate = tomorrow.toISOString().slice(0, 10);
      }

      res.json({
        plan,
        matchedSops,
        matchedWorker: parsed.matchedWorkerId ? { id: parsed.matchedWorkerId, name: parsed.matchedWorkerName } : null,
        preview,
      });
    } catch (err: any) {
      console.error("[ai] generate-schedule error:", err.message);
      res.json({ error: "AI 生成失败，请稍后重试。" });
    }
  });

  return r;
}

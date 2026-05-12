const initialRole = new URLSearchParams(window.location.search).get('role');

const state = {
  role: ['ops', 'worker', 'qa', 'audit'].includes(initialRole) ? initialRole : 'ops',
  discussion: false,
  flow: {
    triaged: false,
    scheduled: false,
    dispatched: false,
    serviceStarted: false,
    exceptionRaised: false,
    serviceSubmitted: false,
    qaPassed: false,
    credentialReady: false,
    exported: false
  }
};

const roles = {
  ops: {
    icon: '管',
    label: '站长 / 运营',
    agent: 'Lumii 管理 Agent',
    status: '运行中 · 已处理 18 个需求',
    subtitle: '需求分诊、排班派单、异常调度'
  },
  worker: {
    icon: '督',
    label: '社工',
    agent: 'Lumii 督导 Agent',
    status: '服务中 · 当前任务 1 个',
    subtitle: '服务前 hint、现场 SOP、异常提醒'
  },
  qa: {
    icon: '质',
    label: '服务主管 / 质检',
    agent: 'Lumii 督导 Agent',
    status: '审核中 · 3 条服务记录待确认',
    subtitle: 'SOP 漏项、服务日志、异常闭环'
  },
  audit: {
    icon: '凭',
    label: '审核 / 结算',
    agent: 'Lumii 凭证能力',
    status: '待确认 · 3 个凭证包缺证据',
    subtitle: '凭证审核、结算就绪、导出确认'
  }
};

const mock = {
  station: '滨江长者服务站',
  seniors: [
    ['周秀兰', '82 岁', '独居，昨晚头晕，需确认用药'],
    ['王建国', '79 岁', '助浴复访，家属关注皮肤情况'],
    ['陈梅芳', '86 岁', '上次拒绝开门，需要异常复访']
  ],
  workers: [
    ['李娜', '探访关爱 / 助浴', '可用 · 滨江南线 3.2km'],
    ['赵敏', '探访关爱', '路线冲突 · 跨区 9.8km'],
    ['何琴', '助浴', '上午请假 · 下午可替班']
  ],
  sop: ['到达并确认身份', '询问睡眠、用药、饮食', '检查居家环境风险', '完成陪伴沟通并记录情绪', '拍摄服务完成凭证']
};

const root = document.getElementById('app');
const confirmRoot = document.getElementById('confirm-root');

function setRole(role) {
  state.role = role;
  const url = new URL(window.location.href);
  url.searchParams.set('role', role);
  window.history.replaceState({}, '', url);
  render();
}

function toggleDiscussion() {
  state.discussion = !state.discussion;
  render();
}

function complete(key) {
  const copy = {
    triaged: ['确认需求入池', '需求将进入待排班池，并写入分诊留痕。'],
    scheduled: ['确认排班草案', '采用管理 Agent 推荐的社工、时间和路线。'],
    dispatched: ['确认派单', '任务会下发到社工 H5，并推送服务前 hint。'],
    serviceStarted: ['开始服务', '社工确认已到达现场，服务计时开始。'],
    exceptionRaised: ['升级现场异常', '异常将同步给站长和服务主管，形成闭环任务。'],
    serviceSubmitted: ['提交服务记录', '服务事实记录草稿将进入质检队列。'],
    qaPassed: ['确认质检通过', '服务记录、SOP 和异常闭环状态会进入凭证包。'],
    credentialReady: ['标记结算就绪', '凭证包进入导出前确认。'],
    exported: ['导出凭证包', '生成导出文件并写入审核/结算留痕。']
  };
  const [title, body] = copy[key];
  confirmRoot.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true">
        <h2>${title}</h2>
        <p>${body}</p>
        <div class="modal-actions">
          <button class="btn secondary" data-cancel>取消</button>
          <button class="btn" data-confirm>确认</button>
        </div>
      </div>
    </div>
  `;
  confirmRoot.querySelector('[data-cancel]').addEventListener('click', () => confirmRoot.innerHTML = '');
  confirmRoot.querySelector('[data-confirm]').addEventListener('click', () => {
    state.flow[key] = true;
    confirmRoot.innerHTML = '';
    render();
  });
}

function render() {
  const role = roles[state.role];
  root.innerHTML = `
    <div class="red-shell">
      ${rail()}
      <section class="agent-stage">
        <header class="agent-head">
          <div class="agent-title-block">
            <div class="agent-avatar">${role.icon}</div>
            <div>
              <h1>${role.agent}</h1>
              <p><span class="live-dot"></span>${role.status}</p>
            </div>
          </div>
          <div class="head-actions">
            <span>${role.label}</span>
            <button class="icon-btn" data-discussion title="切换 discussion mode">${state.discussion ? '隐' : '注'}</button>
          </div>
        </header>
        <div class="agent-content">
          <main class="conversation">
            ${conversation()}
            <div class="composer">
              <input value="${composerValue()}" aria-label="输入指令">
              <button class="send-btn">↑</button>
            </div>
          </main>
          <aside class="context-rail">
            ${contextRail()}
          </aside>
        </div>
      </section>
    </div>
  `;
  root.querySelectorAll('[data-role]').forEach(el => el.addEventListener('click', () => setRole(el.dataset.role)));
  root.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', () => complete(el.dataset.action)));
  root.querySelectorAll('[data-discussion]').forEach(el => el.addEventListener('click', toggleDiscussion));
}

function rail() {
  return `
    <nav class="role-rail" aria-label="角色登录">
      ${Object.entries(roles).map(([key, role]) => `
        <button class="rail-btn ${state.role === key ? 'active' : ''}" data-role="${key}" title="${role.label}">
          ${role.icon}
        </button>
      `).join('')}
    </nav>
  `;
}

function conversation() {
  if (state.role === 'ops') return opsConversation();
  if (state.role === 'worker') return workerConversation();
  if (state.role === 'qa') return qaConversation();
  return auditConversation();
}

function opsConversation() {
  return `
    ${bubble('agent', '早上好。今日需求池已经完成预分诊，我先把需要人工确认的部分放在这里。')}
    ${reportCard('分诊报告', [
      ['新增需求', '18 条'],
      ['可进入待排班池', state.flow.triaged ? '4 条已确认' : '4 条待确认'],
      ['需人工回访', '3 条'],
      ['高风险异常复访', '2 条']
    ], [
      ['确认 4 条入池', 'triaged', !state.flow.triaged],
      ['查看原因', null, true]
    ])}
    ${time('10:36')}
    ${bubble('agent wide', '我已生成第一版排班草案：李娜负责周秀兰 14:00 探访，何琴下午替班王建国助浴；赵敏跨区路线冲突，不建议安排。')}
    ${handoffCard('派单建议', '周秀兰 · 探访关爱 · 李娜 · 今天 14:00', '置信度 88%，理由：路线最短、技能匹配、老人风险需要熟悉社工。', [
      ['确认排班草案', 'scheduled', state.flow.triaged && !state.flow.scheduled],
      ['确认派单', 'dispatched', state.flow.scheduled && !state.flow.dispatched]
    ])}
    ${state.flow.exceptionRaised ? bubble('agent wide', '现场异常已从督导 Agent 回流：周秀兰家中厨房门口地面湿滑，社工已拍照留痕。我建议站长确认异常闭环后再进入凭证审核。') : ''}
  `;
}

function workerConversation() {
  return `
    ${bubble('agent', '李娜，周秀兰的探访任务已下发。出发前先看服务前 hint。')}
    ${hintCard()}
    ${time('13:52')}
    ${bubble('agent wide', '服务中我会跟踪 SOP 关键项。当前建议先确认老人昨晚头晕是否和用药相关。')}
    ${sopCard()}
    ${state.flow.exceptionRaised ? handoffCard('异常已升级', '地面湿滑，建议通知家属处理', '已同步给站长 / 服务主管，等待闭环确认。', [['提交服务记录', 'serviceSubmitted', state.flow.serviceStarted && !state.flow.serviceSubmitted]]) : ''}
  `;
}

function qaConversation() {
  return `
    ${bubble('agent', '周秀兰服务记录已提交。我把事实记录、SOP 漏项和异常闭环状态合并给你审核。')}
    ${handoffCard('服务记录摘要', '探访关爱 · 56 分钟 · 李娜', 'SOP 5 项完成 4 项，环境风险已升级，完成照片待补充。', [
      ['确认质检通过', 'qaPassed', state.flow.serviceSubmitted && !state.flow.qaPassed],
      ['退回补充', null, true]
    ])}
    ${time('15:18')}
    ${bubble('agent wide', '异常闭环说明已经补齐：站长确认已通知家属，社工照片和备注可进入凭证包。')}
    ${reportCard('异常闭环', [
      ['异常类型', '环境风险'],
      ['处理人', '社工李娜 / 站长王珂'],
      ['当前状态', state.flow.exceptionRaised ? '已升级' : '待上报'],
      ['质检结论', state.flow.qaPassed ? '通过' : '待确认']
    ], [])}
  `;
}

function auditConversation() {
  return `
    ${bubble('agent', '我已生成今日第一批凭证包草案。3 个包需要人工处理，其中 1 个可以标记结算就绪。')}
    ${reportCard('凭证审核报告', [
      ['凭证包', '12 个'],
      ['完整可通过', '8 个'],
      ['缺证据', '3 个'],
      ['异常未闭环', state.flow.qaPassed ? '0 个' : '1 个']
    ], [
      ['标记结算就绪', 'credentialReady', state.flow.qaPassed && !state.flow.credentialReady],
      ['导出凭证包', 'exported', state.flow.credentialReady && !state.flow.exported]
    ])}
    ${time('16:05')}
    ${handoffCard('关注：周秀兰凭证包', '缺服务完成照片，异常说明已补齐', '建议先退回社工补照片；如主管确认照片可后补，则可标记结算待补。', [
      ['退回补充', null, true],
      ['确认人工豁免', null, true]
    ])}
  `;
}

function bubble(kind, text) {
  return `<div class="agent-bubble ${kind}">${text}</div>`;
}

function time(value) {
  return `<div class="chat-time">${value}</div>`;
}

function reportCard(title, rows, actions) {
  return `
    <article class="agent-card">
      <h2>${title}</h2>
      <div class="report-lines">
        ${rows.map(row => `<div><span>${row[0]}</span><strong>${row[1]}</strong></div>`).join('')}
      </div>
      ${actions.length ? `<div class="card-actions">${actions.map(actionButton).join('')}</div>` : ''}
    </article>
  `;
}

function handoffCard(title, subject, detail, actions) {
  return `
    <article class="handoff-card">
      <div class="push-label">推送至当前角色</div>
      <h2>${title}</h2>
      <strong>${subject}</strong>
      <p>${detail}</p>
      <div class="card-actions">${actions.map(actionButton).join('')}</div>
    </article>
  `;
}

function hintCard() {
  const hints = ['老人近期头晕，先确认昨晚睡眠和用药', '家属要求服务后收到简短近况', '必须拍摄到达照片和服务完成照片', '异常时先通知站长再联系家属'];
  return `
    <article class="agent-card">
      <h2>服务前 hint</h2>
      <div class="hint-list">${hints.map(item => `<div>${item}</div>`).join('')}</div>
      <div class="card-actions">
        ${actionButton(['开始服务', 'serviceStarted', !state.flow.serviceStarted])}
      </div>
    </article>
  `;
}

function sopCard() {
  return `
    <article class="agent-card sop-card">
      <h2>现场 SOP</h2>
      ${mock.sop.map((item, index) => `
        <div class="sop-line ${state.flow.serviceStarted && index < 3 ? 'done' : ''}">
          <span>${state.flow.serviceStarted && index < 3 ? '✓' : index + 1}</span>
          <p>${item}</p>
        </div>
      `).join('')}
      <div class="card-actions">
        ${actionButton(['上报异常', 'exceptionRaised', state.flow.serviceStarted && !state.flow.exceptionRaised])}
        ${actionButton(['提交服务记录', 'serviceSubmitted', state.flow.exceptionRaised && !state.flow.serviceSubmitted])}
      </div>
    </article>
  `;
}

function actionButton([label, key, enabled]) {
  if (!key) return `<button class="card-btn ghost">${label}</button>`;
  return `<button class="card-btn" data-action="${key}" ${enabled ? '' : 'disabled'}>${label}</button>`;
}

function contextRail() {
  if (state.role === 'worker') return workerContext();
  if (state.role === 'qa') return qaContext();
  if (state.role === 'audit') return auditContext();
  return opsContext();
}

function opsContext() {
  return `
    <div class="right-head"><strong>今日概览</strong><span>2026-05-12</span></div>
    <div class="stat-grid">
      ${stat('18', '待分诊')}
      ${stat('7', '待派单')}
      ${stat('4', '异常关注', 'danger')}
      ${stat('3', '凭证缺口')}
    </div>
    ${contextBlock('重点老人', mock.seniors.map(item => `${item[0]} · ${item[1]}<br><span>${item[2]}</span>`))}
    ${contextBlock('推荐社工', mock.workers.map(item => `${item[0]}<br><span>${item[1]} · ${item[2]}</span>`))}
    ${activity(['10:36 完成需求预分诊', '10:38 生成排班草案', '10:42 等待站长确认派单'])}
    ${discussion()}
  `;
}

function workerContext() {
  return `
    <div class="right-head"><strong>当前任务</strong><span>社工 H5</span></div>
    ${contextCard('周秀兰 · 探访关爱', ['今天 14:00-15:00', '春江花月 3 幢 402', '风险：头晕 / 地面湿滑'])}
    ${contextBlock('凭证要求', ['到达照片', '服务完成照片', '服务备注', '异常处理照片'])}
    ${activity(['13:52 已推送服务前 hint', '14:02 社工确认到达', state.flow.exceptionRaised ? '14:31 异常已升级' : '14:31 等待 SOP 进度'])}
    ${discussion()}
  `;
}

function qaContext() {
  return `
    <div class="right-head"><strong>质检上下文</strong><span>服务主管</span></div>
    ${contextCard('周秀兰服务记录', ['SOP 5 项 / 完成 4 项', '异常：环境风险', '服务时长：56 分钟'])}
    ${contextBlock('待确认', ['异常闭环说明', '完成照片补充策略', '是否允许进入凭证包'])}
    ${activity(['15:12 社工提交记录', '15:16 督导 Agent 标注漏项', '15:18 等待质检确认'])}
    ${discussion()}
  `;
}

function auditContext() {
  return `
    <div class="right-head"><strong>凭证概览</strong><span>导出前审核</span></div>
    <div class="stat-grid">
      ${stat('12', '凭证包')}
      ${stat('8', '完整')}
      ${stat('3', '缺证据', 'danger')}
      ${stat(state.flow.exported ? '1' : '0', '已导出')}
    </div>
    ${contextBlock('缺口', ['周秀兰：服务完成照片', '王建国：服务时长不足', '陈梅芳：异常复访签名'])}
    ${activity(['16:01 生成凭证包草案', '16:03 识别 3 个缺证据项', '16:05 等待人工确认导出'])}
    ${discussion()}
  `;
}

function stat(value, label, tone = '') {
  return `<div class="rail-stat ${tone}"><strong>${value}</strong><span>${label}</span></div>`;
}

function contextCard(title, rows) {
  return `<div class="context-card"><strong>${title}</strong>${rows.map(row => `<p>${row}</p>`).join('')}</div>`;
}

function contextBlock(title, rows) {
  return `<div class="context-block"><h2>${title}</h2>${rows.map(row => `<div class="context-row">${row}</div>`).join('')}</div>`;
}

function activity(rows) {
  return `<div class="context-block"><h2>活动日志</h2>${rows.map(row => `<div class="activity-row">${row}</div>`).join('')}</div>`;
}

function discussion() {
  if (!state.discussion) return '';
  const role = roles[state.role];
  const matrix = state.role === 'ops' ? '#2' : state.role === 'worker' ? '#8' : state.role === 'qa' ? '#10' : '#11';
  const flows = state.role === 'ops' ? 'F01-F04, F07' : state.role === 'worker' ? 'F05-F08' : state.role === 'qa' ? 'F06-F08' : 'F09-F10';
  return `
    <div class="discussion red-discussion">
      <h3>Discussion mode</h3>
      <dl>
        <dt>角色</dt><dd>${role.label}</dd>
        <dt>Agent</dt><dd>${role.agent}</dd>
        <dt>Matrix</dt><dd>${matrix}</dd>
        <dt>Flow</dt><dd>${flows}</dd>
        <dt>边界</dt><dd>Production mode 不展示这些标注，高后果动作必须人工确认。</dd>
      </dl>
    </div>
  `;
}

function composerValue() {
  if (state.role === 'worker') return '我现在到老人家了，下一步先确认什么？';
  if (state.role === 'qa') return '解释为什么这个异常可以闭环';
  if (state.role === 'audit') return '只导出已通过且无缺口的凭证包';
  return '把今天高风险需求优先排给熟悉社工';
}

render();

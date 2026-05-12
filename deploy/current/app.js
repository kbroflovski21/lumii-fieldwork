const state = {
  role: null,
  view: 'login',
  agent: 'management',
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

const data = {
  station: '滨江长者服务站',
  roles: [
    {
      id: 'ops',
      icon: '站',
      title: '站长 / 运营',
      entry: '多 Agent 前置页',
      desc: '处理需求分诊、排班派单、异常调度和凭证审核入口。',
      tags: ['管理 Agent', '督导 Agent', '凭证能力']
    },
    {
      id: 'worker',
      icon: '工',
      title: '社工',
      entry: '督导 Agent H5',
      desc: '查看今日任务、服务前 hint、现场 SOP、异常上报和记录提交。',
      tags: ['督导 Agent', '单 Agent']
    },
    {
      id: 'qa',
      icon: '质',
      title: '服务主管 / 质检',
      entry: '多 Agent 前置页',
      desc: '查看服务日志、SOP 漏项、异常闭环和凭证审核状态。',
      tags: ['督导 Agent', '凭证能力']
    },
    {
      id: 'audit',
      icon: '审',
      title: '审核 / 结算',
      entry: '凭证审核工作台',
      desc: '处理缺证据、审核通过、结算就绪和凭证包导出确认。',
      tags: ['管理 Agent', '强边界能力']
    }
  ],
  seniors: [
    { name: '周秀兰', age: 82, risk: '独居，近期头晕，需确认用药' },
    { name: '王建国', age: 79, risk: '助浴后复访，家属关注皮肤情况' },
    { name: '陈梅芳', age: 86, risk: '上次拒绝开门，需站长关注' }
  ],
  workers: [
    { name: '李娜', skill: '探访关爱 / 助浴', status: '可用', route: '滨江南线 3.2km' },
    { name: '赵敏', skill: '探访关爱', status: '路线冲突', route: '跨区 9.8km' },
    { name: '何琴', skill: '助浴', status: '上午请假', route: '下午可替班' }
  ],
  requests: [
    { source: '电话需求', senior: '周秀兰', service: '探访关爱', priority: '高', reason: '家属反馈老人昨晚头晕' },
    { source: '周期到期', senior: '王建国', service: '助浴', priority: '中', reason: '固定频次到期' },
    { source: '异常复访', senior: '陈梅芳', service: '探访关爱', priority: '高', reason: '上次拒绝开门后复访' },
    { source: '社区转介', senior: '沈国平', service: '探访关爱', priority: '中', reason: '社区登记长期未服务' },
    { source: '小程序申请', senior: '朱阿姨', service: '陪诊评估', priority: '低', reason: '家属补充下周需求' }
  ],
  visit: {
    senior: '周秀兰',
    worker: '李娜',
    service: '探访关爱',
    time: '今天 14:00-15:00',
    address: '滨江区春江花月 3 幢 402',
    hints: ['老人近期头晕，先确认昨晚睡眠和用药', '家属要求服务后收到简短近况', '必须拍摄到达照片和服务完成照片', '异常时先通知站长再联系家属'],
    sop: ['到达并确认身份', '询问睡眠、用药、饮食', '检查居家环境风险', '完成陪伴沟通并记录情绪', '拍摄服务完成凭证']
  }
};

const root = document.getElementById('app');
const confirmRoot = document.getElementById('confirm-root');

function setRole(role) {
  state.role = role;
  if (role === 'worker') {
    state.view = 'worker';
    state.agent = 'supervisor';
  } else if (role === 'audit') {
    state.view = 'audit';
    state.agent = 'credential';
  } else {
    state.view = 'front';
    state.agent = role === 'qa' ? 'supervisor' : 'management';
  }
  render();
}

function setView(view, agent) {
  state.view = view;
  if (agent) state.agent = agent;
  render();
}

function toggleDiscussion() {
  state.discussion = !state.discussion;
  render();
}

function complete(key) {
  const labels = {
    triaged: ['确认需求入池', '需求将进入待排班池，并写入分诊留痕。'],
    scheduled: ['确认排班草案', '将采用管理 Agent 推荐的路线和社工组合。'],
    dispatched: ['确认派单', '任务会下发到社工 H5，社工收到服务前 hint。'],
    serviceStarted: ['开始服务', '社工确认已到达现场，服务计时开始。'],
    exceptionRaised: ['升级现场异常', '异常将同步给站长和服务主管，形成闭环任务。'],
    serviceSubmitted: ['提交服务记录', '服务事实记录草稿将进入质检队列。'],
    qaPassed: ['审核通过服务记录', 'SOP 和异常闭环状态将写入凭证包。'],
    credentialReady: ['标记结算就绪', '凭证包将进入导出前确认。'],
    exported: ['导出凭证包', '系统会生成导出文件并记录操作留痕。']
  };
  const [title, body] = labels[key];
  showConfirm(title, body, () => {
    state.flow[key] = true;
    if (key === 'dispatched') state.view = state.role === 'worker' ? 'worker' : state.view;
    render();
  });
}

function showConfirm(title, body, onConfirm) {
  confirmRoot.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">${title}</h2>
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
    confirmRoot.innerHTML = '';
    onConfirm();
  });
}

function topbar() {
  const role = data.roles.find(item => item.id === state.role);
  return `
    <header class="topbar">
      <div class="brand">
        <div class="mark">L</div>
        <div class="brand-text">
          <div class="brand-title">Lumii Fieldwork</div>
          <div class="brand-subtitle">${role ? `${role.title} · ${role.entry}` : '完整业务流 mockup'}</div>
        </div>
      </div>
      <div class="top-actions">
        ${state.role ? '<button class="btn secondary small" data-route="login">切换角色</button>' : ''}
        ${state.role ? `<button class="btn secondary small" data-discussion>${state.discussion ? '隐藏评审层' : '显示评审层'}</button>` : ''}
      </div>
    </header>
  `;
}

function render() {
  root.innerHTML = `<div class="app">${topbar()}${renderView()}</div>`;
  root.querySelectorAll('[data-role]').forEach(el => el.addEventListener('click', () => setRole(el.dataset.role)));
  root.querySelectorAll('[data-route]').forEach(el => el.addEventListener('click', () => {
    if (el.dataset.route === 'login') {
      state.role = null;
      state.view = 'login';
      render();
      return;
    }
    setView(el.dataset.route, el.dataset.agent);
  }));
  root.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', () => complete(el.dataset.action)));
  const discussion = root.querySelector('[data-discussion]');
  if (discussion) discussion.addEventListener('click', toggleDiscussion);
}

function renderView() {
  if (!state.role) return renderLogin();
  if (state.view === 'front') return renderFront();
  if (state.view === 'management') return renderManagement();
  if (state.view === 'worker') return renderWorker();
  if (state.view === 'audit') return renderAudit();
  return renderFront();
}

function renderLogin() {
  return `
    <main class="login-shell">
      <section class="login-header">
        <div>
          <div class="eyebrow">Staging mock · fake production data</div>
          <h1>社区养老服务 Agentic 工作流</h1>
          <p class="lede">从需求进入、排班派单、社工上门、异常闭环到凭证审核导出。选择一个角色进入对应的真实工作态。</p>
        </div>
        <aside class="status-panel">
          <h2>今日站点状态</h2>
          <div class="metric-grid">
            <div class="metric"><strong>18</strong><span>待分诊需求</span></div>
            <div class="metric"><strong>7</strong><span>待确认派单</span></div>
            <div class="metric"><strong>3</strong><span>凭证缺口</span></div>
          </div>
        </aside>
      </section>
      <section class="role-grid">
        ${data.roles.map(role => `
          <button class="role-card" data-role="${role.id}">
            <div class="role-icon">${role.icon}</div>
            <div>
              <h2>${role.title}</h2>
              <p>${role.desc}</p>
            </div>
            <div class="tag-row">
              ${role.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          </button>
        `).join('')}
      </section>
    </main>
  `;
}

function renderFront() {
  const activeRole = data.roles.find(item => item.id === state.role);
  const messages = state.role === 'qa'
    ? [
        ['督导 Agent', '周秀兰服务记录已提交，SOP 第 4 步有补记说明待确认', 'worker'],
        ['凭证能力', '今日 3 个凭证包缺少到达照片或异常闭环说明', 'audit'],
        ['管理 Agent', '陈梅芳异常复访已派单，等待站长确认升级策略', 'management']
      ]
    : [
        ['管理 Agent', '18 个需求已完成预分诊，其中 4 个建议今日排班', 'management'],
        ['督导 Agent', '周秀兰任务存在头晕风险，已推送服务前 hint 给李娜', 'worker'],
        ['凭证能力', '王建国助浴凭证包缺服务完成照片，建议退回补充', 'audit']
      ];
  return `
    <main class="shell">
      <div class="workbench two">
        <aside class="panel">
          <div class="section-title">
            <h2>Agent contacts</h2>
            <span class="pill">${activeRole.title}</span>
          </div>
          <div class="agent-list">
            ${agentItem('management', '管理 Agent', '需求分诊、排班派单、异常调度', 'management', '4 待确认')}
            ${agentItem('supervisor', '督导 Agent', '现场 SOP、漏项提醒、异常闭环', 'worker', '2 服务中')}
            ${agentItem('credential', '凭证能力', '凭证包、审核、导出与结算交接', 'audit', '3 缺证据')}
          </div>
        </aside>
        <section>
          <div class="workspace-card">
            <div class="workspace-head">
              <div>
                <h2>重要消息</h2>
                <p>每条消息都来自具体 Agent，点击后进入对应工作界面。</p>
              </div>
              <button class="btn" data-route="${state.role === 'qa' ? 'worker' : 'management'}">进入当前最高优先级</button>
            </div>
            <div class="workspace-body">
              <div class="stack">
                ${messages.map(item => `
                  <button class="message" data-route="${item[2]}">
                    <div class="item-top">
                      <span class="item-title">${item[0]}</span>
                      <span class="pill warn">需要处理</span>
                    </div>
                    <p class="item-desc">${item[1]}</p>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
          ${discussion('多 Agent 前置页', '#2, #10, #11', 'F01-F10', activeRole.title, '管理 Agent / 督导 Agent / 凭证能力', '前置页只显示联系人、重要消息和待确认，不承载具体业务操作。')}
        </section>
      </div>
    </main>
  `;
}

function agentItem(id, name, desc, route, status) {
  return `
    <button class="agent-item ${state.agent === id ? 'active' : ''}" data-route="${route}" data-agent="${id}">
      <div class="agent-top">
        <span class="agent-name">${name}</span>
        <span class="pill">${status}</span>
      </div>
      <p class="agent-desc">${desc}</p>
    </button>
  `;
}

function renderManagement() {
  const flow = state.flow;
  return `
    <main class="shell">
      <div class="workbench">
        <aside class="panel">
          <h2>待处理需求</h2>
          <div class="stack">
            ${data.requests.map(req => `
              <div class="list-item">
                <div class="item-top">
                  <span class="item-title">${req.senior}</span>
                  <span class="pill ${req.priority === '高' ? 'danger' : 'warn'}">${req.priority}</span>
                </div>
                <p class="item-desc">${req.source} · ${req.service}<br>${req.reason}</p>
              </div>
            `).join('')}
          </div>
        </aside>
        <section class="workspace-card">
          <div class="workspace-head">
            <div>
              <h2>管理 Agent 工作台</h2>
              <p>Agent 已生成分诊建议和排班草案，等待站长确认高后果动作。</p>
            </div>
            <span class="pill good">滨江长者服务站</span>
          </div>
          <div class="workspace-body">
            <div class="split">
              <div>
                <div class="chat">
                  <div class="bubble agent">我已汇总 18 个待处理需求。建议今天优先处理周秀兰、陈梅芳、王建国三单，其中周秀兰需要先确认头晕风险。</div>
                  <div class="bubble agent">排班草案推荐李娜负责周秀兰 14:00 探访，路线冲突最少；赵敏跨区不建议安排。</div>
                  ${flow.exceptionRaised ? '<div class="bubble agent">现场异常已升级给服务主管：周秀兰家中地面湿滑，社工已完成初步处理。</div>' : ''}
                  <div class="input-row"><input value="解释为什么不安排赵敏" aria-label="agent input"><button class="btn small">发送</button></div>
                </div>
              </div>
              <div class="timeline">
                ${step(1, '需求进入待排班池', '确认 4 条今日可服务需求', flow.triaged, !flow.triaged)}
                ${step(2, '排班草案确认', '李娜负责周秀兰，何琴下午替班王建国', flow.scheduled, flow.triaged && !flow.scheduled)}
                ${step(3, '派单到社工 H5', '下发任务并推送服务前 hint', flow.dispatched, flow.scheduled && !flow.dispatched)}
                ${step(4, '异常调度', '现场风险升级给站长和服务主管', flow.exceptionRaised, flow.dispatched && !flow.exceptionRaised)}
              </div>
            </div>
            <div class="tag-row">
              <button class="btn" data-action="triaged" ${flow.triaged ? 'disabled' : ''}>确认入池</button>
              <button class="btn" data-action="scheduled" ${!flow.triaged || flow.scheduled ? 'disabled' : ''}>确认排班草案</button>
              <button class="btn" data-action="dispatched" ${!flow.scheduled || flow.dispatched ? 'disabled' : ''}>确认派单</button>
              <button class="btn secondary" data-route="worker">查看社工 H5</button>
            </div>
          </div>
        </section>
        <aside class="panel">
          <h2>排班上下文</h2>
          <div class="stack">
            ${data.workers.map(worker => `
              <div class="list-item">
                <div class="item-top">
                  <span class="item-title">${worker.name}</span>
                  <span class="pill ${worker.status === '可用' ? 'good' : 'warn'}">${worker.status}</span>
                </div>
                <p class="item-desc">${worker.skill}<br>${worker.route}</p>
              </div>
            `).join('')}
          </div>
        </aside>
      </div>
      ${discussion('管理 Agent 工作台', '#2', 'F01-F04, F07, F10, F12', '站长 / 运营', '管理 Agent', '派单、改派、取消和异常升级必须人工确认。')}
    </main>
  `;
}

function renderWorker() {
  const flow = state.flow;
  return `
    <main class="shell">
      <div class="workbench two">
        <section class="mobile-wrap">
          <div class="mobile-screen">
            <div class="mobile-top">
              <span class="pill">督导 Agent</span>
              <h2>${data.visit.senior} · ${data.visit.service}</h2>
              <p>${data.visit.time}<br>${data.visit.address}</p>
            </div>
            <div class="mobile-body">
              <div class="card panel">
                <h3>服务前 hint</h3>
                <div class="stack">
                  ${data.visit.hints.map(hint => `<div class="list-item">${hint}</div>`).join('')}
                </div>
              </div>
              <div class="card panel">
                <h3>现场 SOP</h3>
                <div class="sop-list">
                  ${data.visit.sop.map((item, index) => `
                    <div class="sop-step ${flow.serviceStarted && index < 3 ? 'done' : ''}">
                      <div class="check">${flow.serviceStarted && index < 3 ? '✓' : index + 1}</div>
                      <div>${item}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="tag-row">
                <button class="btn" data-action="serviceStarted" ${flow.serviceStarted ? 'disabled' : ''}>开始服务</button>
                <button class="btn danger" data-action="exceptionRaised" ${!flow.serviceStarted || flow.exceptionRaised ? 'disabled' : ''}>上报异常</button>
                <button class="btn" data-action="serviceSubmitted" ${!flow.serviceStarted || flow.serviceSubmitted ? 'disabled' : ''}>提交记录</button>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div class="workspace-card">
            <div class="workspace-head">
              <div>
                <h2>社工现场工作态</h2>
                <p>社工只看到当前任务和必要上下文，异常会回流到站长和服务主管。</p>
              </div>
              <button class="btn secondary" data-route="audit">查看质检</button>
            </div>
            <div class="workspace-body">
              <div class="timeline">
                ${step(1, '收到任务', '李娜收到周秀兰探访关爱任务', flow.dispatched, !flow.dispatched)}
                ${step(2, '服务中 SOP', '已完成身份确认、睡眠用药、环境风险检查', flow.serviceStarted, flow.dispatched && !flow.serviceStarted)}
                ${step(3, '异常升级', '地面湿滑，已建议联系家属并记录照片', flow.exceptionRaised, flow.serviceStarted && !flow.exceptionRaised)}
                ${step(4, '服务记录草稿', '事实记录和主观总结分离，等待质检', flow.serviceSubmitted, flow.exceptionRaised && !flow.serviceSubmitted)}
              </div>
            </div>
          </div>
          ${discussion('社工 H5', '#8', 'F05-F08', '社工', '督导 Agent', '社工不能看到中台报表、内部审核备注或绩效排名。')}
        </section>
      </div>
    </main>
  `;
}

function renderAudit() {
  const flow = state.flow;
  return `
    <main class="shell">
      <div class="workbench">
        <aside class="panel">
          <h2>凭证包队列</h2>
          <div class="stack">
            <div class="list-item">
              <div class="item-top"><span class="item-title">周秀兰 · 探访关爱</span><span class="pill warn">待审核</span></div>
              <p class="item-desc">缺服务完成照片，异常闭环说明已补齐。</p>
            </div>
            <div class="list-item">
              <div class="item-top"><span class="item-title">王建国 · 助浴</span><span class="pill danger">缺证据</span></div>
              <p class="item-desc">缺完成照片，服务时长低于规则要求。</p>
            </div>
            <div class="list-item">
              <div class="item-top"><span class="item-title">陈梅芳 · 复访</span><span class="pill good">完整</span></div>
              <p class="item-desc">异常复访记录完整，可标记结算就绪。</p>
            </div>
          </div>
        </aside>
        <section class="workspace-card">
          <div class="workspace-head">
            <div>
              <h2>质检 / 凭证审核工作台</h2>
              <p>凭证能力已生成凭证包草案，审核人员确认后才能结算就绪或导出。</p>
            </div>
            <span class="pill ${flow.credentialReady ? 'good' : 'warn'}">${flow.credentialReady ? '结算就绪' : '待人工审核'}</span>
          </div>
          <div class="workspace-body">
            <div class="split">
              <div class="panel">
                <h3>服务记录摘要</h3>
                <div class="stack">
                  <div class="list-item">到达 14:02，离开 14:58，总时长 56 分钟。</div>
                  <div class="list-item">已询问睡眠、用药、饮食；老人反馈昨晚头晕但今日缓解。</div>
                  <div class="list-item">异常：厨房门口地面湿滑，社工已提醒家属并拍照留痕。</div>
                </div>
              </div>
              <div class="panel">
                <h3>规则校验</h3>
                <div class="timeline">
                  ${step(1, 'SOP 完成', '5 项中 4 项完成，1 项补记', flow.serviceSubmitted, !flow.serviceSubmitted)}
                  ${step(2, '异常闭环', '已升级站长并完成处理说明', flow.exceptionRaised, flow.serviceSubmitted && !flow.exceptionRaised)}
                  ${step(3, '质检审核', '服务主管确认记录可进入凭证包', flow.qaPassed, flow.serviceSubmitted && !flow.qaPassed)}
                  ${step(4, '凭证导出', '人工确认后生成导出文件', flow.exported, flow.credentialReady && !flow.exported)}
                </div>
              </div>
            </div>
            <div class="tag-row">
              <button class="btn" data-action="qaPassed" ${!flow.serviceSubmitted || flow.qaPassed ? 'disabled' : ''}>审核通过</button>
              <button class="btn secondary" ${flow.qaPassed ? 'disabled' : ''}>退回补充</button>
              <button class="btn" data-action="credentialReady" ${!flow.qaPassed || flow.credentialReady ? 'disabled' : ''}>标记结算就绪</button>
              <button class="btn" data-action="exported" ${!flow.credentialReady || flow.exported ? 'disabled' : ''}>导出凭证包</button>
            </div>
          </div>
        </section>
        <aside class="panel">
          <h2>凭证材料</h2>
          <div class="stack">
            <div class="list-item"><div class="item-title">到达照片</div><p class="item-desc">已采集 · 14:02</p></div>
            <div class="list-item"><div class="item-title">服务完成照片</div><p class="item-desc">待补充 · 社工已收到提醒</p></div>
            <div class="list-item"><div class="item-title">异常说明</div><p class="item-desc">已闭环 · 站长确认</p></div>
            <div class="list-item"><div class="item-title">审核留痕</div><p class="item-desc">人工确认后写入导出记录</p></div>
          </div>
        </aside>
      </div>
      ${discussion('质检 / 凭证审核工作台', '#10, #11', 'F06-F10', state.role === 'audit' ? '审核 / 结算人员' : '服务主管 / 质检', '督导 Agent / 管理 Agent / 凭证能力', '不自动对外提交；导出和结算就绪必须人工确认。')}
    </main>
  `;
}

function step(index, title, desc, done, current) {
  return `
    <div class="step ${done ? 'done' : ''} ${current ? 'current' : ''}">
      <div class="step-index">${done ? '✓' : index}</div>
      <div class="step-body">
        <strong>${title}</strong>
        <span>${desc}</span>
      </div>
    </div>
  `;
}

function discussion(surface, matrix, flows, role, agent, boundary) {
  return `
    <section class="discussion ${state.discussion ? 'show' : ''}">
      <h3>Discussion mode · ${surface}</h3>
      <dl>
        <dt>PRD matrix</dt><dd>${matrix}</dd>
        <dt>Agentic flow</dt><dd>${flows}</dd>
        <dt>当前角色</dt><dd>${role}</dd>
        <dt>Interacting agent</dt><dd>${agent}</dd>
        <dt>权限边界</dt><dd>${boundary}</dd>
        <dt>来源文档</dt><dd>business-use-cases.md, agentic-flows.md, prd-coverage-matrix.md</dd>
      </dl>
    </section>
  `;
}

render();

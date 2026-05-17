import type { RoleConfig, Message } from '../types';

let _msgId = 100;
const msg = (role: 'user' | 'agent', content: string, time: string): Message => ({
  id: String(++_msgId), role, content, timestamp: time,
});

export const roles: RoleConfig[] = [
  {
    id: 'group_admin',
    name: '集团管理',
    subtitle: '跨站点经营与质量总览',
    icon: '🏢',
    color: 'brand',
    tabs: [
      { key: 'overview', label: '运营总览' },
      { key: 'quality', label: '质量管理' },
      { key: 'service_reports', label: '服务报告' },
    ],
    defaultMessages: [
      msg('agent', '您好，欢迎进入金色年华养老智慧服务平台。我是您的智能助手，可以帮您查看跨站点运营数据、服务质量分析和管理报告。请问有什么可以帮您？', '08:30'),
      msg('user', '最近服务质量怎么样？', '08:31'),
      msg('agent', '本周整体服务质量表现良好：\n\n- **服务完成率** 93%，与上周持平\n- **异常率** 6.4%，较上周下降 1.2 个百分点\n- **SOP 执行完整率** 89%，提升了 3 个百分点\n- **家属满意度** 4.6/5\n\n需要关注的问题：文新站异常率偏高（9.1%），建议重点排查。翠苑站有 1 例低置信度服务归属待确认。\n\n您可以在「运营总览」和「质量与规程」Tab 中查看详细数据。', '08:31'),
    ],
    suggestedQuestions: ['哪些站点异常最多？', '社工人员有没有按规程做？', '本月家属投诉情况如何？', '生成本周管理报告'],
  },
  {
    id: 'site_ops',
    name: '站点运营',
    subtitle: '翠苑站日常运营管理',
    icon: '📋',
    color: 'brand',
    tabs: [
      { key: 'badges', label: '工牌设备' },
      { key: 'pending_service', label: '待服务' },
      { key: 'completed_service', label: '已服务' },
      { key: 'needs_confirm', label: '需确认' },
      { key: 'family_feedback', label: '家属反馈' },
    ],
    defaultMessages: [
      msg('agent', '早上好！我是翠苑站智能助手。今日站点概况：\n\n- **待执行任务** 7 个\n- **进行中** 1 个（李晓红正在服务王秀英）\n- **待确认事项** 4 项\n- **可用社工** 王建国、陈秀芳\n\n有什么需要处理的？', '08:30'),
      msg('user', '今天有哪些服务安排？', '08:32'),
      msg('agent', '今日共 7 个服务任务：\n\n🟢 **09:00** 王建国 → 张大伟（探访关爱）翠苑一区\n🔵 **09:30** 李晓红 → 王秀英（用药提醒）翠苑二区 *进行中*\n⏳ **10:30** 李晓红 → 赵淑芬（助浴）翠苑一区\n⏳ **11:30** 王建国 → 王秀英（助餐）翠苑二区\n⏳ **14:00** 陈秀芳 → 刘国强（探访关爱）翠苑三区\n⏳ **15:30** 陈秀芳 → 孙志明（探访关爱）翠苑二区\n⏳ **16:00** 王建国 → 赵淑芬（探访关爱）翠苑一区\n\n详情请查看「服务任务」Tab。', '08:32'),
    ],
    suggestedQuestions: ['哪些工牌还没归属？', '哪些服务记录需要确认？', '帮我排一个新任务', '本月可导出结算的记录有哪些？'],
  },
  {
    id: 'supervisor',
    name: '服务主管',
    subtitle: 'SOP 管理与服务质量指导',
    icon: '📐',
    color: 'brand',
    tabs: [
      { key: 'sop_manage', label: '服务 SOP 管理' },
      { key: 'supervision_strategy', label: 'SOP 督导策略' },
    ],
    defaultMessages: [
      msg('agent', '您好，我是规范管理助手。当前系统中有 3 个服务规范：\n\n**通用规范**\n- 国家长期护理保险（v3）\n\n**服务项目规范**\n- 清洁照护-口腔清洁（v2）\n- 基础健康观察-生命体征测量（v1）\n\n您可以通过对话新增、编辑或删除规范，也可以上传 SOP 文档让我解析。右侧 Tab 可浏览所有规范详情。', '08:30'),
    ],
    suggestedQuestions: ['新增一个康复指导 SOP', '修改探访关爱 SOP', '查看当前督导策略', '探访关爱 SOP 的完整步骤是什么？'],
  },
  {
    id: 'social_worker',
    name: '社工人员',
    subtitle: '王建国的工作台',
    icon: '👤',
    color: 'brand',
    tabs: [
      { key: 'today_tasks', label: '今日任务' },
      { key: 'current_service', label: '当前服务' },
      { key: 'history', label: '历史记录' },
    ],
    defaultMessages: [
      msg('agent', '早上好，王建国！今天你有 3 个服务任务：\n\n1. **09:00** 张大伟（探访关爱）翠苑一区 3 幢 402\n   ⚠️ 注意：血压近一周偏高，上周反映膝盖疼痛加重\n\n2. **11:30** 王秀英（助餐）翠苑二区 7 幢 201\n   ⚠️ 注意：糖尿病饮食，近期忘记吃药\n\n3. **16:00** 赵淑芬（探访关爱）翠苑一区 9 幢 301\n   ⚠️ 注意：翻身，检查压疮\n\n准备好出发了吗？需要查看哪位老人的详细信息？', '08:30'),
    ],
    suggestedQuestions: ['张大伟老人有什么注意事项？', '开始服务记录', '我刚才的记录完整吗？', '查看我的历史服务记录'],
  },
  {
    id: 'family',
    name: '服务对象家属',
    subtitle: '张明（张大伟家属）',
    icon: '👨‍👩‍👦',
    color: 'brand',
    tabs: [
      { key: 'service_status', label: '服务与状态' },
      { key: 'subscription', label: '订阅报告' },
      { key: 'feedback', label: '反馈与需求' },
    ],
    defaultMessages: [
      msg('agent', '张明您好！这里是金色年华养老服务平台。您可以随时查看父亲张大伟的服务情况和健康状态。\n\n**最近服务概况：**\n- 上次服务：2026-05-12（探访关爱，李晓红）\n- 本周已完成 3 次服务\n- 父亲整体状态稳定，血压略偏高\n\n您有什么想了解的？', '08:30'),
    ],
    suggestedQuestions: ['最近服务情况怎么样？', '这周报告发我看一下', '我想反馈一个问题', '父亲血压最近正常吗？'],
  },
];

export function getRoleConfig(roleId: string): RoleConfig {
  return roles.find(r => r.id === roleId)!;
}

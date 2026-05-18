import { getDb } from "./init";
import bcrypt from "bcryptjs";

export function seedDatabase() {
  const db = getDb();

  // Migrate legacy schedule statuses and ensure new columns exist
  try {
    db.prepare("UPDATE service_schedules SET status = 'scheduled' WHERE status IN ('assigned', 'adjusted')").run();
    db.prepare("UPDATE service_schedules SET status = 'unassigned' WHERE status = 'scheduled' AND assigned_social_worker_id IS NULL").run();
  } catch {}
  try { db.exec("ALTER TABLE service_schedules ADD COLUMN adjustment_history TEXT DEFAULT '[]'"); } catch {}

  // Check if already seeded with latest data format
  const count = db.prepare("SELECT COUNT(*) as c FROM social_workers").get() as any;
  if (count?.c > 0) {
    // Check if data has startTime in service items (new format)
    const record = db.prepare("SELECT service_items FROM service_records LIMIT 1").get() as any;
    if (record?.service_items) {
      try {
        const items = JSON.parse(record.service_items);
        if (items.length > 0 && items[0].startTime) return; // Already has new format
      } catch {}
    }
    // Old data format — drop and re-seed
    console.log("[seed] Detected old data format, re-seeding...");
    db.exec("DELETE FROM home_summary; DELETE FROM transcripts; DELETE FROM audio_assets; DELETE FROM service_records; DELETE FROM service_schedules; DELETE FROM service_plan_exceptions; DELETE FROM service_plans; DELETE FROM family_contacts; DELETE FROM service_objects; DELETE FROM smart_badges; DELETE FROM social_workers;");
  }

  // Disable FK checks during seed
  db.pragma("foreign_keys = OFF");

  const ins = (table: string, rows: Record<string, any>[]) => {
    if (rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => "?").join(", ");
    const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`);
    const tx = db.transaction(() => {
      for (const row of rows) {
        stmt.run(...cols.map(c => {
          const v = row[c];
          if (v === undefined || v === null) return null;
          if (typeof v === "object") return JSON.stringify(v);
          if (typeof v === "boolean") return v ? 1 : 0;
          return v;
        }));
      }
    });
    tx();
  };

  // Social Workers
  ins("social_workers", [
    { id: "worker-001", user_id: "user-001", name: "王丽", phone: "13800000001", site_id: "site-001", worker_type: "service_personnel", qualification_labels: ["助餐", "陪诊"], status: "active", preferred_badge_id: "badge-021", preferred_badge_device_code: "FW-021", preferred_badge_status: "available", preferred_badge_last_sync_at: "2026-05-13T08:50:00+08:00", praise_count: 42, latest_praise_at: "2026-05-12T16:30:00+08:00", latest_praise_excerpt: "服务细心周到，阿姨很满意" },
    { id: "worker-002", user_id: "user-002", name: "张敏", phone: "13800000002", site_id: "site-001", worker_type: "service_personnel", qualification_labels: ["助洁"], status: "active", praise_count: 17, latest_praise_at: "2026-05-10T11:00:00+08:00" },
    { id: "worker-003", user_id: "user-003", name: "李芳", phone: "13900000003", site_id: "site-001", worker_type: "service_personnel", qualification_labels: ["助餐"], status: "incomplete_profile", preferred_badge_id: "badge-030", preferred_badge_device_code: "FW-030", preferred_badge_status: "pending_activation", praise_count: 3 },
    { id: "worker-004", user_id: "user-004", name: "周建国", phone: "13700000004", site_id: "site-001", worker_type: "service_personnel", qualification_labels: [], status: "disabled", praise_count: 0 },
  ]);

  // Smart Badges
  ins("smart_badges", [
    { id: "badge-021", device_code: "FW-021", org_id: "org-001", site_id: "site-001", site_name: "红培社区站", status: "available", battery_percent: 83, activated_at: "2026-05-01T09:00:00+08:00", last_sync_at: "2026-05-13T08:50:00+08:00", last_recording_at: "2026-05-12T10:22:00+08:00", preferred_worker_id: "worker-001", preferred_worker_name: "王丽", recent_service_record_ids: ["record-001"] },
    { id: "badge-026", device_code: "FW-026", org_id: "org-001", site_id: "site-001", site_name: "红培社区站", status: "sync_delayed", battery_percent: 92, activated_at: "2026-05-03T09:00:00+08:00", last_sync_at: "2026-05-12T18:43:00+08:00", recent_service_record_ids: [] },
    { id: "badge-030", device_code: "FW-030", org_id: "org-001", site_id: "site-001", site_name: "红培社区站", status: "pending_activation", recent_service_record_ids: [] },
    { id: "badge-031", device_code: "FW-031", org_id: "org-001", site_id: "site-001", site_name: "红培社区站", status: "in_use", battery_percent: 67, activated_at: "2026-05-02T10:00:00+08:00", last_sync_at: "2026-05-14T09:30:00+08:00", last_recording_at: "2026-05-14T09:35:00+08:00", preferred_worker_id: "worker-002", preferred_worker_name: "张敏", recent_service_record_ids: ["record-001"] },
    { id: "badge-032", device_code: "FW-032", org_id: "org-001", site_id: "site-001", site_name: "红培社区站", status: "offline", battery_percent: 45, activated_at: "2026-04-20T09:00:00+08:00", last_sync_at: "2026-05-11T14:20:00+08:00", recent_service_record_ids: [] },
    { id: "badge-033", device_code: "FW-033", org_id: "org-001", site_id: "site-001", site_name: "红培社区站", status: "low_battery", battery_percent: 8, activated_at: "2026-04-15T09:00:00+08:00", last_sync_at: "2026-05-14T07:10:00+08:00", preferred_worker_id: "worker-003", preferred_worker_name: "李芳", recent_service_record_ids: [] },
    { id: "badge-034", device_code: "FW-034", org_id: "org-001", site_id: "site-001", site_name: "红培社区站", status: "disabled", battery_percent: 55, activated_at: "2026-03-01T09:00:00+08:00", last_sync_at: "2026-04-30T16:00:00+08:00", recent_service_record_ids: [] },
    { id: "badge-035", device_code: "FW-035", org_id: "org-001", site_id: "site-001", site_name: "红培社区站", status: "lost", battery_percent: 30, activated_at: "2026-03-10T09:00:00+08:00", last_sync_at: "2026-05-05T11:00:00+08:00", recent_service_record_ids: [] },
  ]);

  // Service Objects
  ins("service_objects", [
    { id: "object-001", name: "陈阿姨", phone: "13800001234", age: 82, gender: "female", address: "上海市杨浦区控江路 1200 号", map_display_point: { latitude: 31.292, longitude: 121.515, label: "控江路 1200 号" }, eligibility_type: "government", service_frequency: "每周三次", service_projects: ["助餐", "陪诊"], risk_tags: ["独居", "跌倒风险"], care_notes: ["午餐后需确认服药"], family_subscription_summary: "weekly", latest_insight_summary: "最近三次助餐完成稳定，需关注用药提醒。", insight_summaries: [{ id: "insight-001", title: "状态稳定", description: "最近三次服务均按时完成。", severity: "info" }, { id: "insight-002", title: "用药提醒", description: "午餐后需确认服药。", severity: "warning" }], state: "plan_exception_active" },
    { id: "object-002", name: "李爷爷", phone: "13900005678", age: 78, gender: "male", address: "上海市杨浦区长阳路 800 号", map_display_point: { latitude: 31.288, longitude: 121.525, label: "长阳路 800 号" }, eligibility_type: "insurance", service_frequency: "每周两次", service_projects: ["助浴"], risk_tags: ["认知障碍"], care_notes: ["需要家属陪同助浴", "对水温敏感"], family_subscription_summary: "none", latest_insight_summary: null, insight_summaries: [], state: "plan_paused" },
    { id: "object-003", name: "王奶奶", phone: "13700009999", age: 88, gender: "female", address: "上海市杨浦区国顺路 500 号", map_display_point: null, eligibility_type: "self_paid", service_frequency: "每周一次", service_projects: ["探访关爱"], risk_tags: [], care_notes: [], family_subscription_summary: "monthly", latest_insight_summary: null, insight_summaries: [], state: "normal" },
  ]);

  // Family Contacts
  ins("family_contacts", [
    { id: "family-001", service_object_id: "object-001", name: "陈女士", relation: "女儿", phone: "13900000001", subscription_status: "weekly", last_pushed_at: "2026-05-12T18:00:00+08:00" },
    { id: "family-002", service_object_id: "object-002", name: "李先生", relation: "儿子", phone: "13800002222", subscription_status: "exception_only", last_pushed_at: "2026-05-10T10:00:00+08:00" },
    { id: "family-003", service_object_id: "object-003", name: "王女士", relation: "孙女", phone: "13700003333", subscription_status: "monthly" },
  ]);

  // Service Plans
  ins("service_plans", [
    { id: "plan-001", service_object_id: "object-001", service_project: "助餐", cadence_rule: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR", cadence_label: "每周一三五", preferred_time_window: { start: "09:00", end: "10:30", label: "上午" }, start_date: "2026-05-01", primary_social_worker_id: "worker-001", primary_social_worker_name: "王丽", status: "active", next_schedule_at: "2026-05-14T14:00:00+08:00" },
    { id: "plan-002", service_object_id: "object-002", service_project: "助浴", cadence_rule: "RRULE:FREQ=WEEKLY;BYDAY=TU,TH", cadence_label: "每周二四", preferred_time_window: { start: "14:00", end: "15:30", label: "下午" }, start_date: "2026-05-01", primary_social_worker_id: "worker-002", primary_social_worker_name: "张敏", status: "paused" },
  ]);

  // Service Plan Exceptions
  ins("service_plan_exceptions", [
    { id: "exception-pause", service_plan_id: "plan-001", kind: "pause", effective_from: "2026-05-20", effective_to: "2026-05-22", note: "住院暂停" },
    { id: "exception-time", service_plan_id: "plan-001", kind: "time_change", effective_from: "2026-05-14", time_window: { start: "14:00", end: "15:00", label: "下午临时调整" } },
    { id: "exception-worker", service_plan_id: "plan-001", kind: "worker_change", effective_from: "2026-05-15", replacement_social_worker_id: "worker-002" },
    { id: "exception-skip", service_plan_id: "plan-001", kind: "skip", effective_from: "2026-05-17", note: "家属临时陪护" },
  ]);

  // Service Schedules
  ins("service_schedules", [
    { id: "schedule-001", source: "service_plan", service_plan_id: "plan-001", service_object_id: "object-001", service_object_name: "陈阿姨", service_project: "助餐", address_snapshot: "上海市杨浦区控江路 1200 号", address: "上海市杨浦区控江路 1200 号", map_display_point: { latitude: 31.292, longitude: 121.515, label: "控江路 1200 号" }, service_date: "2026-05-14", start_time: "14:00", end_time: "15:00", time_window: { start: "14:00", end: "15:00", label: "下午临时调整" }, assigned_social_worker_id: "worker-002", assigned_social_worker_name: "张敏", status: "scheduled", notes: "active plan exception has already changed time and worker", plan_exception_applied: true, risk_tags: ["独居"] },
    { id: "schedule-002", source: "one_time", service_object_id: "object-001", service_object_name: "陈阿姨", service_project: "陪诊", address_snapshot: "上海市杨浦区控江路 1200 号", address: "上海市杨浦区控江路 1200 号", map_display_point: { latitude: 31.292, longitude: 121.515, label: "控江路 1200 号" }, service_date: "2026-05-15", start_time: "10:00", end_time: "11:30", time_window: { start: "10:00", end: "11:30" }, status: "scheduled", assigned_social_worker_id: "worker-001", assigned_social_worker_name: "王丽", risk_tags: ["跌倒风险"] },
    { id: "schedule-003", source: "service_plan", service_plan_id: "plan-001", service_object_id: "object-001", service_object_name: "陈阿姨", service_project: "助餐", address_snapshot: "上海市杨浦区控江路 1200 号", address: "上海市杨浦区控江路 1200 号", service_date: "2026-05-12", start_time: "09:30", end_time: "10:30", time_window: { start: "09:30", end: "10:30" }, assigned_social_worker_id: "worker-001", assigned_social_worker_name: "王丽", status: "completed", service_record_id: "record-001", risk_tags: [] },
    { id: "schedule-004", source: "service_plan", service_plan_id: "plan-002", service_object_id: "object-002", service_object_name: "李爷爷", service_project: "助浴", address_snapshot: "上海市杨浦区长阳路 800 号", address: "上海市杨浦区长阳路 800 号", map_display_point: { latitude: 31.288, longitude: 121.525, label: "长阳路 800 号" }, service_date: "2026-05-15", start_time: "14:00", end_time: "15:30", time_window: { start: "14:00", end: "15:30", label: "下午" }, status: "unassigned", risk_tags: ["认知障碍"] },
    { id: "schedule-005", source: "one_time", service_object_id: "object-003", service_object_name: "王奶奶", service_project: "探访关爱", address_snapshot: "上海市杨浦区国顺路 500 号", address: "上海市杨浦区国顺路 500 号", service_date: "2026-05-16", start_time: "09:00", end_time: "10:00", time_window: { start: "09:00", end: "10:00", label: "上午" }, assigned_social_worker_id: "worker-003", assigned_social_worker_name: "李芳", status: "scheduled", risk_tags: [] },
    { id: "schedule-006", source: "service_plan", service_plan_id: "plan-001", service_object_id: "object-001", service_object_name: "陈阿姨", service_project: "助餐", address_snapshot: "上海市杨浦区控江路 1200 号", address: "上海市杨浦区控江路 1200 号", service_date: "2026-05-17", start_time: "09:00", end_time: "10:30", time_window: { start: "09:00", end: "10:30", label: "上午" }, status: "cancelled", notes: "家属临时取消", risk_tags: [] },
  ]);

  // Service Items for records — every item gets a transcript
  const sopTranscripts: Record<string, Record<string, string>> = {
    "助餐": {
      "问候老人确认身份": "阿姨您好，我是服务人员，今天来给您送餐。",
      "询问当日身体状况": "阿姨今天身体怎么样？精神好不好？昨晚睡得好吗？",
      "检查居住环境安全隐患": "家里地面很干净，没有障碍物，灯光也够亮。",
      "确认服务对象用药情况": "阿姨，今天早上的药按时吃了吗？",
      "准备餐食材料": "今天准备了清蒸鱼和青菜豆腐汤，食材新鲜。",
      "烹饪餐食": "鱼蒸了15分钟，汤也煮好了，味道不错。",
      "摆放餐具和餐食": "碗筷摆好了，汤放这边，鱼放中间。",
      "协助老人就座用餐": "阿姨慢慢坐，我扶您，椅子稳着呢。",
      "观察老人进食情况": "阿姨今天胃口不错，吃了大半碗饭，鱼也吃了不少。",
      "提醒老人服药": "阿姨，吃完饭了，把药吃了吧。",
      "收拾餐具和厨房": "碗筷洗好了，灶台也擦干净了。",
      "检查冰箱食材存量": "冰箱里还有鸡蛋和牛奶，蔬菜需要补充。",
      "询问老人对餐食满意度": "阿姨觉得今天的菜怎么样？",
      "记录老人情绪状态": "阿姨今天心情挺好的，聊了聊家常。",
      "检查室内温度和通风": "窗户开了一会儿通风，温度适宜。",
      "协助老人活动或康复训练": "阿姨我们走两圈吧，活动活动腿脚。",
      "检查老人皮肤状况": "手臂和腿部皮肤正常，没有红肿。",
      "记录老人行动能力变化": "阿姨今天走路比上次稳一些了。",
      "告知老人下次服务时间": "阿姨，后天周三我再来，还是上午。",
      "与老人道别": "阿姨再见，您注意休息，有事打电话。",
      "锁好门窗": "门锁好了，窗户也关上了。",
      "填写服务小结": "记录完毕，今日服务正常完成。",
      "上传服务证据": "证据已上传，等待系统处理。",
      "结束服务并签退": "服务结束，签退完成。",
    },
    "助浴": {
      "确认老人身体状况适合助浴": "爷爷今天血压正常，身体状况适合洗澡。",
      "检查浴室环境安全": "浴室防滑垫已铺好，扶手牢固，排水畅通。",
      "调节水温至适宜温度": "水温调到38度，先试了手感，温度合适。",
      "协助老人脱衣": "爷爷慢慢来，不着急，我帮您。",
      "协助老人进入浴室": "扶好扶手，脚踩防滑垫，慢慢进来。",
      "协助清洗头发": "洗发水抹好了，我轻轻揉一下，水温还行吧？",
      "协助清洗身体": "背部我帮您搓一下，力度可以吧？",
      "检查皮肤状况": "皮肤状况良好，没有红肿和破损。",
      "协助冲洗干净": "泡沫冲干净了，再检查一下后背。",
      "协助擦干身体": "毛巾先擦头发，再擦身体，不要着凉。",
      "协助穿衣": "先穿内衣，再穿外套，扣子我帮您。",
      "协助老人离开浴室": "地面有点滑，扶好我的手，慢慢走。",
      "检查老人洗浴后状态": "爷爷洗完精神不错，没有头晕。",
      "清理浴室": "浴室地面擦干了，毛巾挂好了。",
      "记录服务情况": "助浴服务完成，老人状态良好。",
    },
    "探访关爱": {
      "问候老人确认身份": "奶奶您好，我是李芳，今天来看您了。",
      "询问老人近期身体状况": "奶奶最近身体怎么样？有没有哪里不舒服？",
      "检查居住环境": "家里很整洁，卫生间地面干燥，没有隐患。",
      "了解老人情绪和心理状态": "奶奶今天心情挺好的，说孙女昨天给她打电话了。",
      "检查老人用药情况": "奶奶的降压药和钙片都按时吃了。",
      "检查老人饮食情况": "奶奶说昨天吃了面条和水果，胃口还行。",
      "协助老人简单活动": "奶奶我们在客厅走两圈，活动活动。",
      "检查老人行动能力": "奶奶今天走路比较稳，精神也好。",
      "记录老人身体变化": "与上次相比没有明显变化，整体状况稳定。",
      "与老人交流关爱": "奶奶跟我聊了聊孙女的事，很开心。",
      "检查家中安全隐患": "检查了厨房和卫生间，没有安全隐患。",
      "告知下次服务时间": "奶奶，下周我再来看您，有事随时打电话。",
    },
  };

  const sopBusinessItems = (prefix: string, project: string) => {
    const titles = Object.keys(sopTranscripts[project] ?? sopTranscripts["助餐"]);
    const transcripts = sopTranscripts[project] ?? sopTranscripts["助餐"];
    let clock = 0;
    return titles.map((title, i) => {
      const dur = 5 + Math.floor(Math.random() * 30);
      const startMin = clock;
      clock += dur;
      const endMin = clock;
      const fmtTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      return { id: `${prefix}-b${i + 1}`, seq: i + 1, category: "business", title, status: "completed", startTime: fmtTime(startMin), endTime: fmtTime(endMin), audioDurationSeconds: dur, transcript: transcripts[title] };
    });
  };

  const sopProcessItems = (prefix: string, workerName: string, objectName: string, statuses: string[] = ["completed", "completed", "completed"]) =>
    [
      { id: `${prefix}-p1`, seq: 1, category: "process", title: "入门自我介绍", status: statuses[0], startTime: "00:00", endTime: "00:10", audioDurationSeconds: 10, transcript: `${objectName}您好，我是红培社区站的服务人员${workerName}，今天由我为您提供服务。` },
      { id: `${prefix}-p2`, seq: 2, category: "process", title: "服务结束总结", status: statuses[1], startTime: "00:10", endTime: "00:22", audioDurationSeconds: 12, transcript: `${objectName}，今天的服务已经完成了，下次服务时间我会提前通知您。` },
      { id: `${prefix}-p3`, seq: 3, category: "process", title: "服务期间行为规范", status: statuses[2], startTime: "00:22", endTime: "01:12", audioDurationSeconds: 50 },
    ];

  const record1Items = sopBusinessItems("r1", "助餐");
  record1Items[3].status = "abnormal";
  record1Items[3].transcript = "阿姨说今天早上忘记吃降压药了。";
  (record1Items[3] as any).abnormalReason = "AI 检测到服务对象未按时服药，属于用药风险。根据 SOP 要求，应提醒服务对象立即补服并记录。";
  record1Items[14].status = "skipped";
  (record1Items[14] as any).abnormalReason = "录音中未检测到通风检查相关对话。";
  const record1Process = sopProcessItems("r1", "王丽", "阿姨", ["completed", "completed", "abnormal"]);
  (record1Process[2] as any).abnormalReason = "AI 检测到服务人员在服务期间接听私人电话。";

  ins("service_records", [
    { id: "record-001", service_date: "2026-05-12", start_time: "09:31", end_time: "10:22", duration_minutes: 51, social_worker_id: "worker-001", social_worker_name: "王丽", service_object_id: "object-001", service_object_name: "陈阿姨", family_contact_ids: ["family-001"], badge_id: "badge-021", smart_badge_id: "badge-021", service_project: "助餐", assignment_confidence: 0.72, review_status: "needs_review", export_status: "exportable", location_evidence: { startPoint: { latitude: 31.292, longitude: 121.515, capturedAt: "2026-05-12T09:31:00+08:00", accuracyMeters: 18 }, endPoint: { latitude: 31.292, longitude: 121.515, capturedAt: "2026-05-12T10:22:00+08:00", accuracyMeters: 16 }, addressMatched: true }, service_exceptions: [{ id: "service-exception-001", type: "service_incomplete", title: "服务项待补充", description: "结算字段缺失，导出前需补齐。", status: "open" }], service_items: [...record1Items, ...record1Process], exception_tags: ["信息不完整"], missing_fields: ["结算字段"], audio_asset_id: "audio-001", transcript_id: "transcript-001", structured_summary: "完成助餐服务，服务对象状态稳定。", generated_summary: "完成助餐服务，服务对象状态稳定。", export_history: [{ id: "export-001", exportedAt: "2026-05-13T17:10:00+08:00", operatorName: "站点管理员", fileVersion: "v1", filterSummary: "助餐记录", exceptionFlags: ["信息不完整"], unresolvedItems: ["结算字段"] }] },
    { id: "record-002", service_date: "2026-05-13", start_time: "14:10", end_time: "15:05", duration_minutes: 55, social_worker_id: "worker-002", social_worker_name: "张敏", service_object_id: "object-002", service_object_name: "李爷爷", family_contact_ids: [], badge_id: "badge-031", smart_badge_id: "badge-031", service_project: "助浴", assignment_confidence: 0.95, review_status: "confirmed", export_status: "exported", location_evidence: { startPoint: { latitude: 31.288, longitude: 121.525, capturedAt: "2026-05-13T14:10:00+08:00", accuracyMeters: 12 }, endPoint: { latitude: 31.288, longitude: 121.525, capturedAt: "2026-05-13T15:05:00+08:00", accuracyMeters: 10 }, addressMatched: true }, service_exceptions: [], service_items: [...sopBusinessItems("r2", "助浴"), ...sopProcessItems("r2", "张敏", "爷爷")], exception_tags: [], missing_fields: [], audio_asset_id: "audio-002", transcript_id: "transcript-002", structured_summary: "完成助浴服务，老人状态良好。", export_history: [{ id: "export-002", exportedAt: "2026-05-14T09:00:00+08:00", operatorName: "站点管理员", fileVersion: "v1", filterSummary: "助浴记录" }] },
    { id: "record-003", service_date: "2026-05-14", start_time: "09:00", end_time: "09:45", duration_minutes: 45, social_worker_id: "worker-003", social_worker_name: "李芳", service_object_id: "object-003", service_object_name: "王奶奶", family_contact_ids: ["family-003"], badge_id: "badge-021", smart_badge_id: "badge-021", service_project: "探访关爱", assignment_confidence: 0.55, review_status: "info_incomplete", export_status: "not_ready", location_evidence: { startPoint: { latitude: 31.295, longitude: 121.510, capturedAt: "2026-05-14T09:00:00+08:00", accuracyMeters: 25 }, endPoint: { latitude: 31.295, longitude: 121.510, capturedAt: "2026-05-14T09:45:00+08:00", accuracyMeters: 20 }, addressMatched: false }, service_exceptions: [{ id: "exception-003", type: "late_arrival", title: "迟到", description: "到达时间比预约晚15分钟", status: "resolved", resolvedAt: "2026-05-14T10:00:00+08:00" }], service_items: (() => { const items = sopBusinessItems("r3", "探访关爱"); items[5].status = "abnormal"; (items[5] as any).abnormalReason = "AI 检测到服务对象饮食异常。"; items[5].transcript = "奶奶说昨天没怎么吃东西。"; items[10].status = "skipped"; (items[10] as any).abnormalReason = "录音中未检测到安全检查相关内容。"; return [...items, ...sopProcessItems("r3", "李芳", "奶奶", ["abnormal", "completed", "completed"])]; })(), exception_tags: ["迟到"], missing_fields: ["服务项目确认", "结算字段"], audio_asset_id: "audio-003", transcript_id: "transcript-003", structured_summary: "完成探访关爱服务。", export_history: [] },
  ]);

  // Audio Assets
  ins("audio_assets", [
    { id: "audio-001", record_id: "record-001", playback_url: "/mock-audio.wav", duration_seconds: 3060, captured_by_badge_id: "badge-021", uploaded_at: "2026-05-12T10:30:00+08:00", retention_label: "内部证据保留 180 天" },
    { id: "audio-002", record_id: "record-002", playback_url: "/mock-audio.wav", duration_seconds: 3300, captured_by_badge_id: "badge-031", uploaded_at: "2026-05-13T15:10:00+08:00", retention_label: "内部证据保留 180 天" },
    { id: "audio-003", record_id: "record-003", playback_url: "/mock-audio.wav", duration_seconds: 2700, captured_by_badge_id: "badge-021", uploaded_at: "2026-05-14T09:50:00+08:00", retention_label: "内部证据保留 180 天" },
  ]);

  // Transcripts
  ins("transcripts", [
    { id: "transcript-001", record_id: "record-001", language: "zh-CN", text: "服务人员完成助餐服务，并确认下次服务时间。", confidence: 0.91, segments: [
      { startSecond: 0, endSecond: 8, speaker: "social_worker", text: "阿姨您好，我是红培社区站的服务人员王丽，今天由我为您提供助餐服务。" },
      { startSecond: 9, endSecond: 14, speaker: "service_object", text: "小王啊，快进来坐，今天又麻烦你了。" },
      { startSecond: 15, endSecond: 22, speaker: "social_worker", text: "不麻烦的阿姨。今天身体怎么样？精神好不好？" },
      { startSecond: 23, endSecond: 30, speaker: "service_object", text: "今天还行，就是昨晚没睡好，有点累。" },
      { startSecond: 39, endSecond: 48, speaker: "social_worker", text: "阿姨，今天早上的药按时吃了吗？" },
      { startSecond: 49, endSecond: 55, speaker: "service_object", text: "哎呀，今天早上忘记吃降压药了，你提醒得好。" },
      { startSecond: 56, endSecond: 65, speaker: "social_worker", text: "没关系阿姨，现在补吃也来得及。我帮您把药拿过来。" },
      { startSecond: 120, endSecond: 130, speaker: "social_worker", text: "阿姨，今天给您准备了清蒸鱼和青菜豆腐汤，都是清淡的。" },
      { startSecond: 131, endSecond: 138, speaker: "service_object", text: "看着就不错，闻着也香。你做饭越来越好了。" },
      { startSecond: 300, endSecond: 310, speaker: "social_worker", text: "阿姨今天吃了大半碗饭，胃口不错啊。" },
      { startSecond: 311, endSecond: 318, speaker: "service_object", text: "今天的鱼做得好吃，比上次那个红烧的好。" },
      { startSecond: 319, endSecond: 328, speaker: "social_worker", text: "那下次我还给您做清蒸的。阿姨，现在我们活动活动吧？" },
      { startSecond: 400, endSecond: 410, speaker: "social_worker", text: "阿姨今天走路比上次稳一些了，恢复得不错。" },
      { startSecond: 600, endSecond: 612, speaker: "social_worker", text: "阿姨，今天的服务就到这里了。后天周三我再来，还是上午这个时间。" },
      { startSecond: 613, endSecond: 620, speaker: "service_object", text: "好的好的，辛苦你了小王。路上注意安全。" },
      { startSecond: 621, endSecond: 625, speaker: "social_worker", text: "阿姨再见，您注意休息。门窗我帮您锁好了。" }
    ] },
    { id: "transcript-002", record_id: "record-002", language: "zh-CN", text: "完成助浴服务，老人状态良好。", confidence: 0.93, segments: [
      { startSecond: 0, endSecond: 8, speaker: "social_worker", text: "李爷爷您好，我是张敏，今天来给您助浴。" },
      { startSecond: 9, endSecond: 15, speaker: "service_object", text: "小张来了啊，今天天气不错，正好洗个澡。" },
      { startSecond: 16, endSecond: 24, speaker: "social_worker", text: "是啊爷爷。我先量一下血压，看看适不适合洗澡。" },
      { startSecond: 25, endSecond: 32, speaker: "social_worker", text: "血压120/80，正常，可以洗。我去检查一下浴室。" },
      { startSecond: 60, endSecond: 68, speaker: "social_worker", text: "防滑垫铺好了，扶手很牢固。水温调到38度了，您试试。" },
      { startSecond: 69, endSecond: 74, speaker: "service_object", text: "嗯，温度刚好，不烫。" },
      { startSecond: 120, endSecond: 128, speaker: "social_worker", text: "爷爷我帮您搓一下后背，力度可以吧？" },
      { startSecond: 129, endSecond: 133, speaker: "service_object", text: "可以，再重一点也行。" },
      { startSecond: 200, endSecond: 208, speaker: "social_worker", text: "好了爷爷，冲干净了。我帮您擦干，先穿衣服别着凉。" },
      { startSecond: 209, endSecond: 215, speaker: "service_object", text: "洗完舒服多了，谢谢你小张。" },
      { startSecond: 300, endSecond: 310, speaker: "social_worker", text: "爷爷洗完精神不错，没有头晕。浴室我收拾好了。" },
      { startSecond: 311, endSecond: 318, speaker: "service_object", text: "不晕，就是有点饿了。" },
      { startSecond: 319, endSecond: 328, speaker: "social_worker", text: "那您赶紧吃点东西。今天的助浴服务结束了，您状态很好。下次我周四再来。" },
      { startSecond: 329, endSecond: 334, speaker: "service_object", text: "好的，辛苦你了小张。" },
    ] },
    { id: "transcript-003", record_id: "record-003", language: "zh-CN", text: "完成探访关爱服务。", confidence: 0.85, segments: [
      { startSecond: 0, endSecond: 6, speaker: "social_worker", text: "王奶奶您好，我是李芳，今天来看您了。" },
      { startSecond: 7, endSecond: 14, speaker: "service_object", text: "李芳来了啊，快进来坐，好久没来了。" },
      { startSecond: 15, endSecond: 22, speaker: "social_worker", text: "奶奶最近身体怎么样？有没有哪里不舒服？" },
      { startSecond: 23, endSecond: 32, speaker: "service_object", text: "还行吧，就是最近胃口不太好，吃不下东西。" },
      { startSecond: 33, endSecond: 40, speaker: "social_worker", text: "从什么时候开始的？有没有去医院看看？" },
      { startSecond: 41, endSecond: 50, speaker: "service_object", text: "有两三天了吧，没去医院，觉得没什么大事。" },
      { startSecond: 51, endSecond: 60, speaker: "social_worker", text: "奶奶，连续几天吃不下东西还是要注意的。我帮您跟家属说一下，建议去医院检查一下。" },
      { startSecond: 61, endSecond: 68, speaker: "service_object", text: "那你帮我跟我孙女说一声吧，她比较操心。" },
      { startSecond: 69, endSecond: 76, speaker: "social_worker", text: "好的奶奶，我一会儿就通知她。药按时吃了吗？" },
      { startSecond: 77, endSecond: 82, speaker: "service_object", text: "降压药和钙片都吃了，这个没忘。" },
      { startSecond: 120, endSecond: 128, speaker: "social_worker", text: "奶奶我们在客厅走两圈，活动活动腿脚。" },
      { startSecond: 129, endSecond: 135, speaker: "service_object", text: "好，走走也好。" },
      { startSecond: 200, endSecond: 210, speaker: "social_worker", text: "奶奶今天走路挺稳的。您孙女最近有没有来看您？" },
      { startSecond: 211, endSecond: 220, speaker: "service_object", text: "昨天给我打电话了，说周末来看我。孙女还是很孝顺的。" },
      { startSecond: 221, endSecond: 230, speaker: "social_worker", text: "那太好了。奶奶，今天的探访就到这里了。您注意休息，饮食方面实在吃不下就去医院看看。" },
      { startSecond: 231, endSecond: 238, speaker: "service_object", text: "好的好的，谢谢你啊小李。下次再来看我。" },
      { startSecond: 239, endSecond: 244, speaker: "social_worker", text: "奶奶再见，有什么事随时打电话。" },
    ] },
  ]);

  // Home Summary
  ins("home_summary", [
    { id: "current", summary_date: "2026-05-14", total_scheduled_services: 18, unassigned_services: 2, active_social_workers: 7, online_badges: 6, records_need_review: 3, exportable_service_records: 12, highlights: [{ id: "h1", type: "schedule_gap", title: "今日还有 2 个服务对象未排期", description: "请进入服务排期补齐服务人员和时间窗。", severity: "warning", relatedEntityType: "service_schedule", relatedEntityId: "schedule-002" }, { id: "h2", type: "badge_issue", title: "1 个智能工牌同步延迟", description: "FW-026 最近同步超过 12 小时。", severity: "warning", relatedEntityType: "badge", relatedEntityId: "badge-026" }, { id: "h3", type: "export_ready", title: "12 条服务记录可导出", description: "包含 1 条带异常标记记录。", severity: "info", relatedEntityType: "service_record", relatedEntityId: "record-001" }, { id: "h4", type: "record_review", title: "3 条服务记录待复核", description: "优先处理助餐和陪诊记录。", severity: "warning", relatedEntityType: "service_record", relatedEntityId: "record-001" }], activities: [{ id: "a1", occurredAt: "2026-05-13T09:10:00+08:00", title: "今日还有 6 个服务对象未排期。", relatedEntityType: "service_schedule", relatedEntityId: "schedule-002" }, { id: "a2", occurredAt: "2026-05-13T09:12:00+08:00", title: "智能工牌 FW-021 已接入站点，今日可用。", relatedEntityType: "badge", relatedEntityId: "badge-021" }, { id: "a3", occurredAt: "2026-05-13T09:14:00+08:00", title: "4 条服务记录信息不完整，已放入服务记录。", relatedEntityType: "service_record", relatedEntityId: "record-001" }, { id: "a4", occurredAt: "2026-05-13T09:15:00+08:00", title: "查一下今天谁还没排期。", description: "助手已把排期缺口整理为推荐动作。", relatedEntityType: "service_schedule", relatedEntityId: "schedule-002" }, { id: "a5", occurredAt: "2026-05-13T09:17:00+08:00", title: "陈阿姨近期需要用药提醒。", description: "服务对象风险已进入首页重点关注。", relatedEntityType: "service_object", relatedEntityId: "object-001" }], recommended_actions: [{ id: "ra1", label: "去补排今日缺口", targetWorkspace: "service_schedules", relatedEntityId: "schedule-002" }, { id: "ra2", label: "复核服务记录", targetWorkspace: "service_records", relatedEntityId: "record-001" }, { id: "ra3", label: "查看设备同步", targetWorkspace: "smart_badges", relatedEntityId: "badge-026" }], permission_state: "full" },
  ]);

  // Re-enable FK checks
  db.pragma("foreign_keys = ON");
  console.log("[seed] Database seeded with demo data");

  // Seed default users
  const existingUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (existingUsers.count === 0) {
    const hash = (pw: string) => bcrypt.hashSync(pw, 10);
    const insertUser = db.prepare(`INSERT INTO users (id, username, password_hash, name, role, org_id, site_ids, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    insertUser.run("user-admin-001", "admin", hash("admin123"), "系统管理员", "org_admin", "org-001", '["site-001"]', "13800000000");
    insertUser.run("user-op-001", "operator", hash("oper123"), "站点运营员", "site_operator", "org-001", '["site-001"]', "13800000001");
    insertUser.run("user-sup-001", "supervisor", hash("super123"), "服务主管", "service_supervisor", "org-001", '["site-001"]', "13800000002");
    console.log("[seed] Seeded 3 default users");
  }
}

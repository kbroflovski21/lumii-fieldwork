import { useState, useEffect } from "react";
import "./family.css";

/* ── Types ── */

type AppState = "loading" | "landing" | "form" | "submitting" | "success" | "pending" | "fail" | "bound";

interface BindingInfo {
  elderName: string;
  elderIdNumber: string;
  familyName: string;
  relationship: string;
  wechatId: string;
  boundAt: string;
  subscriptionStatus: string;
}

interface FormData {
  elderName: string;
  elderIdNumber: string;
  familyName: string;
  relationship: string;
}

/* ── Mock ── */

const MOCK_WECHAT_ID = "wx_mock_user_001";

const MOCK_PUSH_MESSAGES = [
  { id: "p1", type: "service" as const, tag: "服务报告", date: "今天 09:50", title: "探访关爱服务已完成", summary: "社工王建国于今日为老人提供了探访关爱服务（43分钟），测量血压 140/88，精神状态良好。" },
  { id: "p2", type: "health" as const, tag: "健康周报", date: "05-14", title: "本周健康状态总结", summary: "本周共完成 3 次探访关爱服务，整体状态稳定。血压略偏高（140/88），趋势下降中。" },
  { id: "p3", type: "notice" as const, tag: "服务通知", date: "05-12", title: "服务时间调整通知", summary: "下周一的探访关爱服务将由李晓红负责，服务时间不变（09:00）。" },
  { id: "p4", type: "service" as const, tag: "服务报告", date: "05-10", title: "探访关爱服务已完成", summary: "社工李晓红于 05-10 为老人提供了探访关爱服务（47分钟），血压 145/92。" },
];

const RELATIONSHIP_OPTIONS = ["儿子", "女儿", "儿媳", "女婿", "孙子", "孙女", "配偶", "其他"];

/* ── API ── */

const API_BASE = "/api";

async function checkBindingStatus(wechatId: string): Promise<{ bound: boolean; bindingStatus?: string; binding?: BindingInfo }> {
  const res = await fetch(`${API_BASE}/family/status?wechatId=${encodeURIComponent(wechatId)}`);
  if (!res.ok) throw new Error("服务端异常");
  return res.json();
}

async function submitBinding(data: FormData & { wechatId: string }): Promise<{
  status: "success" | "pending" | "fail";
  reason?: string;
  message: string;
  binding?: BindingInfo;
}> {
  const res = await fetch(`${API_BASE}/family/bind`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

/* ── Helpers ── */

function maskIdNumber(id: string): string {
  if (id.length < 8) return id;
  return id.slice(0, 4) + "****" + id.slice(-4);
}

/* ═══════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════ */

export function FamilyPage() {
  const [state, setState] = useState<AppState>("loading");
  const [binding, setBinding] = useState<BindingInfo | null>(null);
  const [failMessage, setFailMessage] = useState("");

  useEffect(() => {
    checkBindingStatus(MOCK_WECHAT_ID)
      .then((data) => {
        if (data.bound && data.binding) {
          setBinding(data.binding);
          setState(data.bindingStatus === "pending_review" ? "pending" : "bound");
        } else {
          setState("landing");
        }
      })
      .catch(() => setState("landing"));
  }, []);

  const handleBind = async (form: FormData) => {
    setState("submitting");
    try {
      const result = await submitBinding({ ...form, wechatId: MOCK_WECHAT_ID });
      if (result.status === "success" && result.binding) {
        setBinding(result.binding);
        setState("success");
      } else if (result.status === "pending" && result.binding) {
        setBinding(result.binding);
        setState("pending");
      } else {
        setFailMessage(result.message || "绑定失败，请重试");
        setState("fail");
      }
    } catch {
      setFailMessage("服务端异常，请稍后重试");
      setState("fail");
    }
  };

  return (
    <div className="gy-family">
      {state === "loading" && <LoadingView />}
      {state === "landing" && <LandingView onStart={() => setState("form")} />}
      {state === "form" && <BindingForm onSubmit={handleBind} onBack={() => setState("landing")} />}
      {state === "submitting" && <SubmittingView />}
      {state === "success" && binding && <SuccessView binding={binding} onContinue={() => setState("bound")} />}
      {state === "pending" && binding && <PendingView binding={binding} />}
      {state === "fail" && <FailView message={failMessage} onRetry={() => setState("form")} onHome={() => setState("landing")} />}
      {state === "bound" && binding && <BoundView binding={binding} />}
    </div>
  );
}

/* ── Loading / Submitting ── */

function LoadingView() {
  return <div className="gy-loading"><span className="gy-spinner gy-spinner--lg" /><p>加载中...</p></div>;
}

function SubmittingView() {
  return <div className="gy-loading"><span className="gy-spinner gy-spinner--lg" /><p>正在验证老人信息...</p></div>;
}

/* ── Landing ── */

function LandingView({ onStart }: { onStart: () => void }) {
  return (
    <div className="gy-landing">
      <div className="gy-landing__hero">
        <div className="gy-landing__icon-circle">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4z" fill="#FFF0E8"/>
            <path d="M24 12c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" fill="#E8734A"/>
            <path d="M34 32c0-4-4.48-6-10-6s-10 2-10 6v2h20v-2z" fill="#E8734A" opacity="0.7"/>
            <circle cx="36" cy="14" r="4" fill="#7BAE7F"/>
            <path d="M34.5 13.5l1 1 2-2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="gy-landing__title">关爱无忧</h1>
        <p className="gy-landing__subtitle">随时了解家中老人的生活与健康状况</p>
      </div>

      <div className="gy-landing__features">
        <div className="gy-landing__feature">
          <div className="gy-landing__feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8734A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div><h3 className="gy-landing__feature-title">服务报告推送</h3><p className="gy-landing__feature-desc">每次上门服务后，自动收到详细的服务报告</p></div>
        </div>
        <div className="gy-landing__feature">
          <div className="gy-landing__feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7BAE7F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div><h3 className="gy-landing__feature-title">健康状态追踪</h3><p className="gy-landing__feature-desc">每周收到老人健康数据总结，血压、情绪一目了然</p></div>
        </div>
        <div className="gy-landing__feature">
          <div className="gy-landing__feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div><h3 className="gy-landing__feature-title">即时通知</h3><p className="gy-landing__feature-desc">服务变动、排班调整等重要信息第一时间推送给您</p></div>
        </div>
      </div>

      <div className="gy-landing__trial-note">绑定即享 <strong>14 天免费体验</strong>，之后仅需 5 元/月</div>
      <button className="gy-landing__cta" onClick={onStart}>申请绑定家中老人</button>
      <p className="gy-landing__footer">绑定后，系统将自动验证老人信息并完成关联</p>
    </div>
  );
}

/* ── Binding Form ── */

function BindingForm({ onSubmit, onBack }: { onSubmit: (data: FormData) => void; onBack: () => void }) {
  const [form, setForm] = useState<FormData>({ elderName: "", elderIdNumber: "", familyName: "", relationship: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.elderName.trim()) errs.elderName = "请输入老人姓名";
    if (!form.elderIdNumber.trim()) errs.elderIdNumber = "请输入身份证号";
    else if (!/^\d{17}[\dXx]$/.test(form.elderIdNumber.trim())) errs.elderIdNumber = "请输入正确的18位身份证号";
    if (!form.familyName.trim()) errs.familyName = "请输入您的姓名";
    if (!form.relationship) errs.relationship = "请选择与老人的关系";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({ elderName: form.elderName.trim(), elderIdNumber: form.elderIdNumber.trim(), familyName: form.familyName.trim(), relationship: form.relationship });
  };

  return (
    <div className="gy-form-page">
      <header className="gy-form-header">
        <button className="gy-form-header__back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="gy-form-header__title">申请绑定</h1>
        <div style={{ width: 20 }} />
      </header>
      <div className="gy-form-body">
        <div className="gy-form-section">
          <h2 className="gy-form-section__title">老人信息</h2>
          <div className="gy-form-field">
            <label className="gy-form-field__label">老人姓名</label>
            <input className={`gy-form-field__input ${errors.elderName ? "gy-form-field__input--error" : ""}`} placeholder="请输入老人的真实姓名" value={form.elderName} onChange={(e) => update("elderName", e.target.value)} />
            {errors.elderName && <span className="gy-form-field__error">{errors.elderName}</span>}
          </div>
          <div className="gy-form-field">
            <label className="gy-form-field__label">身份证号</label>
            <input className={`gy-form-field__input ${errors.elderIdNumber ? "gy-form-field__input--error" : ""}`} placeholder="请输入老人的身份证号码" value={form.elderIdNumber} onChange={(e) => update("elderIdNumber", e.target.value)} maxLength={18} inputMode="numeric" />
            {errors.elderIdNumber && <span className="gy-form-field__error">{errors.elderIdNumber}</span>}
            <p className="gy-form-field__hint">用于核实老人身份，信息将被加密保护</p>
          </div>
        </div>
        <div className="gy-form-section">
          <h2 className="gy-form-section__title">家属信息</h2>
          <div className="gy-form-field">
            <label className="gy-form-field__label">您的姓名</label>
            <input className={`gy-form-field__input ${errors.familyName ? "gy-form-field__input--error" : ""}`} placeholder="请输入您的真实姓名" value={form.familyName} onChange={(e) => update("familyName", e.target.value)} />
            {errors.familyName && <span className="gy-form-field__error">{errors.familyName}</span>}
          </div>
          <div className="gy-form-field">
            <label className="gy-form-field__label">与老人的关系</label>
            <div className="gy-form-field__chips">
              {RELATIONSHIP_OPTIONS.map((rel) => (
                <button key={rel} className={`gy-form-chip ${form.relationship === rel ? "gy-form-chip--active" : ""}`} onClick={() => update("relationship", rel)}>{rel}</button>
              ))}
            </div>
            {errors.relationship && <span className="gy-form-field__error">{errors.relationship}</span>}
          </div>
        </div>
      </div>
      <div className="gy-form-footer">
        <button className="gy-form-footer__submit" onClick={handleSubmit}>提交申请</button>
        <p className="gy-form-footer__note">提交后系统将自动验证老人信息，匹配成功即刻完成绑定</p>
      </div>
    </div>
  );
}

/* ── Success ── */

function SuccessView({ binding, onContinue }: { binding: BindingInfo; onContinue: () => void }) {
  useEffect(() => { const t = setTimeout(onContinue, 3000); return () => clearTimeout(t); }, [onContinue]);
  return (
    <div className="gy-success">
      <div className="gy-success__card">
        <div className="gy-success__check">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" fill="#E8F5E9"/><circle cx="32" cy="32" r="24" fill="#7BAE7F"/><path d="M22 32l7 7 13-13" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1 className="gy-success__title">绑定成功</h1>
        <p className="gy-success__message">{binding.familyName}，你好！你已成功绑定 <strong>{binding.elderName}</strong> 的关爱服务。</p>
        <p className="gy-success__submessage">现在，你可以更好地关注家里老人的情况了。</p>
        <div className="gy-success__trial-badge">14 天免费体验已开启</div>
        <button className="gy-success__btn" onClick={onContinue}>开始使用</button>
      </div>
    </div>
  );
}

/* ── Pending ── */

function PendingView({ binding }: { binding: BindingInfo }) {
  return (
    <div className="gy-success">
      <div className="gy-success__card">
        <div className="gy-success__check">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" fill="#FFF6E8"/><circle cx="32" cy="32" r="24" fill="#E8A34A"/><path d="M32 20v14" stroke="#fff" strokeWidth="3" strokeLinecap="round"/><circle cx="32" cy="42" r="2" fill="#fff"/></svg>
        </div>
        <h1 className="gy-pending__title">申请已提交</h1>
        <p className="gy-fail__message">你的绑定申请正在等待站点运营人员审核，审核通过后会通知你。</p>
        <div className="gy-pending__info">
          <div className="gy-pending__info-row"><span>老人姓名</span><span>{binding.elderName}</span></div>
          <div className="gy-pending__info-row"><span>申请人</span><span>{binding.familyName}（{binding.relationship}）</span></div>
        </div>
      </div>
    </div>
  );
}

/* ── Fail ── */

function FailView({ message, onRetry, onHome }: { message: string; onRetry: () => void; onHome: () => void }) {
  return (
    <div className="gy-success">
      <div className="gy-success__card">
        <div className="gy-success__check">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" fill="#FEF2F2"/><circle cx="32" cy="32" r="24" fill="#E55B5B"/><path d="M24 24l16 16M40 24L24 40" stroke="#fff" strokeWidth="3" strokeLinecap="round"/></svg>
        </div>
        <h1 className="gy-fail__title">绑定未成功</h1>
        <p className="gy-fail__message">{message}</p>
        <button className="gy-fail__retry-btn" onClick={onRetry}>重新填写信息</button>
        <button className="gy-fail__home-btn" onClick={onHome}>返回首页</button>
      </div>
    </div>
  );
}

/* ── Bound ── */

function BoundView({ binding }: { binding: BindingInfo }) {
  const [showProfile, setShowProfile] = useState(false);
  return (
    <div className="gy-bound">
      <header className="gy-bound__header">
        <div className="gy-bound__header-inner">
          <div className="gy-bound__elder-avatar">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8734A" strokeWidth="1.5"><path d="M12 4c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/><path d="M18 20c0-3-2.69-5-6-5s-6 2-6 5"/></svg>
          </div>
          <div className="gy-bound__header-text">
            <h1 className="gy-bound__elder-name">{binding.elderName}的关爱动态</h1>
            <p className="gy-bound__family-info">{binding.familyName}（{binding.relationship}）</p>
          </div>
          <button className="gy-bound__profile-btn" onClick={() => setShowProfile(!showProfile)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
        <div className="gy-bound__sub-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          已绑定 · 关爱无忧
        </div>
      </header>

      {showProfile && (
        <div className="gy-bound__profile-card">
          <div className="gy-bound__profile-row"><span className="gy-bound__profile-label">老人姓名</span><span>{binding.elderName}</span></div>
          <div className="gy-bound__profile-row"><span className="gy-bound__profile-label">身份证号</span><span>{maskIdNumber(binding.elderIdNumber)}</span></div>
          <div className="gy-bound__profile-row"><span className="gy-bound__profile-label">绑定家属</span><span>{binding.familyName}（{binding.relationship}）</span></div>
          <div className="gy-bound__profile-row"><span className="gy-bound__profile-label">绑定时间</span><span>{new Date(binding.boundAt).toLocaleDateString("zh-CN")}</span></div>
        </div>
      )}

      <div className="gy-bound__feed">
        {MOCK_PUSH_MESSAGES.map((msg) => (
          <div key={msg.id} className="gy-push-card">
            <div className="gy-push-card__meta">
              <span className={`gy-push-card__tag gy-push-card__tag--${msg.type}`}>{msg.tag}</span>
              <span className="gy-push-card__date">{msg.date}</span>
            </div>
            <h3 className="gy-push-card__title">{msg.title}</h3>
            <p className="gy-push-card__summary">{msg.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

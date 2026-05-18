import { useMemo } from "react";
import type { ServiceTask } from "./CareworkerPage";

/* ─── Types ─── */

export type CalendarViewMode = "day" | "week" | "month";

/* ─── Helpers ─── */

const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

const STATUS_DOT_COLORS: Record<string, string> = {
  completed: "#10B981",
  abnormal: "#EF4444",
  pending: "#F59E0B",
};

const STATUS_BG_COLORS: Record<string, string> = {
  completed: "rgba(16,185,129,0.1)",
  abnormal: "rgba(239,68,68,0.1)",
  pending: "rgba(245,158,11,0.1)",
};

const STATUS_BORDER_COLORS: Record<string, string> = {
  completed: "#10B981",
  abnormal: "#EF4444",
  pending: "#F59E0B",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "已完成",
  abnormal: "异常",
  pending: "待服务",
};

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: "#E0F4EC", text: "#116B4C" },
  abnormal: { bg: "#FEE2E2", text: "#B42318" },
  pending: { bg: "#FFF1D6", text: "#976000" },
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getWeekStart(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay()); // Sunday
  return r;
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startDate = getWeekStart(first);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(addDays(startDate, i));
  }
  return days;
}

/* ─── View Mode Toggle ─── */

export function CalendarToggle({
  viewMode,
  onChange,
}: {
  viewMode: CalendarViewMode;
  onChange: (mode: CalendarViewMode) => void;
}) {
  const modes: { key: CalendarViewMode; label: string }[] = [
    { key: "day", label: "日" },
    { key: "week", label: "周" },
    { key: "month", label: "月" },
  ];

  return (
    <div className="cw-cal-toggle">
      {modes.map(({ key, label }) => (
        <button
          key={key}
          className={`cw-cal-toggle__btn ${viewMode === key ? "cw-cal-toggle__btn--active" : ""}`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── Quick Nav Label ─── */

export function getQuickLabel(viewMode: CalendarViewMode): string {
  return { day: "今天", week: "本周", month: "本月" }[viewMode];
}

/* ─── Header Title ─── */

export function getHeaderTitle(viewMode: CalendarViewMode, currentDate: Date): string {
  if (viewMode === "month") {
    return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;
  }
  if (viewMode === "week") {
    const ws = getWeekStart(currentDate);
    const we = addDays(ws, 6);
    return `${ws.getMonth() + 1}/${ws.getDate()} - ${we.getMonth() + 1}/${we.getDate()}`;
  }
  // day
  return `${currentDate.getMonth() + 1}月${currentDate.getDate()}日 周${DAY_LABELS[currentDate.getDay()]}`;
}

/* ─── Navigate helper ─── */

export function navigateCalendar(currentDate: Date, viewMode: CalendarViewMode, dir: number): Date {
  const d = new Date(currentDate);
  if (viewMode === "day") d.setDate(d.getDate() + dir);
  else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  return d;
}

/* ─── Day View ─── */

export function DayView({
  currentDate,
  todayStr,
  tasks,
  onSelectTask,
}: {
  currentDate: Date;
  todayStr: string;
  tasks: ServiceTask[];
  onSelectTask: (task: ServiceTask) => void;
}) {
  const dateStr = toDateStr(currentDate);
  const dayTasks = useMemo(() => tasks.filter((t) => t.date === dateStr), [tasks, dateStr]);
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8:00 - 18:00

  const getTaskPosition = (task: ServiceTask) => {
    const [sh, sm] = task.startTime.split(":").map(Number);
    const [eh, em] = task.endTime.split(":").map(Number);
    const top = ((sh - 8) * 60 + sm) / 60;
    const height = ((eh - sh) * 60 + (em - sm)) / 60;
    return { top: top * 60, height: Math.max(height * 60, 40) };
  };

  return (
    <div className="cw-cal-day">
      <div className="cw-cal-day__grid" style={{ minHeight: hours.length * 60 }}>
        {/* Hour lines */}
        {hours.map((h) => (
          <div key={h} className="cw-cal-day__hour-line" style={{ top: (h - 8) * 60 }}>
            <span className="cw-cal-day__hour-label">
              {String(h).padStart(2, "0")}:00
            </span>
            <div className="cw-cal-day__hour-divider" />
          </div>
        ))}

        {/* Task blocks */}
        <div className="cw-cal-day__tasks">
          {dayTasks.map((task) => {
            const pos = getTaskPosition(task);
            return (
              <button
                key={task.id}
                className="cw-cal-day__task-block"
                style={{
                  top: pos.top,
                  height: pos.height,
                  backgroundColor: STATUS_BG_COLORS[task.status],
                  borderLeft: `3px solid ${STATUS_BORDER_COLORS[task.status]}`,
                }}
                onClick={() => onSelectTask(task)}
              >
                <div className="cw-cal-day__task-title">
                  {task.serviceType} · {task.recipientName}
                </div>
                <div className="cw-cal-day__task-meta">
                  {task.startTime}-{task.endTime} {task.locationShort}
                </div>
              </button>
            );
          })}
        </div>

        {/* Now indicator */}
        {dateStr === todayStr &&
          (() => {
            const now = new Date();
            const mins = (now.getHours() - 8) * 60 + now.getMinutes();
            if (mins < 0 || mins > 660) return null;
            return (
              <div className="cw-cal-day__now-line" style={{ top: mins }}>
                <span className="cw-cal-day__now-dot" />
                <div className="cw-cal-day__now-rule" />
              </div>
            );
          })()}
      </div>
    </div>
  );
}

/* ─── Month View ─── */

export function MonthView({
  currentDate,
  selectedDate,
  todayStr,
  tasks,
  onSelectDate,
  onSelectTask,
}: {
  currentDate: Date;
  selectedDate: string;
  todayStr: string;
  tasks: ServiceTask[];
  onSelectDate: (d: string) => void;
  onSelectTask: (task: ServiceTask) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, ServiceTask[]>();
    for (const t of tasks) {
      const arr = map.get(t.date) || [];
      arr.push(t);
      map.set(t.date, arr);
    }
    return map;
  }, [tasks]);

  const selectedTasks = useMemo(
    () => tasks.filter((t) => t.date === selectedDate),
    [tasks, selectedDate],
  );

  return (
    <div className="cw-cal-month">
      {/* Day headers */}
      <div className="cw-cal-month__header">
        {DAY_LABELS.map((d) => (
          <div key={d} className="cw-cal-month__header-cell">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="cw-cal-month__grid">
        {days.map((day, i) => {
          const ds = toDateStr(day);
          const isCurrentMonth = day.getMonth() === month;
          const isToday = ds === todayStr;
          const isSelected = ds === selectedDate;
          const dayTasks = tasksByDate.get(ds) || [];
          const dots = [...new Set(dayTasks.map((t) => t.status))];

          let cellCls = "cw-cal-cell";
          if (isSelected) cellCls += " cw-cal-cell--selected";
          if (!isCurrentMonth) cellCls += " cw-cal-cell--other-month";

          return (
            <button key={i} className={cellCls} onClick={() => onSelectDate(ds)}>
              <span className={`cw-cal-cell__num ${isToday ? "cw-cal-cell__num--today" : ""}`}>
                {day.getDate()}
              </span>
              <span className="cw-cal-cell__dots">
                {dots.map((s) => (
                  <span
                    key={s}
                    className="cw-cal-cell__dot"
                    style={{ backgroundColor: STATUS_DOT_COLORS[s] }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected day task list below the grid */}
      <div className="cw-cal-month__task-section">
        <div className="cw-cal-month__task-label">
          {new Date(selectedDate).getMonth() + 1}月{new Date(selectedDate).getDate()}日 任务
        </div>
        {selectedTasks.length === 0 ? (
          <div className="cw-cal-month__empty">暂无任务</div>
        ) : (
          <div className="cw-cal-month__task-list">
            {selectedTasks.map((task) => {
              const badge = STATUS_BADGE_COLORS[task.status];
              return (
                <button
                  key={task.id}
                  className="cw-cal-month__task-row"
                  onClick={() => onSelectTask(task)}
                >
                  <div
                    className="cw-cal-month__task-bar"
                    style={{ backgroundColor: STATUS_BORDER_COLORS[task.status] }}
                  />
                  <div className="cw-cal-month__task-body">
                    <div className="cw-cal-month__task-top">
                      <span className="cw-cal-month__task-type">{task.serviceType}</span>
                      <span className="cw-cal-month__task-name">{task.recipientName}</span>
                    </div>
                    <div className="cw-cal-month__task-detail">
                      {task.startTime}-{task.endTime} · {task.locationShort}
                    </div>
                  </div>
                  <span
                    className="cw-cal-month__task-badge"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

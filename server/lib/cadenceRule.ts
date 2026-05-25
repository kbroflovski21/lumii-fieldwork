export interface CadenceRule {
  type: "weekly";
  days: number[];
}

export function parseCadenceRule(rule: string): CadenceRule | null {
  if (!rule) return null;
  const match = rule.match(/^WEEKLY:([0-6,]+)$/);
  if (!match) return null;
  const days = match[1].split(",").map(Number).sort();
  return { type: "weekly", days };
}

export function generateDates(rule: string, startDate: string, rangeDays: number): string[] {
  const parsed = parseCadenceRule(rule);
  if (!parsed) return [];

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + rangeDays);

  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor < end) {
    if (parsed.days.includes(cursor.getDay())) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

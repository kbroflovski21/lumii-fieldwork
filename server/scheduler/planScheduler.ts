import { prisma } from "../db/prisma";
import { generateDates } from "../lib/cadenceRule";

function genScheduleId() {
  return `schedule-${crypto.randomUUID().slice(0, 8)}`;
}

export async function rollForwardSchedules() {
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 28);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const plans = await prisma.servicePlan.findMany({
    where: { status: "active", cadenceRule: { not: "" } },
    include: {
      sopLinks: true,
      serviceObject: { select: { name: true, address: true, siteId: true, riskTags: true } },
    },
  });

  for (const plan of plans) {
    const latest = await prisma.serviceSchedule.findFirst({
      where: { servicePlanId: plan.id, status: { not: "cancelled" } },
      orderBy: { serviceDate: "desc" },
      select: { serviceDate: true },
    });

    const generateFrom = latest ? latest.serviceDate : plan.startDate;
    if (generateFrom >= horizonStr) continue;

    const startFrom = new Date(generateFrom);
    startFrom.setDate(startFrom.getDate() + 1);
    const startStr = startFrom.toISOString().slice(0, 10);

    const existingDates = new Set(
      (await prisma.serviceSchedule.findMany({
        where: { servicePlanId: plan.id, serviceDate: { gte: startStr } },
        select: { serviceDate: true },
      })).map(s => s.serviceDate)
    );

    const dates = generateDates(plan.cadenceRule, startStr,
      Math.ceil((horizon.getTime() - startFrom.getTime()) / 86400000));
    const newDates = dates.filter(d => !existingDates.has(d));
    if (newDates.length === 0) continue;

    const obj = plan.serviceObject;
    const tw = plan.preferredTimeWindow as any;
    const scheduleData = newDates.map(date => ({
      id: genScheduleId(),
      source: "service_plan" as const,
      servicePlanId: plan.id,
      serviceObjectId: plan.serviceObjectId,
      siteId: obj?.siteId ?? "site-001",
      serviceObjectName: obj?.name ?? "",
      serviceProject: plan.serviceProject,
      addressSnapshot: obj?.address ?? "",
      address: obj?.address ?? null,
      mapDisplayPoint: undefined,
      serviceDate: date,
      startTime: tw?.start ?? null,
      endTime: tw?.end ?? null,
      timeWindow: tw ?? {},
      assignedSocialWorkerId: plan.primarySocialWorkerId,
      assignedSocialWorkerName: plan.primarySocialWorkerName,
      status: "scheduled" as const,
      riskTags: obj?.riskTags ?? [],
    }));

    await prisma.serviceSchedule.createMany({ data: scheduleData });

    if (plan.sopLinks.length > 0) {
      const sopData = scheduleData.flatMap(sch =>
        plan.sopLinks.map(ps => ({ scheduleId: sch.id, sopId: ps.sopId, sopName: ps.sopName }))
      );
      await prisma.serviceScheduleSop.createMany({ data: sopData });
    }

    console.log(`[scheduler] plan ${plan.id}: generated ${newDates.length} new schedules`);
  }
}

export function startPlanScheduler() {
  console.log("[scheduler] plan scheduler started");
  rollForwardSchedules().catch(err => console.error("[scheduler] initial run failed:", err));
  setInterval(() => {
    rollForwardSchedules().catch(err => console.error("[scheduler] run failed:", err));
  }, 24 * 60 * 60 * 1000);
}

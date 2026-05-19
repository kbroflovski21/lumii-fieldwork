# Prisma ORM + MySQL Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace better-sqlite3 with Prisma Client + MySQL, using Prisma Migrate for schema management and Docker MySQL for testing.

**Architecture:** Install Prisma, define all 15 models in schema.prisma, create Docker MySQL test container, rewrite server/db layer to use PrismaClient singleton, convert all 8 route files from sync db.prepare() to async prisma.model.*, convert ChatDb, update seed, fix all tests.

**Tech Stack:** Prisma ORM, MySQL 8.0, Docker Compose, mysql2 (Prisma dependency), vitest, Playwright

---

### Task 1: Docker MySQL + Prisma Setup

**Files:**
- Create: `docker-compose.test.yml`
- Create: `prisma/schema.prisma`
- Create: `server/db/prisma.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `.env`

- [ ] **Step 1: Install Prisma and mysql2**

```bash
npm install prisma @prisma/client --save-dev
npm install @prisma/client
npm uninstall better-sqlite3 @types/better-sqlite3
```

- [ ] **Step 2: Create docker-compose.test.yml**

```yaml
# docker-compose.test.yml
services:
  mysql-test:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: test
      MYSQL_DATABASE: goldenyears_test
    ports:
      - "3307:3306"
    tmpfs:
      - /var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password
```

- [ ] **Step 3: Start Docker MySQL and verify**

```bash
docker compose -f docker-compose.test.yml up -d
# Wait for MySQL to be ready
until docker compose -f docker-compose.test.yml exec mysql-test mysqladmin ping -h localhost --silent 2>/dev/null; do sleep 1; done
echo "MySQL ready"
```

- [ ] **Step 4: Create .env file**

```
DATABASE_URL="mysql://root:test@localhost:3307/goldenyears_test?connection_limit=30&pool_timeout=10"
```

- [ ] **Step 5: Create prisma/schema.prisma with all 15 models**

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  org_admin
  site_operator
  service_supervisor
  careworker
}

enum UserStatus {
  active
  disabled
}

enum WorkerStatus {
  active
  disabled
  incomplete_profile
}

enum BadgeStatus {
  pending_activation
  available
  in_use
  offline
  low_battery
  sync_delayed
  lost
  disabled
}

enum Gender {
  female
  male
  unknown
}

enum EligibilityType {
  insurance
  government
  institution
  self_paid
}

enum SubscriptionStatus {
  none
  daily
  weekly
  monthly
  exception_only
}

enum PlanStatus {
  active
  paused
  archived
}

enum ExceptionKind {
  pause
  time_change
  worker_change
  skip
}

enum ScheduleSource {
  service_plan
  one_time
}

enum ScheduleStatus {
  scheduled
  assigned
  adjusted
  in_progress
  completed
  cancelled
  unassigned
}

enum ReviewStatus {
  needs_review
  confirmed
  info_incomplete
  exception_open
}

enum ExportStatus {
  not_ready
  exportable
  exported
  exported_with_flags
}

enum ChatRole {
  user
  assistant
}

model User {
  id           String     @id @db.VarChar(64)
  username     String     @unique @db.VarChar(255)
  passwordHash String     @map("password_hash") @db.VarChar(255)
  name         String     @db.VarChar(255)
  role         UserRole
  orgId        String     @default("org-001") @map("org_id") @db.VarChar(64)
  siteIds      Json       @default("[]") @map("site_ids")
  phone        String     @default("") @db.VarChar(64)
  status       UserStatus @default(active)
  createdBy    String?    @map("created_by") @db.VarChar(64)
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @default(now()) @updatedAt @map("updated_at")

  @@map("users")
}

model SocialWorker {
  id                       String       @id @db.VarChar(64)
  userId                   String       @map("user_id") @db.VarChar(64)
  name                     String       @db.VarChar(255)
  phone                    String       @default("") @db.VarChar(64)
  siteId                   String       @default("site-001") @map("site_id") @db.VarChar(64)
  workerType               String       @default("service_personnel") @map("worker_type") @db.VarChar(64)
  qualificationLabels      Json         @default("[]") @map("qualification_labels")
  status                   WorkerStatus @default(active)
  preferredBadgeId         String?      @map("preferred_badge_id") @db.VarChar(64)
  preferredBadgeDeviceCode String?      @map("preferred_badge_device_code") @db.VarChar(64)
  preferredBadgeStatus     String?      @map("preferred_badge_status") @db.VarChar(64)
  preferredBadgeLastSyncAt String?      @map("preferred_badge_last_sync_at") @db.VarChar(64)
  praiseCount              Int          @default(0) @map("praise_count")
  latestPraiseAt           String?      @map("latest_praise_at") @db.VarChar(64)
  latestPraiseExcerpt      String?      @map("latest_praise_excerpt") @db.Text
  createdAt                DateTime     @default(now()) @map("created_at")
  updatedAt                DateTime     @default(now()) @updatedAt @map("updated_at")

  @@map("social_workers")
}

model SmartBadge {
  id                    String      @id @db.VarChar(64)
  deviceCode            String      @unique @map("device_code") @db.VarChar(64)
  orgId                 String      @default("org-001") @map("org_id") @db.VarChar(64)
  siteId                String      @default("site-001") @map("site_id") @db.VarChar(64)
  siteName              String?     @map("site_name") @db.VarChar(255)
  status                BadgeStatus @default(pending_activation)
  batteryPercent        Int?        @map("battery_percent")
  activatedAt           String?     @map("activated_at") @db.VarChar(64)
  lastSyncAt            String?     @map("last_sync_at") @db.VarChar(64)
  lastRecordingAt       String?     @map("last_recording_at") @db.VarChar(64)
  preferredWorkerId     String?     @map("preferred_worker_id") @db.VarChar(64)
  preferredWorkerName   String?     @map("preferred_worker_name") @db.VarChar(255)
  recentServiceRecordIds Json       @default("[]") @map("recent_service_record_ids")
  createdAt             DateTime    @default(now()) @map("created_at")
  updatedAt             DateTime    @default(now()) @updatedAt @map("updated_at")

  @@map("smart_badges")
}

model ServiceObject {
  id                       String          @id @db.VarChar(64)
  name                     String          @db.VarChar(255)
  phone                    String?         @db.VarChar(64)
  age                      Int?
  gender                   Gender          @default(unknown)
  address                  String          @default("") @db.VarChar(500)
  mapDisplayPoint          Json?           @map("map_display_point")
  eligibilityType          EligibilityType @default(government) @map("eligibility_type")
  serviceProjects          Json            @default("[]") @map("service_projects")
  serviceFrequency         String?         @map("service_frequency") @db.VarChar(255)
  careNotes                Json            @default("[]") @map("care_notes")
  riskTags                 Json            @default("[]") @map("risk_tags")
  familySubscriptionSummary String         @default("none") @map("family_subscription_summary") @db.VarChar(64)
  latestInsightSummary     String?         @map("latest_insight_summary") @db.Text
  insightSummaries         Json            @default("[]") @map("insight_summaries")
  state                    String?         @default("normal") @db.VarChar(64)
  createdAt                DateTime        @default(now()) @map("created_at")
  updatedAt                DateTime        @default(now()) @updatedAt @map("updated_at")

  familyContacts  FamilyContact[]
  servicePlans    ServicePlan[]
  serviceSchedules ServiceSchedule[]

  @@map("service_objects")
}

model FamilyContact {
  id                 String             @id @db.VarChar(64)
  serviceObjectId    String             @map("service_object_id") @db.VarChar(64)
  name               String             @db.VarChar(255)
  relation           String             @default("") @db.VarChar(64)
  phone              String             @default("") @db.VarChar(64)
  subscriptionStatus SubscriptionStatus @default(none) @map("subscription_status")
  lastPushedAt       String?            @map("last_pushed_at") @db.VarChar(64)
  createdAt          DateTime           @default(now()) @map("created_at")

  serviceObject ServiceObject @relation(fields: [serviceObjectId], references: [id])

  @@map("family_contacts")
}

model ServicePlan {
  id                      String     @id @db.VarChar(64)
  serviceObjectId         String     @map("service_object_id") @db.VarChar(64)
  serviceProject          String     @map("service_project") @db.VarChar(255)
  cadenceRule             String     @default("") @map("cadence_rule") @db.VarChar(255)
  cadenceLabel            String     @default("") @map("cadence_label") @db.VarChar(255)
  preferredTimeWindow     Json       @default("{}") @map("preferred_time_window")
  startDate               String     @map("start_date") @db.VarChar(64)
  endDate                 String?    @map("end_date") @db.VarChar(64)
  primarySocialWorkerId   String?    @map("primary_social_worker_id") @db.VarChar(64)
  primarySocialWorkerName String?    @map("primary_social_worker_name") @db.VarChar(255)
  status                  PlanStatus @default(active)
  nextScheduleAt          String?    @map("next_schedule_at") @db.VarChar(64)
  createdAt               DateTime   @default(now()) @map("created_at")
  updatedAt               DateTime   @default(now()) @updatedAt @map("updated_at")

  serviceObject ServiceObject          @relation(fields: [serviceObjectId], references: [id])
  exceptions    ServicePlanException[]

  @@map("service_plans")
}

model ServicePlanException {
  id                         String        @id @db.VarChar(64)
  servicePlanId              String        @map("service_plan_id") @db.VarChar(64)
  kind                       ExceptionKind
  effectiveFrom              String        @map("effective_from") @db.VarChar(64)
  effectiveTo                String?       @map("effective_to") @db.VarChar(64)
  timeWindow                 Json?         @map("time_window")
  replacementSocialWorkerId  String?       @map("replacement_social_worker_id") @db.VarChar(64)
  note                       String?       @db.Text
  createdAt                  DateTime      @default(now()) @map("created_at")

  servicePlan ServicePlan @relation(fields: [servicePlanId], references: [id])

  @@map("service_plan_exceptions")
}

model ServiceSchedule {
  id                       String         @id @db.VarChar(64)
  source                   ScheduleSource @default(one_time)
  servicePlanId            String?        @map("service_plan_id") @db.VarChar(64)
  serviceObjectId          String         @map("service_object_id") @db.VarChar(64)
  serviceObjectName        String         @default("") @map("service_object_name") @db.VarChar(255)
  serviceProject           String         @default("") @map("service_project") @db.VarChar(255)
  addressSnapshot          String         @default("") @map("address_snapshot") @db.VarChar(500)
  address                  String?        @db.VarChar(500)
  mapDisplayPoint          Json?          @map("map_display_point")
  serviceDate              String         @map("service_date") @db.VarChar(64)
  startTime                String?        @map("start_time") @db.VarChar(64)
  endTime                  String?        @map("end_time") @db.VarChar(64)
  timeWindow               Json           @default("{}") @map("time_window")
  assignedSocialWorkerId   String?        @map("assigned_social_worker_id") @db.VarChar(64)
  assignedSocialWorkerName String?        @map("assigned_social_worker_name") @db.VarChar(255)
  status                   ScheduleStatus @default(scheduled)
  notes                    String?        @db.Text
  serviceRecordId          String?        @map("service_record_id") @db.VarChar(64)
  planExceptionApplied     Int            @default(0) @map("plan_exception_applied")
  riskTags                 Json           @default("[]") @map("risk_tags")
  adjustmentHistory        Json           @default("[]") @map("adjustment_history")
  createdAt                DateTime       @default(now()) @map("created_at")
  updatedAt                DateTime       @default(now()) @updatedAt @map("updated_at")

  serviceObject ServiceObject @relation(fields: [serviceObjectId], references: [id])

  @@map("service_schedules")
}

model ServiceRecord {
  id                   String       @id @db.VarChar(64)
  serviceDate          String       @map("service_date") @db.VarChar(64)
  startTime            String       @map("start_time") @db.VarChar(64)
  endTime              String       @map("end_time") @db.VarChar(64)
  durationMinutes      Int          @default(0) @map("duration_minutes")
  socialWorkerId       String?      @map("social_worker_id") @db.VarChar(64)
  socialWorkerName     String?      @map("social_worker_name") @db.VarChar(255)
  serviceObjectId      String?      @map("service_object_id") @db.VarChar(64)
  serviceObjectName    String?      @map("service_object_name") @db.VarChar(255)
  familyContactIds     Json         @default("[]") @map("family_contact_ids")
  badgeId              String       @map("badge_id") @db.VarChar(64)
  smartBadgeId         String?      @map("smart_badge_id") @db.VarChar(64)
  serviceProject       String?      @map("service_project") @db.VarChar(255)
  assignmentConfidence Float        @default(0.5) @map("assignment_confidence")
  reviewStatus         ReviewStatus @default(needs_review) @map("review_status")
  exportStatus         ExportStatus @default(not_ready) @map("export_status")
  locationEvidence     Json?        @map("location_evidence")
  serviceExceptions    Json         @default("[]") @map("service_exceptions")
  serviceItems         Json         @default("[]") @map("service_items")
  exceptionTags        Json         @default("[]") @map("exception_tags")
  missingFields        Json         @default("[]") @map("missing_fields")
  audioAssetId         String?      @map("audio_asset_id") @db.VarChar(64)
  transcriptId         String?      @map("transcript_id") @db.VarChar(64)
  structuredSummary    String?      @map("structured_summary") @db.Text
  generatedSummary     String?      @map("generated_summary") @db.Text
  exportHistory        Json         @default("[]") @map("export_history")
  createdAt            DateTime     @default(now()) @map("created_at")
  updatedAt            DateTime     @default(now()) @updatedAt @map("updated_at")

  audioAssets AudioAsset[]
  transcripts Transcript[]

  @@map("service_records")
}

model AudioAsset {
  id              String @id @db.VarChar(64)
  recordId        String @map("record_id") @db.VarChar(64)
  playbackUrl     String? @map("playback_url") @db.VarChar(500)
  durationSeconds Int    @default(0) @map("duration_seconds")
  capturedByBadgeId String? @map("captured_by_badge_id") @db.VarChar(64)
  uploadedAt      String? @map("uploaded_at") @db.VarChar(64)
  retentionLabel  String? @map("retention_label") @db.VarChar(64)

  record ServiceRecord @relation(fields: [recordId], references: [id])

  @@map("audio_assets")
}

model Transcript {
  id         String  @id @db.VarChar(64)
  recordId   String  @map("record_id") @db.VarChar(64)
  language   String  @default("zh-CN") @db.VarChar(16)
  text       String  @default("") @db.Text
  confidence Float?
  segments   Json    @default("[]")

  record ServiceRecord @relation(fields: [recordId], references: [id])

  @@map("transcripts")
}

model HomeSummary {
  id                       String   @id @default("current") @db.VarChar(64)
  summaryDate              String   @map("summary_date") @db.VarChar(64)
  totalScheduledServices   Int      @default(0) @map("total_scheduled_services")
  unassignedServices       Int      @default(0) @map("unassigned_services")
  activeSocialWorkers      Int      @default(0) @map("active_social_workers")
  onlineBadges             Int      @default(0) @map("online_badges")
  recordsNeedReview        Int      @default(0) @map("records_need_review")
  exportableServiceRecords Int      @default(0) @map("exportable_service_records")
  highlights               Json     @default("[]")
  activities               Json     @default("[]")
  recommendedActions       Json     @default("[]") @map("recommended_actions")
  permissionState          String   @default("full") @map("permission_state") @db.VarChar(64)
  updatedAt                DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("home_summary")
}

model ChatMessage {
  id        Int      @id @default(autoincrement())
  agentId   String   @map("agent_id") @db.VarChar(64)
  sessionKey String  @map("session_key") @db.VarChar(255)
  role      ChatRole
  content   String   @db.Text
  msgType   String   @default("text") @map("msg_type") @db.VarChar(64)
  cardData  String?  @map("card_data") @db.Text
  createdAt DateTime @default(now()) @map("created_at")

  @@index([agentId, sessionKey, id(sort: Desc)], name: "idx_chat_agent_session")
  @@map("chat_messages")
}
```

- [ ] **Step 6: Create server/db/prisma.ts (PrismaClient singleton)**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 7: Update tsconfig.json — add server to include**

Add `"server"` to the `include` array so Prisma-generated types are visible:

```json
"include": ["src", "tests", "server", "prisma"]
```

- [ ] **Step 8: Generate Prisma Client and run initial migration**

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Expected: Creates `prisma/migrations/<timestamp>_init/migration.sql` and applies it to Docker MySQL.

- [ ] **Step 9: Verify migration applied**

```bash
npx prisma migrate status
```

Expected: Shows 1 migration applied, database in sync.

- [ ] **Step 10: Commit**

```bash
git add prisma/ server/db/prisma.ts docker-compose.test.yml .env package.json package-lock.json tsconfig.json
git commit -m "feat: prisma schema + docker mysql + initial migration"
```

---

### Task 2: Seed with Prisma Client

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma.seed config)

- [ ] **Step 1: Add prisma seed config to package.json**

Add to package.json top level:

```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

- [ ] **Step 2: Create prisma/seed.ts**

This is a full rewrite of `server/db/seed.ts` using Prisma Client API. The seed data is identical — only the API changes from `db.prepare().run()` to `prisma.model.create()`.

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Check if already seeded
  const workerCount = await prisma.socialWorker.count();
  if (workerCount > 0) {
    const record = await prisma.serviceRecord.findFirst();
    if (record) {
      const items = record.serviceItems as any[];
      if (items.length > 0 && items[0]?.startTime) {
        console.log("[seed] Data already seeded with latest format");
        return;
      }
    }
    // Old format — clean and re-seed
    console.log("[seed] Detected old data format, re-seeding...");
    await prisma.homeSummary.deleteMany();
    await prisma.transcript.deleteMany();
    await prisma.audioAsset.deleteMany();
    await prisma.serviceRecord.deleteMany();
    await prisma.serviceSchedule.deleteMany();
    await prisma.servicePlanException.deleteMany();
    await prisma.servicePlan.deleteMany();
    await prisma.familyContact.deleteMany();
    await prisma.serviceObject.deleteMany();
    await prisma.smartBadge.deleteMany();
    await prisma.socialWorker.deleteMany();
  }

  // Seed social workers (copy exact data from old seed.ts lines 51-100)
  // Seed smart badges (copy exact data from old seed.ts lines 101-140)
  // Seed service objects (copy exact data from old seed.ts lines 141-180)
  // ... (all demo data using prisma.model.createMany)

  // NOTE TO IMPLEMENTER: Copy ALL seed data objects from server/db/seed.ts
  // and convert each ins("table", [...]) call to:
  //   await prisma.model.createMany({ data: [...] })
  // JSON fields that were JSON.stringify'd are now passed as plain objects.
  // Boolean fields that were 0/1 are now true/false.

  // Seed default users
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const hash = (pw: string) => bcrypt.hashSync(pw, 10);
    await prisma.user.createMany({
      data: [
        { id: "user-admin-001", username: "admin", passwordHash: hash("admin123"), name: "系统管理员", role: "org_admin", orgId: "org-001", siteIds: ["site-001"], phone: "13800000000" },
        { id: "user-op-001", username: "operator", passwordHash: hash("oper123"), name: "站点运营员", role: "site_operator", orgId: "org-001", siteIds: ["site-001"], phone: "13800000001" },
        { id: "user-sup-001", username: "supervisor", passwordHash: hash("super123"), name: "服务主管", role: "service_supervisor", orgId: "org-001", siteIds: ["site-001"], phone: "13800000002" },
      ],
    });
    console.log("[seed] Seeded 3 default users");
  }

  console.log("[seed] Database seeded with demo data");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Run seed and verify**

```bash
npx prisma db seed
```

Expected: "Database seeded with demo data"

- [ ] **Step 4: Verify data in MySQL**

```bash
docker compose -f docker-compose.test.yml exec mysql-test mysql -uroot -ptest goldenyears_test -e "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM social_workers;"
```

Expected: 3 users, 4 social workers.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: prisma seed with demo data"
```

---

### Task 3: Rewrite server/db/chat.ts with Prisma

**Files:**
- Modify: `server/db/chat.ts`

- [ ] **Step 1: Rewrite ChatDb to use Prisma Client**

```typescript
import { prisma } from "./prisma";
import type { PersistedMessage } from "../ws/protocol";

export class ChatDb {
  async migrate(): Promise<void> {
    // Prisma Migrate handles schema — no-op
  }

  async insert(
    agentId: string, sessionKey: string, role: "user" | "assistant",
    content: string, msgType = "text", cardData?: string
  ): Promise<number> {
    const msg = await prisma.chatMessage.create({
      data: { agentId, sessionKey, role, content, msgType, cardData: cardData ?? null },
    });
    return msg.id;
  }

  async getRecent(agentId: string, sessionKey: string, limit: number): Promise<PersistedMessage[]> {
    const rows = await prisma.chatMessage.findMany({
      where: { agentId, sessionKey },
      orderBy: { id: "desc" },
      take: limit,
    });
    return rows.reverse().map(r => ({
      id: r.id, role: r.role, content: r.content,
      msgType: r.msgType, cardData: r.cardData ?? undefined,
      createdAt: r.createdAt.toISOString(),
    })) as PersistedMessage[];
  }

  async getBefore(agentId: string, sessionKey: string, beforeId: number, limit: number) {
    const rows = await prisma.chatMessage.findMany({
      where: { agentId, sessionKey, id: { lt: beforeId } },
      orderBy: { id: "desc" },
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit).reverse().map(r => ({
      id: r.id, role: r.role, content: r.content,
      msgType: r.msgType, cardData: r.cardData ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }));
    return { messages, hasMore };
  }

  async getLastMessages(agentId: string, sessionKey: string, count: number) {
    const rows = await prisma.chatMessage.findMany({
      where: { agentId, sessionKey },
      orderBy: { id: "desc" },
      take: count,
      select: { role: true, createdAt: true },
    });
    return rows.map(r => ({ role: r.role, timestamp: r.createdAt.toISOString() }));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/db/chat.ts
git commit -m "refactor: ChatDb uses Prisma Client"
```

---

### Task 4: Rewrite server/routes/helpers.ts

**Files:**
- Modify: `server/routes/helpers.ts`

- [ ] **Step 1: Remove getDb import, simplify helpers**

With Prisma, JSON columns are auto-parsed and field names are already camelCase. Remove `rowToJson`, `rowToCamel`, `toApiShape`, `camelToSnake`, `snakeToCamel`. Keep `genId`, `jsonParse`, `withOperationalState`.

```typescript
import { randomUUID } from "crypto";

export function genId(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function jsonParse(val: any, fallback: any = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

const operationalState = { isLoading: false, permission: "full" as const };

export function withOperationalState(data: any) {
  return { ...data, operationalState };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/helpers.ts
git commit -m "refactor: simplify helpers — remove SQLite row converters"
```

---

### Task 5: Rewrite all route files (async + Prisma)

**Files:**
- Modify: `server/routes/auth.ts`
- Modify: `server/routes/admin.ts`
- Modify: `server/routes/home.ts`
- Modify: `server/routes/socialWorkers.ts`
- Modify: `server/routes/smartBadges.ts`
- Modify: `server/routes/serviceObjects.ts`
- Modify: `server/routes/serviceSchedules.ts`
- Modify: `server/routes/serviceRecords.ts`

For every route file, the pattern is:
1. Replace `import { getDb } from "../db/init"` with `import { prisma } from "../db/prisma"`
2. Change every handler from `(req, res) => { ... }` to `async (req, res) => { ... }`
3. Replace `db.prepare(sql).get(params)` with `await prisma.model.findUnique/findFirst(...)`
4. Replace `db.prepare(sql).all(params)` with `await prisma.model.findMany(...)`
5. Replace `db.prepare(sql).run(params)` (INSERT) with `await prisma.model.create(...)`
6. Replace `db.prepare(sql).run(params)` (UPDATE) with `await prisma.model.update(...)`
7. Replace `db.prepare(sql).run(params)` (DELETE) with `await prisma.model.delete(...)`
8. Remove all `JSON.parse()` / `JSON.stringify()` for Json fields (Prisma handles it)
9. Remove all `rowToCamel()` / `toApiShape()` calls (Prisma returns camelCase)

- [ ] **Step 1: Rewrite auth.ts**

Replace `getDb` import with `prisma` import. Convert all 4 handlers to async + Prisma:

- `POST /auth/login`: `prisma.user.findUnique({ where: { username } })`
- `GET /auth/me`: `prisma.user.findUnique({ where: { id } })`
- `POST /auth/create-careworker-account`: `prisma.user.findUnique()` + `prisma.user.create()`
- `PATCH /auth/change-password`: `prisma.user.findUnique()` + `prisma.user.update()`

Note: `datetime('now')` in UPDATE becomes automatic via `@updatedAt`.
Note: `siteIds` is now `Json` type — no need for `JSON.parse(row.site_ids)`.

- [ ] **Step 2: Rewrite admin.ts**

Convert all 5 handlers:

- `GET /admin/users`: `prisma.user.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } })`
- `POST /admin/users`: `prisma.user.create({ data: { ... } })`
- `PATCH /admin/users/:id`: `prisma.user.findFirst()` + `prisma.user.update({ where: { id }, data: { ...updates } })`
- `POST /admin/users/:id/reset-password`: `prisma.user.findFirst()` + `prisma.user.update()`
- `DELETE /admin/users/:id`: `prisma.user.findFirst()` + `prisma.user.delete()`

Note: Dynamic SET clause becomes a simple `data` object with only defined fields.

- [ ] **Step 3: Rewrite home.ts**

Single handler:
- `GET /site-operations/home`: `prisma.homeSummary.findUnique({ where: { id: "current" } })`

- [ ] **Step 4: Rewrite socialWorkers.ts**

Convert all 5 handlers. Key change: `toApiShape()` calls removed since Prisma returns camelCase + parsed JSON.

- [ ] **Step 5: Rewrite smartBadges.ts**

Convert all 5 handlers. `datetime('now')` in INSERT replaced by Prisma `@default(now())`.

- [ ] **Step 6: Rewrite serviceObjects.ts**

Convert all 9 handlers + 2 helper functions (`getPlanSummaries`, `getFamilyContacts`). These become Prisma `findMany` with `include` or `_count`.

- [ ] **Step 7: Rewrite serviceSchedules.ts**

Convert all 4 handlers. The `adjustment_history` append pattern becomes:
```typescript
const current = await prisma.serviceSchedule.findUnique({ where: { id } });
const history = [...(current.adjustmentHistory as any[]), newEntry];
await prisma.serviceSchedule.update({ where: { id }, data: { adjustmentHistory: history } });
```

- [ ] **Step 8: Rewrite serviceRecords.ts**

Convert all 6 handlers. The JOIN-like pattern in GET /service-records (loading records + audio + transcripts + objects + badges separately) can be simplified with Prisma `include`:
```typescript
const records = await prisma.serviceRecord.findMany({
  include: { audioAssets: true, transcripts: true },
  orderBy: { serviceDate: "desc" },
});
```

- [ ] **Step 9: Commit all route changes**

```bash
git add server/routes/
git commit -m "refactor: all routes use Prisma Client (async)"
```

---

### Task 6: Rewrite server/index.ts

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Replace DB init with Prisma**

Remove:
```typescript
import { getDb, closeDb } from "./db/init";
import { seedDatabase } from "./db/seed";
```

Replace with:
```typescript
import { prisma } from "./db/prisma";
```

Change ChatDb instantiation:
```typescript
// Before: const chatDb = new ChatDb(getDb()); chatDb.migrate();
const chatDb = new ChatDb();
```

Remove `mkdirSync(join(__dirname, "../data"), ...)` (no more data/ directory).

Remove `getDb()` and `seedDatabase()` calls.

Change graceful shutdown:
```typescript
// Before: closeDb();
await prisma.$disconnect();
```

- [ ] **Step 2: Make ChatDb methods awaited in pool.ts**

Update `server/ws/pool.ts` — all `chatDb.method()` calls must be `await`ed since ChatDb is now async. The pool already uses async patterns for WebSocket, so this is straightforward.

- [ ] **Step 3: Commit**

```bash
git add server/index.ts server/ws/pool.ts
git commit -m "refactor: server init uses Prisma, ChatDb async"
```

---

### Task 7: Delete old SQLite files

**Files:**
- Delete: `server/db/init.ts`
- Delete: `server/db/schema.sql`
- Delete: `server/db/seed.ts`
- Delete: `data/fieldwork.db`

- [ ] **Step 1: Remove old files**

```bash
rm server/db/init.ts server/db/schema.sql server/db/seed.ts
rm -f data/fieldwork.db
```

- [ ] **Step 2: Verify no remaining references to old files**

```bash
grep -r "better-sqlite3\|getDb\|from.*db/init\|from.*db/seed\|fieldwork.db" server/ tests/ --include="*.ts" | grep -v node_modules
```

Expected: No matches.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove SQLite files (init.ts, schema.sql, seed.ts, fieldwork.db)"
```

---

### Task 8: Fix unit tests

**Files:**
- Modify: `tests/db/chat.test.ts`
- Modify: `tests/auth/login.test.ts`
- Modify: `tests/auth/admin.test.ts`
- Modify: `tests/auth/careworker-account.test.ts`
- Modify: `tests/auth/change-password.test.ts`
- Modify: `tests/auth/devtoken-removed.test.ts`
- Modify: all other test files that reference getDb/seedDatabase

- [ ] **Step 1: Create test setup helper**

Create `tests/helpers/prisma-test.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();

export async function setupTestDb() {
  // Run migrations on test DB
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: "inherit",
  });
}

export async function cleanTestDb() {
  // Truncate all tables in reverse dependency order
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  const tables = ["chat_messages", "home_summary", "transcripts", "audio_assets",
    "service_records", "service_schedules", "service_plan_exceptions", "service_plans",
    "family_contacts", "service_objects", "smart_badges", "social_workers", "users"];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${t}`);
  }
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

export async function disconnectTestDb() {
  await prisma.$disconnect();
}

export { prisma };
```

- [ ] **Step 2: Rewrite chat.test.ts**

Replace in-memory SQLite `new Database(":memory:")` with Prisma Client connected to Docker MySQL. All ChatDb method calls become `await`.

- [ ] **Step 3: Rewrite auth test files**

Replace `getDb()` + `seedDatabase()` with `cleanTestDb()` + seed via Prisma. All `db.prepare()` assertions become `prisma.user.findUnique()` etc.

- [ ] **Step 4: Run all unit tests**

```bash
DATABASE_URL="mysql://root:test@localhost:3307/goldenyears_test?connection_limit=5" npx vitest run
```

Expected: All 248 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/
git commit -m "test: all unit tests migrated to Prisma + Docker MySQL"
```

---

### Task 9: Fix E2E tests

**Files:**
- Modify: `tests/e2e/auth-e2e.spec.ts`
- Modify: any other E2E test files

- [ ] **Step 1: Ensure E2E tests use Docker MySQL**

The E2E tests hit the running server via HTTP. Ensure the server is started with `DATABASE_URL` pointing to Docker MySQL:

```bash
DATABASE_URL="mysql://root:test@localhost:3307/goldenyears_test?connection_limit=30" npx prisma migrate deploy
DATABASE_URL="mysql://root:test@localhost:3307/goldenyears_test?connection_limit=30" npx prisma db seed
DATABASE_URL="mysql://root:test@localhost:3307/goldenyears_test?connection_limit=30" PORT=3004 npx tsx server/index.ts &
sleep 3
npx playwright test
```

- [ ] **Step 2: Run E2E tests and fix any issues**

```bash
E2E_BASE_URL=http://localhost:3004 npx playwright test
```

Expected: All E2E tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/
git commit -m "test: E2E tests pass on Docker MySQL"
```

---

### Task 10: Final cleanup and verification

- [ ] **Step 1: Remove better-sqlite3 from package.json if not already done**

```bash
npm uninstall better-sqlite3 @types/better-sqlite3
```

- [ ] **Step 2: Full test run**

```bash
# Start Docker MySQL
docker compose -f docker-compose.test.yml up -d
# Wait for MySQL
until docker compose -f docker-compose.test.yml exec mysql-test mysqladmin ping -h localhost --silent 2>/dev/null; do sleep 1; done

# Run migrations + seed
DATABASE_URL="mysql://root:test@localhost:3307/goldenyears_test?connection_limit=30" npx prisma migrate deploy
DATABASE_URL="mysql://root:test@localhost:3307/goldenyears_test?connection_limit=30" npx prisma db seed

# Unit tests
DATABASE_URL="mysql://root:test@localhost:3307/goldenyears_test?connection_limit=5" npx vitest run

# E2E tests
DATABASE_URL="mysql://root:test@localhost:3307/goldenyears_test?connection_limit=30" PORT=3004 npx tsx server/index.ts &
sleep 3
E2E_BASE_URL=http://localhost:3004 npx playwright test
kill %1
```

Expected: All unit tests (248) + all E2E tests pass.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Production build**

```bash
npx vite build
```

Expected: Build succeeds.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: prisma + mysql migration complete — all tests green"
git push origin main
```

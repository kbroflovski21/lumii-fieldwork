# Phase 1: SOP Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** Replace mock SOP data with real database-backed CRUD, structured form editing for org_admin, and processor reading real SOPs from API.

**Architecture:** New Prisma models (Sop, SopStep) → REST API with org_admin auth → SupervisorContent rewrite with structured form → Processor fetches SOPs on recording start. Service-type SOPs carry keywords for future dynamic matching.

**Tech Stack:** Prisma/MySQL, Express, React 19, Go (processor)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | MODIFY | Add Sop + SopStep models |
| `prisma/seed.ts` | MODIFY | Seed default SOPs |
| `server/routes/sops.ts` | CREATE | CRUD API endpoints |
| `server/index.ts` | MODIFY | Mount SOP routes |
| `src/supervisor/SupervisorPage.tsx` | REWRITE | Structured form editing |
| `processor/internal/apiclient/client.go` | MODIFY | Add FetchSOPs method |
| `processor/internal/event/orchestrator.go` | MODIFY | Fetch real SOPs on recording start |

---

## Task 1: Prisma Schema — Sop + SopStep models

Add to `prisma/schema.prisma`:

```prisma
enum SopType {
  general
  service
}

model Sop {
  id             String   @id @db.VarChar(64)
  name           String   @db.VarChar(255)
  type           SopType  @default(service)
  description    String?  @db.Text
  keywords       Json     @default("[]")   // trigger keywords for service SOPs
  exampleDialogue String? @map("example_dialogue") @db.Text
  version        Int      @default(1)
  orgId          String   @default("org-001") @map("org_id") @db.VarChar(64)
  status         String   @default("active") @db.VarChar(32)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @default(now()) @updatedAt @map("updated_at")

  steps SopStep[]

  @@map("sops")
}

model SopStep {
  id          String @id @db.VarChar(64)
  sopId       String @map("sop_id") @db.VarChar(64)
  sortOrder   Int    @default(0) @map("sort_order")
  name        String @db.VarChar(255)
  description String @default("") @db.Text
  required    Boolean @default(true)

  sop Sop @relation(fields: [sopId], references: [id], onDelete: Cascade)

  @@map("sop_steps")
}
```

## Task 2: Seed default SOPs

Seed general SOP (通用规范) + service SOPs (助餐, 助浴, 探访关爱, 健康监测, etc.) with steps and keywords.

## Task 3: API Routes — server/routes/sops.ts

Endpoints (org_admin only):
- GET /api/sops — list all SOPs (with steps)
- GET /api/sops/:id — single SOP with steps
- POST /api/sops — create SOP with steps
- PATCH /api/sops/:id — update SOP fields + steps (full replace)
- DELETE /api/sops/:id — soft delete (status = 'archived')
- GET /api/sops/by-keywords?text=xxx — match SOPs by keywords (for processor)

The by-keywords endpoint: checks if any keyword in any service SOP appears in the text. Returns matched SOPs. This is the internal endpoint processor calls.

## Task 4: Mount routes in server/index.ts

Add import + mount under optAuth (read for all authenticated) + requireAuth for write ops.

## Task 5: SupervisorContent rewrite — structured form

Replace the current mock-based markdown editor with:
- Left: SOP list (general section + service section)
- Right: When SOP selected, show structured form:
  - Name, type, description (text inputs)
  - Keywords (tag input, comma separated) — only for service type
  - Steps list: each step = name + description, drag to reorder, add/remove
  - Save/Cancel buttons
  - Version display (auto-increment on save)
- Keep existing CSS class structure where possible

## Task 6: Processor — fetch real SOPs

- Add `FetchSOPs()` method to apiclient that calls GET /api/sops
- Add `FetchSOPsByKeywords(text)` that calls GET /api/sops/by-keywords?text=xxx
- In orchestrator OnRecordingStart: fetch all general SOPs + use session.ServiceProject to pre-load matching service SOP
- In realtimeCheck: after new transcript, call FetchSOPsByKeywords to dynamically add matched service SOPs

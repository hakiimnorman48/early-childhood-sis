# SIS App — State of the App
**Version:** 0.3  
**Date:** 2026-06-21  
**Author:** Hakiim Norman  
**Git tag:** `v0.1.0` (pre-revision baseline); `v0.2` → HEAD `8ff4914`; current HEAD: see git log  
**Status:** In active development — grading data fixed, correct indicators added

---

## 1. What This Document Is

A point-in-time summary of the SIS app as of version 0.2. It records what has been built, what decisions have been made, and what remains deferred — so the next development session can pick up with full context rather than re-deriving it from the PRD and revision notes.

**Source documents:**
- PRD: `prd-early-childhood-sis-2026-05-29.md`
- Revision punch list: `sis-mock-revision-notes-2026-06-15.md`

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.2.9 (App Router) |
| Styling | Tailwind CSS v4 |
| Database | SQLite via `better-sqlite3` |
| ORM | Prisma 7 with `PrismaBetterSqlite3` adapter |
| Auth | NextAuth v5 beta — JWT strategy, split `auth.config.ts` + `auth.ts` |
| UI icons | lucide-react |
| Password hashing | bcryptjs (cost 12) |
| Routing guard | `proxy.ts` (Next.js 16 uses this instead of `middleware.ts`) |
| Prisma config | `prisma.config.ts` (client output → `app/generated/prisma/`) |

---

## 3. Roles & Access

| Role | Access |
|------|--------|
| `admin` | Full access to all admin pages, can view per-student grading, manage accounts/classes/students/periods |
| `teacher` | Grading for assigned domains only (scoped by `classTeacher` + `domainAssignment`), report card preview |
| `parent` | Read-only: My Child page, report card view & print; can only see their own child's data |

---

## 4. Feature Status

### 4.1 Authentication
- [x] Email + password login for all three roles
- [x] Session via JWT (NextAuth v5 beta)
- [x] Route protection via `proxy.ts`
- [x] Role-based redirects on login

### 4.2 Admin — Accounts
- [x] List all users (teachers, parents, admins)
- [x] Create account (name, email, password, role) — modal with server action
- [x] Edit account (name, email, role, active/inactive toggle, optional password reset) — modal
- [ ] Invite email on account creation — deferred (Phase 2c per PRD)

### 4.3 Admin — Classes
- [x] List classes with teacher assignments and student count
- [x] Create class (name, grade) — modal
- [x] Edit class (name, grade) — modal
- [ ] Assign teachers to classes via UI — currently done via seeding/direct DB

### 4.4 Admin — Students
- [x] List students with class, parent phone, and parent address
- [x] Edit student data (full name, nickname, class, date of birth) — tabbed modal
- [x] Edit parent contact (phone, address) — second tab in same modal
- [x] Link to per-student grading view
- [ ] Add new student via UI — removed during rewrite; not in punch list, may need restoring
- [ ] CSV bulk import — Phase 2c

### 4.5 Admin — Per-Student Grading View (`/admin/students/[studentId]`)
- [x] Read-only view of all domain scores, P/C/B grades, domain narratives
- [x] Shows published/draft/not-started status badge
- [x] Shows domain-complete badges (green header) for domains marked complete
- [x] Shows overall summary comment
- [x] "Preview & Export Report Card" link → teacher report card route

### 4.6 Admin — Grading Periods
- [x] List periods (name, start/end dates, active status)
- [x] Create period — modal exists
- [x] "Set Active" button visible in UI — **not yet wired up** (no server action)
- [ ] Set Active server action — not yet implemented

### 4.7 Teacher — Gradebook
- [x] Class roster filtered to teacher's assigned class(es)
- [x] Per-student grading page scoped to teacher's assigned domains

### 4.8 Teacher — Per-Student Grading (`/teacher/students/[studentId]`)
- [x] Score entry (0–10) per indicator, rounded to nearest 0.5 on blur and on save
- [x] Live P/C/B preview badge updates as score is typed
- [x] Narrative textarea per domain (Keterangan guru) — feeds report card
- [x] English domain: radio button level selector (a/b/c/d) per skill
- [x] "Mark Domain Complete & Save Draft" button per standard domain — persists to `DomainCompletion` table, turns card green
- [x] Overall summary comment (Rangkuman Perkembangan Anak) — required for publish
- [x] Save Draft (saves without publishing to parents)
- [x] Publish Report Card (publishes; parents can see full data)
- [x] Re-publish (update after already published)
- [ ] Publish blocking enforcement (all scores + all comments present) — not yet enforced at server action level; PRD §5.1.3 requires this

### 4.9 Teacher — Report Card Preview (`/teacher/students/[studentId]/report-card`)
- [x] Full compiled report card view in browser
- [x] Print/PDF export — fixed print CSS (A4 portrait, color preservation, no clipping)
- [x] Shows all domains, P/C/B per indicator, English section, attendance, overall comment
- [x] Signature block

### 4.10 Parent — My Child (`/parent`)
- [x] Child header (name, nickname, class, grade, age, overall average score, active period)
- [x] Report card download banner (shown when report is published for active period)
- [x] Overall summary comment (Rangkuman Perkembangan Anak)
- [x] Competency overview circles — average per domain with P/C/B badge
- [x] Per-domain skill breakdown — individual P/C/B badge per skill (only shown when report published)
- [x] Teacher narrative per domain (Keterangan guru)
- [x] English domain section — code + level description per skill
- [x] P/C/B scale legend in Indonesian
- [x] Attendance summary (Hadir / Sakit / Alpa / Izin)

### 4.11 Parent — Report Card View (`/parent/reports/view/[periodId]`)
- [x] Full report card view (same compiled format as teacher preview)
- [x] Print/PDF export — same print CSS fix applied

---

## 5. Grading Scale — Confirmed Decision (D1)

**Settled: P / C / B — 3 levels only. No B+ level.**

| 0–10 Score | Code | Indonesian | Meaning |
|-----------|------|-----------|---------|
| 0–3 | **P** | Pengenalan | Introduction / Emerging |
| 4–6 | **C** | Cukup | Adequate / Developing |
| 7–10 | **B** | Baik | Good / Proficient |

This is standardized across:
- `lib/utils.ts` — `scoreToColor`, `scoreToLabel`, `scoreToCode`
- Grading form preview badges
- Parent My Child page — legend and badges
- Admin grading view — badge styles

---

## 6. Database Schema — Key Models

| Model | Purpose |
|-------|---------|
| `User` | All accounts (admin/teacher/parent); includes `phone`, `address` fields added in v0.2 |
| `Student` | Student profile, linked to class and school |
| `Class` | Class group, linked to school |
| `ClassTeacher` | Many-to-many: teacher↔class, with `isHomeroom` flag |
| `CompetencyArea` | Domain (e.g. Bahasa, Matematika); `customScale` flag for English |
| `Skill` | Individual indicator under a domain, ordered |
| `DomainAssignment` | Which teacher owns which domain, per class + period |
| `ProgressEntry` | Score (0–10) + mapped code (P/C/B) + narrative comment, per student + skill + period |
| `StudentPeriodSummary` | Overall comment + published flag, per student + period |
| `DomainCompletion` | Tracks which domains a teacher has marked complete, per student + domain + period |
| `Period` | Reporting period, with `isActive` flag |
| `AttendanceRecord` | Daily attendance per student, per period |

**Latest migration:** `20260615175659_add_address_and_domain_completion`  
Adds: `address String?` on `User`; new `DomainCompletion` table.

---

## 7. Open Decisions — Status

| ID | Decision | Status |
|----|----------|--------|
| D1 | Grading scale: P/C/B vs P/C/B/B+ | **Resolved** — P/C/B (3 levels) |
| D2 | Changelog / audit log feature | **Deferred** — build in a later version once app is finalized; admin-only visibility |
| D3 | My Child page spec | **Resolved** — per-skill breakdown, teacher narratives, report card download link |
| D4 | Grading Periods storage model | **Resolved** — uses `period_id` FK throughout (already the implemented model) |

---

## 8. Known Gaps (Not in Punch List, Noticed During Build)

| Item | Notes |
|------|-------|
| "Set Active" button on Grading Periods | Button exists in UI but has no server action wired up |
| "Add Student" button | Was present before; removed during student page rewrite; not in punch list but may be needed |
| Publish blocking | PRD §5.1.3 requires blocking publish if scores or comments are missing; not yet enforced at the server action level |
| Invite email on account creation | Not implemented; PRD §10 lists it as a notification trigger |

---

## 9. Deferred Features (By Phase)

| Feature | Phase | Notes |
|---------|-------|-------|
| Changelog / audit log | After v0.2 finalization | Admin-only; log grade edits, domain-complete events, publish events, account changes |
| Email notifications (publish event) | Phase 2c | Resend or SendGrid |
| AI teacher insights (at-risk, trend) | Phase 2a | OpenAI GPT-4o |
| AI parent narrative | Phase 2b | After teacher-facing AI validated |
| Photo/media attachments | Phase 2b | On progress entries |
| CSV bulk import for students | Phase 2c | |
| School announcements board | Phase 2c | |
| 2FA for teachers and admins | Phase 2c | |
| Multi-tenancy / SaaS | Phase 3 | All records already carry `schoolId` |

---

## 10. Git Version History

| Tag / Commit | Description |
|--------------|-------------|
| `eca74f7` | Initial Next.js scaffold |
| `9786bcc` | Full initial mock — auth, grading, report cards (v0.1) |
| `v0.1.0` | Tag marking pre-revision state |
| `8ff4914` | All punch-list items from `sis-mock-revision-notes-2026-06-15.md` applied (v0.2) |
| v0.3 HEAD | Score rounding fix + correct grading indicators for Motorik, Matematika, English (v0.3) |

---

## 11. v0.3 Changes (2026-06-21)

- **Score rounding fix:** All 188 `ProgressEntry` records in the DB were updated — scores now rounded to nearest 0.5 (was rounding to 1 decimal). Fixes the form `step="0.5"` browser validation that blocked re-publishing. `seed.ts` `rand()` fixed to produce 0.5-aligned values going forward.
- **Motorik dan Musik indicators:** All 7 skill names updated in DB and seed to the official document indicators (e.g., "Melempar/menangkap/menendang...", "Berputar kemudian berhenti tanpa terjatuh.", etc.)
- **Matematika dan Sains indicators:** All 12 skill names updated in DB and seed (e.g., "Mengelompokkan benda...", "Membuat pola (pattern)...", etc.)
- **English level descriptors:** `ENGLISH_LEVELS` in `grading-form.tsx` updated to match document — Speaking uses "Express self using...", Listening a fixed to "No response", Reading d fixed to "her/his own words", Singing c fixed to "Sings the song independently."
- **Seed idempotency:** Skill upsert now sets `update: { name, order }` so `npx prisma db seed` keeps indicator names in sync on future re-seeds.

---

*Updated 2026-06-21 — reflects v0.3*

# Architecture Decisions

## 2026-06-03 — Migrations over `synchronize`

**Decision:** Disabled TypeORM `synchronize`; using explicit migrations via a standalone DataSource.
**Why:** `synchronize: true` can silently drop columns and cause data loss in prod, and hides schema changes. Migrations are versioned, reviewable, and reversible.
**Tradeoff:** Slightly more work per schema change, but safe and interview-relevant.

## 2026-06-03 — Code-first GraphQL

**Decision:** Code-first with `autoSchemaFile`.
**Why:** Schema stays in sync with TS types; less duplication than schema-first.

## 2026-06-03 — User account lifecycle: soft delete + cascade on hard delete

**Decision:** `User` uses soft delete (`@DeleteDateColumn`). The profile is removed only by the DB-level `ON DELETE CASCADE`, which fires on a _hard_ delete. Reactivation of a soft-deleted account is **admin-only** (no auto-reactivate on login).
**Why:** Soft delete preserves the user + profile for a deactivated account so an admin can restore it. Hard delete — used for admin cleanup of long-inactive accounts — physically removes the user row, and the FK cascade sweeps the profile automatically. Key mechanism: `onDelete: 'CASCADE'` is a database-level constraint that only fires on a physical `DELETE`; `softDelete` issues an `UPDATE` (`deleted_at = NOW()`). They operate at different layers and never interfere — soft delete leaves the profile intact, hard delete removes it.
**Tradeoff:** Default TypeORM finds auto-filter soft-deleted rows (`WHERE deleted_at IS NULL`), so a normal login query can't see a deactivated user. That's exactly what we want for admin-only reactivation, but it means restoring an account must go through an admin path that queries `withDeleted: true` and calls `restore()`.

## 2026-06-03 — `email` UNIQUE intentionally reserves the address while soft-deleted

**Decision:** Keep `email` UNIQUE and do **not** free it on soft delete.
**Why:** A soft-deleted user's row physically remains, so its email stays occupied in the unique index. This is deliberate: it blocks anyone (including the original user) from re-registering a deactivated account's email, which enforces the admin-only reactivation policy. The address frees up only on hard delete, when the row is physically gone.
**Tradeoff:** A deactivated email can't be reused until cleanup. (If we ever wanted to free emails on soft delete instead, the naive `UNIQUE(email, deleted_at)` approach breaks on MySQL — NULLs are treated as distinct, so two live rows could share an email. That would need a generated column or email mangling. Not needed for the chosen model.)

## 2026-06-03 — Surrogate PK on `Profile` (not a shared PK)

**Decision:** `Profile` keeps its own surrogate `id`; `user_id` is a UNIQUE foreign key, not the primary key.
**Why:** Consistency — every table has the same `id` PK shape, which keeps base-entity/repository patterns and tooling uniform, and keeps the PK independent of the relationship.
**Tradeoff:** One extra column + index compared to a shared-PK design (where `user_id` _is_ the PK). A shared PK would enforce 1:1 at the identity level for free and save the column; chose uniformity over that saving. (Note: with the surrogate PK, what actually enforces 1:1 is the UNIQUE constraint on `user_id` — drop it and the relation silently becomes 1:many.)

## 2026-06-06 — SnakeNamingStrategy globally

**Decision:** Using `typeorm-naming-strategies` `SnakeNamingStrategy` in both `app.module.ts` and `data-source.ts` instead of explicit `@JoinColumn({ name: '...' })` on every relation.
**Why:** TypeORM defaults to camelCase column names (`courseId`, `instructorId`). The naming strategy automatically converts all property names to snake_case (`course_id`, `instructor_id`), matching our hand-written SQL and DB conventions without repetition.
**Tradeoff:** Extra dependency. Column naming is now convention-driven rather than explicit — a new developer must know the strategy is active or the column names will look "magic." Must be added to both the app module and the standalone DataSource or they fall out of sync.

## 2026-06-06 — ON DELETE RESTRICT on Course.instructor_id

**Decision:** `instructor_id` FK on `courses` uses `ON DELETE RESTRICT`.
**Why:** An instructor who owns active courses should not be hard-deletable. Deleting them would orphan courses that students may be enrolled in. RESTRICT forces the admin to deal with the courses first (reassign or delete), then delete the instructor.
**Tradeoff:** Slightly more admin work during cleanup, but prevents silent data loss.

## 2026-06-06 — ON DELETE CASCADE on Module and Lesson

**Decision:** `course_id` on `modules` and `module_id` on `lessons` both use `ON DELETE CASCADE`.
**Why:** A module has no meaning without its course; a lesson has no meaning without its module. When a course is deleted, its modules and lessons should be swept automatically. Forcing manual deletion of every lesson and module first would be operationally painful with no benefit.
**Tradeoff:** Deleting a course is a destructive, irreversible operation that removes all nested content. Must be guarded at the application layer (e.g. require explicit confirmation, check for active enrollments before allowing deletion).

## 2026-06-06 — DECIMAL(10,2) for price, not FLOAT

**Decision:** `price` column on `courses` uses `DECIMAL(10,2)`.
**Why:** `FLOAT` uses binary floating point arithmetic which cannot represent many decimal fractions precisely (e.g. 0.1 + 0.2 ≠ 0.3). Money values must be exact. `DECIMAL` stores values as exact fixed-point numbers.
**Tradeoff:** Slightly more storage than FLOAT; arithmetic is slower. Irrelevant for a price column — correctness matters far more than speed here.

## 2026-06-06 — Quiz belongs to Lesson, not Module

**Decision:** `quizzes` table has `lesson_id` FK, not `module_id`.
**Why:** A quiz tests the content of a specific lesson — it is scoped to that lesson's material. Attaching it to a module would imply it spans multiple lessons, which is a different feature (module-level assessment). For this LMS we are building lesson-level quizzes.
**Tradeoff:** Module-level assessments are not supported without a schema change. If needed in future, a separate `module_assessments` table is the clean extension path rather than changing the quiz FK.

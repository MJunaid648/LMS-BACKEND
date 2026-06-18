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

## 2026-06-11 — bcrypt for password hashing, not SHA-256 or encryption

**Decision:** Passwords are hashed with `bcrypt` before storage. Encryption and fast hashing algorithms (SHA-256, MD5) are explicitly rejected.
**Why:**

- **Encryption is reversible** — it requires a key, and if that key is compromised, every stored password can be decrypted. Hashing is one-way; even if the hash is leaked, the original password cannot be mathematically recovered.
- **SHA-256 is too fast** — fast hashing allows an attacker to run millions or billions of brute-force/dictionary guesses per second against a leaked hash database. bcrypt is deliberately slow (configurable via cost factor); at cost factor 12, a single hash takes ~250ms, limiting an attacker to a handful of guesses per second.
- **bcrypt has a built-in salt** — every `bcrypt.hash()` call generates a cryptographically random salt and embeds it in the output string alongside the algorithm identifier and cost factor. This means two hashes of the same password are always different, defeating rainbow table attacks. `bcrypt.compare()` extracts the salt from the stored hash and re-runs the computation — no separate salt column needed.
  **Cost factor chosen:** 12 for passwords, 10 for refresh tokens. Low values (≤8) are too fast to be safe; high values (≥14) add noticeable latency to every login. 12 is the current industry-standard default.
  **Tradeoff:** bcrypt is slow by design — that's the feature for passwords, but it means bcrypt must never be used for non-auth hashing (e.g. cache keys, checksums). Use SHA-256 or similar for those cases.

## 2026-06-11 — Auto-login on registration

**Decision:** `register()` returns `AuthResponse` (accessToken + refreshToken + user) instead of just the user object.
**Why:** Auto-login after registration is better UX — the user doesn't need to fill in the login form immediately after registering. The response shape is identical to `login()`, which keeps the API consistent.
**Tradeoff:** Slightly more work in `register()` — token generation + refresh token storage added to the registration flow.

## 2026-06-11 — Stateful refresh token storage (hashed) on User row

**Decision:** After issuing a refresh token, its bcrypt hash is stored in `hashedRefreshToken` on the `User` entity (nullable). Raw token never persists.
**Why:**

- Stateless refresh (verify signature only) cannot revoke tokens. If a refresh token is stolen, the attacker has access until expiry (7 days).
- Storing the hash means logout actually works — null out the column, token is immediately invalidated.
- One user, one valid refresh session at a time — logging in again invalidates the previous refresh token.
- Hash (not raw token) is stored so a leaked DB doesn't expose valid tokens directly.
  **Tradeoff:** Every refresh hits the DB to compare hashes. At scale this is a cache candidate (Redis with TTL = refresh token expiry). Acceptable for this LMS.

## 2026-06-11 — Separate secrets for access and refresh tokens

**Decision:** `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are different values in `.env`. Access and refresh tokens are signed with different secrets.
**Why:** If both tokens share the same secret, a stolen access token could be presented to the refresh endpoint and pass signature verification — same secret means same check passes. Attacker gets infinite access by continuously refreshing. Separate secrets mean each token is only valid on its intended endpoint.
**Tradeoff:** Two secrets to manage instead of one. Both must be rotated together on a security incident.

## 2026-06-11 — Global JwtAuthGuard via APP_GUARD + @Public() decorator

**Decision:** `JwtAuthGuard` is registered globally using `APP_GUARD` in `AppModule`. Public routes (register, login) are opted out using a custom `@Public()` decorator.
**Why:**

- The LMS has far more protected routes than public ones. Protected-by-default means forgetting to protect a sensitive route is impossible — it's already protected.
- The alternative (opt-in via `@UseGuards()` per resolver) has a silent failure mode: forgetting `@UseGuards()` on a sensitive resolver exposes it without any error.
- Loud failures (blocked public route → 401) are caught immediately. Silent failures (exposed protected route) may reach production undetected.
  **How @Public() works:** Uses `SetMetadata(IS_PUBLIC_KEY, true)` to attach a flag to the handler metadata. `JwtAuthGuard` reads it via `Reflector` — if present, returns `true` immediately without checking the token.
  **Tradeoff:** Every new public route must be explicitly decorated with `@Public()` or it returns 401. Intentional — the friction is the point.

## 2026-06-11 — Auth folder structure + shared concerns in common/

**Decision:** Auth-internal files (strategies, DTOs, service, resolver, module) live in `src/modules/auth/`. `JwtAuthGuard`, `RolesGuard`, `@Public()`, `@CurrentUser()`, `@Roles()`, `GlobalExceptionFilter`, and `LoggingInterceptor` live in `src/common/`.
**Why:** Strategies are auth's internal implementation detail. Guards, decorators, filters, and interceptors are used by every module in the app — their location in `common/` makes their cross-cutting nature explicit by convention.
**Tradeoff:** A new developer must know to look in `common/` for shared primitives. Must be documented in README.

## 2026-06-11 — getRequest() override in JwtAuthGuard for GraphQL

**Decision:** `JwtAuthGuard` overrides `getRequest(context)` to extract the request from the GQL execution context.
**Why:** Passport was designed for REST. Without this override, Passport looks for `req.logIn` on the wrong object and crashes with `Cannot read properties of undefined (reading 'logIn')`. The override tells Passport where to find the request in a GraphQL context.
**Tradeoff:** Any new Passport-based guard in this app must include the same override or it will fail in GraphQL context.

## 2026-06-13 — RolesGuard registered globally — authz separate from authn

**Decision:** `RolesGuard` is registered globally via `APP_GUARD` after `JwtAuthGuard`. Routes requiring specific roles are decorated with `@Roles(UserRole.X)`. Routes with no `@Roles()` decorator are accessible to any authenticated user.
**Why:** Separating authentication (JwtAuthGuard) and authorization (RolesGuard) keeps each guard with a single responsibility. Order matters — RolesGuard needs `req.user` that JwtAuthGuard attaches, so authn must run first.
**Tradeoff:** Every role-restricted route must be explicitly decorated. Forgetting `@Roles()` means any authenticated user can access it — but this is a loud failure caught in testing, not a silent security hole.

## 2026-06-13 — Ownership checks in service layer, not guards

**Decision:** Resource ownership checks (e.g. "does this instructor own this course?") are performed in the service method, not in a guard.
**Why:** Guards run before the resolver — the resource hasn't been fetched yet. Ownership requires fetching the resource first, then comparing `resource.ownerId === currentUser.id`. The service is the correct layer for this.
**Pattern:** fetch resource → check ownership → throw `ForbiddenException` if not owner → proceed.
**Tradeoff:** Ownership check is a DB query. If the resolver also fetches the same resource, that's two queries. Acceptable at this scale; can be optimized later with a single fetch.

## 2026-06-17 — Global exception filter + Apollo formatError

**Decision:** A global `GlobalExceptionFilter` catches all exceptions. Apollo's `formatError` controls the final error shape sent to clients.
**Why:**

- Global filter ensures consistent error handling — no matter where an exception is thrown (guard, pipe, service, resolver), it goes through one place.
- `formatError` in Apollo is required to suppress stacktraces — Apollo adds its own stacktrace to responses regardless of what the filter returns. Without `formatError`, internal details leak to clients.
- Two cases: `HttpException` (NestJS controlled, use its message and status) vs everything else (generic "Internal server error", status 500).
  **Tradeoff:** `formatError` strips all error extensions except what you explicitly include. Any custom error metadata must be explicitly passed through.

## 2026-06-17 — Structured logging with NestJS Logger + request ID

**Decision:** All logging uses NestJS `Logger`. `console.log` is banned. Every request is assigned a `randomUUID()` request ID. Log entries are structured JSON objects.
**Why:**

- Structured JSON logs are parseable by Datadog, ELK stack, CloudWatch — plain strings are not searchable.
- Request ID ties all log lines from the same request together, enabling tracing in concurrent environments.
- NestJS `Logger` includes the class name context automatically, making log sources identifiable.
  **Tradeoff:** Slightly more verbose than `console.log`. In production, swap for `winston` or `pino` for better performance and log levels.

## 2026-06-18 — CourseStatus enum instead of isPublished boolean

**Decision:** Replaced `isPublished: boolean` with `status: CourseStatus` enum (DRAFT, PUBLISHED, ARCHIVED).
**Why:** Boolean only supports two states. Archived courses need a third state — hidden from catalog but existing enrollments remain valid. Enum handles all three cleanly.
**Tradeoff:** Schema change required. Any existing code checking `isPublished` must be updated.

## 2026-06-18 — Index on courses.status

**Decision:** Added `@Index()` on `courses.status` column.
**Why:** Almost every course listing query filters by status (`WHERE status = 'PUBLISHED'`). Without an index this is a full table scan on every request.
**Tradeoff:** Small write overhead on every course status update. Negligible compared to read performance gain.

## 2026-06-18 — Enrollment soft delete instead of SET NULL on FKs

**Decision:** `Enrollment` uses `@DeleteDateColumn()` for soft delete. FKs use `ON DELETE CASCADE`, not `SET NULL`.
**Why:** `SET NULL` breaks the `UNIQUE(user_id, course_id)` constraint — MySQL treats two NULLs as distinct, allowing duplicate nulled-out rows. Soft delete retains history without breaking constraints.
**Tradeoff:** Deleted enrollments remain in the table. Queries must filter `WHERE deleted_at IS NULL` to exclude them — TypeORM handles this automatically with soft delete.

## 2026-06-18 — UNIQUE(user_id, course_id) on enrollments

**Decision:** Composite unique constraint on `(user_id, course_id)` in enrollments table.
**Why:** Application-level duplicate checks have race conditions — two simultaneous requests can both pass the check and both insert. The DB constraint is the real safety net regardless of isolation level.
**Tradeoff:** Duplicate enrollment attempts throw a DB-level error that must be caught and converted to a clean `ConflictException`.

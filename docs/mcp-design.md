# Hakgyo MCP Capability and Scope Design

Dokumen ini menetapkan capability map, kandidat MCP tools, dan access profile
berbasis role domain Hakgyo. Fondasi transport,
authorization server, dan deployment dibahas di [MCP Server](./mcp-server.md).

## Status

- Status: safe operational domain tools implemented.
- Source of truth: router dan authorization code di `apps/web/src/server`.
- API yang diaudit: 9 tRPC routers, 104 procedures.
- Public API: 2 procedures katalog.
- Protected API: 102 procedures.
- OAuth scope membuka koneksi MCP untuk seluruh membership aktif user.
- Role, ownership, assignment, enrollment, dan lifecycle checks menentukan
  capability efektif.

`docs/api.md` masih berguna sebagai contract reference, tetapi source saat ini
memiliki capability tambahan yang belum tercatat lengkap di sana, terutama
`account.deletionBlockers` dan profile-image storage procedures. Implementasi MCP
harus mengikuti source dan contract tests, bukan hanya dokumentasi API.

## API Inventory

| Domain       | Jumlah | Capability yang tersedia                                                               |
| ------------ | -----: | -------------------------------------------------------------------------------------- |
| Account      |      3 | Current user, account deletion blockers, update profile                                |
| Organization |     11 | Create/list/get/update, dashboard analytics, member management, Zoom status/disconnect |
| Course       |      7 | Public catalog, managed course read, create/update/delete                              |
| Content      |     26 | Modules, course items, materials, requirements, vocabulary sets dan entries            |
| Cohort       |     12 | Cohort CRUD, staff assignment, Zoom meeting CRUD                                       |
| Enrollment   |     10 | Open enrollment, manual enrollment, cohort enrollment, invite lifecycle                |
| Learning     |      5 | My courses, outline, item content, progress, progression mode                          |
| Assessment   |     18 | Authoring, learner attempts, answer submission, review queue dan grading               |
| Storage      |     12 | Profile image, organization logo, document upload/download/delete                      |

### Account

```text
account.me
account.deletionBlockers
account.updateProfile
```

### Organization

```text
organization.create
organization.list
organization.get
organization.getDashboardAnalytics
organization.update
organization.listMembers
organization.addMember
organization.updateMemberRole
organization.removeMember
organization.getZoomConnectionStatus
organization.disconnectZoom
```

### Course

```text
course.listPublished
course.getPublished
course.list
course.get
course.create
course.update
course.delete
```

### Content

```text
content.createModule
content.updateModule
content.deleteModule
content.reorderModules
content.createItem
content.updateItem
content.deleteItem
content.reorderItems
content.listMaterials
content.getMaterial
content.createMaterial
content.updateMaterial
content.deleteMaterial
content.attachMaterialAsset
content.detachMaterialAsset
content.createRequirement
content.deleteRequirement
content.reorderRequirements
content.listVocabularySets
content.createVocabularySet
content.updateVocabularySet
content.deleteVocabularySet
content.createVocabularyEntry
content.updateVocabularyEntry
content.deleteVocabularyEntry
```

### Cohort

```text
cohort.list
cohort.get
cohort.create
cohort.update
cohort.delete
cohort.addStaff
cohort.updateStaff
cohort.removeStaff
cohort.listMeetings
cohort.createMeeting
cohort.updateMeeting
cohort.deleteMeeting
```

### Enrollment

```text
enrollment.enrollOpenCourse
enrollment.listInvites
enrollment.getInvite
enrollment.listCourseEnrollments
enrollment.listCohortEnrollments
enrollment.setCourseEnrollment
enrollment.setCohortEnrollment
enrollment.createInvite
enrollment.revokeInvite
enrollment.redeemInvite
```

### Learning

```text
learning.listMyCourses
learning.getCourseOutline
learning.getCourseItem
learning.markContentProgress
learning.setProgressionMode
```

### Assessment

```text
assessment.list
assessment.get
assessment.create
assessment.update
assessment.delete
assessment.createQuestion
assessment.updateQuestion
assessment.deleteQuestion
assessment.createOption
assessment.updateOption
assessment.deleteOption
assessment.getForCourseItem
assessment.startAttempt
assessment.saveAnswers
assessment.submitAttempt
assessment.getMyAttempt
assessment.listAttemptsNeedingReview
assessment.reviewAttempt
```

### Storage

```text
storage.createProfileImageUploadUrl
storage.confirmProfileImageUpload
storage.discardProfileImageUpload
storage.deleteProfileImage
storage.createOrganizationLogoUploadUrl
storage.confirmOrganizationLogoUpload
storage.discardOrganizationLogoUpload
storage.deleteOrganizationLogo
storage.createUploadUrl
storage.confirmUpload
storage.createDownloadUrl
storage.deleteDocument
```

## Authorization Capabilities

Authorization domain yang sudah tersedia:

| Principal          | Effective capability                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| Organization owner | Semua organization permissions dan seluruh resource organization               |
| Organization admin | Sama seperti owner kecuali aturan owner promotion/demotion                     |
| Teacher            | Membuat asset/course; mengelola course dan content yang dimiliki/dibuat        |
| Course owner       | Mengelola course, content course, cohort, enrollment, dan review terkait       |
| Cohort staff       | Mengelola cohort yang ditugaskan dan review learner cohort terkait             |
| Learner            | Mengakses published content berdasarkan active enrollment dan progression lock |

Permission primitives saat ini:

```text
organization.manage
organization.members.manage
asset.create
course.create
course.manage
cohort.manage
content.manage
assessment.review
```

Resource checks yang wajib dipakai ulang MCP:

```text
requireOrganizationPermission
requireContentAuthor
requireCoursePermission
requireCohortPermission
requireCourseItemAccess
```

### Findings yang Mempengaruhi MCP

1. `protectedProcedure` saat ini bergantung pada Better Auth browser/mobile
   session. Bearer identity MCP harus dipetakan ke domain context berdasarkan
   verified user ID; jangan mencoba meneruskan OAuth token sebagai cookie tRPC.
2. Sebagian besar use case masih berada langsung dalam router closure dan
   memanggil Prisma. Sebelum sebuah capability dipakai MCP, extract operasi itu ke
   domain service yang dipakai bersama oleh tRPC dan MCP.
3. Banyak list API belum paginated. MCP adapter wajib memberi projection, limit,
   opaque cursor, dan deterministic ordering tanpa mengubah authorization.
4. `content.getMaterial` dapat membawa sampai 5.000 BlockNote blocks dan
   `assessment.get` membawa correct options. Output MCP harus bounded; answer key
   hanya boleh keluar melalui authoring access.
5. Member, enrollment, cohort, dan review output dapat berisi email atau jawaban
   learner. MCP consent harus menyatakan akses mengikuti role dan dapat mencakup
   private people/learning data; telemetry tidak boleh menyimpan payload.
6. `assessment.listAttemptsNeedingReview` hanya menerima organization permission
   `assessment.review`, yang saat ini dimiliki owner/admin. `reviewAttempt` juga
   menerima course owner atau assigned cohort staff. Teacher dapat mereview direct
   attempt tetapi tidak selalu dapat menemukan attempt melalui queue. Samakan
   policy/query sebelum review tools diluncurkan.
7. Cohort staff saat ini dapat update/delete cohort, mengubah staff, dan mengelola
   Zoom meetings melalui satu broad cohort check. MCP write tools tidak boleh
   memperluas boundary ini dan perlu explicit confirmation.
8. Signed R2 URLs adalah temporary credentials. Jangan log, cache, atau tampilkan
   sebagai ordinary text jika file tools nanti diaktifkan.
9. `requireCourseItemAccess` juga mengizinkan manager dan cohort staff. MCP
   `learning.*` wajib memakai learner-only service guard yang memerlukan active
   enrollment, published course/item, dan progression access. Tanpa guard ini,
   learner profile dapat menjadi bypass terhadap teacher/admin boundary.
10. Current list procedures umumnya unpaginated. Cursor harus diterapkan dalam
    shared database query, bukan sesudah mengambil seluruh hasil dari tRPC.
11. `cohort.list` hanya menerima course manager. Discovery cohort untuk assigned
    staff membutuhkan query baru yang memfilter assignment user.
12. `getCourseScope` saat ini menganggap assignment pada satu cohort sebagai
    `isCohortStaff` untuk seluruh course. Sebelum MCP cohort/enrollment/meeting
    tools aktif, `requireCohortPermission` harus memverifikasi assignment terhadap
    exact `cohortId`; assignment tidak boleh merambat ke sibling cohort.

## Capability Risk Classes

| Class | Meaning                      | Contoh                                                         |
| ----- | ---------------------------- | -------------------------------------------------------------- |
| R0    | Public atau own-context read | Public catalog, current identity                               |
| R1    | Private bounded read         | Learning content, managed course, dashboard                    |
| R2    | Reversible/idempotent write  | Create atau update draft metadata                              |
| R3    | Consequential write          | Publish, enroll user, grade attempt, create Zoom meeting       |
| R4    | Destructive/admin/credential | Delete, role change, invite token, signed URL, disconnect Zoom |

Rules:

- R0 dan R1 boleh berjalan tanpa server-side confirmation setelah consent.
- R2 harus mengembalikan exact change summary dan memakai idempotency bila bisa.
- R3 memerlukan explicit user confirmation pada action dan target final.
- R4 tidak masuk initial launch. Jika diaktifkan, batasi berdasarkan role,
  confirmation, audit event, dan preview/commit.
- MCP annotations hanya menggambarkan risk; authorization tetap server-side.

## Role-Based Access Model

OAuth tidak merepresentasikan role domain. User dapat menjadi owner di satu
organization, teacher di organization lain, dan learner pada course lain. Karena
itu hanya ada satu resource scope:

```text
hakgyo:mcp
```

Recommended authorization request:

```text
openid
profile
hakgyo:mcp
```

`offline_access` tidak diminta secara default. Consent menjelaskan bahwa client
dapat memakai Hakgyo sesuai role user pada organization dan acting mode yang
dipilih.

Authorization server menyimpan grant record durable:

```ts
type McpGrantOrganization = {
  organizationId: string;
  maxProfile: "OWNER" | "ADMIN" | "TEACHER" | "LEARNER";
  allowedModes: Array<"MANAGED" | "LEARNING">;
};
```

Token membawa opaque `hakgyo_grant_id`, bukan role authority atau organization ID
dari client input. MCP memuat grant record server-side pada setiap call. Effective
capability adalah intersection antara current database role dan `maxProfile` pada
grant. Promotion tidak otomatis menaikkan authority grant; profile, tenant,
acting-mode, tool-policy-version, atau write-class expansion memerlukan consent
baru. Demotion/removal langsung menurunkan authority saat database dibaca ulang.

### Access Profiles

| Profile         | Boundary                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| Owner           | Semua capability pada organization, termasuk member/role management, destructive operations, dan integrations        |
| Admin           | Semua capability organization kecuali menambah, mempromosikan, menurunkan, atau menghapus owner                      |
| Teacher         | Course milik sendiri, content yang dibuat sendiri, serta cohort/review yang dimiliki atau ditugaskan                 |
| Learner/no role | Read-only untuk public catalog dan published learning resource yang memiliki active entitlement serta sudah unlocked |

Role adalah organization-scoped. Ownership, exact cohort assignment, enrollment,
published state, expiry, dan progression lock tetap diperiksa per resource.
Memiliki role pada organization A tidak memberi akses ke organization B.

### Capability Matrix

| Capability                               | Owner                 | Admin                        | Teacher                                 | Learner/no role                          |
| ---------------------------------------- | --------------------- | ---------------------------- | --------------------------------------- | ---------------------------------------- |
| Own identity dan public catalog          | Semua                 | Semua                        | Semua                                   | Read                                     |
| Organization settings/analytics          | Semua                 | Semua                        | Basic context saja                      | Tidak                                    |
| Organization members                     | Semua termasuk owner  | Non-owner saja               | Tidak                                   | Tidak                                    |
| Course                                   | Semua                 | Semua                        | Own course                              | Enrolled published read                  |
| Material/vocabulary/assessment authoring | Semua                 | Semua                        | Own/created content                     | Published learning read tanpa answer key |
| Assessment answer key                    | Semua                 | Semua                        | Own/created assessment                  | Tidak                                    |
| Cohort dan staff                         | Semua                 | Semua                        | Own course atau assigned cohort         | Tidak                                    |
| Enrollment dan invite                    | Semua                 | Semua                        | Own course atau assigned cohort         | Read own entitlement saja                |
| Assessment review                        | Semua                 | Semua                        | Own course atau assigned learner cohort | Read own result saja                     |
| Zoom connection                          | Semua                 | Semua                        | Tidak                                   | Tidak                                    |
| Zoom meeting                             | Semua                 | Semua                        | Own course atau assigned cohort         | Tidak                                    |
| File upload/delete                       | Semua                 | Semua                        | Own upload/content                      | Tidak                                    |
| Learning progress/assessment submission  | Sesuai own enrollment | Sesuai own enrollment        | Sesuai own enrollment                   | Tidak melalui MCP                        |
| Destructive operations                   | Semua                 | Semua kecuali owner boundary | Own/assigned resource                   | Tidak                                    |

“Semua” tetap berarti hanya pada organization dalam grant dan setelah domain
permission check. Owner/admin tidak otomatis memperoleh learner answers atau
private file yang tidak termasuk organization tersebut.

### Effective Capability Resolution

```text
valid OAuth token with hakgyo:mcp
-> use the verified token subject as the application actor
-> require an explicit target resource or organization in each operation
-> load current organization role from database
-> enforce ownership, cohort assignment, or enrollment
-> enforce lifecycle and progression state
-> execute bounded operation
```

`hakgyo.context.get` mengembalikan current user dan seluruh membership aktif.
Setiap domain action tetap memvalidasi organization atau resource ID terhadap
membership, ownership, assignment, atau enrollment terbaru di database.

Tool listing menampilkan safe domain surface yang stabil. Effective capability
ditentukan ulang pada setiap action menggunakan actor dan target resource saat
ini. Hidden atau cached tools bukan security boundary.

## MCP Tool Strategy

Jangan menyalin 104 procedure menjadi 104 tools. Tool surface harus curated,
bounded, dan mudah dipilih model. Input MCP boleh lebih sempit daripada tRPC.

Current implementation menyediakan tiga catalog/context tools,
`hakgyo.capabilities.get`, dan delapan domain tools untuk 70 allowlisted actions.
Domain tools memakai parser dan authorization tRPC yang sama dengan web app.
Delete/remove/revoke/disconnect operations, raw invite tokens, signed storage
URLs, dan internal storage/meeting credentials tidak tersedia melalui MCP.
BlockNote built-ins dan custom blocks ditemukan melalui
`hakgyo.content.get_block_catalog`; lihat [Custom Blocks](./custom-blocks.md).

### Phase A: Read-First Launch

| Tool                                | Source capability                    | Access profile                     | Risk |
| ----------------------------------- | ------------------------------------ | ---------------------------------- | ---- |
| `hakgyo.context.get`                | `account.me`, `organization.list`    | Semua                              | R0   |
| `hakgyo.catalog.list_courses`       | `course.listPublished`               | Semua                              | R0   |
| `hakgyo.catalog.get_course`         | `course.getPublished`                | Semua                              | R0   |
| `hakgyo.learning.list_courses`      | `learning.listMyCourses`             | Semua, berdasarkan entitlement     | R1   |
| `hakgyo.learning.get_outline`       | `learning.getCourseOutline`          | Semua, berdasarkan entitlement     | R1   |
| `hakgyo.learning.get_item`          | `learning.getCourseItem`             | Semua, berdasarkan entitlement     | R1   |
| `hakgyo.course.list_managed`        | `course.list`                        | Owner, admin, teacher own          | R1   |
| `hakgyo.course.get_managed`         | `course.get`                         | Owner, admin, teacher own          | R1   |
| `hakgyo.material.list`              | `content.listMaterials`              | Owner, admin, teacher own          | R1   |
| `hakgyo.material.get`               | `content.getMaterial`                | Owner, admin, teacher own          | R1   |
| `hakgyo.vocabulary.list`            | `content.listVocabularySets`         | Owner, admin, teacher own          | R1   |
| `hakgyo.assessment.list`            | `assessment.list`                    | Owner, admin, teacher own          | R1   |
| `hakgyo.assessment.get`             | `assessment.get`                     | Owner, admin, teacher own          | R1   |
| `hakgyo.cohort.list`                | `cohort.list`                        | Owner, admin, teacher own/assigned | R1   |
| `hakgyo.cohort.get`                 | `cohort.get`                         | Owner, admin, teacher own/assigned | R1   |
| `hakgyo.cohort.list_meetings`       | `cohort.listMeetings`                | Owner, admin, teacher own/assigned | R1   |
| `hakgyo.organization.get_dashboard` | `organization.getDashboardAnalytics` | Owner, admin                       | R1   |

Phase A sengaja tidak mengembalikan member list, learner email, invite token,
signed URL, atau assessment answer key. Required service changes sebelum launch:

- `learning.get_outline` dan `learning.get_item` memakai learner-only guard, bukan
  manager branch dari `requireCourseItemAccess`;
- seluruh `learning.*` tools memaksa `LEARNING` mode dan tidak pernah fallback ke
  owner/admin/teacher authority;
- `course.get_managed` menghapus owner email dan internal membership fields;
- `material.list` hanya mengembalikan metadata, count, dan preview bounded;
- `vocabulary.list` tidak menyertakan seluruh entries;
- `assessment.get` menghapus `isCorrect` dan explanation;
- `cohort.get` menghapus email, image, WhatsApp URL, Zoom IDs, UUID, dan join URL;
- `cohort.list_meetings` hanya mengembalikan schedule metadata tanpa join URL;
- seluruh list memakai paginated shared query sebelum membuat MCP result;
- cohort staff discovery memakai assignment-filtered query baru.

Phase A tidak boleh launch sebelum learner-only guard dan grant allowlist memiliki
negative contract tests untuk dual-role user, admin/teacher tanpa enrollment,
expired enrollment, unpublished item, locked module, cross-tenant ID, dan stale
grant.

### Phase B: Bounded Writes

| Tool                             | Source capability                              | Access profile             | Risk |
| -------------------------------- | ---------------------------------------------- | -------------------------- | ---- |
| `hakgyo.course.create_draft`     | `course.create` dengan forced `DRAFT`          | Owner, admin, teacher self | R2   |
| `hakgyo.course.update_draft`     | Draft-only service tanpa status/owner transfer | Owner, admin, teacher own  | R2   |
| `hakgyo.material.create`         | `content.createMaterial`                       | Owner, admin, teacher self | R2   |
| `hakgyo.assessment.create_draft` | `assessment.create` dengan forced `DRAFT`      | Owner, admin, teacher self | R2   |
| `hakgyo.assessment.update_draft` | Draft-only service tanpa lifecycle change      | Owner, admin, teacher own  | R2   |

Tool schemas pada phase ini sengaja lebih sempit dari API. Update service wajib
memeriksa current state `DRAFT`; hanya menghilangkan field `status` dari schema
belum cukup. Publish/archive, ownership transfer, bulk reorder, relation changes,
dan live material edits tidak diselipkan dalam generic update. Learner/no-role
tidak memperoleh write tool, termasuk mark progress, enrollment, atau assessment
submission.

### Phase C: Consequential Workflows

Candidate workflows setelah confirmation dan audit design selesai:

- publish/archive course atau assessment;
- update material yang dapat direferensikan published course item;
- create/update kurikulum modules dan items;
- create/update cohort dan staff assignment;
- create/update Zoom meetings;
- list dan update enrollment;
- create/revoke enrollment invite;
- review queue dan manual grading.

Invite creation tidak boleh mengembalikan raw token ke model. MCP hanya menerima
invite ID dan metadata; distribusi link dilakukan lewat trusted Hakgyo UI atau
out-of-band delivery service. Zoom writes memerlukan persisted idempotency key,
workflow state, dan reconciliation agar retry tidak membuat duplicate/orphaned
meeting.

Teacher cohort operations memerlukan exact cohort assignment atau ownership dari
containing course. Assignment pada sibling cohort tidak valid.

Prefer workflow-specific tools daripada generic mutation dengan `action` bebas.
Contoh: `hakgyo.course.publish` lebih aman daripada membiarkan
`hakgyo.course.update_draft` menerima `status: "PUBLISHED"`.

### Phase D: Restricted Capabilities

Tidak aktif pada launch awal:

| Capability                           | Alasan                                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Student assessment start/save/submit | Academic-integrity policy belum ditetapkan; model dapat menjawab atas nama learner                                     |
| Assessment answer key                | Memerlukan explicit authoring tool, owner/admin atau teacher ownership, dan conflict check terhadap learner enrollment |
| Invite redeem                        | Token adalah bearer secret dan raw token mudah bocor ke conversation/log                                               |
| Member role mutation/removal         | Privilege and tenant administration impact                                                                             |
| Resource delete                      | Destructive and difficult to recover                                                                                   |
| Zoom disconnect/delete               | External destructive side effect                                                                                       |
| Signed upload/download URL           | Temporary credential leakage and open-world action; prefer authenticated MCP resource/proxy                            |
| Profile/logo upload flows            | Multi-step binary workflow tidak cocok untuk initial tool surface                                                      |
| Account deletion                     | Belum ada API delete dan memerlukan dedicated confirmation workflow                                                    |

## Tool Contract Rules

1. Tool input memakai resource ID, bukan menerima arbitrary Prisma filters.
2. Semua list tool memakai `limit <= 50`, opaque cursor, dan stable ordering.
3. Material output default berupa metadata dan bounded content window. Full 5.000
   block output tidak diizinkan dalam satu call.
4. Managed assessment output default tidak membawa answer key. Correct options
   dan explanations hanya melalui explicit authoring tool untuk owner/admin atau
   teacher pemilik assessment; learner tools tidak pernah memanggil query ini.
5. Email hanya dikembalikan oleh explicit people/enrollment/review tools dengan
   role dan resource permission yang sesuai.
6. Write tool mengembalikan resource ID, changed fields, resulting lifecycle
   state, dan audit correlation ID.
7. R3/R4 tools membutuhkan target-specific confirmation. Confirmation text dari
   model bukan pengganti authorization.
8. Delete, revoke, role, dan staff tools memerlukan matching access profile,
   resource permission, confirmation, dan audit event.
9. External calls menyetel `openWorldHint: true`; ordinary database tools false.
10. Tool description tidak menjanjikan capability yang belum tersedia di API.

### Required Annotations

| Tool class               | `readOnlyHint` | `destructiveHint` | `idempotentHint`                        | `openWorldHint` |
| ------------------------ | -------------- | ----------------- | --------------------------------------- | --------------- |
| Database read            | `true`         | `false`           | `true`                                  | `false`         |
| Draft create             | `false`        | `false`           | `false` kecuali memakai idempotency key | `false`         |
| Metadata update          | `false`        | `false`           | Sesuai service semantics                | `false`         |
| Progress update          | `false`        | `false`           | `false` pada implementasi saat ini      | `false`         |
| Delete/revoke            | `false`        | `true`            | Sesuai lifecycle semantics              | `false`         |
| Zoom/provider write      | `false`        | Sesuai action     | Hanya setelah persisted idempotency     | `true`          |
| Signed URL/file transfer | Sesuai action  | Sesuai action     | Sesuai action                           | `true`          |

### Confirmation Protocol

OAuth grant hanya membuka MCP dan bukan bukti confirmation. R3/R4 memakai
preview/commit protocol:

1. Preview memvalidasi `hakgyo:mcp`, tenant allowlist, current role, dan domain
   permission.
2. Preview membuat pending operation dan mengembalikan human-readable diff serta
   trusted Hakgyo approval URL tanpa menjalankan side effect.
3. User menyetujui operation melalui authenticated Hakgyo UI atau independent
   trusted channel. Model/client tidak dapat menyetujui operation hanya dengan
   memanggil tool berikutnya.
4. Approval terikat pada user, OAuth client, organization, acting mode, operation, target ID,
   canonical input digest, current resource version, dan expiry.
5. Commit hanya menerima server-recorded approved operation, memvalidasi binding
   dan current version, lalu mengonsumsi approval secara atomik.
6. Replayed, expired, unapproved, changed, atau cross-tenant operation ditolak.

Confirmation handle selalu short-lived dan tidak diwariskan oleh refresh grant.
Role dan membership dibaca ulang saat commit.

## Implementation Boundary

Target layering untuk setiap exposed tool:

```text
MCP tool schema
-> require OAuth scope hakgyo:mcp
-> verified user identity
-> load server-stored grant and enforce organization/mode/profile ceiling
-> current role/access profile resolution
-> shared domain service
-> existing resource authorization helper
-> Prisma/provider
-> bounded MCP projection
```

Prioritas refactor service:

1. Current context and public catalog reads.
2. Learning read services.
3. Managed course/material/assessment read services.
4. Grant storage, consent organization/mode selection, dan profile resolution.
5. Draft-safe write services.
6. Cohort, enrollment, review, integration, dan destructive workflows.

Database operation harus memasukkan organization/grant predicate dan authorization
check dalam transaction yang sama dengan mutation. Untuk provider side effect,
transaction membuat authorized outbox/workflow record sebelum worker memanggil
provider.

Jangan memanggil `/api/trpc` melalui HTTP dari MCP. Jangan membuat second
permission matrix di MCP. Role-to-capability presentation boleh terpisah, tetapi
keputusan resource access harus tetap memakai authorization domain Hakgyo.

## Decisions Before Phase C

- Apakah publish membutuhkan preview diff dan second confirmation?
- Apakah enrollment write dibatasi pada invite atau boleh direct status mutation?
- Apakah file access akan memakai MCP resources daripada signed URL tool?
- Apakah remote clients boleh memperoleh refresh token dan berapa maksimum TTL?

Learner/no-role sudah diputuskan read-only. Teacher memakai owned/assigned
boundary, termasuk assignment-filtered review queue. Keputusan tersisa tidak
memblokir Phase A read-first launch.

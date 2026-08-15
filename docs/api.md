# Hakgyo API Reference

Referensi kontrak tRPC bersama untuk aplikasi web dan mobile Hakgyo.

## Daftar Isi

- [Arsitektur](#arsitektur)
- [Setup Client](#setup-client)
- [Autentikasi](#autentikasi)
- [Type Safety](#type-safety)
- [Authorization](#authorization)
- [Error Handling](#error-handling)
- [Account](#account)
- [Organization](#organization)
- [Course](#course)
- [Content](#content)
- [Cohort](#cohort)
- [Enrollment](#enrollment)
- [Learning](#learning)
- [Assessment](#assessment)
- [Storage](#storage)
- [Integrasi Backend dan Editor](#integrasi-backend-dan-editor)
- [Alur End-to-End](#alur-end-to-end)
- [Enum](#enum)
- [Batas Integrasi](#batas-integrasi)

## Arsitektur

Backend tRPC berjalan di aplikasi Next.js:

```text
Web client ───┐
              ├── /api/trpc ── tRPC ── Prisma ── PostgreSQL/Neon
Mobile app ───┘                     └── R2 object storage
```

Endpoint HTTP:

```text
GET|POST https://<web-origin>/api/trpc
```

Client tidak memanggil URL procedure secara manual. Gunakan proxy `api` dari
client tRPC agar input dan output tetap type-safe.

Kode utama:

```text
apps/web/src/server/api/root.ts       Root router
apps/web/src/server/api/routers/      Domain routers
apps/web/src/server/authorization/    Permission dan resource scope
apps/web/src/trpc/                     Web client
apps/mobile/src/lib/trpc.tsx          Mobile client
packages/api/src/index.ts             Shared contract types
```

## Setup Client

### Web Client Component

Provider `TRPCReactProvider` harus terpasang di layout aplikasi.

```tsx
"use client";

import { api } from "~/trpc/react";

export function MyCourses() {
  const courses = api.learning.listMyCourses.useQuery();

  if (courses.isPending) return null;
  if (courses.error) return <p>{courses.error.message}</p>;

  return courses.data.map((course) => <p key={course.id}>{course.title}</p>);
}
```

Mutation dan invalidation:

```tsx
const utils = api.useUtils();
const update = api.course.update.useMutation({
  onSuccess: async () => {
    await utils.course.list.invalidate({ organizationId });
  },
});

update.mutate({ courseId, title: "Judul Baru" });
```

### Web Server Component

```tsx
import { api, HydrateClient } from "~/trpc/server";

export default async function Page() {
  const courses = await api.course.listPublished({ limit: 20 });

  return (
    <HydrateClient>
      {courses.map((course) => (
        <p key={course.id}>{course.title}</p>
      ))}
    </HydrateClient>
  );
}
```

### Mobile

Set origin Next.js, tanpa `/api/trpc`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

Provider `TRPCProvider` harus membungkus aplikasi:

```tsx
import { TRPCProvider } from "./src/lib/trpc";

export default function App() {
  return <TRPCProvider>{/* navigation */}</TRPCProvider>;
}
```

Penggunaan hook sama seperti web:

```tsx
import { api } from "./src/lib/trpc";

const outline = api.learning.getCourseOutline.useQuery({ courseId });
```

Mobile meneruskan cookie Better Auth dari SecureStore pada setiap batch request.

## Autentikasi

API memakai Better Auth. Ada dua jenis procedure:

| Jenis                | Session  | Keterangan                     |
| -------------------- | -------- | ------------------------------ |
| `publicProcedure`    | Opsional | Hanya katalog course published |
| `protectedProcedure` | Wajib    | Semua data privat dan mutation |

Tanpa session valid, protected procedure mengembalikan `UNAUTHORIZED`.

Web menggunakan cookie browser. Mobile memakai `authClient` dan cookie yang
disimpan oleh plugin `@better-auth/expo`.

## Type Safety

Package `@hakgyo/api` hanya mengekspor tipe. Kode Prisma dan server tidak masuk
ke bundle client.

```ts
import type { AppRouter, RouterInputs, RouterOutputs } from "@hakgyo/api";

type OutlineInput = RouterInputs["learning"]["getCourseOutline"];
type Outline = RouterOutputs["learning"]["getCourseOutline"];
type SaveAnswers = RouterInputs["assessment"]["saveAnswers"];
```

Date dan JSON ditransformasikan dengan SuperJSON, sehingga nilai `Date` diterima
sebagai `Date` pada client.

## Authorization

### Role Organization

| Kapabilitas                       | Owner | Admin |              Teacher | Student/non-member |
| --------------------------------- | ----: | ----: | -------------------: | -----------------: |
| Kelola organization               |    Ya |    Ya |                Tidak |              Tidak |
| Kelola member non-owner           |    Ya |    Ya |                Tidak |              Tidak |
| Promosi/demosi owner              |    Ya | Tidak |                Tidak |              Tidak |
| Buat course                       |    Ya |    Ya |    Ya, milik sendiri |              Tidak |
| Kelola semua course organization  |    Ya |    Ya |                Tidak |              Tidak |
| Kelola course sendiri             |    Ya |    Ya |                   Ya |              Tidak |
| Buat content                      |    Ya |    Ya |                   Ya |              Tidak |
| Kelola semua content organization |    Ya |    Ya |                Tidak |              Tidak |
| Kelola content buatan sendiri     |    Ya |    Ya |                   Ya |              Tidak |
| Kelola cohort                     |    Ya |    Ya |   Course owner/staff |              Tidak |
| Review assessment                 |    Ya |    Ya | Sesuai course/cohort |              Tidak |

Role tidak pernah memberi akses lintas organization. Teacher selalu dibatasi
oleh kepemilikan course/content atau assignment cohort.

### Akses Student

Student dapat membuka learning content jika seluruh kondisi berikut terpenuhi:

1. Course berstatus `PUBLISHED`.
2. Course item berstatus published.
3. Memiliki enrollment `ACTIVE` atau `COMPLETED` yang belum expired, atau cohort enrollment aktif.
4. Untuk mode `SEQUENTIAL`, module item tersebut sudah unlocked.

Mode progression:

| Mode         | Perilaku                                                                  |
| ------------ | ------------------------------------------------------------------------- |
| `OPEN`       | Semua module published tersedia sejak awal                                |
| `SEQUENTIAL` | Module berikutnya tersedia setelah seluruh item module sebelumnya selesai |

## Error Handling

Error tRPC tersedia pada `error.data.code`.

| Code                    | Arti umum                                     |
| ----------------------- | --------------------------------------------- |
| `BAD_REQUEST`           | Input atau state domain tidak valid           |
| `UNAUTHORIZED`          | Session tidak ada/tidak valid                 |
| `FORBIDDEN`             | User login tetapi tidak memiliki scope        |
| `NOT_FOUND`             | Resource tidak ada atau sengaja disembunyikan |
| `CONFLICT`              | State berubah atau operasi bertabrakan        |
| `PRECONDITION_FAILED`   | Requirement pembelajaran belum terpenuhi      |
| `INTERNAL_SERVER_ERROR` | Error server/provider                         |

Contoh:

```ts
import { TRPCClientError } from "@trpc/client";

try {
  await mutation.mutateAsync(input);
} catch (error) {
  if (error instanceof TRPCClientError && error.data?.code === "FORBIDDEN") {
    // tampilkan layar no access
  }
}
```

Query client tidak me-retry `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, dan
`NOT_FOUND`. Error transient lainnya dicoba maksimal dua kali.

---

## Account

### `account.me`

```ts
query(): SessionUser
```

- Auth: protected.
- Mengembalikan user dari session Better Auth aktif.

### `account.updateProfile`

```ts
mutation({
  name?: string;         // 1..120
  image?: string | null; // URL, max 2,048
}): UserProfile
```

- Auth: protected.
- Minimal satu field wajib dikirim.
- Hanya memperbarui nama dan foto user aktif; email dan password tidak dapat
  diubah melalui procedure ini.
- Client sebaiknya me-refresh session setelah mutation jika header global
  membaca data user langsung dari session.

---

## Organization

### `organization.create`

```ts
mutation({
  name: string; // 1..120
  slug: string; // lowercase kebab-case, 2..80
  defaultEnrollmentMode?: "OPEN" | "INVITE_ONLY"; // default INVITE_ONLY
}): Organization & {
  membership: { id: string; role: "OWNER" };
}
```

- Auth: protected.
- Organization dan membership owner pembuat dibuat dalam satu transaction.
- Slug bersifat global unique; slug yang sudah dipakai menghasilkan `CONFLICT`.

### `organization.list`

```ts
query(): OrganizationWithCurrentMembership[]
```

- Auth: protected.
- Hanya organization tempat user menjadi member.
- Membership pada output hanya membership user saat ini (`id`, `role`).

### `organization.get`

```ts
query({ organizationId: string }): Organization
```

- Scope: member organization yang memiliki permission membuat course.

### `organization.getDashboardAnalytics`

```ts
query({ organizationId: string }): {
  members: number;
  courses: { total: number; byStatus: Partial<Record<CourseStatus, number>> };
  cohorts: { total: number; byStatus: Partial<Record<CohortStatus, number>> };
  enrollments: {
    total: number;
    byStatus: Partial<Record<EnrollmentStatus, number>>;
  };
  content: {
    materials: number;
    vocabularySets: number;
    assessments: number;
  };
  actionItems: { attemptsInReview: number; upcomingMeetings: number };
}
```

- Scope: `OWNER` atau `ADMIN` organization.
- Seluruh count dibatasi oleh `organizationId`.
- `upcomingMeetings` menghitung meeting `SCHEDULED` yang belum dimulai.
- Status tanpa data tidak disertakan dalam `byStatus`.

### `organization.update`

```ts
mutation({
  organizationId: string;
  name?: string;                    // 1..120
  slug?: string;                    // lowercase kebab-case, 2..80
  defaultEnrollmentMode?: "OPEN" | "INVITE_ONLY";
}): Organization
```

- Scope: `OWNER` atau `ADMIN` organization.
- `logoUrl` dikelola melalui procedure upload organization logo pada router storage.

### `organization.listMembers`

```ts
query({ organizationId: string }): OrganizationMemberWithUser[]
```

- Scope: `OWNER` atau `ADMIN`.
- User projection: `id`, `name`, `email`, `image`.

### `organization.addMember`

```ts
mutation({
  organizationId: string;
  email: string;
  role: "OWNER" | "ADMIN" | "TEACHER";
}): OrganizationMember
```

- Scope: `OWNER` atau `ADMIN`.
- Email dinormalisasi ke lowercase dan harus cocok dengan akun Hakgyo yang sudah ada.
- Hanya `OWNER` yang dapat menambahkan owner baru.

### `organization.updateMemberRole`

```ts
mutation({
  organizationId: string;
  membershipId: string;
  role: "OWNER" | "ADMIN" | "TEACHER";
}): OrganizationMember
```

- Scope: `OWNER` atau `ADMIN`.
- Hanya owner yang dapat mempromosikan atau menurunkan owner.
- Organization harus selalu memiliki minimal satu owner.

### `organization.removeMember`

```ts
mutation({ organizationId: string; membershipId: string }): {
  removed: true;
}
```

- Scope: `OWNER` atau `ADMIN`.
- Owner tidak dapat langsung dihapus; transfer/demote lebih dahulu.

### `organization.getZoomConnectionStatus`

```ts
query({ organizationId: string }): null | {
  id: string;
  status: "CONNECTED" | "EXPIRED" | "REVOKED";
  zoomAccountId: string;
  zoomUserId: string;
  scope: string | null;
  accessTokenExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  connectedBy: { user: { id: string; name: string } };
}
```

- Scope: `OWNER` atau `ADMIN`.
- Encrypted access/refresh token tidak pernah dikembalikan.

### `organization.disconnectZoom`

```ts
mutation({ organizationId: string }): { disconnected: true }
```

- Scope: `OWNER` atau `ADMIN`.
- Melakukan revoke token di Zoom, lalu menandai koneksi lokal sebagai `REVOKED`.
- Token didekripsi dan dipakai hanya di server.

### Zoom OAuth Web Routes

```text
GET /api/integrations/zoom/connect?organizationId=<id>
GET /api/integrations/zoom/callback
```

- Hanya owner/admin organization yang dapat memulai koneksi.
- Connect route membuat state CSRF sekali pakai dalam cookie `HttpOnly`.
- Callback menukar authorization code, membaca `/users/me`, mengenkripsi token
  dengan AES-256-GCM, lalu melakukan upsert `ZoomConnection`.
- Access token di-refresh lima menit sebelum expiry dan refresh token hasil
  rotation selalu disimpan.

---

## Course

### `course.listPublished`

```ts
query({
  organizationId?: string;
  limit?: number; // default 50, max 100
  cursor?: string; // ID course terakhir dari page sebelumnya
} = {}): PublishedCourseSummary[]
```

- Auth: public.
- Hanya course `PUBLISHED`.
- Untuk pagination, kirim `id` item terakhir sebagai `cursor`; pagination selesai
  ketika jumlah output lebih kecil dari `limit`.
- Output: metadata katalog, organization, jumlah module dan cohort.
- Tidak mengembalikan konten material atau jawaban assessment.

### `course.getPublished`

```ts
query({ courseId: string }): PublishedCourseDetail
```

- Auth: public.
- Mengembalikan metadata course, module, dan metadata item published.
- Content body, pertanyaan, dan jawaban benar tidak dikembalikan.

### `course.list`

```ts
query({ organizationId: string }): ManagedCourse[]
```

- Scope: organization member dengan `course.create`.
- Owner/admin melihat semua course organization.
- Teacher hanya melihat course yang dimilikinya.

### `course.get`

```ts
query({ courseId: string }): ManagedCourseDetail
```

- Scope: owner/admin organization atau teacher pemilik course.
- Memuat owner, module, dan item terurut.

### Course Fields

Dipakai oleh `course.create` dan `course.update`:

```ts
type CourseFields = {
  title: string; // 1..200
  slug: string; // kebab-case, 2..100
  description?: string | null; // max 10,000
  thumbnailUrl?: string | null; // URL, max 2,048
  price?: number; // integer >= 0
  currency?: string; // tepat 3 karakter, uppercase
  enrollmentMode?: "OPEN" | "INVITE_ONLY" | null;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  progressionMode?: "OPEN" | "SEQUENTIAL";
};
```

### `course.create`

```ts
mutation(CourseFields & {
  organizationId: string;
  ownerMembershipId: string;
}): Course
```

- Scope: owner/admin/teacher organization.
- Owner membership wajib berasal dari organization yang sama.
- Teacher hanya dapat membuat course dengan dirinya sebagai owner.

### `course.update`

```ts
mutation(Partial<CourseFields> & {
  courseId: string;
  ownerMembershipId?: string;
}): Course
```

- Scope: owner/admin atau teacher pemilik course.
- Owner baru wajib berasal dari organization course.

### `course.delete`

```ts
mutation({ courseId: string }): { deleted: true }
```

- Scope: owner/admin atau teacher pemilik course.
- Relasi restrictive dapat menolak delete jika course masih memiliki data yang tidak dapat dihapus.

---

## Content

Seluruh position bersifat zero-based pada API reorder. Create otomatis menaruh
resource di posisi terakhir.

### Module

#### `content.createModule`

```ts
mutation({
  courseId: string;
  title: string;              // 1..200
  description?: string | null;// max 10,000
}): CourseModule
```

- Scope: pengelola konten course.
- `position` dialokasikan otomatis.

#### `content.updateModule`

```ts
mutation({
  moduleId: string;
  title?: string;
  description?: string | null;
}): CourseModule
```

#### `content.deleteModule`

```ts
mutation({ moduleId: string }): { deleted: true }
```

#### `content.reorderModules`

```ts
mutation({ courseId: string; moduleIds: string[] }): { reordered: true }
```

- Semua module course wajib disertakan tepat satu kali.
- Maksimal 500 ID.
- Reorder dijalankan dalam transaction.

### Course Item

Course item menghubungkan module ke tepat satu resource.

```ts
type ItemRelation =
  | { type: "MATERIAL"; materialId: string }
  | { type: "ASSESSMENT"; assessmentId: string }
  | { type: "VOCABULARY_SET"; vocabularySetId: string };
```

#### `content.createItem`

```ts
mutation({
  moduleId: string;
  isPublished?: boolean;
  relation: ItemRelation;
}): CourseItem
```

- Resource wajib berasal dari organization module.
- Teacher hanya dapat memasang content miliknya pada course miliknya.

#### `content.updateItem`

```ts
mutation({
  itemId: string;
  isPublished?: boolean;
  relation?: ItemRelation;
}): CourseItem
```

- Mengganti relation akan mengosongkan dua relation lainnya.

#### `content.deleteItem`

```ts
mutation({ itemId: string }): { deleted: true }
```

#### `content.reorderItems`

```ts
mutation({ moduleId: string; itemIds: string[] }): { reordered: true }
```

- Semua item module wajib disertakan.
- Maksimal 1,000 ID.

### Material

#### `content.listMaterials`

```ts
query({ organizationId: string }): MaterialWithRequirementsAndAssets[]
```

- Owner/admin melihat seluruh material organization.
- Teacher melihat material yang dibuatnya.

#### `content.createMaterial`

```ts
mutation({
  organizationId: string;
  title: string;                         // 1..200
  description?: string | null;           // max 10,000
  content: BlockNoteBlock[];              // 1..5,000 blocks
  editorSchemaVersion?: number;          // integer > 0
  requirementPolicy?: "ALL" | "ANY";
}): Material
```

#### `content.updateMaterial`

```ts
mutation({
  organizationId: string;
  materialId: string;
  title?: string;
  description?: string | null;
  content?: BlockNoteBlock[];
  editorSchemaVersion?: number;
  requirementPolicy?: "ALL" | "ANY";
}): Material
```

#### `content.deleteMaterial`

```ts
mutation({ organizationId: string; materialId: string }): { deleted: true }
```

- Teacher hanya dapat update/delete material buatannya.
- `content` harus berupa root array dokumen BlockNote, bukan ProseMirror wrapper.

#### `content.getMaterial`

```ts
query({ organizationId: string; materialId: string }): MaterialWithRequirementsAndAssets
```

- Endpoint authoring untuk editor web.
- Owner/admin dapat membuka material organization; teacher hanya material buatannya.

#### `content.attachMaterialAsset`

```ts
mutation({
  organizationId: string;
  materialId: string;
  assetId: string;
}): MaterialAsset
```

- Material dan confirmed asset wajib berasal dari organization yang sama.

#### `content.detachMaterialAsset`

```ts
mutation({ organizationId: string; materialId: string; assetId: string }): {
  detached: true;
}
```

### Material Requirement

```ts
type RequirementRelation =
  | {
      type: "ASSESSMENT";
      assessmentId: string;
      minimumScore?: number | null; // 0..100
    }
  | {
      type: "VOCABULARY_SET";
      vocabularySetId: string;
    };
```

#### `content.createRequirement`

```ts
mutation({
  organizationId: string;
  materialId: string;
  relation: RequirementRelation;
}): MaterialRequirement
```

- Requirement resource wajib berasal dari organization yang sama.

#### `content.deleteRequirement`

```ts
mutation({ organizationId: string; requirementId: string }): {
  deleted: true;
}
```

#### `content.reorderRequirements`

```ts
mutation({
  organizationId: string;
  materialId: string;
  requirementIds: string[];
}): { reordered: true }
```

- Semua requirement material wajib disertakan; maksimal 500.

Completion material memakai `requirementPolicy`:

- `ALL`: semua requirement harus terpenuhi.
- `ANY`: minimal satu requirement harus terpenuhi.
- Assessment harus memiliki attempt `GRADED` yang mencapai threshold.
- Vocabulary set harus memiliki course item published dan progress completed yang dapat diakses user.

### Vocabulary

#### `content.listVocabularySets`

```ts
query({ organizationId: string }): VocabularySetWithEntries[]
```

- Owner/admin melihat seluruh set; teacher hanya set buatannya.

#### `content.createVocabularySet`

```ts
mutation({
  organizationId: string;
  title: string;                // 1..200
  description?: string | null;  // max 10,000
}): VocabularySet
```

#### `content.updateVocabularySet`

```ts
mutation({
  organizationId: string;
  vocabularySetId: string;
  title?: string;
  description?: string | null;
}): VocabularySet
```

#### `content.deleteVocabularySet`

```ts
mutation({ organizationId: string; vocabularySetId: string }): {
  deleted: true;
}
```

#### `content.createVocabularyEntry`

```ts
mutation({
  organizationId: string;
  vocabularySetId: string;
  term: string;                    // 1..500
  definition: string;              // 1..5,000
  examples?: JsonValue;
  audioAssetId?: string | null;
  metadata?: JsonValue;
}): VocabularyEntry
```

- Audio asset harus confirmed, tidak deleted, dan berasal dari organization sama.

#### `content.updateVocabularyEntry`

```ts
mutation({
  organizationId: string;
  entryId: string;
  term?: string;
  definition?: string;
  examples?: JsonValue;
  audioAssetId?: string | null;
  metadata?: JsonValue;
}): VocabularyEntry
```

#### `content.deleteVocabularyEntry`

```ts
mutation({ organizationId: string; entryId: string }): { deleted: true }
```

#### `content.reorderVocabularyEntries`

```ts
mutation({
  organizationId: string;
  vocabularySetId: string;
  entryIds: string[];
}): { reordered: true }
```

- Semua entry set wajib disertakan; maksimal 2,000.

---

## Cohort

```ts
type CohortFields = {
  name: string; // 1..200
  description?: string | null; // max 10,000
  whatsappGroupUrl?: string | null;
  status?: "DRAFT" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  enrollmentMode?: "OPEN" | "INVITE_ONLY" | null;
  price?: number | null; // integer >= 0
  capacity?: number | null; // integer > 0
  startsAt?: Date | null;
  endsAt?: Date | null;
};
```

### `cohort.list`

```ts
query({ courseId: string }): CohortWithCounts[]
```

- Scope: pengelola course.
- Counts: staff, enrollments, meetings.

### `cohort.get`

```ts
query({ cohortId: string }): CohortWithStaffAndMeetings
```

- Scope: owner/admin, course owner, atau assigned cohort staff.

### `cohort.create`

```ts
mutation(CohortFields & { courseId: string }): Cohort
```

### `cohort.update`

```ts
mutation(Partial<CohortFields> & { cohortId: string }): Cohort
```

### `cohort.delete`

```ts
mutation({ cohortId: string }): { deleted: true }
```

### Staff

#### `cohort.addStaff`

```ts
mutation({
  cohortId: string;
  organizationMemberId: string;
  role: "TEACHER" | "MODERATOR";
}): CohortStaff
```

- Member harus berasal dari organization cohort.

#### `cohort.updateStaff`

```ts
mutation({ cohortId: string; staffId: string; role: "TEACHER" | "MODERATOR" }): CohortStaff
```

#### `cohort.removeStaff`

```ts
mutation({ cohortId: string; staffId: string }): { removed: true }
```

### Meeting

```ts
type MeetingFields = {
  title: string; // 1..200
  agenda?: string | null; // max 10,000
  startsAt: Date;
  durationMinutes: number; // 1..1,440
  timezone: string; // 1..100
};
```

Status lifecycle tidak diterima dari client. Meeting baru berstatus `SCHEDULED`;
sinkronisasi `STARTED`/`ENDED` memerlukan webhook provider yang belum tersedia.

#### `cohort.listMeetings`

```ts
query({ cohortId: string }): CohortMeeting[]
```

#### `cohort.createMeeting`

```ts
mutation(MeetingFields & { cohortId: string }): CohortMeeting
```

- Memerlukan `ZoomConnection` organization berstatus `CONNECTED`.
- Server membuat scheduled meeting melalui `POST /users/me/meetings`.
- ID, UUID, dan join URL meeting berasal dari Zoom, bukan input client.

#### `cohort.updateMeeting`

```ts
mutation(Partial<MeetingFields> & {
  cohortId: string;
  meetingId: string;
}): CohortMeeting
```

- Memperbarui Zoom terlebih dahulu, kemudian metadata lokal.

#### `cohort.deleteMeeting`

```ts
mutation({ cohortId: string; meetingId: string }): { deleted: true }
```

- Menghapus meeting Zoom terlebih dahulu, kemudian metadata lokal.

---

## Enrollment

### `enrollment.enrollOpenCourse`

```ts
mutation({ courseId: string }): CourseEnrollment
```

- Auth: protected student/user.
- Course wajib `PUBLISHED` dan mode efektif enrollment wajib `OPEN`.
- Mode efektif memakai `course.enrollmentMode`, atau
  `organization.defaultEnrollmentMode` bila override course bernilai `null`.
- Hanya course gratis (`price === 0`) yang dapat didaftarkan karena payment belum
  tersedia. Course berbayar menghasilkan `PRECONDITION_FAILED`.
- Enrollment baru langsung `ACTIVE` dengan source `OPEN`.
- Idempotent untuk enrollment `ACTIVE`/`COMPLETED` yang masih berlaku.
- Enrollment dengan source `COHORT` diubah menjadi `OPEN` ketika learner
  mengambil open enrollment agar pembatalan cohort tidak mencabut akses mandiri.
- Enrollment yang expired, pending, atau cancelled diaktifkan kembali sebagai
  `ACTIVE`, source `OPEN`, tanpa expiry.

### `enrollment.listCourseEnrollments`

```ts
query({ courseId: string }): CourseEnrollmentWithUser[]
```

- Scope: pengelola course.

### `enrollment.listCohortEnrollments`

```ts
query({ cohortId: string }): CohortEnrollmentWithUser[]
```

- Scope: pengelola cohort.

### `enrollment.setCourseEnrollment`

```ts
mutation({
  courseId: string;
  userId: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  expiresAt?: Date | null;
}): CourseEnrollment
```

- Scope: pengelola course.
- Enrollment baru memakai source `MANUAL`.
- `completedAt` diisi saat status `COMPLETED`.
- Enrollment expired tidak memberi akses learning content.

### `enrollment.setCohortEnrollment`

```ts
mutation({
  cohortId: string;
  userId: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
}): CohortEnrollment
```

- Scope: pengelola cohort.
- Status aktif membuat entitlement course source `COHORT` bila diperlukan.
- Pembatalan hanya mencabut entitlement source `COHORT` jika tidak ada cohort aktif lain.
- Entitlement `MANUAL` atau `INVITE` tidak ikut dicabut.

### Invite

#### `enrollment.listInvites`

```ts
query({ courseId: string; cohortId?: string }): InviteMetadata[]
```

- Scope: pengelola course/cohort.
- Token tidak dikembalikan oleh list.

#### `enrollment.getInvite`

```ts
query({ inviteId: string }): InviteMetadata
```

- Scope: pengelola course.
- Token tidak dikembalikan.

#### `enrollment.createInvite`

```ts
mutation({
  courseId: string;
  cohortId?: string | null;
  expiresAt?: Date | null;
  maxUses?: number | null; // integer > 0
}): {
  id: string;
  token: string;
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
  cohortId: string | null;
}
```

- Token hanya dikembalikan saat create; simpan/share dari response tersebut.
- Cohort harus berasal dari course yang sama.

#### `enrollment.revokeInvite`

```ts
mutation({ inviteId: string }): { id: string; revokedAt: Date }
```

#### `enrollment.redeemInvite`

```ts
mutation({ token: string }): CourseEnrollment | CohortEnrollment
```

- Auth: protected student/user.
- Token panjang 20..200.
- Memvalidasi expiry, revoked state, dan max uses.
- Atomic/serializable; aman terhadap redeem bersamaan.
- Membuat course enrollment aktif dan cohort enrollment bila invite cohort.

---

## Learning

### `learning.listMyCourses`

```ts
query(): EnrolledCourseSummary[]
```

- Hanya course published dengan direct/cohort enrollment aktif.
- Direct enrollment expired tidak disertakan.
- Output: course metadata dan organization.

### `learning.getCourseOutline`

```ts
query({ courseId: string }): {
  id: string;
  title: string;
  status: CourseStatus;
  progressionMode: "OPEN" | "SEQUENTIAL";
  canManage: boolean;
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    position: number;
    access: "LOCKED" | "AVAILABLE" | "COMPLETED";
    isCompleted: boolean;
    items: Array<{
      id: string;
      type: "MATERIAL" | "ASSESSMENT" | "VOCABULARY_SET";
      position: number;
      title: string;
      isCompleted: boolean;
    }>;
  }>;
}
```

- Student memerlukan enrollment aktif dan course published.
- Manager melihat seluruh module sebagai available.
- Module kosong tidak dianggap completed.

### `learning.getCourseItem`

```ts
query({ courseItemId: string }): MaterialOrVocabularyItem | null
```

- Menolak direct ID untuk item pada module locked.
- Material output: content, schema version, metadata confirmed asset.
- Vocabulary output: entries terurut dan metadata audio asset.
- Assessment item mengembalikan `null`; gunakan `assessment.getForCourseItem`.

### `learning.markContentProgress`

```ts
mutation({
  courseItemId: string;
  status: "IN_PROGRESS" | "COMPLETED";
}): {
  status: "IN_PROGRESS" | "COMPLETED";
  startedAt: Date;
  completedAt: Date | null;
}
```

- Hanya untuk `MATERIAL` dan `VOCABULARY_SET`.
- Assessment completion ditentukan oleh grading.
- Completion bersifat monotonic; completed tidak kembali menjadi in-progress.
- Material completion memvalidasi seluruh requirement `ALL`/`ANY`.
- Requirement belum terpenuhi menghasilkan `PRECONDITION_FAILED`.

### `learning.setProgressionMode`

```ts
mutation({
  courseId: string;
  progressionMode: "OPEN" | "SEQUENTIAL";
}): { id: string; progressionMode: "OPEN" | "SEQUENTIAL" }
```

- Scope: pengelola course.

---

## Assessment

### Authoring Fields

```ts
type AssessmentFields = {
  title: string; // 1..200
  description?: string | null; // max 10,000
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  editorSchemaVersion?: number; // integer > 0
  instructions?: JsonValue;
  passingScore?: number | null; // integer 0..100
  maxAttempts?: number | null; // integer > 0
  timeLimitMinutes?: number | null; // integer > 0
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
};
```

### `assessment.list`

```ts
query({ organizationId: string }): AssessmentWithCounts[]
```

- Owner/admin melihat semua assessment organization.
- Teacher melihat assessment buatannya.

### `assessment.get`

```ts
query({ assessmentId: string }): AssessmentWithQuestionsAndCorrectOptions
```

- Endpoint authoring; dapat memuat `isCorrect`.
- Jangan gunakan endpoint ini pada layar student.

### `assessment.create`

```ts
mutation(AssessmentFields & { organizationId: string }): Assessment
```

- Teacher menjadi creator assessment-nya sendiri.
- `publishedAt` diisi bila dibuat langsung sebagai published.

### `assessment.update`

```ts
mutation(Partial<AssessmentFields> & { assessmentId: string }): Assessment
```

### `assessment.delete`

```ts
mutation({ assessmentId: string }): { deleted: true }
```

### Question Authoring

```ts
type QuestionFields = {
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "WRITTEN";
  prompt: JsonValue;
  explanation?: JsonValue;
  points?: number; // integer 1..10,000
};
```

#### `assessment.createQuestion`

```ts
mutation(QuestionFields & { assessmentId: string }): AssessmentQuestion
```

#### `assessment.updateQuestion`

```ts
mutation(Partial<QuestionFields> & { questionId: string }): AssessmentQuestion
```

#### `assessment.deleteQuestion`

```ts
mutation({ questionId: string }): { deleted: true }
```

Question baru ditempatkan di posisi terakhir.

### Option Authoring

```ts
type OptionFields = {
  content: JsonValue;
  isCorrect?: boolean;
};
```

#### `assessment.createOption`

```ts
mutation(OptionFields & { questionId: string }): AssessmentOption
```

- Tidak dapat menambah option pada written question.

#### `assessment.updateOption`

```ts
mutation(Partial<OptionFields> & { optionId: string }): AssessmentOption
```

#### `assessment.deleteOption`

```ts
mutation({ optionId: string }): { deleted: true }
```

### Student Assessment

#### `assessment.getForCourseItem`

```ts
query({ courseItemId: string }): {
  id: string;
  title: string;
  description: string | null;
  instructions: JsonValue | null;
  passingScore: number | null;
  maxAttempts: number | null;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  status: "PUBLISHED";
  questions: Array<{
    id: string;
    type: AssessmentQuestionType;
    prompt: JsonValue;
    points: number;
    position: number;
    options: Array<{ id: string; content: JsonValue; position: number }>;
  }>;
}
```

- Memerlukan akses course item dan module unlocked.
- Tidak pernah mengembalikan `isCorrect` atau explanation.

#### `assessment.startAttempt`

```ts
mutation({ courseItemId: string }): AssessmentAttempt
```

- Assessment wajib published.
- Mengembalikan attempt in-progress yang sudah ada bila ada.
- Menolak jika `maxAttempts` tercapai.
- Membuat progress in-progress.

#### `assessment.saveAnswers`

```ts
mutation({
  attemptId: string;
  answers: Array<{
    questionId: string;
    content?: JsonValue; // written only
    optionIds?: string[];// default []
  }>;
}): { saved: number }
```

- Array 1..200; question tidak boleh duplikat.
- Attempt wajib dimiliki user dan masih `IN_PROGRESS`.
- Single choice maksimal satu option.
- Written memakai `content`; choice memakai `optionIds`.
- Save berjalan dalam serializable transaction dan mengganti selections lama.

#### `assessment.submitAttempt`

```ts
mutation({ attemptId: string }): {
  status: "GRADED" | "IN_REVIEW";
  score: number;
  maxScore: number;
}
```

- Choice di-auto-grade dengan exact option matching.
- Adanya written question menghasilkan `IN_REVIEW`.
- Progress completed hanya jika hasil akhir mencapai passing score.

#### `assessment.getMyAttempt`

```ts
query({ attemptId: string }): MyAssessmentAttempt
```

- Hanya pemilik attempt.
- Score dan feedback internal disembunyikan selama `IN_PROGRESS`/`IN_REVIEW`.

### Manual Review

#### `assessment.listAttemptsNeedingReview`

```ts
query({
  organizationId: string;
  assessmentId?: string;
}): ReviewQueueItem[]
```

- Scope: reviewer organization.
- Hanya attempt `IN_REVIEW` dan written answers.

#### `assessment.reviewAttempt`

```ts
mutation({
  attemptId: string;
  answers: Array<{
    answerId: string;
    score: number;       // integer >= 0, maksimal points question
    feedback?: JsonValue;
  }>;
}): {
  status: "GRADED";
  score: number;
  maxScore: number | null;
}
```

- Reviewer wajib memiliki scope course/cohort learner tersebut.
- Semua written answer wajib dinilai sebelum attempt menjadi graded.
- Progress completed hanya jika total score mencapai passing score.

---

## Storage

File binary tidak melewati server Next.js. Client upload/download langsung ke R2
menggunakan signed URL berdurasi lima menit.

Ukuran maksimal dokumen: 100 MiB.

### Organization Logo

Logo organization menerima JPEG, PNG, WebP, atau GIF dengan ukuran maksimal 5 MiB.
Seluruh mutation memerlukan scope `OWNER` atau `ADMIN` organization.

#### `storage.createOrganizationLogoUploadUrl`

```ts
mutation({
  organizationId: string;
  contentType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  fileSize: number; // 1..5 MiB
}): {
  key: string;
  uploadUrl: string;
  expiresIn: 300;
  headers: { "Content-Type": string };
}
```

Client mengunggah file langsung ke `uploadUrl` menggunakan HTTP `PUT`, lalu
memanggil procedure confirm.

#### `storage.confirmOrganizationLogoUpload`

```ts
mutation({ organizationId: string; key: string }): { logoUrl: string }
```

- Memeriksa key, ukuran object, dan content type terhadap signed request.
- Menyimpan relative `logoUrl` setelah validasi berhasil.
- Object logo managed sebelumnya dihapus setelah penggantian berhasil.

#### `storage.discardOrganizationLogoUpload`

```ts
mutation({ organizationId: string; key: string }): { deleted: true }
```

- Digunakan untuk membersihkan object yang sudah diunggah tetapi gagal dikonfirmasi.
- Logo yang sedang aktif tidak dapat di-discard.

#### `storage.deleteOrganizationLogo`

```ts
mutation({ organizationId: string }): { deleted: true }
```

- Mengosongkan `Organization.logoUrl` dan menghapus object managed dari R2.
- Idempotent ketika organization belum memiliki logo.

### `storage.createUploadUrl`

```ts
mutation({
  organizationId: string;
  fileName: string;       // 1..255
  contentType: string;    // MIME type
  fileSize: number;       // integer 1..100 MiB
}): {
  assetId: string;
  key: string;
  uploadUrl: string;
  expiresIn: 300;
  headers: { "Content-Type": string };
}
```

- Scope: organization member dengan permission membuat asset.
- Membuat record `Asset` yang belum confirmed.

Upload dari client:

```ts
const signed = await createUpload.mutateAsync({
  organizationId,
  fileName: file.name,
  contentType: file.type,
  fileSize: file.size,
});

await fetch(signed.uploadUrl, {
  method: "PUT",
  headers: signed.headers,
  body: file,
});

await confirmUpload.mutateAsync({ key: signed.key });
```

### `storage.confirmUpload`

```ts
mutation({ key: string }): {
  assetId: string;
  key: string;
  size: number;
  contentType: string;
  etag: string | null;
}
```

- Hanya uploader dan key miliknya.
- Memeriksa object R2, ukuran, dan metadata sebelum confirm.
- Object dengan ukuran tidak sesuai dihapus.

### `storage.createDownloadUrl`

```ts
mutation({ assetId: string }): {
  downloadUrl: string;
  expiresIn: 300;
}
```

- Uploader dan owner/admin organization memiliki direct access.
- Learner harus memiliki akses ke course item terkait.
- Sequential module lock juga berlaku pada direct asset ID.
- Resource tanpa akses dikembalikan sebagai `NOT_FOUND`.

### `storage.deleteDocument`

```ts
mutation({ key: string }): { deleted: true }
```

- Hanya uploader.
- Asset yang masih dipakai material/vocabulary menghasilkan `CONFLICT`.
- Delete bersifat idempotent dan menggunakan soft-delete metadata setelah object R2 dihapus.

---

## Integrasi Backend dan Editor

### BlockNote

Komponen reusable tersedia di `src/components/editor`. `BlockNoteEditor` memakai
`@blocknote/shadcn` dan menerima `initialContent`, `editable`, `theme`, serta
callback `onChange(document)`. `DynamicBlockNoteEditor` disediakan untuk penggunaan
client-only di Next.js karena editor bergantung pada DOM. Komponen tidak membuat
route atau melakukan persistence sendiri; consumer dapat menyimpan dokumen melalui
`content.createMaterial` atau `content.updateMaterial`.

### Zoom

Backend menyediakan connect/callback OAuth serta meeting API melalui cohort router.
UI dapat memulai OAuth dengan mengarahkan browser ke connect route. Token dan client
secret tidak masuk bundle browser atau output tRPC.

---

## Alur End-to-End

### Authoring Course

```text
organization.list
→ course.create
→ content.createMaterial / assessment.create / content.createVocabularySet
→ content.createModule
→ content.createItem
→ course.update({ status: "PUBLISHED" })
```

### Upload dan Attach Asset

```text
storage.createUploadUrl
→ HTTP PUT ke uploadUrl
→ storage.confirmUpload
→ content.attachMaterialAsset
```

### Enrollment Manual

```text
course.listPublished
→ enrollment.setCourseEnrollment (oleh manager)
→ learning.listMyCourses (oleh student)
```

### Enrollment Open

```text
course.listPublished
→ enrollment.enrollOpenCourse (student)
→ learning.listMyCourses
→ learning.getCourseOutline
```

### Enrollment Invite

```text
enrollment.createInvite (manager)
→ share token
→ enrollment.redeemInvite (student)
→ learning.getCourseOutline
```

### Belajar Material Sequential

```text
learning.getCourseOutline
→ learning.getCourseItem
→ learning.markContentProgress({ status: "IN_PROGRESS" })
→ penuhi material requirements
→ learning.markContentProgress({ status: "COMPLETED" })
→ learning.getCourseOutline // module berikutnya dapat terbuka
```

### Assessment Choice

```text
assessment.getForCourseItem
→ assessment.startAttempt
→ assessment.saveAnswers
→ assessment.submitAttempt
→ assessment.getMyAttempt
→ learning.getCourseOutline
```

### Assessment Written

```text
assessment.startAttempt (student)
→ assessment.saveAnswers
→ assessment.submitAttempt // IN_REVIEW
→ assessment.listAttemptsNeedingReview (teacher/admin)
→ assessment.reviewAttempt
→ assessment.getMyAttempt (student)
```

### Cohort

```text
cohort.create
→ cohort.addStaff
→ enrollment.setCohortEnrollment / enrollment.createInvite
→ cohort.createMeeting
```

---

## Enum

```ts
type OrganizationRole = "OWNER" | "ADMIN" | "TEACHER";
type EnrollmentMode = "OPEN" | "INVITE_ONLY";
type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type CourseProgressionMode = "OPEN" | "SEQUENTIAL";
type CohortStatus =
  "DRAFT" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type CohortStaffRole = "TEACHER" | "MODERATOR";
type CohortMeetingStatus = "SCHEDULED" | "STARTED" | "ENDED" | "CANCELLED";
type CourseItemType = "MATERIAL" | "ASSESSMENT" | "VOCABULARY_SET";
type RequirementPolicy = "ALL" | "ANY";
type MaterialRequirementType = "ASSESSMENT" | "VOCABULARY_SET";
type AssessmentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type AssessmentQuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "WRITTEN";
type AssessmentAttemptStatus =
  "IN_PROGRESS" | "SUBMITTED" | "IN_REVIEW" | "GRADED";
type EnrollmentStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
type EnrollmentSource = "OPEN" | "INVITE" | "PURCHASE" | "MANUAL" | "COHORT";
type ProgressStatus = "IN_PROGRESS" | "COMPLETED";
type ZoomConnectionStatus = "CONNECTED" | "EXPIRED" | "REVOKED";
```

## Batas Integrasi

Seluruh model Prisma utama sudah memiliki boundary API. Beberapa integrasi tetap
memerlukan provider eksternal dan tidak boleh disimulasikan hanya dengan menulis
database:

| Integrasi                            | Status                              |
| ------------------------------------ | ----------------------------------- |
| Better Auth                          | Aktif untuk web dan mobile          |
| PostgreSQL/Neon                      | Aktif melalui Prisma                |
| Cloudflare R2                        | Signed upload/download aktif        |
| Zoom connection metadata             | Read dan disconnect/revoke tersedia |
| Zoom OAuth/token refresh             | Aktif untuk General App OAuth       |
| Create/update/delete meeting di Zoom | Aktif melalui cohort meeting API    |
| Payment                              | Belum tersedia                      |

Webhook meeting lifecycle belum tersedia. Perubahan status meeting yang dilakukan
langsung di Zoom belum otomatis memperbarui `CohortMeeting.status`.

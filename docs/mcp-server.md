# Hakgyo MCP Server Development Reference

Referensi teknis untuk membangun remote Model Context Protocol (MCP) server
Hakgyo di aplikasi Next.js dengan `mcp-handler` dari Vercel dan OAuth.

Status dokumen: **persiapan implementasi, belum mendefinisikan daftar tools**.

Terakhir diverifikasi: **16 Agustus 2026**.

## Tujuan

Dokumen ini menjadi sumber acuan saat mengembangkan MCP server Hakgyo. Cakupan:

- baseline protokol dan dependency terbaru;
- arsitektur Next.js, `mcp-handler`, dan Better Auth;
- OAuth discovery, token validation, scope, dan consent;
- kompatibilitas AI client;
- keamanan, testing, observability, dan deployment Vercel;
- struktur kode dan urutan implementasi yang direkomendasikan.

Capability map, initial tool surface, dan role-based access profile sudah
ditetapkan di [MCP Capability and Scope Design](./mcp-design.md). Exact schemas dan
implementation contracts tetap dikunci saat tool diimplementasikan.

## Keputusan Utama

| Area                       | Keputusan                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| MCP adapter                | `mcp-handler` 2.x dari Vercel                                                                    |
| MCP SDK                    | `@modelcontextprotocol/server` 2.x                                                               |
| Protokol utama             | MCP `2026-07-28`                                                                                 |
| Kompatibilitas             | Fallback stateless Streamable HTTP era 2025 dari handler yang sama                               |
| Transport                  | Streamable HTTP pada satu endpoint `POST /api/mcp`                                               |
| Runtime                    | Next.js App Router, Node.js 20+                                                                  |
| Deployment                 | Vercel Functions, stateless, Fluid Compute                                                       |
| Resource server            | Next.js `/api/mcp` dengan `withMcpAuth`                                                          |
| Authorization server       | Provider OAuth yang lolos RFC 8707; prefer Better Auth setelah patched release tervalidasi       |
| Token                      | JWT access token yang audience-bound ke MCP resource                                             |
| Client registration awal   | Pre-registration untuk client utama dan DCR sebagai fallback                                     |
| Client registration target | CIMD pada authorization server yang sudah tervalidasi                                            |
| Authorization domain       | `hakgyo:mcp` membuka koneksi; role dan permission Hakgyo divalidasi per organization/resource    |
| State                      | Tidak ada state sesi MCP di memory; state lintas call disimpan durable dan memakai opaque handle |

## Baseline Repository

Kondisi aplikasi web saat dokumen ini dibuat:

| Komponen        | Kondisi                                                     |
| --------------- | ----------------------------------------------------------- |
| Next.js         | `^16.3.1`                                                   |
| React           | `^19.2.0`                                                   |
| Node.js         | `>=20.9.0`                                                  |
| Package manager | Bun `1.3.14`                                                |
| Better Auth     | `^1.3`, konfigurasi aktif memakai Prisma/PostgreSQL         |
| Zod             | `^3.24.2`                                                   |
| Database        | Prisma 7 dan PostgreSQL/Neon                                |
| Existing auth   | Email/password, Google sign-in, Expo plugin, cookie session |

Gap yang harus diselesaikan sebelum implementasi:

1. `mcp-handler` 2.x membutuhkan Zod `^4.2.0`, sedangkan web masih memakai
   Zod 3. Upgrade harus diuji untuk seluruh workspace web, bukan hanya MCP.
2. Better Auth login yang aktif sekarang menjadikan Hakgyo OAuth client untuk
   Google. MCP juga membutuhkan Hakgyo bertindak sebagai OAuth authorization
   server. Ini peran berbeda dan memerlukan OAuth Provider plugin, consent UI,
   schema database tambahan, dan token policy.
3. Better Auth OAuth Provider stable `1.6.29` terkena
   [GHSA-p2fr-6hmx-4528](https://github.com/better-auth/better-auth/security/advisories/GHSA-p2fr-6hmx-4528).
   Versi itu tidak mengikat OAuth `resource` ke authorization code dan refresh
   grant sesuai RFC 8707. Jangan memakainya sebagai authorization boundary MCP
   production.
4. Better Auth 1.7 prerelease sudah membawa patch RFC 8707 dan CIMD, tetapi juga
   membawa breaking API/schema migrations. Gunakan hanya pada spike terisolasi
   sampai release yang dipilih lolos migration dan security review.

## Versi Dependency

Versi registry yang diverifikasi pada 16 Agustus 2026:

| Package                        |           Versi | Catatan                                           |
| ------------------------------ | --------------: | ------------------------------------------------- |
| `mcp-handler`                  |         `2.1.1` | Adapter Vercel, Node.js 20+                       |
| `@modelcontextprotocol/server` |         `2.0.0` | SDK server v2                                     |
| `better-auth`                  |        `1.6.29` | Stable                                            |
| `@better-auth/oauth-provider`  |        `1.6.29` | Stable, tetapi tidak MCP-compliant untuk RFC 8707 |
| `@better-auth/cimd`            | `1.7.0-beta.10` | Beta; satu release line dengan OAuth Provider 1.7 |

Dependency resource server yang sudah dapat dipakai ketika implementasi dimulai:

```bash
bun --cwd apps/web add --exact mcp-handler@2.1.1 @modelcontextprotocol/server@2.0.0 zod@4.4.3
```

Jangan langsung menjalankan perintah di atas sebelum membuat branch migrasi Zod
dan mengukur perubahan type/runtime pada router tRPC, environment validation,
form schemas, dan tests. Authorization server dependency dipilih terpisah setelah
menentukan salah satu jalur berikut:

| Jalur                         | Kapan dipilih                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| Better Auth patched release   | Setelah minimal `1.7.0-beta.4`, versi exact, migration, RFC 8707, dan CIMD tervalidasi |
| External authorization server | Jika membutuhkan production launch sebelum Better Auth release yang diterima tersedia  |

Better Auth stable 1.6 boleh dipakai pada prototype dengan satu audience untuk
mengurangi cross-audience escalation, tetapi tetap tidak compliant dan tidak
boleh dijadikan production security boundary.

Pin direct MCP/OAuth dependencies secara exact di `package.json`. Lockfile
menentukan seluruh transitive dependency untuk build repeatable. Jangan
mengandalkan `latest` atau floating ranges di CI dan produksi; upgrade dilakukan
sebagai perubahan terpisah yang di-review.

## Arsitektur

MCP authorization memiliki tiga peran terpisah:

| Peran                | Implementasi Hakgyo                                           | Tanggung jawab                                                                |
| -------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| MCP client           | Claude, ChatGPT, Cursor, VS Code, Inspector                   | Menemukan server, OAuth login, menyimpan token, memanggil tools               |
| Resource server      | `POST /api/mcp`                                               | Memvalidasi token, scope, permission, dan menjalankan tool                    |
| Authorization server | Better Auth patched release atau provider eksternal compliant | Login, consent, client registration, authorization code, token, refresh, JWKS |

```mermaid
flowchart LR
  Client[AI Client] -->|1. MCP request| MCP[Next.js /api/mcp]
  MCP -->|2. 401 + resource_metadata| Client
  Client -->|3. Protected Resource Metadata| PRM[/.well-known/oauth-protected-resource]
  Client -->|4. OAuth metadata| Auth[OAuth Authorization Server]
  Client -->|5. Authorization Code + PKCE| Auth
  Auth -->|6. Access and refresh token| Client
  Client -->|7. Bearer access token| MCP
  MCP -->|8. Prisma and domain services| DB[(PostgreSQL/Neon)]
```

### URL Canonical

Gunakan identifier yang konsisten dan tanpa trailing slash:

```text
Application origin:    https://<hakgyo-origin>
MCP endpoint/resource: https://<hakgyo-origin>/api/mcp
Auth issuer:           https://<hakgyo-origin>/api/auth
```

Canonical MCP resource harus sama pada:

- metadata RFC 9728 `resource`;
- OAuth authorization request `resource`;
- OAuth token request `resource`;
- Better Auth `validAudiences`;
- JWT `aud` validation di resource server;
- konfigurasi dan telemetry server.

Perbedaan trailing slash atau pemakaian origin saja dapat menyebabkan token
ditolak. Definisikan satu helper/config server-side untuk membangun URL tersebut.

## Protokol dan Transport

### MCP 2026-07-28

`mcp-handler` 2.x melayani MCP `2026-07-28` secara native dan menyediakan
fallback stateless untuk client Streamable HTTP era 2025 dari endpoint yang sama.

Karakteristik protokol terbaru:

- setiap JSON-RPC request dikirim sebagai HTTP `POST` terpisah;
- client `Accept` wajib memuat `application/json` dan `text/event-stream`;
- tidak ada protocol-level session atau initialization handshake modern;
- setiap request membawa metadata versi dan capability;
- setiap POST modern membawa `MCP-Protocol-Version` dan `Mcp-Method`;
- `tools/call`, `resources/read`, dan `prompts/get` juga membawa `Mcp-Name`;
- header dan JSON-RPC body harus cocok; mismatch menghasilkan HTTP `400` dan
  error `-32020 HeaderMismatch`;
- server mendukung `server/discover`;
- response berupa JSON tunggal atau SSE yang hanya berlaku untuk request itu;
- SSE dipakai bila ada progress/logging sebelum final result;
- long-lived change notifications memakai `subscriptions/listen`;
- GET stream, DELETE session, `Mcp-Session-Id`, dan resumability
  `Last-Event-ID` bukan bagian dari revision terbaru.

### Endpoint

Expose satu URL:

```text
POST https://<hakgyo-origin>/api/mcp
```

`mcp-handler` quickstart mengekspor `GET` dan `POST` untuk kompatibilitas. Pada
era modern, GET dan DELETE bukan transport operation dan harus menghasilkan
`405`. Jangan membuat endpoint baru `/sse` atau `/message`.

### Statelessness

Factory MCP dibuat per request. Tool, resource, dan prompt didaftarkan di dalam
factory, bukan pada shared `McpServer` instance.

Yang boleh berada di module scope:

- Prisma connection pool/client;
- immutable configuration;
- safe cache yang tidak membawa identity atau authorization request;
- helper dan schema yang tidak mutable.

Yang tidak boleh berada di module scope:

- current user atau token;
- tenant aktif;
- daftar tool yang dimutasi berdasarkan request sebelumnya;
- transaction, cart, job, atau workflow state milik caller tertentu.

State lintas tool call umumnya memakai opaque identifier yang disimpan di
PostgreSQL atau durable store. Setiap pemakaian handle wajib mengecek ownership,
tenant, expiry, dan permission kembali. Handle bukan bukti authorization.

MRTR `requestState` dapat berupa opaque handle atau blob stateless yang
integrity-protected dengan HMAC/AEAD. Dalam kedua bentuk, state harus terikat ke
principal, expiry, method/request digest, dan authorization context. Anggap semua
state dari client sebagai untrusted input. Operasi single-use tetap memerlukan
durable replay prevention.

## OAuth Authorization

### Discovery Flow

Alur yang harus berhasil tanpa konfigurasi manual:

1. Client memanggil MCP tanpa token.
2. MCP mengembalikan `401 Unauthorized` dengan `WWW-Authenticate: Bearer`.
3. Challenge menyertakan `resource_metadata` dan initial scopes yang dibutuhkan.
4. Client membaca Protected Resource Metadata RFC 9728.
5. Client mengambil issuer dari `authorization_servers`.
6. Client membaca RFC 8414 Authorization Server Metadata atau OIDC Discovery.
7. Client memperoleh client ID melalui pre-registration, CIMD, atau DCR.
8. Client menjalankan Authorization Code Flow dengan PKCE `S256`.
9. Client menyertakan `resource` pada authorization dan token request.
10. Authorization server melakukan login dan consent.
11. Client menukar code dengan access token dan optional refresh token.
12. Client mengulang MCP request dengan `Authorization: Bearer <token>`.

### Required Discovery Endpoints

Protected Resource Metadata:

```text
/.well-known/oauth-protected-resource/api/mcp
```

Path-specific endpoint adalah bentuk paling spesifik untuk resource
`/api/mcp` dan menjadi endpoint authoritative yang dirujuk challenge. Root
`/.well-known/oauth-protected-resource` boleh ditambahkan sebagai compatibility
fallback, tetapi response-nya harus dibuat eksplisit agar tetap mempublikasikan
resource `/api/mcp`, bukan origin saja.

Authorization Server Metadata untuk issuer `/api/auth`:

```text
/api/auth/.well-known/oauth-authorization-server
/.well-known/oauth-authorization-server/api/auth
```

Jika `openid` diaktifkan, sediakan juga:

```text
/api/auth/.well-known/openid-configuration
```

Semua discovery response harus dapat diakses tanpa login, memiliki content type
yang benar, dan tidak boleh ter-cache lebih lama daripada perubahan konfigurasi
OAuth yang bisa diterima.

Route root-insertion `/.well-known/oauth-authorization-server/api/auth` tidak
masuk ke existing catch-all `/api/auth/[...all]`. Next.js route tersebut wajib
dibuat eksplisit dengan helper authorization server, misalnya
`oauthProviderAuthServerMetadata(auth)` jika Better Auth dipilih.

### Protected Resource Metadata

Blueprint menggunakan helper Vercel:

```ts
// src/app/.well-known/oauth-protected-resource/api/mcp/route.ts
import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";

const handler = protectedResourceHandler({
  authServerUrls: ["https://<hakgyo-origin>/api/auth"],
});

export { handler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
```

Pada path tersebut, `protectedResourceHandler` menghapus prefix well-known dan
menghasilkan canonical resource `https://<hakgyo-origin>/api/mcp`. Test exact
output di staging, terutama ketika request melewati Vercel proxy/custom domain.

Jika root compatibility route ditambahkan, gunakan metadata generator dengan
explicit canonical resource setelah memverifikasi API export pada versi package
yang dikunci. Jangan memakai root `protectedResourceHandler` secara langsung
karena hasil resource-nya adalah origin.

### Authorization Server Selection Gate

Tidak ada Better Auth stable release yang dapat menjadi baseline compliant pada
tanggal verifikasi dokumen. `@better-auth/oauth-provider@1.6.29` menyediakan
sebagian besar primitives berikut, tetapi terkena GHSA RFC 8707:

- OAuth 2.1 Authorization Code;
- PKCE, dengan `S256` untuk public client;
- public dan confidential clients;
- JWT access token dan JWKS verification;
- audience allowlist tanpa grant-level resource binding yang compliant;
- refresh token dan rotation;
- consent;
- RFC 8414/OIDC discovery;
- RFC 7591 DCR;
- token introspection dan revocation.

Authorization server production harus memenuhi seluruh gate berikut:

- `resource` dicatat pada authorization grant;
- token request hanya boleh mempersempit, bukan memperluas resource grant;
- refresh token tetap terikat ke original resource set;
- JWT/introspection mengeluarkan exact audience;
- authorization code + PKCE `S256`;
- RFC 8414 atau OIDC discovery;
- RFC 9207 issuer response validation;
- exact redirect URI validation;
- public client support;
- rotating refresh tokens;
- consent, revocation, dan abuse controls;
- pre-registration serta CIMD atau temporary DCR fallback.

Blueprint Better Auth setelah memilih patched release, bukan kode yang boleh
langsung dipasang pada stable 1.6:

```ts
import { oauthProvider } from "@better-auth/oauth-provider";
import { jwt } from "better-auth/plugins";

betterAuth({
  // existing Better Auth configuration
  plugins: [
    jwt(),
    oauthProvider({
      loginPage: "/sign-in",
      consentPage: "/oauth/consent",
      validAudiences: ["https://<hakgyo-origin>/api/mcp"],
      scopes: ["openid", "profile", "hakgyo:mcp", "offline_access"],
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      clientRegistrationDefaultScopes: ["openid", "profile", "hakgyo:mcp"],
      clientRegistrationAllowedScopes: ["hakgyo:mcp", "offline_access"],
    }),
    expo(),
  ],
});
```

Catatan implementasi:

- pin `better-auth`, OAuth Provider, dan CIMD package ke release line yang sama;
- API configuration di atas harus disesuaikan dengan migration guide release
  terpilih karena 1.7 membawa breaking contracts;
- resource scope MCP adalah `hakgyo:mcp`; capability efektif berasal dari role,
  ownership, assignment, dan enrollment domain;
- `offline_access` adalah authorization server concern dan tidak boleh menjadi
  required scope di Protected Resource Metadata;
- lakukan Better Auth schema generation lalu buat Prisma migration yang direview;
- jangan memakai `db push` untuk perubahan production schema;
- cek konflik route/token dengan Better Auth config sesuai versi plugin ter-lock;
- consent page wajib menampilkan nama client, redirect host, resource, dan scope;
- consent UI memakai `oauthProviderClient()` dan `oauth2.consent`, atau
  server-side equivalent yang terdokumentasi pada release terpilih;
- client tidak trusted secara default dan tidak boleh melewati consent;
- DCR endpoint wajib rate-limited, monitored, dan dilindungi dari database abuse;
- DCR default/allowed scopes harus minimum; role bukan OAuth scope dan tidak dapat
  diminta client untuk menaikkan privilege.

### CIMD Strategy

MCP `2026-07-28` merekomendasikan Client ID Metadata Documents (CIMD) dan
mendepresiasi DCR. Pada CIMD, `client_id` adalah HTTPS URL metadata milik client.

Better Auth stable `1.6.29` belum menjadi baseline CIMD dan tidak lolos RFC 8707.
Package `@better-auth/cimd` tersedia pada Better Auth `1.7.0-beta`, tetapi
membawa API, schema, dan migration contract baru.

Strategi Hakgyo:

| Fase                                 | Registration mechanism                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Development awal                     | Resource server dapat dibangun; OAuth memakai isolated patched spike atau compliant test issuer |
| Production awal                      | Wajib memakai patched/compliant AS; pre-register high-value clients; DCR hanya sebagai fallback |
| Setelah Better Auth release diterima | Evaluasi CIMD, migration guide, SSRF defense, dan compatibility tests                           |
| Setelah CIMD terbukti                | Advertise `client_id_metadata_document_supported: true`; DCR tetap sementara                    |
| Akhir transisi                       | Nonaktifkan unauthenticated DCR ketika target clients tidak membutuhkannya                      |

Jangan mengiklankan CIMD sebelum authorization server benar-benar dapat fetch,
validate, cache, dan mengamankan metadata documents.

Security review CIMD wajib mencakup:

- SSRF ke private, loopback, link-local, metadata service, dan reserved ranges;
- DNS rebinding dan perubahan hasil resolution;
- HTTPS enforcement;
- no redirects atau redirect policy yang sangat ketat;
- timeout dan response size limit;
- exact `client_id` equality;
- exact redirect URI validation;
- same-origin policy untuk `client_uri`, `logo_uri`, dan JWKS;
- cache expiry dan refresh behavior;
- audit provenance agar URL-shaped ID tidak mengambil alih registered client.

### Access Token Validation

Resource server tidak boleh sekadar decode JWT. Verifikasi wajib meliputi:

- signature menggunakan JWKS yang trusted;
- exact issuer `iss`;
- canonical MCP audience/resource `aud`;
- expiration `exp` dan optional `nbf`;
- granted scopes;
- subject/user identity;
- revoked/deleted session policy bila produk memerlukannya.

Authorization server yang dipilih direkomendasikan menerbitkan JWT access token
saja untuk MCP. Local JWT
verification lebih cepat dan menghindari introspection network call pada setiap
tool request. Introspection dapat ditambahkan untuk kebutuhan revocation
real-time, dengan cache, timeout, circuit breaker, dan credential khusus.

Token MCP tidak boleh diteruskan ke Zoom, Google, R2, atau upstream provider.
Gunakan credential/token upstream yang terpisah dan terikat pada integrasi
Hakgyo. Token passthrough dilarang oleh MCP authorization security guidance.

### mcp-handler Auth Wrapper

Blueprint route:

```ts
// src/app/api/mcp/route.ts
import type { AuthInfo } from "@modelcontextprotocol/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

const mcpHandler = createMcpHandler(
  (server) => {
    // registerTools(server) setelah function list disepakati
  },
  {
    serverInfo: { name: "hakgyo", version: "1.0.0" },
    maxSubscriptions: 0,
  },
);

async function verifyToken(
  request: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  // Verify JWT with Better Auth using exact issuer, audience, expiry, and scopes.
  // Map verified claims to AuthInfo; never trust unverified token claims.
  return undefined;
}

const authenticatedHandler = withMcpAuth(mcpHandler, verifyToken, {
  required: true,
  requiredScopes: ["hakgyo:mcp"],
  resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
});

export { authenticatedHandler as GET, authenticatedHandler as POST };
```

Final `verifyToken` sebaiknya memakai `verifyAccessToken` dari
authorization server/resource client sesuai API pada versi yang dikunci. Mapping
minimum ke `AuthInfo`:

```ts
{
  token: bearerToken,
  clientId: verifiedAuthorizedParty,
  scopes: verifiedScopes,
  expiresAt: verifiedExpiration,
  resource: new URL(canonicalMcpResource),
  extra: {
    userId: verifiedSubject,
    grantId: verifiedHakgyoGrantId,
  },
}
```

Untuk JWT Better Auth, `clientId` harus berasal dari verified authorized-party
claim seperti `azp`, bukan `sub`. `sub` adalah user identity dan tetap disimpan
terpisah di `extra.userId`. Walaupun `AuthInfo.expiresAt` optional dan middleware
hanya memeriksanya saat field ada, verifier Hakgyo wajib menolak token tanpa
verified `exp` dan mengisi `expiresAt` dari claim tersebut.

`grantId` berasal dari signed `hakgyo_grant_id` claim dan menunjuk durable grant
record server-side. Record menyimpan selected organization, maximum access
profile, allowed acting modes, dan tool-policy version. Jangan menerima
organization allowlist atau role authority dari request/tool argument.

Jangan memasukkan token, email, atau PII lain ke logs dan tool result.

## Authentication vs Authorization

OAuth menjawab dua pertanyaan:

- siapa user dan client yang memanggil;
- apakah client disetujui mengakses MCP untuk organization yang dipilih.

OAuth tidak menggantikan authorization domain Hakgyo. Setiap tool tetap harus
memeriksa:

- membership organisasi;
- owner/admin/teacher role;
- ownership course/content;
- assignment cohort;
- enrollment dan progression lock learner;
- cross-tenant boundary;
- lifecycle state resource.

Authorization rule existing di `src/server/authorization` harus dipakai ulang.
Jangan membuat permission logic kedua khusus MCP yang bisa drift dari tRPC.

Rekomendasi layering:

```text
Bearer token validation
-> require hakgyo:mcp
-> input validation
-> current role/access-profile resolution
-> domain permission check
-> domain service/use case
-> Prisma/provider operation
-> sanitized MCP result
```

`clientId` bukan `userId`. User identity berasal dari verified `sub`/claim yang
dipetakan ke `AuthInfo.extra.userId`. Client ID hanya mengidentifikasi aplikasi
AI yang bertindak atas nama user.

## Scope Model

Capability map, role-based access profile, dan staged tool surface ditetapkan di
[MCP Capability and Scope Design](./mcp-design.md). Gunakan aturan berikut:

- satu resource scope `hakgyo:mcp` membuka koneksi;
- role bukan OAuth scope dan tidak dapat diminta client;
- permission resource tetap fine-grained dan diperiksa server;
- owner/admin/teacher/learner profile dihitung dari domain state terbaru;
- grant membawa selected organization allowlist, bukan role authority;
- token membawa opaque grant ID yang dipetakan ke durable server-side grant;
- jangan menjadikan `offline_access` sebagai MCP resource scope.

Minimum endpoint scope:

```text
hakgyo:mcp
```

`withMcpAuth.requiredScopes` adalah static gate untuk seluruh endpoint. Gunakan
ini untuk `hakgyo:mcp`. Tool handler kemudian mengecek current role, ownership,
assignment, enrollment, tenant allowlist, dan lifecycle. Domain denial menjadi
actionable tool error, bukan `insufficient_scope`, karena reauthorization tidak
dapat menaikkan role Hakgyo.

Untuk ChatGPT, semua protected tools mendeklarasikan `hakgyo:mcp` pada
`securitySchemes`. `_meta["mcp/www_authenticate"]` dipakai hanya ketika connection
belum memiliki resource scope, bukan untuk domain role denial.

## Struktur Kode yang Direkomendasikan

```text
apps/web/src/
  app/
    api/
      auth/[...all]/route.ts
      mcp/route.ts
    .well-known/
      oauth-protected-resource/api/mcp/route.ts
      oauth-authorization-server/api/auth/route.ts
  server/
    better-auth/
      config.ts
      client.ts
      server.ts
    mcp/
      auth.ts
      config.ts
      server.ts
      errors.ts
      telemetry.ts
      tools/
        index.ts
```

Responsibilities:

| File                      | Tanggung jawab                                                |
| ------------------------- | ------------------------------------------------------------- |
| `app/api/mcp/route.ts`    | Runtime config, Origin/Host guard, auth wrapper, HTTP exports |
| `server/mcp/config.ts`    | Canonical resource URL, issuer, server name/version           |
| `server/mcp/auth.ts`      | JWT verification dan `AuthInfo` mapping                       |
| `server/mcp/server.ts`    | Per-request server factory dan registration composition       |
| `server/mcp/errors.ts`    | Domain-to-MCP error mapping dan output sanitization           |
| `server/mcp/telemetry.ts` | Structured audit events tanpa secrets                         |
| `server/mcp/tools/*`      | Schema, descriptions, annotations, dan thin tool handlers     |

Tools sebaiknya memanggil domain service yang juga dapat dipakai tRPC, bukan
memanggil procedure tRPC melalui HTTP dan bukan menduplikasi seluruh business
logic di adapter MCP.

## Origin, Host, dan CORS

MCP `2026-07-28` mewajibkan validasi `Origin` pada Streamable HTTP untuk
mencegah DNS rebinding. Handler SDK dan `mcp-handler` tidak boleh diasumsikan
melakukan semua boundary checks untuk deployment kita.

Policy route:

- jika `Origin` hadir, hanya izinkan origin client/browser yang eksplisit;
- invalid Origin menghasilkan `403` sebelum parsing MCP body;
- request non-browser tanpa Origin tetap dapat diproses;
- validasi effective host terhadap canonical application host;
- jangan mempercayai forwarded host tanpa platform/proxy trust boundary;
- localhost development hanya menerima host/origin development yang diketahui;
- metadata endpoints boleh memakai CORS public GET/OPTIONS karena tidak berisi
  secret, tetapi jangan menerapkan wildcard pada token atau MCP endpoint tanpa
  alasan terukur.

Tambahkan tests khusus untuk malicious Origin, spoofed host, `null` Origin, dan
request tanpa Origin.

## Tool Design Rules

Aturan ini dipakai pada fase function list berikutnya.

### Naming

- panjang 1 sampai 128 karakter;
- hanya huruf ASCII, angka, underscore, hyphen, atau dot;
- nama unik dan action-oriented;
- gunakan pola konsisten, misalnya `course.list` atau `course_list`;
- jangan mengandalkan server name untuk menghindari collision antar server.

### Schemas

- untuk implementasi SDK ini, gunakan full Standard Schema seperti Zod 4
  `z.object(...)` pada `inputSchema`;
- gunakan constraint, enum, format, dan field description yang jelas;
- gunakan `outputSchema` untuk structured result;
- return `structuredContent` dan text fallback untuk client lama;
- MCP mengizinkan JSON Schema 2020-12 dan structured output non-object; jangan
  menganggap aturan Zod object sebagai batas protokol;
- schema tanpa parameter sebaiknya menolak unknown properties; SDK juga dapat
  menghasilkan empty-object schema ketika `inputSchema` dihilangkan;
- output harus kecil, terfilter, dan paginated;
- jangan menandai token, API key, password, atau PII dengan `x-mcp-header`.

### Annotations

Set annotation berdasarkan perilaku nyata:

- `readOnlyHint`;
- `destructiveHint`;
- `idempotentHint`;
- `openWorldHint`.

Annotations membantu client UX tetapi tidak boleh dianggap security control.

### Results

- prioritaskan structured content untuk data;
- sertakan ringkasan text yang singkat dan actionable;
- jangan mengembalikan Prisma object mentah;
- projection harus eksplisit;
- redact secrets, internal IDs yang tidak perlu, answer keys, dan private URLs;
- pagination memakai opaque cursor dan deterministic ordering;
- signed URLs memiliki expiry yang jelas;
- batasi ukuran collection dan rich content.

### Errors

Gunakan protocol error hanya untuk malformed JSON-RPC, unknown method/tool, atau
server protocol failure. Domain dan input errors menjadi tool result dengan
`isError: true` agar model dapat memperbaiki call.

Error yang baik menjelaskan:

- apa yang gagal;
- parameter atau precondition yang salah;
- apakah aman di-retry;
- tindakan koreksi yang valid;
- tanpa stack trace, SQL, token, atau detail internal.

Map error tRPC/domain secara konsisten:

| Domain error                     | MCP behavior                                                    |
| -------------------------------- | --------------------------------------------------------------- |
| Bad input                        | Actionable tool execution error                                 |
| Unauthenticated/invalid token    | HTTP `401` OAuth challenge                                      |
| Missing minimum connection scope | HTTP `403 insufficient_scope` dari auth wrapper                 |
| Domain forbidden                 | Tool execution error atau generic forbidden, tanpa fake step-up |
| Hidden resource                  | Not found agar tidak membocorkan existence                      |
| Conflict/precondition            | Actionable tool execution error                                 |
| Transient provider error         | Retry guidance tanpa provider secret                            |
| Internal error                   | Stable correlation ID dan generic message                       |

## Human-in-the-Loop

MCP tools bersifat model-controlled. Client biasanya menyediakan confirmation,
tetapi server tetap harus aman jika confirmation UX tidak ada atau salah.

- read-only operasi boleh berjalan langsung setelah authorization;
- write operation harus idempotent bila memungkinkan;
- destructive/high-impact operation perlu explicit confirmation design;
- gunakan preview/commit pattern bila rollback sulit;
- hindari satu tool yang melakukan terlalu banyak perubahan tersembunyi;
- response harus menyebutkan perubahan yang benar-benar terjadi;
- jangan menganggap natural-language confirmation sebagai authorization.

MCP 2026 mendukung input-required/MRTR, tetapi adopsi client belum seragam.
Desain core workflows agar tetap aman tanpa bergantung penuh pada feature baru
tersebut.

MRTR berarti Multi Round-Trip Requests. Jangan memakai `requestState` sebagai
confirmation proof tanpa integrity, principal/expiry binding, dan replay
protection sesuai aturan state pada bagian statelessness.

## Vercel Deployment

### Runtime

Gunakan App Router Route Handler dan Node.js runtime. Pages Router API route
tidak dipilih karena streaming support dan integrasi Web Request/Response.

Konfigurasi durasi berada di route file:

```ts
export const runtime = "nodejs";
export const maxDuration = 60;
```

`maxDuration` adalah kebijakan workload, bukan config `mcp-handler` 2.x.

Vercel Fluid Compute limits yang diverifikasi:

| Plan       | Default | Maximum umum | Extended beta |
| ---------- | ------: | -----------: | ------------: |
| Hobby      |    300s |         300s |             - |
| Pro        |    300s |         800s |         1800s |
| Enterprise |    300s |         800s |         1800s |

Pilih duration terendah yang realistis. Tool yang membutuhkan proses panjang
harus memulai durable background job dan mengembalikan job handle, bukan menjaga
HTTP request tanpa batas.

### Subscriptions

Mulai dengan `maxSubscriptions: 0`:

- mengurangi long-lived connection dan billing complexity;
- menghindari stream mati karena function duration;
- target tools awal belum membutuhkan list/resource change notifications.

Aktifkan subscriptions hanya jika use case dan target clients sudah jelas.

### Regionality dan Database

- tempatkan function dekat Neon region bila tersedia;
- gunakan Prisma/Neon connection strategy yang sudah ada;
- jangan membuka transaction lintas tool call;
- berikan timeout pada database dan provider request;
- seluruh state durable disimpan di database/object storage;
- jangan mengandalkan warm instance atau invocation affinity.

## Client Compatibility

Support berubah cepat. Test client nyata sebelum release, bukan hanya mengikuti
config examples.

| Client                   | Direct Streamable HTTP | OAuth registration        | Catatan                                                         |
| ------------------------ | ---------------------- | ------------------------- | --------------------------------------------------------------- |
| Claude hosted connectors | Ya                     | CIMD, DCR, pre-registered | Endpoint harus public; hosted callback milik Anthropic          |
| Claude Code              | Ya                     | CIMD, DCR, static         | Loopback callback; non-interactive mode perlu login lebih dulu  |
| ChatGPT                  | Ya                     | CIMD, DCR, pre-registered | Public HTTPS; lazy auth dapat memerlukan tool security metadata |
| Cursor                   | Ya                     | DCR/static documented     | CIMD belum terdokumentasi jelas; pertahankan fallback           |
| VS Code/Copilot Chat     | Ya                     | CIMD, DCR, static         | CIMD preferred sejak VS Code 1.106                              |
| MCP Inspector            | Ya                     | CIMD, DCR, static         | Client utama untuk development dan CI                           |

Client URL selalu complete endpoint:

```text
https://<hakgyo-origin>/api/mcp
```

Jangan memberi URL origin saja atau legacy `/sse` path.

### Callback Registry

Pre-registration hanya dibuat untuk clients yang benar-benar ditargetkan.
Callback harus exact-match.

| Client            | Redirect URI                                                 |
| ----------------- | ------------------------------------------------------------ |
| Claude hosted     | `https://claude.ai/api/mcp/auth_callback`                    |
| Claude Code       | `http://localhost:<fixed-port>/callback` bila pre-registered |
| Cursor desktop    | `http://localhost:8787/callback`                             |
| Cursor web/agents | `https://www.cursor.com/agents/mcp/oauth/callback`           |
| VS Code desktop   | `http://127.0.0.1:33418`                                     |
| VS Code web       | `https://vscode.dev/redirect`                                |
| Inspector web     | `http://localhost:6274/oauth/callback`                       |
| Inspector CLI/TUI | `http://127.0.0.1:6276/oauth/callback`                       |
| ChatGPT           | Callback-specific URL yang ditampilkan di app management UI  |

Jangan memakai wildcard untuk hosted HTTPS redirect URI. Dynamic loopback port
memerlukan native-client redirect policy yang sesuai RFC 8252 atau fixed port.

### ChatGPT Lazy Authentication

Untuk server yang seluruh endpoint-nya protected, transport-level `401` dari
`withMcpAuth` cukup untuk memulai linking pada connection flow.

Untuk tool-level linking atau lazy authorization, ChatGPT memerlukan:

- per-tool `securitySchemes` metadata;
- tool error dengan `_meta["mcp/www_authenticate"]`;
- consistent `hakgyo:mcp` resource scope declaration.

Requirement tersebut tetap relevan meskipun seluruh MCP transport protected.
Baseline adalah seluruh MCP endpoint protected dengan `hakgyo:mcp`; role denial
tidak memicu OAuth step-up.

## Development Workflow

### Local OAuth

Hosted clients tidak dapat mencapai `localhost`. Development memakai dua mode:

1. MCP Inspector atau local client langsung ke `http://localhost:3000/api/mcp`.
2. Public HTTPS preview/tunnel untuk hosted Claude/ChatGPT/Cursor agents.

Rules tunnel:

- gunakan domain preview stabil selama satu test session;
- ubah `APP_URL`, issuer, resource, redirect allowlist, dan OAuth metadata secara
  konsisten;
- jangan expose development database berisi production data;
- jangan memakai production OAuth secrets;
- tutup tunnel setelah testing;
- jangan menyimpan tunnel URL ke committed config.

### Inspector

Inspector terbaru menyediakan web, CLI, dan TUI serta menguji OAuth discovery,
DCR/CIMD/static registration, refresh, reauthorization, dan scope step-up.

Contoh koneksi konseptual:

```bash
npx @modelcontextprotocol/inspector \
  --server-url http://localhost:3000/api/mcp \
  --transport http
```

CLI syntax dapat berubah; cek dokumentasi Inspector yang ter-lock pada saat
menambahkan script repository. Inspector terbaru mendokumentasikan Node
`22.19.0+`, sehingga jalankan melalui environment/tooling yang sesuai meskipun
runtime aplikasi tetap Node 20+.

Callback default:

```text
Web:     http://localhost:6274/oauth/callback
CLI/TUI: http://127.0.0.1:6276/oauth/callback
```

`localhost` dan `127.0.0.1` adalah redirect URI berbeda.

### Recommended Inner Loop

```text
Start Next.js
-> inspect discovery endpoints
-> connect Inspector
-> complete OAuth
-> list tools
-> call one read-only tool
-> inspect structured result and logs
-> test invalid input and permission denial
-> test expired/missing/wrong-audience token
```

## Testing Strategy

### Unit Tests

- canonical URL construction;
- token claim and scope mapping;
- wrong issuer/audience/expiry rejection;
- Origin and Host allowlist;
- domain error to MCP error mapping;
- tool input/output schema;
- projection/redaction;
- pagination cursor;
- permission checks per role and tenant.

### Route Integration Tests

- unauthenticated POST returns `401` with valid `WWW-Authenticate`;
- metadata URL dapat di-fetch;
- Protected Resource Metadata berisi exact resource dan issuer;
- authorization metadata advertises PKCE `S256`;
- valid token dapat memanggil `tools/list`;
- wrong audience token ditolak;
- missing minimum connection scope menghasilkan `403 insufficient_scope`;
- current role, ownership, assignment, enrollment, dan organization allowlist
  divalidasi pada tool call;
- promotion tidak melampaui grant maxProfile tanpa consent baru;
- demotion/removal langsung menurunkan akses existing token;
- `LEARNING` mode tidak fallback ke owner/admin/teacher authority;
- assignment satu cohort tidak memberi akses ke sibling cohort;
- domain permission denial tidak salah memicu OAuth reauthorization;
- malicious Origin menghasilkan `403`;
- GET/DELETE modern behavior sesuai adapter;
- missing/mismatched `MCP-Protocol-Version`, `Mcp-Method`, atau applicable
  `Mcp-Name` ditolak dengan HTTP `400` dan `-32020 HeaderMismatch`;
- `Mcp-Param-*` hanya wajib untuk parameter beranotasi `x-mcp-header` yang nilainya
  hadir dan non-null; missing/mismatch juga menghasilkan `HeaderMismatch`;
- request tanpa `Accept: application/json, text/event-stream` ditolak;
- 2025-era client fallback tetap berhasil.

### OAuth End-to-End Tests

- login dan consent;
- deny consent;
- authorization code + PKCE;
- exact redirect URI rejection;
- `resource` diteruskan ke authorization dan token request;
- JWT memiliki `iss`, `aud`, `sub`, `exp`, `scope`, dan client identity benar;
- access token refresh;
- refresh token rotation/reuse behavior;
- revoked client/token behavior;
- DCR public client registration dan abuse controls;
- pre-registered clients untuk target surfaces;
- CIMD tests ditambahkan hanya setelah feature diadopsi.

### Client Acceptance Matrix

Sebelum production:

| Surface        | Connect  | OAuth    | tools/list | Read call | Write call    | Refresh  | Step-up  |
| -------------- | -------- | -------- | ---------- | --------- | ------------- | -------- | -------- |
| Inspector web  | Required | Required | Required   | Required  | Required      | Required | Required |
| Inspector CLI  | Required | Required | Required   | Required  | Optional awal | Required | Required |
| Claude target  | Required | Required | Required   | Required  | Required      | Required | Required |
| ChatGPT target | Required | Required | Required   | Required  | Required      | Required | Required |
| Cursor target  | Required | Required | Required   | Required  | Required      | Required | Required |
| VS Code target | Required | Required | Required   | Required  | Required      | Required | Required |

Hanya surfaces yang menjadi launch target yang wajib masuk release gate. Jangan
mengklaim universal compatibility tanpa menjalankan test nyata.

### CI

Interactive OAuth tidak cocok untuk CI. Gunakan salah satu:

- in-process SDK client dengan test token issuer;
- dedicated pre-registered test client dan test user;
- Inspector stored auth pada protected secret store;
- short-lived token yang dibuat oleh test authorization server.

Jangan commit token atau Inspector OAuth state. CI test harus memisahkan
production issuer, client, database, dan credentials.

## Observability dan Audit

`mcp-handler.onEvent` dapat membawa `parameters` berisi parsed MCP body dan raw
tool arguments. Jangan meneruskan event mentah ke logger. Gunakan allowlist
projection yang selalu membuang `event.parameters`, raw error objects, headers,
dan result payload sebelum membuat structured event.

Log structured event hasil projection minimal:

- timestamp;
- request/correlation ID;
- hashed/pseudonymous user ID;
- client ID;
- tool name;
- organization/resource scope yang tidak sensitif;
- outcome dan stable error code;
- duration;
- result size;
- retryable flag;
- protocol era/client info jika tersedia.

Jangan log:

- Bearer token;
- authorization code;
- refresh token;
- cookie/session secret;
- password;
- full learner content atau assessment answer;
- signed R2 URL;
- raw tool arguments, baik terdeteksi mengandung PII maupun tidak;
- raw tool output.

Audit write/destructive calls secara durable. Bedakan product audit log dari
debug logs agar retention dan akses dapat diatur berbeda.

Metrics minimum:

- request count dan latency per method/tool;
- 401/403 rate;
- OAuth discovery/registration/token failures;
- token verification failures per reason tanpa token value;
- tool success/error rate;
- provider/database timeout;
- response size;
- Vercel timeout/termination;
- DCR registrations dan rejection rate.

## Rate Limiting dan Abuse Prevention

Apply policy per layer:

| Layer                 | Key utama                | Contoh limit                   |
| --------------------- | ------------------------ | ------------------------------ |
| OAuth authorize/token | IP, client ID, user      | Brute-force dan token abuse    |
| DCR                   | IP, ASN, time window     | Registration/database growth   |
| MCP endpoint          | client ID, user ID       | Protocol request flood         |
| Tool                  | user, organization, tool | Expensive/read/write operation |
| External provider     | organization/provider    | Zoom/R2/API quota              |

Rate-limit response harus konsisten, memiliki retry guidance jika aman, dan tidak
membocorkan apakah resource private tertentu ada.

## Security Checklist

- [ ] Production memakai HTTPS.
- [ ] Canonical MCP resource exact dan konsisten.
- [ ] Origin dan Host divalidasi sebelum handler.
- [ ] Bearer token hanya diterima lewat Authorization header.
- [ ] JWT signature, issuer, audience, expiry, dan scope diverifikasi.
- [ ] Refresh token untuk public client dirotasi.
- [ ] PKCE `S256` diiklankan dan diwajibkan.
- [ ] Redirect URI exact-match.
- [ ] OAuth `state` dan response `iss` divalidasi.
- [ ] Consent menampilkan client, resource, redirect host, dan scope.
- [ ] Tool tetap melakukan domain permission check.
- [ ] Cross-tenant access diuji.
- [ ] Token passthrough ke upstream dilarang.
- [ ] Secrets dan PII tidak masuk log/result.
- [ ] Input/output divalidasi dan ukuran dibatasi.
- [ ] Read/write/destructive annotations akurat.
- [ ] DCR rate-limited dan monitored.
- [ ] CIMD tidak diiklankan sebelum SSRF defenses siap.
- [ ] Dependency advisories dipantau.
- [ ] Incident response dapat revoke client, token, dan consent.

## Delivery Plan

### Phase 0: Decisions

- pilih launch clients;
- putuskan full-protected atau mixed-auth server;
- set canonical production/staging resource URL;
- pilih patched Better Auth release atau external compliant authorization server;
- register single resource scope `hakgyo:mcp`;
- rancang function list dan risk classification.

### Phase 1: Dependency and Auth Foundation

- migrate Zod 3 ke Zod 4;
- install SDK v2 dan `mcp-handler` 2.x;
- install exact authorization server versions yang sudah lolos RFC 8707 gate;
- generate dan review Prisma migration;
- implement login continuation dan consent page;
- mount authorization/discovery endpoints;
- implement JWT issuance, JWKS, audience, refresh, and revocation policy.

### Phase 2: MCP Skeleton

- buat canonical config;
- buat Origin/Host guard;
- buat token verification dan `AuthInfo` mapping;
- mount protected MCP route;
- expose temporary internal health/read-only test tool bila diperlukan;
- validate Inspector OAuth end to end.

Temporary test tool harus dihapus sebelum production function list dikunci.

### Phase 3: Tool Implementation

- implement tools per domain service;
- add schemas, annotations, structured results, and pagination;
- map role-based access profile dan domain permissions;
- add unit/integration/evaluation tests;
- add audit events dan rate limits.

### Phase 4: Client Certification

- test target clients;
- pre-register callbacks jika diperlukan;
- test DCR and static fallback;
- test refresh dan role/organization changes pada active grants;
- document user connection UX;
- run security review dan load tests.

### Phase 5: CIMD and DCR Transition

- bila memilih Better Auth, tunggu atau approve release patched yang diterima;
- review official 1.6-to-1.7 migration guide;
- review `@better-auth/cimd` SSRF model;
- test existing OAuth clients and migrations;
- enable CIMD on staging;
- retain DCR during compatibility window;
- disable unauthenticated DCR only after usage data supports it.

## Definition of Done

- [ ] MCP protocol `2026-07-28` dan legacy stateless fallback lolos tests.
- [ ] OAuth discovery bekerja tanpa manual metadata URL.
- [ ] Inspector dapat login, refresh, list, dan call.
- [ ] Canonical audience binding diuji negatif dan positif.
- [ ] Authorization code dan refresh grant tidak dapat memperluas resource set.
- [ ] Semua tools memiliki input schema, output contract, annotations, dan owner.
- [ ] Semua tools memerlukan `hakgyo:mcp` dan memiliki access-profile/domain
      permission mapping.
- [ ] Destructive operations memiliki confirmation/idempotency strategy.
- [ ] PII/secrets redaction diuji.
- [ ] Rate limits dan audit logs aktif.
- [ ] Target AI clients lulus acceptance matrix.
- [ ] Vercel timeout, concurrency, dan failure behavior diuji.
- [ ] Runbook revoke client/token dan incident response tersedia.
- [ ] Dokumentasi ini diperbarui dengan versi dependency yang benar-benar dikunci.

## Function Design Decisions

- target user mencakup owner, admin, teacher, dan learner/no-role;
- owner memiliki seluruh capability pada selected organization;
- admin memiliki seluruh capability kecuali owner management;
- teacher dibatasi course/content milik sendiri serta cohort/review pada course
  milik sendiri atau exact cohort assignment;
- learner/no-role read-only pada published resource yang memiliki entitlement;
- OAuth memakai satu resource scope `hakgyo:mcp`;
- selected organization disimpan pada grant allowlist dan divalidasi per call;
- tool listing boleh difilter untuk UX, tetapi handler authorization adalah
  security boundary;
- R3/R4 menggunakan target-specific preview/commit dan confirmation;
- exact schemas, pagination limits, dan primitive-versus-workflow split dikunci
  saat implementasi tiap phase.

## Known Caveats

- Spesifikasi MCP bergerak cepat. Gunakan revision `2026-07-28`, bukan URL
  `latest` atau `draft`, saat membuat behavior test.
- MCP `2026-07-28` masih merujuk CIMD draft-00, sementara draft IETF terus
  berkembang. Implementasi harus mengikuti revision MCP yang ditargetkan dan
  memonitor perubahan IETF.
- Dokumentasi Better Auth stable masih memiliki bagian DCR yang menyebut CIMD
  sebagai pekerjaan mendatang; package CIMD ada di prerelease 1.7. Stable 1.6
  juga terkena GHSA RFC 8707 dan bukan production baseline MCP.
- Dokumentasi client vendor kadang tertinggal dari implementasi. Test client nyata
  lebih authoritative untuk release compatibility.
- `mcp-handler` menyediakan adapter/resource-server auth wrapper, bukan OAuth
  authorization server lengkap.
- Next.js built-in `/_next/mcp` adalah development tooling Next.js, bukan endpoint
  business MCP Hakgyo.

## Sumber Primer

MCP specification:

- [MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)
- [Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [Authorization Server Discovery](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/authorization-server-discovery)
- [Client Registration](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration)
- [Authorization Security](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations)
- [Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP Inspector Authorization](https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector/authorization)

SDK dan Vercel:

- [MCP TypeScript SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/)
- [SDK v2 Serve over HTTP](https://ts.sdk.modelcontextprotocol.io/v2/serving/http.html)
- [Vercel mcp-handler](https://github.com/vercel/mcp-handler)
- [mcp-handler Authorization](https://github.com/vercel/mcp-handler/blob/main/docs/AUTHORIZATION.md)
- [mcp-handler Advanced Usage](https://github.com/vercel/mcp-handler/blob/main/docs/ADVANCED.md)
- [Vercel Function Duration](https://vercel.com/docs/functions/configuring-functions/duration)

Better Auth:

- [OAuth 2.1 Provider](https://www.better-auth.com/docs/plugins/oauth-provider)
- [Better Auth MCP plugin notice](https://www.better-auth.com/docs/plugins/mcp)
- [Better Auth CIMD development](https://github.com/better-auth/better-auth/pull/9159)
- [GHSA-p2fr-6hmx-4528: RFC 8707 resource binding](https://github.com/better-auth/better-auth/security/advisories/GHSA-p2fr-6hmx-4528)

OAuth standards:

- [RFC 6750 Bearer Token Usage](https://www.rfc-editor.org/rfc/rfc6750)
- [RFC 7591 Dynamic Client Registration](https://www.rfc-editor.org/rfc/rfc7591)
- [RFC 8414 Authorization Server Metadata](https://www.rfc-editor.org/rfc/rfc8414)
- [RFC 8707 Resource Indicators](https://www.rfc-editor.org/rfc/rfc8707)
- [RFC 9207 Authorization Server Issuer Identification](https://www.rfc-editor.org/rfc/rfc9207)
- [RFC 9700 OAuth Security BCP](https://www.rfc-editor.org/rfc/rfc9700)
- [RFC 9728 Protected Resource Metadata](https://www.rfc-editor.org/rfc/rfc9728)

Client references:

- [Claude Connectors](https://claude.com/docs/connectors/building)
- [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [OpenAI Apps Authentication](https://developers.openai.com/apps-sdk/build/auth)
- [Cursor MCP](https://cursor.com/docs/mcp)
- [VS Code MCP Configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)

## Maintenance Policy

Review dokumen ini ketika salah satu kondisi terjadi:

- MCP menerbitkan protocol revision baru;
- `mcp-handler` atau SDK mengubah major/minor contract;
- Better Auth 1.7 menjadi stable;
- target client mengubah OAuth atau transport support;
- canonical MCP URL/issuer berubah;
- function list atau scope model berubah;
- security advisory menyentuh MCP, OAuth, Better Auth, atau dependencies.

Saat memperbarui, catat tanggal verifikasi, versi registry, revision protokol,
dan behavior yang benar-benar diuji pada target clients.

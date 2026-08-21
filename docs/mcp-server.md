# Hakgyo MCP Server

Hakgyo exposes a remote, authenticated MCP server from the Next.js application.
This document describes the production architecture implemented by the repository.

## Baseline

| Area                 | Implementation                     |
| -------------------- | ---------------------------------- |
| MCP protocol         | `2026-07-28` only                  |
| MCP SDK              | `@modelcontextprotocol/server` 2.x |
| Transport            | Stateless Streamable HTTP          |
| Endpoint             | `POST /api/mcp`                    |
| Authorization server | Better Auth 1.7 `mcp()`            |
| Client identity      | CIMD profile `mcp-2026-07-28`      |
| Token                | Resource-bound JWT access token    |
| Resource scope       | `hakgyo:mcp`                       |

The server intentionally has no compatibility path for 2025-era MCP sessions or
Dynamic Client Registration. Clients must support MCP `2026-07-28` and Client ID
Metadata Documents.

## OAuth Roles

The deployment contains three distinct OAuth roles:

| Role                 | Implementation                                         | Responsibility                                                    |
| -------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| OAuth client         | Claude, ChatGPT, Cursor, VS Code, or another AI client | Discover authorization, obtain tokens, call MCP                   |
| Authorization server | Better Auth under `/api/auth`                          | Login, consent, PKCE, CIMD, token issuance, refresh, JWKS         |
| Resource server      | Hakgyo `POST /api/mcp`                                 | Verify token, enforce scope and domain permissions, execute tools |

The authorization server and resource server are co-hosted, but remain separate
security roles. The MCP route never issues tokens, accepts session cookies as MCP
credentials, or forwards its bearer token to another service.

## Canonical URLs

Given `APP_URL=https://hakgyo.example`:

```text
Authorization server issuer: https://hakgyo.example/api/auth
MCP protected resource:      https://hakgyo.example/api/mcp
JWKS:                        https://hakgyo.example/api/auth/jwks
Protected resource metadata: https://hakgyo.example/.well-known/oauth-protected-resource/api/mcp
Authorization metadata:      https://hakgyo.example/.well-known/oauth-authorization-server/api/auth
```

The MCP resource URL is the exact JWT audience. Scheme, host, path, and trailing
slash must remain identical across discovery, authorization, token issuance, and
resource-server validation. Production must use HTTPS; loopback HTTP is allowed
only for local development.

## Better Auth

`src/server/better-auth/config.ts` composes:

- `jwt()` for stable signing keys and the JWKS endpoint;
- `mcp()` as the OAuth 2.1 provider and RFC 9728 resource metadata owner;
- `cimd()` with Better Auth's Node transport and the MCP `2026-07-28` profile;
- `expo()` for the existing mobile client.

The Node CIMD transport resolves each hostname once, rejects special-use network
ranges, pins the approved address, and refuses redirects. Do not replace it with
plain `fetch`.

Dynamic Client Registration is disabled. Do not add
`allowDynamicClientRegistration` or `allowUnauthenticatedClientRegistration` as
a client compatibility workaround.

## Request Flow

1. A client sends `POST /api/mcp` without a token.
2. `requireMcpAuth` returns `401` with an RFC 9728 `resource_metadata` challenge.
3. The client reads protected-resource and authorization-server metadata.
4. The authorization server resolves the client's HTTPS CIMD document.
5. The client runs Authorization Code with PKCE `S256` and requests the canonical
   MCP resource.
6. The user signs in and grants consent.
7. Better Auth issues an audience-bound JWT access token.
8. `requireMcpAuth` verifies signature, issuer, audience, expiry, DPoP when used,
   and the `hakgyo:mcp` scope.
9. Verified claims are mapped to SDK `AuthInfo`; each tool then checks live Hakgyo
   permissions before accessing domain data.

## Authorization Layers

OAuth scope opens the MCP connection; it does not grant an organization role.
Every protected operation follows this order:

```text
JWT verification
-> hakgyo:mcp scope
-> input validation
-> current user and organization membership
-> live role, ownership, enrollment, and lifecycle checks
-> domain action
-> sanitized MCP result
```

`sub` identifies the Hakgyo user. `azp` identifies the OAuth client. Never treat
the client ID as a user ID or trust role/organization claims supplied in tool
arguments.

Permission failures that OAuth consent cannot fix remain normal domain denials.
Only a genuinely missing OAuth scope should produce `insufficient_scope` and
trigger step-up authorization.

## Transport

`src/server/mcp/server.ts` creates a fresh `McpServer` for every request and sets
`legacy: "reject"`. The route exports only `POST`; Next.js returns `405` for GET
and DELETE.

Do not add:

- session IDs or an in-memory session registry;
- GET SSE or DELETE session handlers;
- a `/sse` or `/message` endpoint;
- 2025-era stateless fallback;
- user, tenant, request, or token state at module scope.

Durable workflow state belongs in PostgreSQL or another shared store and must be
bound to the principal, tenant, expiry, and authorization context.

## Security

- Validate Host and Origin before parsing MCP input.
- Accept bearer tokens only from the `Authorization` header.
- Keep access tokens short-lived; refresh tokens rotate through Better Auth.
- Never log tokens, authorization codes, cookies, passwords, raw tool arguments,
  assessment answers, or signed asset URLs.
- Never pass the MCP access token to Google, Zoom, R2, or another upstream API.
- Re-check tenant and domain permissions for every tool call.
- Use exact redirect URI matching and show client identity, scopes, and resource
  on the consent page.
- Keep dependency versions exact and review Better Auth/MCP security advisories
  before upgrading.

## Database Migration

The Better Auth 1.7.1 migration:

- adds `Account.issuer` and keys external identities by `(issuer, accountId)`;
- adds stable OAuth client discovery/application fields;
- removes beta `public` and `type` columns;
- enforces one client-to-resource link;
- makes token and consent timestamps required;
- expires incomplete beta token rows instead of extending their validity.

The issuer migration supports the authentication providers configured by Hakgyo:
credentials and Google. It fails closed when another provider exists, requiring an
operator-reviewed issuer backfill before deployment.

Apply schema changes with Prisma migrations, never `db push` in production.

## Verification

Before production deployment, verify:

```bash
bun run db:generate
bun run typecheck
bun run lint
bun run test
```

Then test the public deployment with MCP Inspector and at least one launch client:

- unauthenticated POST returns a discoverable `401` challenge;
- both well-known metadata URLs return the canonical issuer and resource;
- authorization code with PKCE and CIMD completes;
- valid tokens can list and call tools;
- wrong issuer, audience, expiry, and scope are rejected;
- 2025-era requests, GET, and DELETE are rejected;
- refresh-token rotation works;
- cross-tenant and role denials remain enforced;
- malicious Host and Origin headers are rejected.

## Source Map

| Path                                                               | Responsibility                               |
| ------------------------------------------------------------------ | -------------------------------------------- |
| `src/server/better-auth/config.ts`                                 | Better Auth, MCP OAuth provider, JWT, CIMD   |
| `src/app/api/auth/[...all]/route.ts`                               | Better Auth HTTP endpoints                   |
| `src/app/.well-known/oauth-authorization-server/api/auth/route.ts` | RFC 8414 path-inserted discovery             |
| `src/app/.well-known/oauth-protected-resource/api/mcp/route.ts`    | RFC 9728 path-inserted discovery             |
| `src/app/api/mcp/route.ts`                                         | Request boundary, token gate, POST transport |
| `src/server/mcp/auth.ts`                                           | Verified claims to SDK `AuthInfo` mapping    |
| `src/server/mcp/security.ts`                                       | Host and Origin boundary checks              |
| `src/server/mcp/server.ts`                                         | Per-request MCP server and tool registration |

## Primary References

- [Better Auth MCP](https://better-auth.com/docs/plugins/mcp)
- [Better Auth 1.7 upgrade guide](https://better-auth.com/docs/guides/1-7-upgrade-guide)
- [MCP 2026-07-28 authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [OAuth Protected Resource Metadata, RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728)
- [OAuth Resource Indicators, RFC 8707](https://datatracker.ietf.org/doc/html/rfc8707)

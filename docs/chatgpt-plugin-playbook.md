# ChatGPT Plugin Playbook

How to turn an existing OAuth-protected MCP server into a ChatGPT plugin and get
it to **In review** on OpenAI's dashboard. Written from the Hakgyo submission
(October 2026), which reached "In review" with version 1.0.2. Hakgyo-specific
values live in [chatgpt-plugin-submission.md](chatgpt-plugin-submission.md);
this file is the project-independent procedure. Final approval had not
happened when this was written, so nothing here claims the plugin was
published.

Written for an AI coding agent working with a human. Steps marked **Human**
cannot be done by the agent (logins, secrets, the submit button).

## 1. What a plugin is now

- The 2023 ChatGPT plugins (`ai-plugin.json` plus OpenAPI) are gone. Since July
  2026 "Apps in ChatGPT" are called **Plugins**, and a plugin is an MCP server
  plus a listing.
- The MCP URL alone is **not enough** to submit. The dashboard wants a **ZIP**
  with a manifest (`plugin.json`), an MCP config (`mcp.json`) and image assets.
  The manifest carries the listing, review test cases and the demo video link.
- After approval, tool changes on the MCP server are picked up by OpenAI's daily
  scan. Changing the listing, assets, test cases or video needs a **new ZIP with
  a higher `version`**.
- The MCP URL cannot be changed after publication without OpenAI support, so
  submit the final production origin.

## 2. Prerequisites

- **Human:** the OpenAI organization has finished individual or business
  verification, and the person submitting is an owner or has Apps Management
  Write.
- Production MCP server over HTTPS (streamable HTTP), reachable without a VPN.
- OAuth 2.1 for the MCP server (see section 3). API-key-only servers do not fit
  a per-user plugin.
- Public pages for website, support, privacy policy and terms of service.
- A reviewer account (section 6) and a demo video (section 8).

## 3. Server requirements

| Requirement           | Detail                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP URL               | e.g. `https://example.com/api/mcp`                                                                                                                 |
| OAuth discovery       | `/.well-known/oauth-protected-resource/<mcp path>` and the authorization server metadata                                                           |
| ChatGPT client        | Client ID Metadata Documents (CIMD): `https://chatgpt.com/oauth/client.json`. Redirect URI `https://chatgpt.com/connector_platform_oauth_redirect` |
| Issuer identification | `authorization_response_iss_parameter_supported: true`                                                                                             |
| Scopes                | a resource scope for the MCP (Hakgyo: `hakgyo:mcp`) plus `openid`, `offline_access`                                                                |
| Profile tool          | one tool that returns the signed-in user, marked `_meta: { "openai/profile": true }`. Its `id` must be stable across refresh and never reassigned  |
| Domain verification   | `GET /.well-known/openai-apps-challenge` returns the bare token (below)                                                                            |
| Tool annotations      | every tool sets `readOnlyHint`, `destructiveHint`, `openWorldHint` honestly (section 4)                                                            |

Hakgyo uses Better Auth (`mcp()` and `cimd()` plugins) for all of this.

### Domain verification route

The body must be the token only: plain text, no JSON, no trailing text. Return
404 while the variable is unset.

```ts
export const dynamic = "force-dynamic";

export function GET() {
  const token = env.OPENAI_APPS_CHALLENGE_TOKEN;
  if (!token) return new Response("Not found", { status: 404 });
  return new Response(token, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
```

Flow: **Human** copies the token from the dashboard, the token goes into the
production env var, **redeploy** (a stored env var is not read until a new
deployment), confirm with `curl https://<domain>/.well-known/openai-apps-challenge`,
then **Human** presses Verify.

## 4. Tool annotations: what the scan flags

The dashboard scans every tool and blocks submission on mismatches between
annotations and behavior. Three findings from Hakgyo, with the fixes that
cleared them:

| Finding                                                                                          | Cause                                                                     | Fix                                                                                                                        |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `openWorldHint: false` but the tool "interacts with an independently controlled external system" | `update_course` could publish a course to the public catalog              | Set `openWorldHint: true` on any tool that publishes to the public web or calls another service; say so in the description |
| `destructiveHint: false` but "material loss or a hard-to-reverse change"                         | `mark_item_progress` records COMPLETED, which cannot be undone            | Treat irreversible changes as destructive and add "confirm with the user first" to the description                         |
| "This tool update needs further review before it can go live."                                   | `create_course` could also publish a course publicly (status `PUBLISHED`) | Same fix as `update_course`: external hint plus a description that asks for confirmation before publishing                 |

Rules of thumb: irreversible or publicly visible effects are never
`readOnlyHint` or non-destructive; descriptions should tell the model to confirm
before such actions. After the fixes, a rescan reported no findings. The exact
cause of the "needs further review" message was not confirmed with OpenAI; the
fix above is what changed and what cleared it.

## 5. The plugin package

```text
plugin-package/
  plugin.json     manifest (Agent Plugins 1.0.0 with the com.openai extension)
  mcp.json        points at the MCP server
  assets/         logo, dark logo, composer icon, dark composer icon (PNG)
```

`mcp.json`:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "example": {
      "type": "streamable-http",
      "url": "https://example.com/api/mcp"
    }
  }
}
```

`plugin.json` skeleton (see `chatgpt-plugin/plugin.json` for a complete one):

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "example",
  "version": "1.0.0",
  "description": "...",
  "author": { "name": "Example", "url": "https://example.com" },
  "homepage": "https://example.com",
  "keywords": ["..."],
  "extensions": {
    "com.openai": {
      "interface": {
        "displayName": "Example",
        "shortDescription": "...",
        "longDescription": "...",
        "developerName": "Example",
        "category": "Education & Research",
        "capabilities": ["..."],
        "websiteURL": "https://example.com",
        "supportURL": "https://example.com/support",
        "privacyPolicyURL": "https://example.com/privacy",
        "termsOfServiceURL": "https://example.com/terms",
        "defaultPrompt": ["...", "...", "..."],
        "brandColor": "#026DFE",
        "brandColorDark": "#4D94FF",
        "composerIcon": "./assets/icon.png",
        "composerIconDark": "./assets/icon-dark.png",
        "logo": "./assets/logo.png",
        "logoDark": "./assets/logo-dark.png"
      },
      "review": {
        "demo_recording_url": "https://.../walkthrough.mp4",
        "test_cases": { "positive": [], "negative": [] },
        "commerce": false,
        "commerce_description": "..."
      },
      "publication": { "release_notes": "..." }
    }
  }
}
```

Things the dashboard rejected, and what fixed them:

- **"Select a valid category."** The category must be one of OpenAI's fixed
  values. `Education` is not one; `Education & Research` is.
- **"Review the full description for spelling, grammar, clarity..."** Write the
  long description in clear English and list concretely what users can do.
  Mention what the AI will not do (Hakgyo: it never answers a student's
  assignment) and that destructive or public actions are confirmed first.
- **"No video walkthrough URL provided."** Put the link in
  `extensions.com.openai.review.demo_recording_url` and upload a new ZIP. The
  dashboard has no separate video field. The video is a link, never a file in
  the ZIP.
- **"Incomplete review information"** was only a consequence of the missing
  video URL.

Build the ZIP with `plugin.json` at the **root** of the archive (not inside a
folder). Some machines have no `zip` binary; Python works:

```python
import zipfile, os
with zipfile.ZipFile("plugin.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for f in ["plugin.json", "mcp.json"]: z.write(f)
    for r, _, fs in sorted(os.walk("assets")):
        for f in sorted(fs): z.write(os.path.join(r, f))
```

Validate both JSON files against the `$schema` URLs before uploading. Bump
`version` on every re-upload (Hakgyo went 1.0.0, 1.0.1 after the category and
description fixes, 1.0.2 after adding the video).

## 6. Reviewer account and sample data

OpenAI's reviewers sign in through your real OAuth flow, so:

- Email and password only: no MFA, email code, magic link or VPN.
- The account needs data that makes every positive test case work. Hakgyo
  seeds `reviewer@hakgyo.id` as OWNER of a demo organization with a course, a
  vocabulary set, an assignment and a learner with a submission waiting for
  review (`prisma/seed-reviewer.ts`).
- Make the seed idempotent with fixed ids, and generate the password randomly
  and store it outside git (Hakgyo: `/root/.hakgyo-reviewer-password`).
- **Re-running the seed resets the password.** Never reseed while a review is
  active, or OpenAI's reviewers can no longer log in.
- Recording the demo creates data (a module, a material, a vocabulary set).
  The seed does not delete it, and reviewers running the same prompts will
  create duplicates. Decide whether to clean up before submitting.

The credentials go only into the dashboard's reviewer form. **Human** fills the
password. Fields that form asked for:

| Field         | Value                                                                      |
| ------------- | -------------------------------------------------------------------------- |
| Login URL     | the OAuth login page, e.g. `https://example.com/auth`                      |
| Tenant        | optional; the demo organization name                                       |
| Username      | the reviewer email                                                         |
| Password      | the reviewer password                                                      |
| Sign-in steps | numbered steps: start connecting, sign in, approve consent, what to expect |

## 7. Test cases

`review.test_cases` has `positive` and `negative` lists. A positive case:

```json
{
  "description": "Find my organizations",
  "prompt": "Which Example organizations am I part of and what is my role?",
  "tools_triggered": "get_current_user",
  "expected_behavior": "Lists the Demo organization with the role OWNER."
}
```

Aim for about five positive cases covering reads and writes and three
negative cases (a request the plugin must refuse, another tenant's data, an
ambiguous destructive request). Negative cases need only `description` and
`prompt`. Prompts must be self-contained and work against the seeded data
without extra setup.

## 8. The demo video

Reviewers need a screen recording of the positive cases running in ChatGPT.
No narration, music or editing is required; this was not re-verified against
the current docs, and Hakgyo's video had none and was accepted into review.

**Set up a connection for recording (Human signs in):**

1. In chatgpt.com, **Plugins → Add → Add custom MCP server**. Enter a name and
   the MCP URL, keep OAuth, tick the risk acknowledgement, and create it.
2. Continue to the plugin's sign-in. **Human** signs in as the reviewer
   account and approves consent. The plugin now appears in the composer's **+**
   menu under Plugins.
3. Use a **Temporary chat** so nothing lands in history. Keep it **Personalized**.
   **Unpersonalized ignores plugins**, so the demo would not work.
4. Beware of memory: a personalized chat can quote the person's own saved
   memories into answers (this happened in the first test). Check the first
   answer before recording, and if it leaks personal data, remove that memory
   or use an account without it.
5. Select the plugin from **+** so its chip shows in the composer before
   sending the first prompt.

**Record:** start recording, send each positive prompt exactly as written in
`plugin.json`, one at a time, and wait for the answer to finish before the next.
Write tools can take over a minute. Stop the recording when the last answer is
visible.

**Edit with ffmpeg** (keep quality, e.g. `-crf 18`): cut stray setup steps and
speed up long idle waits, for example 8x:

```bash
ffmpeg -i raw.mp4 -filter_complex \
 "[0:v]trim=0:108,setpts=PTS-STARTPTS[a];\
  [0:v]trim=108:186,setpts=(PTS-STARTPTS)/8[b];\
  [0:v]trim=186,setpts=PTS-STARTPTS[c];\
  [a][b][c]concat=n=3:v=1:a=0,fps=30,format=yuv420p[v]" \
 -map "[v]" -c:v libx264 -preset slow -crf 18 -movflags +faststart out.mp4
```

**Host it** somewhere public without login (YouTube Unlisted, or a public
object-storage URL; Hakgyo used its R2 media bucket via
`bun tools/promo-video/pv.mjs backup <file>`). Verify like a reviewer would:

```bash
curl -sI "$URL" | head -3            # expect 200 and video/mp4
curl -s -r 0-1023 "$URL" -o /dev/null -w "%{http_code}\n"   # expect 206
```

Paste the URL into `demo_recording_url`, bump `version`, rebuild the ZIP.

## 9. Dashboard walkthrough

1. **Human:** `platform.openai.com/plugins`, choose **With MCP**, enter the MCP
   URL, verify the domain (section 3).
2. Scan tools and fix every flagged annotation (section 4).
3. Upload the ZIP. Fix any validation message (section 5), bump the version,
   upload again.
4. Review information: reviewer credentials (section 6). The video comes from
   the ZIP.
5. **Human:** Next, then Submit. The plugin page then shows Review status
   **In review**, Publication **Not published**, MCP configuration
   **Configured**.
6. Only one review can be active per plugin. Wait for the decision email or
   cancel the review before resubmitting.

## 10. Pitfalls seen in practice

- **"Desktop only" and "Open in desktop app".** Any plugin uploaded as a ZIP
  with `mcp.json` is labeled Desktop only in ChatGPT, regardless of the server.
  To try it in the browser use **Add custom MCP server** (section 8). The
  public listing has no such label after approval.
- **"Upload plugins" is disabled.** On Business, Enterprise or Edu workspaces
  an admin must enable **Upload plugins** in Workspace settings → Permissions
  & roles.
- **Connect button stuck and disabled** on a freshly created custom plugin.
  Uninstall it, then install it again from **Plugins → Personal** and wait; the
  sign-in dialog can take 30 to 60 seconds. If the first OAuth attempt died on
  the consent page, a second sign-in attempt later worked.
- **OAuth consent page crashes under database trouble.** Hakgyo logged
  `Unhandled Rejection: ErrorEvent` on `/oauth/consent` and
  `Connection terminated due to connection timeout` (Neon, serverless
  Postgres). Watch production logs (`vercel logs --environment production
--level error`) during reviewer flows; a flaky OAuth page makes reviewers fail
  the login. This was observed but its root cause was not fixed here.
- **The first answer in a new custom connection can fail** ("couldn't retrieve
  from the connector") when OAuth never completed. Re-check Plugins settings
  rather than retrying the prompt.
- **Merged PRs must keep history linear** in repos that require it, so the ZIP
  source (`chatgpt-plugin/`) and `plugin.json` match what was uploaded.

## 11. Agent checklist

1. Confirm the server meets section 3; add the challenge route and profile tool.
2. Audit every tool's annotations and descriptions against section 4.
3. Create the package folder, `mcp.json`, `plugin.json`, assets; validate JSON.
4. Seed the reviewer account and sample data; keep the password out of git.
5. Write test cases against that data.
6. **Human:** verify the domain, then agent builds the ZIP and the human uploads
   it; fix validation messages and bump `version` each time.
7. Record, edit and host the demo video; check the URL; add it to
   `demo_recording_url`; bump the version; rebuild the ZIP.
8. **Human:** fill reviewer credentials, submit.
9. During review: no reseed, no deleting the demo data, watch production logs.

## References

- [Submit plugins](https://developers.openai.com/apps-sdk/deploy/submission)
- [Plugin authentication](https://developers.openai.com/plugins/build/auth)
- [Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [App guidelines](https://developers.openai.com/apps-sdk/app-guidelines)

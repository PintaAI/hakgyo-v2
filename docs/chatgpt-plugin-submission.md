# ChatGPT Plugin Submission

Hakgyo is published to ChatGPT (and Codex) as an MCP-backed plugin. The plugin
is the production MCP server described in [mcp-server.md](mcp-server.md); this
document holds what the OpenAI Platform dashboard asks for on top of it.

Submit from `https://platform.openai.com/plugins` and choose **With MCP**. Only
an organization owner, or a member with Apps Management Write, can submit, and
the organization must have finished individual or business verification.

## Server Requirements

| Requirement           | Where it lives                                                           |
| --------------------- | ------------------------------------------------------------------------ |
| MCP URL               | `https://hakgyo.id/api/mcp`                                              |
| OAuth discovery       | `/.well-known/oauth-protected-resource/api/mcp` and the auth server      |
| ChatGPT client (CIMD) | `https://chatgpt.com/oauth/client.json`, resolved by Better Auth CIMD    |
| ChatGPT redirect URI  | `https://chatgpt.com/connector_platform_oauth_redirect`, from the CIMD   |
| Issuer identification | `authorization_response_iss_parameter_supported: true`                   |
| Profile tool          | `get_current_user`, marked `_meta["openai/profile"]: true`               |
| Domain verification   | `/.well-known/openai-apps-challenge`, from `OPENAI_APPS_CHALLENGE_TOKEN` |
| Tool annotations      | `getMcpToolAnnotations` in `src/server/mcp/domain-actions.ts`            |

The MCP URL cannot be changed after publication without contacting OpenAI
support, so submit the final production origin. After publication, tool
changes are picked up by OpenAI's daily scan and go live once they pass
automated checks; listing metadata changes need a new submission.

The profile tool's `id` is the Hakgyo user id. It must stay stable across token
refresh and reconnection and must never be reassigned.

### Domain Verification

1. Copy the challenge token from the dashboard.
2. Set `OPENAI_APPS_CHALLENGE_TOKEN` in the production environment and deploy.
3. Confirm `curl https://hakgyo.id/.well-known/openai-apps-challenge` prints
   only the token.
4. Press verify in the dashboard.

The route returns `404` while the variable is unset.

## Listing

| Field             | Value                                  |
| ----------------- | -------------------------------------- |
| Display name (30) | Hakgyo                                 |
| Subtitle (30)     | Run your Korean classes                |
| Category          | Education & Research                   |
| Developer name    | Hakgyo                                 |
| Website           | `https://hakgyo.id`                    |
| Support           | `https://hakgyo.id/support`            |
| Privacy policy    | `https://hakgyo.id/privacy`            |
| Terms of service  | `https://hakgyo.id/terms`              |
| Commerce          | No purchases happen through the plugin |

Long description (the `plugin.json` copy is authoritative):

> Hakgyo is a course platform for Korean language schools and teachers. Connect your Hakgyo account to manage your classes directly from ChatGPT.
>
> With Hakgyo in ChatGPT, teachers and school administrators can:
>
> - Plan courses: create courses, add modules, and arrange lessons in order.
> - Write lesson materials, such as grammar explanations and example dialogues.
> - Build vocabulary sets with Korean words, meanings, and example sentences.
> - Create assignments and quizzes with multiple-choice and written questions.
> - Organize study groups, manage enrollments, and schedule Zoom class meetings.
> - Review students' written answers and see which submissions still need grading.
>
> Students can view their course outline, read lesson materials, and study vocabulary. Assignments are always completed by the student in the Hakgyo mobile app; ChatGPT never answers them on the student's behalf.
>
> ChatGPT can only see and change what your role in each school allows. Changes that publish a course or cannot be undone are confirmed with you first.

The category must be one of OpenAI's fixed values; Hakgyo uses `Education & Research`.

Assets: a square logo (at least 48×48, PNG or SVG, max 5 MiB) with a dark
variant, a composer icon, and optional screenshots of a conversation that
creates a module and a material.

## Reviewer Account

Reviewers sign in through the normal OAuth flow, so the account must use email
and password with no MFA, email code, magic link or VPN. The account and its
sample data come from `prisma/seed-reviewer.ts`:

```bash
REVIEWER_PASSWORD='...' bun run --cwd apps/web db:seed:reviewer
```

It is safe to re-run: rows have fixed `reviewer-` ids, and each run resets the
password and puts the sample attempt back in the review queue. It creates:

- `reviewer@hakgyo.id` (Hakgyo Reviewer), OWNER of **Hakgyo Demo**
  (`hakgyo-demo`);
- **Korean Basics 1** with two modules, a material, a kosakata set and a
  written Tugas, and the cohort **Kelas Oktober 2026** with the reviewer as
  instructor;
- the learner Dewi Lestari (`demo-learner@hakgyo.id`, no password) in that
  cohort, with a submitted Tugas attempt waiting for review;
- **Korean Conversation Practice**, which the reviewer studies as a learner, so
  `list_my_courses` and `get_my_course_item` return data, including a Tugas
  with an `appUrl`.

Enter the credentials only in the dashboard's secure reviewer form. Sign-in
instructions: open the connection, choose email sign-in at `/auth`, enter the
credentials, then approve the consent screen.

## Test Cases

Each case lists the prompt, the tools ChatGPT should call, and the result a
reviewer can observe.

### Positive

1. **Find my organizations.** "Which Hakgyo organizations am I part of and what
   is my role?" Tools: `get_current_user`. Result: Hakgyo Demo with role OWNER.
2. **Plan a module.** "Add a module called 'Greetings' to Korean Basics 1 in
   Hakgyo Demo." Tools: `list_organization_courses`, `create_module`. Result:
   the module appears at the end of the course outline in Hakgyo.
3. **Write a material.** "Create a material in Hakgyo Demo explaining 안녕하세요
   and 감사합니다 with an example dialogue, and add it to the Greetings module."
   Tools: `get_material_block_catalog`, `create_material`, `add_module_item`.
   Result: the material opens in the Hakgyo editor with the dialogue.
4. **Build vocabulary.** "Make a vocabulary set 'Basic Greetings' with five
   common greetings and their Indonesian meanings." Tools:
   `create_vocabulary_set`, `add_vocabulary_entry`. Result: the set lists five
   entries.
5. **Review submissions.** "Which Tugas attempts are waiting for my review in
   Hakgyo Demo?" Tools: `list_attempts_needing_review`. Result: Dewi Lestari's
   attempt on Tugas Perkenalan Diri in Kelas Oktober 2026.

### Negative

1. **Answering a Tugas for the learner.** "Take my Hakgyo Tugas for me and
   submit the answers." Expected: ChatGPT declines, using
   `get_my_course_item` at most to share the item's `appUrl` so the learner
   opens it in the mobile app. No attempt tool exists.
2. **Another organization's data.** "Show me the members of organization
   `org_that_is_not_mine`." Expected: `list_organization_members` returns a
   permission error and ChatGPT reports that the account has no access.
3. **Ambiguous destructive change.** "Change everyone's role." Expected:
   ChatGPT asks which organization, member and role, and confirms before
   calling `change_member_role`.

## Before Each Submission

- Record a short walkthrough video of the positive cases against production and
  paste its URL in the dashboard.
- Run the reviewer flow from a fresh ChatGPT connection in Developer Mode.
- Scan tools in the dashboard and fix any flagged descriptions or annotations.
- Only one review can be active per plugin; wait for the decision email or
  cancel the active review before resubmitting.

## References

- [Submit plugins](https://developers.openai.com/apps-sdk/deploy/submission)
- [Plugin authentication](https://developers.openai.com/plugins/build/auth)
- [Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [App guidelines](https://developers.openai.com/apps-sdk/app-guidelines)

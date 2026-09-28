# Google Meet integration feasibility

Researched 2026-09-28 against Google's first-party API documentation and the current Hakgyo Zoom flow.

## Answer

**Yes, Hakgyo can create Google Meet join links, but the Meet API alone is not a one-for-one replacement for the scheduled Zoom meetings that Hakgyo currently creates.** `spaces.create` returns a `meetingUri`; the space is persistent, and a conference begins when someone joins. The Meet `Space` resource has access and moderation settings, but no title, agenda, scheduled start, duration, or timezone fields. Its published methods are create, get, patch, and endActiveConference; there is no delete method. These are direct differences from Hakgyo's current Zoom create/update/delete calls and meeting body. [Meet spaces overview](https://developers.google.com/workspace/meet/api/guides/meeting-spaces-overview), [Space resource and methods](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces), [Meet spaces.create](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/create), [Hakgyo Zoom integration](../../apps/web/src/server/integrations/zoom.ts).

For a **scheduled meeting that lives on an organizer's calendar**, Google Calendar `events.insert` can create an event with `start`, `end`, `summary`, `description`, attendees, and a Google Meet conference request. Pass `conferenceDataVersion=1` and `conferenceData.createRequest` with a unique `requestId` and `conferenceSolutionKey.type: "hangoutsMeet"`. Conference creation is asynchronous, so handle `pending`, `success`, and `failure` before treating its video entry point as ready. [Calendar create events](https://developers.google.com/workspace/calendar/api/guides/create-events), [events.insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert), [Event conference fields](https://developers.google.com/workspace/calendar/api/v3/reference/events).

## Comparison with Hakgyo today

| Current behavior | Meet spaces API | Calendar event with Meet |
| --- | --- | --- |
| Connect an organization-owned host account | OAuth as a Google user; app-only credentials alone are insufficient | OAuth for access to the organizer's calendar |
| Create a join link | `POST https://meet.googleapis.com/v2/spaces`; store response `name` and `meetingUri` | `events.insert` with conference request; store event ID, calendar ID, and generated video URL |
| Set title, agenda, start, duration, timezone | Store these only in Hakgyo; `Space` has no matching fields | Set event `summary`, `description`, `start`, and `end` |
| Edit meeting metadata | Edit Hakgyo record only; `spaces.patch` edits space configuration, not a schedule | Update the Calendar event, preserving conference data |
| Delete | Remove Hakgyo record, but Meet has no space deletion method; `endActiveConference` only ends a call already in progress | Delete the Calendar event; that is an event operation, not a Meet `spaces.delete` operation |

Hakgyo currently creates a scheduled Zoom meeting through `POST /users/me/meetings`, storing the Zoom ID/UUID and `join_url`; updates and deletes call Zoom before changing its local `CohortMeeting`. The Zoom request includes `topic`, `agenda`, `start_time`, `duration`, `timezone`, a waiting room, and join-before-host disabled. The cohort router also attempts to delete a newly created Zoom meeting if saving the local record fails. [Zoom integration](../../apps/web/src/server/integrations/zoom.ts), [cohort router](../../apps/web/src/server/api/routers/cohort.ts), [schema](../../apps/web/prisma/schema.prisma).

The Calendar option is the closer product match when Hakgyo wants an actual scheduled item and calendar invitations. Calendar supports [event patch](https://developers.google.com/workspace/calendar/api/v3/reference/events/patch) and [event deletion](https://developers.google.com/workspace/calendar/api/v3/reference/events/delete). The Meet spaces option is simpler if Hakgyo only needs its own schedule plus a join URL. Since Meet's published methods have no delete operation, a failed local save after `spaces.create` cannot be compensated in the same way as today's Zoom flow. That conclusion is an inference from the documented [space method set](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces).

## Authentication and setup

1. Enable the Meet REST API, or Calendar API for the calendar path, in a Google Cloud project and configure the OAuth consent screen. [Enable Google Workspace APIs](https://developers.google.com/workspace/guides/enable-apis).
2. Request Google authorization from the **intended meeting organizer**. Meet REST uses user authentication; domain-wide delegation can impersonate a Workspace user where an administrator permits it. `spaces.create` requires `https://www.googleapis.com/auth/meetings.space.created`, which Google classifies as sensitive and subject to app verification for public production use. [Meet authorization](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize), [spaces.create](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/create).
3. For Calendar event creation, `events.insert` accepts scopes including `https://www.googleapis.com/auth/calendar.events`; choose the narrowest scope that covers the planned event lifecycle. [events.insert authorization](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert), [Calendar scopes](https://developers.google.com/workspace/calendar/api/auth).
4. Hakgyo's existing Better Auth Google login configuration sets a client ID and secret but does not request a Meet or Calendar scope. A separate, explicit organizer connection and durable Google grant/token handling should be designed; Google sign-in alone should not be assumed to authorize meeting creation. This is an inference from [Hakgyo's auth configuration](../../apps/web/src/server/better-auth/config.ts) and Google's [scope requirements](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize).

## Important behavior to design around

- Store Meet `spaces/{space}` as the stable external identifier. Google warns that meeting codes can become detached from a space and may be reused; they generally expire 365 days after last use. Store `meetingUri` for joining, but do not use its code as the durable identity. [Meeting spaces overview](https://developers.google.com/workspace/meet/api/guides/meeting-spaces-overview).
- Access is controlled by the organizer's defaults and policies unless configured. `OPEN`, `TRUSTED`, and `RESTRICTED` have different join behavior; do not assume a Zoom waiting room maps automatically to a Meet space. [Space configuration](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces).
- If using Calendar conference generation, use a fresh request ID per request and wait for `success`; a `pending` insert response may not yet have a usable video URL. Google advises a unique conference for each event to avoid access/privacy problems. [Create events](https://developers.google.com/workspace/calendar/api/guides/create-events), [Event conference fields](https://developers.google.com/workspace/calendar/api/v3/reference/events).
- Meet's documented `spaces.create` quota is 10 per minute per user and 100 per minute per project. [Meet usage limits](https://developers.google.com/workspace/meet/api/guides/limits).

## Recommendation

First decide whether a Hakgyo cohort meeting must create a Google Calendar event and invite participants. If **yes**, implement the Calendar event path as the main provider flow. If **no**, create one Meet space per cohort meeting and keep Hakgyo's existing start/time/title fields as the schedule of record. Either path needs a Google organizer connection, provider-specific IDs and lifecycle handling in `CohortMeeting`, and a provider choice in the meeting UI. The absence of a Meet space delete operation should be reflected in product behavior and cleanup logic. This is an implementation recommendation inferred from the sources and current code, not a Google requirement.

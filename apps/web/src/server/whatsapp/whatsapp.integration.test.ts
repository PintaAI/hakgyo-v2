import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";

// Runs against DATABASE_URL with its own organization, removed afterwards.
// Evolution API is a local fake server; the module env is set before import.
const enabled = Boolean(Bun.env.DATABASE_URL);
const run = enabled ? describe : describe.skip;

type Recorded = {
  method: string;
  path: string;
  body: unknown;
  headers: Headers;
};
const requests: Recorded[] = [];
/** Per-route overrides: return a status and body instead of the default. */
const overrides = new Map<string, { status: number; body: unknown }>();

function startFakeEvolution() {
  return Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      const text = await request.text();
      const body: unknown = text ? JSON.parse(text) : undefined;
      requests.push({
        method: request.method,
        path: `${url.pathname}${url.search}`,
        body,
        headers: request.headers,
      });
      const route = url.pathname.split("/").slice(1, 3).join("/");
      const override = overrides.get(route);
      if (override)
        return Response.json(override.body, { status: override.status });
      switch (route) {
        case "instance/create":
          return Response.json({
            hash: "instance-token",
            qrcode: { base64: "data:image/png;base64,QR1", pairingCode: null },
          });
        case "instance/connect":
          return Response.json({ base64: "data:image/png;base64,QR2" });
        case "instance/fetchInstances":
          return Response.json([
            {
              ownerJid: "6281100000000@s.whatsapp.net",
              connectionStatus: "open",
            },
          ]);
        case "group/create":
          return Response.json({ id: "120363000000000001@g.us" });
        case "group/updateGroupPicture":
          return Response.json({ update: "success" });
        case "group/inviteCode":
          return Response.json({
            inviteUrl: "https://chat.whatsapp.com/INVITE1",
            inviteCode: "INVITE1",
          });
        case "group/findGroupInfos":
          return Response.json({ id: url.searchParams.get("groupJid") });
        default:
          return Response.json({ ok: true });
      }
    },
  });
}

/**
 * Starts the fake server and loads the modules under test against it. Only
 * when the suite runs: `~/env` fails validation without DATABASE_URL.
 */
async function setup() {
  const fake = startFakeEvolution();
  // `~/env` is evaluated once per test process, possibly by an earlier file,
  // so the WhatsApp settings are layered over it instead of process.env.
  const { env: realEnv } = await import("~/env");
  const testEnv = {
    ...realEnv,
    EVOLUTION_API_URL: `http://localhost:${fake.port}`,
    EVOLUTION_API_KEY: "global-key",
    WHATSAPP_WEBHOOK_SECRET: "test-webhook-secret-123",
    WHATSAPP_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  };
  void mock.module("~/env", () => ({ env: testEnv }));
  return {
    fake,
    db: (await import("~/server/db")).db,
    connection: await import("~/server/whatsapp/connection"),
    cohortWork: await import("~/server/whatsapp/cohort"),
    outbox: await import("~/server/whatsapp/outbox"),
    webhook: (await import("~/app/api/whatsapp/webhook/route")).POST,
    cohortRouter: (await import("~/server/api/routers/cohort")).cohortRouter,
  };
}

const { fake, db, connection, cohortWork, outbox, webhook, cohortRouter } =
  enabled ? await setup() : ({} as Awaited<ReturnType<typeof setup>>);

const fixture = crypto.randomUUID().slice(0, 8);
const ids = {
  organization: `wa-org-${fixture}`,
  owner: `wa-owner-${fixture}`,
  membership: `wa-m-owner-${fixture}`,
  course: `wa-course-${fixture}`,
  item: `wa-item-${fixture}`,
  cohort: `wa-k1-${fixture}`,
  cohort2: `wa-k2-${fixture}`,
  cohort3: `wa-k3-${fixture}`,
  meeting: `wa-meeting-${fixture}`,
  event: `wa-event-${fixture}`,
};

function requestsTo(route: string) {
  return requests.filter((request) => request.path.startsWith(`/${route}`));
}

function webhookRequest(body: unknown, secret = "test-webhook-secret-123") {
  return new Request("http://localhost/api/whatsapp/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hakgyo-webhook-secret": secret,
    },
    body: JSON.stringify(body),
  });
}

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function cohortCaller() {
  return cohortRouter.createCaller({
    db,
    actorKind: "mcp",
    actorUserId: ids.owner,
    session: null,
    headers: new Headers(),
    requestCache: new Map(),
  });
}

run("WhatsApp groups through Evolution API", () => {
  beforeAll(async () => {
    await db.user.create({
      data: {
        id: ids.owner,
        email: `${ids.owner}@example.test`,
        name: "Owner",
      },
    });
    await db.organization.create({
      data: {
        id: ids.organization,
        name: "WhatsApp fixture",
        slug: ids.organization,
        members: {
          create: { id: ids.membership, userId: ids.owner, role: "OWNER" },
        },
      },
    });
    await db.course.create({
      data: {
        id: ids.course,
        organizationId: ids.organization,
        ownerMembershipId: ids.membership,
        slug: ids.course,
        title: "TOPIK I",
        status: "PUBLISHED",
        thumbnailUrl: "https://cdn.example.test/topik.png",
      },
    });
    await db.cohort.createMany({
      data: [
        { id: ids.cohort, name: "Kelas Senin", status: "OPEN" as const },
        { id: ids.cohort2, name: "Kelas Selasa", status: "DRAFT" as const },
        { id: ids.cohort3, name: "Kelas Rabu", status: "OPEN" as const },
      ].map((cohort) => ({
        ...cohort,
        organizationId: ids.organization,
        courseId: ids.course,
      })),
    });
  });

  afterAll(async () => {
    await db.assessmentEvent.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.whatsappOutbox.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.whatsappConnection.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.cohortMeeting.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.cohort.deleteMany({ where: { organizationId: ids.organization } });
    await db.courseItem.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.courseModule.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.course.deleteMany({ where: { organizationId: ids.organization } });
    await db.assessment.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.organizationMember.deleteMany({
      where: { organizationId: ids.organization },
    });
    await db.organization.delete({ where: { id: ids.organization } });
    await db.user.delete({ where: { id: ids.owner } });
    void fake.stop(true);
  });

  beforeEach(() => {
    requests.length = 0;
    overrides.clear();
  });

  test("pairing creates the instance with the webhook and connects", async () => {
    const started = await connection.startWhatsappConnection({
      organizationId: ids.organization,
      membershipId: ids.membership,
    });
    expect(started.qrBase64).toBe("data:image/png;base64,QR1");
    const [create] = requestsTo("instance/create");
    expect(create?.headers.get("apikey")).toBe("global-key");
    expect(create?.body).toMatchObject({
      instanceName: `hakgyo-${ids.organization}`,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      webhook: {
        enabled: true,
        events: ["CONNECTION_UPDATE"],
        headers: { "x-hakgyo-webhook-secret": "test-webhook-secret-123" },
      },
    });
    expect(
      (await connection.getWhatsappConnection(ids.organization)).connection
        ?.status,
    ).toBe("PENDING");

    const pairing = await connection.getWhatsappPairing(ids.organization);
    expect(pairing.status).toBe("CONNECTED");
    // Instance routes use the instance token, not the global key.
    expect(
      requestsTo("instance/fetchInstances")[0]?.headers.get("apikey"),
    ).toBe("instance-token");
    const { connection: linked } = await connection.getWhatsappConnection(
      ids.organization,
    );
    expect(linked).toMatchObject({
      status: "CONNECTED",
      phone: "6281100000000",
    });
  });

  test("webhook needs the secret and tracks connection changes", async () => {
    const instance = `hakgyo-${ids.organization}`;
    const denied = await webhook(
      webhookRequest(
        { event: "connection.update", instance },
        "wrong-secret-0000",
      ),
    );
    expect(denied.status).toBe(401);

    await webhook(
      webhookRequest({
        event: "connection.update",
        instance,
        data: { state: "close", statusReason: 401 },
      }),
    );
    expect(
      (await connection.getWhatsappConnection(ids.organization)).connection
        ?.status,
    ).toBe("DISCONNECTED");

    const reopened = await webhook(
      webhookRequest({
        event: "CONNECTION_UPDATE",
        instance,
        data: { state: "open", wuid: "6281100000000@s.whatsapp.net" },
      }),
    );
    expect(reopened.status).toBe(200);
    expect(
      (await connection.getWhatsappConnection(ids.organization)).connection
        ?.status,
    ).toBe("CONNECTED");
  });

  test("settings normalize the initial participant", async () => {
    await connection.updateWhatsappSettings({
      organizationId: ids.organization,
      initialParticipantPhone: "0812-2222-3333",
      autoCreateGroups: true,
    });
    const { connection: saved } = await connection.getWhatsappConnection(
      ids.organization,
    );
    expect(saved).toMatchObject({
      initialParticipantPhone: "6281222223333",
      autoCreateGroups: true,
    });
    expect(
      await rejection(
        connection.updateWhatsappSettings({
          organizationId: ids.organization,
          initialParticipantPhone: "budi",
        }),
      ),
    ).toBe("Nomor WhatsApp tidak valid.");
  });

  test("creates the cohort group with its name, photo and invite link", async () => {
    const result = await cohortWork.requestCohortGroup({
      cohortId: ids.cohort,
    });
    expect(result).toEqual({
      status: "CREATED",
      url: "https://chat.whatsapp.com/INVITE1",
    });
    expect(requestsTo("group/create")[0]?.body).toMatchObject({
      subject: "Kelas Senin",
      participants: ["6281222223333"],
    });
    expect(
      (requestsTo("group/create")[0]?.body as { description: string })
        .description,
    ).toContain(`/learn/${ids.course}`);
    expect(requestsTo("group/updateGroupPicture")[0]?.body).toEqual({
      groupJid: "120363000000000001@g.us",
      image: "https://cdn.example.test/topik.png",
    });
    const cohort = await db.cohort.findUniqueOrThrow({
      where: { id: ids.cohort },
    });
    expect(cohort.whatsappGroupJid).toBe("120363000000000001@g.us");
    expect(cohort.whatsappGroupUrl).toBe("https://chat.whatsapp.com/INVITE1");

    expect(
      await rejection(cohortWork.requestCohortGroup({ cohortId: ids.cohort })),
    ).toBe("Kelas ini sudah punya grup WhatsApp dari Hakgyo.");
    // The link of a Hakgyo group is not editable by hand.
    expect(
      await rejection(
        cohortCaller().update({
          cohortId: ids.cohort,
          whatsappGroupUrl: "https://chat.whatsapp.com/OTHER",
        }),
      ),
    ).toContain("Lepaskan grup");
  });

  test("a failed photo still leaves a usable group", async () => {
    overrides.set("group/updateGroupPicture", { status: 500, body: {} });
    overrides.set("group/create", {
      status: 201,
      body: { id: "120363000000000003@g.us" },
    });
    const result = await cohortWork.requestCohortGroup({
      cohortId: ids.cohort3,
      participant: "+62 813 1111 2222",
    });
    expect(result.status).toBe("CREATED");
    expect(requestsTo("group/create")[0]?.body).toMatchObject({
      participants: ["6281311112222"],
    });
  });

  test("meeting reminders go to the group once", async () => {
    const startsAt = new Date(Date.now() + 30 * 60_000);
    await db.cohortMeeting.create({
      data: {
        id: ids.meeting,
        cohortId: ids.cohort,
        organizationId: ids.organization,
        createdByMembershipId: ids.membership,
        title: "Pertemuan 1",
        startsAt,
        durationMinutes: 60,
        timezone: "Asia/Jakarta",
        joinUrl: "https://zoom.us/j/1",
      },
    });
    await cohortWork.enqueueMeetingReminder(ids.meeting);
    await cohortWork.enqueueMeetingReminder(ids.meeting);
    expect(
      await db.whatsappOutbox.count({
        where: { cohortId: ids.cohort, kind: "GROUP_MESSAGE" },
      }),
    ).toBe(1);

    const sweep = await outbox.processWhatsappOutbox();
    expect(sweep.sent).toBe(1);
    const [send] = requestsTo("message/sendText");
    expect(send?.body).toMatchObject({ number: "120363000000000001@g.us" });
    expect((send?.body as { text: string }).text).toContain(
      "*Segera dimulai: Pertemuan 1*",
    );
    expect((send?.body as { text: string }).text).toContain(
      "https://zoom.us/j/1",
    );
    expect((await outbox.processWhatsappOutbox()).sent).toBe(0);
  });

  test("scheduled events announce to each targeted group with notify on", async () => {
    const assessment = await db.assessment.create({
      data: {
        organizationId: ids.organization,
        createdByMembershipId: ids.membership,
        title: "Fixture assessment",
      },
    });
    const courseModule = await db.courseModule.create({
      data: {
        organizationId: ids.organization,
        courseId: ids.course,
        position: 0,
        title: "Module",
      },
    });
    await db.courseItem.create({
      data: {
        id: ids.item,
        moduleId: courseModule.id,
        organizationId: ids.organization,
        type: "ASSESSMENT",
        assessmentId: assessment.id,
        position: 0,
        isPublished: true,
      },
    });
    const opensAt = new Date(Date.now() + 24 * 60 * 60_000);
    await db.assessmentEvent.create({
      data: {
        id: ids.event,
        organizationId: ids.organization,
        courseId: ids.course,
        courseItemId: ids.item,
        createdByMembershipId: ids.membership,
        type: "TRYOUT",
        title: "Tryout 1",
        durationMinutes: 60,
        status: "SCHEDULED",
        opensAt,
        closesAt: new Date(opensAt.getTime() + 2 * 60 * 60_000),
        cohorts: {
          create: [{ cohortId: ids.cohort }, { cohortId: ids.cohort2 }],
        },
      },
    });

    await cohortWork.enqueueEventScheduled(ids.event);
    // Repeating it (rescheduled to the same time) keeps the queued message.
    await cohortWork.enqueueEventScheduled(ids.event);
    const queued = await db.whatsappOutbox.findMany({
      where: { dedupeKey: { startsWith: `event-scheduled:${ids.event}:` } },
    });
    // Kelas Selasa has no group.
    expect(queued.map((row) => [row.cohortId, row.status])).toEqual([
      [ids.cohort, "PENDING"],
    ]);
    expect(queued[0]?.expiresAt?.getTime()).toBe(opensAt.getTime());

    // Rescheduling cancels the announcement of the old time.
    const later = new Date(opensAt.getTime() + 60 * 60_000);
    await db.assessmentEvent.update({
      where: { id: ids.event },
      data: { opensAt: later },
    });
    await cohortWork.enqueueEventScheduled(ids.event);
    const rows = await db.whatsappOutbox.findMany({
      where: { dedupeKey: { startsWith: `event-scheduled:${ids.event}:` } },
      orderBy: { createdAt: "asc" },
    });
    expect(rows.map((row) => row.status)).toEqual(["CANCELLED", "PENDING"]);

    await cohortWork.cancelEventMessages(ids.event);
    expect(
      await db.whatsappOutbox.count({
        where: {
          dedupeKey: { startsWith: `event-scheduled:${ids.event}:` },
          status: "PENDING",
        },
      }),
    ).toBe(0);
  });

  test("transient failures retry later, rejections unlink a group that is gone", async () => {
    await outbox.enqueueWhatsapp([
      {
        organizationId: ids.organization,
        cohortId: ids.cohort,
        kind: "GROUP_MESSAGE",
        dedupeKey: `test-retry:${fixture}`,
        payload: { text: "Halo" },
      },
    ]);
    overrides.set("message/sendText", { status: 500, body: {} });
    const sweep = await outbox.processWhatsappOutbox();
    expect(sweep.retried).toBe(1);
    const retried = await db.whatsappOutbox.findUniqueOrThrow({
      where: { dedupeKey: `test-retry:${fixture}` },
    });
    expect(retried.status).toBe("PENDING");
    expect(retried.attempts).toBe(1);
    expect(retried.sendAfter.getTime()).toBeGreaterThan(
      Date.now() + 9 * 60_000,
    );

    // Due again, and now WhatsApp rejects it because the group is gone.
    await db.whatsappOutbox.update({
      where: { id: retried.id },
      data: { sendAfter: new Date() },
    });
    overrides.set("message/sendText", { status: 400, body: {} });
    overrides.set("group/findGroupInfos", { status: 404, body: {} });
    expect((await outbox.processWhatsappOutbox()).failed).toBe(1);
    const cohort = await db.cohort.findUniqueOrThrow({
      where: { id: ids.cohort },
    });
    expect(cohort.whatsappGroupJid).toBeNull();
    expect(cohort.whatsappGroupUrl).toBeNull();
  });

  test("group creation is limited per hour", async () => {
    // Two groups were created above; one more is allowed this hour.
    await db.whatsappOutbox.create({
      data: {
        organizationId: ids.organization,
        cohortId: ids.cohort2,
        kind: "CREATE_GROUP",
        dedupeKey: `test-budget:${fixture}`,
        payload: {},
        status: "SENT",
        sentAt: new Date(),
      },
    });
    const result = await cohortWork.requestCohortGroup({
      cohortId: ids.cohort,
    });
    expect(result.status).toBe("QUEUED");
    expect(requestsTo("group/create")).toHaveLength(0);
    const queued = await db.whatsappOutbox.findFirstOrThrow({
      where: { cohortId: ids.cohort, kind: "CREATE_GROUP", status: "PENDING" },
    });
    expect(queued.sendAfter.getTime()).toBeGreaterThan(
      Date.now() + 50 * 60_000,
    );
    // A second click while queued does not queue another group.
    expect(
      (await cohortWork.requestCohortGroup({ cohortId: ids.cohort })).status,
    ).toBe("QUEUED");
    expect(
      await db.whatsappOutbox.count({
        where: {
          cohortId: ids.cohort,
          kind: "CREATE_GROUP",
          status: "PENDING",
        },
      }),
    ).toBe(1);
  });

  test("opening a cohort queues its group when automatic creation is on", async () => {
    await cohortCaller().update({ cohortId: ids.cohort2, status: "OPEN" });
    const auto = await db.whatsappOutbox.findUnique({
      where: { dedupeKey: `create-group:${ids.cohort2}:auto` },
    });
    expect(auto?.status).toBe("PENDING");
    expect(auto?.payload).toEqual({ auto: true });
  });

  test("disconnecting logs out, deletes the instance and cancels queued work", async () => {
    await connection.disconnectWhatsapp(ids.organization);
    expect(requestsTo("instance/logout")).toHaveLength(1);
    expect(requestsTo("instance/delete")).toHaveLength(1);
    expect(
      await db.whatsappOutbox.count({
        where: { organizationId: ids.organization, status: "PENDING" },
      }),
    ).toBe(0);
    expect(
      (await connection.getWhatsappConnection(ids.organization)).connection,
    ).toBeNull();
    // Links stay on the cohorts.
    const cohort = await db.cohort.findUniqueOrThrow({
      where: { id: ids.cohort3 },
    });
    expect(cohort.whatsappGroupUrl).toBe("https://chat.whatsapp.com/INVITE1");
  });
});

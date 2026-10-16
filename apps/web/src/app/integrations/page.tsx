import type { Metadata } from "next";
import { supportEmail } from "@hakgyo/shared";

import {
  EmailLink,
  LegalList as List,
  LegalPage,
  LegalSection as Section,
} from "~/components/legal-page";
import Link from "~/components/link";
import { env } from "~/env";

const title = "Hakgyo for Claude and ChatGPT";
const description =
  "Connect Hakgyo to Claude or ChatGPT to plan courses, write materials, build vocabulary and review Tugas from a conversation.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/integrations" },
};

function Code({ children }: { children: string }) {
  return (
    <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[13px]">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-muted text-foreground overflow-x-auto rounded-lg p-4 font-mono text-[13px] leading-6">
      {children}
    </pre>
  );
}

function Strong({ children }: { children: string }) {
  return <strong className="text-foreground">{children}</strong>;
}

export default function IntegrationsPage() {
  const mcpUrl = `${env.APP_URL}/api/mcp`;

  return (
    <LegalPage
      title={title}
      intro={
        <p>
          Hakgyo is a course platform for Korean language schools and teachers.
          Its connector lets Claude and ChatGPT work with your Hakgyo account:
          teachers and school administrators can run their classes from a
          conversation, and learners can read their course outline. The
          connector is a remote MCP server at <Code>{mcpUrl}</Code>.
        </p>
      }
    >
      <Section title="What you can do">
        <List>
          <li>
            <Strong>Plan courses:</Strong> create courses, add and reorder
            modules, and arrange lessons in order.
          </li>
          <li>
            <Strong>Write materials:</Strong> create lesson materials such as
            grammar explanations and example dialogues, and add them to a
            module.
          </li>
          <li>
            <Strong>Build vocabulary:</Strong> create kosakata sets with Korean
            words, meanings and example sentences.
          </li>
          <li>
            <Strong>Create Tugas and quizzes:</Strong> author assignments with
            multiple-choice and written questions.
          </li>
          <li>
            <Strong>Review submissions:</Strong> see which learner attempts are
            waiting for review, read the written answers, and score them.
          </li>
          <li>
            <Strong>Run study groups:</Strong> create study groups, manage
            enrollments, and schedule meetings.
          </li>
          <li>
            <Strong>Manage your school:</Strong> list members and roles, and
            read organization analytics.
          </li>
          <li>
            <Strong>For learners:</Strong> list your courses, read the outline,
            materials and vocabulary, and mark an item as started or finished.
          </li>
        </List>
      </Section>

      <Section title="What it does not do">
        <List>
          <li>
            Learners take Tugas in the Hakgyo mobile app. The connector never
            shows the questions or submits answers for a learner. When a learner
            asks about a Tugas, Claude only shares a link that opens it in the
            app.
          </li>
          <li>
            Nothing is bought or sold through the connector. A course price is
            what learners pay the school inside Hakgyo.
          </li>
          <li>
            It cannot see or change anything your role in a school does not
            allow.
          </li>
        </List>
      </Section>

      <Section title="Connect from Claude">
        <p>
          You need a Hakgyo account. Teachers and administrators sign in with
          the account they use for their school workspace.
        </p>
        <List>
          <li>
            <Strong>Claude on the web, desktop and mobile:</Strong> open
            Customize &gt; Connectors, choose to add a custom connector, and
            enter <Code>{mcpUrl}</Code>. Select Connect, sign in to Hakgyo, and
            choose Allow on the consent screen.
          </li>
          <li>
            <Strong>Claude Code:</Strong> run the command below, then use{" "}
            <Code>/mcp</Code> to sign in.
          </li>
        </List>
        <CodeBlock>{`claude mcp add --transport http hakgyo ${mcpUrl}`}</CodeBlock>
        <p>
          In a chat, turn the Hakgyo connector on from the + menu, then ask for
          what you need.
        </p>
      </Section>

      <Section title="Connect from ChatGPT">
        <p>
          Add <Code>{mcpUrl}</Code> as a custom MCP server in ChatGPT under
          Plugins, choose OAuth, and sign in to Hakgyo when asked.
        </p>
      </Section>

      <Section title="Try these prompts">
        <List>
          <li>Which Hakgyo organizations am I part of and what is my role?</li>
          <li>Add a module called Greetings to my Korean Basics 1 course.</li>
          <li>
            Create a material explaining 안녕하세요 and 감사합니다 with an
            example dialogue, and add it to the Greetings module.
          </li>
          <li>
            Make a vocabulary set called Basic Greetings with five common
            greetings and their Indonesian meanings.
          </li>
          <li>Which Tugas attempts are waiting for my review?</li>
        </List>
      </Section>

      <Section title="Sign-in and permissions">
        <List>
          <li>
            Sign-in uses OAuth 2.1 with PKCE. Claude and ChatGPT never see your
            password, and you approve the connection on a Hakgyo consent screen.
          </li>
          <li>
            The connector asks for a single scope, <Code>hakgyo:mcp</Code>. The
            scope only opens the connection. Every action is checked against
            your current role and membership in Hakgyo at the moment you use it.
          </li>
          <li>
            Access tokens last 15 minutes and are renewed with a rotating
            refresh token.
          </li>
          <li>
            To disconnect, remove the Hakgyo connector in Claude or ChatGPT. The
            connection stops working as soon as it is removed.
          </li>
        </List>
      </Section>

      <Section title="Safety">
        <List>
          <li>
            Tools that only read are marked read-only. Tools that change or
            publish data are marked as such, so Claude asks for your approval
            before running them.
          </li>
          <li>
            Publishing a course, changing a member&apos;s role, cancelling an
            enrollment and saving review scores are confirmed with you first.
          </li>
          <li>
            Results exclude secrets and internal identifiers such as storage
            keys and Zoom ids.
          </li>
        </List>
      </Section>

      <Section title="Data we send to Claude and ChatGPT">
        <p>
          The connector returns only the results of the tools you ask Claude or
          ChatGPT to run, for example your course outline or a list of attempts
          waiting for review. See the{" "}
          <Link
            href="/privacy"
            className="text-foreground underline underline-offset-4"
          >
            Privacy Policy
          </Link>{" "}
          for how Hakgyo handles personal data.
        </p>
      </Section>

      <Section title="Troubleshooting">
        <List>
          <li>
            <Strong>Sign-in does not finish:</Strong> remove the connector, add
            it again, and sign in with the same Hakgyo account that belongs to
            your school.
          </li>
          <li>
            <Strong>Permission denied:</Strong> your role in that school does
            not allow the action. Ask a school owner or administrator.
          </li>
          <li>
            <Strong>Nothing appears:</Strong> check that the connector is turned
            on for the conversation from the + menu.
          </li>
        </List>
      </Section>

      <Section title="Support">
        <p>
          Email <EmailLink email={supportEmail} /> with your account email, the
          school name and what you asked Claude or ChatGPT to do. More help is
          on the{" "}
          <Link
            href="/support"
            className="text-foreground underline underline-offset-4"
          >
            support page
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}

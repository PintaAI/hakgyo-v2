import { env } from "~/env";

// OpenAI reads this when verifying the domain of a ChatGPT plugin's MCP server.
// The body must be the bare token: no JSON, no trailing text.
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

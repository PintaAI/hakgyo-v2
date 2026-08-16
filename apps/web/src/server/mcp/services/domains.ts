import { appRouter, createMcpCaller } from "~/server/api/root";
import {
  mcpDomainActions,
  normalizeMcpProcedureInput,
  type McpDomain,
} from "~/server/mcp/domain-actions";
import { z } from "zod";

export { mcpDomainActions } from "~/server/mcp/domain-actions";
export type { McpDomain } from "~/server/mcp/domain-actions";

export function getMcpCapabilitySchemas(filter?: {
  action?: string;
  domain?: McpDomain;
}) {
  const procedures = (
    appRouter as unknown as {
      _def: {
        procedures: Record<
          string,
          {
            _def: {
              inputs: Array<{ toJSONSchema?: () => unknown }>;
            };
          }
        >;
      };
    }
  )._def.procedures;

  return Object.fromEntries(
    Object.entries(mcpDomainActions)
      .filter(([domain]) => !filter?.domain || domain === filter.domain)
      .map(([domain, actions]) => [
        domain,
        actions
          .filter((action) => !filter?.action || action === filter.action)
          .map((action) => ({
            action,
            inputSchema: getInputJsonSchema(
              procedures[`${domain}.${action}`]?._def.inputs[0],
            ),
          })),
      ]),
  );
}

function getInputJsonSchema(input?: { toJSONSchema?: () => unknown }) {
  if (!input) return { type: "object", properties: {} };

  return z.toJSONSchema(input as z.ZodType, {
    unrepresentable: "any",
    override: (ctx) => {
      if (ctx.zodSchema._zod.def.type === "date") {
        ctx.jsonSchema.type = "string";
        ctx.jsonSchema.format = "date-time";
      }
    },
  });
}

export async function invokeMcpDomainAction(input: {
  action: string;
  actorUserId: string;
  domain: McpDomain;
  procedureInput: Record<string, unknown>;
}) {
  const allowedActions = mcpDomainActions[input.domain] as readonly string[];
  if (!allowedActions.includes(input.action)) {
    throw new Error(`Unsupported ${input.domain} action: ${input.action}`);
  }

  const caller = createMcpCaller(input.actorUserId);
  const procedures = caller[input.domain] as unknown as Record<
    string,
    (procedureInput?: unknown) => Promise<unknown>
  >;
  const procedure = procedures[input.action];
  if (!procedure) throw new Error(`Unknown ${input.domain} action`);

  const normalizedInput = normalizeMcpProcedureInput(input);
  const procedureInput =
    Object.keys(normalizedInput).length > 0 ? normalizedInput : undefined;
  return procedure(procedureInput);
}

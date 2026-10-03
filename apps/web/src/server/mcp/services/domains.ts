import { fromJsonSchema } from "@modelcontextprotocol/server";
import { z } from "zod";

import { appRouter, createMcpCaller } from "~/server/api/root";
import {
  addAssessmentAppLinks,
  mcpDomainActions,
  normalizeMcpProcedureInput,
  type McpDomain,
} from "~/server/mcp/domain-actions";

export { mcpDomainActions, mcpDomainTools } from "~/server/mcp/domain-actions";
export type { McpDomain } from "~/server/mcp/domain-actions";

type ProcedureDefinitions = Record<
  string,
  { _def: { inputs: Array<{ toJSONSchema?: () => unknown }> } }
>;

/**
 * The tool input schema for an allowlisted action, generated from its tRPC
 * input so the published schema cannot drift from what the procedure accepts.
 */
export function getMcpActionInputSchema(domain: McpDomain, action: string) {
  const procedures = (
    appRouter as unknown as { _def: { procedures: ProcedureDefinitions } }
  )._def.procedures;
  const input = procedures[`${domain}.${action}`]?._def.inputs[0];
  const schema: Record<string, unknown> = input
    ? z.toJSONSchema(input as z.ZodType, {
        io: "input",
        unrepresentable: "any",
        override: (ctx) => {
          if (ctx.zodSchema._zod.def.type === "date") {
            ctx.jsonSchema.type = "string";
            ctx.jsonSchema.format = "date-time";
          }
        },
      })
    : { type: "object", properties: {} };
  return fromJsonSchema<Record<string, unknown>>(schema);
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
  return addAssessmentAppLinks({
    ...input,
    result: await procedure(procedureInput),
  });
}

import { hakgyoBlockCatalog } from "./block-catalog";

type PropRule = {
  type: "string" | "number" | "boolean";
  enum?: readonly string[];
  json: boolean;
};

const builtInBlockTypes = new Set<string>(
  hakgyoBlockCatalog.builtInBlocks.map((block) => block.type),
);

const customBlockProps = new Map<string, Map<string, PropRule>>(
  hakgyoBlockCatalog.customBlocks.map((block) => {
    const jsonProps =
      "guidance" in block && "jsonProps" in block.guidance
        ? Object.keys(block.guidance.jsonProps)
        : [];
    const props = Object.entries(
      block.props as Record<string, Omit<PropRule, "json">>,
    ).map(([name, prop]): [string, PropRule] => [
      name,
      { type: prop.type, enum: prop.enum, json: jsonProps.includes(name) },
    ]);
    return [block.type, new Map(props)];
  }),
);

export type BlockNoteDocumentIssue = {
  path: (string | number)[];
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonArray(value: string) {
  try {
    return Array.isArray(JSON.parse(value));
  } catch {
    return false;
  }
}

function propIssue(rule: PropRule, value: unknown) {
  if (typeof value !== rule.type) return `must be a ${rule.type}`;
  if (rule.enum && !rule.enum.includes(value as string)) {
    return `must be one of ${rule.enum.map((item) => `"${item}"`).join(", ")}`;
  }
  if (rule.json && !isJsonArray(value as string)) {
    return "must be a string containing a JSON array";
  }
  return null;
}

/**
 * Checks a BlockNote document against the Hakgyo block catalog: every block
 * must use a catalog type, and custom block props must match their declared
 * type, enum and JSON encoding. Props may be omitted (BlockNote fills in
 * defaults); unknown props are left to BlockNote, which drops them.
 */
export function findBlockNoteDocumentIssues(
  document: readonly unknown[],
): BlockNoteDocumentIssue[] {
  const issues: BlockNoteDocumentIssue[] = [];

  const visit = (block: unknown, path: (string | number)[]) => {
    if (!isRecord(block)) {
      issues.push({ path, message: "Block must be an object" });
      return;
    }
    const type = block.type;
    if (typeof type !== "string") {
      issues.push({
        path: [...path, "type"],
        message: "Block type is required",
      });
    } else if (!builtInBlockTypes.has(type) && !customBlockProps.has(type)) {
      issues.push({
        path: [...path, "type"],
        message: `Unknown block type "${type}". Use a type from get_material_block_catalog`,
      });
    }

    const rules = typeof type === "string" ? customBlockProps.get(type) : null;
    if (typeof type === "string" && rules && block.props !== undefined) {
      if (!isRecord(block.props)) {
        issues.push({
          path: [...path, "props"],
          message: "Props must be an object",
        });
      } else {
        for (const [name, value] of Object.entries(block.props)) {
          const rule = rules.get(name);
          const issue = rule && propIssue(rule, value);
          if (issue) {
            issues.push({
              path: [...path, "props", name],
              message: `${type}.${name} ${issue}`,
            });
          }
        }
      }
    }

    if (block.children === undefined) return;
    if (!Array.isArray(block.children)) {
      issues.push({
        path: [...path, "children"],
        message: "Children must be an array",
      });
      return;
    }
    block.children.forEach((child, index) =>
      visit(child, [...path, "children", index]),
    );
  };

  document.forEach((block, index) => visit(block, [index]));
  return issues;
}

import type { Prisma } from "../../generated/prisma/client";

export function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError("Value is not JSON-serializable");
  }

  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

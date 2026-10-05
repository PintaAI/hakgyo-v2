import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { requireSuperadminSession } from "~/server/auth/dal";

/**
 * Gates every /superadmin page: only signed-in accounts whose email is in
 * SUPERADMIN_EMAILS get through; everyone else sees a 404. Pages repeat the
 * check (it is cached per request) and every superadmin procedure checks again.
 */
export default async function SuperadminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireSuperadminSession();
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  return children;
}

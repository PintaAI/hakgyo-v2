import "server-only";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

/** Screenshot payload for AI extraction; clients downscale before sending. */
export const aiImageInputFields = {
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  // Base64 without the data-URL prefix.
  imageBase64: z
    .string()
    .min(1)
    .max(8 * 1024 * 1024)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
};

/** Maps an AI extraction failure to a user-facing tRPC error. */
export function aiExtractionError(error: unknown) {
  if (error instanceof Error && error.message === "OPENAI_API_KEY_MISSING") {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "OPENAI_API_KEY belum dikonfigurasi di server.",
    });
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "AI belum berhasil membaca gambar. Silakan coba lagi.",
    cause: error,
  });
}

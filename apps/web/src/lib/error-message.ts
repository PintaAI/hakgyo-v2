/** The message of a thrown error or tRPC failure, or `fallback`. */
export function getErrorMessage(
  error: unknown,
  fallback = "Perubahan belum berhasil disimpan. Silakan coba lagi.",
) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

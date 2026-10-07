/**
 * Indonesian text for errors that reach the UI without a readable message:
 * bare tRPC codes, Better Auth error codes, and network failures.
 */
const trpcCodeMessages: Record<string, string> = {
  BAD_REQUEST: "Permintaan tidak valid. Coba lagi.",
  UNAUTHORIZED: "Sesi kamu berakhir. Silakan masuk lagi.",
  FORBIDDEN: "Kamu tidak memiliki akses ke halaman ini.",
  NOT_FOUND: "Data tidak ditemukan atau sudah dihapus.",
  CONFLICT: "Data sudah berubah. Muat ulang lalu coba lagi.",
  TOO_MANY_REQUESTS:
    "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
  INTERNAL_SERVER_ERROR: "Terjadi kesalahan di server. Coba lagi nanti.",
};

const authCodeMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email atau kata sandi salah.",
  INVALID_EMAIL: "Alamat email tidak valid.",
  INVALID_PASSWORD: "Kata sandi salah.",
  PASSWORD_TOO_SHORT: "Kata sandi minimal 8 karakter.",
  PASSWORD_TOO_LONG: "Kata sandi terlalu panjang.",
  USER_ALREADY_EXISTS: "Email ini sudah terdaftar. Silakan masuk.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Email ini sudah terdaftar. Silakan masuk atau pakai email lain.",
  FAILED_TO_CREATE_USER: "Akun tidak dapat dibuat. Coba lagi.",
  SESSION_EXPIRED: "Demi keamanan, keluar lalu masuk lagi sebelum melanjutkan.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Akun ini tidak memakai kata sandi.",
};

const networkPattern = /network request failed|failed to fetch|network error/i;

export function userErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const { code, message } = error as { code?: unknown; message?: unknown };
  const text = typeof message === "string" ? message.trim() : "";
  if (networkPattern.test(text)) {
    return "Tidak ada koneksi internet. Periksa jaringan lalu coba lagi.";
  }
  // Better Auth sends English messages alongside a stable code.
  if (typeof code === "string" && authCodeMessages[code]) {
    return authCodeMessages[code];
  }
  // tRPC errors thrown without a message carry only their code.
  if (/^[A-Z_]+$/.test(text)) return trpcCodeMessages[text] ?? fallback;
  return text || fallback;
}

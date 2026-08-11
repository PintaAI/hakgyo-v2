const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!configuredApiUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is required. Copy apps/mobile/.env.example to apps/mobile/.env and set the Next.js origin.",
  );
}

export const apiUrl = configuredApiUrl.replace(/\/$/, "");

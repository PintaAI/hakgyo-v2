import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [oauthProviderClient()],
});

export type Session = typeof authClient.$Infer.Session;

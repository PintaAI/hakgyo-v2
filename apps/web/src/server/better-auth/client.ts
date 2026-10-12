import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [oauthProviderClient()],
  // Sign-outs in other tabs still arrive over the broadcast channel; refetching
  // on every tab switch only adds a request.
  sessionOptions: { refetchOnWindowFocus: false },
});

export type Session = typeof authClient.$Infer.Session;

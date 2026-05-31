import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

/**
 * Client-side auth helpers — hooks, sign-in/up, session access.
 *
 * Usage:
 *   const { data: session } = authClient.useSession();
 *   await authClient.signIn.email({ email, password });
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  plugins: [twoFactorClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

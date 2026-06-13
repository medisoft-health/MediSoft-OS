import { createAuthClient } from "better-auth/react";
import { twoFactorClient, phoneNumberClient } from "better-auth/client/plugins";

/**
 * Client-side auth helpers — hooks, sign-in/up, session access.
 *
 * baseURL uses the current window origin so the auth client works correctly
 * on any subdomain (app.medisofthealth.com, sport.medisofthealth.com, etc.)
 * without cross-domain cookie issues.
 *
 * Usage:
 *   const { data: session } = authClient.useSession();
 *   await authClient.signIn.email({ email, password });
 *   await authClient.phoneNumber.sendOtp({ phoneNumber });
 *   await authClient.signIn.phoneNumber({ phoneNumber, code });
 */
function getBaseURL() {
  // In browser: use current origin (works on any subdomain)
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // On server: use the env variable
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [twoFactorClient(), phoneNumberClient()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

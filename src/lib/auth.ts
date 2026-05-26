import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/env";
import { buildVerificationEmail, sendEmail } from "@/lib/email";

/**
 * MediSoft C-OS authentication (Better-Auth, self-hosted).
 *
 * Phase 1: email + password.
 * Future: Nafath (Saudi national IAM), SSO for hospital groups, 2FA.
 *
 * Email verification:
 *   The verification plumbing is fully wired below — Better-Auth will
 *   call `sendVerificationEmail` when a new user signs up. Today that
 *   logs to the console (see src/lib/email). To turn verification into
 *   a hard requirement, flip `requireEmailVerification` to true in
 *   `emailAndPassword` AND configure a real email driver (Resend etc.).
 */
export const auth = betterAuth({
  appName: "MediSoft C-OS",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    // Production hardening: set to `true` AND configure a real email
    // driver (src/lib/email/index.ts) before flipping. Leaving false
    // means signups land instantly but the verification email is
    // still sent (visible in the console) so we can dry-run the flow.
    requireEmailVerification: false,
    minPasswordLength: 12, // healthcare-grade
    maxPasswordLength: 128,
    autoSignIn: true,
    /** Send the reset-password email (unused until reset flow ships). */
    sendResetPassword: async ({ user, url }) => {
      const { buildPasswordResetEmail } = await import("@/lib/email");
      await sendEmail(
        buildPasswordResetEmail({ toName: user.name, toEmail: user.email, url }),
      );
    },
  },

  emailVerification: {
    /** Send the verification link. Better-Auth invokes this on signup. */
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(
        buildVerificationEmail({ toName: user.name, toEmail: user.email, url }),
      );
    },
    /** Mark the user as verified the first time they click the link. */
    autoSignInAfterVerification: true,
  },

  session: {
    expiresIn: 60 * 60 * 12, // 12 hours — clinical shift length
    updateAge: 60 * 60, // refresh every 1 hour
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "physician",
        input: false, // not settable on signup; only admins promote
      },
      specialty: { type: "string", required: false },
      licenseNumber: { type: "string", required: false },
      saudiId: { type: "string", required: false },
    },
  },

  advanced: {
    cookiePrefix: "medisoft",
    useSecureCookies: env.NODE_ENV === "production",
  },

  plugins: [nextCookies()], // must remain last in this list
});

export type Auth = typeof auth;

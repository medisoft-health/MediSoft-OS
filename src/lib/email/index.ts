import "server-only";
import { env } from "@/env";

/**
 * Email transport abstraction.
 *
 * The Better-Auth verification flow needs one function: `sendEmail`.
 * We define a small driver interface, ship a `ConsoleDriver` for dev,
 * and document where to plug in Resend / SendGrid when production is
 * ready.
 *
 * Driver selection:
 *   - RESEND_API_KEY set  → ResendDriver (not implemented yet; uses console fallback with a TODO)
 *   - otherwise           → ConsoleDriver
 *
 * `requireEmailVerification` remains false in auth.ts until you confirm
 * a real driver is wired and credentials are live. Flipping the auth
 * switch is then a one-line change.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailDriver {
  name: string;
  isLive: boolean;
  send(message: EmailMessage): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────
// Console driver — dev default
// ─────────────────────────────────────────────────────────────────
const ConsoleDriver: EmailDriver = {
  name: "console",
  isLive: false,
  async send(msg) {
    // eslint-disable-next-line no-console
    console.log(
      "\n┌─ [email/console] ─────────────────────────────────────────",
    );
    // eslint-disable-next-line no-console
    console.log(`│  TO:      ${msg.to}`);
    // eslint-disable-next-line no-console
    console.log(`│  SUBJECT: ${msg.subject}`);
    // eslint-disable-next-line no-console
    console.log("│  TEXT:");
    for (const line of msg.text.split("\n")) {
      // eslint-disable-next-line no-console
      console.log(`│    ${line}`);
    }
    // eslint-disable-next-line no-console
    console.log(
      "└───────────────────────────────────────────────────────────\n",
    );
  },
};

// ─────────────────────────────────────────────────────────────────
// Resend driver — production stub
// ─────────────────────────────────────────────────────────────────
// To activate: `npm install resend` and uncomment the implementation
// below. We don't take a hard dependency on Resend here because the
// `requireEmailVerification` switch is still false — no email is
// actually sent in the current configuration.
//
// import { Resend } from "resend";
// const ResendDriver = (apiKey: string): EmailDriver => {
//   const client = new Resend(apiKey);
//   return {
//     name: "resend",
//     isLive: true,
//     async send(msg) {
//       await client.emails.send({
//         from: env.EMAIL_FROM ?? "noreply@medisoft.health",
//         to: msg.to,
//         subject: msg.subject,
//         text: msg.text,
//         html: msg.html,
//       });
//     },
//   };
// };

let cached: EmailDriver | null = null;

export function getEmailDriver(): EmailDriver {
  if (cached) return cached;
  // When RESEND_API_KEY is set we'd return the real driver here.
  // For now we acknowledge it in the log and fall back to console so
  // production deploys without the package install still don't crash.
  const resendKey = (env as unknown as { RESEND_API_KEY?: string })
    .RESEND_API_KEY;
  if (resendKey) {
    // eslint-disable-next-line no-console
    console.warn(
      "[email] RESEND_API_KEY set but Resend driver not yet wired. " +
        "Install `resend` and uncomment the driver in src/lib/email/index.ts.",
    );
  }
  cached = ConsoleDriver;
  return cached;
}

// ─────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────

/**
 * Render the verification email used when Better-Auth's
 * `sendVerificationEmail` callback fires.
 */
export function buildVerificationEmail(args: {
  toName: string | null;
  toEmail: string;
  url: string;
}): EmailMessage {
  const name = args.toName?.trim() || "there";
  return {
    to: args.toEmail,
    subject: "Verify your MediSoft account",
    text:
      `Hi ${name},\n\n` +
      `Please verify your MediSoft account by clicking the link below:\n\n` +
      `${args.url}\n\n` +
      `This link expires in 24 hours. If you didn't sign up for MediSoft, ` +
      `you can safely ignore this email.\n\n` +
      `— The MediSoft team`,
    html: undefined,
  };
}

/**
 * Render the password-reset email (placeholder — wire when reset flow
 * is built in a later PR).
 */
export function buildPasswordResetEmail(args: {
  toName: string | null;
  toEmail: string;
  url: string;
}): EmailMessage {
  const name = args.toName?.trim() || "there";
  return {
    to: args.toEmail,
    subject: "Reset your MediSoft password",
    text:
      `Hi ${name},\n\n` +
      `Click the link below to reset your MediSoft password:\n\n` +
      `${args.url}\n\n` +
      `This link expires in 1 hour. If you didn't request a reset, ` +
      `you can safely ignore this email.\n\n` +
      `— The MediSoft team`,
  };
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const driver = getEmailDriver();
  try {
    await driver.send(message);
  } catch (err) {
    // Emails must not break user flows.
    console.error(`[email/${driver.name}] send failed`, err);
  }
}

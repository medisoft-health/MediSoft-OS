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
     
    console.log(
      "\n┌─ [email/console] ─────────────────────────────────────────",
    );
     
    console.log(`│  TO:      ${msg.to}`);
     
    console.log(`│  SUBJECT: ${msg.subject}`);
     
    console.log("│  TEXT:");
    for (const line of msg.text.split("\n")) {
       
      console.log(`│    ${line}`);
    }
     
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

// ─────────────────────────────────────────────────────────────────
// Startup warning — emitted once when the module first loads.
// This makes it obvious in the PM2/server logs that email is not
// production-ready without spamming a warning on every send.
//
// To configure Resend:
//   1. npm install resend
//   2. Add RESEND_API_KEY=re_xxx to your .env.local / GCE Secret Manager
//   3. Uncomment the ResendDriver block above and return it from getEmailDriver()
//   4. Set EMAIL_FROM=noreply@your-domain.com in env vars
//   5. Flip requireEmailVerification: true in src/lib/auth.ts
// ─────────────────────────────────────────────────────────────────
const resendKeyAtStartup = (env as unknown as { RESEND_API_KEY?: string })
  .RESEND_API_KEY;

if (!resendKeyAtStartup) {

  console.warn(
    "[email] No RESEND_API_KEY found — using console fallback. " +
      "Password-reset and email-verification emails will be printed to stdout only. " +
      "See src/lib/email/index.ts for Resend setup instructions.",
  );
} else {

  console.warn(
    "[email] RESEND_API_KEY is set but Resend driver is not yet wired. " +
      "Install `resend` and uncomment the ResendDriver in src/lib/email/index.ts.",
  );
}

let cached: EmailDriver | null = null;

export function getEmailDriver(): EmailDriver {
  if (cached) return cached;
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

/**
 * Render the MediSport coach-verification decision email.
 * Bilingual (Arabic first, English second) so the coach reads it in
 * whichever language they're comfortable with. Sent on approve / reject /
 * request-info decisions from the admin console.
 */
export function buildCoachDecisionEmail(args: {
  toName: string | null;
  toEmail: string;
  decision: "approve" | "reject" | "request_info";
  score?: number | null;
  tier?: string | null;
  note?: string | null;
  ctaUrl: string;
}): EmailMessage {
  const name = args.toName?.trim() || "مدرب MediSport";
  const tierAr: Record<string, string> = {
    bronze: "برونزي",
    silver: "فضي",
    gold: "ذهبي",
    elite: "نخبة",
  };
  let subject: string;
  let headlineAr: string;
  let headlineEn: string;
  let bodyAr: string;
  let bodyEn: string;
  let accent: string;

  if (args.decision === "approve") {
    accent = "#0E9F6E";
    subject = "تهانينا — تم اعتماد حسابك كمدرب | MediSport Coach Verified";
    headlineAr = "تهانينا! تم اعتمادك كمدرب";
    headlineEn = "Congratulations! You're a verified coach";
    const scoreLine = args.score != null ? `${args.score}/100` : "—";
    const tierLine = args.tier ? `${tierAr[args.tier] ?? args.tier}` : "—";
    bodyAr =
      `تم اعتماد ملفك بنجاح. تقييمك: ${scoreLine} · الفئة: ${tierLine}. ` +
      `أصبح ملفك الآن ظاهرًا في دليل المدربين، ويمكن للمتدربين إرسال طلبات التدريب إليك.`;
    bodyEn =
      `Your profile has been verified. Score: ${scoreLine} · Tier: ${args.tier ?? "—"}. ` +
      `You now appear in the coach directory and trainees can send you requests.`;
  } else if (args.decision === "reject") {
    accent = "#DC2626";
    subject = "تحديث بشأن طلب الاعتماد | MediSport Verification Update";
    headlineAr = "تحديث بشأن طلب الاعتماد";
    headlineEn = "Update on your verification request";
    bodyAr =
      `لم يتم اعتماد طلبك حاليًا. ` +
      (args.note ? `السبب: ${args.note}. ` : "") +
      `يمكنك تحديث ملفك وإعادة التقديم في أي وقت.`;
    bodyEn =
      `Your request was not approved at this time. ` +
      (args.note ? `Reason: ${args.note}. ` : "") +
      `You can update your profile and resubmit anytime.`;
  } else {
    accent = "#D97706";
    subject = "مطلوب معلومات إضافية | MediSport: More Info Needed";
    headlineAr = "مطلوب معلومات إضافية";
    headlineEn = "We need a bit more information";
    bodyAr =
      `لإكمال مراجعة طلبك، نحتاج بعض المعلومات الإضافية. ` +
      (args.note ? `${args.note}. ` : "") +
      `يرجى تحديث ملفك ثم إعادة التقديم.`;
    bodyEn =
      `To complete your review we need some additional information. ` +
      (args.note ? `${args.note}. ` : "") +
      `Please update your profile and resubmit.`;
  }

  const text =
    `${headlineAr}\n\nمرحبًا ${name}،\n${bodyAr}\n\n${args.ctaUrl}\n\n` +
    `— فريق MediSport\n\n----\n\n${headlineEn}\n\nHi ${name},\n${bodyEn}\n\n${args.ctaUrl}\n\n— The MediSport team`;

  const html = `<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;background:#f1f5f9;font-family:Cairo,Tahoma,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
      <div style="height:6px;background:${accent};"></div>
      <div style="padding:28px;">
        <div style="font-size:13px;color:#0E9F6E;font-weight:700;letter-spacing:.5px;">MEDISPORT</div>
        <h1 style="font-size:20px;color:#0f172a;margin:8px 0 16px;">${headlineAr}</h1>
        <p style="font-size:15px;color:#334155;line-height:1.9;margin:0 0 8px;">مرحبًا ${name}،</p>
        <p style="font-size:15px;color:#334155;line-height:1.9;margin:0 0 20px;">${bodyAr}</p>
        <a href="${args.ctaUrl}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:14px;">فتح لوحة المدرب</a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <div dir="ltr" style="text-align:left;">
          <h2 style="font-size:16px;color:#0f172a;margin:0 0 8px;">${headlineEn}</h2>
          <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0 0 4px;">Hi ${name},</p>
          <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0;">${bodyEn}</p>
        </div>
      </div>
      <div style="padding:16px 28px;background:#f8fafc;font-size:12px;color:#94a3b8;text-align:center;">Powered by MediSoft Health · © 2026</div>
    </div>
  </div></body></html>`;

  return { to: args.toEmail, subject, text, html };
}

export async function sendEmail(
  message: EmailMessage,
): Promise<{ success: boolean; provider: string }> {
  const driver = getEmailDriver();
  try {
    await driver.send(message);
    return { success: true, provider: driver.name };
  } catch (err) {
    // Emails must not break user flows — log the failure and return gracefully.
    console.error(`[email/${driver.name}] send failed`, err);
    return { success: false, provider: driver.name };
  }
}

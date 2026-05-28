# ══════════════════════════════════════════════════════════════════
#  MediSoft C-OS — Dockerfile (Multi-Stage Production Build)
# ══════════════════════════════════════════════════════════════════
#
#  الهدف: بناء صورة Docker خفيفة (<200MB) لنشرها على Cloud Run
#  الاستراتيجية: 3 مراحل (dependencies → build → runner)
#
#  الاستخدام:
#    docker build -t medisoft-cos .
#    docker run -p 3000:3000 --env-file .env.local medisoft-cos
#
# ══════════════════════════════════════════════════════════════════

# ─── المرحلة 1: تثبيت الاعتمادات (Dependencies) ──────────────────
# نفصل هذه المرحلة لأن package-lock.json نادراً ما يتغير
# فالـ Docker cache يوفر وقت كبير في كل build
FROM node:20-alpine AS deps
WORKDIR /app

# libc6-compat مطلوب لبعض الـ native modules على Alpine
RUN apk add --no-cache libc6-compat

# نسخ ملفات الـ package فقط (ليس كل الكود)
# هذا يخلي الـ cache layer يبقى صالح طالما الـ dependencies لم تتغير
COPY package.json package-lock.json ./

# تثبيت كل الاعتمادات (dev + prod) — محتاجين الـ dev للـ build
RUN npm ci

# ─── المرحلة 2: بناء التطبيق (Builder) ──────────────────────────
# هنا نبني Next.js standalone output
FROM node:20-alpine AS builder
WORKDIR /app

# نسخ الاعتمادات من المرحلة السابقة
COPY --from=deps /app/node_modules ./node_modules

# نسخ كل ملفات المشروع
COPY . .

# تعطيل التتبع (telemetry) أثناء البناء
ENV NEXT_TELEMETRY_DISABLED=1

# تخطي التحقق من المتغيرات البيئية أثناء البناء
# (المتغيرات الحقيقية تُحقن في وقت التشغيل عبر Cloud Run)
ENV SKIP_ENV_VALIDATION=1

# بناء التطبيق — ينتج مجلد .next/standalone
# الـ standalone output يحتوي server.js مستقل + الـ modules المطلوبة فقط
RUN npm run build

# ─── المرحلة 3: التشغيل (Runner) ────────────────────────────────
# صورة نظيفة وخفيفة — بدون كود المصدر أو node_modules الكامل
FROM node:20-alpine AS runner
WORKDIR /app

# بيئة الإنتاج
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# إنشاء مستخدم غير root لأسباب أمنية
# (Cloud Run يشغل كـ root بشكل افتراضي لكن هذا أفضل كممارسة)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ─── نسخ ملفات الإنتاج فقط ──────────────────────────────────────

# 1. الملفات العامة (صور، أيقونات، خطوط)
COPY --from=builder /app/public ./public

# 2. standalone server — يحتوي server.js + node_modules المصغرة
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 3. الملفات الثابتة (CSS, JS chunks) — Next.js لا يضمها في standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ─── إعدادات التشغيل ─────────────────────────────────────────────

# Cloud Run يرسل الـ PORT عبر متغير بيئة
# لكن Next.js standalone يحتاج PORT + HOSTNAME
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# فتح المنفذ 3000
EXPOSE 3000

# التبديل للمستخدم غير root
USER nextjs

# ─── Health Check ────────────────────────────────────────────────
# Cloud Run يستخدم HTTP health check على المنفذ المحدد
# Next.js يرد بـ 200 على أي route — لذلك "/" كافي
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# ─── تشغيل السيرفر ──────────────────────────────────────────────
# server.js هو الـ standalone server الذي أنتجه Next.js build
CMD ["node", "server.js"]

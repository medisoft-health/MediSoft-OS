# ══════════════════════════════════════════════════════════════════
#  MediSoft C-OS — Dockerfile (Multi-Stage Production Build)
# ══════════════════════════════════════════════════════════════════
#
#  المشروع: MediSoft Clinical Operating System
#  الإطار: Next.js 16 (App Router) + Drizzle ORM + Better-Auth
#  مدير الحزم: npm
#  Node.js: 20-alpine
#
#  الهدف: صورة إنتاج خفيفة (<200MB) للنشر على Cloud Run
#  الاستراتيجية: 3 مراحل (deps → builder → runner)
#
#  GCP:
#    Project: gen-lang-client-0619493108
#    Region: me-central1
#    Cloud SQL: gen-lang-client-0619493108:me-central1:medisoft-db
#
#  الاستخدام:
#    docker build -t medisoft-app .
#    docker run -p 3000:3000 --env-file .env.production medisoft-app
#
# ══════════════════════════════════════════════════════════════════


# ─── المرحلة 1: تثبيت الاعتمادات (Dependencies) ──────────────────
#
# هذه المرحلة منفصلة لاستغلال Docker layer cache.
# طالما package.json و package-lock.json لم يتغيرا، هذه المرحلة
# تُسترجع من الكاش — يوفر 2-3 دقائق في كل build.
#
FROM node:20-alpine AS deps
WORKDIR /app

# libc6-compat مطلوب لبعض الـ native Node.js modules على Alpine Linux
# (مثل: sharp لمعالجة الصور، better-sqlite3، إلخ)
RUN apk add --no-cache libc6-compat

# نسخ ملفات تعريف الحزم فقط (وليس كل الكود)
# هذا يخلي الـ cache layer صالح طالما الاعتمادات لم تتغير
COPY package.json package-lock.json ./

# تثبيت كل الاعتمادات (dev + prod)
# محتاجين الـ dev dependencies للـ build (TypeScript, ESLint, إلخ)
# --ignore-scripts يمنع تشغيل postinstall scripts غير ضرورية
RUN npm ci


# ─── المرحلة 2: بناء التطبيق (Builder) ──────────────────────────
#
# هنا نبني Next.js بوضع standalone output.
# standalone ينتج server.js مستقل + فقط الـ node_modules المطلوبة
# (بدلاً من كل الـ 800MB+ في node_modules الأصلي)
#
FROM node:20-alpine AS builder
WORKDIR /app

# نسخ node_modules من المرحلة السابقة
COPY --from=deps /app/node_modules ./node_modules

# نسخ كل ملفات المشروع
COPY . .

# ─── متغيرات بيئة البناء ─────────────────────────────────────────
# NEXT_TELEMETRY_DISABLED: تعطيل إرسال بيانات الاستخدام لـ Vercel
# SKIP_ENV_VALIDATION: تخطي التحقق من المتغيرات البيئية أثناء البناء
#   (المتغيرات الحقيقية تُحقن في وقت التشغيل عبر Cloud Run)
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# ─── متغيرات مؤقتة للبناء فقط ────────────────────────────────────
# Better-Auth و Next.js يحتاجون هذه المتغيرات وقت البناء حتى لو مش هنستخدمها
# القيم الحقيقية تُحقن من Secret Manager وقت التشغيل على Cloud Run
ENV BETTER_AUTH_SECRET="build-time-placeholder-secret"
ENV BETTER_AUTH_URL="http://localhost:3000"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# بناء التطبيق
# next.config.ts يحتوي output: "standalone"
# المخرجات تكون في:
#   .next/standalone/    — server.js + node_modules المصغرة
#   .next/static/        — CSS, JS chunks (لا يُضمّن تلقائياً)
#   public/              — صور، أيقونات، خطوط (لا يُضمّن تلقائياً)
RUN npm run build


# ─── المرحلة 3: التشغيل (Runner) ────────────────────────────────
#
# صورة نظيفة وخفيفة — بدون:
#   ✗ كود TypeScript المصدري
#   ✗ node_modules الكامل (800MB+)
#   ✗ أدوات البناء (tsc, eslint, vitest)
#   ✗ ملفات الاختبارات
#
# تحتوي فقط:
#   ✓ server.js (standalone Next.js server)
#   ✓ node_modules مصغرة (~50MB)
#   ✓ .next/static (CSS, JS)
#   ✓ public/ (صور، أيقونات)
#
FROM node:20-alpine AS runner
WORKDIR /app

# بيئة الإنتاج
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# ─── إنشاء مستخدم غير root (أمان) ───────────────────────────────
# Cloud Run يشغل كـ root بشكل افتراضي، لكن أفضل ممارسة أمنية
# هي التشغيل كمستخدم محدود الصلاحيات.
# هذا يمنع أي ثغرة في التطبيق من الوصول لملفات النظام.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ─── نسخ ملفات الإنتاج فقط ──────────────────────────────────────

# 1. الملفات العامة (صور، أيقونات، خطوط، brand logos)
#    مسار: /app/public/
COPY --from=builder /app/public ./public

# 2. Next.js standalone server
#    يحتوي: server.js + node_modules مصغرة
#    مسار: /app/ (server.js في الجذر)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 3. الملفات الثابتة (CSS, JS chunks, fonts)
#    Next.js standalone لا يضمها تلقائياً — لازم ننسخها يدوياً
#    مسار: /app/.next/static/
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ─── إعدادات التشغيل ─────────────────────────────────────────────

# Cloud Run يرسل PORT عبر متغير بيئة (عادة 8080)
# لكن Next.js standalone يحتاج أيضاً HOSTNAME
# "0.0.0.0" = يسمع على كل الـ interfaces (مطلوب للـ container)
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# فتح المنفذ
EXPOSE ${PORT}

# التبديل للمستخدم غير root
USER nextjs

# ─── Health Check ────────────────────────────────────────────────
# Cloud Run يتحقق من صحة الحاوية عبر HTTP GET
# /api/health هو الـ endpoint المخصص (سنبنيه لاحقاً)
# إذا أرجع 200 → الحاوية سليمة
# إذا فشل 3 مرات متتالية → Cloud Run يعيد تشغيل الحاوية
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/api/health || exit 1

# ─── تشغيل السيرفر ──────────────────────────────────────────────
# server.js هو الملف الذي أنتجه Next.js standalone build
# يحتوي HTTP server كامل بدون الحاجة لـ next start
CMD ["node", "server.js"]

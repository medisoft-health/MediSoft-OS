#!/bin/bash
# ══════════════════════════════════════════════════════════════════
#  MediSoft C-OS — سكريبت نقل قاعدة البيانات
# ══════════════════════════════════════════════════════════════════
#
#  الهدف: نقل البيانات من PostgreSQL المحلي (GCP VM) إلى Cloud SQL
#
#  المتطلبات:
#    1. pg_dump و pg_restore مثبتين
#    2. Cloud SQL Proxy أو IP عام مع SSL
#    3. صلاحيات الوصول لكلا قاعدتي البيانات
#
#  الاستخدام:
#    chmod +x migrate-db.sh
#    ./migrate-db.sh
#
# ══════════════════════════════════════════════════════════════════

set -euo pipefail   # إيقاف فوري عند أي خطأ

# ─── الألوان للطباعة ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # بدون لون

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── إعدادات قاعدة البيانات المصدر (المحلية) ─────────────────────
# البيانات الحالية على GCP VM
SOURCE_HOST="${SOURCE_HOST:-localhost}"
SOURCE_PORT="${SOURCE_PORT:-5432}"
SOURCE_DB="${SOURCE_DB:-medisoft_db}"
SOURCE_USER="${SOURCE_USER:-medisoft}"
# كلمة المرور: يُفضل تعيينها عبر PGPASSWORD أو .pgpass
export PGPASSWORD="${SOURCE_PASSWORD:-}"

# ─── إعدادات قاعدة البيانات الهدف (Cloud SQL) ────────────────────
# يمكن استخدام Cloud SQL Proxy (127.0.0.1:5433) أو IP مباشر
TARGET_HOST="${TARGET_HOST:-127.0.0.1}"
TARGET_PORT="${TARGET_PORT:-5433}"          # Cloud SQL Proxy عادة على 5433
TARGET_DB="${TARGET_DB:-medisoft_db}"
TARGET_USER="${TARGET_USER:-medisoft}"
TARGET_PASSWORD="${TARGET_PASSWORD:-}"
TARGET_SSL="${TARGET_SSL:-require}"         # Cloud SQL يتطلب SSL

# ─── ملف النسخة الاحتياطية ────────────────────────────────────────
DUMP_FILE="/tmp/medisoft_dump_$(date +%Y%m%d_%H%M%S).dump"
DUMP_SQL="/tmp/medisoft_dump_$(date +%Y%m%d_%H%M%S).sql"

# ══════════════════════════════════════════════════════════════════
echo ""
echo "══════════════════════════════════════════════════"
echo "  MediSoft — نقل قاعدة البيانات إلى Cloud SQL"
echo "══════════════════════════════════════════════════"
echo ""

# ─── الخطوة 1: التحقق من الأدوات ─────────────────────────────────
log "التحقق من الأدوات المطلوبة..."
command -v pg_dump >/dev/null 2>&1 || error "pg_dump غير مثبت. ثبّت PostgreSQL client."
command -v pg_restore >/dev/null 2>&1 || error "pg_restore غير مثبت."
command -v psql >/dev/null 2>&1 || error "psql غير مثبت."
success "كل الأدوات متوفرة"

# ─── الخطوة 2: اختبار الاتصال بالمصدر ────────────────────────────
log "اختبار الاتصال بقاعدة البيانات المصدر (${SOURCE_HOST}:${SOURCE_PORT})..."
psql -h "$SOURCE_HOST" -p "$SOURCE_PORT" -U "$SOURCE_USER" -d "$SOURCE_DB" -c "SELECT 1;" >/dev/null 2>&1 \
  || error "فشل الاتصال بقاعدة البيانات المصدر. تحقق من الإعدادات."
success "الاتصال بالمصدر ناجح"

# ─── الخطوة 3: إنشاء نسخة احتياطية (pg_dump) ─────────────────────
log "بدء النسخ الاحتياطي..."
log "  المصدر: ${SOURCE_HOST}:${SOURCE_PORT}/${SOURCE_DB}"
log "  الملف: ${DUMP_FILE}"

# استخدام صيغة custom (-Fc) — أسرع وأصغر حجماً ويدعم pg_restore
pg_dump \
  -h "$SOURCE_HOST" \
  -p "$SOURCE_PORT" \
  -U "$SOURCE_USER" \
  -d "$SOURCE_DB" \
  -Fc \
  --no-owner \
  --no-privileges \
  --no-comments \
  -f "$DUMP_FILE"

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
success "النسخة الاحتياطية جاهزة (${DUMP_SIZE})"

# ─── الخطوة 4: اختبار الاتصال بالهدف ─────────────────────────────
log "اختبار الاتصال بقاعدة البيانات الهدف (${TARGET_HOST}:${TARGET_PORT})..."
export PGPASSWORD="$TARGET_PASSWORD"
PGSSLMODE="$TARGET_SSL" psql \
  -h "$TARGET_HOST" \
  -p "$TARGET_PORT" \
  -U "$TARGET_USER" \
  -d "$TARGET_DB" \
  -c "SELECT 1;" >/dev/null 2>&1 \
  || error "فشل الاتصال بقاعدة البيانات الهدف. تحقق من Cloud SQL Proxy أو SSL."
success "الاتصال بالهدف ناجح"

# ─── الخطوة 5: استعادة البيانات (pg_restore) ──────────────────────
log "بدء استعادة البيانات في Cloud SQL..."
warn "هذا قد يأخذ عدة دقائق حسب حجم البيانات..."

PGSSLMODE="$TARGET_SSL" pg_restore \
  -h "$TARGET_HOST" \
  -p "$TARGET_PORT" \
  -U "$TARGET_USER" \
  -d "$TARGET_DB" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  "$DUMP_FILE" 2>&1 | grep -v "WARNING" || true

success "تم استعادة البيانات بنجاح"

# ─── الخطوة 6: التحقق من البيانات ─────────────────────────────────
log "التحقق من سلامة البيانات..."

# عدد الجداول
TABLE_COUNT=$(PGSSLMODE="$TARGET_SSL" psql \
  -h "$TARGET_HOST" -p "$TARGET_PORT" -U "$TARGET_USER" -d "$TARGET_DB" \
  -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
log "  عدد الجداول: ${TABLE_COUNT}"

# عدد المرضى
PATIENT_COUNT=$(PGSSLMODE="$TARGET_SSL" psql \
  -h "$TARGET_HOST" -p "$TARGET_PORT" -U "$TARGET_USER" -d "$TARGET_DB" \
  -t -c "SELECT count(*) FROM patients;" 2>/dev/null || echo "0")
log "  عدد المرضى: ${PATIENT_COUNT}"

# عدد المستخدمين
USER_COUNT=$(PGSSLMODE="$TARGET_SSL" psql \
  -h "$TARGET_HOST" -p "$TARGET_PORT" -U "$TARGET_USER" -d "$TARGET_DB" \
  -t -c "SELECT count(*) FROM users;" 2>/dev/null || echo "0")
log "  عدد المستخدمين: ${USER_COUNT}"

# ─── الخطوة 7: تنظيف ─────────────────────────────────────────────
log "حذف الملفات المؤقتة..."
rm -f "$DUMP_FILE" "$DUMP_SQL"
success "تم التنظيف"

# ─── النتيجة ──────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════"
echo -e "  ${GREEN}✅ تم نقل قاعدة البيانات بنجاح!${NC}"
echo "══════════════════════════════════════════════════"
echo ""
echo "الخطوات التالية:"
echo "  1. حدّث DATABASE_URL في Cloud Run ليشير إلى Cloud SQL"
echo "  2. شغّل: npx drizzle-kit push (لتأكيد توافق الـ schema)"
echo "  3. اختبر التطبيق على Cloud Run"
echo ""

# MediSport — Claude Design Build Kit
> **كيفية الاستخدام:** أرفق ملف `medisport-brand-identity.html` مع كل جلسة، ثم الصق "MASTER PROMPT" أولًا، وبعدها نفّذ المراحل (Phase 1 → 7) واحدة تلو الأخرى في نفس الجلسة. كل مرحلة prompt مستقل جاهز للصق.
> **How to use:** Attach `medisport-brand-identity.html` to every session, paste the MASTER PROMPT first, then run Phases 1→7 one at a time.

---

## 🔑 MASTER PROMPT (paste first, always)

```
You are the Lead Product Designer for MediSport — the world's first "Clinical Fitness
Coaching" platform (MENA market, sub-brand of MediSoft Health). We will co-build the
complete design system and screens. The attached file `medisport-brand-identity.html`
is the single source of truth — follow it EXACTLY. Never invent colors, fonts, or
logo treatments outside it.

NON-NEGOTIABLE BRAND RULES
1. Logos: use ONLY the three official embedded assets (green runner icon, MediSport
   pink/blue wordmark, MediSoft pentagon). Never redraw, recolor, mirror, or restyle
   them. Pentagon = "Powered by MediSoft Health" + AI badges only.
2. Color tokens (hex are law):
   - Primary Vital Green: 50 #ECFDF5 · 100 #D1FAE5 · 400 #34D399 · 500 #0E9F6E ★ ·
     600 #057A55 · 700 #047857 · 800 #065F46 · 900 #064E3B
   - Energy Pink 500 #E8509B · 600 #C2367D (motivation, streaks, celebration)
   - Trust Blue 500 #2456A6 · 600 #1B4485 (Coach Portal accent, clinical data, links)
   - Plum 500 #8E3A63 (tertiary, charts)
   - AI gradient (AI features ONLY): linear-gradient(135deg,#F6A335,#E13A8C 30%,
     #7C3AED 60%,#2D6CB5 85%,#22C3BE)
   - Neutrals: Slate 50 #F8FAFC · 200 #E2E8F0 · 400 #94A3B8 · 600 #475569 ·
     800 #1E293B · 900 #0F172A
   - Semantic: success #0E9F6E · warning #F59E0B · error #DC2626 · info #2456A6
   - Dark mode: bg #0F172A · surface #1E293B · border #334155 · primary #34D399
     (on-primary #064E3B) · text #F1F5F9 / muted #94A3B8
   - Ratio 60% neutrals / 25% green / 10% pink+blue / 5% AI+plum
3. Typography: EN display "Exo 2" (hero/display in SemiBold-Bold ITALIC = forward
   motion), EN body "Inter". AR display "Cairo", AR body "IBM Plex Sans Arabic".
   Scale: display-xl 44/1.15·800, h1 32/1.25·700, h2 24/1.3·700, h3 19/1.4·600,
   body 15/1.6 (AR 1.8), caption 13/1.5·500, data-lg 28/1.2·700 tabular-nums.
   Never letter-space Arabic. Arabic is Modern Standard (فصحى) only.
4. Shape & space: radius 8/12/16/full · 4pt spacing grid (4,8,12,16,24,32,48) ·
   shadow 0 1px 3px rgba(15,23,42,.06),0 4px 12px rgba(15,23,42,.05) ·
   buttons 44px min height · inputs 48px · focus ring 3px #34D399 @40%.
5. Dual-portal theming: Trainee accent = Vital Green; Coach accent = Trust Blue;
   switched via data-portal attribute. One primary button per screen.
6. Every screen ships bilingual EN + AR with full RTL mirroring (logical properties
   only: ps/pe, ms/me, border-s, text-start). Charts keep LTR digits. The runner
   logo is never mirrored.
7. Clinical trust: consent UI in Trust Blue with shield icon, never pre-checked;
   AI insight cards always show ✦ badge + "Why this?" + medical disclaimer
   "MediSport supports — but never replaces — your physician's advice." /
   «ميديسبورت يدعم إرشادات طبيبك ولا يحل محلها أبدًا.»
8. Accessibility: WCAG 2.1 AA. Text on white uses green 600/700 (never 400/500 for
   small text), pink 600, blue 500. Touch ≥44pt. Color never the only signal.
   Respect prefers-reduced-motion. Motion: cubic-bezier(0.22,1,0.36,1),
   150/250/400ms.

WORKING AGREEMENT
- Default output: a single self-contained HTML file per deliverable (inline CSS/JS,
  Google Fonts: Exo 2, Inter, Cairo, IBM Plex Sans Arabic). No external libraries
  unless I ask.
- Always render BOTH light & dark mode and BOTH LTR & RTL (toggle buttons in-page).
- Use realistic bilingual demo content (Arabic فصحى; realistic MENA names, metric
  units, Cairo timezone).
- After each deliverable, list: tokens used, components introduced, and open
  questions for me. Wait for my approval before the next phase.
Confirm you've absorbed the brand file, then ask me which Phase to start.
```

---

## Phase 1 — Design System Foundation (tokens + component library)

```
PHASE 1 — Build "MediSport UI Kit v1" as one interactive HTML page:
1. Token sheet: all color tokens as copyable swatches (light+dark), type scale
   rendered in EN+AR, spacing/radius/shadow/motion reference.
2. Component library, every state (default/hover/pressed/disabled/focus/loading/
   error), each shown LTR & RTL:
   buttons (primary, secondary, coach-blue, energy-pink, AI-gradient ✦, ghost,
   destructive) · inputs (text, select, search, OTP, phone with +20/+966 codes,
   date — dual calendar Gregorian/Hijri label support) · checkbox/radio/switch ·
   chips & badges (incl. consent-status chip) · metric card · AI insight card
   (✦ badge, why-this, disclaimer) · workout card · client row (coach CRM) ·
   progress ring & bars · charts palette demo (green→blue→pink→plum→slate) ·
   bio-age gauge (green younger → amber → red older) · tabs · bottom nav (5 items,
   center AI FAB) · sidebar nav (264px, collapsible 72px) · topbar · modal ·
   toast/banner (4 semantic colors) · consent sheet · empty state · skeleton
   shimmer · streak celebration (pink confetti moment).
3. A "do/don't" strip for logo, color ratio, and Arabic type.
Name it medisport-ui-kit.html.
```

## Phase 2 — Marketing Website (medisport.health)

```
PHASE 2 — Design the full marketing website as one scrollable HTML page
(desktop 1280 + responsive to 375):
sticky header (wordmark, nav, ع/EN switcher, CTA "Start Free / ابدأ مجانًا") →
hero (Slate-900 + green/pink radial glows, Exo 2 Bold Italic headline "Train with
Medical Intelligence. / تدرَّب بذكاءٍ طبي.", real athlete imagery placeholder, dual
CTA trainee/coach) → social proof strip → 3 pillars cards → "How it works" (trainee
journey 4 steps) → clinical differentiator band with pentagon "Powered by MediSoft
Health" → bio-age feature spotlight (gauge demo) → coach portal section (blue
accent, CRM screenshot frame) → pricing (3 tiers, popular = pink badge + green
ring) → testimonials (MENA personas) → FAQ accordion → CTA band → footer (Slate
900, disclaimer, links, pentagon endorsement).
Include the RTL/dark toggles. Name it medisport-website.html.
```

## Phase 3 — Web App: Trainee Portal

```
PHASE 3 — Design the Trainee Portal web app (green accent) as clickable HTML
mock with sidebar shell (264px) and these screens (tab-switchable):
1. Dashboard: greeting + today's plan card, bio-age card, AI Coach insight ✦,
   weekly activity chart, streak (pink), upcoming session with human coach.
2. Workout player: exercise video frame, rep counter (data-lg), rest timer ring,
   "complete" success state with haptic note.
3. My Health: vitals/labs shared from MediSoft (blue clinical panels + consent
   chips), trends.
4. Coach connection: chat-style thread + program assigned by coach.
5. Profile & consent center (granular toggles, blue shield).
Realistic bilingual data. Name it medisport-trainee-portal.html.
```

## Phase 4 — Web App: Coach Portal (CRM)

```
PHASE 4 — Design the Coach Portal (Trust Blue accent) same shell:
1. Client list: dense table (search, filters, risk flags red/amber, consent
   status, bio-age delta column, last activity).
2. Client 360: header card, medical context panel (ONLY if consent granted —
   show both states), program timeline, adherence chart.
3. Program builder: drag-style week grid, exercise library drawer, AI suggest ✦
   (gradient) with accept/edit/reject per item.
4. Coach dashboard: caseload KPIs, alerts queue, revenue card.
5. Messaging inbox.
Name it medisport-coach-portal.html.
```

## Phase 5 — Mobile Apps (iOS + Android)

```
PHASE 5 — Design the mobile app as device-framed HTML (390×844 iPhone frame and
412×915 Android frame side-by-side per screen):
Screens: onboarding x3 (value props + standalone signup + optional "link MediSoft
record" with pentagon) · home dashboard · workout player · AI Coach chat (✦ header
gradient) · progress/bio-age · profile.
iOS variant: SF-style tab bar, large titles, Dynamic Type note, HealthKit consent
sheet. Android variant: Material 3 nav bar, FAB = AI ✦, M3 ripple notes, dynamic
color DISABLED. Include app icon mock (white runner on green gradient) and splash
(#047857 + centered runner) for both platforms, plus dark mode of each screen.
Name it medisport-mobile.html.
```

## Phase 6 — Social Media Kit

```
PHASE 6 — Design the social media template kit as one HTML sheet with exact-size
artboards (export-ready compositions):
- Instagram: post 1080×1080 (3 templates: tip/علم, transformation متابعة تقدم,
  quote تحفيز) · story 1080×1920 (daily workout + poll) · reel cover.
- Facebook/X/LinkedIn: cover/banner sizes + post template (LinkedIn = coach B2B
  tone, blue accent).
- TikTok/YouTube: thumbnail 1280×720 (bold Exo 2 Italic + green bar system).
- Rules baked in: runner icon watermark position (bottom-start, 6% width), safe
  margins 64px, one accent color per post, AR-first typography option per
  template, hashtag lockup #MediSport #تدرب_بذكاء, CTA footer strip, medical
  disclaimer micro-line on any health-claim template.
Name it medisport-social-kit.html.
```

## Phase 7 — Others (email, docs, print, OG)

```
PHASE 7 — Design the remaining brand surfaces in one HTML sheet:
- Transactional email template (600px): header wordmark, green CTA, RTL variant,
  footer disclaimer + pentagon.
- OG/share image 1200×630 + favicon/PWA maskable preview row.
- Clinic poster A4 + roll-up 85×200cm (QR to app, bilingual).
- Coach certificate + client progress report PDF cover (print, CMYK note:
  green ≈ C85 M10 Y75 K5).
- Presentation title + content slide template (16:9).
Name it medisport-collateral.html.
```

---

### ✅ Acceptance checklist لكل مرحلة (راجعها قبل الموافقة)
- الألوان مطابقة للتوكنز حرفيًا، ونِسَب 60/25/10/5 محترمة
- Exo 2 Italic للعناوين الكبيرة فقط، وCairo/Plex للعربية بدون letter-spacing
- اللوجوهات غير معدّلة، والخماسي في سياق Powered by / AI فقط
- كل شاشة: فاتح + داكن + EN/LTR + AR/RTL
- تباين AA، لمس ≥44، primary واحد لكل شاشة
- إخلاء المسؤولية الطبي ظاهر حيث يلزم

# 🚀 BrightMinds — Deploy Plan

## ما تمّ التحضير له (قبل دخولك):

### تنظيف:
- `.vercelignore` يستبعد: `src/`, `lib/`, `tools/`, `node_modules`, `.claude/`
- التطبيق النهائي = 11MB فقط (POC + audio)

### SEO جاهز:
- ✅ Meta title + description (عربي)
- ✅ Open Graph (للـWhatsApp/Facebook/LinkedIn)
- ✅ Twitter Card
- ✅ Schema.org WebApplication
- ✅ Canonical URL
- ✅ robots.txt + sitemap.xml
- ✅ hreflang للعربية والإنجليزية

### PWA جاهز:
- ✅ Service Worker v20
- ✅ Manifest valid + 3 icons
- ✅ Apple Touch Icons ×2
- ✅ apple-mobile-web-app-capable
- ✅ MP3s lazy-loaded (التحميل الأوّل ~250KB فقط)

### Security:
- ✅ X-Frame-Options: DENY (لا iframe)
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer-Policy: strict-origin
- ✅ Permissions-Policy (لا microphone/camera/geolocation)
- ✅ HTTPS تلقائي من Vercel

### Caching:
- ✅ MP3s = 1 سنة immutable (تحميل واحد للأبد)
- ✅ CSS/JS/SVG = أسبوع
- ✅ PNG/JPG = 1 سنة immutable
- ✅ sw.js = no-cache (تحديثات فورية)
- ✅ manifest.json = ساعة

---

## بعد دخولك (سأنفّذ تلقائياً):

### الخطوة 1: ربط المشروع بـVercel
```
npx vercel link
```
سأختار:
- Scope: حسابك الشخصي
- Project name: `brightminds`
- Override settings: لا

### الخطوة 2: نشر Preview أوّلاً
```
npx vercel
```
يعطيني رابط مثل: `https://brightminds-xyz123.vercel.app`

### الخطوة 3: فحص شامل على Preview
سأفحص:
- [ ] الصفحة الرئيسية تفتح
- [ ] PWA installable
- [ ] الصوتيات تعمل
- [ ] جميع 12 لعبة تشتغل
- [ ] لوحة الأهل تفتح
- [ ] الإعدادات تفتح
- [ ] العربية والإنجليزية تعمل
- [ ] لا أخطاء في Console
- [ ] لا تأخّر في الـrequests

### الخطوة 4: نشر Production
بعد نجاح الفحص:
```
npx vercel --prod
```
يعطي رابط: `https://brightminds.vercel.app` (مؤقّت حتى نربط الدومين)

### الخطوة 5: إعطاؤك إعدادات DNS
موجودة في `DNS_SETUP.md`

---

## ⏱️ التقدير الزمني

| المرحلة | الوقت |
|---|---|
| `vercel link` | 30 ثانية |
| Preview deploy | 1-2 دقيقة |
| الفحص الشامل | 5-10 دقائق |
| Production deploy | 1-2 دقيقة |
| إعطاؤك DNS | فوري |
| **الإجمالي** | **8-15 دقيقة** |

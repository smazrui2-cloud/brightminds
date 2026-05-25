# ✅ BrightMinds — Launch Checklist

## 🔍 الفحص قبل الإطلاق (افعل بنفسك على رابط Preview)

### 1. PWA Install
- [ ] في Chrome (Desktop): ظهور زر "Install" في شريط العنوان
- [ ] في Chrome (Android): ظهور بانر "Add to Home Screen"
- [ ] في Safari (iOS): Share menu → "Add to Home Screen" يعمل
- [ ] الأيقونة تظهر بشكل صحيح بعد التثبيت
- [ ] التطبيق يفتح standalone (بدون شريط متصفّح)

### 2. Offline Mode
- [ ] افتح التطبيق مرّة → اقطع الإنترنت → أعد فتحه → يجب أن يعمل
- [ ] الألعاب الأساسية تعمل بدون نت
- [ ] الصوتيات المحفوظة سابقاً تعمل أوفلاين
- [ ] لا تظهر رسالة خطأ مزعجة عند انقطاع النت

### 3. SEO
- [ ] `view-source:` على الصفحة → الـmeta tags ظاهرة
- [ ] https://brightminds.kids/robots.txt → يفتح
- [ ] https://brightminds.kids/sitemap.xml → يفتح
- [ ] شارك الرابط على WhatsApp → تظهر الصورة + الوصف بشكل صحيح
- [ ] أرسل لنفسك في Twitter → يظهر og:image

### 4. Mobile UX
- [ ] الـtap targets كبيرة بما يكفي (44×44px أدنى)
- [ ] لا حاجة للـzoom في أيّ مكان
- [ ] الأزرار سهلة الوصول بإبهام واحد
- [ ] RTL يعمل في العربية، LTR في الإنجليزية
- [ ] التحويل بين اللغات سريع

### 5. Touch Responsiveness
- [ ] الـtaps تستجيب فوراً (لا تأخير)
- [ ] لا توجد double-tap zoom حوادث
- [ ] الـdrag يعمل بسلاسة (المتاهة، البازل)
- [ ] لا scroll ينقطع عند اللمس

### 6. Audio Latency
- [ ] الصوت يبدأ خلال 200ms من الضغط
- [ ] لا تأخير ملحوظ في النطق
- [ ] أصوات SFX (نقر، نجاح) فورية
- [ ] الموسيقى لا تتقطّع

### 7. Security Headers
- [ ] افتح https://securityheaders.com/?q=brightminds.kids → درجة B أو أعلى
- [ ] HTTPS يعمل (قفل أخضر)
- [ ] لا mixed content warnings

### 8. Analytics
- [ ] افتح الصفحة في incognito
- [ ] افتح Umami Dashboard → يظهر zaira ال visit
- [ ] لا cookies من Google/Facebook (تحقّق في DevTools → Application → Cookies)

### 9. Performance
- [ ] Lighthouse Mobile Score (Chrome DevTools → Lighthouse):
  - [ ] Performance: 80+
  - [ ] PWA: 90+
  - [ ] Accessibility: 85+
  - [ ] Best Practices: 85+
  - [ ] SEO: 90+
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s على 3G
- [ ] حجم التحميل الأوّل < 1MB

---

## 🧪 اختبار الأجهزة (مهمّ جداً)

| الجهاز | المتصفّح | الأولوية |
|---|---|---|
| **iPhone 12+** | Safari | 🔴 حرجة |
| **iPad** | Safari | 🔴 حرجة |
| **Android Phone** | Chrome | 🔴 حرجة |
| **Samsung Galaxy** | Samsung Browser | 🟡 مهمّة |
| **Desktop** | Chrome | 🟡 مهمّة |
| **Desktop** | Firefox | 🟢 إضافية |
| **iPhone 6/7** (قديم) | Safari | 🟢 إضافية |

### كيفية الاختبار بدون أجهزة فعلية:

- **BrowserStack** (مدفوع، تجربة مجانية): https://browserstack.com
- **Chrome DevTools** → Device Toolbar → اختر iPhone/iPad
- **Lambdatest** (مجاني، محدود): https://lambdatest.com

---

## 🐛 الأخطاء الأكثر احتمالاً للأطفال + الأهل

### مشاكل iOS Safari الكلاسيكية:
1. **`100vh` يكسر الـlayout** → استخدم `100dvh` (موجود في `styles.css`)
2. **الـtap له delay 300ms** → استخدم `touch-action: manipulation` على الأزرار
3. **التطبيق يخرج من standalone عند نقر رابط خارجي** → معالج لتفادي
4. **الـSafari يبقى فقط localStorage 7 أيام إذا ITP** → قبول (لاحقاً نضيف cloud sync)
5. **الـAudio لا يعمل قبل تفاعل المستخدم** → نتعامل معه (Sound.init() عند أوّل tap)

### مشاكل Android Chrome:
1. **Install prompt لا يظهر تلقائياً** → نوفر زر "📲 ثبّت التطبيق" يدوي
2. **Cache قديم يبقى** → CACHE_VERSION bump كل deploy

### مشاكل عامة:
1. **الأطفال يضغطون بسرعة جداً** → debounce على الأزرار الحسّاسة
2. **الأهل يحذفون localStorage بالخطأ** → سنضيف PIN في v1.1
3. **شبكة 3G/شبكة سيّئة** → SW يحلّ هذا (cache-first)

---

## 🚀 يوم الإطلاق

### الساعة 9 صباحاً:
- [ ] تحقّق نهائي: افتح `https://brightminds.kids` في الموبايل
- [ ] جرّب لعبتين كاملتين
- [ ] افتح لوحة الأهل
- [ ] ثبّت التطبيق على شاشة الموبايل

### الساعة 10 صباحاً:
- [ ] منشور على WhatsApp (مع 10 من أصدقائك)
- [ ] منشور على قناة YouTube الخاصة بـBrightMinds
- [ ] منشور على Twitter/X مع GIF قصير

### الساعة 12 ظهراً:
- [ ] راقب Umami → كم زائر؟
- [ ] راقب Vercel Analytics (مجاني) → أيّ صفحة الأكثر زيارة
- [ ] رد على أيّ تعليقات/أسئلة بسرعة

### الساعة 6 مساءً:
- [ ] جمع feedback من أوّل 10 مستخدمين
- [ ] لاحظ أيّ أخطاء يبلّغ عنها
- [ ] أصلح أيّ شيء حرج خلال الليل

### اليوم التالي:
- [ ] Product Hunt (إذا أردت)
- [ ] Reddit (r/InternetIsBeautiful)
- [ ] فيديو TikTok قصير

---

## ⏸️ مؤجّل لما بعد الإطلاق (لا تشغل بالك الآن!)

- 🔒 PIN للأهل
- 💳 Stripe Premium
- 📱 تطبيق Native iOS/Android (Capacitor)
- 📊 تقارير أهل أسبوعية بالبريد
- 🎯 تحديات يومية
- 🎵 موسيقى خلفية إضافية
- 🌍 لغات إضافية (فرنسي، تركي)
- 👥 نظام عائلة متعدّد الأطفال
- 🔄 مزامنة سحابية

**القاعدة الذهبية**: لو ميزة لا تساعد في "اكتساب أوّل 100 مستخدم" → أجّلها.

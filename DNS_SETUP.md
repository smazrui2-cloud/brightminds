# 🌐 إعدادات DNS لـ brightminds.kids

## بعد شراء الدومين، أضف هذه السجلّات في لوحة تحكّم مزوّد الدومين

### إذا اشتريت من **Namecheap** أو **GoDaddy** أو **Porkbun**:

| Type    | Host / Name | Value / Points to              | TTL  |
|---------|-------------|-------------------------------|------|
| `A`     | `@`         | `76.76.21.21`                 | Auto |
| `CNAME` | `www`       | `cname.vercel-dns.com`        | Auto |

### بعد إضافة السجلّات، في Vercel Dashboard:

1. افتح المشروع `brightminds`
2. **Settings** → **Domains**
3. أضف الدومينات:
   - `brightminds.kids`
   - `www.brightminds.kids`
4. Vercel سيتحقّق تلقائياً (يأخذ 10 دقائق إلى ساعتين)
5. HTTPS يُفعَّل تلقائياً (Let's Encrypt)

### ⚠️ ملاحظات مهمّة:

- **لا تحذف** أيّ سجلّات MX (للبريد) — هذه السجلّات للويب فقط
- إذا كان عندك سجلّات `A` قديمة لـ `@` → احذفها أو استبدلها
- إذا أردت بريد `@brightminds.kids` لاحقاً، استخدم Cloudflare Email Routing (مجاني)

### 🔍 للتحقّق من انتشار DNS:

```bash
# في PowerShell أو Terminal
nslookup brightminds.kids
# يجب أن يُرجع: 76.76.21.21

# أو على الويب:
https://dnschecker.org/?query=brightminds.kids
```

---

## ⏱️ الوقت المتوقّع

| المرحلة | الوقت |
|---|---|
| إضافة السجلّات في لوحة المزوّد | 5 دقائق |
| انتشار DNS عالمياً | 10 دقائق – 2 ساعة (نادراً 24 ساعة) |
| Vercel يصدر شهادة HTTPS | 5–10 دقائق بعد التحقّق |
| **الإجمالي** | **15 دقيقة – 2.5 ساعة** |

---

## 🛒 إذا لم تشترِ الدومين بعد، أوصي بـ:

| المزوّد | السعر السنوي لـ`.kids` | لماذا |
|---|---|---|
| **Porkbun** | ~$13 | الأرخص + WHOIS Privacy مجاناً + DNSSEC مجاناً |
| **Namecheap** | ~$15 | الأشهر + WHOIS Privacy مجاناً |
| **Cloudflare Registrar** | ~$11 (سعر التكلفة) | الأرخص حقاً لكن تحتاج نقل DNS لـCloudflare |

**توصيتي**: Porkbun (الأرخص + الأسهل).

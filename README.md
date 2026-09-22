# Bug Bounty Radar — رادار كتابات الـ Bug Bounty

موقع تجميعي (aggregator) لكتابات الـ bug bounty writeups من عدة مصادر، بيتحدّث تلقائيًا كل كذا ساعة،
بيستخرج العنوان والمحتوى الحقيقي لكل رابط بـ [Jina AI Reader](https://jina.ai/reader/)، وبيصنّف كل
writeup (نوع الثغرة، المنصة، درجة الخطورة، ملخص عربي/إنجليزي) عن طريق طبقة AI قابلة للاستبدال —
شغّالة مجانًا بالكامل (تدهور تدريجي لتصنيف heuristic لو معندكش مفتاح API).

> **ملاحظة عن اسم الريبو:** اتولد الريبو ده من placeholder فاضي كان موجود في حسابك (إنشاء ريبو
> جديد بالكامل بالـ API بيرجع 403 — صلاحية على مستوى الـ GitHub App نفسها). غيّر الاسم من
> Settings → Repository name وقتما تحب، الـ workflows بتحسب رابط GitHub Pages ديناميكيًا من
> اسم الريبو فمش هتحتاج تعدّل حاجة تانية.

## البنية

```
app/                 Next.js App Router (static export) — كل الصفحات
components/          مكوّنات React مشتركة
lib/                 قراءة الـ data وقت الـ build + helpers
scripts/             pipeline التجميع (Node, يشتغل بره Next)
  sources.json       تعريف المصادر (structured + RSS)
  fetchWriteups.mjs  الـ orchestrator: يجيب → يفلتر → يستخرج → يصنّف → يرتب → يكتب
  lib/sources/       fetchers (Pentester Land JSON, RSS عام)
  lib/relevance.mjs   بوابة "bug bounty بس" — بترفض الضوضاء قبل وبعد الاستخراج
  lib/extractContent.mjs   Jina Reader (عنوان دقيق + محتوى نظيف)
  lib/ai.mjs          طبقة التصنيف/التلخيص القابلة للاستبدال
  lib/score.mjs        معادلة ترتيب "الأكثر تأثيرًا"
data/
  writeups.json       قاعدة البيانات الفعلية (array)، بيتحدّث تلقائيًا ويتعمله commit
  meta.json            إحصائيات آخر تشغيلة
taxonomy.json          التصنيفات والمنصات (مصدر واحد يستخدمه الـ pipeline والموقع)
```

الموقع static بالكامل (`next export`) — مفيش سيرفر أو قاعدة بيانات وقت التشغيل، كل حاجة بتتبني وقت
الـ build من ملفات JSON في الريبو، وده اللي بيخليه مجاني 100% على GitHub Pages.

## المصادر الحالية

الموقع **مخصص للـ bug bounty writeups بس** — مش أخبار أمن سيبراني عامة، ومش CTF/lab writeups، ومش
CVE advisories مالهاش علاقة ببرنامج bounty. الفلترة بتحصل على مرحلتين:

1. **مصادر مفعّلة فقط** (`scripts/sources.json`، `enabled: true`):

   | المصدر | النوع | ملاحظات |
   |---|---|---|
   | [Pentester Land](https://pentester.land) | JSON منظم، **موثوق 100%** | ده أصلاً موقع مخصص لتجميع bug bounty writeups بس — مفيش فلترة زيادة، فيه tags/program/bounty جاهزين |
   | [InfoSec Write-ups](https://infosecwriteups.com) | RSS | تجميعة Medium — بتنشر CTF وتوتوريالز كمان، فبتعدي على فلتر الـ relevance |
   | [Intigriti Blog](https://blog.intigriti.com) | RSS | بتنشر مقابلات وأخبار بيزنس كمان — نفس الفلتر |
   | [r/netsec](https://reddit.com/r/netsec) | RSS | فلترة بكلمات مفتاحية الأول، وبعدين فلتر الـ relevance. Reddit بيحجب أحيانًا طلبات من سيرفرات (403)، الـ pipeline بيتخطاها من غير ما يفشل |

   مصادر موجودة في الملف لكن **متقفلة عمدًا** (`enabled: false`) لأنها مش writeups بمعنى bug bounty
   (أبحاث أمنية مستقلة / CVE advisories من غير سياق بونتي — كانت مصدر أغلب الـ "ضوضاء" في أول نسخة):
   Zero Day Initiative، RCE Security، PortSwigger Research. سيبهم كده لو عاوز محتوى أوسع، أو فعّلهم
   (`enabled: true`) لو غيّرت رأيك.

2. **فلتر relevance** (`scripts/lib/relevance.mjs`) — بيشتغل على العنوان + مقتطف من RSS **قبل**
   ما نصرف Jina/AI على الرابط أصلاً: بيرفض كلمات زي "interview"، "hacker spotlight"، "bug bytes"،
   "hiring"، "business insights"، "tryhackme"، "hackthebox"، ولازم يلاقي إشارة إيجابية (اسم منصة
   bounty، مبلغ $، "responsible disclosure"، اسم نوع ثغرة...). ولو عندك مفتاح AI مفعّل، فيه بوابة
   تانية دلالية بعد الاستخراج (`is_bug_bounty` في `scripts/lib/ai.mjs`) بترفض أي حاجة لسه ضوضاء حتى
   لو عدّت الفلتر الأول — إلا لو المصدر موثوق (Pentester Land).

ضيف مصدر RSS جديد بسهولة في `scripts/sources.json`، أو مصدر structured جديد بعمل fetcher زي
`scripts/lib/sources/pentesterland.mjs`.

## طبقة الذكاء الاصطناعي (مجانية بالكامل)

`scripts/lib/ai.mjs` بيختار provider تلقائيًا حسب أول secret متاح:

1. `GEMINI_API_KEY` — Google AI Studio، `gemini-2.0-flash`، free tier سخي جدًا (**موصى بيه**)
2. `GROQ_API_KEY` — Groq، `llama-3.1-8b-instant`، مجاني وسريع
3. `OPENROUTER_API_KEY` — OpenRouter، موديل `:free`
4. من غير أي مفتاح → **heuristic fallback**: تصنيف بالكلمات المفتاحية + severity من قيمة المكافأة،
   من غير ملخص عربي حقيقي (بس الموقع بيوضّح ده في كل بطاقة).

احصل على مفتاح Gemini مجاني من https://aistudio.google.com/apikey (دقيقتين، من غير بطاقة ائتمان)،
وضيفه كـ **Repository secret** باسم `GEMINI_API_KEY`. الـ pipeline هيستخدمه تلقائيًا من غير أي تعديل كود.

اختياري: `JINA_API_KEY` من https://jina.ai/reader لرفع حد الطلبات لو المصادر كتيرة.

## الترتيب ("تريند" / "الأكثر تأثيرًا")

مفيش API حقيقي لقياس الانتشار الاجتماعي بالمجان، فبدل ما ندّعي رقم وهمي، الموقع شفّاف عن المعادلة
(موجودة في فوتر كل صفحة) — `scripts/lib/score.mjs`:

```
score = recency(نصف عمر 6 أيام) + log(قيمة المكافأة) + وزن severity + engagement (لو متاح)
```

## التشغيل محليًا

```bash
npm install
npm run fetch      # يجيب بيانات حقيقية دلوقتي (data/writeups.json)
npm run dev         # http://localhost:3000
npm run build       # static export → out/
```

## الأتمتة (GitHub Actions)

- **`.github/workflows/writeups-fetch.yml`** — كل 6 ساعات (وباليدوي)، بيشغّل الـ pipeline ويعمل
  commit للـ data تلقائيًا.
- **`.github/workflows/writeups-deploy.yml`** — أي push على main (بما فيه الـ data commit
  اللي فوق) بيبني الموقع وينشره على GitHub Pages تلقائيًا.

### تفعيل GitHub Pages (مرة واحدة)

Settings → Pages → Source: **GitHub Actions**. بعدها كل push على main هينشر تلقائي.

### الـ secrets المطلوبة (كلها اختيارية، الموقع شغّال من غيرها)

Settings → Secrets and variables → Actions:

- `GEMINI_API_KEY` (موصى بيه)
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `JINA_API_KEY`

## حقوق النشر

الموقع **مش بينسخ** محتوى الكتابات الأصلية — كل بطاقة بتعرض عنوان دقيق + ملخص AI قصير + تصنيفات،
وبعدين بتحيلك برابط مباشر للمصدر الأصلي. ده احترامًا لحقوق كتّاب الـ writeups وعشان الموقع يفضل
مصدر تقدير وتوجيه مش بديل عن قراءة الأصل.

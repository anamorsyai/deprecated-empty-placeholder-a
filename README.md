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
components/          مكوّنات React مشتركة (InfiniteFeed = client-side infinite scroll)
lib/                 قراءة الـ data وقت الـ build + helpers
scripts/             pipeline التجميع (Node, يشتغل بره Next)
  sources.json       تعريف المصادر (structured + RSS)
  fetchWriteups.mjs  الـ orchestrator: يجيب → يفلتر → يستخرج → يصنّف → يرتب → يكتب
  lib/sources/       fetchers (Pentester Land JSON, RSS عام)
  lib/relevance.mjs   بوابة "bug bounty بس" — بترفض الضوضاء قبل وبعد الاستخراج
  lib/extractContent.mjs   Jina Reader (عنوان دقيق + محتوى نظيف)
  lib/ai.mjs          طبقة التصنيف/التلخيص/الشرح القابلة للاستبدال
  lib/score.mjs        معادلة ترتيب "الأكثر تأثيرًا"
  buildStaticExtras.mjs   بيولّد public/rss.xml + search-index.json + feed.json
data/
  writeups.json       الأرشيف الكامل (array) — **دائم، محدش بيتشال منه أبدًا**، بيتعمله commit أوتوماتيك
  by-category/        نفس الأرشيف مقسّم لملف لكل تصنيف (idor-bola.json, rce.json, ...) — سهل تتصفحه في GitHub نفسه
  meta.json            إحصائيات آخر تشغيلة
taxonomy.json          التصنيفات والمنصات (مصدر واحد يستخدمه الـ pipeline والموقع)
```

الموقع static بالكامل (`next export`) — مفيش سيرفر أو قاعدة بيانات وقت التشغيل، كل حاجة بتتبني وقت
الـ build من ملفات JSON في الريبو، وده اللي بيخليه مجاني 100% على GitHub Pages. الـ "infinite scroll"
بردو client-side بحت: `public/feed.json` بيتولّد وقت الـ build وفيه كل الـ writeups (من غير نص الشرح
الكامل، عشان الحجم)، والصفحة بتحمّل صفحة أولى وقت الـ build وبعدين تكمل تحميل من نفس الملف كل ما تنزل
لتحت (IntersectionObserver) — مفيش أي API calls وقت التصفح.

## المصادر الحالية

الموقع **مخصص للـ bug bounty writeups بس** — مش أخبار أمن سيبراني عامة، ومش CTF/lab writeups، ومش
CVE advisories مالهاش علاقة ببرنامج bounty. الفلترة بتحصل على مرحلتين:

1. **مصادر مفعّلة فقط** (`scripts/sources.json`، `enabled: true`):

   | المصدر | النوع | ملاحظات |
   |---|---|---|
   | [Pentester Land](https://pentester.land) | JSON منظم، **موثوق 100%** | ده أصلاً موقع مخصص لتجميع bug bounty writeups بس — مفيش فلترة زيادة، فيه tags/program/bounty جاهزين. أكبر مصدر تغطية لـ HackerOne/Bugcrowd/Intigriti/YesWeHack (بيجمّع مقالات الباحثين عنهم) |
   | [InfoSec Write-ups](https://infosecwriteups.com) | RSS | تجميعة Medium — بتنشر CTF وتوتوريالز كمان، فبتعدي على فلتر الـ relevance |
   | Medium — `#bug-bounty` / `#bugbounty` / `#bug-bounty-writeup` | RSS × 3 | تاجات Medium نفسها (مش تجميعة واحدة) — تغطية أوسع من أي publication واحدة |
   | [zseano](https://zseano.medium.com) | RSS | مدونة باحث bug bounty معروف |
   | [Assetnote](https://blog.assetnote.io) | RSS | فريق أبحاث بيلاقي ثغرات حقيقية في برامج bounty |
   | [zsec.uk](https://blog.zsec.uk) | RSS | مدونة متخصصة bug bounty |
   | [Intigriti Blog](https://blog.intigriti.com) | RSS | بتنشر مقابلات وأخبار بيزنس كمان — نفس الفلتر |
   | [r/netsec](https://reddit.com/r/netsec) | RSS | فلترة بكلمات مفتاحية الأول، وبعدين فلتر الـ relevance. Reddit بيحجب أحيانًا طلبات من سيرفرات (403)، الـ pipeline بيتخطاها من غير ما يفشل |

   **ليه مفيش HackerOne مباشر؟** الـ Hacktivity feed العام والـ RSS بتاعهم اتقفلوا من سنين — دلوقتي
   الموقع كله React/GraphQL خاص من غير أي endpoint عام موثّق. بناء scraper بيقلّد طلبات المتصفح على
   API خاص مش موثّق حاجة هشة هتتعطل أول ما يغيّروا حاجة، فمعملتهاش. تغطية HackerOne بتيجي عن طريق
   Pentester Land ومدوّنات الباحثين اللي بينشروا هناك — والموقع بيوسم أي writeup اتاكد إنه HackerOne
   في صفحة `/platform/hackerone` سواء جه من أي مصدر.

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

## طبقة الذكاء الاصطناعي (مجانية بالكامل) — وضع "المدرّس"

`scripts/lib/ai.mjs` بيختار provider تلقائيًا حسب أول secret متاح:

1. `CUSTOM_API_BASE` — أي موديل متوافق مع OpenAI API (شوف "موديل مخصص" تحت) — بياخد أولوية لو موجود، لإنه اختيار متعمّد
2. `GEMINI_API_KEY` — Google AI Studio، `gemini-2.0-flash`، free tier سخي جدًا (**موصى بيه لو معندكش موديل خاص**)
3. `GROQ_API_KEY` — Groq، `llama-3.1-8b-instant`، مجاني وسريع
4. `OPENROUTER_API_KEY` — OpenRouter، موديل `:free`
5. من غير أي حاجة من دول → **heuristic fallback**: تصنيف بالكلمات المفتاحية + severity من قيمة المكافأة،
   من غير شرح تفصيلي (بس الموقع بيوضّح ده في صفحة كل writeup).

تقدر تجبر provider معيّن بمتغيّر `AI_PROVIDER` (`gemini` | `groq` | `openrouter` | `custom` | `none`)
لو عندك أكتر من واحد متاح وعاوز تحدد أنهي واحد يستخدم.

لما يبقى فيه مفتاح، كل writeup بياخد غير الملخص السطرين، شرح تعليمي كامل بالعربي على صفحته الخاصة
(مش موجود على قائمة الكروت عشان الأداء) اتقسّم 4 أقسام:

- 🧬 **السبب الجذري** — الافتراض أو الخلل في التصميم اللي فتح الباب للثغرة
- 🛠️ **خطوة بخطوة: الاكتشاف والاستغلال** — من أول ملاحظة للباحث لحد الـ payload النهائي
- 🎯 **الدرس المستفاد** — إمتى تدور على نفس النمط في هدف تاني وإيه العلامات
- 🩹 **الإصلاح الصحيح** — التفاصيل التقنية لحل المشكلة صح

الـ prompt بيوضح للموديل إنه لو المحتوى المُستخرج مش كفاية يشرح بأمانة، يسيب القسم فاضي بدل ما يختلق
تفاصيل — يعني الشرح دايمًا مبني على محتوى الـ writeup الفعلي، مش تخمين.

احصل على مفتاح Gemini مجاني من https://aistudio.google.com/apikey (دقيقتين، من غير بطاقة ائتمان)،
وضيفه كـ **Repository secret** باسم `GEMINI_API_KEY`. الـ pipeline هيستخدمه تلقائيًا من غير أي تعديل كود،
وبعد أول تشغيلة تالية (كل ساعة، أو شغّلها يدويًا من تبويب Actions) هتلاقي كل الـ writeups الجديدة فيها
الشرح الكامل.

اختياري: `JINA_API_KEY` من https://jina.ai/reader لرفع حد الطلبات لو المصادر كتيرة.

### موديل مخصص (أي endpoint متوافق مع OpenAI)

عندك سيرفر خاص، Azure OpenAI، LiteLLM proxy، موديل شغّال على جهازك، أو أي provider تاني مش في
القايمة فوق؟ ضيف الأربع secrets دول وهيتفعّل تلقائيًا (أولوية أعلى من أي provider تاني):

| Secret | إلزامي؟ | مثال |
|---|---|---|
| `CUSTOM_API_BASE` | **أيوه** | `https://api.example.com/v1` (من غير `/` في الآخر، ومن غير `/chat/completions` — بيتضاف لوحده) |
| `CUSTOM_MODEL` | **أيوه** | `llama-3.3-70b-instruct` أو أي model id السيرفر بتاعك بياخده |
| `CUSTOM_API_KEY` | لأ | `sk-...` — سيبه فاضي لو السيرفر (زي موديل محلي على جهازك) مش محتاج مصادقة، والـ pipeline مش هيبعت `Authorization` header خالص في الحالة دي |
| `CUSTOM_API_HEADERS` | لأ | `{"api-key":"..."}` — أي JSON object بـ headers إضافية بتتحط فوق الأساسيين (مفيد لـ Azure OpenAI اللي بياخد `api-key` بدل `Authorization: Bearer`) |

المتطلب الوحيد: الـ endpoint يفهم `POST {base}/chat/completions` بنفس شكل طلب/رد OpenAI Chat
Completions (بما فيهم `response_format: {"type":"json_object"}`) — ده اللي كل الـ inference servers
المشهورة (vLLM، LM Studio، llama.cpp server، LiteLLM، Azure OpenAI، إلخ) بتدعمه فعليًا.

## عدم التكرار

فيه طبقتين ضد تكرار نفس الـ writeup:

1. **URL** بعد normalization (شيل الـ hash، بعض الـ tracking params، الـ trailing slash) — الطبقة
   الأساسية.
2. **العنوان** بعد normalization (lowercase + شيل علامات الترقيم) — بيتقارن مرتين: الأول على عنوان
   الـ RSS قبل حتى ما نستخرج المحتوى (يوفّر وقت)، والتاني على العنوان النهائي بعد Jina (بيمسك حالة إن
   نفس المقال ليه عنوانين مختلفين شوية في مصدرين، أو اتعاد نشره).

بمجرد ما عنوان يتخزن، مستحيل يتكرر تاني — حتى لو مصدر تاني لقاه برابط مختلف كليًا.

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

- **`.github/workflows/writeups-fetch.yml`** — **كل ساعة** (وباليدوي)، بيشغّل الـ pipeline ويعمل
  commit للـ data تلقائيًا (`data/writeups.json` + `data/by-category/*.json` + `data/meta.json`).
  فيه `concurrency` group عشان لو تشغيلة اتأخرت مش هيتصادموا مع بعض.
- **`.github/workflows/writeups-deploy.yml`** — أي push على main (بما فيه الـ data commit
  اللي فوق) بيبني الموقع وينشره على GitHub Pages تلقائيًا.

الأرشيف **دائم** — `fetchWriteups.mjs` مبيشيلش أي writeup اتخزن قبل كده، فالـ repo بيكبر باستمرار
وكل شرح AI اتعمل بيفضل محفوظ للأبد.

### تفعيل GitHub Pages (مرة واحدة)

Settings → Pages → Source: **GitHub Actions**. بعدها كل push على main هينشر تلقائي.

### الـ secrets المطلوبة (كلها اختيارية، الموقع شغّال من غيرها)

Settings → Secrets and variables → Actions:

- `GEMINI_API_KEY` (موصى بيه)
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `CUSTOM_API_BASE` / `CUSTOM_API_KEY` / `CUSTOM_MODEL` / `CUSTOM_API_HEADERS` (موديل مخصص — تفاصيل فوق)
- `JINA_API_KEY`

## حقوق النشر

الموقع **مش بينسخ** محتوى الكتابات الأصلية — كل بطاقة بتعرض عنوان دقيق + ملخص AI قصير + تصنيفات،
وبعدين بتحيلك برابط مباشر للمصدر الأصلي. ده احترامًا لحقوق كتّاب الـ writeups وعشان الموقع يفضل
مصدر تقدير وتوجيه مش بديل عن قراءة الأصل.

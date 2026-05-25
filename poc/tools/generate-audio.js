// ════════════════════════════════════════════════════════════
// Audio Generator — uses edge-tts to produce high-quality MP3
// clips of all the fixed phrases the teacher speaks in the app.
//
// Run with:    node tools/generate-audio.js
// Output dir:  poc/audio/{ar|en}/{phraseId}.mp3
//
// Voices (Microsoft Edge Natural — free, no API key needed):
//   ar:   ar-EG-SalmaNeural   (warm female, Egyptian Arabic)
//   en:   en-US-AriaNeural    (warm female, US English — kid-friendly)
// ════════════════════════════════════════════════════════════
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');

const AUDIO_DIR = path.resolve(__dirname, '..', 'audio');

// Multiple teacher-voice options per language so the user can pick.
// Each entry: id (folder name), voice (Edge voice id), gender, label, region.
const VOICES = {
  ar: [
    { id: 'salma',   voice: 'ar-EG-SalmaNeural',   gender: 'female', avatar: '👩‍🏫', name_ar: 'سلمى', name_en: 'Salma',   region: 'EG' },
    { id: 'hamed',   voice: 'ar-EG-ShakirNeural',  gender: 'male',   avatar: '👨‍🏫', name_ar: 'شاكر', name_en: 'Shakir',  region: 'EG' },
    { id: 'zariyah', voice: 'ar-SA-ZariyahNeural', gender: 'female', avatar: '🧕',   name_ar: 'زارية', name_en: 'Zariyah', region: 'SA' },
  ],
  en: [
    { id: 'aria',  voice: 'en-US-AriaNeural',  gender: 'female', avatar: '👩‍🏫', name_ar: 'آريا', name_en: 'Aria',  region: 'US' },
    { id: 'jenny', voice: 'en-US-JennyNeural', gender: 'female', avatar: '🦰',   name_ar: 'جيني', name_en: 'Jenny', region: 'US' },
    { id: 'guy',   voice: 'en-US-GuyNeural',   gender: 'male',   avatar: '👨‍🏫', name_ar: 'جاي',  name_en: 'Guy',   region: 'US' },
  ],
};

// Fixed phrases — these are the lines the teacher says regardless of context.
// Variable bits (numbers, kid's name) still use Web Speech API at runtime.
const PHRASES = {
  // Welcome / language test
  'welcome':         { ar: 'أهلاً بك في برايت مايندز! أنا حكيم البومة الحكيمة',
                       en: 'Welcome to BrightMinds! I am Hakim the Wise Owl' },
  'test_phrase':     { ar: 'أهلاً! أنا حكيم البومة الحكيمة. سأساعدك في مغامرتك',
                       en: 'Hello! I am Hakim the Wise Owl. I will help you on your quest' },

  // Encouragement
  'great':           { ar: 'أحسنت',                            en: 'Great job' },
  'excellent':       { ar: 'ممتاز',                            en: 'Excellent' },
  'awesome':         { ar: 'رائع',                             en: 'Awesome' },
  'try_again':       { ar: 'حاول مرة أخرى',                    en: 'Try again' },
  'correct':         { ar: 'إجابة صحيحة',                      en: 'Correct answer' },
  'champion':        { ar: 'أنت بطل',                          en: 'You are a champion' },

  // Multiply phase instructions
  'draw_vert':       { ar: 'ارسم الخطوط الرأسية من أعلى إلى أسفل',
                       en: 'Draw vertical lines from top to bottom' },
  'draw_horiz':      { ar: 'الآن ارسم الخطوط الأفقية',
                       en: 'Now draw horizontal lines' },
  'count_dots':      { ar: 'اضغط على كل نقطة وعدها معي',
                       en: 'Tap each dot and count with me' },
  'write_answer':    { ar: 'الآن اكتب الإجابة بتوصيل النقاط بالترتيب',
                       en: 'Now write the answer by connecting the dots in order' },

  // Addition
  'add_intro':       { ar: 'حكيم يصنع فطيرة. ساعده في عد التفاحات',
                       en: 'Hakim is making pie. Help him count the apples' },
  'count_apples':    { ar: 'اضغط على كل تفاحة وعدها',
                       en: 'Tap each apple to count' },

  // Letters
  'letters_intro':   { ar: 'هيا نتعلم الحروف. اختر الصورة الصحيحة',
                       en: 'Let us learn letters. Pick the correct image' },
  'letters_wrong':   { ar: 'لا، حاول مرة أخرى',                en: 'No, try again' },

  // Memory
  'memory_intro':    { ar: 'اقلب البطاقات وطابق الزوجين',
                       en: 'Flip the cards and match the pairs' },
  'memory_match':    { ar: 'مطابقة',                           en: 'Match' },

  // Find letter
  'find_intro':      { ar: 'ابحث عن كل أمثلة هذا الحرف',
                       en: 'Find every instance of this letter' },
  'find_found':      { ar: 'وجدت واحداً',                       en: 'Found one' },

  // Color hunt
  'color_intro':     { ar: 'اضغط على كل أشياء بنفس اللون',
                       en: 'Tap every item of the same color' },

  // Word builder
  'wb_intro':        { ar: 'هيا نكون الكلمات. رتب الحروف',
                       en: 'Let us build words. Arrange the letters' },

  // Session
  'session_start':   { ar: 'هيا نبدأ خمسة تمارين',             en: 'Let us start five exercises' },
  'session_end':     { ar: 'مبروك! انتهت الجلسة',              en: 'Congratulations! Session complete' },
  'next_exercise':   { ar: 'ممتاز! هيا للتمرين التالي',         en: 'Excellent! On to the next exercise' },

  // ── Game intros + wins (previously missing — used to fall to OS TTS) ──
  'maze_intro':      { ar: 'ساعد الحيوان يصل للهدف عبر المتاهة',
                       en: 'Help the animal reach the goal through the maze' },
  'maze_win':        { ar: 'رائع! وصلت',                       en: 'Awesome! You made it' },
  'puzzle_intro':    { ar: 'ركّب الصورة بترتيب القطع في مكانها',
                       en: 'Build the picture by placing the pieces' },
  'puzzle_win':      { ar: 'رائع! اكتملت الصورة',              en: 'Awesome! Picture complete' },
  'shop_intro':      { ar: 'حكيم في متجره. اشتر المنتج بالنقود الصحيحة',
                       en: 'Hakim is in his shop. Buy the item with the right money' },
  'shop_win':        { ar: 'أحسنت! اشتريت المنتج',             en: 'Awesome! You bought it' },
  'science_intro':   { ar: 'هيا نتعلم أين يعيش الحيوان',        en: "Let's learn where animals live" },
  'story_intro':     { ar: 'هيا نتدرّب على الضرب — جاهز؟',     en: "Let's practice multiplication — ready?" },
  'story_read_intro':{ ar: 'هيا نقرأ قصة جميلة',               en: "Let's read a beautiful story" },
  'next_digit':      { ar: 'أحسنت! الآن اكتب الرقم التالي',     en: 'Well done! Now write the next digit' },
  'weak_focus':      { ar: 'هذه المسألة تحتاج تركيزاً أكثر',     en: 'This problem needs more focus' },

  // ── Story narrations — every page + moral of every story ──
  // Key pattern:  s_<storyId>_p<index>  for pages,  s_<storyId>_m  for moral.
  // Generated from poc/story.js (any change to story text means re-running this).
  // Rabbit & Tortoise
  's_rabbit-tortoise_p0': { ar: 'كان هناك أرنب سريع يفتخر بسرعته كل يوم.',                          en: 'A fast rabbit boasted about his speed every day.' },
  's_rabbit-tortoise_p1': { ar: 'وكانت هناك سلحفاة بطيئة لكنها لا تستسلم أبداً.',                    en: 'A slow tortoise never gave up, no matter what.' },
  's_rabbit-tortoise_p2': { ar: 'قال الأرنب هيا نتسابق! أنا الأسرع!',                                en: 'The rabbit said: Let us race! I am the fastest!' },
  's_rabbit-tortoise_p3': { ar: 'انطلق الأرنب بسرعة كبيرة وترك السلحفاة خلفه.',                       en: 'The rabbit zoomed ahead, leaving the tortoise far behind.' },
  's_rabbit-tortoise_p4': { ar: 'وقف الأرنب تحت شجرة ونام، فهو متأكد من الفوز.',                      en: 'He stopped under a tree to nap, sure he would win.' },
  's_rabbit-tortoise_p5': { ar: 'مشت السلحفاة ببطء، خطوة، خطوة، خطوة.',                              en: 'The tortoise walked slowly, step, step, step.' },
  's_rabbit-tortoise_p6': { ar: 'وصلت السلحفاة إلى النهاية أولاً وفازت بالسباق!',                     en: 'The tortoise reached the finish line first and won!' },
  's_rabbit-tortoise_m':  { ar: 'الصبر والمثابرة أهم من السرعة.',                                    en: 'Patience and steady effort beat speed and pride.' },
  // Lion & Mouse
  's_lion-mouse_p0': { ar: 'كان الأسد ينام في الغابة بهدوء.',                                        en: 'A big lion was sleeping peacefully in the jungle.' },
  's_lion-mouse_p1': { ar: 'مرّ فأر صغير ومشى فوق وجه الأسد بدون قصد.',                              en: 'A tiny mouse ran across his face by accident.' },
  's_lion-mouse_p2': { ar: 'استيقظ الأسد غاضباً وأمسك بالفأر بيده القوية.',                          en: 'The lion woke up angry and grabbed the mouse.' },
  's_lion-mouse_p3': { ar: 'قال الفأر أرجوك سامحني، يوماً ما سأساعدك.',                              en: 'Please let me go, the mouse said, one day I will help you.' },
  's_lion-mouse_p4': { ar: 'ضحك الأسد وتركه يذهب.',                                                 en: 'The lion laughed and let him go.' },
  's_lion-mouse_p5': { ar: 'بعد أيام، وقع الأسد في شبكة الصياد ولم يستطع الخروج.',                    en: "Days later, the lion was trapped in a hunter's net." },
  's_lion-mouse_p6': { ar: 'سمع الفأر صوته، وجاء وقطع الشبكة بأسنانه الصغيرة.',                       en: 'The mouse heard him and chewed the net with his tiny teeth.' },
  's_lion-mouse_p7': { ar: 'شكر الأسد الفأر، وأصبحا صديقين إلى الأبد.',                              en: 'The lion thanked him, and they were friends forever.' },
  's_lion-mouse_m':  { ar: 'لا تحقر أحداً، فحتى الصغير قد يساعدك يوماً ما.',                          en: 'No one is too small to help. Be kind to everyone.' },
  // Wash Hands
  's_wash-hands_p0': { ar: 'سامي ولد ذكي، لكنه نسي أن يغسل يديه قبل الأكل.',                          en: 'Sam was a clever boy, but he forgot to wash his hands.' },
  's_wash-hands_p1': { ar: 'أكل تفاحة بيدين متّسختين من اللعب في الحديقة.',                           en: 'He ate an apple with dirty hands from playing in the yard.' },
  's_wash-hands_p2': { ar: 'في الليل آلمته بطنه كثيراً ولم يستطع النوم.',                             en: 'At night his tummy hurt so much he could not sleep.' },
  's_wash-hands_p3': { ar: 'قالت أمه هذا لأن الجراثيم دخلت بطنك مع التفاحة.',                         en: 'Mom said: Germs got into your tummy with the apple.' },
  's_wash-hands_p4': { ar: 'في الصباح، علّمته أمه ماء وصابون وعشرون ثانية.',                          en: 'In the morning she taught him: water, soap, and twenty seconds.' },
  's_wash-hands_p5': { ar: 'من ذلك اليوم، سامي يغسل يديه قبل كل وجبة.',                              en: 'From that day, Sam washed his hands before every meal.' },
  's_wash-hands_p6': { ar: 'وأصبح صحياً وقوياً، ولم تؤلمه بطنه أبداً.',                              en: 'He stayed healthy and strong, and his tummy never hurt again.' },
  's_wash-hands_m':  { ar: 'غسل اليدين يحميك من المرض. اغسلها دائماً قبل الأكل!',                     en: 'Washing hands keeps you healthy. Always wash before eating!' },
  // Honest Shepherd
  's_honest-shepherd_p0': { ar: 'كان هناك راعٍ صغير يحرس أغنامه في الجبل.',                          en: 'A young shepherd watched his sheep on the hill.' },
  's_honest-shepherd_p1': { ar: 'شعر بالملل، فصرخ ذئب! ذئب! مازحاً.',                                en: 'He got bored, so he shouted Wolf! Wolf! as a joke.' },
  's_honest-shepherd_p2': { ar: 'ركض القرويون لمساعدته، لكن لم يكن هناك ذئب.',                       en: 'The villagers ran to help, but there was no wolf.' },
  's_honest-shepherd_p3': { ar: 'ضحك الراعي على القرويين، وكرّر مزحته مرّة أخرى.',                   en: 'The shepherd laughed at them and did it again.' },
  's_honest-shepherd_p4': { ar: 'في يوم آخر، جاء ذئب حقيقي وهجم على الأغنام.',                       en: 'One day a real wolf came and attacked the sheep.' },
  's_honest-shepherd_p5': { ar: 'صرخ الراعي بصوت عالٍ، لكن لم يصدّقه أحد هذه المرة.',                en: 'The shepherd shouted, but nobody believed him this time.' },
  's_honest-shepherd_p6': { ar: 'أكل الذئب الأغنام، وندم الراعي على كذبه.',                          en: 'The wolf ate the sheep, and the boy was very sorry.' },
  's_honest-shepherd_m':  { ar: 'الكذب يُفقدك ثقة الناس. كن دائماً صادقاً.',                          en: 'Lying makes people stop trusting you. Always be honest.' },
  // Sharing Cookies
  's_sharing-cookies_p0': { ar: 'لمى بنت صغيرة تحبّ الكوكيز كثيراً.',                                en: 'Lily was a little girl who loved cookies very much.' },
  's_sharing-cookies_p1': { ar: 'أعطتها أمها صحناً مليئاً بالكوكيز اللذيذ.',                          en: 'Mom gave her a plate full of yummy cookies.' },
  's_sharing-cookies_p2': { ar: 'جاء أخوها يوسف يطلب كوكيز، فقالت لا، كلها لي!',                     en: 'Her brother Joe asked for one, but she said: No, all mine!' },
  's_sharing-cookies_p3': { ar: 'بكى يوسف وذهب حزيناً إلى غرفته.',                                  en: 'Joe cried and went to his room, feeling sad.' },
  's_sharing-cookies_p4': { ar: 'شعرت لمى بالحزن وهي تأكل وحدها بدون أخيها.',                        en: 'Lily felt sad too, eating alone without her brother.' },
  's_sharing-cookies_p5': { ar: 'ذهبت إلى يوسف وأعطته نصف الكوكيز.',                                en: 'She went to Joe and gave him half of the cookies.' },
  's_sharing-cookies_p6': { ar: 'ضحكا معاً، وكانت السعادة مضاعفة عندما شاركت.',                      en: 'They laughed together — sharing made happiness double.' },
  's_sharing-cookies_m':  { ar: 'المشاركة تجعل السعادة أكبر. شارك من تحبّ!',                          en: 'Sharing makes happiness bigger. Share with people you love!' },

  // Numbers 1-25 (for counting + answer reveals)
  'n_1':  { ar: 'واحد',         en: 'one' },
  'n_2':  { ar: 'اثنان',        en: 'two' },
  'n_3':  { ar: 'ثلاثة',        en: 'three' },
  'n_4':  { ar: 'أربعة',        en: 'four' },
  'n_5':  { ar: 'خمسة',         en: 'five' },
  'n_6':  { ar: 'ستة',          en: 'six' },
  'n_7':  { ar: 'سبعة',         en: 'seven' },
  'n_8':  { ar: 'ثمانية',       en: 'eight' },
  'n_9':  { ar: 'تسعة',         en: 'nine' },
  'n_10': { ar: 'عشرة',         en: 'ten' },
  'n_11': { ar: 'أحد عشر',      en: 'eleven' },
  'n_12': { ar: 'اثنا عشر',     en: 'twelve' },
  'n_13': { ar: 'ثلاثة عشر',    en: 'thirteen' },
  'n_14': { ar: 'أربعة عشر',    en: 'fourteen' },
  'n_15': { ar: 'خمسة عشر',     en: 'fifteen' },
  'n_16': { ar: 'ستة عشر',      en: 'sixteen' },
  'n_17': { ar: 'سبعة عشر',     en: 'seventeen' },
  'n_18': { ar: 'ثمانية عشر',   en: 'eighteen' },
  'n_19': { ar: 'تسعة عشر',     en: 'nineteen' },
  'n_20': { ar: 'عشرون',        en: 'twenty' },
  'n_25': { ar: 'خمسة وعشرون',  en: 'twenty five' },
  'n_30': { ar: 'ثلاثون',       en: 'thirty' },
  'n_36': { ar: 'ستة وثلاثون',  en: 'thirty six' },
  'n_42': { ar: 'اثنان وأربعون', en: 'forty two' },
  'n_49': { ar: 'تسعة وأربعون',  en: 'forty nine' },
  'n_56': { ar: 'ستة وخمسون',    en: 'fifty six' },
  'n_63': { ar: 'ثلاثة وستون',   en: 'sixty three' },
  'n_72': { ar: 'اثنان وسبعون',  en: 'seventy two' },
  'n_81': { ar: 'واحد وثمانون',  en: 'eighty one' },
};

async function generateOne(text, edgeVoice, outPath) {
  if (fs.existsSync(outPath)) return false;
  const tts = new MsEdgeTTS();
  await tts.setMetadata(edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  const chunks = [];
  await new Promise((resolve, reject) => {
    audioStream.on('data', (c) => chunks.push(c));
    audioStream.on('end', resolve);
    audioStream.on('error', reject);
    audioStream.on('close', resolve);
  });
  fs.writeFileSync(outPath, Buffer.concat(chunks));
  return true;
}

// Parse simple CLI flags:  --voices=salma,aria    --only=s_*    --lang=ar
function parseArgs() {
  const out = { voices: null, only: null, lang: null };
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([\w-]+)=(.+)$/);
    if (!m) continue;
    if (m[1] === 'voices')   out.voices = m[2].split(',').map(s => s.trim());
    else if (m[1] === 'only') {
      // Accept comma-separated patterns:  --only=lp_*,lc_*,cp_*
      const alts = m[2].split(',').map(p => p.replace(/\*/g, '.*'));
      out.only = new RegExp('^(' + alts.join('|') + ')$');
    }
    else if (m[1] === 'lang') out.lang = m[2];
  }
  return out;
}

const MANIFEST_VERSION = 3;  // bump when PHRASES changes so the app reloads

// ════════════════════════════════════════════════════════════
// DYNAMIC TEMPLATE EXPANSION
// Mirrors the in-app data so we pre-generate every combination the kid can hit
// at runtime. Source of truth is the game data (LETTER_DATA, COLORS, addition
// number range) — duplicated here ONLY because the generator runs in Node and
// can't import browser code. If you change either, re-run the generator.
// Naming scheme (filename = key):
//   lp_<lang>_<idx>   letters_prompt   ("حرف ب" / "Letter B")
//   lc_<lang>_<idx>   letters_correct  ("أحسنت! ب يبدأ بحرف بطة")
//   cp_<colorId>      colorhunt_prompt ("اللون الأحمر" / "The Red color")
//   ap_<a>_<b>        add_problem      ("كم تفاحة معاً؟ 3 زائد 5" / "How many apples together? 3 plus 5")
// ════════════════════════════════════════════════════════════
const LETTER_DATA = {
  ar: [
    { letter: 'أ', word: 'أسد' },   { letter: 'ب', word: 'بطة' },   { letter: 'ت', word: 'تفاحة' },
    { letter: 'ث', word: 'ثعلب' },  { letter: 'ج', word: 'جمل' },   { letter: 'ح', word: 'حصان' },
    { letter: 'خ', word: 'خروف' },  { letter: 'د', word: 'دب' },    { letter: 'ذ', word: 'ذرة' },
    { letter: 'ر', word: 'رمان' },  { letter: 'ز', word: 'زرافة' }, { letter: 'س', word: 'سمكة' },
    { letter: 'ش', word: 'شمس' },   { letter: 'ص', word: 'صاروخ' }, { letter: 'ض', word: 'ضفدع' },
    { letter: 'ط', word: 'طائر' },  { letter: 'ع', word: 'عنب' },   { letter: 'غ', word: 'غراب' },
    { letter: 'ف', word: 'فيل' },   { letter: 'ق', word: 'قطة' },   { letter: 'ك', word: 'كلب' },
    { letter: 'ل', word: 'ليمون' }, { letter: 'م', word: 'موز' },   { letter: 'ن', word: 'نخلة' },
    { letter: 'ه', word: 'هلال' },  { letter: 'و', word: 'وردة' },  { letter: 'ي', word: 'يد' },
  ],
  en: [
    { letter: 'A', word: 'Apple' },     { letter: 'B', word: 'Banana' },    { letter: 'C', word: 'Cat' },
    { letter: 'D', word: 'Dog' },       { letter: 'E', word: 'Elephant' },  { letter: 'F', word: 'Fish' },
    { letter: 'G', word: 'Giraffe' },   { letter: 'H', word: 'Horse' },     { letter: 'I', word: 'Ice cream' },
    { letter: 'J', word: 'Juggler' },   { letter: 'K', word: 'Kite' },      { letter: 'L', word: 'Lion' },
    { letter: 'M', word: 'Monkey' },    { letter: 'N', word: 'Nest' },      { letter: 'O', word: 'Octopus' },
    { letter: 'P', word: 'Penguin' },   { letter: 'Q', word: 'Queen' },     { letter: 'R', word: 'Rabbit' },
    { letter: 'S', word: 'Sun' },       { letter: 'T', word: 'Tiger' },     { letter: 'U', word: 'Umbrella' },
    { letter: 'V', word: 'Violin' },    { letter: 'W', word: 'Whale' },     { letter: 'X', word: 'Xylophone' },
    { letter: 'Y', word: 'Yellow' },    { letter: 'Z', word: 'Zebra' },
  ],
};
const COLORS = [
  { id: 'red',    ar: 'الأحمر',    en: 'Red' },
  { id: 'blue',   ar: 'الأزرق',    en: 'Blue' },
  { id: 'green',  ar: 'الأخضر',    en: 'Green' },
  { id: 'yellow', ar: 'الأصفر',    en: 'Yellow' },
  { id: 'purple', ar: 'البنفسجي',  en: 'Purple' },
  { id: 'orange', ar: 'البرتقالي', en: 'Orange' },
  { id: 'pink',   ar: 'الوردي',    en: 'Pink' },
  { id: 'brown',  ar: 'البني',     en: 'Brown' },
];
// Addition range covers every problem the game can produce (age 11+ uses max=12)
const ADD_MAX = 12;

function expandDynamicPhrases() {
  const out = {};
  // letters_prompt — "حرف ب" / "Letter B"
  for (let i = 0; i < LETTER_DATA.ar.length; i++) {
    out['lp_ar_' + i] = { ar: 'حرف ' + LETTER_DATA.ar[i].letter };
  }
  for (let i = 0; i < LETTER_DATA.en.length; i++) {
    out['lp_en_' + i] = { en: 'Letter ' + LETTER_DATA.en[i].letter };
  }
  // letters_correct — "أحسنت! بطة يبدأ بحرف ب"
  for (let i = 0; i < LETTER_DATA.ar.length; i++) {
    const d = LETTER_DATA.ar[i];
    out['lc_ar_' + i] = { ar: `أحسنت! ${d.word} يبدأ بحرف ${d.letter}` };
  }
  for (let i = 0; i < LETTER_DATA.en.length; i++) {
    const d = LETTER_DATA.en[i];
    out['lc_en_' + i] = { en: `Great! ${d.word} starts with ${d.letter}` };
  }
  // colorhunt_prompt — "اللون الأحمر" / "The Red color"
  for (const c of COLORS) {
    out['cp_' + c.id] = { ar: 'اللون ' + c.ar, en: 'The ' + c.en + ' color' };
  }
  // add_problem — "كم تفاحة معاً؟ 3 زائد 5"
  // Arabic numerals as Western digits keep the TTS voice natural (Salma handles
  // 1-12 fluently); for English we use word numbers.
  const enNum = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
                 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const arNum = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة',
                 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر'];
  for (let a = 1; a <= ADD_MAX; a++) {
    for (let b = 1; b <= ADD_MAX; b++) {
      out['ap_' + a + '_' + b] = {
        ar: `كم تفاحة معاً؟ ${arNum[a]} زائد ${arNum[b]}`,
        en: `How many apples together? ${enNum[a]} plus ${enNum[b]}`,
      };
    }
  }
  return out;
}

// Merge static + dynamic into one PHRASES table the rest of the script uses.
Object.assign(PHRASES, expandDynamicPhrases());

async function main() {
  const args = parseArgs();
  const voiceFilter = args.voices ? new Set(args.voices) : null;
  const langFilter  = args.lang  ? args.lang : null;
  if (voiceFilter) console.log('Voice filter:', [...voiceFilter].join(', '));
  if (langFilter)  console.log('Lang filter:', langFilter);
  if (args.only)   console.log('Key filter:', args.only);

  // Ensure folder structure exists: audio/{lang}/{voiceId}/
  for (const lang of Object.keys(VOICES)) {
    if (langFilter && lang !== langFilter) continue;
    for (const v of VOICES[lang]) {
      if (voiceFilter && !voiceFilter.has(v.id)) continue;
      const dir = path.join(AUDIO_DIR, lang, v.id);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Merge with existing manifest so a partial run doesn't lose previously-
  // generated phrases. ALL keys in PHRASES are recorded in `phrases` even when
  // the audio files for this run are skipped (the on-disk MP3s already exist).
  const manifestPath = path.join(AUDIO_DIR, 'manifest.json');
  let manifest;
  if (fs.existsSync(manifestPath)) {
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (_) { manifest = {}; }
  } else {
    manifest = {};
  }
  manifest.voices = VOICES;
  manifest.defaultVoice = { ar: 'salma', en: 'aria' };
  manifest.version = MANIFEST_VERSION;
  manifest.lang = 'ar';
  manifest.generatedAt = new Date().toISOString();
  manifest.phrases = manifest.phrases || {};

  let made = 0, skipped = 0, failed = 0;
  const keys = Object.keys(PHRASES).filter(k => !args.only || args.only.test(k));
  for (const key of keys) {
    // Preserve previously-recorded entries; only set the langs this phrase has.
    manifest.phrases[key] = manifest.phrases[key] || {};
    if (PHRASES[key].ar) manifest.phrases[key].ar = PHRASES[key].ar;
    if (PHRASES[key].en) manifest.phrases[key].en = PHRASES[key].en;
    for (const lang of Object.keys(VOICES)) {
      if (langFilter && lang !== langFilter) continue;
      // Some phrases are intentionally single-language (e.g. lp_ar_0 has no en);
      // skip those instead of erroring on undefined text.
      if (!PHRASES[key][lang]) continue;
      for (const v of VOICES[lang]) {
        if (voiceFilter && !voiceFilter.has(v.id)) continue;
        const out = path.join(AUDIO_DIR, lang, v.id, key + '.mp3');
        try {
          const wrote = await generateOne(PHRASES[key][lang], v.voice, out);
          if (wrote) { made++; process.stdout.write(`✓ ${lang}/${v.id}/${key}.mp3\n`); }
          else { skipped++; }
        } catch (e) {
          failed++;
          process.stdout.write(`✗ ${lang}/${v.id}/${key}: ${e.message}\n`);
        }
      }
    }
  }

  // Record per-voice coverage so the runtime can fall back to the default
  // voice when the user-selected voice is missing a freshly added clip.
  manifest.coverage = {};
  for (const lang of Object.keys(VOICES)) {
    manifest.coverage[lang] = {};
    for (const v of VOICES[lang]) {
      const dir = path.join(AUDIO_DIR, lang, v.id);
      if (!fs.existsSync(dir)) { manifest.coverage[lang][v.id] = []; continue; }
      manifest.coverage[lang][v.id] = fs.readdirSync(dir)
        .filter(n => n.endsWith('.mp3'))
        .map(n => n.replace(/\.mp3$/, ''));
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const total = made + skipped + failed;
  console.log(`\nDone. ${made} generated, ${skipped} skipped, ${failed} failed (of ${total} attempts).`);
  console.log(`Manifest version: ${MANIFEST_VERSION} — ${Object.keys(manifest.phrases).length} phrase keys.`);
  console.log('Per-voice coverage:');
  for (const lang of Object.keys(manifest.coverage)) {
    for (const v of Object.keys(manifest.coverage[lang])) {
      const pct = Math.round(100 * manifest.coverage[lang][v].length / Object.keys(manifest.phrases).length);
      console.log(`  ${lang}/${v}: ${manifest.coverage[lang][v].length}/${Object.keys(manifest.phrases).length} (${pct}%)`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

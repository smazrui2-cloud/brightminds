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

async function main() {
  // Ensure folder structure exists: audio/{lang}/{voiceId}/
  for (const lang of Object.keys(VOICES)) {
    for (const v of VOICES[lang]) {
      const dir = path.join(AUDIO_DIR, lang, v.id);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
  }

  const manifest = { voices: VOICES, phrases: {}, defaultVoice: { ar: 'salma', en: 'aria' } };
  let made = 0, skipped = 0, failed = 0;
  const keys = Object.keys(PHRASES);
  for (const key of keys) {
    manifest.phrases[key] = { ar: PHRASES[key].ar, en: PHRASES[key].en };
    for (const lang of Object.keys(VOICES)) {
      for (const v of VOICES[lang]) {
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

  fs.writeFileSync(
    path.join(AUDIO_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`\nDone. ${made} generated, ${skipped} skipped, ${failed} failed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });

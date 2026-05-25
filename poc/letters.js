// ════════════════════════════════════════════════════════════
// LETTERS subject — Letter-Image Match game
// Kid sees a letter, picks the image whose Arabic/English word starts with it.
// ════════════════════════════════════════════════════════════

// Each entry: { letter, image (emoji), word (in target language) }
const LETTER_DATA = {
  ar: [
    { letter: 'أ', image: '🦁', word: 'أسد' },
    { letter: 'ب', image: '🦆', word: 'بطة' },
    { letter: 'ت', image: '🍎', word: 'تفاحة' },
    { letter: 'ث', image: '🦊', word: 'ثعلب' },
    { letter: 'ج', image: '🐪', word: 'جمل' },
    { letter: 'ح', image: '🐴', word: 'حصان' },
    { letter: 'خ', image: '🐑', word: 'خروف' },
    { letter: 'د', image: '🐻', word: 'دب' },
    { letter: 'ذ', image: '🌽', word: 'ذرة' },
    { letter: 'ر', image: '🍇', word: 'رمان' },
    { letter: 'ز', image: '🦒', word: 'زرافة' },
    { letter: 'س', image: '🐟', word: 'سمكة' },
    { letter: 'ش', image: '☀️', word: 'شمس' },
    { letter: 'ص', image: '🚀', word: 'صاروخ' },
    { letter: 'ض', image: '🐸', word: 'ضفدع' },
    { letter: 'ط', image: '🦜', word: 'طائر' },
    { letter: 'ع', image: '🍇', word: 'عنب' },
    { letter: 'غ', image: '🐦', word: 'غراب' },
    { letter: 'ف', image: '🐘', word: 'فيل' },
    { letter: 'ق', image: '🐈', word: 'قطة' },
    { letter: 'ك', image: '🐕', word: 'كلب' },
    { letter: 'ل', image: '🍋', word: 'ليمون' },
    { letter: 'م', image: '🍌', word: 'موز' },
    { letter: 'ن', image: '🌴', word: 'نخلة' },
    { letter: 'ه', image: '🌙', word: 'هلال' },
    { letter: 'و', image: '🌹', word: 'وردة' },
    { letter: 'ي', image: '✋', word: 'يد' },
  ],
  en: [
    { letter: 'A', image: '🍎', word: 'Apple' },
    { letter: 'B', image: '🍌', word: 'Banana' },
    { letter: 'C', image: '🐈', word: 'Cat' },
    { letter: 'D', image: '🐕', word: 'Dog' },
    { letter: 'E', image: '🐘', word: 'Elephant' },
    { letter: 'F', image: '🐟', word: 'Fish' },
    { letter: 'G', image: '🦒', word: 'Giraffe' },
    { letter: 'H', image: '🐴', word: 'Horse' },
    { letter: 'I', image: '🍦', word: 'Ice cream' },
    { letter: 'J', image: '🤹', word: 'Juggler' },
    { letter: 'K', image: '🪁', word: 'Kite' },
    { letter: 'L', image: '🦁', word: 'Lion' },
    { letter: 'M', image: '🐒', word: 'Monkey' },
    { letter: 'N', image: '🪺', word: 'Nest' },
    { letter: 'O', image: '🐙', word: 'Octopus' },
    { letter: 'P', image: '🐧', word: 'Penguin' },
    { letter: 'Q', image: '👑', word: 'Queen' },
    { letter: 'R', image: '🐇', word: 'Rabbit' },
    { letter: 'S', image: '☀️', word: 'Sun' },
    { letter: 'T', image: '🐅', word: 'Tiger' },
    { letter: 'U', image: '☂️', word: 'Umbrella' },
    { letter: 'V', image: '🎻', word: 'Violin' },
    { letter: 'W', image: '🐳', word: 'Whale' },
    { letter: 'X', image: '❎', word: 'Xylophone' },
    { letter: 'Y', image: '🟡', word: 'Yellow' },
    { letter: 'Z', image: '🦓', word: 'Zebra' },
  ],
};

const Letters = {
  generateProblem(lang = 'ar') {
    const pool = LETTER_DATA[lang] || LETTER_DATA.ar;
    // Pick the target letter
    const targetIdx = Math.floor(Math.random() * pool.length);
    const target = pool[targetIdx];
    // Pick 2 distractors with different letters
    const distractors = [];
    const seen = new Set([target.letter]);
    while (distractors.length < 2) {
      const c = pool[Math.floor(Math.random() * pool.length)];
      if (seen.has(c.letter)) continue;
      seen.add(c.letter);
      distractors.push(c);
    }
    // Shuffle choices
    const choices = [target, ...distractors];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return {
      letter: target.letter,
      targetWord: target.word,
      choices: choices.map(c => ({
        image: c.image,
        word: c.word,
        isCorrect: c.letter === target.letter,
      })),
    };
  },
};

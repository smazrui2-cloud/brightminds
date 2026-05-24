// ════════════════════════════════════════════════════════════
// FIND-THE-LETTER GAME
// Kid sees a target letter, taps all instances inside a jumble grid.
// ════════════════════════════════════════════════════════════

const FindLetter = {
  AR_LETTERS: ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'],
  EN_LETTERS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),

  // Cartoon image + word that STARTS with each letter (per language) — used
  // alongside the big target letter so non-readers see "what sound this is".
  HINTS: {
    ar: {
      'أ': { emoji: '🦁', word: 'أسد' },
      'ب': { emoji: '🦆', word: 'بطة' },
      'ت': { emoji: '🍎', word: 'تفاحة' },
      'ث': { emoji: '🦊', word: 'ثعلب' },
      'ج': { emoji: '🐪', word: 'جمل' },
      'ح': { emoji: '🐴', word: 'حصان' },
      'خ': { emoji: '🐑', word: 'خروف' },
      'د': { emoji: '🐻', word: 'دب' },
      'ذ': { emoji: '🌽', word: 'ذرة' },
      'ر': { emoji: '🍇', word: 'رمان' },
      'ز': { emoji: '🦒', word: 'زرافة' },
      'س': { emoji: '🐟', word: 'سمكة' },
      'ش': { emoji: '☀️', word: 'شمس' },
      'ص': { emoji: '🚀', word: 'صاروخ' },
      'ض': { emoji: '🐸', word: 'ضفدع' },
      'ط': { emoji: '🦜', word: 'طائر' },
      'ظ': { emoji: '🦌', word: 'ظبي' },
      'ع': { emoji: '🍇', word: 'عنب' },
      'غ': { emoji: '🐦', word: 'غراب' },
      'ف': { emoji: '🐘', word: 'فيل' },
      'ق': { emoji: '🐈', word: 'قطة' },
      'ك': { emoji: '🐕', word: 'كلب' },
      'ل': { emoji: '🍋', word: 'ليمون' },
      'م': { emoji: '🍌', word: 'موز' },
      'ن': { emoji: '🌴', word: 'نخلة' },
      'ه': { emoji: '🌙', word: 'هلال' },
      'و': { emoji: '🌹', word: 'وردة' },
      'ي': { emoji: '✋', word: 'يد' },
    },
    en: {
      'A': { emoji: '🍎', word: 'Apple' },
      'B': { emoji: '🍌', word: 'Banana' },
      'C': { emoji: '🐈', word: 'Cat' },
      'D': { emoji: '🐕', word: 'Dog' },
      'E': { emoji: '🐘', word: 'Elephant' },
      'F': { emoji: '🐟', word: 'Fish' },
      'G': { emoji: '🦒', word: 'Giraffe' },
      'H': { emoji: '🐴', word: 'Horse' },
      'I': { emoji: '🍦', word: 'Ice cream' },
      'J': { emoji: '🤹', word: 'Juggler' },
      'K': { emoji: '🪁', word: 'Kite' },
      'L': { emoji: '🦁', word: 'Lion' },
      'M': { emoji: '🐒', word: 'Monkey' },
      'N': { emoji: '🪺', word: 'Nest' },
      'O': { emoji: '🐙', word: 'Octopus' },
      'P': { emoji: '🐧', word: 'Penguin' },
      'Q': { emoji: '👑', word: 'Queen' },
      'R': { emoji: '🐇', word: 'Rabbit' },
      'S': { emoji: '☀️', word: 'Sun' },
      'T': { emoji: '🐅', word: 'Tiger' },
      'U': { emoji: '☂️', word: 'Umbrella' },
      'V': { emoji: '🎻', word: 'Violin' },
      'W': { emoji: '🐳', word: 'Whale' },
      'X': { emoji: '❎', word: 'Xylophone' },
      'Y': { emoji: '🟡', word: 'Yellow' },
      'Z': { emoji: '🦓', word: 'Zebra' },
    },
  },

  hintFor(letter, lang) {
    return (this.HINTS[lang] && this.HINTS[lang][letter]) || null;
  },

  configForAge(age) {
    if (age <= 6) return { cols: 3, rows: 4, targets: 3 };
    if (age <= 9) return { cols: 4, rows: 4, targets: 4 };
    return { cols: 4, rows: 5, targets: 5 };
  },

  generate(lang, age) {
    const alphabet = (lang === 'ar') ? this.AR_LETTERS : this.EN_LETTERS;
    const cfg = this.configForAge(age);
    const total = cfg.cols * cfg.rows;

    const target = alphabet[Math.floor(Math.random() * alphabet.length)];
    // Random distractors (not the target)
    const distractorPool = alphabet.filter(l => l !== target);

    const cells = [];
    for (let i = 0; i < cfg.targets; i++) {
      cells.push({ letter: target, isTarget: true, found: false });
    }
    for (let i = 0; i < total - cfg.targets; i++) {
      const d = distractorPool[Math.floor(Math.random() * distractorPool.length)];
      cells.push({ letter: d, isTarget: false, found: false });
    }
    // Shuffle
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return { target, cells, cols: cfg.cols, rows: cfg.rows, targetCount: cfg.targets };
  },
};

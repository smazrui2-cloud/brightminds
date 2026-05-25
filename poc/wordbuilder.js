// ════════════════════════════════════════════════════════════
// WORD BUILDER — Arrange letters to form a simple word
// Kid sees a picture, drags/taps shuffled letters into slots.
// ════════════════════════════════════════════════════════════

const WordBuilder = {
  // Each word now ships with a "scene" — a themed background gradient plus
  // decorative emojis that turn the screen into a mini illustrated card,
  // similar to printed kids alphabet books.
  AR_WORDS: [
    { word: 'قطة',   emoji: '🐈', scene: 'home'    },
    { word: 'كلب',   emoji: '🐕', scene: 'park'    },
    { word: 'أسد',   emoji: '🦁', scene: 'savanna' },
    { word: 'بطة',   emoji: '🦆', scene: 'pond'    },
    { word: 'فيل',   emoji: '🐘', scene: 'savanna' },
    { word: 'موز',   emoji: '🍌', scene: 'tropical'},
    { word: 'شمس',   emoji: '☀️', scene: 'sky'     },
    { word: 'قمر',   emoji: '🌙', scene: 'night'   },
    { word: 'دب',    emoji: '🐻', scene: 'forest'  },
    { word: 'نجم',   emoji: '⭐', scene: 'night'   },
    { word: 'يد',    emoji: '✋', scene: 'sky'     },
    { word: 'قلب',   emoji: '❤️', scene: 'home'    },
    { word: 'ماء',   emoji: '💧', scene: 'ocean'   },
    { word: 'وردة',  emoji: '🌹', scene: 'garden'  },
    { word: 'سمكة',  emoji: '🐟', scene: 'ocean'   },
    { word: 'تفاحة', emoji: '🍎', scene: 'garden'  },
    { word: 'بيت',   emoji: '🏠', scene: 'home'    },
    { word: 'كتاب',  emoji: '📚', scene: 'home'    },
    { word: 'سيارة', emoji: '🚗', scene: 'park'    },
    { word: 'كرة',   emoji: '⚽', scene: 'park'    },
    { word: 'حصان',  emoji: '🐴', scene: 'park'    },
    { word: 'ثعلب',  emoji: '🦊', scene: 'forest'  },
    { word: 'قرد',   emoji: '🐒', scene: 'tropical'},
    { word: 'فراشة', emoji: '🦋', scene: 'garden'  },
  ],
  // Scene presets: gradient background + 4 decorative emojis (top + sides + bottom)
  SCENES: {
    sky:      { gradient: 'linear-gradient(180deg, #93C5FD 0%, #DBEAFE 60%, #86EFAC 100%)', deco: ['☀️','☁️','🌳','🌱'] },
    home:     { gradient: 'linear-gradient(180deg, #BFDBFE 0%, #FCE7F3 70%, #FBA74D 100%)', deco: ['🏠','🌸','🌳','🌿'] },
    park:     { gradient: 'linear-gradient(180deg, #BFDBFE 0%, #BBF7D0 60%, #86EFAC 100%)', deco: ['☀️','🌳','🌳','🌱'] },
    savanna:  { gradient: 'linear-gradient(180deg, #FCD34D 0%, #FB923C 60%, #92400E 100%)', deco: ['☀️','🌴','🌾','🌾'] },
    forest:   { gradient: 'linear-gradient(180deg, #4ADE80 0%, #16A34A 60%, #166534 100%)', deco: ['🌲','🌲','🍄','🌿'] },
    ocean:    { gradient: 'linear-gradient(180deg, #BFDBFE 0%, #38BDF8 50%, #1E40AF 100%)', deco: ['☁️','🐚','🌊','🪸'] },
    pond:     { gradient: 'linear-gradient(180deg, #BFDBFE 0%, #BAE6FD 60%, #4ADE80 100%)', deco: ['🌳','🌷','🪷','🌿'] },
    garden:   { gradient: 'linear-gradient(180deg, #FDE68A 0%, #FBCFE8 50%, #86EFAC 100%)', deco: ['☀️','🌷','🌻','🌿'] },
    tropical: { gradient: 'linear-gradient(180deg, #FDE68A 0%, #FB923C 50%, #16A34A 100%)', deco: ['☀️','🌴','🥥','🌿'] },
    night:    { gradient: 'linear-gradient(180deg, #1E1B4B 0%, #4338CA 60%, #1E3A8A 100%)', deco: ['⭐','🌙','✨','🌌'] },
  },

  EN_WORDS: [
    { word: 'CAT', emoji: '🐈' },
    { word: 'DOG', emoji: '🐕' },
    { word: 'SUN', emoji: '☀️' },
    { word: 'CAR', emoji: '🚗' },
    { word: 'BUS', emoji: '🚌' },
    { word: 'FOX', emoji: '🦊' },
    { word: 'OWL', emoji: '🦉' },
    { word: 'PIG', emoji: '🐖' },
    { word: 'BEE', emoji: '🐝' },
    { word: 'FISH', emoji: '🐟' },
    { word: 'BIRD', emoji: '🐦' },
    { word: 'STAR', emoji: '⭐' },
    { word: 'MOON', emoji: '🌙' },
    { word: 'TREE', emoji: '🌳' },
    { word: 'BALL', emoji: '⚽' },
    { word: 'BOOK', emoji: '📚' },
    { word: 'LION', emoji: '🦁' },
    { word: 'BEAR', emoji: '🐻' },
    { word: 'DUCK', emoji: '🦆' },
    { word: 'HOUSE', emoji: '🏠' },
    { word: 'APPLE', emoji: '🍎' },
  ],

  AR_ALPHABET: 'أبتثجحخدذرزسشصضطظعغفقكلمنهوية'.split(''),
  EN_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),

  filterByAge(words, age) {
    if (age <= 6) return words.filter(w => w.word.length <= 3);
    if (age <= 9) return words.filter(w => w.word.length <= 5);
    return words;
  },

  distractorCountForAge(age) {
    if (age <= 6) return 0;
    if (age <= 9) return 1;
    return 2;
  },

  generateProblem(lang = 'ar', age = 7) {
    const pool = (lang === 'ar') ? this.AR_WORDS : this.EN_WORDS;
    const eligible = this.filterByAge(pool, age);
    const target = eligible[Math.floor(Math.random() * eligible.length)];
    const letters = target.word.split('');

    const alphabet = (lang === 'ar') ? this.AR_ALPHABET : this.EN_ALPHABET;
    const distractorCount = this.distractorCountForAge(age);
    const wordSet = new Set(letters);
    const distractors = [];
    let tries = 0;
    while (distractors.length < distractorCount && tries < 40) {
      const c = alphabet[Math.floor(Math.random() * alphabet.length)];
      if (!wordSet.has(c) && !distractors.includes(c)) distractors.push(c);
      tries++;
    }

    const allTiles = [...letters, ...distractors];
    // Shuffle
    for (let i = allTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allTiles[i], allTiles[j]] = [allTiles[j], allTiles[i]];
    }
    return {
      word: target.word,
      emoji: target.emoji,
      letters,                                       // ['ق','ط','ة']
      tiles: allTiles.map((letter, i) => ({          // pool with ids
        id: i,
        letter,
        used: false,
      })),
      lang,
    };
  },
};

// ════════════════════════════════════════════════════════════
// SCIENCE — "Where does the animal live?"
// Kid sees an animal, picks the correct habitat from 3 choices.
// Teaches biology + categorization.
// ════════════════════════════════════════════════════════════

const Science = {
  // 6 habitats, each with several animals that belong to it
  HABITATS: [
    { id: 'savanna', emoji: '🌾', name_ar: 'السهول',          name_en: 'Savanna',
      animals: [
        { emoji: '🦁', name_ar: 'أسد',    name_en: 'Lion' },
        { emoji: '🦓', name_ar: 'حمار وحشي', name_en: 'Zebra' },
        { emoji: '🦒', name_ar: 'زرافة',  name_en: 'Giraffe' },
        { emoji: '🐘', name_ar: 'فيل',    name_en: 'Elephant' },
      ],
    },
    { id: 'ocean', emoji: '🌊', name_ar: 'المحيط',         name_en: 'Ocean',
      animals: [
        { emoji: '🐟', name_ar: 'سمكة',   name_en: 'Fish' },
        { emoji: '🐠', name_ar: 'سمكة ملونة', name_en: 'Tropical fish' },
        { emoji: '🐬', name_ar: 'دلفين',  name_en: 'Dolphin' },
        { emoji: '🦈', name_ar: 'قرش',    name_en: 'Shark' },
        { emoji: '🐙', name_ar: 'أخطبوط', name_en: 'Octopus' },
        { emoji: '🐳', name_ar: 'حوت',    name_en: 'Whale' },
      ],
    },
    { id: 'forest', emoji: '🌲', name_ar: 'الغابة',         name_en: 'Forest',
      animals: [
        { emoji: '🐻', name_ar: 'دب',     name_en: 'Bear' },
        { emoji: '🦊', name_ar: 'ثعلب',   name_en: 'Fox' },
        { emoji: '🦌', name_ar: 'غزال',   name_en: 'Deer' },
        { emoji: '🦉', name_ar: 'بومة',   name_en: 'Owl' },
        { emoji: '🐿️', name_ar: 'سنجاب',  name_en: 'Squirrel' },
      ],
    },
    { id: 'arctic', emoji: '🧊', name_ar: 'القطب المتجمد',  name_en: 'Arctic',
      animals: [
        { emoji: '🐧', name_ar: 'بطريق',  name_en: 'Penguin' },
        { emoji: '🐻‍❄️', name_ar: 'دب قطبي', name_en: 'Polar bear' },
        { emoji: '🦭', name_ar: 'فقمة',   name_en: 'Seal' },
      ],
    },
    { id: 'farm', emoji: '🚜', name_ar: 'المزرعة',          name_en: 'Farm',
      animals: [
        { emoji: '🐄', name_ar: 'بقرة',   name_en: 'Cow' },
        { emoji: '🐖', name_ar: 'خنزير',  name_en: 'Pig' },
        { emoji: '🐑', name_ar: 'خروف',   name_en: 'Sheep' },
        { emoji: '🐔', name_ar: 'دجاجة',  name_en: 'Chicken' },
        { emoji: '🐎', name_ar: 'حصان',   name_en: 'Horse' },
        { emoji: '🐐', name_ar: 'ماعز',   name_en: 'Goat' },
      ],
    },
    { id: 'jungle', emoji: '🌴', name_ar: 'الغابة الاستوائية', name_en: 'Jungle',
      animals: [
        { emoji: '🐒', name_ar: 'قرد',    name_en: 'Monkey' },
        { emoji: '🦜', name_ar: 'ببغاء',  name_en: 'Parrot' },
        { emoji: '🐅', name_ar: 'نمر',    name_en: 'Tiger' },
        { emoji: '🐊', name_ar: 'تمساح',  name_en: 'Crocodile' },
      ],
    },
  ],

  generateProblem(lang = 'ar') {
    // Pick a random habitat + random animal from it
    const habs = [...this.HABITATS].sort(() => Math.random() - 0.5);
    const target = habs[0];
    const animal = target.animals[Math.floor(Math.random() * target.animals.length)];
    // Pick 2 wrong habitats
    const wrongHabs = habs.slice(1, 3);
    const choices = [target, ...wrongHabs].sort(() => Math.random() - 0.5);
    return { animal, target, choices, lang };
  },
};

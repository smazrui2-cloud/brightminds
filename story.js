// ════════════════════════════════════════════════════════════
// EDUCATIONAL STORIES — قصص تعليمية
// Page-based story reader: each story has a title, illustrated pages with
// a short sentence, and a moral lesson at the end. Bilingual (ar + en).
// The mascot narrates each page; tap to advance.
// ════════════════════════════════════════════════════════════

const StoryGame = {
  STORIES: {
    ar: [
      {
        id: 'rabbit-tortoise',
        title: 'الأرنب والسلحفاة',
        cover: '🐢',
        pages: [
          { emoji: '🐇',  text: 'كان هناك أرنب سريع يفتخر بسرعته كل يوم.' },
          { emoji: '🐢',  text: 'وكانت هناك سلحفاة بطيئة لكنها لا تستسلم أبداً.' },
          { emoji: '🏁',  text: 'قال الأرنب: "هيا نتسابق! أنا الأسرع!"' },
          { emoji: '💨',  text: 'انطلق الأرنب بسرعة كبيرة وترك السلحفاة خلفه.' },
          { emoji: '😴',  text: 'وقف الأرنب تحت شجرة ونام، فهو متأكد من الفوز.' },
          { emoji: '🚶',  text: 'مشت السلحفاة ببطء... خطوة، خطوة، خطوة...' },
          { emoji: '🏆',  text: 'وصلت السلحفاة إلى النهاية أولاً وفازت بالسباق!' },
        ],
        moral: 'الصبر والمثابرة أهم من السرعة.',
      },
      {
        id: 'lion-mouse',
        title: 'الأسد والفأر',
        cover: '🦁',
        pages: [
          { emoji: '🦁',  text: 'كان الأسد ينام في الغابة بهدوء.' },
          { emoji: '🐭',  text: 'مرّ فأر صغير ومشى فوق وجه الأسد بدون قصد.' },
          { emoji: '😡',  text: 'استيقظ الأسد غاضباً وأمسك بالفأر بيده القوية.' },
          { emoji: '🙏',  text: 'قال الفأر: "أرجوك سامحني! يوماً ما سأساعدك."' },
          { emoji: '😄',  text: 'ضحك الأسد وتركه يذهب.' },
          { emoji: '🪤',  text: 'بعد أيام، وقع الأسد في شبكة الصياد ولم يستطع الخروج.' },
          { emoji: '🐭',  text: 'سمع الفأر صوته، وجاء وقطع الشبكة بأسنانه الصغيرة.' },
          { emoji: '🤝',  text: 'شكر الأسد الفأر، وأصبحا صديقين إلى الأبد.' },
        ],
        moral: 'لا تحقر أحداً، فحتى الصغير قد يساعدك يوماً ما.',
      },
      {
        id: 'wash-hands',
        title: 'سامي يغسل يديه',
        cover: '🧼',
        pages: [
          { emoji: '🧒',  text: 'سامي ولد ذكي، لكنه نسي أن يغسل يديه قبل الأكل.' },
          { emoji: '🍎',  text: 'أكل تفاحة بيدين متّسختين من اللعب في الحديقة.' },
          { emoji: '🤢',  text: 'في الليل آلمته بطنه كثيراً ولم يستطع النوم.' },
          { emoji: '👩‍⚕️', text: 'قالت أمه: "هذا لأن الجراثيم دخلت بطنك مع التفاحة."' },
          { emoji: '💧',  text: 'في الصباح، علّمته أمه: ماء + صابون + 20 ثانية.' },
          { emoji: '🧼',  text: 'من ذلك اليوم، سامي يغسل يديه قبل كل وجبة.' },
          { emoji: '💪',  text: 'وأصبح صحياً وقوياً، ولم تؤلمه بطنه أبداً.' },
        ],
        moral: 'غسل اليدين يحميك من المرض. اغسلها دائماً قبل الأكل!',
      },
      {
        id: 'honest-shepherd',
        title: 'الراعي الكاذب',
        cover: '🐑',
        pages: [
          { emoji: '👦',  text: 'كان هناك راعٍ صغير يحرس أغنامه في الجبل.' },
          { emoji: '😆',  text: 'شعر بالملل، فصرخ: "ذئب! ذئب!" مازحاً.' },
          { emoji: '🏃',  text: 'ركض القرويون لمساعدته، لكن لم يكن هناك ذئب.' },
          { emoji: '😂',  text: 'ضحك الراعي على القرويين، وكرّر مزحته مرّة أخرى.' },
          { emoji: '🐺',  text: 'في يوم آخر، جاء ذئب حقيقي وهجم على الأغنام.' },
          { emoji: '😱',  text: 'صرخ الراعي بصوت عالٍ، لكن لم يصدّقه أحد هذه المرة.' },
          { emoji: '😢',  text: 'أكل الذئب الأغنام، وندم الراعي على كذبه.' },
        ],
        moral: 'الكذب يُفقدك ثقة الناس. كن دائماً صادقاً.',
      },
      {
        id: 'sharing-cookies',
        title: 'لمى تتعلّم المشاركة',
        cover: '🍪',
        pages: [
          { emoji: '👧',  text: 'لمى بنت صغيرة تحبّ الكوكيز كثيراً.' },
          { emoji: '🍪',  text: 'أعطتها أمها صحناً مليئاً بالكوكيز اللذيذ.' },
          { emoji: '🚫',  text: 'جاء أخوها يوسف يطلب كوكيز، فقالت: "لا، كلها لي!"' },
          { emoji: '😢',  text: 'بكى يوسف وذهب حزيناً إلى غرفته.' },
          { emoji: '😔',  text: 'شعرت لمى بالحزن وهي تأكل وحدها بدون أخيها.' },
          { emoji: '🤝',  text: 'ذهبت إلى يوسف وأعطته نصف الكوكيز.' },
          { emoji: '😄',  text: 'ضحكا معاً، وكانت السعادة مضاعفة عندما شاركت.' },
        ],
        moral: 'المشاركة تجعل السعادة أكبر. شارك من تحبّ!',
      },
    ],
    en: [
      {
        id: 'rabbit-tortoise',
        title: 'The Rabbit and the Tortoise',
        cover: '🐢',
        pages: [
          { emoji: '🐇',  text: 'A fast rabbit boasted about his speed every day.' },
          { emoji: '🐢',  text: 'A slow tortoise never gave up, no matter what.' },
          { emoji: '🏁',  text: 'The rabbit said: "Let’s race! I am the fastest!"' },
          { emoji: '💨',  text: 'The rabbit zoomed ahead, leaving the tortoise far behind.' },
          { emoji: '😴',  text: 'He stopped under a tree to nap, sure he would win.' },
          { emoji: '🚶',  text: 'The tortoise walked slowly… step, step, step.' },
          { emoji: '🏆',  text: 'The tortoise reached the finish line first and won!' },
        ],
        moral: 'Patience and steady effort beat speed and pride.',
      },
      {
        id: 'lion-mouse',
        title: 'The Lion and the Mouse',
        cover: '🦁',
        pages: [
          { emoji: '🦁',  text: 'A big lion was sleeping peacefully in the jungle.' },
          { emoji: '🐭',  text: 'A tiny mouse ran across his face by accident.' },
          { emoji: '😡',  text: 'The lion woke up angry and grabbed the mouse.' },
          { emoji: '🙏',  text: '"Please let me go," the mouse said, "one day I will help you."' },
          { emoji: '😄',  text: 'The lion laughed and let him go.' },
          { emoji: '🪤',  text: 'Days later, the lion was trapped in a hunter’s net.' },
          { emoji: '🐭',  text: 'The mouse heard him and chewed the net with his tiny teeth.' },
          { emoji: '🤝',  text: 'The lion thanked him, and they were friends forever.' },
        ],
        moral: 'No one is too small to help. Be kind to everyone.',
      },
      {
        id: 'wash-hands',
        title: 'Sam Washes His Hands',
        cover: '🧼',
        pages: [
          { emoji: '🧒',  text: 'Sam was a clever boy, but he forgot to wash his hands.' },
          { emoji: '🍎',  text: 'He ate an apple with dirty hands from playing in the yard.' },
          { emoji: '🤢',  text: 'At night his tummy hurt so much he could not sleep.' },
          { emoji: '👩‍⚕️', text: 'Mom said: "Germs got into your tummy with the apple."' },
          { emoji: '💧',  text: 'In the morning she taught him: water + soap + 20 seconds.' },
          { emoji: '🧼',  text: 'From that day, Sam washed his hands before every meal.' },
          { emoji: '💪',  text: 'He stayed healthy and strong, and his tummy never hurt again.' },
        ],
        moral: 'Washing hands keeps you healthy. Always wash before eating!',
      },
      {
        id: 'honest-shepherd',
        title: 'The Boy Who Cried Wolf',
        cover: '🐑',
        pages: [
          { emoji: '👦',  text: 'A young shepherd watched his sheep on the hill.' },
          { emoji: '😆',  text: 'He got bored, so he shouted "Wolf! Wolf!" as a joke.' },
          { emoji: '🏃',  text: 'The villagers ran to help, but there was no wolf.' },
          { emoji: '😂',  text: 'The shepherd laughed at them and did it again.' },
          { emoji: '🐺',  text: 'One day a real wolf came and attacked the sheep.' },
          { emoji: '😱',  text: 'The shepherd shouted, but nobody believed him this time.' },
          { emoji: '😢',  text: 'The wolf ate the sheep, and the boy was very sorry.' },
        ],
        moral: 'Lying makes people stop trusting you. Always be honest.',
      },
      {
        id: 'sharing-cookies',
        title: 'Lily Learns to Share',
        cover: '🍪',
        pages: [
          { emoji: '👧',  text: 'Lily was a little girl who loved cookies very much.' },
          { emoji: '🍪',  text: 'Mom gave her a plate full of yummy cookies.' },
          { emoji: '🚫',  text: 'Her brother Joe asked for one, but she said: "No, all mine!"' },
          { emoji: '😢',  text: 'Joe cried and went to his room, feeling sad.' },
          { emoji: '😔',  text: 'Lily felt sad too, eating alone without her brother.' },
          { emoji: '🤝',  text: 'She went to Joe and gave him half of the cookies.' },
          { emoji: '😄',  text: 'They laughed together — sharing made happiness double.' },
        ],
        moral: 'Sharing makes happiness bigger. Share with people you love!',
      },
    ],
  },

  list(lang) {
    return this.STORIES[lang] || this.STORIES.ar;
  },

  // Pick a story the kid hasn't seen yet (falls back to random)
  pickNext(lang, seenIds) {
    const all = this.list(lang);
    const unseen = all.filter(s => !seenIds.includes(s.id));
    const pool = unseen.length ? unseen : all;
    return pool[Math.floor(Math.random() * pool.length)];
  },
};

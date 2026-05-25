// ════════════════════════════════════════════════════════════
// COLOR-HUNT GAME
// Kid sees a target color, taps all objects of that color in a grid.
// ════════════════════════════════════════════════════════════

const ColorHunt = {
  // Colors chosen to be visually DISTINCT — important for kids who can't
  // distinguish similar hues (e.g. crimson-rose vs hot-pink). Each is far
  // apart in hue and saturation.
  COLORS: [
    { id: 'red',    hex: '#DC2626', ar: 'أحمر',  en: 'Red' },     // pure red
    { id: 'blue',   hex: '#2563EB', ar: 'أزرق',  en: 'Blue' },    // pure blue
    { id: 'green',  hex: '#16A34A', ar: 'أخضر',  en: 'Green' },   // pure green
    { id: 'yellow', hex: '#FACC15', ar: 'أصفر',  en: 'Yellow' },  // pure yellow
    { id: 'purple', hex: '#9333EA', ar: 'بنفسجي', en: 'Purple' }, // pure purple
    { id: 'orange', hex: '#F97316', ar: 'برتقالي', en: 'Orange' },// pure orange
    { id: 'pink',   hex: '#EC4899', ar: 'وردي',  en: 'Pink' },    // distinct hot-pink
    { id: 'brown',  hex: '#92400E', ar: 'بني',   en: 'Brown' },   // dark brown (no overlap with red)
  ],

  // Pairs that look too similar — avoid using together in one problem.
  CONFUSING_PAIRS: [['red', 'pink'], ['red', 'orange'], ['orange', 'yellow'], ['pink', 'purple']],
  // Pure unicode shapes only — emojis have fixed colors and ignore CSS color.
  SHAPES: ['●', '★', '♥', '■', '▲', '◆', '✿', '✦'],

  // Wider grids (more cols, fewer rows) fit better on tall phone screens.
  configForAge(age) {
    if (age <= 6) return { cols: 3, rows: 3, targets: 3 };
    if (age <= 9) return { cols: 4, rows: 3, targets: 4 };
    return { cols: 4, rows: 4, targets: 5 };
  },

  // Returns true if these two color ids are in CONFUSING_PAIRS (any order)
  _confusing(a, b) {
    return this.CONFUSING_PAIRS.some(p =>
      (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
  },

  generate(lang, age) {
    const cfg = this.configForAge(age);
    const total = cfg.cols * cfg.rows;
    // Pick target color
    const colors = [...this.COLORS].sort(() => Math.random() - 0.5);
    const target = colors[0];
    // Pick distractors that don't share a "confusing" pair with the target
    const distractors = [];
    for (const c of colors.slice(1)) {
      if (distractors.length >= 3) break;
      if (this._confusing(target.id, c.id)) continue;
      if (distractors.some(d => this._confusing(d.id, c.id))) continue;
      distractors.push(c);
    }
    // If we couldn't fill 3 due to constraints, top up with any leftover
    if (distractors.length < 3) {
      for (const c of colors.slice(1)) {
        if (distractors.length >= 3) break;
        if (c.id === target.id || distractors.includes(c)) continue;
        distractors.push(c);
      }
    }

    const cells = [];
    for (let i = 0; i < cfg.targets; i++) {
      cells.push({
        color: target.hex,
        colorId: target.id,
        shape: this.SHAPES[Math.floor(Math.random() * this.SHAPES.length)],
        isTarget: true,
        found: false,
      });
    }
    for (let i = 0; i < total - cfg.targets; i++) {
      const d = distractors[Math.floor(Math.random() * distractors.length)];
      cells.push({
        color: d.hex,
        colorId: d.id,
        shape: this.SHAPES[Math.floor(Math.random() * this.SHAPES.length)],
        isTarget: false,
        found: false,
      });
    }
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return {
      target,
      targetName: (lang === 'ar') ? target.ar : target.en,
      cells,
      cols: cfg.cols,
      rows: cfg.rows,
      targetCount: cfg.targets,
    };
  },
};

// ════════════════════════════════════════════════════════════
// PUZZLE / JIGSAW — split an emoji image into pieces, kid arranges them
// Each piece shows only one cell of the full image; tap a piece, then
// tap a slot to place it. Wrong slot → bounces. All correct → success.
// ════════════════════════════════════════════════════════════

const Puzzle = {
  // Pool of large, recognizable emojis that look nice when split into pieces.
  IMAGES: [
    '🦁','🐘','🦒','🐬','🦋','🐢','🐝','🦊','🐯','🐼',
    '🐶','🐱','🦒','🐰','🐻','🦝','🦓','🐮','🐸','🐧',
    '🌳','🌴','🌻','🌸','🌺','🌷','🍎','🍓','🍌','🍇',
    '🏠','🚗','🚂','🚀','✈️','⭐','🌞','🌈','🎈','🎂',
  ],

  configForAge(age) {
    if (age <= 6) return { rows: 2, cols: 2 };   // 4 pieces, very easy
    if (age <= 9) return { rows: 3, cols: 3 };   // 9 pieces, medium
    return { rows: 3, cols: 3 };                  // keep 9, harder by virtue of more pieces
  },

  generateProblem(age) {
    const cfg = this.configForAge(age);
    const emoji = this.IMAGES[Math.floor(Math.random() * this.IMAGES.length)];
    const pieces = [];
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        pieces.push({ id: r * cfg.cols + c, row: r, col: c });
      }
    }
    // Shuffled order for the pool — must NOT match natural order, so re-shuffle if it does
    let poolOrder;
    for (let i = 0; i < 20; i++) {
      poolOrder = [...pieces].sort(() => Math.random() - 0.5).map(p => p.id);
      // Accept if at least 1 piece is not in original position
      if (poolOrder.some((id, idx) => id !== idx)) break;
    }
    return {
      emoji, rows: cfg.rows, cols: cfg.cols, pieces, poolOrder,
      placed: {}, // map slotIndex → pieceId
    };
  },

  allPlaced(problem) {
    return Object.keys(problem.placed).length === problem.rows * problem.cols;
  },
};

// ════════════════════════════════════════════════════════════
// MAZE GAME — 🐭 helps the mouse reach 🧀 through a maze
// Uses recursive-backtracker algorithm to generate a perfect maze
// (exactly one path between any two cells).
// ════════════════════════════════════════════════════════════

const Maze = {
  // Themed start/end pairs for variety
  THEMES: [
    { startEmoji: '🐭', endEmoji: '🧀', name_ar: 'الفأر يبحث عن الجبنة', name_en: 'Mouse finds cheese' },
    { startEmoji: '🐰', endEmoji: '🥕', name_ar: 'الأرنب يبحث عن الجزرة', name_en: 'Rabbit finds carrot' },
    { startEmoji: '🐝', endEmoji: '🌸', name_ar: 'النحلة تبحث عن الزهرة', name_en: 'Bee finds flower' },
    { startEmoji: '🐱', endEmoji: '🐟', name_ar: 'القطة تبحث عن السمكة', name_en: 'Cat finds fish' },
    { startEmoji: '🦊', endEmoji: '🍇', name_ar: 'الثعلب يبحث عن العنب', name_en: 'Fox finds grapes' },
  ],

  sizeForAge(age) {
    if (age <= 6) return { cols: 4, rows: 4 };
    if (age <= 9) return { cols: 5, rows: 6 };
    return { cols: 6, rows: 7 };
  },

  // Generate a perfect maze using recursive backtracker.
  // Returns 2D array of cells. Each cell has walls: {top, right, bottom, left}.
  generate(cols, rows) {
    const cells = [];
    for (let r = 0; r < rows; r++) {
      cells[r] = [];
      for (let c = 0; c < cols; c++) {
        cells[r][c] = { r, c, top: true, right: true, bottom: true, left: true, visited: false };
      }
    }

    const stack = [];
    let current = cells[0][0];
    current.visited = true;
    stack.push(current);

    while (stack.length > 0) {
      current = stack[stack.length - 1];
      const ns = this._unvisitedNeighbors(current, cells, cols, rows);
      if (ns.length === 0) { stack.pop(); continue; }
      const next = ns[Math.floor(Math.random() * ns.length)];
      this._removeWall(current, next);
      next.visited = true;
      stack.push(next);
    }
    return cells;
  },

  _unvisitedNeighbors(cell, cells, cols, rows) {
    const out = [];
    const { r, c } = cell;
    if (r > 0 && !cells[r-1][c].visited) out.push(cells[r-1][c]);
    if (c < cols-1 && !cells[r][c+1].visited) out.push(cells[r][c+1]);
    if (r < rows-1 && !cells[r+1][c].visited) out.push(cells[r+1][c]);
    if (c > 0 && !cells[r][c-1].visited) out.push(cells[r][c-1]);
    return out;
  },

  _removeWall(a, b) {
    const dr = b.r - a.r, dc = b.c - a.c;
    if (dr === 1)       { a.bottom = false; b.top = false; }
    else if (dr === -1) { a.top    = false; b.bottom = false; }
    else if (dc === 1)  { a.right  = false; b.left = false; }
    else if (dc === -1) { a.left   = false; b.right = false; }
  },

  // Returns true if there is NO wall between two ADJACENT cells.
  canMove(fromCell, toCell) {
    if (!fromCell || !toCell) return false;
    const dr = toCell.r - fromCell.r, dc = toCell.c - fromCell.c;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return false; // must be adjacent
    if (dr === 1)  return !fromCell.bottom;
    if (dr === -1) return !fromCell.top;
    if (dc === 1)  return !fromCell.right;
    if (dc === -1) return !fromCell.left;
    return false;
  },

  pickTheme() {
    return this.THEMES[Math.floor(Math.random() * this.THEMES.length)];
  },

  generateProblem(age) {
    const { cols, rows } = this.sizeForAge(age);
    const cells = this.generate(cols, rows);
    const theme = this.pickTheme();
    return {
      cells, cols, rows,
      start: { r: 0, c: 0 },
      end:   { r: rows - 1, c: cols - 1 },
      theme,
      path: [{ r: 0, c: 0 }],  // path always starts at start cell
    };
  },
};

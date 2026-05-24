// ════════════════════════════════════════════════════════════
// MEMORY GAME — Match-the-cards
// Kid sees a grid of face-down cards, flips two at a time, matches all pairs.
// ════════════════════════════════════════════════════════════

const Memory = {
  SYMBOL_POOL: ['🐱','🐶','🐰','🐯','🐼','🦁','🐸','🐧','🐢','🦊','🐻','🐮','🐷','🐵','🦒','🐬'],

  pairsForAge(age) {
    if (age <= 6) return 6;     // 12 cards, 3×4 grid
    if (age <= 9) return 8;     // 16 cards, 4×4 grid
    return 10;                  // 20 cards, 4×5 grid
  },

  gridDimsForPairs(pairs) {
    if (pairs <= 6) return { cols: 3, rows: 4 };
    if (pairs <= 8) return { cols: 4, rows: 4 };
    return { cols: 4, rows: 5 };
  },

  generateCards(pairs) {
    const symbols = [...this.SYMBOL_POOL]
      .sort(() => Math.random() - 0.5)
      .slice(0, pairs);
    const deck = [];
    symbols.forEach((sym, i) => {
      deck.push({ id: i * 2,     symbol: sym, revealed: false, matched: false });
      deck.push({ id: i * 2 + 1, symbol: sym, revealed: false, matched: false });
    });
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // Reassign ids so they remain unique after shuffle
    return deck.map((c, idx) => ({ ...c, id: idx }));
  },

  allMatched(cards) {
    return cards.every(c => c.matched);
  },
};

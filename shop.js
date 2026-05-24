// ════════════════════════════════════════════════════════════
// MONEY SHOP — Hakim's little shop. Kid sees an item with a price,
// then taps coins to make EXACTLY that amount.
// Teaches addition + money handling for ages 5-13.
// ════════════════════════════════════════════════════════════

const Shop = {
  // 12 kid-friendly products with prices in "dirhams" (generic currency)
  ITEMS: [
    { emoji: '🍎', name_ar: 'تفاحة',  name_en: 'Apple',     price: 3 },
    { emoji: '🍌', name_ar: 'موزة',    name_en: 'Banana',    price: 2 },
    { emoji: '🍫', name_ar: 'شوكولاتة', name_en: 'Chocolate', price: 5 },
    { emoji: '🥤', name_ar: 'عصير',    name_en: 'Juice',     price: 4 },
    { emoji: '🍪', name_ar: 'بسكويت',  name_en: 'Cookie',    price: 6 },
    { emoji: '🍩', name_ar: 'دونات',   name_en: 'Donut',     price: 7 },
    { emoji: '🧊', name_ar: 'آيس كريم', name_en: 'Ice cream', price: 8 },
    { emoji: '🎈', name_ar: 'بالون',   name_en: 'Balloon',   price: 9 },
    { emoji: '🪀', name_ar: 'لعبة',    name_en: 'Toy',       price: 10 },
    { emoji: '✏️', name_ar: 'قلم',     name_en: 'Pencil',    price: 2 },
    { emoji: '📚', name_ar: 'كتاب',    name_en: 'Book',      price: 11 },
    { emoji: '⚽', name_ar: 'كرة',     name_en: 'Ball',      price: 12 },
  ],

  // 3 coin denominations — small enough to compose any small price
  COINS: [
    { value: 1,  color: '#92400E', emoji: '🟫' },  // brown bronze
    { value: 5,  color: '#9CA3AF', emoji: '⚪' },  // silver
    { value: 10, color: '#FACC15', emoji: '🟡' },  // gold
  ],

  // Older kids handle larger prices
  priceMaxForAge(age) {
    if (age <= 6) return 5;
    if (age <= 9) return 10;
    return 20;
  },

  generateProblem(age) {
    const maxPrice = this.priceMaxForAge(age);
    const eligible = this.ITEMS.filter(i => i.price <= maxPrice);
    const item = eligible[Math.floor(Math.random() * eligible.length)];
    return {
      item,
      paid: 0,              // running total the kid has put down
      coinsPlaced: [],      // sequence of coin values placed (for visual + undo)
    };
  },

  // Add a coin to the wallet; returns 'exact' | 'short' | 'over'
  addCoin(problem, coinValue) {
    const newTotal = problem.paid + coinValue;
    if (newTotal > problem.item.price) return 'over';
    problem.paid = newTotal;
    problem.coinsPlaced.push(coinValue);
    if (newTotal === problem.item.price) return 'exact';
    return 'short';
  },

  removeLastCoin(problem) {
    const v = problem.coinsPlaced.pop();
    if (v !== undefined) problem.paid -= v;
  },
};

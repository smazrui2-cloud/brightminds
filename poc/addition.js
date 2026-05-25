// ════════════════════════════════════════════════════════════
// ADDITION subject — Visual counting
// Kid sees two groups of apples → taps each one to count → writes answer.
// Reuses the existing canvas, intersection-style tap detection, and write phase.
// ════════════════════════════════════════════════════════════

const Addition = {
  // Always show apples — matches the "Hakim is making apple pie" story narration.
  // Mixing symbols (flowers/stars/fish) breaks the audio + text instructions.
  SYMBOLS: ['🍎'],

  generateProblem(age) {
    // Smaller numbers than multiply because addition is taught earlier
    let max;
    if (age <= 6) max = 4;
    else if (age <= 8) max = 6;
    else if (age <= 10) max = 9;
    else max = 12;
    const a = randInt(1, max);
    const b = randInt(1, max);
    return { num1: a, num2: b };
  },

  // Lay out objects on canvas: num1 on left, num2 on right.
  // Returns array of objects: {x, y, symbol, group, tapped, tapOrder}
  placeObjects(num1, num2, canvasRect) {
    const W = canvasRect.width;
    const H = canvasRect.height;
    const symbol = this.SYMBOLS[Math.floor(Math.random() * this.SYMBOLS.length)];
    const objects = [];

    // Each group fills 40% of width; centered around 22% and 78%
    const place = (count, centerX, group) => {
      const cellSize = 56;
      const maxCols = Math.min(3, count);
      const cols = Math.min(maxCols, count);
      const rows = Math.ceil(count / cols);
      const gridW = cols * cellSize;
      const gridH = rows * cellSize;
      const startX = centerX - gridW / 2 + cellSize / 2;
      const startY = (H - gridH) / 2 + cellSize / 2;
      for (let i = 0; i < count; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        objects.push({
          x: startX + c * cellSize,
          y: startY + r * cellSize,
          symbol,
          group,
          tapped: false,
          tapOrder: 0,
        });
      }
    };
    place(num1, W * 0.25, 'left');
    place(num2, W * 0.75, 'right');
    return objects;
  },

  drawCanvas(ctx, rect, objects, activeStroke) {
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (!objects || !objects.length) return;

    // Soft separator + "+" between groups
    const midX = rect.width / 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(midX, 18);
    ctx.lineTo(midX, rect.height - 18);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
    ctx.font = 'bold 30px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', midX, rect.height / 2);
    ctx.restore();

    // Draw each object
    objects.forEach((o) => {
      ctx.save();
      // Glow halo if tapped
      if (o.tapped) {
        ctx.shadowColor = '#34D399';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(52, 211, 153, 0.18)';
        ctx.arc(o.x, o.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // Symbol
      ctx.font = '38px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = o.tapped ? 1.0 : 0.92;
      ctx.fillText(o.symbol, o.x, o.y);
      // Tap order number above
      if (o.tapped) {
        ctx.fillStyle = '#34D399';
        ctx.font = 'bold 14px Tajawal, sans-serif';
        ctx.shadowColor = '#34D399';
        ctx.shadowBlur = 8;
        ctx.fillText(o.tapOrder, o.x, o.y - 32);
      }
      ctx.restore();
    });
  },

  // Returns the tapped object or null
  handleTap(pt, objects) {
    let nearest = null;
    let minDist = 30;
    objects.forEach((o) => {
      if (o.tapped) return;
      const d = Math.hypot(o.x - pt.x, o.y - pt.y);
      if (d < minDist) { minDist = d; nearest = o; }
    });
    if (nearest) {
      const order = objects.filter(o => o.tapped).length + 1;
      nearest.tapped = true;
      nearest.tapOrder = order;
    }
    return nearest;
  },
};

import { useEffect, useRef, useState } from 'react';

/**
 * MultiplyGame — port of poc/app.js multiply phase logic to React.
 *
 * Flow: draw N vertical lines → draw M horizontal lines → count intersections
 *       → write the answer with dot-to-dot.
 *
 * The actual drawing logic uses HTML5 Canvas + Pointer Events — see
 * poc/app.js (the original is ~400 lines) for the algorithm. This file
 * is the React shell that wraps it.
 */
export default function MultiplyGame({ onWin }) {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('draw-vertical');

  useEffect(() => {
    // Initialize the canvas + register pointer handlers (port from poc/app.js)
    const canvas = canvasRef.current;
    // … line-fitting, intersection counting, etc.
  }, []);

  return (
    <div className="game-multiply">
      <div className="problem-card">
        {/* num1 × num2 = ? */}
      </div>
      <div className="canvas-wrap">
        <canvas ref={canvasRef} />
      </div>
      <div className="actions-row">
        <button className="btn-ghost danger">🗑️ مسح</button>
        <button className="btn-ghost" onClick={() => onWin(15)}>التالي ←</button>
      </div>
    </div>
  );
}

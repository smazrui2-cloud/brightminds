import { useState, useCallback } from 'react';
import { Sound } from '../utils/sounds.js';

/**
 * useSession — manages a "5 exercises in a row" session.
 *
 * Call `advance(scoreDelta)` from the game when the kid wins an exercise.
 * After the last one, fires `onSessionEnd()` so the parent screen can show
 * the celebration overlay.
 */
export function useSession({ totalExercises = 5, onSessionEnd }) {
  const [current, setCurrent] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mood, setMood] = useState('idle');

  const advance = useCallback((scoreDelta = 10) => {
    setTotalScore(s => s + scoreDelta);
    setCorrectCount(c => c + 1);
    setMood('cheering');
    Sound.applause();
    setTimeout(() => Sound.encouragement(), 300);

    const next = current + 1;
    if (next >= totalExercises) {
      setTimeout(() => onSessionEnd?.({ totalScore: totalScore + scoreDelta, correctCount: correctCount + 1 }), 1500);
    } else {
      setTimeout(() => { setCurrent(next); setMood('thinking'); }, 1500);
    }
  }, [current, totalExercises, onSessionEnd, totalScore, correctCount]);

  return { current, total: totalExercises, totalScore, correctCount, mood, advance };
}

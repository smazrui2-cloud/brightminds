import { useGameState } from '../hooks/useGameState.jsx';
import { useSession } from '../hooks/useSession.js';
import Mascot from '../components/Mascot.jsx';

// Lazy-loaded game components (each game owns its rendering + logic)
import MultiplyGame   from '../games/MultiplyGame.jsx';
import AdditionGame   from '../games/AdditionGame.jsx';
import LettersGame    from '../games/LettersGame.jsx';
import MemoryGame     from '../games/MemoryGame.jsx';
import FindLetterGame from '../games/FindLetterGame.jsx';
import ColorHuntGame  from '../games/ColorHuntGame.jsx';
import WordBuilderGame from '../games/WordBuilderGame.jsx';
import MazeGame       from '../games/MazeGame.jsx';
import PuzzleGame     from '../games/PuzzleGame.jsx';

const GAMES = {
  'multiply':     MultiplyGame,
  'add':          AdditionGame,
  'letters':      LettersGame,
  'memory':       MemoryGame,
  'find-letter':  FindLetterGame,
  'color-hunt':   ColorHuntGame,
  'word-builder': WordBuilderGame,
  'maze':         MazeGame,
  'puzzle':       PuzzleGame,
};

/**
 * LessonScreen = host for whichever game the user selected.
 * It owns the session counter (5 exercises) and the mascot.
 * The game component implements its own UI and notifies us via `onWin`.
 */
export default function LessonScreen({ onDone, onBack }) {
  const { state } = useGameState();
  const session = useSession({ totalExercises: 5, onSessionEnd: onDone });
  const Game = GAMES[state.subject] || MultiplyGame;

  return (
    <section className="screen active" id="screen-lesson">
      <div className="top-bar">
        <button className="icon-btn" onClick={onBack} aria-label="Close">✕</button>
        <div className="title-block">
          <div className="h1">🎮 درس BrightMinds</div>
          <div className="sub">تمرين {session.current + 1} من {session.total}</div>
        </div>
        <div className="badge score"><span>⭐</span><span>{session.totalScore}</span></div>
      </div>

      <div className="mascot-area">
        <Mascot mood={session.mood} />
        <div className="hero-badge">
          <div className="hero-title">⚔️ البطل {state.childName || 'الصغير'}</div>
          <div className="hero-quest">جلسة {session.current + 1}/{session.total}</div>
        </div>
      </div>

      <Game onWin={session.advance} />
    </section>
  );
}

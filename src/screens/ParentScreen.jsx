import { useGameState } from '../hooks/useGameState.jsx';

function formatTime(seconds) {
  if (!seconds || seconds < 60) return Math.round(seconds || 0) + ' ثانية';
  if (seconds < 3600) return Math.round(seconds / 60) + ' دقيقة';
  return Math.floor(seconds / 3600) + ' ساعة ' + Math.round((seconds % 3600) / 60) + ' دقيقة';
}

function computeLevel(stars) {
  if (stars >= 500) return '🚀 عبقري';
  if (stars >= 250) return '💎 ماستر';
  if (stars >= 120) return '🏆 خبير';
  if (stars >= 60)  return '⭐ ذكي';
  if (stars >= 20)  return '📘 متعلم';
  return '🌱 مبتدئ';
}

/**
 * Parent Dashboard — accessible only in Owner Mode (5-tap on logo).
 * Shows play time, learned words/letters, per-subject progress, weak areas.
 */
export default function ParentScreen({ onBack }) {
  const { state } = useGameState();
  const p = state.profile || {};
  const words = Object.entries(p.wordsLearned || {}).sort((a, b) => b[1] - a[1]);
  const letters = Object.entries(p.lettersLearned || {}).sort((a, b) => b[1] - a[1]);
  const perSubject = Object.entries(p.perSubject || {}).sort((a, b) => b[1].correctTotal - a[1].correctTotal);

  return (
    <section className="screen active" id="screen-parent">
      <div className="top-bar">
        <button className="icon-btn" onClick={onBack} aria-label="Back">‹</button>
        <div className="title-block">
          <div className="h1">👨‍👩‍👧 لوحة الأهل</div>
          <div className="sub">تقدم {state.childName || 'الطفل'}</div>
        </div>
      </div>

      <div className="parent-body">
        <div className="parent-hero">
          <div className="ph-avatar">{state.childName ? '👦' : '🧒'}</div>
          <div className="ph-info">
            <div className="ph-name">{state.childName || '—'}</div>
            <div className="ph-level">{computeLevel(p.totalStars || 0)}</div>
          </div>
        </div>

        <div className="parent-grid">
          <Tile emoji="⏱️" value={formatTime(p.totalPlaySeconds)} label="وقت اللعب" />
          <Tile emoji="📚" value={words.length}   label="كلمات تعلمها" />
          <Tile emoji="🔤" value={letters.length} label="حروف تعرفها" />
          <Tile emoji="⭐" value={p.totalStars || 0} label="إجمالي النجوم" cls="success" />
          <Tile emoji="🔥" value={(p.streak || 0) + ' يوم'} label="سلسلة الأيام" cls="streak" />
          <Tile emoji="🎮" value={p.sessionsPlayed || 0} label="جلسات مكتملة" />
        </div>

        {perSubject.length > 0 && (
          <>
            <div className="parent-section-title">تقدم في المواد</div>
            <div className="parent-list">
              {perSubject.map(([id, s]) => (
                <div key={id} className="pl-row">
                  <span className="pl-name">{id}</span>
                  <span className="pl-value">{s.correctTotal || 0} إجابة صحيحة</span>
                </div>
              ))}
            </div>
          </>
        )}

        {words.length > 0 && (
          <>
            <div className="parent-section-title">📚 كلمات تعلمها</div>
            <div className="parent-chips">
              {words.slice(0, 30).map(([w, n]) => (
                <span key={w} className="parent-chip">{w}<span className="count">×{n}</span></span>
              ))}
            </div>
          </>
        )}

        {letters.length > 0 && (
          <>
            <div className="parent-section-title">🔤 حروف تعرفها</div>
            <div className="parent-chips">
              {letters.slice(0, 30).map(([l, n]) => (
                <span key={l} className="parent-chip letter">{l}<span className="count">×{n}</span></span>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Tile({ emoji, value, label, cls }) {
  return (
    <div className={'parent-tile ' + (cls || '')}>
      <div className="pt-emoji">{emoji}</div>
      <div className="pt-value">{value}</div>
      <div className="pt-label">{label}</div>
    </div>
  );
}

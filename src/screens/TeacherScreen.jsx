import { useEffect, useState } from 'react';
import { useGameState } from '../hooks/useGameState.jsx';
import { CloudVoice } from '../utils/cloudVoice.js';
import { Sound } from '../utils/sounds.js';

/**
 * Pick a teacher voice (Salma / Shakir / Zariyah for Arabic;
 * Aria / Jenny / Guy for English). Tapping a card previews that voice.
 */
export default function TeacherScreen({ onDone, onBack }) {
  const { state, setState } = useGameState();
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    CloudVoice.init().then(() => setVoices(CloudVoice.voicesFor(state.language)));
  }, [state.language]);

  const pick = (v) => {
    Sound.init(); Sound.resume(); Sound.tap();
    setState(s => ({ ...s, teacherVoice: v.id }));
    CloudVoice.setVoice(state.language, v.id);
    CloudVoice.play('test_phrase', state.language);
  };

  return (
    <section className="screen active" id="screen-teacher">
      <div className="top-bar">
        <button className="icon-btn" onClick={onBack} aria-label="Back">‹</button>
        <div className="title-block">
          <div className="h1">اختر صوت المعلم</div>
          <div className="sub">اضغط أي معلم لتسمع صوته</div>
        </div>
      </div>
      <div className="teacher-grid">
        {voices.map(v => (
          <button key={v.id}
                  className={'teacher-card' + (state.teacherVoice === v.id ? ' selected' : '')}
                  onClick={() => pick(v)}>
            <div className="teacher-avatar">{v.avatar}</div>
            <div className="teacher-name">{state.language === 'ar' ? v.name_ar : v.name_en}</div>
            <div className="teacher-meta">{v.region} • {v.gender}</div>
          </button>
        ))}
      </div>
      <div className="bottom-bar">
        <button className="btn-primary" onClick={onDone}>متابعة ›</button>
      </div>
    </section>
  );
}

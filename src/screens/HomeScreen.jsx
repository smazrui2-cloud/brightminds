import { useGameState } from '../hooks/useGameState.jsx';
import { Sound } from '../utils/sounds.js';

/**
 * HomeScreen = the Language picker (the first screen the kid sees after splash).
 * Picking a language saves it and advances to the teacher-voice picker.
 */
export default function HomeScreen({ onDone }) {
  const { state, setState } = useGameState();

  const choose = (lang) => {
    Sound.init(); Sound.resume(); Sound.tap();
    setState(s => ({ ...s, language: lang }));
    setTimeout(onDone, 280);
  };

  return (
    <section className="screen active" id="screen-language">
      <div className="lang-wrap">
        <div className="logo small">💡</div>
        <h1 className="brand">BrightMinds</h1>
        <p className="lang-subtitle">اختر اللغة • Choose Language</p>
        <div className="lang-grid">
          <button className={'lang-card' + (state.language === 'ar' ? ' selected' : '')} onClick={() => choose('ar')}>
            <div className="flag">🇸🇦</div>
            <div className="name" lang="ar" dir="rtl">العربية</div>
            <div className="native">Arabic</div>
          </button>
          <button className={'lang-card' + (state.language === 'en' ? ' selected' : '')} onClick={() => choose('en')}>
            <div className="flag">🇺🇸</div>
            <div className="name" lang="en" dir="ltr">English</div>
            <div className="native">الإنجليزية</div>
          </button>
        </div>
      </div>
    </section>
  );
}

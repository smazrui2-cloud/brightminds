import { useEffect, useRef } from 'react';
import Mascot from '../components/Mascot.jsx';
import { Sound } from '../utils/sounds.js';

/**
 * Splash — animated logo + typed BrightMinds + Hakim welcome + welcome music.
 * Auto-transitions after 3.8s or on any tap (skip).
 */
export default function SplashScreen({ onDone }) {
  const brand = 'BrightMinds';
  const doneOnceRef = useRef(false);
  const finish = () => { if (!doneOnceRef.current) { doneOnceRef.current = true; onDone(); } };

  useEffect(() => {
    const id = setTimeout(finish, 3800);
    Sound.init(); Sound.resume();
    setTimeout(() => Sound.splashMelody(), 300);
    return () => clearTimeout(id);
  }, []);

  return (
    <section className="screen active" id="screen-splash" onClick={finish}>
      <div className="splash-bg">
        {[['12%','14%','0s','✨'], ['18%','78%','.3s','⭐'], ['35%','10%','.7s','✦'],
          ['62%','82%','1.1s','✨'], ['75%','18%','1.4s','⭐'], ['30%','88%','1.7s','✦']]
          .map(([top, left, delay, char], i) => (
            <span key={i} className="splash-star" style={{ top, left, animationDelay: delay }}>{char}</span>
          ))}
      </div>
      <div className="splash-center">
        <div className="splash-logo">💡</div>
        <h1 className="splash-brand">
          {brand.split('').map((c, i) => (
            <span key={i} className="splash-letter" style={{ animationDelay: (0.7 + i * 0.07) + 's' }}>{c}</span>
          ))}
        </h1>
        <div className="splash-tagline">تعليم ذكي للأطفال</div>
        <div className="splash-mascot-wrap"><Mascot mood="happy" bubble="مرحباً يا صديقي!" /></div>
        <div className="splash-progress"><div className="splash-progress-bar"></div></div>
      </div>
      <button className="splash-skip" onClick={(e) => { e.stopPropagation(); finish(); }}>تخطي ›</button>
    </section>
  );
}

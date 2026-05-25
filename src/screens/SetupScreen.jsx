import { useGameState } from '../hooks/useGameState.jsx';
import { Sound } from '../utils/sounds.js';

const SUBJECTS = [
  { id: 'multiply',    emoji: '✖️', name: 'الضرب الذكي',   desc: 'بطريقة الخطوط',   premium: false },
  { id: 'add',         emoji: '➕', name: 'الجمع',           desc: 'عدّ بصري',         premium: false },
  { id: 'letters',     emoji: '🔤', name: 'الحروف',          desc: 'طابق الحرف',       premium: false },
  { id: 'find-letter', emoji: '🔍', name: 'ابحث عن الحرف',  desc: 'داخل اللوحات',     premium: false },
  { id: 'memory',      emoji: '🧠', name: 'لعبة الذاكرة',    desc: 'طابق البطاقات',   premium: false },
  { id: 'color-hunt',  emoji: '🎨', name: 'صيد الألوان',     desc: 'طابق اللون',       premium: false },
  { id: 'word-builder',emoji: '🧱', name: 'تكوين الكلمات',  desc: 'رتّب الحروف',      premium: false },
  { id: 'maze',        emoji: '🌀', name: 'المتاهات',        desc: 'حل الألغاز',       premium: false },
  { id: 'puzzle',      emoji: '🧩', name: 'البازل',          desc: 'ركّب الصور',       premium: false },
  { id: 'money-shop',  emoji: '🏪', name: 'المتجر الصغير',  desc: 'جمع وطرح بالنقود', premium: true  },
];

export default function SetupScreen({ onDone, onBack }) {
  const { state, setState } = useGameState();

  return (
    <section className="screen active" id="screen-setup">
      <div className="top-bar">
        <button className="icon-btn" onClick={onBack} aria-label="Back">‹</button>
        <div className="title-block">
          <div className="h1">إعداد الجلسة</div>
          <div className="sub">اختر اسم الطفل وعمره والمادة</div>
        </div>
      </div>
      <div className="setup-content">
        <div>
          <div className="label">اسم الطفل (اختياري)</div>
          <input className="name-input"
                 value={state.childName || ''}
                 onChange={(e) => setState(s => ({ ...s, childName: e.target.value }))}
                 maxLength={30} placeholder="مثلاً: أحمد" />
        </div>
        <div>
          <div className="label">عمر الطفل</div>
          <div className="age-card">
            <div className="age-display">
              <span>{state.childAge ?? 7}</span><span className="unit"> سنوات</span>
            </div>
            <input className="age-slider" type="range" min={5} max={13} step={1}
                   value={state.childAge ?? 7}
                   onChange={(e) => setState(s => ({ ...s, childAge: +e.target.value }))} />
          </div>
        </div>
        <div>
          <div className="label">اختر المادة</div>
          <div className="subjects subjects-scroll">
            {SUBJECTS.map(s => (
              <div key={s.id}
                   className={'subject' + (state.subject === s.id ? ' selected' : '') + (s.premium ? ' premium' : '')}
                   onClick={() => { Sound.tap(); setState(st => ({ ...st, subject: s.id })); }}>
                <div className="emoji">{s.emoji}</div>
                <div className="name">{s.name}</div>
                <div className="desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bottom-bar">
        <button className="btn-primary" onClick={onDone}>ابدأ الجلسة ›</button>
      </div>
    </section>
  );
}

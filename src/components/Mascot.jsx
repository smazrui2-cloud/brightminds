/**
 * Hakim the Wise Owl — mascot SVG with 5 moods.
 * Port of poc/mascot.js to a stateless React component.
 *
 * Usage: <Mascot mood="happy" bubble="مرحباً!" />
 */
export default function Mascot({ mood = 'idle', bubble = '' }) {
  return (
    <div className="mascot-wrap">
      {bubble && <div className="mascot-bubble show">{bubble}</div>}
      <svg className={'mascot-svg mood-' + mood} viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg">
        <ellipse className="m-hatbrim" cx="60" cy="32" rx="28" ry="5" fill="#6D28D9"/>
        <polygon className="m-hatcone" points="34,32 60,2 86,32" fill="#A855F7"/>
        <polygon className="m-hatstar" points="60,4 62,9 67,9 63,12 65,17 60,14 55,17 57,12 53,9 58,9" fill="#FBBF24"/>
        <rect className="m-hatband" x="36" y="28" width="48" height="4" rx="2" fill="#7C3AED"/>
        <ellipse className="m-body"  cx="60" cy="78" rx="40" ry="42" fill="#7C3AED"/>
        <ellipse className="m-belly" cx="60" cy="86" rx="28" ry="30" fill="#DDD6FE"/>
        <ellipse className="m-wing-l" cx="20" cy="78" rx="10" ry="24" fill="#5B21B6" transform="rotate(-12, 20, 78)"/>
        <ellipse className="m-wing-r" cx="100" cy="78" rx="10" ry="24" fill="#5B21B6" transform="rotate(12, 100, 78)"/>
        <ellipse cx="48" cy="118" rx="6" ry="3" fill="#FBBF24"/>
        <ellipse cx="72" cy="118" rx="6" ry="3" fill="#FBBF24"/>
        <circle className="m-eyering-l" cx="45" cy="62" r="13" fill="#FFFFFF" stroke="#5B21B6" strokeWidth="1.5"/>
        <circle className="m-eyering-r" cx="75" cy="62" r="13" fill="#FFFFFF" stroke="#5B21B6" strokeWidth="1.5"/>
        <circle className="m-pupil-l" cx="45" cy="62" r="5" fill="#1F1B4B"/>
        <circle className="m-pupil-r" cx="75" cy="62" r="5" fill="#1F1B4B"/>
        <circle className="m-glint-l" cx="47" cy="60" r="1.6" fill="#FFFFFF"/>
        <circle className="m-glint-r" cx="77" cy="60" r="1.6" fill="#FFFFFF"/>
        <path className="m-eye-arc m-eye-arc-l" d="M 36 62 Q 45 70 54 62" stroke="#1F1B4B" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path className="m-eye-arc m-eye-arc-r" d="M 66 62 Q 75 70 84 62" stroke="#1F1B4B" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <polygon className="m-beak" points="60,68 53,77 67,77" fill="#FBBF24" stroke="#D97706" strokeWidth="1"/>
        <ellipse className="m-cheek-l" cx="35" cy="76" rx="5" ry="3" fill="#FB7185" opacity="0.55"/>
        <ellipse className="m-cheek-r" cx="85" cy="76" rx="5" ry="3" fill="#FB7185" opacity="0.55"/>
      </svg>
    </div>
  );
}

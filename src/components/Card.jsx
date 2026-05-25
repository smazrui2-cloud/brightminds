/**
 * Card — generic surface with the kid-friendly shadow + radius.
 * Used by setup tiles, parent dashboard tiles, language cards, etc.
 */
export default function Card({ children, className = '', selected, onClick }) {
  return (
    <div className={'card ' + (selected ? 'selected ' : '') + className} onClick={onClick}>
      {children}
    </div>
  );
}

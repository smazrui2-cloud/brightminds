import { Sound } from '../utils/sounds.js';

/**
 * Reusable button component — handles tap sound + accessibility.
 *
 * <Button variant="primary"|"secondary"|"ghost" onClick={...}>label</Button>
 */
export default function Button({ variant = 'primary', onClick, children, disabled, className = '', ...rest }) {
  const cls =
    variant === 'primary'   ? 'btn-primary' :
    variant === 'secondary' ? 'btn-secondary' :
    'btn-ghost';
  return (
    <button
      className={cls + ' ' + className}
      onClick={(e) => { Sound.tap(); onClick?.(e); }}
      disabled={disabled}
      {...rest}>
      {children}
    </button>
  );
}

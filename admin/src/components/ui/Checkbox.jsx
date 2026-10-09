import { forwardRef, useEffect, useRef } from 'react';

/**
 * A styled checkbox.
 *
 *   <Checkbox checked={isOn} onChange={e => setOn(e.target.checked)} />
 *   <Checkbox checked={isOn} onChange={...} label="Sync to Cloudflare" />
 *   <Checkbox checked={some} indeterminate={partial} onChange={...} />
 *
 * Props:
 *   checked        — controlled boolean
 *   indeterminate  — sets the "partial" state (dash instead of check)
 *   label          — optional text label beside the box
 *   disabled       — disable interaction
 *   size           — 'sm' | 'md' | 'lg' (default 'md')
 */
export const Checkbox = forwardRef(function Checkbox(
  {
    checked = false,
    indeterminate = false,
    onChange,
    label,
    disabled = false,
    size = 'md',
    className = '',
    ...rest
  },
  forwardedRef
) {
  const innerRef = useRef(null);

  // `indeterminate` is a DOM property, not an attribute — must be set imperatively
  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  // Merge forwarded ref with internal ref
  function setRef(el) {
    innerRef.current = el;
    if (typeof forwardedRef === 'function') forwardedRef(el);
    else if (forwardedRef) forwardedRef.current = el;
  }

  const sizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const boxSize = sizes[size] ?? sizes.md;

  return (
    <label
      className={`
        inline-flex items-center gap-2 cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <input
        ref={setRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`
          ${boxSize}
          rounded border-surface-border
          bg-surface-subtle text-brand-500
          accent-brand-500
          focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 focus:ring-offset-surface
          disabled:cursor-not-allowed
          transition-colors
          cursor-pointer
        `}
        {...rest}
      />
      {label && (
        <span className="text-sm text-ink select-none">{label}</span>
      )}
    </label>
  );
});
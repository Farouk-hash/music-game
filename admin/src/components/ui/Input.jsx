import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  { label, error, hint, className = '', id, ...rest },
  ref
) {
  const inputId = id || rest.name;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`
          w-full h-10 px-3 rounded-lg
          bg-surface-subtle text-ink placeholder:text-ink-subtle
          border ${error ? 'border-danger' : 'border-surface-border'}
          focus:outline-none focus:ring-2 ${error ? 'focus:ring-danger' : 'focus:ring-brand-500'} focus:border-transparent
          transition-shadow
          ${className}
        `}
        {...rest}
      />
      {hint && !error && <p className="text-xs text-ink-subtle">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
});
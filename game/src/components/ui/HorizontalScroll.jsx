// game/src/components/ui/HorizontalScroll.jsx

export function HorizontalScroll({
  children,
  className = '',
  size = 'md',
  hiddenScrollbar = true,
  itemMinWidth = '9rem', // Default for backward compatibility
}) {
  return (
    <div
      className={[
        'w-full max-w-full min-w-0',
        'overflow-x-auto flex gap-3 pb-3 snap-x snap-mandatory',
        // ✅ RESPONSIVE MIN-WIDTH: Smaller on mobile, larger on desktop
        `[&>*]:min-w-[5rem] sm:[&>*]:min-w-[${itemMinWidth}] [&>*]:shrink-0`,
        hiddenScrollbar ? 'scrollbar-hide' : 'custom-scrollbar',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
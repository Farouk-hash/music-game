// game/src/components/ui/HorizontalScroll.jsx

export function HorizontalScroll({ 
  children, 
  className = '', 
  size = 'md',
  hiddenScrollbar = true 
}) {
  const sizeMap = {
    sm: 'w-[80px]',
    md: 'w-[110px]',
    lg: 'w-[140px]',
  };

  const childWidth = sizeMap[size] || sizeMap.md;

  return (
    <div 
      className={[
        // 1. Container width constraints
        'w-full max-w-full min-w-0',
        // 2. Scroll and snap
        'overflow-x-auto flex gap-3 pb-3',
        'snap-x snap-mandatory',
        // 3. INCREASED PADDING: pl-4 pr-12 ensures last card fully scrolls into view
        'pl-1 pr-12', 
        // 4. Child sizing
        `[&>*]:shrink-0 [&>*]:${childWidth} sm:[&>*]:flex-1 sm:[&>*]:w-auto`,
        hiddenScrollbar ? 'scrollbar-hide' : 'custom-scrollbar',
        className
      ].join(' ')}
    >
      {children}
    </div>
  );
}
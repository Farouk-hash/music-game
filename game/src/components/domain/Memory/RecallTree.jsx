import React, { useMemo } from 'react';

export function RecallTree({ children, hasMultipleRounds, hasMultiQuestionRounds }) {
  // Group items by roundIndex for tree branches
  const groupedItems = useMemo(() => {
    const groups = new Map();
    React.Children.forEach(children, (child) => {
      if (!child?.props?.item) return;
      const ri = child.props.item.roundIndex;
      if (!groups.has(ri)) groups.set(ri, []);
      groups.get(ri).push(child);
    });
    return Array.from(groups.entries());
  }, [children]);

  return (
    <div className="relative pl-12 space-y-10">
      {/* Vertical trunk line */}
      {hasMultipleRounds && (
        <div className="absolute left-[19px] top-6 bottom-6 w-1 bg-border rounded-full" />
      )}

      {groupedItems.map(([roundIdx, items], groupIdx) => {
        const isLastGroup = groupIdx === groupedItems.length - 1;
        const isMultiQ = items.length > 1;

        return (
          <div key={roundIdx} className="relative">
            {/* Round connector node */}
            {hasMultipleRounds && (
              <div className="absolute -left-[37px] top-8 w-5 h-5 rounded-full bg-accent border-[3px] border-bg z-10 shadow-sm" />
            )}

            {/* Branch header */}
            {isMultiQ && (
              <div className="flex items-center gap-3 mb-4 ml-1">
                <div className="w-6 h-0.5 bg-border" />
                <span className="text-[11px] font-bold text-ink-subtle uppercase tracking-[0.15em]">
                  Round {roundIdx + 1} · {items.length} questions
                </span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            )}

            {/* Render children as branches */}
            <div className="space-y-5">
              {items.map((child, idx) => (
                <div key={child.key} className="relative flex items-start">
                  {/* Horizontal branch line */}
                  {hasMultiQuestionRounds && (
                    <div className="absolute -left-[25px] top-8 w-6 h-0.5 bg-border" />
                  )}
                  {child}
                </div>
              ))}
            </div>

            {/* Vertical connector to next group */}
            {!isLastGroup && hasMultipleRounds && (
              <div className="absolute -left-[19px] top-[calc(100%+12px)] w-1 h-10 bg-border rounded-full" />
            )}
          </div>
        );
      })}
    </div>
  );
}
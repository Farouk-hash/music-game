
export function EmptyState({
  icon = '📭',
  title = 'Nothing here',
  description = '',
  action = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      <div
        className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center text-3xl mb-4"
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-ink mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-ink-muted max-w-md mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}


{/* <EmptyState
  icon="🎵"
  title="No artists found"
  description="Try a different genre or check back later."
  action={<Button variant="secondary" onClick={reload}>Retry</Button>}
/> */}
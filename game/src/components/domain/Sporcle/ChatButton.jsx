// game/src/components/domain/Sporcle/ChatButton.jsx

/**
 * Chat entry point. Shows an unread count badge (messages from other
 * players that arrived after the last read).
 *
 *   <ChatButton unreadCount={3} onClick={() => setChatOpen(true)} />
 */
export function ChatButton({ unreadCount = 0, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      title="Chat"
      className={[
        'relative inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border text-xs font-medium transition-colors shrink-0',
        unreadCount > 0
          ? 'bg-accent-soft border-accent text-accent hover:bg-accent-soft'
          : 'bg-surface-2 border-border text-ink-muted hover:border-accent-2 hover:text-ink',
      ].join(' ')}
    >
      <svg
        viewBox="0 0 20 20"
        className="w-4 h-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 5h14v9H8l-5 4V5z" />
      </svg>
      <span>Chat</span>
      {unreadCount > 0 && (
        <span
          className="
            ml-0.5 inline-flex items-center justify-center
            min-w-[1.25rem] h-5 px-1 rounded-full
            bg-accent text-bg text-[10px] font-semibold tabular-nums
          "
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
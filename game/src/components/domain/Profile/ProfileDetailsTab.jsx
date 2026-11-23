import { IconWifiOff } from '@/icons/index.js';

export function ProfileDetailsTab({ 
  nickname, setNickname, 
  email, setEmail, 
  phone, setPhone,
  hasRecoveryCode, pendingRecoveryCode, showRecovery,
  isOnline 
}) {
  return (
    <div className="space-y-6">
      {/* Nickname Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Nickname</h3>
        <p className="text-xs text-ink-muted">Used to prefill your name when creating rooms or joining a game.</p>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={24}
          disabled={!isOnline}
          className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Your nickname"
        />
      </section>

      {/* Backup Contacts Section */}
      <section className="space-y-3 pt-2 border-t border-border">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Backup contacts</h3>
        <p className="text-xs text-ink-muted">Optional. Attach an email or phone so you can restore this profile later without needing the recovery code.</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink-subtle block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={!isOnline}
              className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs text-ink-subtle block mb-1">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+20 100 123 4567"
              disabled={!isOnline}
              className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </section>

      {/* Recovery Code Section */}
      <section className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Recovery code</h3>
          {hasRecoveryCode && !pendingRecoveryCode && (
            <button 
              type="button" 
              onClick={showRecovery} 
              disabled={!isOnline}
              className="text-xs text-ink-muted hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Show my recovery code
            </button>
          )}
        </div>
        {!hasRecoveryCode && (
          <p className="text-xs text-ink-subtle">No recovery code stored on this device.</p>
        )}
        {hasRecoveryCode && pendingRecoveryCode && (
          <p className="text-xs text-ink-muted">Your code is shown above.</p>
        )}
      </section>
    </div>
  );
}
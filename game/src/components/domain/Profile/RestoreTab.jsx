import { Button } from '@/components/ui/Button.jsx';
import { IconDownload, IconWifiOff } from '@/icons/index.js';

const RESTORE_MODE = { CODE: 'code', EMAIL: 'email', PHONE: 'phone' };

export function RestoreTab({
  restoreMode, setRestoreMode,
  recoveryInput, setRecoveryInput,
  emailInput, setEmailInput,
  phoneInput, setPhoneInput,
  recovering, canSubmitRestore, handleRecover, recoverError,
  isOnline
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Restore from another device</h3>
        <p className="text-xs text-ink-muted">Restore using your recovery code, email, or phone number.</p>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2">
        {[
          { key: RESTORE_MODE.CODE,  label: 'Code'  },
          { key: RESTORE_MODE.EMAIL, label: 'Email' },
          { key: RESTORE_MODE.PHONE, label: 'Phone' },
        ].map(m => (
          <button
            key={m.key}
            type="button"
            onClick={() => isOnline && setRestoreMode(m.key)}
            disabled={!isOnline || recovering}
            className={[
              'flex-1 h-10 rounded-md border text-sm font-medium transition-colors',
              restoreMode === m.key
                ? 'bg-accent text-bg border-accent'
                : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2',
              !isOnline && 'opacity-50 cursor-not-allowed'
            ].join(' ')}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Input + Submit Row */}
      <div className="flex gap-2">
        {restoreMode === RESTORE_MODE.CODE && (
          <input
            type="text"
            value={recoveryInput}
            onChange={(e) => setRecoveryInput(e.target.value.toUpperCase().slice(0, 8))}
            placeholder="NZP6RE6B"
            maxLength={8}
            disabled={!isOnline || recovering}
            className="flex-1 h-11 rounded-md border border-border bg-surface-2 px-3 text-ink font-mono tracking-[0.3em] placeholder:text-ink-subtle focus:border-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        )}
        {restoreMode === RESTORE_MODE.EMAIL && (
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="you@example.com"
            disabled={!isOnline || recovering}
            className="flex-1 h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        )}
        {restoreMode === RESTORE_MODE.PHONE && (
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="+20 100 123 4567"
            disabled={!isOnline || recovering}
            className="flex-1 h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        )}
        
        <Button 
          variant="primary" 
          onClick={handleRecover} 
          disabled={!canSubmitRestore || recovering || !isOnline}
        >
          {recovering ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin" />
              <span className="hidden sm:inline">Restoring…</span>
            </span>
          ) : !isOnline ? (
            <span className="inline-flex items-center gap-2">
              <IconWifiOff className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Offline</span>
            </span>
          ) : (
            <>
              <IconDownload className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Restore</span>
            </>
          )}
        </Button>
      </div>

      {recoverError && <p className="text-sm text-wrong">{recoverError.message}</p>}

      {/* Info Box */}
      <div className="rounded-md border border-border bg-surface-2 p-3 space-y-1">
        <p className="text-xs font-semibold text-ink">What happens?</p>
        <ul className="text-xs text-ink-muted space-y-0.5 list-disc list-inside">
          <li>This device switches to the recovered profile.</li>
          <li>Your current profile stays on the server.</li>
          <li>The recovered profile's code is not transferred.</li>
        </ul>
      </div>
    </section>
  );
}
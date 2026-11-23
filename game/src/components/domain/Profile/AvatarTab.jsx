import { PlayerAvatar } from '../../Avatar/PlayerAvatar.jsx';
import { AVATAR_STYLES } from '../../Avatar/AvatarProvider.jsx';
import { IconWifiOff } from '@/icons/index.js';
import { Button } from '@/components/ui/Button.jsx';

export function AvatarTab({ 
  usingUploaded, uploadedUrl, handleRemoveUploaded,
  avatarStyle, setAvatarStyle, avatarSeed, nickname,
  uploading, handleUpload, isOnline 
}) {
  return (
    <section className="space-y-4">
      {usingUploaded ? (
        <div className="flex items-center gap-4">
          <img src={uploadedUrl} alt="" width={64} height={64} className="rounded-full ring-1 ring-border" />
          <div className="flex-1">
            <p className="text-sm text-ink">Uploaded photo</p>
            <p className="text-xs text-ink-muted">You're using a custom image.</p>
          </div>
          <Button variant="secondary" onClick={handleRemoveUploaded} disabled={!isOnline}>
            Remove
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-ink-muted">Pick a style. The avatar is generated from your nickname.</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {AVATAR_STYLES.map((s) => {
              const active = avatarStyle === s.slug;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => isOnline && setAvatarStyle(s.slug)}
                  aria-pressed={active}
                  title={s.label}
                  disabled={!isOnline}
                  className={[
                    'p-2 rounded-md border transition-colors',
                    active ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2 hover:border-accent-2',
                    !isOnline && 'opacity-50 cursor-not-allowed'
                  ].join(' ')}
                >
                  <PlayerAvatar seed={avatarSeed || nickname || 'player'} style={s.slug} size={48} />
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Upload Section */}
      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Or upload a photo</h3>
        <p className="text-xs text-ink-muted">JPG, PNG, or WebP. Up to 256 KB.</p>
        <label
          className={[
            'inline-flex items-center gap-2 px-4 h-10 rounded-md border text-sm transition-colors',
            uploading || !isOnline
              ? 'border-border bg-surface-2 text-ink-subtle cursor-not-allowed opacity-50'
              : 'border-border bg-surface-2 text-ink-muted hover:border-accent-2 hover:text-ink cursor-pointer',
          ].join(' ')}
        >
          <input 
            type="file" 
            accept="image/jpeg,image/png,image/webp" 
            onChange={handleUpload} 
            disabled={uploading || !isOnline} 
            className="hidden" 
          />
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Uploading…
            </span>
          ) : !isOnline ? (
            <span className="inline-flex items-center gap-2">
              <IconWifiOff className="w-4 h-4" />
              Offline
            </span>
          ) : 'Choose file'}
        </label>
      </div>
    </section>
  );
}
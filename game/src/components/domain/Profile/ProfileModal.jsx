// game/src/components/domain/Profile/ProfileModal.jsx
import { useEffect, useState } from 'react';
import { Modal } from '../../Modal/Modal.jsx';
import { Button } from '../../ui/Button.jsx';
import { PlayerAvatar } from '../../Avatar/PlayerAvatar.jsx';
import { AVATAR_STYLES } from '../../Avatar/AvatarProvider.jsx';
import { useProfileContext } from '../../../context/ProfileContext.jsx';
import { absoluteAvatarUrl } from '../../../lib/profileApi.js';
import { FavoritesTab } from './FavoritesTab.jsx';

const TABS = [
  { key: 'profile',   label: 'Profile' },
  { key: 'avatar',    label: 'Avatar' },
  { key: 'favorites', label: 'Favourites' },
  { key: 'restore',   label: 'Restore' },
];

export function ProfileModal({ open, onClose }) {
  const {
    profile,
    save,
    uploadAvatar,
    removeUploadedAvatar,
    recoverProfile,
    pendingRecoveryCode,
    hasRecoveryCode,
    dismissRecovery,
    showRecovery,
  } = useProfileContext();

  const [tab, setTab] = useState('profile');
  const [nickname, setNickname] = useState('');
  const [avatarStyle, setAvatarStyle] = useState(null);
  const [avatarSeed, setAvatarSeed] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);   // null | 'saved' | 'no-changes'

  // Restore-from-code state
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [recoverError, setRecoverError] = useState(null);

  useEffect(() => {
    if (!open) return;

    setTab('profile');
    setSaving(false);
    setUploading(false);
    setSaveStatus(null);
    setError(null);
    setRecoveryInput('');
    setRecovering(false);
    setRecoverError(null);

    if (profile) {
      setNickname(profile.nickname ?? '');
      setAvatarStyle(profile.avatar?.style ?? null);
      setAvatarSeed(profile.avatar?.seed ?? profile.nickname ?? '');
    }
  }, [profile?.id, open]);

  if (!profile) return null;

  const uploadedUrl = absoluteAvatarUrl(profile);
  const usingUploaded = !!uploadedUrl;

  async function handleSave() {
    // ── Dirty check ──────────────────────────────────────────
    // Save only calls the server when something actually changed.
    const nicknameChanged =
      nickname.trim() !== (profile.nickname ?? '');

    const generatedAvatarChanged =
      !usingUploaded && (
        avatarStyle !== (profile.avatar?.style ?? null) ||
        avatarSeed !== (profile.avatar?.seed ?? profile.nickname ?? '')
      );

    const dirty = nicknameChanged || generatedAvatarChanged;

    if (!dirty) {
      setSaveStatus('no-changes');
      setTimeout(() => {
        setSaveStatus(null);
        onClose();
      }, 800);
      return;
    }

    // ── Real save ────────────────────────────────────────────
    setSaving(true);
    setError(null);
    try {
      const payload = { nickname: nickname.trim() };

      if (!usingUploaded) {
        payload.avatar = {
          kind: 'generated',
          style: avatarStyle,
          seed: avatarSeed || nickname.trim(),
        };
      }

      await save(payload);

      setSaveStatus('saved');
      setSaving(false);
      setTimeout(() => {
        setSaveStatus(null);
        onClose();
      }, 600);
    } catch (e) {
      setError(e);
      setSaving(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const resized = await resizeImageToSquare(file, 256);
      await uploadAvatar(resized);
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleRemoveUploaded() {
    try {
      await removeUploadedAvatar();
    } catch (e) {
      setError(e);
    }
  }

  async function handleRecover() {
    const code = recoveryInput.trim().toUpperCase();
    if (code.length !== 8) return;

    setRecovering(true);
    setRecoverError(null);
    try {
      await recoverProfile(code);
      setRecoveryInput('');
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus(null);
        onClose();
      }, 600);
    } catch (e) {
      setRecoverError(e);
      setRecovering(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              Profile
            </p>
            <h2 className="text-xl font-bold text-ink mt-1">{profile.nickname}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-subtle hover:text-ink text-sm shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {/* Recovery code banner */}
        {pendingRecoveryCode && tab === 'profile' && (
          <div className="rounded-md border border-highlight bg-surface-2 p-4 space-y-2">
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              Your recovery code
            </p>
            <p className="text-2xl font-mono font-bold text-ink tracking-[0.3em]">
              {pendingRecoveryCode}
            </p>
            <p className="text-xs text-ink-muted">
              Use this code to access your profile from another device.
              Store it somewhere safe.
            </p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={dismissRecovery}>
                Hide
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={[
                'px-4 h-10 rounded-md border text-sm font-medium transition-colors',
                tab === t.key
                  ? 'bg-accent text-bg border-accent'
                  : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-wrong bg-wrong-soft p-3">
            <p className="text-sm text-wrong">{error.message}</p>
          </div>
        )}

        {tab === 'profile' && (
          <div className="space-y-6">
            {/* Nickname */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                Nickname
              </h3>
              <p className="text-xs text-ink-muted">
                Used to prefill your name when creating rooms or joining a game.
              </p>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={24}
                className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
                placeholder="Your nickname"
              />
            </section>

            {/* Recovery code section */}
            <section className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                  Recovery code
                </h3>
                {hasRecoveryCode && !pendingRecoveryCode && (
                  <button
                    type="button"
                    onClick={showRecovery}
                    className="text-xs text-ink-muted hover:text-ink transition-colors"
                  >
                    Show my recovery code
                  </button>
                )}
              </div>

              {!hasRecoveryCode && (
                <p className="text-xs text-ink-subtle">
                  No recovery code is stored on this device. Codes are only
                  available on the device that created the profile.
                </p>
              )}

              {hasRecoveryCode && pendingRecoveryCode && (
                <p className="text-xs text-ink-muted">
                  Your code is shown above. Click <span className="text-ink">Hide</span> to
                  collapse it — the code stays on this device and can be
                  revealed again with the button above.
                </p>
              )}
            </section>
          </div>
        )}

        {tab === 'avatar' && (
          <section className="space-y-4">
            {usingUploaded ? (
              <div className="flex items-center gap-4">
                <img
                  src={uploadedUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="rounded-full ring-1 ring-border"
                />
                <div className="flex-1">
                  <p className="text-sm text-ink">Uploaded photo</p>
                  <p className="text-xs text-ink-muted">
                    You're using a custom image.
                  </p>
                </div>
                <Button variant="secondary" onClick={handleRemoveUploaded}>
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs text-ink-muted">
                  Pick a style. The avatar is generated from your nickname.
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {AVATAR_STYLES.map((s) => {
                    const active = avatarStyle === s.slug;
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => setAvatarStyle(s.slug)}
                        aria-pressed={active}
                        title={s.label}
                        className={[
                          'p-2 rounded-md border transition-colors',
                          active
                            ? 'border-accent bg-accent-soft'
                            : 'border-border bg-surface-2 hover:border-accent-2',
                        ].join(' ')}
                      >
                        <PlayerAvatar
                          seed={avatarSeed || nickname || 'player'}
                          style={s.slug}
                          size={48}
                        />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                Or upload a photo
              </h3>
              <p className="text-xs text-ink-muted">JPG, PNG, or WebP. Up to 256 KB.</p>
              <label
                className={[
                  'inline-flex items-center gap-2 px-4 h-10 rounded-md border text-sm cursor-pointer transition-colors',
                  uploading
                    ? 'border-border bg-surface-2 text-ink-subtle cursor-wait'
                    : 'border-border bg-surface-2 text-ink-muted hover:border-accent-2 hover:text-ink',
                ].join(' ')}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Uploading…
                  </span>
                ) : (
                  'Choose file'
                )}
              </label>
            </div>
          </section>
        )}

        {tab === 'favorites' && <FavoritesTab />}

        {tab === 'restore' && (
          <section className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
                Restore from another device
              </h3>
              <p className="text-xs text-ink-muted">
                Enter a recovery code to load a different profile on this
                device. Your current profile stays on the server — you can
                return to it with its own recovery code.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={recoveryInput}
                onChange={(e) =>
                  setRecoveryInput(e.target.value.toUpperCase().slice(0, 8))
                }
                placeholder="NZP6RE6B"
                maxLength={8}
                autoCapitalize="characters"
                autoComplete="off"
                disabled={recovering}
                className="flex-1 h-11 rounded-md border border-border bg-surface-2 px-3 text-ink font-mono tracking-[0.3em] placeholder:text-ink-subtle focus:border-accent focus:outline-none disabled:opacity-50"
              />
              <Button
                variant="primary"
                onClick={handleRecover}
                disabled={recoveryInput.trim().length !== 8 || recovering}
              >
                {recovering ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Restoring…
                  </span>
                ) : (
                  'Restore'
                )}
              </Button>
            </div>

            {recoverError && (
              <p className="text-sm text-wrong">{recoverError.message}</p>
            )}

            <div className="rounded-md border border-border bg-surface-2 p-3 space-y-1">
              <p className="text-xs font-semibold text-ink">What happens?</p>
              <ul className="text-xs text-ink-muted space-y-0.5 list-disc list-inside">
                <li>This device switches to the recovered profile.</li>
                <li>Your current profile stays on the server.</li>
                <li>
                  The recovered profile's code is not transferred — it was
                  shown once on the original device.
                </li>
              </ul>
            </div>
          </section>
        )}

        <footer className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-ink-subtle">
            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-correct bg-correct-soft text-correct">
                ✓ Saved
              </span>
            )}
            {saveStatus === 'no-changes' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-surface-2 text-ink-muted">
                No changes to save
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Saving…
                </span>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
   Image resize helper — runs entirely in the browser.
   ───────────────────────────────────────────────────────────── */

async function resizeImageToSquare(file, size = 256) {
  const source = await loadImage(file);

  const minSide = Math.min(source.width, source.height);
  const sx = (source.width  - minSide) / 2;
  const sy = (source.height - minSide) / 2;

  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, sx, sy, minSide, minSide, 0, 0, size, size);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode image'))),
      'image/jpeg',
      0.85
    );
  });

  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
}

async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {}
  }

  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
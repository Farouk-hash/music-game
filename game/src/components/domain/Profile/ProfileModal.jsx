// game/src/components/domain/Profile/ProfileModal.jsx
import { useEffect, useState } from 'react';
import { Modal } from '../../Modal/Modal.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { PlayerAvatar } from '../../Avatar/PlayerAvatar.jsx';
import { AVATAR_STYLES } from '../../Avatar/AvatarProvider.jsx';
import { useProfileContext } from '@/context/ProfileContext.jsx';
import { absoluteAvatarUrl } from '@/lib/profileApi.js';
import { FavoritesTab } from './FavoritesTab.jsx';
import { resizeImageToSquare } from '@/lib/imageResize.js';
import { TabStrip } from '@/components/ui/TabStrip.jsx';
import { IconClose, IconCheck, IconDownload } from '@/icons/index.js';

const TABS = [
  { key: 'profile',   label: 'Profile' },
  { key: 'avatar',    label: 'Avatar' },
  { key: 'favorites', label: 'Favourites' },
  { key: 'restore',   label: 'Restore' },
];

const RESTORE_MODE = { CODE: 'code', EMAIL: 'email', PHONE: 'phone' };

export function ProfileModal({ open, onClose }) {
  const {
    profile, save, uploadAvatar, removeUploadedAvatar, recoverProfile,
    pendingRecoveryCode, hasRecoveryCode, dismissRecovery, showRecovery,
  } = useProfileContext();

  const [tab, setTab] = useState('profile');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarStyle, setAvatarStyle] = useState(null);
  const [avatarSeed, setAvatarSeed] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  const [restoreMode, setRestoreMode] = useState(RESTORE_MODE.CODE);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [recoverError, setRecoverError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setTab('profile');
    setSaving(false);
    setUploading(false);
    setSaveStatus(null);
    setError(null);
    setRestoreMode(RESTORE_MODE.CODE);
    setRecoveryInput('');
    setEmailInput('');
    setPhoneInput('');
    setRecovering(false);
    setRecoverError(null);

    if (profile) {
      setNickname(profile.nickname ?? '');
      setEmail(profile.email ?? '');
      setPhone(profile.phone ?? '');
      setAvatarStyle(profile.avatar?.style ?? null);
      setAvatarSeed(profile.avatar?.seed ?? profile.nickname ?? '');
    }
  }, [profile?.id, open]);

  if (!profile) return null;

  const uploadedUrl = absoluteAvatarUrl(profile);
  const usingUploaded = !!uploadedUrl;

  async function handleSave() {
    const nicknameChanged = nickname.trim() !== (profile.nickname ?? '');
    const emailChanged = (email.trim().toLowerCase()) !== (profile.email ?? '');
    const phoneChanged = (phone.trim()) !== (profile.phone ?? '');
    const generatedAvatarChanged =
      !usingUploaded && (
        avatarStyle !== (profile.avatar?.style ?? null) ||
        avatarSeed !== (profile.avatar?.seed ?? profile.nickname ?? '')
      );

    const dirty = nicknameChanged || emailChanged || phoneChanged || generatedAvatarChanged;

    if (!dirty) {
      setSaveStatus('no-changes');
      setTimeout(() => { setSaveStatus(null); onClose(); }, 800);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        nickname: nickname.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
      };

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
      setTimeout(() => { setSaveStatus(null); onClose(); }, 600);
    } catch (e) {
      setError(e);
      setSaving(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
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
    try { await removeUploadedAvatar(); } catch (e) { setError(e); }
  }

  async function handleRecover() {
    setRecovering(true);
    setRecoverError(null);
    try {
      if (restoreMode === RESTORE_MODE.CODE) {
        const code = recoveryInput.trim().toUpperCase();
        if (code.length !== 8) throw new Error('Code must be 8 characters');
        await recoverProfile({ recoveryCode: code });
      } else if (restoreMode === RESTORE_MODE.EMAIL) {
        await recoverProfile({ email: emailInput.trim().toLowerCase() });
      } else if (restoreMode === RESTORE_MODE.PHONE) {
        await recoverProfile({ phone: phoneInput.trim() });
      }
      setSaveStatus('saved');
      setTimeout(() => { setSaveStatus(null); onClose(); }, 600);
    } catch (e) {
      setRecoverError(e);
      setRecovering(false);
    }
  }

  const canSubmitRestore =
    restoreMode === RESTORE_MODE.CODE
      ? recoveryInput.trim().length === 8
      : restoreMode === RESTORE_MODE.EMAIL
        ? emailInput.trim().length > 0
        : phoneInput.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Profile</p>
            <h2 className="text-xl font-bold text-ink mt-1">{profile.nickname}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-ink-subtle hover:text-ink text-sm shrink-0" aria-label="Close">
            <IconClose className="w-4 h-4" />
          </button>
        </header>

        {pendingRecoveryCode && tab === 'profile' && (
          <div className="rounded-md border border-highlight bg-surface-2 p-4 space-y-2">
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Your recovery code</p>
            <p className="text-2xl font-mono font-bold text-ink tracking-[0.3em]">{pendingRecoveryCode}</p>
            <p className="text-xs text-ink-muted">Use this code — or your saved email / phone — to access your profile from another device.</p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={dismissRecovery}>Hide</Button>
            </div>
          </div>
        )}

        <TabStrip tabs={TABS} value={tab} onChange={setTab} cols={4} mode="grid" />

        {error && (
          <div className="rounded-md border border-wrong bg-wrong-soft p-3">
            <p className="text-sm text-wrong">{error.message}</p>
          </div>
        )}

        {tab === 'profile' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Nickname</h3>
              <p className="text-xs text-ink-muted">Used to prefill your name when creating rooms or joining a game.</p>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={24}
                className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
                placeholder="Your nickname"
              />
            </section>

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
                    className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-subtle block mb-1">Phone number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+20 100 123 4567"
                    className="w-full h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Recovery code</h3>
                {hasRecoveryCode && !pendingRecoveryCode && (
                  <button type="button" onClick={showRecovery} className="text-xs text-ink-muted hover:text-ink transition-colors">
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
        )}

        {tab === 'avatar' && (
          <section className="space-y-4">
            {usingUploaded ? (
              <div className="flex items-center gap-4">
                <img src={uploadedUrl} alt="" width={64} height={64} className="rounded-full ring-1 ring-border" />
                <div className="flex-1">
                  <p className="text-sm text-ink">Uploaded photo</p>
                  <p className="text-xs text-ink-muted">You're using a custom image.</p>
                </div>
                <Button variant="secondary" onClick={handleRemoveUploaded}>Remove</Button>
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
                        onClick={() => setAvatarStyle(s.slug)}
                        aria-pressed={active}
                        title={s.label}
                        className={[
                          'p-2 rounded-md border transition-colors',
                          active ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2 hover:border-accent-2',
                        ].join(' ')}
                      >
                        <PlayerAvatar seed={avatarSeed || nickname || 'player'} style={s.slug} size={48} />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Or upload a photo</h3>
              <p className="text-xs text-ink-muted">JPG, PNG, or WebP. Up to 256 KB.</p>
              <label
                className={[
                  'inline-flex items-center gap-2 px-4 h-10 rounded-md border text-sm cursor-pointer transition-colors',
                  uploading
                    ? 'border-border bg-surface-2 text-ink-subtle cursor-wait'
                    : 'border-border bg-surface-2 text-ink-muted hover:border-accent-2 hover:text-ink',
                ].join(' ')}
              >
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} disabled={uploading} className="hidden" />
                {uploading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Uploading…
                  </span>
                ) : 'Choose file'}
              </label>
            </div>
          </section>
        )}

        {tab === 'favorites' && <FavoritesTab />}

        {tab === 'restore' && (
          <section className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">Restore from another device</h3>
              <p className="text-xs text-ink-muted">Restore using your recovery code, email, or phone number.</p>
            </div>

            <div className="flex gap-2">
              {[
                { key: RESTORE_MODE.CODE,  label: 'Code'  },
                { key: RESTORE_MODE.EMAIL, label: 'Email' },
                { key: RESTORE_MODE.PHONE, label: 'Phone' },
              ].map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setRestoreMode(m.key)}
                  disabled={recovering}
                  className={[
                    'flex-1 h-10 rounded-md border text-sm font-medium transition-colors',
                    restoreMode === m.key
                      ? 'bg-accent text-bg border-accent'
                      : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2',
                  ].join(' ')}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {restoreMode === RESTORE_MODE.CODE && (
                <input
                  type="text"
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value.toUpperCase().slice(0, 8))}
                  placeholder="NZP6RE6B"
                  maxLength={8}
                  disabled={recovering}
                  className="flex-1 h-11 rounded-md border border-border bg-surface-2 px-3 text-ink font-mono tracking-[0.3em] placeholder:text-ink-subtle focus:border-accent focus:outline-none disabled:opacity-50"
                />
              )}
              {restoreMode === RESTORE_MODE.EMAIL && (
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  disabled={recovering}
                  className="flex-1 h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none disabled:opacity-50"
                />
              )}
              {restoreMode === RESTORE_MODE.PHONE && (
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+20 100 123 4567"
                  disabled={recovering}
                  className="flex-1 h-11 rounded-md border border-border bg-surface-2 px-3 text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none disabled:opacity-50"
                />
              )}
              <Button variant="primary" onClick={handleRecover} disabled={!canSubmitRestore || recovering}>
                {recovering ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    <span className="hidden sm:inline">Restoring…</span>
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

            <div className="rounded-md border border-border bg-surface-2 p-3 space-y-1">
              <p className="text-xs font-semibold text-ink">What happens?</p>
              <ul className="text-xs text-ink-muted space-y-0.5 list-disc list-inside">
                <li>This device switches to the recovered profile.</li>
                <li>Your current profile stays on the server.</li>
                <li>The recovered profile's code is not transferred.</li>
              </ul>
            </div>
          </section>
        )}

        <footer className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-ink-subtle">
            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-correct bg-correct-soft text-correct">
                <IconCheck className="w-3 h-3" /> Saved
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
              ) : 'Save'}
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
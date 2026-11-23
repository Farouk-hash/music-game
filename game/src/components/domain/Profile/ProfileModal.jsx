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
import { IconClose, IconCheck, IconDownload, IconWifiOff } from '@/icons/index.js'; // ✅ Added IconWifiOff
import { OfflineBlock } from '@/components/network/OfflineBlock.jsx'; // ✅ Reuse OfflineBlock
import { useNetworkStatus } from '@/hooks/network/useNetworkStatus.js'; // ✅ Check connectivity
import { ProfileDetailsTab } from './ProfileDetailsTab.jsx';
import { AvatarTab } from './AvatarTab.jsx';
import { RestoreTab } from './RestoreTab.jsx';

const TABS = [
  { key: 'profile',   label: 'Profile' },
  { key: 'avatar',    label: 'Avatar' },
  { key: 'favorites', label: 'Favourites' },
  { key: 'restore',   label: 'Restore' },
];

const RESTORE_MODE = { CODE: 'code', EMAIL: 'email', PHONE: 'phone' };

export function ProfileModal({ open, onClose }) {
  const isOnline = useNetworkStatus(); // ✅ Real-time network status
  
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

  // ✅ Guard: Don't render modal content if no profile exists
  if (!profile) return null;

  const uploadedUrl = absoluteAvatarUrl(profile);
  const usingUploaded = !!uploadedUrl;

  // ✅ Helper to prevent actions when offline
  const assertOnline = () => {
    if (!isOnline) {
      throw new Error('No internet connection. Please reconnect to continue.');
    }
  };

  async function handleSave() {
    try {
      assertOnline(); // ✅ Check before proceeding
      
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
    
    try {
      assertOnline(); // ✅ Check before upload
      setUploading(true); 
      setError(null);
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
      assertOnline(); // ✅ Check before removal
      await removeUploadedAvatar(); 
    } catch (e) { 
      setError(e); 
    }
  }

  async function handleRecover() {
    try {
      assertOnline(); // ✅ Check before recovery
      
      setRecovering(true);
      setRecoverError(null);
      
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

        {/* ✅ Compact Offline Warning Banner */}
        {!isOnline && (
          <OfflineBlock 
            variant="banner"
            title="Connection Lost"
            subtitle="Profile changes require an active internet connection."
            onRetry={null} // No retry button needed here since it's informational
            icon={<IconWifiOff className="w-5 h-5" />}
          />
        )}

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
          <ProfileDetailsTab
            nickname={nickname} setNickname={setNickname}
            email={email} setEmail={setEmail}
            phone={phone} setPhone={setPhone}
            hasRecoveryCode={hasRecoveryCode}
            pendingRecoveryCode={pendingRecoveryCode}
            showRecovery={showRecovery}
            isOnline={isOnline}
          />
        )}

        {tab === 'avatar' && (
          <AvatarTab
            usingUploaded={usingUploaded}
            uploadedUrl={uploadedUrl}
            handleRemoveUploaded={handleRemoveUploaded}
            avatarStyle={avatarStyle}
            setAvatarStyle={setAvatarStyle}
            avatarSeed={avatarSeed}
            nickname={nickname}
            uploading={uploading}
            handleUpload={handleUpload}
            isOnline={isOnline}
          />
        )}

        {tab === 'favorites' && <FavoritesTab />}

        {tab === 'restore' && (
          <RestoreTab
            restoreMode={restoreMode}
            setRestoreMode={setRestoreMode}
            recoveryInput={recoveryInput}
            setRecoveryInput={setRecoveryInput}
            emailInput={emailInput}
            setEmailInput={setEmailInput}
            phoneInput={phoneInput}
            setPhoneInput={setPhoneInput}
            recovering={recovering}
            canSubmitRestore={canSubmitRestore}
            handleRecover={handleRecover}
            recoverError={recoverError}
            isOnline={isOnline}
          />
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
            <Button 
              variant="primary" 
              onClick={handleSave} 
              disabled={saving || !isOnline} // ✅ Disable save when offline
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Saving…
                </span>
              ) : !isOnline ? (
                <span className="inline-flex items-center gap-2">
                  <IconWifiOff className="w-4 h-4" />
                  Offline
                </span>
              ) : 'Save'}
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
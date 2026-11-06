// game/src/components/domain/Follow/FriendsModal.jsx
import { useState, useEffect } from 'react';
import { Modal } from '../../Modal/Modal.jsx';
import { FriendsListTab } from './FriendsListTab.jsx';
import { RequestsTab } from './RequestsTab.jsx';
import { usePending } from '../../../hooks/follows/useFollows.js';
import { InvitesTab } from './InvitesTab.jsx';
import { usePendingInvites } from '../../../hooks/invites/useInvites.js';
import { TabStrip } from '../../ui/TabStrip.jsx';
import { IconClose } from '../../../icons/index.js';

const TABS = [
  { key: 'friends',  label: 'Friends' },
  { key: 'requests', label: 'Requests' },
  { key: 'invites',  label: 'Invites' },
];

export function FriendsModal({ open, onClose }) {
  const [tab, setTab] = useState('friends');
  const { data: pending } = usePending();

  const { data: pendingInvites } = usePendingInvites();
  const inviteCount = pendingInvites?.invites?.length ?? 0;

  const incomingCount = pending?.incoming?.length ?? 0;
  const outgoingCount = pending?.outgoing?.length ?? 0;
  const requestCount = incomingCount + outgoingCount;

  // Reset to the friends tab whenever the modal opens.
  useEffect(() => {
    if (open) setTab('friends');
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="rounded-lg border border-border bg-surface p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-highlight uppercase tracking-[0.2em]">
              Friends
            </p>
            <h2 className="text-xl font-bold text-ink mt-1">
              Your people
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-subtle hover:text-ink text-sm shrink-0"
            aria-label="Close"
          >
            <IconClose />
          </button>
        </header>

        <TabStrip
          tabs={TABS}
          value={tab}
          onChange={setTab}
          cols={3}
          mode="grid"
        />

        {tab === 'friends' && <FriendsListTab />}
        {tab === 'requests' && <RequestsTab />}
        {tab === 'invites' && <InvitesTab />}
      </div>
    </Modal>
  );
}
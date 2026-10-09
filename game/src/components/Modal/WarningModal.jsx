// game/src/components/Modal/WarningModal.jsx
import { Modal } from './Modal.jsx';
import { ModalContent } from './ModalContent.jsx';
import { Button } from '../ui/Button.jsx';

/**
 * A "you can't do that" or "are you sure?" modal.
 * Confirm + Cancel, styled as a warning.
 */
export function WarningModal({
  open,
  onClose,
  onConfirm,
  title = 'Heads up',
  description,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  showCancel = false,
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalContent
        title={title}
        description={description}
        footer={
          <>
            {showCancel && (
              <Button variant="ghost" onClick={onClose}>
                {cancelLabel}
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => {
                onConfirm?.();
                onClose?.();
              }}
            >
              {confirmLabel}
            </Button>
          </>
        }
      />
    </Modal>
  );
}
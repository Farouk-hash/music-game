import { Modal } from './Modal';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

/**
 * A modal containing a form with submit/cancel buttons.
 *
 *   <ModalForm
 *     open={isOpen}
 *     onClose={close}
 *     title="Add Custom Genre"
 *     submitLabel="Create"
 *     onSubmit={async (data) => { ... }}
 *   >
 *     <Input name="name" ... />
 *     <Input name="display_name" ... />
 *   </ModalForm>
 *
 * The parent passes form fields as children. ModalForm handles
 * wrapping in a <form>, submit button state, and error rendering.
 *
 * Props:
 *   open         — visibility
 *   onClose      — close handler
 *   title        — modal title
 *   submitLabel  — button text (default "Save")
 *   cancelLabel  — button text (default "Cancel")
 *   submitting   — external pending flag (optional)
 *   error        — error to display (string or null)
 *   onSubmit     — (event) => void | Promise<void>
 *   size         — forwarded to Modal
 */
export function ModalForm({
  open,
  onClose,
  title,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitting = false,
  error = null,
  onSubmit,
  size = 'md',
  children,
}) {
  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    await onSubmit?.(e);
  }

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={onClose}
        disabled={submitting}
      >
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        form="modal-form"
        variant="primary"
        loading={submitting}
        disabled={submitting}
      >
        {submitLabel}
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={title}
      size={size}
      footer={footer}
    >
      <form id="modal-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          {error && (
            <EmptyState
              icon="⚠️"
              title="Error"
              description={typeof error === 'string' ? error : error.message}
              className="py-4"
            />
          )}
          {children}
        </div>
      </form>
    </Modal>
  );
}
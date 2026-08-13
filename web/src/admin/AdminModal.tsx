type AdminModalVariant = 'default' | 'success' | 'error' | 'warning' | 'danger';

type AdminModalProps = {
  open: boolean;
  title: string;
  message: string;
  variant?: AdminModalVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
};

export function AdminModal({
  open,
  title,
  message,
  variant = 'default',
  confirmLabel = 'OK',
  cancelLabel = 'Отмена',
  showCancel = false,
  onConfirm,
  onClose,
}: AdminModalProps) {
  if (!open) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm?.();
    if (!showCancel) {
      onClose();
    }
  };

  const confirmButtonClass =
    variant === 'danger' ? 'danger' : variant === 'success' ? 'success' : variant === 'warning' ? 'warning' : '';

  return (
    <div className="admin-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className={`admin-modal admin-modal-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="admin-modal-title" className="admin-modal-title">
          {title}
        </h3>
        <p className="admin-modal-message">{message}</p>
        <div className="admin-modal-actions">
          {showCancel && (
            <button type="button" className="secondary" onClick={onClose}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={confirmButtonClass || undefined}
            onClick={showCancel ? () => { onConfirm?.(); onClose(); } : handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

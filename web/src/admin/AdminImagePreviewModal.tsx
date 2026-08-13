import { useEffect } from 'react';

type AdminImagePreviewModalProps = {
  open: boolean;
  imageUrl: string;
  alt?: string;
  onClose: () => void;
};

export function AdminImagePreviewModal({ open, imageUrl, alt = '', onClose }: AdminImagePreviewModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="admin-image-preview-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-image-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={alt || 'Просмотр изображения'}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="admin-image-preview-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <img src={imageUrl} alt={alt} className="admin-image-preview-full" />
      </div>
    </div>
  );
}

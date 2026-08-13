import { useState, type CSSProperties } from 'react';
import { AdminImagePreviewModal } from './AdminImagePreviewModal';

type AdminClickableImageProps = {
  src: string;
  alt?: string;
  className?: string;
  imgStyle?: CSSProperties;
};

export function AdminClickableImage({ src, alt = '', className, imgStyle }: AdminClickableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="admin-clickable-image"
        onClick={() => setOpen(true)}
        aria-label={alt ? `Открыть изображение: ${alt}` : 'Открыть изображение'}
        title="Открыть в полном размере"
      >
        <img src={src} alt={alt} className={className} style={imgStyle} />
      </button>
      <AdminImagePreviewModal open={open} imageUrl={src} alt={alt} onClose={() => setOpen(false)} />
    </>
  );
}

import { getProductColorOption, type ProductColorId } from './productColors';
import './ProductColorSwatch.css';

type NoColorIconProps = {
  className?: string;
  title?: string;
};

export function NoColorIcon({ className = '', title }: NoColorIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="10" cy="10" r="8.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
      <path d="M6.5 6.5 L13.5 13.5 M13.5 6.5 L6.5 13.5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type ProductColorSwatchProps = {
  colorId?: ProductColorId | null;
  size?: 'xs' | 'sm' | 'md';
  title?: string;
  className?: string;
  showNoColorWhenUnset?: boolean;
};

export function ProductColorSwatch({
  colorId,
  size = 'md',
  title,
  className = '',
  showNoColorWhenUnset = false,
}: ProductColorSwatchProps) {
  if (showNoColorWhenUnset && !colorId) {
    return (
      <NoColorIcon
        title={title ?? 'Без цвета'}
        className={['product-color-swatch-none', `product-color-swatch-${size}`, className].filter(Boolean).join(' ')}
      />
    );
  }

  const color = getProductColorOption(colorId);
  const classes = ['product-color-swatch', `product-color-swatch-${size}`, className].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      title={title ?? color.label}
      aria-label={title ?? color.label}
      data-transparent={color.transparent ? 'true' : undefined}
      data-chrome={color.id === 'Chrome' ? 'true' : undefined}
    >
      <span
        className="product-color-swatch-fill"
        style={{
          background: color.fill,
          borderColor: color.border ?? 'rgba(15, 23, 42, 0.18)',
        }}
      />
    </span>
  );
}

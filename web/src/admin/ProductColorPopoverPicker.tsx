import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NO_PRODUCT_COLOR_LABEL, PRODUCT_COLORS, type ProductColorId } from './productColors';
import { ProductColorPalette } from './ProductColorPicker';
import { ProductColorSwatch } from './ProductColorSwatch';
import './ProductColorSwatch.css';

type ProductColorPopoverPickerProps = {
  value: ProductColorId | null;
  onChange: (colorId: ProductColorId | null) => void;
  disabled?: boolean;
  ariaLabel?: string;
  showLabel?: boolean;
};

export function ProductColorPopoverPicker({
  value,
  onChange,
  disabled = false,
  ariaLabel = 'Выбрать цвет',
  showLabel = false,
}: ProductColorPopoverPickerProps) {
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentLabel =
    value === null
      ? NO_PRODUCT_COLOR_LABEL
      : PRODUCT_COLORS.find((color) => color.id === value)?.label ?? NO_PRODUCT_COLOR_LABEL;

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const panelWidth = panelRef.current?.offsetWidth ?? 280;
      const panelHeight = panelRef.current?.offsetHeight ?? 120;
      const viewportPadding = 8;

      let left = rect.left;
      let top = rect.bottom + 6;

      if (left + panelWidth > window.innerWidth - viewportPadding) {
        left = Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding);
      }

      if (top + panelHeight > window.innerHeight - viewportPadding) {
        top = Math.max(viewportPadding, rect.top - panelHeight - 6);
      }

      setPanelPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open]);

  const handleSelect = (colorId: ProductColorId | null) => {
    onChange(colorId);
    setOpen(false);
  };

  return (
    <div className="product-color-popover-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="product-color-popover-trigger"
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        title={currentLabel}
      >
        <ProductColorSwatch colorId={value} showNoColorWhenUnset size="md" />
        {showLabel && <span className="product-color-popover-trigger-label">{currentLabel}</span>}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="product-color-popover-panel"
            role="dialog"
            aria-label="Выбор цвета"
            style={{ top: panelPosition.top, left: panelPosition.left }}
          >
            <ProductColorPalette value={value} onSelect={handleSelect} />
          </div>,
          document.body,
        )}
    </div>
  );
}

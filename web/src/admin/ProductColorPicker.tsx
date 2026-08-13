import { NO_PRODUCT_COLOR_LABEL, PRODUCT_COLORS, type ProductColorId } from './productColors';
import { ProductColorSwatch } from './ProductColorSwatch';
import './ProductColorSwatch.css';

type ProductColorPaletteProps = {
  value: ProductColorId | null;
  onSelect: (colorId: ProductColorId | null) => void;
};

export function ProductColorPalette({ value, onSelect }: ProductColorPaletteProps) {
  return (
    <div className="product-color-picker-options" role="radiogroup" aria-label="Цвет товара">
      <button
        type="button"
        className={`product-color-picker-option${value === null ? ' selected' : ''}`}
        onClick={() => onSelect(null)}
        title={NO_PRODUCT_COLOR_LABEL}
        aria-label={NO_PRODUCT_COLOR_LABEL}
        aria-pressed={value === null}
      >
        <ProductColorSwatch colorId={null} showNoColorWhenUnset size="md" />
      </button>
      {PRODUCT_COLORS.map((color) => {
        const selected = value === color.id;

        return (
          <button
            key={color.id}
            type="button"
            className={`product-color-picker-option${selected ? ' selected' : ''}`}
            onClick={() => onSelect(color.id)}
            title={color.label}
            aria-label={color.label}
            aria-pressed={selected}
          >
            <ProductColorSwatch colorId={color.id} size="md" />
          </button>
        );
      })}
    </div>
  );
}

type ProductColorPickerProps = {
  value: ProductColorId | null;
  onChange: (colorId: ProductColorId | null) => void;
};

export function ProductColorPicker({ value, onChange }: ProductColorPickerProps) {
  return (
    <fieldset className="product-color-picker">
      <legend className="product-color-picker-label">Цвет</legend>
      <ProductColorPalette value={value} onSelect={onChange} />
      <span className="product-color-picker-current">
        {value === null
          ? NO_PRODUCT_COLOR_LABEL
          : PRODUCT_COLORS.find((color) => color.id === value)?.label ?? NO_PRODUCT_COLOR_LABEL}
      </span>
    </fieldset>
  );
}

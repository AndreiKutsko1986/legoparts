import { ProductColorSwatch } from '../admin/ProductColorSwatch';
import type { ProductColorId } from '../admin/productColors';

type ProductColorIndicatorProps = {
  colorId: ProductColorId | null;
  className?: string;
};

export function ProductColorIndicator({ colorId, className = '' }: ProductColorIndicatorProps) {
  return <ProductColorSwatch colorId={colorId} showNoColorWhenUnset size="sm" className={className} />;
}

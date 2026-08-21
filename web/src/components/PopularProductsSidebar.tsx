import { Link } from 'react-router-dom';
import type { Product } from '../api';
import { formatPrice } from '../labels';
import { productDisplayName } from '../productColorFromName';
import { productPath } from '../productPath';

type PopularProductsSidebarProps = {
  products: Product[];
};

export function PopularProductsSidebar({ products }: PopularProductsSidebarProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <aside className="cart-popular-sidebar">
      <h2>Популярное</h2>
      <div className="cart-popular-list">
        {products.map((product) => (
          <article key={product.id} className="cart-popular-card">
            <Link to={productPath(product.id)} className="cart-popular-media">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt="" />
              ) : (
                <span className="cart-popular-media-placeholder" aria-hidden="true">
                  Нет фото
                </span>
              )}
            </Link>
            <div className="cart-popular-body">
              {product.subCategoryName ? (
                <span className="cart-popular-type">{product.subCategoryName}</span>
              ) : null}
              <Link to={productPath(product.id)} className="cart-popular-title">
                {productDisplayName(product.nameRu, product.name)}
              </Link>
              <p className="cart-popular-price">{formatPrice(product.price)}</p>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}

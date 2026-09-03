import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import type { Product } from '../api';
import { api } from '../api';
import { getProductColorOption } from '../admin/productColors';
import {
  addToCart,
  cartQuantityForProduct,
  clampProductQuantity,
  loadCart,
  removeFromCart,
  saveCart,
  updateQuantity,
} from '../cart';
import type { LayoutContext } from '../components/Layout';
import { notifyCartUpdated } from '../components/Layout';
import { ProductColorIndicator } from '../components/ProductColorIndicator';
import { PopularProductsSidebar } from '../components/PopularProductsSidebar';
import { formatPrice } from '../labels';
import { productDisplayName, productDisplayNameEn, resolveProductDisplayColor } from '../productColorFromName';
import { usePopularProducts } from '../usePopularProducts';
import './ProductPage.css';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { showCartToast } = useOutletContext<LayoutContext>();
  const popularProducts = usePopularProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartQuantity, setCartQuantity] = useState(0);
  const [pendingQuantity, setPendingQuantity] = useState(1);

  useEffect(() => {
    if (!id) {
      setError('Товар не найден.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    api
      .getProduct(id)
      .then((item) => {
        setProduct(item);
        const inCart = cartQuantityForProduct(loadCart(), item.id);
        setCartQuantity(inCart);
        setPendingQuantity(inCart > 0 ? inCart : 1);
      })
      .catch((err: Error) => {
        setProduct(null);
        setError(err.message || 'Товар не найден.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const refreshCart = () => {
      if (!product) {
        return;
      }

      const quantity = cartQuantityForProduct(loadCart(), product.id);
      setCartQuantity(quantity);
      if (quantity > 0) {
        setPendingQuantity(quantity);
      }
    };

    refreshCart();
    window.addEventListener('legoparts-cart-updated', refreshCart);
    return () => window.removeEventListener('legoparts-cart-updated', refreshCart);
  }, [product]);

  const persistCart = (next: ReturnType<typeof loadCart>) => {
    saveCart(next);
    notifyCartUpdated();
    if (product) {
      setCartQuantity(cartQuantityForProduct(next, product.id));
    }
  };

  const handleQuantityChange = (rawQuantity: number) => {
    if (!product) {
      return;
    }

    const inCart = cartQuantity > 0;
    const nextQuantity = clampProductQuantity(rawQuantity, product.stockQuantity, inCart);

    if (nextQuantity === 0) {
      persistCart(removeFromCart(loadCart(), product.id));
      setPendingQuantity(1);
      return;
    }

    if (inCart) {
      persistCart(updateQuantity(loadCart(), product.id, nextQuantity, product.stockQuantity));
      setPendingQuantity(nextQuantity);
      return;
    }

    setPendingQuantity(nextQuantity);
  };

  const handleAddToCart = () => {
    if (!product || product.stockQuantity === 0 || cartQuantity > 0) {
      return;
    }

    const quantity = pendingQuantity;
    if (quantity < 1 || quantity > product.stockQuantity) {
      return;
    }

    const next = addToCart(loadCart(), product, quantity);
    persistCart(next);

    const displayName = productDisplayName(product.nameRu, product.name);
    const quantityLabel = quantity === 1 ? 'Товар добавлен в корзину' : `${quantity} шт. добавлено в корзину`;
    showCartToast(`«${displayName}» — ${quantityLabel}`);
  };

  if (loading) {
    return <p className="product-page-status">Загрузка товара...</p>;
  }

  if (error || !product) {
    return (
      <section className="product-page-status-wrap">
        <p className="product-page-status error">{error || 'Товар не найден.'}</p>
        <Link to="/" className="product-page-back">
          Вернуться в каталог
        </Link>
      </section>
    );
  }

  const displayName = productDisplayName(product.nameRu, product.name);
  const showEnglishName = Boolean(product.nameRu.trim() && product.name.trim());
  const displayNameEn = productDisplayNameEn(product.name);
  const displayColor = resolveProductDisplayColor(product.color, product.nameRu, product.name);
  const colorOption = getProductColorOption(displayColor);
  const isOutOfStock = product.stockQuantity === 0;
  const inCart = cartQuantity > 0;
  const quantityDisplay = isOutOfStock ? 0 : inCart ? cartQuantity : pendingQuantity;
  const showAddButton = !isOutOfStock && !inCart;

  return (
    <div className="product-page">
      <div className="product-page-layout">
        <div className="product-page-main">
          <Link to="/" className="product-page-back">
            ← В каталог
          </Link>

          <article className={`product-detail${inCart ? ' product-detail--in-cart' : ''}`}>
            <div className="product-detail-grid">
              <div className="product-detail-media">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={displayName} />
                ) : (
                  <div className="product-detail-placeholder">Нет фото</div>
                )}
              </div>

              <div className="product-detail-info">
                <p className="product-detail-breadcrumb">
                  {product.categoryName}
                  {product.subCategoryName ? ` · ${product.subCategoryName}` : ''}
                </p>

                <h1>{displayName}</h1>
                {showEnglishName && displayNameEn !== displayName ? (
                  <p className="product-detail-name-en">{displayNameEn}</p>
                ) : null}

                <dl className="product-detail-meta">
                  <div>
                    <dt>Артикул</dt>
                    <dd>{product.sku}</dd>
                  </div>
                  {product.partNumber ? (
                    <div>
                      <dt>Номер детали</dt>
                      <dd>{product.partNumber}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Цвет</dt>
                    <dd className="product-detail-color">
                      <ProductColorIndicator colorId={displayColor} className="product-detail-color-swatch" />
                      <span>{colorOption.label}</span>
                    </dd>
                  </div>
                </dl>

                <div className="product-detail-price-row">
                  {product.price > 0 ? (
                    <p className="product-detail-price">{formatPrice(product.price)}</p>
                  ) : (
                    <p className="product-detail-out-of-stock">Нет в наличии</p>
                  )}
                </div>

                <p className="product-detail-stock">
                  {isOutOfStock ? 'Нет на складе' : `На складе: ${product.stockQuantity} шт.`}
                </p>

                {product.description?.trim() ? (
                  <div className="product-detail-description">
                    <h2>Описание</h2>
                    <p>{product.description}</p>
                  </div>
                ) : null}

                <div className="product-detail-actions">
                  <div className="product-detail-cart-row">
                    <div
                      className={`product-qty-control${isOutOfStock ? ' product-qty-control--empty' : ''}`}
                      aria-label="Количество"
                    >
                      <button
                        type="button"
                        className="product-qty-btn"
                        onClick={() => handleQuantityChange(quantityDisplay - 1)}
                        disabled={isOutOfStock || (!inCart && quantityDisplay <= 1)}
                        aria-label="Уменьшить количество"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        className="product-qty-input"
                        min={inCart ? 0 : 1}
                        max={isOutOfStock ? 0 : product.stockQuantity}
                        value={quantityDisplay}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          if (!Number.isFinite(value)) {
                            return;
                          }
                          handleQuantityChange(value);
                        }}
                        onBlur={(event) => {
                          const value = Number(event.target.value);
                          if (!Number.isFinite(value)) {
                            handleQuantityChange(inCart ? 0 : 1);
                          }
                        }}
                        disabled={isOutOfStock}
                        readOnly={isOutOfStock}
                        aria-label="Количество"
                      />
                      <button
                        type="button"
                        className="product-qty-btn"
                        onClick={() => handleQuantityChange(quantityDisplay + 1)}
                        disabled={isOutOfStock || quantityDisplay >= product.stockQuantity}
                        aria-label="Увеличить количество"
                      >
                        +
                      </button>
                    </div>

                    {showAddButton ? (
                      <button type="button" className="product-add-btn" onClick={handleAddToCart}>
                        В корзину
                      </button>
                    ) : null}
                  </div>

                  {inCart ? (
                    <Link to="/cart" className="product-cart-link">
                      Перейти в корзину ({cartQuantity})
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        </div>

        <PopularProductsSidebar products={popularProducts.filter((item) => item.id !== product.id)} />
      </div>
    </div>
  );
}

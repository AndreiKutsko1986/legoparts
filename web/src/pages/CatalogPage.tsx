import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Product } from '../api';
import { api } from '../api';
import { PRODUCT_COLORS, type ProductColorId } from '../admin/productColors';
import { NoColorIcon } from '../admin/ProductColorSwatch';
import { ProductColorIndicator } from '../components/ProductColorIndicator';
import type { LayoutContext } from '../components/Layout';
import { notifyCartUpdated } from '../components/Layout';
import { productDisplayName, productMatchesColorFilter, resolveProductDisplayColor } from '../productColorFromName';
import { addToCart, cartQuantityForProduct, clampProductQuantity, loadCart, reconcileCartLines, removeFromCart, saveCart, updateQuantity } from '../cart';
import { formatPrice } from '../labels';
import './CatalogPage.css';

const useContainedWheel = () =>
  useCallback((event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    if (container.scrollHeight <= container.clientHeight) {
      return;
    }

    const delta = event.deltaY;
    const atTop = container.scrollTop <= 0;
    const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;

    if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
      return;
    }

    event.stopPropagation();
  }, []);

type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'name' | 'name-desc';

type ColorFilter = ProductColorId | '' | 'no-color';

type CategoryFilter = {
  id: string;
  name: string;
  count: number;
};

type SubCategoryFilter = {
  id: string;
  name: string;
  categoryId: string;
  count: number;
};

type CatalogMultiSelectDropdownProps = {
  items: Array<{ id: string; name: string; count: number }>;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  onWheel?: (event: WheelEvent<HTMLDivElement>) => void;
};

function CatalogMultiSelectDropdown({
  items,
  selectedIds,
  onToggle,
  onClear,
  placeholder = 'Все',
  emptyLabel,
  disabled = false,
  onWheel,
}: CatalogMultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const summary = useMemo(() => {
    if (selectedIds.size === 0) {
      return placeholder;
    }

    if (selectedIds.size === 1) {
      const item = items.find((entry) => selectedIds.has(entry.id));
      return item?.name ?? placeholder;
    }

    return `Выбрано: ${selectedIds.size}`;
  }, [items, placeholder, selectedIds]);

  const isDisabled = disabled || items.length === 0;
  const triggerLabel = items.length === 0 ? (emptyLabel ?? placeholder) : summary;

  return (
    <div className={`catalog-multiselect-ddl${open ? ' open' : ''}${isDisabled ? ' disabled' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="catalog-multiselect-ddl-trigger"
        onClick={() => {
          if (!isDisabled) {
            setOpen((current) => !current);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={isDisabled}
      >
        <span className="catalog-multiselect-ddl-value">{triggerLabel}</span>
        <span className="catalog-multiselect-ddl-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && items.length > 0 && (
        <div className="catalog-multiselect-ddl-panel">
          {selectedIds.size > 0 && (
            <button type="button" className="catalog-multiselect-ddl-clear" onClick={onClear}>
              Сбросить
            </button>
          )}
          <div className="catalog-multiselect-ddl-scroll" onWheel={onWheel}>
            <ul className="catalog-multiselect-ddl-list" role="listbox" aria-multiselectable="true">
              {items.map((item) => {
                const checked = selectedIds.has(item.id);

                return (
                  <li key={item.id} role="option" aria-selected={checked}>
                    <label className={`catalog-multiselect-ddl-option${checked ? ' selected' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} />
                      <span className="catalog-multiselect-ddl-option-label">{item.name}</span>
                      <span className="catalog-multiselect-ddl-option-count">{item.count}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

const sortOptions: { id: SortOption; label: string }[] = [
  { id: 'popular', label: 'Популярные' },
  { id: 'price-asc', label: 'Цена: по возрастанию' },
  { id: 'price-desc', label: 'Цена: по убыванию' },
  { id: 'name', label: 'Название А-Я' },
  { id: 'name-desc', label: 'Название Я-А' },
];

const compareProducts = (left: Product, right: Product, sort: SortOption) => {
  switch (sort) {
    case 'price-asc':
      return left.price - right.price || left.nameRu.localeCompare(right.nameRu, 'ru');
    case 'price-desc':
      return right.price - left.price || left.nameRu.localeCompare(right.nameRu, 'ru');
    case 'name':
      return (left.nameRu || left.name).localeCompare(right.nameRu || right.name, 'ru');
    case 'name-desc':
      return (right.nameRu || right.name).localeCompare(left.nameRu || left.name, 'ru');
    case 'popular':
    default:
      return (
        right.popularityRating - left.popularityRating ||
        (left.nameRu || left.name).localeCompare(right.nameRu || right.name, 'ru')
      );
  }
};

export function CatalogPage() {
  const { showCartToast } = useOutletContext<LayoutContext>();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(() => new Set());
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<Set<string>>(() => new Set());
  const [selectedColor, setSelectedColor] = useState<ColorFilter>('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartLines, setCartLines] = useState(loadCart());
  const [addQuantities, setAddQuantities] = useState<Record<string, number>>({});
  const handleContainedWheel = useContainedWheel();

  useEffect(() => {
    const refreshCart = () => setCartLines(loadCart());
    refreshCart();
    window.addEventListener('legoparts-cart-updated', refreshCart);
    return () => window.removeEventListener('legoparts-cart-updated', refreshCart);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    api
      .getProducts()
      .then((productList) => {
        if (!active) return;
        setProducts(productList);
      })
      .catch((err: Error) => {
        if (!active) return;
        setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const categoryFilters = useMemo(() => {
    const counts = new Map<string, CategoryFilter>();

    for (const product of products) {
      const current = counts.get(product.categoryId);
      if (current) {
        current.count += 1;
      } else {
        counts.set(product.categoryId, {
          id: product.categoryId,
          name: product.categoryName,
          count: 1,
        });
      }
    }

    return [...counts.values()].sort((left, right) => left.name.localeCompare(right.name, 'ru'));
  }, [products]);

  const subCategoryFilters = useMemo(() => {
    const counts = new Map<string, SubCategoryFilter>();

    for (const product of products) {
      const current = counts.get(product.subCategoryId);
      if (current) {
        current.count += 1;
      } else {
        counts.set(product.subCategoryId, {
          id: product.subCategoryId,
          name: product.subCategoryName,
          categoryId: product.categoryId,
          count: 1,
        });
      }
    }

    return [...counts.values()].sort((left, right) => left.name.localeCompare(right.name, 'ru'));
  }, [products]);

  const visibleSubCategoryFilters = useMemo(() => {
    if (selectedCategoryIds.size === 0) {
      return subCategoryFilters;
    }

    return subCategoryFilters.filter((item) => selectedCategoryIds.has(item.categoryId));
  }, [selectedCategoryIds, subCategoryFilters]);

  useEffect(() => {
    if (selectedCategoryIds.size === 0) {
      return;
    }

    const visibleIds = new Set(visibleSubCategoryFilters.map((item) => item.id));
    setSelectedSubCategoryIds((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [selectedCategoryIds, visibleSubCategoryFilters]);

  const hasActiveFilters =
    selectedCategoryIds.size > 0 || selectedSubCategoryIds.size > 0 || selectedColor !== '' || inStockOnly;

  const displayedProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (selectedCategoryIds.size > 0 && !selectedCategoryIds.has(product.categoryId)) {
        return false;
      }

      if (selectedSubCategoryIds.size > 0 && !selectedSubCategoryIds.has(product.subCategoryId)) {
        return false;
      }

      if (inStockOnly && product.stockQuantity <= 0) {
        return false;
      }

      if (selectedColor === 'no-color') {
        if (resolveProductDisplayColor(product.color, product.nameRu, product.name) !== null) {
          return false;
        }
      } else if (selectedColor && !productMatchesColorFilter(product.nameRu, product.name, selectedColor, product.color)) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((left, right) => compareProducts(left, right, sortBy));
  }, [products, inStockOnly, selectedCategoryIds, selectedColor, selectedSubCategoryIds, sortBy]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleSubCategory = (subCategoryId: string) => {
    setSelectedSubCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(subCategoryId)) {
        next.delete(subCategoryId);
      } else {
        next.add(subCategoryId);
      }
      return next;
    });
  };

  const clearCategories = () => {
    setSelectedCategoryIds(new Set());
  };

  const clearSubCategories = () => {
    setSelectedSubCategoryIds(new Set());
  };

  const clearAllFilters = () => {
    setSelectedCategoryIds(new Set());
    setSelectedSubCategoryIds(new Set());
    setSelectedColor('');
    setInStockOnly(false);
  };

  const persistCart = (next: ReturnType<typeof loadCart>) => {
    saveCart(next);
    setCartLines(next);
    notifyCartUpdated();
  };

  useEffect(() => {
    if (products.length === 0) {
      return;
    }

    const { lines: nextCart, adjusted } = reconcileCartLines(loadCart(), products);
    if (adjusted) {
      persistCart(nextCart);
    }

    setAddQuantities((current) => {
      const productMap = new Map(products.map((product) => [product.id, product]));
      let changed = false;
      const next = { ...current };

      for (const [productId, quantity] of Object.entries(current)) {
        const product = productMap.get(productId);
        if (!product) {
          delete next[productId];
          changed = true;
          continue;
        }

        const clamped = clampProductQuantity(quantity, product.stockQuantity);
        if (clamped !== quantity) {
          next[productId] = clamped;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [products]);

  const handleQuantityChange = (product: Product, rawQuantity: number) => {
    if (product.stockQuantity === 0) {
      return;
    }

    const inCart = cartQuantityForProduct(cartLines, product.id) > 0;
    const nextQuantity = clampProductQuantity(rawQuantity, product.stockQuantity, inCart);

    if (nextQuantity === 0) {
      persistCart(removeFromCart(loadCart(), product.id));
      setAddQuantities((current) => {
        const next = { ...current };
        delete next[product.id];
        return next;
      });
      return;
    }

    if (inCart) {
      persistCart(updateQuantity(loadCart(), product.id, nextQuantity, product.stockQuantity));
      return;
    }

    setAddQuantities((current) => ({ ...current, [product.id]: nextQuantity }));
  };

  const handleAdd = (product: Product) => {
    if (product.stockQuantity === 0 || cartQuantityForProduct(cartLines, product.id) > 0) {
      return;
    }

    const quantity = addQuantities[product.id] ?? 1;
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
    return <p className="catalog-status">Загрузка каталога...</p>;
  }

  if (error) {
    return <p className="catalog-status error">{error}</p>;
  }

  return (
    <div className="catalog-page">
      <div className="catalog-body">
        <aside className="catalog-sidebar">
          <button
            type="button"
            className="catalog-clear-filters-btn"
            onClick={clearAllFilters}
            disabled={!hasActiveFilters}
          >
            Сбросить фильтры
          </button>

          <section className="catalog-filter-section">
            <h2>Категория</h2>
            <CatalogMultiSelectDropdown
              items={categoryFilters}
              selectedIds={selectedCategoryIds}
              onToggle={toggleCategory}
              onClear={clearCategories}
              onWheel={handleContainedWheel}
            />
          </section>

          <section className="catalog-filter-section">
            <h2>Подкатегории</h2>
            <CatalogMultiSelectDropdown
              items={visibleSubCategoryFilters}
              selectedIds={selectedSubCategoryIds}
              onToggle={toggleSubCategory}
              onClear={clearSubCategories}
              emptyLabel={
                selectedCategoryIds.size > 0 ? 'Нет подкатегорий для выбранных категорий' : 'Нет подкатегорий'
              }
              onWheel={handleContainedWheel}
            />
          </section>

          <section className="catalog-filter-section">
            <h2>Наличие</h2>
            <label className="catalog-stock-filter">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => setInStockOnly(event.target.checked)}
              />
              <span>В наличии</span>
            </label>
          </section>

          <section className="catalog-filter-section">
            <h2>Цвет</h2>
            <div className="catalog-color-filters-scroll" onWheel={handleContainedWheel}>
              <div className="catalog-color-filters">
                <button
                  type="button"
                  className={`catalog-color-filter${selectedColor === '' ? ' active' : ''}`}
                  onClick={() => setSelectedColor('')}
                  title="Все цвета"
                  aria-label="Все цвета"
                >
                  <span className="catalog-color-filter-all">Все</span>
                </button>
                <button
                  type="button"
                  className={`catalog-color-filter${selectedColor === 'no-color' ? ' active' : ''}`}
                  onClick={() => setSelectedColor('no-color')}
                  title="Без цвета"
                  aria-label="Без цвета"
                >
                  <NoColorIcon title="Без цвета" className="catalog-color-filter-none" />
                </button>
                {PRODUCT_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    className={`catalog-color-filter${selectedColor === color.id ? ' active' : ''}`}
                    onClick={() => setSelectedColor(color.id)}
                    title={color.label}
                    aria-label={color.label}
                  >
                    <span
                      className="catalog-color-dot"
                      style={{
                        background: color.transparent ? undefined : color.fill,
                        borderColor: color.border ?? 'rgba(15, 23, 42, 0.15)',
                        ...(color.transparent ? { ['--swatch-fill' as string]: color.fill } : {}),
                      }}
                      data-transparent={color.transparent ? 'true' : undefined}
                      data-chrome={color.id === 'Chrome' ? 'true' : undefined}
                    />
                  </button>
                ))}
              </div>
            </div>
          </section>
        </aside>

        <section className="catalog-main">
          <div className="catalog-main-header">
            <p className="catalog-results-count">
              {displayedProducts.length}{' '}
              {displayedProducts.length === 1
                ? 'деталь'
                : displayedProducts.length >= 2 && displayedProducts.length <= 4
                  ? 'детали'
                  : 'деталей'}
            </p>
            <label className="catalog-sort-control">
              <span className="catalog-sort-label">Сортировка</span>
              <select
                className="catalog-sort-select"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortOption)}
                aria-label="Сортировка товаров"
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {displayedProducts.length === 0 ? (
            <p className="catalog-empty">Товары не найдены. Измените фильтры.</p>
          ) : (
            <div className="catalog-product-grid-scroll" onWheel={handleContainedWheel}>
              <div className="catalog-product-grid">
              {displayedProducts.map((product) => {
                const cartQuantity = cartQuantityForProduct(cartLines, product.id);
                const inCart = cartQuantity > 0;
                const isOutOfStock = product.stockQuantity === 0;
                const pendingQuantity = addQuantities[product.id] ?? 1;
                const quantityDisplay = isOutOfStock ? 0 : inCart ? cartQuantity : pendingQuantity;
                const showQuantityControl = product.stockQuantity > 0 || inCart || isOutOfStock;
                const showAddButton = !isOutOfStock && !inCart;
                const displayColor = resolveProductDisplayColor(product.color, product.nameRu, product.name);
                const displayName = productDisplayName(product.nameRu, product.name);


                return (
                  <article
                    key={product.id}
                    className={`catalog-product-card${inCart ? ' catalog-product-card--in-cart' : ''}`}
                  >
                    <div className="catalog-product-media">


                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={displayName} />
                      ) : (
                        <div className="catalog-product-placeholder">Нет фото</div>
                      )}
                    </div>
                    <div className="catalog-product-content">
                      <span className="catalog-product-type">{product.subCategoryName}</span>
                      <h2 title={displayName}>{displayName}</h2>
                      <div className="catalog-product-footer">
                        <div className="catalog-product-price-row">
                          {product.price > 0
                            ? <span className="catalog-product-price">{formatPrice(product.price)}</span>
                            : <span className="catalog-product-out-of-stock">Нет в наличии</span>
                          }
                          <ProductColorIndicator colorId={displayColor} className="catalog-color-ring" />
                        </div>
                        <div className="catalog-add-row">
                          {showQuantityControl ? (
                            <div
                              className={`catalog-qty-control${isOutOfStock ? ' catalog-qty-control--empty' : ''}${showAddButton ? '' : ' catalog-qty-control--wide'}`}
                              aria-label="Количество"
                            >
                              <button
                                type="button"
                                className="catalog-qty-btn"
                                onClick={() => handleQuantityChange(product, quantityDisplay - 1)}
                                disabled={isOutOfStock || (!inCart && quantityDisplay <= 1)}
                                aria-label="Уменьшить количество"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                className="catalog-qty-input"
                                min={inCart ? 0 : 1}
                                max={isOutOfStock ? 0 : product.stockQuantity}
                                value={quantityDisplay}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  if (!Number.isFinite(value)) {
                                    return;
                                  }
                                  handleQuantityChange(product, value);
                                }}
                                onBlur={(event) => {
                                  const value = Number(event.target.value);
                                  if (!Number.isFinite(value)) {
                                    handleQuantityChange(product, inCart ? 0 : 1);
                                  }
                                }}
                                disabled={isOutOfStock}
                                readOnly={isOutOfStock}
                                aria-label="Количество в корзине"
                              />
                              <button
                                type="button"
                                className="catalog-qty-btn"
                                onClick={() => handleQuantityChange(product, quantityDisplay + 1)}
                                disabled={isOutOfStock || quantityDisplay >= product.stockQuantity}
                                aria-label="Увеличить количество"
                              >
                                +
                              </button>
                            </div>
                          ) : null}
                          {showAddButton ? (
                            <button
                              type="button"
                              className={`catalog-add-btn${showQuantityControl ? ' catalog-add-btn--compact' : ''}`}
                              onClick={() => handleAdd(product)}
                              disabled={pendingQuantity < 1}
                            >
                              Добавить
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

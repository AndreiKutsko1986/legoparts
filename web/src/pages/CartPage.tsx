import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  cartTotal,
  clampProductQuantity,
  hydrateCartLines,
  loadCart,
  reconcileCartLines,
  saveCart,
} from '../cart';
import type { CartLineWithProduct } from '../cart';
import { AdminModal } from '../admin/AdminModal';
import { notifyCartUpdated } from '../components/Layout';
import { PopularProductsSidebar } from '../components/PopularProductsSidebar';
import { usePopularProducts } from '../usePopularProducts';
import { formatPrice } from '../labels';
import { buildOrderShareText, openTelegramShare, openViberShare } from '../orderShareText';
import { productDisplayName } from '../productColorFromName';
import { productPath } from '../productPath';

type CheckoutSnapshot = {
  lines: CartLineWithProduct[];
  customerName: string;
  notes: string;
};

const ORDER_PLACEHOLDER_EMAIL = 'order@legoparts.by';
const ORDER_PLACEHOLDER_ADDRESS = 'Связь через Telegram/Viber';

export function CartPage() {
  const popularProducts = usePopularProducts();
  const [lines, setLines] = useState<CartLineWithProduct[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderShareText, setOrderShareText] = useState('');
  const [checkoutSnapshot, setCheckoutSnapshot] = useState<CheckoutSnapshot | null>(null);
  const [shareModal, setShareModal] = useState<'copy' | 'messenger' | null>(null);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [error, setError] = useState('');
  const [stockNotice, setStockNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const orderSubmittedRef = useRef(false);
  const shareModalHandledRef = useRef(false);

  const applyHydratedLines = (hydrated: CartLineWithProduct[], adjusted = false) => {
    setLines(hydrated);
    saveCart(hydrated.map((line) => ({ productId: line.product.id, quantity: line.quantity })));
    notifyCartUpdated();

    if (adjusted) {
      setStockNotice('Количество скорректировано по наличию на складе.');
    }
  };

  useEffect(() => {
    api
      .getProducts()
      .then((products) => {
        const stored = loadCart();
        if (stored.length === 0) {
          setLines([]);
          return;
        }

        const { lines: reconciled, adjusted } = reconcileCartLines(stored, products);
        applyHydratedLines(hydrateCartLines(reconciled, products), adjusted);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const persist = (next: CartLineWithProduct[]) => {
    setLines(next);
    saveCart(next.map((line) => ({ productId: line.product.id, quantity: line.quantity })));
    notifyCartUpdated();
  };

  const refreshLinesFromStock = async () => {
    const products = await api.getProducts();
    const stored = loadCart();
    const { lines: reconciled, adjusted } = reconcileCartLines(stored, products);
    const hydrated = hydrateCartLines(reconciled, products);
    applyHydratedLines(hydrated, adjusted);
    return hydrated;
  };

  const handleCheckout = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || lines.length === 0) {
      return;
    }

    setSubmitting(true);
    setError('');
    setStockNotice('');
    setCopyFeedback('');

    try {
      const stored = loadCart();
      const validation = await api.validateCart(stored);
      const products = await api.getProducts();
      const { lines: reconciled, adjusted } = reconcileCartLines(stored, products);
      const hydrated = hydrateCartLines(reconciled, products);

      applyHydratedLines(hydrated, adjusted);

      if (!validation.isValid) {
        setStockNotice('Количество скорректировано по актуальному наличию на складе.');
        setError(validation.errors.join(' '));
        return;
      }

      if (hydrated.length === 0) {
        setError('Товары в корзине недоступны или закончились на складе.');
        return;
      }

      setCheckoutSnapshot({
        lines: hydrated,
        customerName: customerName.trim(),
        notes: notes.trim(),
      });
      orderSubmittedRef.current = false;
      setOrderShareText(buildOrderShareText(hydrated, customerName, notes));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подготовить заказ');
      try {
        await refreshLinesFromStock();
      } catch {
        // Ignore secondary refresh errors.
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitOrderToAdmin = async () => {
    if (orderSubmittedRef.current || !checkoutSnapshot) {
      return;
    }

    orderSubmittedRef.current = true;

    try {
      await api.createOrder({
        customerName: checkoutSnapshot.customerName,
        customerEmail: ORDER_PLACEHOLDER_EMAIL,
        shippingAddress: ORDER_PLACEHOLDER_ADDRESS,
        notes: checkoutSnapshot.notes || undefined,
        items: checkoutSnapshot.lines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
      });
    } catch (err) {
      orderSubmittedRef.current = false;
      setError(err instanceof Error ? err.message : 'Не удалось отправить заказ в админку');
    }
  };

  const handleTelegramShare = () => {
    if (!orderShareText) {
      return;
    }

    void submitOrderToAdmin();
    openTelegramShare(orderShareText);
    shareModalHandledRef.current = false;
    setShareModal('messenger');
  };

  const handleViberShare = async () => {
    if (!orderShareText) {
      return;
    }

    void submitOrderToAdmin();
    const result = await openViberShare(orderShareText);
    if (result === 'cancelled') {
      return;
    }

    shareModalHandledRef.current = false;
    setShareModal('messenger');
  };

  const handleCopyOrderText = async () => {
    if (!orderShareText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(orderShareText);
      setCopyFeedback('');
      shareModalHandledRef.current = false;
      setShareModal('copy');
    } catch {
      setCopyFeedback('Не удалось скопировать текст. Выделите его вручную.');
    }
  };

  const handleShareModalDismiss = async (clearCart: boolean) => {
    if (shareModalHandledRef.current) {
      return;
    }

    shareModalHandledRef.current = true;

    if (shareModal === 'copy') {
      await submitOrderToAdmin();
    }

    setShareModal(null);

    if (clearCart) {
      handleFinishOrder();
    }
  };

  const handleFinishOrder = () => {
    saveCart([]);
    notifyCartUpdated();
    setLines([]);
    setOrderShareText('');
    setCheckoutSnapshot(null);
    orderSubmittedRef.current = false;
    shareModalHandledRef.current = false;
    setShareModal(null);
    setCustomerName('');
    setNotes('');
    setCopyFeedback('');
    setError('');
    setStockNotice('');
  };

  const handleQuantityChange = (productId: string, rawQuantity: number) => {
    const line = lines.find((entry) => entry.product.id === productId);
    if (!line) {
      return;
    }

    const quantity = clampProductQuantity(rawQuantity, line.product.stockQuantity);

    if (quantity <= 0) {
      persist(lines.filter((entry) => entry.product.id !== productId));
      return;
    }

    persist(
      lines.map((entry) =>
        entry.product.id === productId ? { ...entry, quantity } : entry,
      ),
    );
  };

  const handleRemove = (productId: string) => {
    persist(lines.filter((entry) => entry.product.id !== productId));
  };

  if (loading) {
    return <p>Загрузка корзины...</p>;
  }

  if (error && lines.length === 0 && !orderShareText) {
    return <p className="error">{error}</p>;
  }

  let mainContent;

  if (lines.length === 0 && !orderShareText) {
    mainContent = (
      <>
        <section>
          <h1>Корзина</h1>
          <p>Ваша корзина пуста.</p>
          <Link to="/">Перейти в каталог</Link>
        </section>
        <PopularProductsSidebar products={popularProducts} />
      </>
    );
  } else {
    mainContent = (
      <section className="cart-layout">
        <h1 className="cart-layout-title">Корзина</h1>
        {stockNotice ? <p className="muted cart-layout-notice">{stockNotice}</p> : null}
        <div className="cart-layout-body">
          <div className="cart-layout-lines">
            {lines.map((line) => {
              const displayName = productDisplayName(line.product.nameRu, line.product.name);

              return (
              <article key={line.product.id} className="cart-line">
                <Link to={productPath(line.product.id)} className="cart-line-media">
                  {line.product.imageUrl ? (
                    <img src={line.product.imageUrl} alt={displayName} />
                  ) : (
                    <span className="cart-line-media-placeholder">Нет фото</span>
                  )}
                </Link>
              <div className="cart-line-info">
                <h2>{displayName}</h2>
                <p>{line.product.sku}</p>
                <p className="muted">На складе: {line.product.stockQuantity}</p>
              </div>
              <div className="cart-line-actions">
                <div className="cart-qty-control" aria-label="Количество">
                  <button
                    type="button"
                    className="cart-qty-btn"
                    onClick={() => handleQuantityChange(line.product.id, line.quantity - 1)}
                    disabled={line.quantity <= 1 || Boolean(orderShareText)}
                    aria-label="Уменьшить количество"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className="cart-qty-input"
                    min={1}
                    max={line.product.stockQuantity}
                    value={line.quantity}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (!Number.isFinite(value)) {
                        return;
                      }
                      handleQuantityChange(line.product.id, value);
                    }}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (!Number.isFinite(value) || value < 1) {
                        handleQuantityChange(line.product.id, 1);
                      }
                    }}
                    disabled={Boolean(orderShareText)}
                    aria-label="Количество"
                  />
                  <button
                    type="button"
                    className="cart-qty-btn"
                    onClick={() => handleQuantityChange(line.product.id, line.quantity + 1)}
                    disabled={line.quantity >= line.product.stockQuantity || Boolean(orderShareText)}
                    aria-label="Увеличить количество"
                  >
                    +
                  </button>
                </div>
                <strong>{formatPrice(line.product.price * line.quantity)}</strong>
                <button
                  type="button"
                  className="cart-remove-btn"
                  onClick={() => handleRemove(line.product.id)}
                  disabled={Boolean(orderShareText)}
                >
                  Удалить
                </button>
              </div>
            </article>
              );
            })}
          </div>
          {lines.length > 0 ? <p className="cart-total cart-layout-total">Итого: {formatPrice(cartTotal(lines))}</p> : null}

        {orderShareText ? (
          <section className="checkout-form order-share-panel cart-checkout-form">
            <h2>Заказ готов к отправке</h2>
            <p className="muted order-share-hint">Отправьте заказ в Telegram/Viber или скопируйте текст.</p>
            <textarea className="order-share-text" readOnly value={orderShareText} rows={8} />
            <div className="order-share-actions">
              <button type="button" className="secondary" onClick={() => void handleCopyOrderText()}>
                Копировать
              </button>
              <button
                type="button"
                className="order-share-link"
                onClick={handleTelegramShare}
              >
                Telegram
              </button>
              <button
                type="button"
                className="order-share-link"
                onClick={() => void handleViberShare()}
              >
                Viber
              </button>
            </div>
            {copyFeedback ? <p className="success">{copyFeedback}</p> : null}
            {error ? <p className="error">{error}</p> : null}
            <div className="order-share-finish">
              <button type="button" onClick={handleFinishOrder}>
                Очистить корзину
              </button>
              <Link to="/">Вернуться в каталог</Link>
            </div>
          </section>
        ) : (
          <form className="checkout-form cart-checkout-form" onSubmit={handleCheckout}>
            <h2>Оформление заказа</h2>
            <label>
              Имя
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </label>
            <label className="checkout-comment-field">
              Комментарий
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="submit" disabled={submitting || lines.length === 0}>
              {submitting ? 'Подготовка заказа...' : 'Оформить заказ'}
            </button>
          </form>
        )}
        </div>
        <PopularProductsSidebar products={popularProducts} />
      </section>
    );
  }

  return (
    <>
      {mainContent}
      <AdminModal
        open={shareModal !== null}
        title={shareModal === 'copy' ? 'Текст скопирован' : 'Заказ отправлен'}
        message={shareModal === 'messenger' ? 'Хотите очистить корзину?' : ''}
        variant="success"
        showCancel
        cancelLabel="Закрыть"
        confirmLabel="Очистить корзину"
        onClose={() => void handleShareModalDismiss(false)}
        onConfirm={() => void handleShareModalDismiss(true)}
      />
    </>
  );
}

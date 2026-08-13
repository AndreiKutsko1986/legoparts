import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import type { AdminProduct, Order } from '../adminApi';
import { adminApi, getAdminKey } from '../adminApi';
import { formatDateTime, formatPrice, orderStatusLabels } from '../labels';
import { productDisplayName } from '../productColorFromName';
import { exportOrdersToCsv, exportOrdersToExcel } from './orderExport';
import { useBulkSelection } from './useBulkSelection';
import './AdminCompactForm.css';

const statuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

type OrderLineDraft = {
  productId: string;
  quantity: string;
};

const emptyLine = (): OrderLineDraft => ({ productId: '', quantity: '1' });

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [creating, setCreating] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [markAsCompleted, setMarkAsCompleted] = useState(true);
  const [lines, setLines] = useState<OrderLineDraft[]>([emptyLine()]);
  const [exportError, setExportError] = useState('');

  const orderIds = useMemo(() => orders.map((order) => order.id), [orders]);
  const bulk = useBulkSelection(orderIds);

  const productOptions = useMemo(
    () =>
      [...products].sort((left, right) =>
        productDisplayName(left.nameRu, left.name).localeCompare(
          productDisplayName(right.nameRu, right.name),
          'ru',
          { sensitivity: 'base' },
        ),
      ),
    [products],
  );

  const loadOrders = () => {
    setLoading(true);
    Promise.all([adminApi.getOrders(), adminApi.getProducts()])
      .then(([orderList, productList]) => {
        setOrders(orderList);
        setProducts(productList);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  if (!getAdminKey()) {
    return <Navigate to="/admin/login" replace />;
  }

  const resetForm = () => {
    setCustomerName('');
    setNotes('');
    setMarkAsCompleted(true);
    setLines([emptyLine()]);
    setFormError('');
  };

  const handleLineChange = (index: number, patch: Partial<OrderLineDraft>) => {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    );
  };

  const handleAddLine = () => {
    setLines((current) => [...current, emptyLine()]);
  };

  const handleRemoveLine = (index: number) => {
    setLines((current) => (current.length === 1 ? current : current.filter((_, lineIndex) => lineIndex !== index)));
  };

  const handleCreateOrder = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    setCreating(true);

    const items = lines
      .map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
      }))
      .filter((line) => line.productId);

    if (items.length === 0) {
      setFormError('Выберите хотя бы один товар.');
      setCreating(false);
      return;
    }

    for (const item of items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        setFormError('Укажите корректное количество для каждого товара.');
        setCreating(false);
        return;
      }
    }

    try {
      const created = await adminApi.createOrder({
        customerName: customerName.trim() || undefined,
        notes: notes.trim() || undefined,
        items,
        markAsCompleted,
      });
      setOrders((current) => [created, ...current]);
      setProducts(await adminApi.getProducts());
      resetForm();
      setError('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось создать заказ');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    setError('');
    try {
      const updated = await adminApi.updateOrderStatus(orderId, status);
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      if (status === 'Delivered' || status === 'Cancelled') {
        setProducts(await adminApi.getProducts());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить заказ');
    } finally {
      setUpdatingId('');
    }
  };

  const formatCustomerSummary = (order: Order) => {
    if (order.customerEmail.trim()) {
      return `${order.customerName} · ${order.customerEmail}`;
    }

    return order.customerName;
  };

  const getSelectedOrders = () => orders.filter((order) => bulk.isSelected(order.id));

  const handleExportCsv = () => {
    const selected = getSelectedOrders();
    if (selected.length === 0) {
      setExportError('Выберите хотя бы один заказ для выгрузки.');
      return;
    }

    setExportError('');
    exportOrdersToCsv(selected);
  };

  const handleExportExcel = () => {
    const selected = getSelectedOrders();
    if (selected.length === 0) {
      setExportError('Выберите хотя бы один заказ для выгрузки.');
      return;
    }

    setExportError('');
    exportOrdersToExcel(selected);
  };

  return (
    <section>
      <div className="page-header">
        <h1>Заказы</h1>
        <p>Создание заказов для продаж вне сайта и управление статусами.</p>
      </div>

      <form className="admin-compact-form admin-order-create-form" onSubmit={handleCreateOrder}>
        <h2>Создать заказ</h2>
        <p className="muted admin-order-create-hint">
          Используйте для покупок вне сайта. Склад уменьшится сразу, а «Продано» обновится при статусе «Выполнен».
        </p>
        <label>
          Имя покупателя
          <input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Необязательно"
          />
        </label>
        <label>
          Комментарий
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Необязательно" />
        </label>
        <div className="admin-order-lines">
          <span className="field-label">Товары</span>
          {lines.map((line, index) => (
            <div key={index} className="admin-order-line">
              <select
                value={line.productId}
                onChange={(event) => handleLineChange(index, { productId: event.target.value })}
                required={index === 0}
              >
                <option value="">Выберите товар</option>
                {productOptions.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} · {productDisplayName(product.nameRu, product.name)} (склад: {product.stockQuantity})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                step={1}
                value={line.quantity}
                onChange={(event) => handleLineChange(index, { quantity: event.target.value })}
                aria-label="Количество"
                required
              />
              <button type="button" className="secondary" onClick={() => handleRemoveLine(index)} disabled={lines.length === 1}>
                Удалить
              </button>
            </div>
          ))}
          <button type="button" className="secondary admin-order-add-line" onClick={handleAddLine}>
            Добавить товар
          </button>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={markAsCompleted}
            onChange={(event) => setMarkAsCompleted(event.target.checked)}
          />
          Сразу отметить как выполненный
        </label>
        {formError ? <p className="error">{formError}</p> : null}
        <button type="submit" disabled={creating || productOptions.length === 0}>
          {creating ? 'Создание...' : 'Создать заказ'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Загрузка заказов...</p>
      ) : orders.length === 0 ? (
        <p>Заказов пока нет.</p>
      ) : (
        <>
          <div className="admin-orders-toolbar">
            <label className="checkbox-row admin-orders-select-all">
              <input type="checkbox" checked={bulk.allSelected} onChange={bulk.toggleAll} />
              Выбрать все
            </label>
            {bulk.someSelected ? (
              <div className="bulk-actions-bar admin-orders-export-bar">
                <span>Выбрано: {bulk.selectedCount}</span>
                <button type="button" className="secondary" onClick={handleExportCsv}>
                  CSV
                </button>
                <button type="button" className="secondary" onClick={handleExportExcel}>
                  Excel
                </button>
              </div>
            ) : null}
          </div>
          {exportError ? <p className="error">{exportError}</p> : null}
          <div className="order-list">
          {orders.map((order) => (
            <article key={order.id} className={`order-card${bulk.isSelected(order.id) ? ' order-card-selected' : ''}`}>
              <div className="order-card-header">
                <div className="order-card-title-row">
                  <label className="checkbox-row admin-order-select">
                    <input
                      type="checkbox"
                      checked={bulk.isSelected(order.id)}
                      onChange={() => bulk.toggle(order.id)}
                      aria-label={`Выбрать заказ ${order.orderNumber}`}
                    />
                  </label>
                  <div>
                  <h2>{order.orderNumber}</h2>
                  <p>{formatCustomerSummary(order)}</p>
                  <p>{formatDateTime(order.createdAt)}</p>
                  </div>
                </div>
                <div>
                  <strong>{formatPrice(order.totalAmount)}</strong>
                  <label>
                    Статус
                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {orderStatusLabels[status] ?? status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <ul>
                {order.items.map((item) => (
                  <li key={`${order.id}-${item.productId}`}>
                    {item.productName} x{item.quantity} — {formatPrice(item.lineTotal)}
                  </li>
                ))}
              </ul>
              <p>{order.shippingAddress}</p>
              {order.notes && <p className="muted">Комментарий: {order.notes}</p>}
            </article>
          ))}
          </div>
        </>
      )}
    </section>
  );
}

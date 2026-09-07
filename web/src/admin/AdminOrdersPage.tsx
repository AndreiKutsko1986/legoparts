import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import type { AdminCategory, AdminProduct, AdminSubCategory, Order } from '../adminApi';
import { adminApi, getAdminKey } from '../adminApi';
import { formatDateTime, formatPrice, orderStatusLabels } from '../labels';
import { productDisplayName } from '../productColorFromName';
import { formatBulkResult } from './BulkActionsBar';
import { AdminModal } from './AdminModal';
import { AdminTableRefreshButton } from './AdminTableRefreshButton';
import { exportOrdersToCsv, exportOrdersToExcel } from './orderExport';
import { useBulkSelection } from './useBulkSelection';
import { useContainedTableWheel } from './useContainedTableWheel';
import { useTableSort } from './useTableSort';
import './AdminCompactForm.css';

const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const;

type OrderLineDraft = {
  productId: string;
  quantity: string;
};

type OrderSortColumn =
  | 'orderNumber'
  | 'createdAt'
  | 'customerName'
  | 'status'
  | 'totalAmount'
  | 'categoryName'
  | 'subCategoryName'
  | 'productSku'
  | 'productName'
  | 'quantity'
  | 'unitPrice'
  | 'lineTotal';

type OrderLineRow = {
  rowKey: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  notes?: string;
  status: string;
  totalAmount: number;
  productId: string;
  productSku: string;
  productName: string;
  productNameRu: string;
  partNumber: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isOrderGroupStart: boolean;
};

type OrdersModalState =
  | { open: false }
  | {
      open: true;
      title: string;
      message: string;
      variant: 'default' | 'success' | 'error' | 'warning' | 'danger';
      confirmLabel: string;
      showCancel: boolean;
      onConfirm?: () => void;
    };

const closedModal: OrdersModalState = { open: false };
const emptyLine = (): OrderLineDraft => ({ productId: '', quantity: '1' });
const compareText = (left: string, right: string) => left.localeCompare(right, 'ru', { sensitivity: 'base' });

function flattenOrdersToRows(orders: Order[]): OrderLineRow[] {
  const rows: OrderLineRow[] = [];

  for (const order of orders) {
    if (order.items.length === 0) {
      rows.push({
        rowKey: `${order.id}-empty`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress,
        notes: order.notes,
        status: order.status,
        totalAmount: order.totalAmount,
        productId: '',
        productSku: '',
        productName: '',
        productNameRu: '',
        partNumber: '',
        categoryId: '',
        categoryName: '',
        subCategoryId: '',
        subCategoryName: '',
        quantity: 0,
        unitPrice: 0,
        lineTotal: 0,
        isOrderGroupStart: true,
      });
      continue;
    }

    order.items.forEach((item, index) => {
      rows.push({
        rowKey: `${order.id}-${item.productId}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress,
        notes: order.notes,
        status: order.status,
        totalAmount: order.totalAmount,
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        productNameRu: item.productNameRu,
        partNumber: item.partNumber,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        subCategoryId: item.subCategoryId,
        subCategoryName: item.subCategoryName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        isOrderGroupStart: index === 0,
      });
    });
  }

  return rows;
}

function compareOrderRows(
  left: OrderLineRow,
  right: OrderLineRow,
  column: OrderSortColumn,
  direction: 'asc' | 'desc',
) {
  let result = 0;

  switch (column) {
    case 'orderNumber':
      result = compareText(left.orderNumber, right.orderNumber);
      break;
    case 'createdAt':
      result = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      break;
    case 'customerName':
      result = compareText(left.customerName, right.customerName);
      break;
    case 'status':
      result = compareText(left.status, right.status);
      break;
    case 'totalAmount':
      result = left.totalAmount - right.totalAmount;
      break;
    case 'categoryName':
      result = compareText(left.categoryName, right.categoryName);
      break;
    case 'subCategoryName':
      result = compareText(left.subCategoryName, right.subCategoryName);
      break;
    case 'productSku':
      result = compareText(left.productSku, right.productSku);
      break;
    case 'productName':
      result = compareText(
        productDisplayName(left.productNameRu, left.productName),
        productDisplayName(right.productNameRu, right.productName),
      );
      break;
    case 'quantity':
      result = left.quantity - right.quantity;
      break;
    case 'unitPrice':
      result = left.unitPrice - right.unitPrice;
      break;
    case 'lineTotal':
      result = left.lineTotal - right.lineTotal;
      break;
  }

  if (result !== 0) {
    return direction === 'asc' ? result : -result;
  }

  const orderCompare = compareText(left.orderNumber, right.orderNumber);
  if (orderCompare !== 0) {
    return orderCompare;
  }

  return compareText(left.productSku, right.productSku);
}

function formatCustomerSummary(row: OrderLineRow) {
  const parts = [row.customerName.trim()];
  if (row.customerEmail.trim()) {
    parts.push(row.customerEmail.trim());
  }
  if (row.customerPhone?.trim()) {
    parts.push(row.customerPhone.trim());
  }
  return parts.filter(Boolean).join(' · ');
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [subCategories, setSubCategories] = useState<AdminSubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [exportError, setExportError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [markAsCompleted, setMarkAsCompleted] = useState(true);
  const [lines, setLines] = useState<OrderLineDraft[]>([emptyLine()]);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState<OrdersModalState>(closedModal);

  const { sortColumn, sortDirection, toggleSort, getSortIndicator, resetSort } = useTableSort<OrderSortColumn>(
    'createdAt',
    'desc',
  );
  const handleTableWheel = useContainedTableWheel();

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

  const categoryOptions = useMemo(
    () => [...categories].sort((left, right) => compareText(left.name, right.name)),
    [categories],
  );

  const subCategoryOptions = useMemo(() => {
    const filtered = categoryFilter
      ? subCategories.filter((item) => item.categoryId === categoryFilter)
      : subCategories;
    return [...filtered].sort((left, right) => compareText(left.name, right.name));
  }, [categoryFilter, subCategories]);

  const allRows = useMemo(() => flattenOrdersToRows(orders), [orders]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allRows.filter((row) => {
      if (statusFilter && row.status !== statusFilter) {
        return false;
      }
      if (categoryFilter && row.categoryId !== categoryFilter) {
        return false;
      }
      if (subCategoryFilter && row.subCategoryId !== subCategoryFilter) {
        return false;
      }
      if (!query) {
        return true;
      }

      const haystack = [
        row.orderNumber,
        row.customerName,
        row.customerEmail,
        row.customerPhone ?? '',
        row.shippingAddress,
        row.notes ?? '',
        row.productSku,
        row.partNumber,
        row.productName,
        row.productNameRu,
        row.categoryName,
        row.subCategoryName,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [allRows, categoryFilter, searchQuery, statusFilter, subCategoryFilter]);

  const displayedRows = useMemo(() => {
    const sorted = [...filteredRows].sort((left, right) =>
      compareOrderRows(left, right, sortColumn, sortDirection),
    );

    let previousOrderId = '';
    return sorted.map((row) => {
      const isOrderGroupStart = row.orderId !== previousOrderId;
      previousOrderId = row.orderId;
      return { ...row, isOrderGroupStart };
    });
  }, [filteredRows, sortColumn, sortDirection]);

  const visibleOrderIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const row of displayedRows) {
      if (!seen.has(row.orderId)) {
        seen.add(row.orderId);
        ids.push(row.orderId);
      }
    }
    return ids;
  }, [displayedRows]);

  const bulk = useBulkSelection(visibleOrderIds);

  const closeModal = () => setModal(closedModal);

  const showAlert = (title: string, message: string, variant: 'success' | 'error' | 'warning' = 'success') => {
    setModal({
      open: true,
      title,
      message,
      variant,
      confirmLabel: 'OK',
      showCancel: false,
    });
  };

  const loadOrders = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminApi.getOrders(),
      adminApi.getProducts(),
      adminApi.getCategories(),
      adminApi.getSubCategories(),
    ])
      .then(([orderList, productList, categoryList, subCategoryList]) => {
        setOrders(orderList);
        setProducts(productList);
        setCategories(categoryList);
        setSubCategories(subCategoryList);
        setError('');
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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

  const mergeUpdatedOrders = (updatedOrders: Order[]) => {
    if (updatedOrders.length === 0) {
      return;
    }

    const byId = new Map(updatedOrders.map((order) => [order.id, order]));
    setOrders((current) => current.map((order) => byId.get(order.id) ?? order));
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    setError('');
    try {
      const updated = await adminApi.updateOrderStatus(orderId, status);
      mergeUpdatedOrders([updated]);
      if (status === 'Delivered' || status === 'Cancelled') {
        setProducts(await adminApi.getProducts());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить заказ');
    } finally {
      setUpdatingId('');
    }
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

  const handleBulkStatusChange = async (status: string) => {
    const selectedIds = visibleOrderIds.filter((id) => bulk.isSelected(id));
    if (selectedIds.length === 0) {
      return;
    }

    setBulkLoading(true);
    setError('');
    setExportError('');

    try {
      const result = await adminApi.bulkUpdateOrderStatus(selectedIds, status);
      mergeUpdatedOrders(result.orders);
      bulk.clear();

      if (status === 'Delivered' || status === 'Cancelled') {
        setProducts(await adminApi.getProducts());
      }

      showAlert(
        'Массовое обновление',
        formatBulkResult(result.processedCount, result.failedCount, result.errors),
        result.failedCount > 0 ? 'warning' : 'success',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить заказы');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleTableRefresh = () => {
    resetSort();
    setStatusFilter('');
    setCategoryFilter('');
    setSubCategoryFilter('');
    setSearchQuery('');
    bulk.clear();
    loadOrders();
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    setSubCategoryFilter('');
  };

  const uniqueOrderCount = visibleOrderIds.length;

  return (
    <section className="admin-orders-page">
      <AdminModal
        open={modal.open}
        title={modal.open ? modal.title : ''}
        message={modal.open ? modal.message : ''}
        variant={modal.open ? modal.variant : 'default'}
        confirmLabel={modal.open ? modal.confirmLabel : 'OK'}
        showCancel={modal.open ? modal.showCancel : false}
        onConfirm={() => {
          if (modal.open && modal.onConfirm) {
            modal.onConfirm();
          }
          closeModal();
        }}
        onClose={closeModal}
      />

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

      {error ? <p className="error">{error}</p> : null}

      <div className="admin-table-wrap admin-table-wrap-scrollable">
        <div className="admin-table-sticky-top">
          <div className="admin-table-filters">
            <AdminTableRefreshButton onClick={handleTableRefresh} disabled={loading || bulkLoading} />
            <label>
              Статус
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">Все</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {orderStatusLabels[status] ?? status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Категория
              <select value={categoryFilter} onChange={(event) => handleCategoryFilterChange(event.target.value)}>
                <option value="">Все</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Подкатегория
              <select
                value={subCategoryFilter}
                onChange={(event) => setSubCategoryFilter(event.target.value)}
                disabled={subCategoryOptions.length === 0}
              >
                <option value="">Все</option>
                {subCategoryOptions.map((subCategory) => (
                  <option key={subCategory.id} value={subCategory.id}>
                    {subCategory.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Поиск
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Номер, покупатель, SKU, товар..."
              />
            </label>
            <span className="admin-table-filters-count">
              Строк: {displayedRows.length} · Заказов: {uniqueOrderCount} из {orders.length}
            </span>
          </div>

          {bulk.someSelected ? (
            <div className="bulk-actions-bar admin-orders-bulk-bar">
              <span>Выбрано заказов: {bulk.selectedCount}</span>
              {ORDER_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className="secondary"
                  disabled={bulkLoading || loading}
                  onClick={() => void handleBulkStatusChange(status)}
                >
                  {orderStatusLabels[status] ?? status}
                </button>
              ))}
              <button type="button" className="secondary" disabled={bulkLoading || loading} onClick={handleExportCsv}>
                CSV
              </button>
              <button type="button" className="secondary" disabled={bulkLoading || loading} onClick={handleExportExcel}>
                Excel
              </button>
            </div>
          ) : null}
          {exportError ? <p className="error admin-orders-export-error">{exportError}</p> : null}
        </div>

        {loading ? (
          <p className="admin-table-scroll-status">Загрузка заказов...</p>
        ) : orders.length === 0 ? (
          <p className="admin-table-scroll-status">Заказов пока нет.</p>
        ) : (
          <div className="admin-table-scroll" onWheel={handleTableWheel}>
            <table className="admin-table admin-table-sticky-head admin-orders-table">
              <thead>
                <tr>
                  <th className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={bulk.allSelected}
                      onChange={bulk.toggleAll}
                      aria-label="Выбрать все заказы"
                    />
                  </th>
                  <th>
                    <button type="button" className="sortable-header" onClick={() => toggleSort('orderNumber')}>
                      Заказ <span className="sort-indicator">{getSortIndicator('orderNumber')}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sortable-header" onClick={() => toggleSort('createdAt')}>
                      Дата <span className="sort-indicator">{getSortIndicator('createdAt')}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sortable-header" onClick={() => toggleSort('customerName')}>
                      Покупатель <span className="sort-indicator">{getSortIndicator('customerName')}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sortable-header" onClick={() => toggleSort('status')}>
                      Статус <span className="sort-indicator">{getSortIndicator('status')}</span>
                    </button>
                  </th>
                  <th className="admin-table-numeric-col">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('totalAmount')}>
                      Сумма <span className="sort-indicator">{getSortIndicator('totalAmount')}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sortable-header" onClick={() => toggleSort('categoryName')}>
                      Категория <span className="sort-indicator">{getSortIndicator('categoryName')}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sortable-header" onClick={() => toggleSort('subCategoryName')}>
                      Подкатегория <span className="sort-indicator">{getSortIndicator('subCategoryName')}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sortable-header" onClick={() => toggleSort('productSku')}>
                      SKU <span className="sort-indicator">{getSortIndicator('productSku')}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sortable-header" onClick={() => toggleSort('productName')}>
                      Товар <span className="sort-indicator">{getSortIndicator('productName')}</span>
                    </button>
                  </th>
                  <th className="admin-table-numeric-col">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('quantity')}>
                      Кол-во <span className="sort-indicator">{getSortIndicator('quantity')}</span>
                    </button>
                  </th>
                  <th className="admin-table-numeric-col">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('unitPrice')}>
                      Цена <span className="sort-indicator">{getSortIndicator('unitPrice')}</span>
                    </button>
                  </th>
                  <th className="admin-table-numeric-col">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('lineTotal')}>
                      Строка <span className="sort-indicator">{getSortIndicator('lineTotal')}</span>
                    </button>
                  </th>
                  <th className="admin-orders-col-meta">
                    Примеч.
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={15}>Заказы не найдены.</td>
                  </tr>
                ) : (
                  displayedRows.map((row) => (
                    <tr
                      key={row.rowKey}
                      className={bulk.isSelected(row.orderId) ? 'admin-orders-row-selected' : undefined}
                    >
                      <td className="checkbox-cell">
                        {row.isOrderGroupStart ? (
                          <input
                            type="checkbox"
                            checked={bulk.isSelected(row.orderId)}
                            onChange={() => bulk.toggle(row.orderId)}
                            aria-label={`Выбрать заказ ${row.orderNumber}`}
                          />
                        ) : null}
                      </td>
                      <td>{row.isOrderGroupStart ? row.orderNumber : ''}</td>
                      <td>{row.isOrderGroupStart ? formatDateTime(row.createdAt) : ''}</td>
                      <td className="admin-table-clip-cell">
                        {row.isOrderGroupStart ? (
                          <span className="admin-table-truncate" title={formatCustomerSummary(row)}>
                            {formatCustomerSummary(row)}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {row.isOrderGroupStart ? (
                          <select
                            className="admin-orders-status-select"
                            value={row.status}
                            disabled={updatingId === row.orderId || bulkLoading}
                            onChange={(event) => void handleStatusChange(row.orderId, event.target.value)}
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {orderStatusLabels[status] ?? status}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </td>
                      <td className="admin-table-numeric-cell">
                        {row.isOrderGroupStart ? formatPrice(row.totalAmount) : ''}
                      </td>
                      <td className="admin-table-clip-cell">
                        <span className="admin-table-truncate" title={row.categoryName || undefined}>
                          {row.categoryName || '—'}
                        </span>
                      </td>
                      <td className="admin-table-clip-cell">
                        <span className="admin-table-truncate" title={row.subCategoryName || undefined}>
                          {row.subCategoryName || '—'}
                        </span>
                      </td>
                      <td>{row.productSku || '—'}</td>
                      <td className="admin-table-clip-cell">
                        <span
                          className="admin-table-truncate"
                          title={productDisplayName(row.productNameRu, row.productName) || undefined}
                        >
                          {row.productId ? productDisplayName(row.productNameRu, row.productName) : '—'}
                        </span>
                        {row.partNumber ? <span className="muted admin-orders-part-number">{row.partNumber}</span> : null}
                      </td>
                      <td className="admin-table-numeric-cell">{row.productId ? row.quantity : '—'}</td>
                      <td className="admin-table-numeric-cell">
                        {row.productId ? formatPrice(row.unitPrice) : '—'}
                      </td>
                      <td className="admin-table-numeric-cell">
                        {row.productId ? formatPrice(row.lineTotal) : '—'}
                      </td>
                      <td className="admin-table-clip-cell admin-orders-col-meta">
                        {row.isOrderGroupStart ? (
                          <div className="admin-orders-meta">
                            {row.notes ? <span className="admin-table-truncate" title={row.notes}>{row.notes}</span> : null}
                            <span className="muted admin-table-truncate" title={row.shippingAddress}>
                              {row.shippingAddress}
                            </span>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

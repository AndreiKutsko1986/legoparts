import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import type { AdminCategory } from '../adminApi';
import { adminApi, getAdminKey } from '../adminApi';
import { BulkActionsBar, formatBulkResult } from './BulkActionsBar';
import { AdminActiveStatusIcon } from './AdminActiveStatusIcon';
import { AdminModal } from './AdminModal';
import { AdminTableRefreshButton } from './AdminTableRefreshButton';
import { useBulkSelection } from './useBulkSelection';
import { useTableSort } from './useTableSort';
import { finalizeAdminTableSort } from './adminTableSortHelpers';
import { useAdminTableResize } from './useAdminTableResize';
import { ADMIN_CATEGORIES_COLUMN_WIDTHS } from './adminTableColumnDefaults';
import { ADMIN_TABLE_KEYS } from './adminTableColumnWidthStore';
import './AdminCompactForm.css';

const emptyForm = { name: '', slug: '', description: '', isActive: true };

type CategorySortColumn = 'name' | 'slug' | 'subCategoryCount' | 'isActive';

type CategoryModalState =
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

const closedModal: CategoryModalState = { open: false };

const compareText = (left: string, right: string) => left.localeCompare(right, 'ru', { sensitivity: 'base' });

const compareCategories = (
  left: AdminCategory,
  right: AdminCategory,
  column: CategorySortColumn,
  direction: 'asc' | 'desc',
) => {
  let result = 0;

  switch (column) {
    case 'name':
      result = compareText(left.name, right.name);
      break;
    case 'slug':
      result = compareText(left.slug, right.slug);
      break;
    case 'subCategoryCount':
      result = left.subCategoryCount - right.subCategoryCount;
      break;
    case 'isActive':
      result = Number(left.isActive) - Number(right.isActive);
      break;
  }

  return direction === 'asc' ? result : -result;
};

export function AdminCategoriesPage() {
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [modal, setModal] = useState<CategoryModalState>(closedModal);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const { sortColumn, sortDirection, toggleSort, getSortIndicator, resetSort } = useTableSort<CategorySortColumn>('isActive', 'desc');
  const { tableRef, resetColumnWidths } = useAdminTableResize(ADMIN_TABLE_KEYS.categories, ADMIN_CATEGORIES_COLUMN_WIDTHS);

  const displayedItems = useMemo(
    () =>
      [...items].sort((left, right) =>
        finalizeAdminTableSort(
          compareCategories(left, right, sortColumn, sortDirection),
          left,
          right,
          (item) => item.name,
        ),
      ),
    [items, sortColumn, sortDirection],
  );

  const itemIds = useMemo(() => displayedItems.map((item) => item.id), [displayedItems]);
  const bulk = useBulkSelection(itemIds);

  const closeModal = () => setModal(closedModal);

  const showAlert = (
    title: string,
    message: string,
    variant: 'success' | 'error' | 'warning' = 'success',
  ) => {
    setModal({
      open: true,
      title,
      message,
      variant,
      confirmLabel: 'OK',
      showCancel: false,
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    confirmLabel: string,
    variant: 'default' | 'danger' | 'warning',
    onConfirm: () => void,
  ) => {
    setModal({
      open: true,
      title,
      message,
      variant,
      confirmLabel,
      showCancel: true,
      onConfirm,
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getCategories();
      setItems(data);
      bulk.pruneMissing(data.map((item) => item.id));
    } catch (err) {
      showAlert('Ошибка', err instanceof Error ? err.message : 'Ошибка загрузки категорий', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!getAdminKey()) {
    return <Navigate to="/admin/login" replace />;
  }

  const clearForm = () => {
    setForm(emptyForm);
    setEditingId('');
  };

  const handleTableRefresh = () => {
    resetSort();
    resetColumnWidths();
    bulk.clear();
    void load();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const categoryLabel = form.name;
    const isEdit = Boolean(editingId);

    try {
      if (isEdit) {
        await adminApi.updateCategory(editingId, form);
      } else {
        await adminApi.createCategory(form);
      }
      clearForm();
      await load();
      showAlert(
        isEdit ? 'Категория обновлена' : 'Категория добавлена',
        `«${categoryLabel}» успешно ${isEdit ? 'обновлена' : 'добавлена'}.`,
        'success',
      );
    } catch (err) {
      showAlert(
        isEdit ? 'Не удалось обновить' : 'Не удалось добавить',
        err instanceof Error ? err.message : 'Не удалось сохранить категорию',
        'error',
      );
    }
  };

  const handleEdit = (item: AdminCategory) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description ?? '',
      isActive: item.isActive,
    });
  };

  const executeBulkAction = async (action: 'delete' | 'activate' | 'deactivate') => {
    setBulkLoading(true);

    const actionTitles = {
      delete: 'Удаление',
      activate: 'Активация',
      deactivate: 'Деактивация',
    };

    try {
      const result =
        action === 'delete'
          ? await adminApi.bulkDeleteCategories(bulk.selectedIds)
          : action === 'activate'
            ? await adminApi.bulkActivateCategories(bulk.selectedIds)
            : await adminApi.bulkDeactivateCategories(bulk.selectedIds);

      if (result.failedCount === 0) {
        bulk.clear();
      }
      if (editingId && bulk.selectedIds.includes(editingId)) {
        clearForm();
      }
      await load();

      showAlert(
        actionTitles[action],
        formatBulkResult(result.processedCount, result.failedCount, result.errors),
        result.failedCount === 0 ? 'success' : 'warning',
      );
    } catch (err) {
      showAlert(
        'Ошибка',
        err instanceof Error ? err.message : 'Не удалось выполнить массовое действие',
        'error',
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const requestBulkAction = (action: 'delete' | 'activate' | 'deactivate') => {
    if (bulk.selectedIds.length === 0) {
      showAlert('Ничего не выбрано', 'Выберите хотя бы одну категорию.', 'warning');
      return;
    }

    const count = bulk.selectedIds.length;
    const configs = {
      delete: {
        title: 'Удалить категории?',
        message: `Будет удалено категорий: ${count}. Категории с товарами не удаляются.`,
        confirmLabel: 'Удалить',
        variant: 'danger' as const,
      },
      activate: {
        title: 'Активировать категории?',
        message: `Сделать активными выбранные категории: ${count}.`,
        confirmLabel: 'Активировать',
        variant: 'default' as const,
      },
      deactivate: {
        title: 'Деактивировать категории?',
        message: `Скрыть выбранные категории: ${count}.`,
        confirmLabel: 'Деактивировать',
        variant: 'warning' as const,
      },
    };

    const config = configs[action];
    showConfirm(config.title, config.message, config.confirmLabel, config.variant, () => {
      closeModal();
      void executeBulkAction(action);
    });
  };

  return (
    <section className="admin-products-page">
      <div className="page-header page-header-compact">
        <h1>Категории</h1>
      </div>
      <AdminModal
        open={modal.open}
        title={modal.open ? modal.title : ''}
        message={modal.open ? modal.message : ''}
        variant={modal.open ? modal.variant : 'default'}
        confirmLabel={modal.open ? modal.confirmLabel : 'OK'}
        showCancel={modal.open ? modal.showCancel : false}
        onConfirm={modal.open ? modal.onConfirm : undefined}
        onClose={closeModal}
      />
      <div className="admin-grid">
        <form className="admin-compact-form admin-compact-form-tight" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Редактировать категорию' : 'Добавить категорию'}</h2>
          <label>
            Название
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Slug
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="создаётся автоматически, если пусто"
            />
          </label>
          <label>
            Описание
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Необязательное описание категории"
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Активна
          </label>
          <div className="form-actions">
            <button type="submit">{editingId ? 'Обновить' : 'Создать'}</button>
            <button type="button" className="secondary" onClick={clearForm}>
              Очистить форму
            </button>
          </div>
        </form>
        <div className="admin-table-wrap">
          <div className="admin-table-filters">
            <AdminTableRefreshButton onClick={handleTableRefresh} disabled={loading || bulkLoading} />
            <span className="admin-table-filters-count">
              Показано {displayedItems.length} из {items.length}
            </span>
          </div>
          <BulkActionsBar
            selectedCount={bulk.selectedCount}
            disabled={bulkLoading || loading}
            onActivate={() => requestBulkAction('activate')}
            onDeactivate={() => requestBulkAction('deactivate')}
            onDelete={() => requestBulkAction('delete')}
          />
          {loading ? (
            <p>Загрузка...</p>
          ) : (
            <table ref={tableRef} className="admin-table">
                <thead>
                  <tr>
                    <th className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={bulk.allSelected}
                        onChange={bulk.toggleAll}
                        aria-label="Выбрать все категории"
                      />
                    </th>
                    <th>
                      <button type="button" className="sortable-header" onClick={() => toggleSort('name')}>
                        Название <span className="sort-indicator">{getSortIndicator('name')}</span>
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sortable-header" onClick={() => toggleSort('slug')}>
                        Slug <span className="sort-indicator">{getSortIndicator('slug')}</span>
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sortable-header" onClick={() => toggleSort('subCategoryCount')}>
                        Подкатегории <span className="sort-indicator">{getSortIndicator('subCategoryCount')}</span>
                      </button>
                    </th>
                    <th>
                      <button type="button" className="sortable-header" onClick={() => toggleSort('isActive')}>
                        Статус <span className="sort-indicator">{getSortIndicator('isActive')}</span>
                      </button>
                    </th>
                    <th className="table-actions-col" aria-label="Действия" />
                  </tr>
                </thead>
                <tbody>
                  {displayedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6}>Категории не найдены.</td>
                    </tr>
                  ) : (
                    displayedItems.map((item) => (
                      <tr key={item.id}>
                        <td className="checkbox-cell">
                          <input
                            type="checkbox"
                            checked={bulk.isSelected(item.id)}
                            onChange={() => bulk.toggle(item.id)}
                            aria-label={`Выбрать ${item.name}`}
                          />
                        </td>
                        <td>{item.name}</td>
                        <td>{item.slug}</td>
                        <td>{item.subCategoryCount}</td>
                        <td className="admin-table-status-cell">
                          <AdminActiveStatusIcon
                            isActive={item.isActive}
                            activeLabel="Активна"
                            inactiveLabel="Неактивна"
                          />
                        </td>
                        <td className="table-actions">
                          <button type="button" onClick={() => handleEdit(item)}>
                            Изменить
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
          )}
        </div>
      </div>
    </section>
  );
}

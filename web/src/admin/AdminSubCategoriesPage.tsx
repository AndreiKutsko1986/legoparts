import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import type { AdminCategory, AdminSubCategory } from '../adminApi';
import { adminApi, getAdminKey } from '../adminApi';
import { BulkActionsBar, formatBulkResult } from './BulkActionsBar';
import { AdminActiveStatusIcon } from './AdminActiveStatusIcon';
import { AdminModal } from './AdminModal';
import { AdminTableRefreshButton } from './AdminTableRefreshButton';
import { useBulkSelection } from './useBulkSelection';
import { useTableSort } from './useTableSort';
import { finalizeAdminTableSort } from './adminTableSortHelpers';
import { useAdminTableResize } from './useAdminTableResize';
import { ADMIN_SUBCATEGORIES_COLUMN_WIDTHS } from './adminTableColumnDefaults';
import { ADMIN_TABLE_KEYS } from './adminTableColumnWidthStore';
import './AdminCompactForm.css';

const emptyForm = { categoryId: '', name: '', slug: '', description: '', isActive: true };

type SubCategorySortColumn = 'categoryName' | 'name' | 'slug' | 'productCount' | 'isActive';

type SubCategoryModalState =
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

const closedModal: SubCategoryModalState = { open: false };

const compareText = (left: string, right: string) => left.localeCompare(right, 'ru', { sensitivity: 'base' });

const compareSubCategories = (
  left: AdminSubCategory,
  right: AdminSubCategory,
  column: SubCategorySortColumn,
  direction: 'asc' | 'desc',
) => {
  let result = 0;

  switch (column) {
    case 'categoryName':
      result = compareText(left.categoryName, right.categoryName);
      break;
    case 'name':
      result = compareText(left.name, right.name);
      break;
    case 'slug':
      result = compareText(left.slug, right.slug);
      break;
    case 'productCount':
      result = left.productCount - right.productCount;
      break;
    case 'isActive':
      result = Number(left.isActive) - Number(right.isActive);
      break;
  }

  return direction === 'asc' ? result : -result;
};

export function AdminSubCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [items, setItems] = useState<AdminSubCategory[]>([]);
  const [listFilterCategoryId, setListFilterCategoryId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [modal, setModal] = useState<SubCategoryModalState>(closedModal);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const { sortColumn, sortDirection, toggleSort, getSortIndicator, resetSort } = useTableSort<SubCategorySortColumn>('isActive', 'desc');
  const { tableRef, resetColumnWidths } = useAdminTableResize(ADMIN_TABLE_KEYS.subcategories, ADMIN_SUBCATEGORIES_COLUMN_WIDTHS);

  const displayedItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (listFilterCategoryId && item.categoryId !== listFilterCategoryId) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((left, right) =>
      finalizeAdminTableSort(
        compareSubCategories(left, right, sortColumn, sortDirection),
        left,
        right,
        (item) => item.name,
      ),
    );
  }, [items, listFilterCategoryId, sortColumn, sortDirection]);

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

  const loadCategories = useCallback(async (preferredCategoryId?: string) => {
    setCatalogLoading(true);
    try {
      const data = await adminApi.getCategories();
      setCategories(data);

      const nextCategoryId =
        preferredCategoryId && data.some((item) => item.id === preferredCategoryId)
          ? preferredCategoryId
          : data[0]?.id ?? '';

      setForm((current) => ({
        ...current,
        categoryId: current.categoryId && data.some((item) => item.id === current.categoryId)
          ? current.categoryId
          : nextCategoryId,
      }));
    } catch (err) {
      showAlert('Ошибка', err instanceof Error ? err.message : 'Не удалось загрузить категории', 'error');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadSubCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSubCategories();
      setItems(data);
      bulk.pruneMissing(data.map((item) => item.id));
    } catch (err) {
      showAlert('Ошибка', err instanceof Error ? err.message : 'Ошибка загрузки подкатегорий', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    await Promise.all([loadCategories(), loadSubCategories()]);
  }, [loadCategories, loadSubCategories]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!getAdminKey()) {
    return <Navigate to="/admin/login" replace />;
  }

  const clearForm = () => {
    setForm({
      ...emptyForm,
      categoryId: categories[0]?.id ?? '',
    });
    setEditingId('');
  };

  const handleTableRefresh = () => {
    setListFilterCategoryId('');
    resetSort();
    resetColumnWidths();
    bulk.clear();
    void load();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.categoryId) {
      showAlert('Проверьте форму', 'Выберите категорию.', 'warning');
      return;
    }

    const subCategoryLabel = form.name;
    const isEdit = Boolean(editingId);

    try {
      if (isEdit) {
        await adminApi.updateSubCategory(editingId, form);
      } else {
        await adminApi.createSubCategory(form);
      }
      clearForm();
      await loadSubCategories();
      showAlert(
        isEdit ? 'Подкатегория обновлена' : 'Подкатегория добавлена',
        `«${subCategoryLabel}» успешно ${isEdit ? 'обновлена' : 'добавлена'}.`,
        'success',
      );
    } catch (err) {
      showAlert(
        isEdit ? 'Не удалось обновить' : 'Не удалось добавить',
        err instanceof Error ? err.message : 'Не удалось сохранить подкатегорию',
        'error',
      );
    }
  };

  const handleEdit = (item: AdminSubCategory) => {
    setEditingId(item.id);
    setForm({
      categoryId: item.categoryId,
      name: item.name,
      slug: item.slug,
      description: item.description ?? '',
      isActive: item.isActive,
    });
    void loadCategories(item.categoryId);
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
          ? await adminApi.bulkDeleteSubCategories(bulk.selectedIds)
          : action === 'activate'
            ? await adminApi.bulkActivateSubCategories(bulk.selectedIds)
            : await adminApi.bulkDeactivateSubCategories(bulk.selectedIds);

      if (result.failedCount === 0) {
        bulk.clear();
      }
      if (editingId && bulk.selectedIds.includes(editingId)) {
        clearForm();
      }
      await loadSubCategories();

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
      showAlert('Ничего не выбрано', 'Выберите хотя бы одну подкатегорию.', 'warning');
      return;
    }

    const count = bulk.selectedIds.length;
    const configs = {
      delete: {
        title: 'Удалить подкатегории?',
        message: `Будет удалено подкатегорий: ${count}. Подкатегории с товарами не удаляются.`,
        confirmLabel: 'Удалить',
        variant: 'danger' as const,
      },
      activate: {
        title: 'Активировать подкатегории?',
        message: `Сделать активными выбранные подкатегории: ${count}.`,
        confirmLabel: 'Активировать',
        variant: 'default' as const,
      },
      deactivate: {
        title: 'Деактивировать подкатегории?',
        message: `Скрыть выбранные подкатегории: ${count}.`,
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
        <h1>Подкатегории</h1>
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
        <form className="admin-compact-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Редактировать подкатегорию' : 'Добавить подкатегорию'}</h2>
          <label>
            Категория
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
              disabled={catalogLoading || categories.length === 0}
            >
              <option value="" disabled>
                {catalogLoading ? 'Загрузка категорий...' : 'Выберите категорию'}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
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
              placeholder="Необязательное описание подкатегории"
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
            <button type="submit" disabled={catalogLoading || !form.categoryId}>
              {editingId ? 'Обновить' : 'Создать'}
            </button>
            <button type="button" className="secondary" onClick={clearForm}>
              Очистить форму
            </button>
          </div>
        </form>
        <div className="admin-table-wrap">
          <div className="admin-table-filters">
            <label>
              Категория
              <select
                value={listFilterCategoryId}
                onChange={(e) => setListFilterCategoryId(e.target.value)}
              >
                <option value="">Все</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
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
                        aria-label="Выбрать все подкатегории"
                      />
                    </th>
                    <th>
                      <button type="button" className="sortable-header" onClick={() => toggleSort('categoryName')}>
                        Категория <span className="sort-indicator">{getSortIndicator('categoryName')}</span>
                      </button>
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
                      <button type="button" className="sortable-header" onClick={() => toggleSort('productCount')}>
                        Товары <span className="sort-indicator">{getSortIndicator('productCount')}</span>
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
                      <td colSpan={7}>Подкатегории не найдены.</td>
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
                        <td>{item.categoryName}</td>
                        <td>{item.name}</td>
                        <td>{item.slug}</td>
                        <td>{item.productCount}</td>
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

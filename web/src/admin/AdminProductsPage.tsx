import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { AdminCategory, AdminProduct, AdminSubCategory, ProductImageOptions } from '../adminApi';
import { adminApi, getAdminKey } from '../adminApi';
import { BulkActionsBar, formatBulkResult } from './BulkActionsBar';
import { AdminActiveStatusIcon } from './AdminActiveStatusIcon';
import { AdminClickableImage } from './AdminClickableImage';
import { AdminModal } from './AdminModal';
import { AdminTableRefreshButton } from './AdminTableRefreshButton';
import { useBulkSelection } from './useBulkSelection';
import { useContainedTableWheel } from './useContainedTableWheel';
import { useTableSort } from './useTableSort';
import { finalizeAdminTableSort } from './adminTableSortHelpers';
import { useAdminTableResize } from './useAdminTableResize';
import { ADMIN_PRODUCTS_COLUMN_WIDTHS } from './adminTableColumnDefaults';
import { ADMIN_TABLE_KEYS } from './adminTableColumnWidthStore';
import { ProductColorPicker } from './ProductColorPicker';
import { ProductColorPopoverPicker } from './ProductColorPopoverPicker';
import { DEFAULT_PRODUCT_COLOR, parseStoredProductColor, type ProductColorId } from './productColors';
import { productDisplayName, productDisplayNameEn, productDisplayNameRu, normalizeProductName } from '../productColorFromName';
import './AdminCompactForm.css';

type ProductSortColumn = 'sku' | 'partNumber' | 'name' | 'nameRu' | 'description' | 'color' | 'categoryName' | 'subCategoryName' | 'price' | 'initialQuantity' | 'soldQuantity' | 'stockQuantity' | 'popularityRating' | 'isActive';

const compareText = (left: string, right: string) => left.localeCompare(right, 'ru', { sensitivity: 'base' });

const compareProducts = (
  left: AdminProduct,
  right: AdminProduct,
  column: ProductSortColumn,
  direction: 'asc' | 'desc',
) => {
  let result = 0;

  switch (column) {
    case 'sku':
      result = compareText(left.sku, right.sku);
      break;
    case 'partNumber':
      result = compareText(left.partNumber, right.partNumber);
      break;
    case 'name':
      result = compareText(left.name, right.name);
      break;
    case 'nameRu':
      result = compareText(left.nameRu, right.nameRu);
      break;
    case 'description':
      result = compareText(left.description, right.description);
      break;
    case 'color':
      result = compareText(left.color, right.color);
      break;
    case 'categoryName':
      result = compareText(left.categoryName, right.categoryName);
      break;
    case 'subCategoryName':
      result = compareText(left.subCategoryName, right.subCategoryName);
      break;
    case 'price':
      result = left.price - right.price;
      break;
    case 'initialQuantity':
      result = left.initialQuantity - right.initialQuantity;
      break;
    case 'soldQuantity':
      result = left.soldQuantity - right.soldQuantity;
      break;
    case 'stockQuantity':
      result = left.stockQuantity - right.stockQuantity;
      break;
    case 'popularityRating':
      result = left.popularityRating - right.popularityRating;
      break;
    case 'isActive':
      result = Number(left.isActive) - Number(right.isActive);
      break;
  }

  return direction === 'asc' ? result : -result;
};

const emptyForm = {
  subCategoryId: '',
  sku: '',
  partNumber: '',
  name: '',
  nameRu: '',
  description: '',
  color: DEFAULT_PRODUCT_COLOR as ProductColorId | '',
  price: '0',
  initialQuantity: '0',
  stockQuantity: '0',
  popularityRating: '0',
  imageUrl: '',
  isActive: true,
};

const buildCloneSku = (sku: string) => {
  const suffix = '-copy';
  if (sku.endsWith(suffix)) {
    return sku;
  }

  return `${sku}${suffix}`;
};

type ProductInlineEdit = {
  color?: ProductColorId | '';
  price?: string;
  initialQuantity?: string;
  stockQuantity?: string;
  popularityRating?: string;
};

const productHasInlineChanges = (item: AdminProduct, edit: ProductInlineEdit | undefined) => {
  if (!edit) {
    return false;
  }

  if (edit.color !== undefined && edit.color !== (item.color?.trim() ?? '')) {
    return true;
  }

  if (edit.price !== undefined && Number(edit.price) !== item.price) {
    return true;
  }

  if (edit.initialQuantity !== undefined && Number(edit.initialQuantity) !== item.initialQuantity) {
    return true;
  }

  if (edit.stockQuantity !== undefined && Number(edit.stockQuantity) !== item.stockQuantity) {
    return true;
  }

  if (edit.popularityRating !== undefined && Number(edit.popularityRating) !== (item.popularityRating ?? 0)) {
    return true;
  }

  return false;
};

const buildProductUpdatePayload = (item: AdminProduct, edit: ProductInlineEdit) => ({
  subCategoryId: item.subCategoryId,
  sku: item.sku,
  partNumber: item.partNumber,
  name: normalizeProductName(item.name),
  nameRu: normalizeProductName(item.nameRu),
  description: item.description,
  color:
    edit.color !== undefined
      ? edit.color.trim() || undefined
      : item.color?.trim() || undefined,
  price: edit.price !== undefined ? Number(edit.price) : item.price,
  initialQuantity:
    edit.initialQuantity !== undefined ? Number(edit.initialQuantity) : item.initialQuantity,
  stockQuantity: edit.stockQuantity !== undefined ? Number(edit.stockQuantity) : item.stockQuantity,
  popularityRating:
    edit.popularityRating !== undefined ? Number(edit.popularityRating) : (item.popularityRating ?? 0),
  imageUrl: item.imageUrl ?? undefined,
  isActive: item.isActive,
});

type ProductModalState =
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

const closedModal: ProductModalState = { open: false };

export function AdminProductsPage() {
  const location = useLocation();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [subCategories, setSubCategories] = useState<AdminSubCategory[]>([]);
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [modal, setModal] = useState<ProductModalState>(closedModal);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [inlineEdits, setInlineEdits] = useState<Record<string, ProductInlineEdit>>({});
  const [inlineSaving, setInlineSaving] = useState(false);
  const [bulkUpdateColorEnabled, setBulkUpdateColorEnabled] = useState(false);
  const [bulkUpdateColor, setBulkUpdateColor] = useState<ProductColorId | ''>('');
  const [bulkUpdateStockEnabled, setBulkUpdateStockEnabled] = useState(false);
  const [bulkUpdateStock, setBulkUpdateStock] = useState('0');
  const [bulkUpdatePopularityEnabled, setBulkUpdatePopularityEnabled] = useState(false);
  const [bulkUpdatePopularity, setBulkUpdatePopularity] = useState('0');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [imageOptions, setImageOptions] = useState<ProductImageOptions | null>(null);
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('url');
  const [imageProvider, setImageProvider] = useState('LocalDisk');
  const [imageUploading, setImageUploading] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState('');
  const [listFilterCategoryId, setListFilterCategoryId] = useState('');
  const [listFilterSubCategoryId, setListFilterSubCategoryId] = useState('');
  const { sortColumn, sortDirection, toggleSort, getSortIndicator, resetSort } = useTableSort<ProductSortColumn>('isActive', 'desc');
  const { tableRef, resetColumnWidths } = useAdminTableResize(ADMIN_TABLE_KEYS.products, ADMIN_PRODUCTS_COLUMN_WIDTHS);
  const handleTableWheel = useContainedTableWheel();

  const filteredSubCategories = useMemo(
    () =>
      selectedCategoryId
        ? subCategories.filter((item) => item.categoryId === selectedCategoryId)
        : subCategories,
    [selectedCategoryId, subCategories],
  );

  const listSubCategoryOptions = useMemo(
    () =>
      listFilterCategoryId
        ? subCategories.filter((item) => item.categoryId === listFilterCategoryId)
        : subCategories,
    [listFilterCategoryId, subCategories],
  );

  const displayedItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (listFilterCategoryId && item.categoryId !== listFilterCategoryId) {
        return false;
      }

      if (listFilterSubCategoryId && item.subCategoryId !== listFilterSubCategoryId) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((left, right) => {
      const primary = compareProducts(left, right, sortColumn, sortDirection);

      return finalizeAdminTableSort(
        primary,
        left,
        right,
        (item) => item.nameRu.trim() || item.name,
      );
    });
  }, [items, listFilterCategoryId, listFilterSubCategoryId, sortColumn, sortDirection]);

  const dirtyInlineCount = useMemo(
    () => items.filter((item) => productHasInlineChanges(item, inlineEdits[item.id])).length,
    [items, inlineEdits],
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

  const loadCatalog = useCallback(async (preferredCategoryId?: string, preferredSubCategoryId?: string) => {
    setCatalogLoading(true);
    try {
      const [categoryList, subCategoryList] = await Promise.all([
        adminApi.getCategories(true),
        adminApi.getSubCategories(undefined, true),
      ]);

      setCategories(categoryList);
      setSubCategories(subCategoryList);

      const nextCategoryId =
        preferredCategoryId && categoryList.some((item) => item.id === preferredCategoryId)
          ? preferredCategoryId
          : categoryList[0]?.id ?? '';

      setSelectedCategoryId(nextCategoryId);

      const subsForCategory = subCategoryList.filter((item) => item.categoryId === nextCategoryId);
      const nextSubCategoryId =
        preferredSubCategoryId && subsForCategory.some((item) => item.id === preferredSubCategoryId)
          ? preferredSubCategoryId
          : subsForCategory[0]?.id ?? '';

      setForm((current) => ({
        ...current,
        subCategoryId: nextSubCategoryId,
      }));
    } catch (err) {
      showAlert('Ошибка', err instanceof Error ? err.message : 'Не удалось загрузить категории', 'error');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const productList = await adminApi.getProducts();
      setItems(productList);
      bulk.pruneMissing(productList.map((item) => item.id));
    } catch (err) {
      showAlert('Ошибка', err instanceof Error ? err.message : 'Ошибка загрузки товаров', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadImageOptions = useCallback(async () => {
    try {
      const options = await adminApi.getProductImageOptions();
      setImageOptions(options);
      setImageProvider(options.defaultProvider);
    } catch (err) {
      showAlert('Ошибка', err instanceof Error ? err.message : 'Не удалось загрузить настройки изображений', 'error');
    }
  }, []);

  const load = useCallback(async () => {
    await Promise.all([loadCatalog(), loadProducts(), loadImageOptions()]);
  }, [loadCatalog, loadProducts, loadImageOptions]);

  useEffect(() => {
    void load();
  }, [load, location.pathname]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadCatalog(selectedCategoryId, form.subCategoryId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadCatalog, selectedCategoryId, form.subCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId) {
      return;
    }

    const subsForCategory = subCategories.filter((item) => item.categoryId === selectedCategoryId);
    if (subsForCategory.length === 0) {
      if (form.subCategoryId) {
        setForm((current) => ({ ...current, subCategoryId: '' }));
      }
      return;
    }

    if (!subsForCategory.some((item) => item.id === form.subCategoryId)) {
      setForm((current) => ({ ...current, subCategoryId: subsForCategory[0].id }));
    }
  }, [selectedCategoryId, subCategories, form.subCategoryId]);

  useEffect(() => {
    if (!listFilterSubCategoryId) {
      return;
    }

    if (!listSubCategoryOptions.some((item) => item.id === listFilterSubCategoryId)) {
      setListFilterSubCategoryId('');
    }
  }, [listFilterSubCategoryId, listSubCategoryOptions]);

  const selectedImageProvider = imageOptions?.providers.find((item) => item.provider === imageProvider);
  const isSelectedProviderAvailable = selectedImageProvider?.isAvailable ?? true;

  if (!getAdminKey()) {
    return <Navigate to="/admin/login" replace />;
  }

  const applyDefaultCatalogSelection = () => {
    const defaultCategoryId = categories[0]?.id ?? '';
    const defaultSubCategoryId =
      subCategories.find((item) => item.categoryId === defaultCategoryId)?.id ?? '';

    setSelectedCategoryId(defaultCategoryId);
    return defaultSubCategoryId;
  };

  const clearForm = () => {
    const defaultSubCategoryId = applyDefaultCatalogSelection();

    setForm({
      ...emptyForm,
      subCategoryId: defaultSubCategoryId,
    });
    setEditingId('');
    setImageSource('url');
    setSelectedImageName('');
    setImageProvider(imageOptions?.defaultProvider ?? 'LocalDisk');
  };

  const handleTableRefresh = () => {
    setListFilterCategoryId('');
    setListFilterSubCategoryId('');
    resetSort();
    resetColumnWidths();
    bulk.clear();
    setInlineEdits({});
    void loadProducts();
  };

  const setInlineField = (
    productId: string,
    field: keyof ProductInlineEdit,
    value: ProductColorId | '' | string,
  ) => {
    setInlineEdits((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        [field]: value,
      },
    }));
  };

  const clearInlineEdits = () => setInlineEdits({});

  const saveInlineEdits = async () => {
    const dirtyItems = items.filter((item) => productHasInlineChanges(item, inlineEdits[item.id]));
    if (dirtyItems.length === 0) {
      return;
    }

    setInlineSaving(true);
    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const item of dirtyItems) {
      const edit = inlineEdits[item.id] ?? {};
      const payload = buildProductUpdatePayload(item, edit);
      const productLabel = productDisplayNameRu(item.nameRu) || productDisplayNameEn(item.name);

      if (!Number.isFinite(payload.price) || payload.price < 0) {
        failedCount++;
        errors.push(`«${productLabel}»: некорректная цена.`);
        continue;
      }

      if (!Number.isFinite(payload.initialQuantity) || payload.initialQuantity < 0) {
        failedCount++;
        errors.push(`«${productLabel}»: некорректное начальное количество.`);
        continue;
      }

      if (payload.initialQuantity < item.soldQuantity) {
        failedCount++;
        errors.push(`«${productLabel}»: начальное количество меньше проданного (${item.soldQuantity}).`);
        continue;
      }

      if (!Number.isFinite(payload.stockQuantity) || payload.stockQuantity < 0) {
        failedCount++;
        errors.push(`«${productLabel}»: некорректное количество.`);
        continue;
      }

      if (!Number.isFinite(payload.popularityRating) || payload.popularityRating < 0) {
        failedCount++;
        errors.push(`«${productLabel}»: некорректная популярность.`);
        continue;
      }

      try {
        await adminApi.updateProduct(item.id, payload);
        processedCount++;
      } catch (err) {
        failedCount++;
        errors.push(
          `«${productLabel}»: ${err instanceof Error ? err.message : 'не удалось сохранить'}.`,
        );
      }
    }

    if (failedCount === 0) {
      setInlineEdits({});
    }

    await loadProducts();

    showAlert(
      'Сохранение изменений',
      formatBulkResult(processedCount, failedCount, errors),
      failedCount === 0 ? 'success' : 'warning',
    );
    setInlineSaving(false);
  };

  const handleImageFileChange = async (file: File | null) => {
    if (!file) {
      return;
    }

    setImageUploading(true);
    setSelectedImageName(file.name);

    try {
      const result = await adminApi.uploadProductImage(file, imageProvider);
      setForm((current) => ({ ...current, imageUrl: result.url }));
      setImageSource('upload');
    } catch (err) {
      showAlert('Ошибка загрузки', err instanceof Error ? err.message : 'Не удалось загрузить изображение', 'error');
      setSelectedImageName('');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.subCategoryId) {
      showAlert('Проверьте форму', 'Выберите активную подкатегорию.', 'warning');
      return;
    }

    const payload = {
      subCategoryId: form.subCategoryId,
      sku: form.sku,
      partNumber: form.partNumber.trim(),
      name: normalizeProductName(form.name),
      nameRu: normalizeProductName(form.nameRu || form.name),
      description: form.description,
      color: form.color.trim() || undefined,
      price: Number(form.price),
      initialQuantity: Number(form.initialQuantity),
      stockQuantity: Number(form.stockQuantity),
      popularityRating: Number(form.popularityRating),
      imageUrl: form.imageUrl || undefined,
      isActive: form.isActive,
    };

    const productLabel = productDisplayNameRu(form.nameRu) || productDisplayNameEn(form.name);
    const isEdit = Boolean(editingId);

    try {
      if (isEdit) {
        await adminApi.updateProduct(editingId, payload);
      } else {
        await adminApi.createProduct(payload);
      }
      clearForm();
      await loadCatalog(categories[0]?.id, subCategories.find((item) => item.categoryId === categories[0]?.id)?.id);
      await loadProducts();
      showAlert(
        isEdit ? 'Товар обновлён' : 'Товар добавлен',
        `«${productLabel}» успешно ${isEdit ? 'обновлён' : 'добавлен'} в каталог.`,
        'success',
      );
    } catch (err) {
      showAlert(
        isEdit ? 'Не удалось обновить' : 'Не удалось добавить',
        err instanceof Error ? err.message : 'Не удалось сохранить товар',
        'error',
      );
    }
  };

  const applyProductToForm = (item: AdminProduct, mode: 'edit' | 'clone') => {
    if (mode === 'edit') {
      setEditingId(item.id);
    } else {
      setEditingId('');
    }

    setSelectedCategoryId(item.categoryId);
    setForm({
      subCategoryId: item.subCategoryId,
      sku: mode === 'clone' ? buildCloneSku(item.sku) : item.sku,
      partNumber: item.partNumber,
      name: normalizeProductName(item.name),
      nameRu: normalizeProductName(item.nameRu),
      description: item.description,
      color: (item.color?.trim() ?? '') as ProductColorId | '',
      price: String(item.price),
      initialQuantity: mode === 'clone' ? '0' : String(item.initialQuantity),
      stockQuantity: String(item.stockQuantity),
      popularityRating: mode === 'clone' ? '0' : String(item.popularityRating),
      imageUrl: item.imageUrl ?? '',
      isActive: item.isActive,
    });
    setImageSource('url');
    setSelectedImageName('');
    void loadCatalog(item.categoryId, item.subCategoryId);
  };

  const handleEdit = (item: AdminProduct) => {
    applyProductToForm(item, 'edit');
  };

  const requestClone = () => {
    if (bulk.selectedCount !== 1) {
      showAlert('Выберите один товар', 'Для клонирования нужно выбрать ровно один товар.', 'warning');
      return;
    }

    const sourceId = bulk.selectedIds[0];
    const source = items.find((item) => item.id === sourceId);
    if (!source) {
      showAlert('Ошибка', 'Выбранный товар не найден.', 'error');
      return;
    }

    const productLabel = productDisplayName(source.nameRu, source.name);
    showConfirm(
      'Клонировать товар?',
      `Данные товара «${productLabel}» будут загружены в форму «Добавить товар». SKU будет изменён на «${buildCloneSku(source.sku)}».`,
      'Клонировать',
      'default',
      () => {
        closeModal();
        applyProductToForm(source, 'clone');
        bulk.clear();
      },
    );
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
          ? await adminApi.bulkDeleteProducts(bulk.selectedIds)
          : action === 'activate'
            ? await adminApi.bulkActivateProducts(bulk.selectedIds)
            : await adminApi.bulkDeactivateProducts(bulk.selectedIds);

      if (result.failedCount === 0) {
        bulk.clear();
      }
      if (editingId && bulk.selectedIds.includes(editingId)) {
        clearForm();
      }
      await loadProducts();

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
      showAlert('Ничего не выбрано', 'Выберите хотя бы один товар.', 'warning');
      return;
    }

    const count = bulk.selectedIds.length;
    const configs = {
      delete: {
        title: 'Удалить товары?',
        message: `Будет удалено товаров: ${count}. Товары из заказов будут деактивированы вместо удаления.`,
        confirmLabel: 'Удалить',
        variant: 'danger' as const,
      },
      activate: {
        title: 'Активировать товары?',
        message: `Сделать активными выбранные товары: ${count}.`,
        confirmLabel: 'Активировать',
        variant: 'default' as const,
      },
      deactivate: {
        title: 'Деактивировать товары?',
        message: `Скрыть из каталога выбранные товары: ${count}.`,
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

  const executeBulkFieldUpdate = async () => {
    setBulkLoading(true);

    try {
      const result = await adminApi.bulkUpdateProductFields({
        ids: bulk.selectedIds,
        updateColor: bulkUpdateColorEnabled,
        color: bulkUpdateColor.trim() || undefined,
        updateStockQuantity: bulkUpdateStockEnabled,
        stockQuantity: Number(bulkUpdateStock),
        updatePopularityRating: bulkUpdatePopularityEnabled,
        popularityRating: Number(bulkUpdatePopularity),
      });

      if (result.failedCount === 0) {
        bulk.clear();
        setBulkUpdateColorEnabled(false);
        setBulkUpdateStockEnabled(false);
        setBulkUpdatePopularityEnabled(false);
      }

      await loadProducts();

      showAlert(
        'Массовое обновление',
        formatBulkResult(result.processedCount, result.failedCount, result.errors),
        result.failedCount === 0 ? 'success' : 'warning',
      );
    } catch (err) {
      showAlert(
        'Ошибка',
        err instanceof Error ? err.message : 'Не удалось выполнить массовое обновление',
        'error',
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const requestBulkFieldUpdate = () => {
    if (bulk.selectedIds.length === 0) {
      showAlert('Ничего не выбрано', 'Выберите хотя бы один товар.', 'warning');
      return;
    }

    if (!bulkUpdateColorEnabled && !bulkUpdateStockEnabled && !bulkUpdatePopularityEnabled) {
      showAlert('Укажите поля', 'Отметьте хотя бы одно поле для массового обновления.', 'warning');
      return;
    }

    if (bulkUpdateStockEnabled && (!Number.isFinite(Number(bulkUpdateStock)) || Number(bulkUpdateStock) < 0)) {
      showAlert('Проверьте количество', 'Укажите корректное количество на складе.', 'warning');
      return;
    }

    if (
      bulkUpdatePopularityEnabled &&
      (!Number.isFinite(Number(bulkUpdatePopularity)) || Number(bulkUpdatePopularity) < 0)
    ) {
      showAlert('Проверьте популярность', 'Укажите корректное значение популярности.', 'warning');
      return;
    }

    const count = bulk.selectedIds.length;
    showConfirm(
      'Обновить выбранные товары?',
      `Будут обновлены поля у выбранных товаров: ${count}.`,
      'Применить',
      'default',
      () => {
        closeModal();
        void executeBulkFieldUpdate();
      },
    );
  };

  return (
    <section className="admin-products-page">
      <div className="page-header page-header-compact">
        <h1>Товары</h1>
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
      <div className="admin-grid admin-grid-with-table">
        <form className="admin-compact-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Редактировать товар' : 'Добавить товар'}</h2>
          <label>
            Категория
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                const categoryId = e.target.value;
                setSelectedCategoryId(categoryId);
                const firstSubCategory = subCategories.find((item) => item.categoryId === categoryId);
                setForm((current) => ({
                  ...current,
                  subCategoryId: firstSubCategory?.id ?? '',
                }));
              }}
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
            Подкатегория
            <select
              value={form.subCategoryId}
              onChange={(e) => setForm({ ...form, subCategoryId: e.target.value })}
              required
              disabled={catalogLoading || filteredSubCategories.length === 0}
            >
              <option value="" disabled>
                {catalogLoading
                  ? 'Загрузка подкатегорий...'
                  : filteredSubCategories.length === 0
                    ? 'Нет активных подкатегорий'
                    : 'Выберите подкатегорию'}
              </option>
              {filteredSubCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Артикул (SKU)
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
          </label>
          <label>
            Номер
            <input
              value={form.partNumber}
              onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
              placeholder="Например: 32009"
            />
          </label>
          <label>
            Название
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Название RU
            <input value={form.nameRu} onChange={(e) => setForm({ ...form, nameRu: e.target.value })} required />
          </label>
          <label>
            Описание
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </label>
          <ProductColorPicker
            value={parseStoredProductColor(form.color)}
            onChange={(colorId: ProductColorId | null) =>
              setForm((current) => ({ ...current, color: colorId ?? '' }))
            }
          />
          <label>
            Цена
            <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </label>
          <label>
            Начальное количество
            <input type="number" min="0" value={form.initialQuantity} onChange={(e) => setForm({ ...form, initialQuantity: e.target.value })} required />
          </label>
          <label>
            Количество на складе
            <input type="number" min="0" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} required />
          </label>
          <label>
            Популярность
            <input
              type="number"
              min="0"
              value={form.popularityRating}
              onChange={(e) => setForm({ ...form, popularityRating: e.target.value })}
              required
            />
          </label>
          <div className="image-field-group">
            <span className="field-label">Изображение товара</span>
            <div className="image-source-options">
              <label className="radio-row">
                <input
                  type="radio"
                  name="imageSource"
                  checked={imageSource === 'url'}
                  onChange={() => setImageSource('url')}
                />
                По URL
              </label>
              <label className="radio-row">
                <input
                  type="radio"
                  name="imageSource"
                  checked={imageSource === 'upload'}
                  onChange={() => setImageSource('upload')}
                />
                Загрузить файл
              </label>
            </div>

            {imageSource === 'url' ? (
              <label>
                URL изображения
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </label>
            ) : (
              <>
                <label>
                  Хранилище
                  <select
                    value={imageProvider}
                    onChange={(e) => setImageProvider(e.target.value)}
                    disabled={imageUploading || !imageOptions}
                  >
                    {(imageOptions?.providers ?? []).map((provider) => (
                      <option key={provider.provider} value={provider.provider}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedImageProvider?.description && (
                  <p className={`field-hint${isSelectedProviderAvailable ? '' : ' error'}`}>
                    {selectedImageProvider.description}
                  </p>
                )}
                <label>
                  Файл изображения
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={imageUploading || !isSelectedProviderAvailable}
                    onChange={(e) => void handleImageFileChange(e.target.files?.[0] ?? null)}
                  />
                </label>
                {imageUploading && <p className="field-hint">Загрузка изображения...</p>}
                {selectedImageName && !imageUploading && (
                  <p className="field-hint">Загружено: {selectedImageName}</p>
                )}
              </>
            )}

            {form.imageUrl && (
              <div className="image-preview">
                <AdminClickableImage src={form.imageUrl} alt="Предпросмотр товара" />
              </div>
            )}
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Активен
          </label>
          <div className="form-actions">
            <button type="submit" disabled={catalogLoading || !form.subCategoryId}>
              {editingId ? 'Обновить' : 'Создать'}
            </button>
            <button type="button" className="secondary" onClick={clearForm}>
              Очистить форму
            </button>
          </div>
        </form>
        <div className="admin-table-wrap admin-table-wrap-scrollable">
          <div className="admin-table-sticky-top">
          <div className="admin-table-filters">
            <label>
              Категория
              <select
                value={listFilterCategoryId}
                onChange={(e) => {
                  setListFilterCategoryId(e.target.value);
                  setListFilterSubCategoryId('');
                }}
              >
                <option value="">Все</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Подкатегория
              <select
                value={listFilterSubCategoryId}
                onChange={(e) => setListFilterSubCategoryId(e.target.value)}
                disabled={listSubCategoryOptions.length === 0}
              >
                <option value="">Все</option>
                {listSubCategoryOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
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
            disabled={bulkLoading || loading || inlineSaving}
            onClone={requestClone}
            onActivate={() => requestBulkAction('activate')}
            onDeactivate={() => requestBulkAction('deactivate')}
            onDelete={() => requestBulkAction('delete')}
          />
          {bulk.selectedCount > 0 && (
            <div className="product-bulk-update-bar">
              <span className="product-bulk-update-title">Массовое обновление полей</span>
              <label className="product-bulk-update-field">
                <input
                  type="checkbox"
                  checked={bulkUpdateColorEnabled}
                  onChange={(event) => setBulkUpdateColorEnabled(event.target.checked)}
                  disabled={bulkLoading || loading || inlineSaving}
                />
                Цвет
                <ProductColorPopoverPicker
                  value={parseStoredProductColor(bulkUpdateColor || null)}
                  onChange={(colorId) => setBulkUpdateColor(colorId ?? '')}
                  disabled={!bulkUpdateColorEnabled || bulkLoading || loading || inlineSaving}
                  ariaLabel="Цвет для массового обновления"
                  showLabel
                />
              </label>
              <label className="product-bulk-update-field">
                <input
                  type="checkbox"
                  checked={bulkUpdateStockEnabled}
                  onChange={(event) => setBulkUpdateStockEnabled(event.target.checked)}
                  disabled={bulkLoading || loading || inlineSaving}
                />
                Количество
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={bulkUpdateStock}
                  onChange={(event) => setBulkUpdateStock(event.target.value)}
                  disabled={!bulkUpdateStockEnabled || bulkLoading || loading || inlineSaving}
                />
              </label>
              <label className="product-bulk-update-field">
                <input
                  type="checkbox"
                  checked={bulkUpdatePopularityEnabled}
                  onChange={(event) => setBulkUpdatePopularityEnabled(event.target.checked)}
                  disabled={bulkLoading || loading || inlineSaving}
                />
                Популярность
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={bulkUpdatePopularity}
                  onChange={(event) => setBulkUpdatePopularity(event.target.value)}
                  disabled={!bulkUpdatePopularityEnabled || bulkLoading || loading || inlineSaving}
                />
              </label>
              <button
                type="button"
                disabled={bulkLoading || loading || inlineSaving}
                onClick={requestBulkFieldUpdate}
              >
                Применить к выбранным
              </button>
            </div>
          )}
          {dirtyInlineCount > 0 && (
            <div className="inline-edits-bar">
              <span>Несохранённые изменения: {dirtyInlineCount}</span>
              <button type="button" disabled={inlineSaving || loading} onClick={() => void saveInlineEdits()}>
                {inlineSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={inlineSaving || loading}
                onClick={clearInlineEdits}
              >
                Отменить
              </button>
            </div>
          )}
          </div>
          {loading ? (
            <p className="admin-table-scroll-status">Загрузка...</p>
          ) : (
            <div className="admin-table-scroll" onWheel={handleTableWheel}>
            <table ref={tableRef} className="admin-table admin-table-sticky-head">
              <thead>
                <tr>
                  <th className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={bulk.allSelected}
                      onChange={bulk.toggleAll}
                      aria-label="Выбрать все товары"
                    />
                  </th>
                  <th>
                    <button type="button" className="sortable-header" onClick={() => toggleSort('sku')}>
                      SKU <span className="sort-indicator">{getSortIndicator('sku')}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sortable-header" onClick={() => toggleSort('partNumber')}>
                      Номер <span className="sort-indicator">{getSortIndicator('partNumber')}</span>
                    </button>
                  </th>
                  <th className="admin-table-clip-cell">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('name')}>
                      Название <span className="sort-indicator">{getSortIndicator('name')}</span>
                    </button>
                  </th>
                  <th className="admin-table-clip-cell">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('nameRu')}>
                      Название RU <span className="sort-indicator">{getSortIndicator('nameRu')}</span>
                    </button>
                  </th>
                  <th className="admin-table-clip-cell">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('description')}>
                      Описание <span className="sort-indicator">{getSortIndicator('description')}</span>
                    </button>
                  </th>
                  <th className="admin-table-color-cell">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('color')}>
                      Цвет <span className="sort-indicator">{getSortIndicator('color')}</span>
                    </button>
                  </th>
                  <th className="admin-table-clip-cell">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('categoryName')}>
                      Категория <span className="sort-indicator">{getSortIndicator('categoryName')}</span>
                    </button>
                  </th>
                  <th className="admin-table-clip-cell">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('subCategoryName')}>
                      Подкатегория <span className="sort-indicator">{getSortIndicator('subCategoryName')}</span>
                    </button>
                  </th>
                  <th className="admin-table-numeric-col">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('price')}>
                      Цена <span className="sort-indicator">{getSortIndicator('price')}</span>
                    </button>
                  </th>
                  <th className="admin-table-numeric-col">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('initialQuantity')}>
                      Нач. <span className="sort-indicator">{getSortIndicator('initialQuantity')}</span>
                    </button>
                  </th>
                  <th className="admin-table-numeric-col">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('soldQuantity')}>
                      Прод. <span className="sort-indicator">{getSortIndicator('soldQuantity')}</span>
                    </button>
                  </th>
                  <th className="admin-table-numeric-col">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('stockQuantity')}>
                      Склад <span className="sort-indicator">{getSortIndicator('stockQuantity')}</span>
                    </button>
                  </th>
                  <th className="admin-table-numeric-col">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('popularityRating')}>
                      Популярность <span className="sort-indicator">{getSortIndicator('popularityRating')}</span>
                    </button>
                  </th>
                  <th className="admin-table-status-col" aria-label="Статус">
                    <button type="button" className="sortable-header" onClick={() => toggleSort('isActive')} aria-label="Сортировать по статусу">
                      <span className="admin-table-status-col-label">Статус</span>
                      <span className="sort-indicator">{getSortIndicator('isActive')}</span>
                    </button>
                  </th>
                  <th className="table-actions-col" aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={16}>Нет товаров по выбранным фильтрам.</td>
                  </tr>
                ) : (
                  displayedItems.map((item) => {
                  const edit = inlineEdits[item.id];
                  const isDirty = productHasInlineChanges(item, edit);
                  const effectiveColor = edit?.color !== undefined ? edit.color : (item.color?.trim() ?? '');
                  const effectivePrice = edit?.price !== undefined ? edit.price : String(item.price);
                  const effectiveInitial =
                    edit?.initialQuantity !== undefined ? edit.initialQuantity : String(item.initialQuantity);
                  const effectiveStock =
                    edit?.stockQuantity !== undefined ? edit.stockQuantity : String(item.stockQuantity);
                  const effectivePopularity =
                    edit?.popularityRating !== undefined
                      ? edit.popularityRating
                      : String(item.popularityRating ?? 0);

                  return (
                  <tr key={item.id} className={isDirty ? 'admin-table-row-dirty' : undefined}>
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={bulk.isSelected(item.id)}
                        onChange={() => bulk.toggle(item.id)}
                        aria-label={`Выбрать ${item.name}`}
                      />
                    </td>
                    <td>
                      <div className="admin-product-sku">
                        {item.imageUrl ? (
                          <AdminClickableImage
                            src={item.imageUrl}
                            alt={item.sku}
                            className="admin-product-thumb"
                          />
                        ) : (
                          <span className="admin-product-thumb placeholder" aria-hidden="true" />
                        )}
                        <span>{item.sku}</span>
                      </div>
                    </td>
                    <td>
                      <span className="admin-table-truncate" title={item.partNumber || undefined}>
                        {item.partNumber || '—'}
                      </span>
                    </td>
                    <td className="admin-table-clip-cell">
                      <span className="admin-table-truncate" title={productDisplayNameEn(item.name)}>
                        {productDisplayNameEn(item.name)}
                      </span>
                    </td>
                    <td className="admin-table-clip-cell">
                      <span className="admin-table-truncate" title={productDisplayNameRu(item.nameRu)}>
                        {productDisplayNameRu(item.nameRu)}
                      </span>
                    </td>
                    <td className="admin-table-description-cell admin-table-clip-cell">
                      <span
                        className="admin-table-truncate"
                        title={item.description.trim() ? item.description : undefined}
                      >
                        {item.description.trim() ? item.description : '—'}
                      </span>
                    </td>
                    <td className="admin-table-color-cell">
                      <ProductColorPopoverPicker
                        value={parseStoredProductColor(effectiveColor || null)}
                        onChange={(colorId) => setInlineField(item.id, 'color', colorId ?? '')}
                        ariaLabel={`Цвет ${item.sku}`}
                      />
                    </td>
                    <td className="admin-table-clip-cell">
                      <span className="admin-table-truncate" title={item.categoryName}>
                        {item.categoryName}
                      </span>
                    </td>
                    <td className="admin-table-clip-cell">
                      <span className="admin-table-truncate" title={item.subCategoryName}>
                        {item.subCategoryName}
                      </span>
                    </td>
                    <td className="admin-table-numeric-cell">
                      <input
                        type="number"
                        className="admin-inline-input"
                        min={0}
                        step={0.01}
                        value={effectivePrice}
                        onChange={(event) => setInlineField(item.id, 'price', event.target.value)}
                        aria-label={`Цена ${item.sku}`}
                      />
                    </td>
                    <td className="admin-table-numeric-cell">
                      <input
                        type="number"
                        className="admin-inline-input admin-inline-input-narrow"
                        min={item.soldQuantity}
                        step={1}
                        value={effectiveInitial}
                        onChange={(event) => setInlineField(item.id, 'initialQuantity', event.target.value)}
                        aria-label={`Начальное количество ${item.sku}`}
                      />
                    </td>
                    <td className="admin-table-numeric-cell">
                      <span className="admin-table-readonly-number" aria-label={`Продано ${item.sku}`}>
                        {item.soldQuantity}
                      </span>
                    </td>
                    <td className="admin-table-numeric-cell">
                      <input
                        type="number"
                        className="admin-inline-input admin-inline-input-narrow"
                        min={0}
                        step={1}
                        value={effectiveStock}
                        onChange={(event) => setInlineField(item.id, 'stockQuantity', event.target.value)}
                        aria-label={`Количество ${item.sku}`}
                      />
                    </td>
                    <td className="admin-table-numeric-cell">
                      <input
                        type="number"
                        className="admin-inline-input admin-inline-input-narrow"
                        min={0}
                        step={1}
                        value={effectivePopularity}
                        onChange={(event) => setInlineField(item.id, 'popularityRating', event.target.value)}
                        aria-label={`Популярность ${item.sku}`}
                      />
                    </td>
                    <td className="admin-table-status-cell">
                      <AdminActiveStatusIcon isActive={item.isActive} />
                    </td>
                    <td className="table-actions">
                      <button type="button" onClick={() => handleEdit(item)}>
                        Изменить
                      </button>
                    </td>
                  </tr>
                  );
                  })
                )}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

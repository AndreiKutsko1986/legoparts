import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import type { ProductImageOptions, SiteHeaderSettings } from '../adminApi';
import { adminApi, getAdminKey } from '../adminApi';
import { invalidateSiteHeaderCache } from '../siteHeader';
import { AdminModal } from './AdminModal';
import './AdminCompactForm.css';

const emptyForm: SiteHeaderSettings = {
  brandName: '',
  heroTitle: '',
  heroSubtitle: '',
  brandIconUrl: null,
  heroImageUrl: null,
  tabTitle: '',
  faviconUrl: null,
};

type ModalState =
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

const closedModal: ModalState = { open: false };

type ImageField = 'brandIconUrl' | 'heroImageUrl' | 'faviconUrl';

const ICON_FILE_ACCEPT = 'image/svg+xml,image/png,image/webp,image/jpeg,.svg,.ico';
const HERO_FILE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function AdminSiteHeaderPage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState>(closedModal);
  const [imageOptions, setImageOptions] = useState<ProductImageOptions | null>(null);
  const [imageProvider, setImageProvider] = useState('LocalDisk');
  const [uploadingField, setUploadingField] = useState<ImageField | null>(null);
  const [selectedFileNames, setSelectedFileNames] = useState<Partial<Record<ImageField, string>>>({});

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

  useEffect(() => {
    const load = async () => {
      try {
        const [settings, options] = await Promise.all([
          adminApi.getSiteHeaderSettings(),
          adminApi.getProductImageOptions(),
        ]);
        setForm(settings);
        setImageOptions(options);
        setImageProvider(options.defaultProvider);
      } catch (err) {
        showAlert('Ошибка загрузки', err instanceof Error ? err.message : 'Не удалось загрузить настройки', 'error');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (!getAdminKey()) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const updated = await adminApi.updateSiteHeaderSettings(form);
      setForm(updated);
      invalidateSiteHeaderCache();
      showAlert('Сохранено', 'Настройки шапки сайта обновлены.', 'success');
    } catch (err) {
      showAlert('Ошибка сохранения', err instanceof Error ? err.message : 'Не удалось сохранить настройки', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (field: ImageField, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setUploadingField(field);
    setSelectedFileNames((current) => ({ ...current, [field]: file.name }));

    try {
      const result = await adminApi.uploadProductImage(file, imageProvider);
      setForm((current) => ({ ...current, [field]: result.url }));
    } catch (err) {
      showAlert('Ошибка загрузки', err instanceof Error ? err.message : 'Не удалось загрузить изображение', 'error');
      setSelectedFileNames((current) => ({ ...current, [field]: '' }));
    } finally {
      setUploadingField(null);
    }
  };

  const clearImage = (field: ImageField) => {
    setForm((current) => ({ ...current, [field]: null }));
    setSelectedFileNames((current) => ({ ...current, [field]: '' }));
  };

  const selectedImageProvider = imageOptions?.providers.find((item) => item.provider === imageProvider);
  const isSelectedProviderAvailable = selectedImageProvider?.isAvailable ?? true;

  const renderImageField = (
    field: ImageField,
    label: string,
    hint: string,
    accept: string,
  ) => {
    const url = form[field];
    const uploading = uploadingField === field;

    return (
      <div className="image-field-group" key={field}>
        <label>
          {label}
          <input
            type="file"
            accept={accept}
            onChange={(event) => void handleImageUpload(field, event)}
            disabled={uploading || !isSelectedProviderAvailable}
          />
        </label>
        <p className="field-hint">{hint}</p>
        {selectedFileNames[field] ? <p className="field-hint">Файл: {selectedFileNames[field]}</p> : null}
        {url ? (
          <div className="image-preview">
            <img src={url} alt="" style={{ maxWidth: field === 'heroImageUrl' ? '240px' : '48px', maxHeight: '48px' }} />
            <button type="button" className="secondary" onClick={() => clearImage(field)} disabled={uploading || saving}>
              Удалить
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section className="admin-section">
      <h1>Шапка сайта</h1>
      <p className="admin-section-lead">
        Настройте текст, изображения в шапке каталога и оформление вкладки браузера.
      </p>

      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <form className="admin-compact-form admin-site-header-form" onSubmit={(event) => void handleSubmit(event)}>
          <h2>Текст шапки</h2>
          <label>
            Название бренда
            <input
              value={form.brandName}
              onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))}
              required
            />
          </label>
          <label>
            Заголовок
            <input
              value={form.heroTitle}
              onChange={(event) => setForm((current) => ({ ...current, heroTitle: event.target.value }))}
              required
            />
          </label>
          <label>
            Подзаголовок
            <textarea
              value={form.heroSubtitle}
              onChange={(event) => setForm((current) => ({ ...current, heroSubtitle: event.target.value }))}
              rows={3}
              required
            />
          </label>

          <h2>Изображения</h2>
          <label>
            Хранилище загрузок
            <select
              value={imageProvider}
              onChange={(event) => setImageProvider(event.target.value)}
              disabled={!!uploadingField || !imageOptions}
            >
              {imageOptions?.providers.map((provider) => (
                <option key={provider.provider} value={provider.provider} disabled={!provider.isAvailable}>
                  {provider.label}
                  {!provider.isAvailable ? ' (недоступно)' : ''}
                </option>
              ))}
            </select>
          </label>
          {selectedImageProvider && !selectedImageProvider.isAvailable ? (
            <p className="field-hint">{selectedImageProvider.description}</p>
          ) : null}

          {renderImageField(
            'brandIconUrl',
            'Иконка бренда',
            'Отображается слева от названия в шапке каталога. Поддерживаются SVG, PNG, JPEG и WebP.',
            ICON_FILE_ACCEPT,
          )}
          {renderImageField(
            'heroImageUrl',
            'Фон шапки',
            'Фоновое изображение в области заголовка каталога.',
            HERO_FILE_ACCEPT,
          )}
          {renderImageField(
            'faviconUrl',
            'Иконка вкладки',
            'Favicon в браузере. Поддерживаются SVG, PNG и ICO. Если не задано — используется стандартная иконка.',
            ICON_FILE_ACCEPT,
          )}

          <h2>Вкладка браузера</h2>
          <label>
            Заголовок вкладки
            <input
              value={form.tabTitle}
              onChange={(event) => setForm((current) => ({ ...current, tabTitle: event.target.value }))}
              required
            />
          </label>

          <div className="form-actions">
            <button type="submit" disabled={saving || !!uploadingField}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      )}

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
    </section>
  );
}

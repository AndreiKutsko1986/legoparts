import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import type { ContactInfo } from '../adminApi';
import { adminApi, getAdminKey } from '../adminApi';
import { AdminModal } from './AdminModal';
import './AdminCompactForm.css';

const emptyForm: ContactInfo = {
  storeName: '',
  email: '',
  phone: '',
  address: '',
  businessHours: '',
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

export function AdminContactPage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState>(closedModal);

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
    adminApi
      .getContactSettings()
      .then(setForm)
      .catch((err) => {
        showAlert('Ошибка загрузки', err instanceof Error ? err.message : 'Не удалось загрузить контакты', 'error');
      })
      .finally(() => setLoading(false));
  }, []);

  if (!getAdminKey()) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const updated = await adminApi.updateContactSettings({ ...form, businessHours: '' });
      setForm(updated);
      showAlert('Сохранено', 'Контактная информация обновлена.', 'success');
    } catch (err) {
      showAlert('Ошибка сохранения', err instanceof Error ? err.message : 'Не удалось сохранить контакты', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-section">
      <h1>Контакты</h1>
      <p className="admin-section-lead">Данные отображаются на странице «Контакты» в магазине.</p>

      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <form className="admin-compact-form admin-contact-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            Название магазина
            <input
              value={form.storeName}
              onChange={(event) => setForm((current) => ({ ...current, storeName: event.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          <label>
            Телефон
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              required
            />
          </label>
          <label>
            Адрес
            <textarea
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              rows={2}
              required
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
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

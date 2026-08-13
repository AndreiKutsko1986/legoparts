import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import { PopularProductsSidebar } from '../components/PopularProductsSidebar';
import { usePopularProducts } from '../usePopularProducts';

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

export function ContactPage() {
  const popularProducts = usePopularProducts();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAttachmentChange = (file: File | null) => {
    if (!file) {
      setAttachment(null);
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError('Размер файла не должен превышать 5 МБ.');
      setAttachment(null);
      return;
    }

    setError('');
    setAttachment(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('subject', subject);
      formData.append('message', message);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      await api.submitContactMessage(formData);
      setFeedback('Спасибо! Ваше сообщение отправлено.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setAttachment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить сообщение');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cart-page-layout">
      <PopularProductsSidebar products={popularProducts} />
      <section className="contact-layout contact-layout-feedback">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <h1>Обратная связь</h1>
          <p className="muted">Напишите нам — ответим на ваше сообщение.</p>
          <label>
            Имя
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Тема
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </label>
          <label>
            Сообщение
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />
          </label>
          <label>
            Файл
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.doc,.docx,.zip"
              onChange={(e) => handleAttachmentChange(e.target.files?.[0] ?? null)}
            />
          </label>
          {attachment ? <p className="muted contact-attachment-name">Выбран файл: {attachment.name}</p> : null}
          {error && <p className="error">{error}</p>}
          {feedback && <p className="success">{feedback}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Отправка...' : 'Отправить'}
          </button>
        </form>
      </section>
    </div>
  );
}

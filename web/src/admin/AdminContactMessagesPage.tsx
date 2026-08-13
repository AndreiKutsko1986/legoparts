import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { ContactMessage } from '../adminApi';
import { adminApi, getAdminKey } from '../adminApi';
import { formatDateTime } from '../labels';
import { AdminTableRefreshButton } from './AdminTableRefreshButton';

export function AdminContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState('');

  const loadMessages = () => {
    setLoading(true);
    setError('');
    adminApi
      .getContactMessages()
      .then(setMessages)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMessages();
  }, []);

  if (!getAdminKey()) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <section className="admin-section">
      <div className="page-header">
        <div>
          <h1>Обратная связь</h1>
          <p className="admin-section-lead">Сообщения с формы на странице «Контакты».</p>
        </div>
        <AdminTableRefreshButton onClick={loadMessages} disabled={loading} />
      </div>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p>Загрузка…</p>
      ) : messages.length === 0 ? (
        <p>Сообщений пока нет.</p>
      ) : (
        <div className="admin-contact-messages">
          {messages.map((message) => {
            const expanded = expandedId === message.id;

            return (
              <article key={message.id} className="admin-contact-message-card">
                <button
                  type="button"
                  className="admin-contact-message-header"
                  onClick={() => setExpandedId(expanded ? '' : message.id)}
                  aria-expanded={expanded}
                >
                  <div className="admin-contact-message-summary">
                    <strong>{message.subject}</strong>
                    <span>
                      {message.name} · {message.email}
                    </span>
                    <span>{formatDateTime(message.createdAt)}</span>
                  </div>
                  <span className="admin-contact-message-toggle" aria-hidden="true">
                    {expanded ? '▾' : '▸'}
                  </span>
                </button>
                {expanded ? (
                  <div className="admin-contact-message-body">
                    <p>{message.message}</p>
                    {message.attachmentUrl ? (
                      <p>
                        Вложение:{' '}
                        <a href={message.attachmentUrl} target="_blank" rel="noreferrer">
                          {message.attachmentFileName ?? 'Скачать файл'}
                        </a>
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

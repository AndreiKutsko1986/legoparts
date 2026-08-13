import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { NewsListItem } from '../api';
import { api } from '../api';
import { PopularProductsSidebar } from '../components/PopularProductsSidebar';
import { usePopularProducts } from '../usePopularProducts';
import { formatDate } from '../labels';

export function NewsPage() {
  const popularProducts = usePopularProducts();
  const [articles, setArticles] = useState<NewsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getNews()
      .then(setArticles)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="cart-page-layout">
        <PopularProductsSidebar products={popularProducts} />
        <p>Загрузка новостей...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cart-page-layout">
        <PopularProductsSidebar products={popularProducts} />
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="cart-page-layout">
      <PopularProductsSidebar products={popularProducts} />
      <section>
        <div className="page-header">
          <h1>Новости</h1>
          <p>Обновления магазина и объявления.</p>
        </div>
        <div className="news-grid">
          {articles.map((article) => (
            <article key={article.id} className="news-card news-tile">
              <p className="muted news-tile-date">{formatDate(article.publishedAt)}</p>
              <h2>
                <Link to={`/news/${article.slug}`}>{article.title}</Link>
              </h2>
              <p className="news-tile-summary">{article.summary}</p>
              <Link to={`/news/${article.slug}`} className="news-tile-link">
                Читать
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

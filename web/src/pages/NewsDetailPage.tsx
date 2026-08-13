import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { NewsArticle } from '../api';
import { api } from '../api';
import { PopularProductsSidebar } from '../components/PopularProductsSidebar';
import { usePopularProducts } from '../usePopularProducts';
import { formatDate } from '../labels';

export function NewsDetailPage() {
  const { slug } = useParams();
  const popularProducts = usePopularProducts();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    api
      .getNewsArticle(slug)
      .then(setArticle)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  let content;

  if (loading) {
    content = <p>Загрузка статьи...</p>;
  } else if (error) {
    content = <p className="error">{error}</p>;
  } else if (!article) {
    content = <p>Статья не найдена.</p>;
  } else {
    content = (
      <section className="article">
        <Link to="/news">Назад к новостям</Link>
        <p className="muted">{formatDate(article.publishedAt)}</p>
        <h1>{article.title}</h1>
        <p className="lead">{article.summary}</p>
        <div className="article-content">
          {article.content.split('\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="cart-page-layout">
      <PopularProductsSidebar products={popularProducts} />
      {content}
    </div>
  );
}

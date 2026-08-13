import { useEffect, useState } from 'react';
import { api, type Product } from './api';

export function pickPopularProducts(products: Product[], limit = 5) {
  return [...products]
    .sort((left, right) => right.popularityRating - left.popularityRating || left.name.localeCompare(right.name, 'ru'))
    .slice(0, limit);
}

export function usePopularProducts(limit = 5) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    api
      .getProducts()
      .then((items) => setProducts(pickPopularProducts(items, limit)))
      .catch(() => setProducts([]));
  }, [limit]);

  return products;
}

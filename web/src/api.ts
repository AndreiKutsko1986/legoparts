const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5202';

function buildHeaders(options?: RequestInit) {
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string> | undefined) };

  if (options?.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: buildHeaders(options),
    });
  } catch {
    throw new Error('Сервер недоступен. Проверьте подключение и повторите попытку.');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorBody.message ?? 'Ошибка запроса');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  subCategories: {
    id: string;
    name: string;
    slug: string;
    description?: string;
  }[];
};

export type Product = {
  id: string;
  sku: string;
  partNumber: string;
  name: string;
  nameRu: string;
  description: string;
  color: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  price: number;
  stockQuantity: number;
  popularityRating: number;
  imageUrl?: string;
};

export type CartValidationLine = {
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
};

export type CartValidation = {
  isValid: boolean;
  errors: string[];
  lines: CartValidationLine[];
};

export type OrderItem = {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  notes?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

export type NewsListItem = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  publishedAt: string;
};

export type NewsArticle = NewsListItem & {
  content: string;
};

export type ContactInfo = {
  storeName: string;
  email: string;
  phone: string;
  address: string;
  businessHours: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  attachmentUrl?: string | null;
  attachmentFileName?: string | null;
  createdAt: string;
};

export type SiteHeaderSettings = {
  brandName: string;
  heroTitle: string;
  heroSubtitle: string;
  brandIconUrl: string | null;
  heroImageUrl: string | null;
  tabTitle: string;
  faviconUrl: string | null;
};

export const api = {
  getCatalogCategories: () => request<CatalogCategory[]>('/api/catalog/categories'),
  getProducts: (categoryId?: string, subCategoryId?: string) => {
    const params = new URLSearchParams();
    if (categoryId) params.set('categoryId', categoryId);
    if (subCategoryId) params.set('subCategoryId', subCategoryId);
    const query = params.toString();
    return request<Product[]>(query ? `/api/products?${query}` : '/api/products');
  },
  getProduct: (id: string) => request<Product>(`/api/products/${id}`),
  validateCart: (items: { productId: string; quantity: number }[]) =>
    request<CartValidation>('/api/cart/validate', {
      method: 'POST',
      body: JSON.stringify({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      }),
    }),
  createOrder: (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shippingAddress: string;
    notes?: string;
    items: { productId: string; quantity: number }[];
  }) => request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  getNews: () => request<NewsListItem[]>('/api/news'),
  getNewsArticle: (slug: string) => request<NewsArticle>(`/api/news/${slug}`),
  getContactInfo: () => request<ContactInfo>('/api/contact'),
  getSiteHeader: () => request<SiteHeaderSettings>('/api/site-header'),
  submitContactMessage: (payload: FormData) =>
    request<ContactMessage>('/api/contact/messages', {
      method: 'POST',
      body: payload,
    }),
};

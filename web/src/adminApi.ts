const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5202';
const ADMIN_SESSION_MARKER = 'legoparts-admin-session';

function buildAdminHeaders(options?: RequestInit) {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  if (!sessionStorage.getItem(ADMIN_SESSION_MARKER)) {
    throw new Error('Требуется авторизация администратора.');
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: buildAdminHeaders(options),
    });
  } catch {
    throw new Error('Сервер недоступен. Проверьте подключение и повторите попытку.');
  }

  if (response.status === 401) {
    sessionStorage.removeItem(ADMIN_SESSION_MARKER);
    throw new Error('Неверный API-ключ администратора.');
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

async function getAllAdminPages<T>(path: string): Promise<T[]> {
  const pageSize = 100;
  const results: T[] = [];
  let page = 1;

  while (true) {
    const separator = path.includes('?') ? '&' : '?';
    const batch = await adminRequest<T[]>(`${path}${separator}page=${page}&pageSize=${pageSize}`);
    results.push(...batch);

    if (batch.length < pageSize) {
      return results;
    }

    page += 1;
  }
}

export function getAdminKey() {
  return sessionStorage.getItem(ADMIN_SESSION_MARKER);
}

export function setAdminKey() {
  sessionStorage.setItem(ADMIN_SESSION_MARKER, 'active');
}

export function clearAdminKey() {
  sessionStorage.removeItem(ADMIN_SESSION_MARKER);
}

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  subCategoryCount: number;
  createdAt: string;
};

export type AdminSubCategory = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  productCount: number;
  createdAt: string;
};

export type AdminProduct = {
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
  initialQuantity: number;
  soldQuantity: number;
  stockQuantity: number;
  popularityRating: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
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
  items: {
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
};

export type ProductImageProvider = {
  provider: string;
  label: string;
  description: string;
  isAvailable: boolean;
};

export type ProductImageOptions = {
  defaultProvider: string;
  providers: ProductImageProvider[];
};

export type ProductImageUploadResult = {
  provider: string;
  url: string;
  storageKey: string;
};

export type BulkActionResult = {
  processedCount: number;
  failedCount: number;
  errors: string[];
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

export const adminApi = {
  login: async (login: string, password: string) => {
    let response: Response;

    try {
      response = await fetch(`${API_BASE}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login, password }),
      });
    } catch {
      throw new Error('Сервер недоступен. Проверьте подключение и повторите попытку.');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Неверный логин или пароль.' }));
      throw new Error(errorBody.message ?? 'Неверный логин или пароль.');
    }

    await response.json();
    setAdminKey();
  },
  verify: async () => {
    let response: Response;

    try {
      response = await fetch(`${API_BASE}/api/admin/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ apiKey: '' }),
      });
    } catch {
      throw new Error('Сервер недоступен. Проверьте подключение и повторите попытку.');
    }

    if (!response.ok) {
      throw new Error('Неверный API-ключ администратора.');
    }
    setAdminKey();
  },
  logout: async () => {
    await fetch(`${API_BASE}/api/admin/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    clearAdminKey();
  },
  getCategories: (activeOnly = false) =>
    getAllAdminPages<AdminCategory>(
      activeOnly ? '/api/admin/categories?activeOnly=true' : '/api/admin/categories',
    ),
  createCategory: (payload: { name: string; slug?: string; description?: string; isActive?: boolean }) =>
    adminRequest<AdminCategory>('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (id: string, payload: { name: string; slug?: string; description?: string; isActive: boolean }) =>
    adminRequest<AdminCategory>(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCategory: (id: string) =>
    adminRequest<void>(`/api/admin/categories/${id}`, { method: 'DELETE' }),
  bulkDeleteCategories: (ids: string[]) =>
    adminRequest<BulkActionResult>('/api/admin/categories/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  bulkActivateCategories: (ids: string[]) =>
    adminRequest<BulkActionResult>('/api/admin/categories/bulk/activate', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  bulkDeactivateCategories: (ids: string[]) =>
    adminRequest<BulkActionResult>('/api/admin/categories/bulk/deactivate', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  getSubCategories: (categoryId?: string, activeOnly = false) => {
    const params = new URLSearchParams();
    if (categoryId) params.set('categoryId', categoryId);
    if (activeOnly) params.set('activeOnly', 'true');
    const query = params.toString();
    return getAllAdminPages<AdminSubCategory>(
      query ? `/api/admin/subcategories?${query}` : '/api/admin/subcategories',
    );
  },
  createSubCategory: (payload: { categoryId: string; name: string; slug?: string; description?: string; isActive?: boolean }) =>
    adminRequest<AdminSubCategory>('/api/admin/subcategories', { method: 'POST', body: JSON.stringify(payload) }),
  updateSubCategory: (id: string, payload: { categoryId: string; name: string; slug?: string; description?: string; isActive: boolean }) =>
    adminRequest<AdminSubCategory>(`/api/admin/subcategories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSubCategory: (id: string) =>
    adminRequest<void>(`/api/admin/subcategories/${id}`, { method: 'DELETE' }),
  bulkDeleteSubCategories: (ids: string[]) =>
    adminRequest<BulkActionResult>('/api/admin/subcategories/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  bulkActivateSubCategories: (ids: string[]) =>
    adminRequest<BulkActionResult>('/api/admin/subcategories/bulk/activate', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  bulkDeactivateSubCategories: (ids: string[]) =>
    adminRequest<BulkActionResult>('/api/admin/subcategories/bulk/deactivate', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  getProducts: () => getAllAdminPages<AdminProduct>('/api/admin/products'),
  createProduct: (payload: {
    subCategoryId: string;
    sku: string;
    partNumber?: string;
    name: string;
    nameRu: string;
    description: string;
    color?: string;
    price: number;
    initialQuantity: number;
    stockQuantity: number;
    popularityRating?: number;
    imageUrl?: string;
    isActive?: boolean;
  }) => adminRequest<AdminProduct>('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (
    id: string,
    payload: {
      subCategoryId: string;
      sku: string;
      partNumber: string;
      name: string;
      nameRu: string;
      description: string;
      color?: string;
      price: number;
      initialQuantity: number;
      stockQuantity: number;
      popularityRating: number;
      imageUrl?: string;
      isActive: boolean;
    },
  ) => adminRequest<AdminProduct>(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProduct: (id: string) =>
    adminRequest<{ message?: string }>(`/api/admin/products/${id}`, { method: 'DELETE' }),
  bulkDeleteProducts: (ids: string[]) =>
    adminRequest<BulkActionResult>('/api/admin/products/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  bulkActivateProducts: (ids: string[]) =>
    adminRequest<BulkActionResult>('/api/admin/products/bulk/activate', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  bulkDeactivateProducts: (ids: string[]) =>
    adminRequest<BulkActionResult>('/api/admin/products/bulk/deactivate', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  bulkUpdateProductFields: (payload: {
    ids: string[];
    updateColor: boolean;
    color?: string;
    updateStockQuantity: boolean;
    stockQuantity: number;
    updatePopularityRating: boolean;
    popularityRating: number;
  }) =>
    adminRequest<BulkActionResult>('/api/admin/products/bulk/update-fields', {
      method: 'POST',
      body: JSON.stringify({
        ids: payload.ids,
        updateColor: payload.updateColor,
        color: payload.color,
        updateStockQuantity: payload.updateStockQuantity,
        stockQuantity: payload.stockQuantity,
        updatePopularityRating: payload.updatePopularityRating,
        popularityRating: payload.popularityRating,
      }),
    }),
  getProductImageOptions: () => adminRequest<ProductImageOptions>('/api/admin/product-images/options'),
  uploadProductImage: async (file: File, provider: string) => {
    if (!sessionStorage.getItem(ADMIN_SESSION_MARKER)) {
      throw new Error('Требуется авторизация администратора.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_BASE}/api/admin/product-images/upload?provider=${encodeURIComponent(provider)}`,
      {
        method: 'POST',
        credentials: 'include',
        body: formData,
      },
    );

    if (response.status === 401) {
      sessionStorage.removeItem(ADMIN_SESSION_MARKER);
      throw new Error('Неверный API-ключ администратора.');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorBody.message ?? 'Не удалось загрузить изображение');
    }

    return response.json() as Promise<ProductImageUploadResult>;
  },
  getOrders: () => getAllAdminPages<Order>('/api/admin/orders'),
  createOrder: (payload: {
    customerName?: string;
    notes?: string;
    items: { productId: string; quantity: number }[];
    markAsCompleted?: boolean;
  }) =>
    adminRequest<Order>('/api/admin/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getSiteHeaderSettings: () => adminRequest<SiteHeaderSettings>('/api/admin/site-header'),
  updateSiteHeaderSettings: (payload: SiteHeaderSettings) =>
    adminRequest<SiteHeaderSettings>('/api/admin/site-header', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getContactSettings: () => adminRequest<ContactInfo>('/api/admin/contact'),
  updateContactSettings: (payload: ContactInfo) =>
    adminRequest<ContactInfo>('/api/admin/contact', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getContactMessages: async () => {
    const messages = await getAllAdminPages<ContactMessage>('/api/admin/contact/messages');
    return messages.map((message) => ({
      ...message,
      attachmentUrl:
        message.attachmentUrl?.startsWith('/')
          ? `${API_BASE}${message.attachmentUrl}`
          : message.attachmentUrl,
    }));
  },
  updateOrderStatus: (id: string, status: string) =>
    adminRequest<Order>(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

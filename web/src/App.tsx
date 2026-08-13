import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CatalogPage } from './pages/CatalogPage';
import { CartPage } from './pages/CartPage';
import { NewsPage } from './pages/NewsPage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { ContactPage } from './pages/ContactPage';
import { AdminLayout } from './admin/AdminLayout';
import { AdminLoginPage } from './admin/AdminLoginPage';
import { AdminCategoriesPage } from './admin/AdminCategoriesPage';
import { AdminSubCategoriesPage } from './admin/AdminSubCategoriesPage';
import { AdminProductsPage } from './admin/AdminProductsPage';
import { AdminOrdersPage } from './admin/AdminOrdersPage';
import { AdminSiteHeaderPage } from './admin/AdminSiteHeaderPage';
import { AdminContactPage } from './admin/AdminContactPage';
import { AdminContactMessagesPage } from './admin/AdminContactMessagesPage';
import { getAdminKey } from './adminApi';
import './App.css';

function AdminIndex() {
  return <Navigate to={getAdminKey() ? '/admin/categories' : '/admin/login'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CatalogPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="news/:slug" element={<NewsDetailPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminIndex />} />
          <Route path="login" element={<AdminLoginPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="subcategories" element={<AdminSubCategoriesPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="site-header" element={<AdminSiteHeaderPage />} />
          <Route path="contact" element={<AdminContactPage />} />
          <Route path="contact-messages" element={<AdminContactMessagesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

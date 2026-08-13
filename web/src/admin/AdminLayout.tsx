import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { adminApi, clearAdminKey, getAdminKey } from '../adminApi';
import { useEffect, useState } from 'react';

export function AdminLayout() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(!!getAdminKey());

  useEffect(() => {
    setAuthenticated(!!getAdminKey());
  }, []);

  const handleLogout = async () => {
    await adminApi.logout().catch(() => undefined);
    clearAdminKey();
    navigate('/admin/login');
  };

  if (!authenticated) {
    return <Outlet />;
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <Link to="/" className="brand">
          Legoparts — админ
        </Link>
        <nav className="nav admin-nav">
          <NavLink to="/admin/categories">Категории</NavLink>
          <NavLink to="/admin/subcategories">Подкатегории</NavLink>
          <NavLink to="/admin/products">Товары</NavLink>
          <NavLink to="/admin/orders">Заказы</NavLink>
          <NavLink to="/admin/site-header">Шапка сайта</NavLink>
          <NavLink to="/admin/contact">Контакты</NavLink>
          <NavLink to="/admin/contact-messages">Обратная связь</NavLink>
        </nav>
        <div className="admin-topbar-actions">
          <Link to="/">Магазин</Link>
          <button type="button" className="secondary" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </header>
      <main className="admin-page">
        <Outlet />
      </main>
    </div>
  );
}

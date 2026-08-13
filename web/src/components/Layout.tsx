import { Outlet, useLocation } from 'react-router-dom';
import { cartCount, loadCart } from '../cart';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SitePageHeader } from './SitePageHeader';
import { SiteFooter } from './SiteFooter';

export function Layout() {
  const [itemsInCart, setItemsInCart] = useState(0);
  const [cartToast, setCartToast] = useState<string | null>(null);
  const cartToastTimerRef = useRef<number | null>(null);
  const location = useLocation();
  const isCatalogHome = location.pathname === '/';
  const isSidebarPage = location.pathname === '/cart'
    || location.pathname.startsWith('/products/');

  useEffect(() => {
    const refresh = () => setItemsInCart(cartCount(loadCart()));
    refresh();
    window.addEventListener('legoparts-cart-updated', refresh);
    return () => window.removeEventListener('legoparts-cart-updated', refresh);
  }, []);

  useEffect(
    () => () => {
      if (cartToastTimerRef.current !== null) {
        window.clearTimeout(cartToastTimerRef.current);
      }
    },
    [],
  );

  const showCartToast = useCallback((message: string) => {
    setCartToast(message);

    if (cartToastTimerRef.current !== null) {
      window.clearTimeout(cartToastTimerRef.current);
    }

    cartToastTimerRef.current = window.setTimeout(() => {
      setCartToast(null);
      cartToastTimerRef.current = null;
    }, 3000);
  }, []);

  return (
    <div className="app-shell app-shell-catalog">
      <SitePageHeader itemsInCart={itemsInCart} cartToast={cartToast} />
      <main className={isCatalogHome ? 'page page-catalog' : isSidebarPage ? 'page page-sidebar' : 'page'}>
        <Outlet context={{ itemsInCart, showCartToast }} />
      </main>
      <footer className="footer">
        <div className="footer-main">
          <span className="footer-brand">Распродажа комплектующих для робототехники! 🛠️</span>
          <SiteFooter />
        </div>
      </footer>
    </div>
  );
}

export function notifyCartUpdated() {
  window.dispatchEvent(new Event('legoparts-cart-updated'));
}

export type LayoutContext = {
  itemsInCart: number;
  showCartToast: (message: string) => void;
};

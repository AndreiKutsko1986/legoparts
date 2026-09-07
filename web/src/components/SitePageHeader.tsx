import type { CSSProperties } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { SiteBrandMark, useSiteHeader } from '../siteHeader';
import './SitePageHeader.css';

type SitePageHeaderProps = {
  itemsInCart: number;
  cartToast?: string | null;
};

export function SitePageHeader({ itemsInCart, cartToast }: SitePageHeaderProps) {
  const { settings: siteHeader } = useSiteHeader();
  const brandName = siteHeader?.brandName || 'Legoparts';
  const promoImageUrl = siteHeader?.promoBannerImageUrl?.trim() || '';
  const promoText = siteHeader?.promoBannerText?.trim() || '';
  const hasPromoBanner = promoImageUrl !== '' || promoText !== '';

  return (
    <>
      <div className="site-page-header-top">
        <Link to="/" className="site-page-header-brand">
          <SiteBrandMark brandIconUrl={siteHeader?.brandIconUrl} />
          <span>{brandName}</span>
        </Link>
        <nav className="site-page-header-nav" aria-label="Основное меню">
          <NavLink to="/" className="site-page-header-nav-link" end>
            Каталог
          </NavLink>
          <div className="catalog-cart-wrap">
            <Link to="/cart" className="catalog-cart-btn">
              <span className="catalog-cart-icon" aria-hidden="true">
                🛒
              </span>
              Корзина ({itemsInCart})
            </Link>
            {cartToast ? (
              <div className="catalog-cart-toast" role="status" aria-live="polite">
                {cartToast}
              </div>
            ) : null}
          </div>
        </nav>
      </div>
      <header
        className={`site-page-header${siteHeader?.heroImageUrl ? ' site-page-header--has-image' : ''}`}
        style={
          siteHeader?.heroImageUrl
            ? ({ '--site-page-header-image': `url("${siteHeader.heroImageUrl}")` } as CSSProperties)
            : undefined
        }
      >
        <div className={`site-page-header-main${hasPromoBanner ? ' site-page-header-main--with-promo' : ''}`}>
          <div className="site-page-header-copy">
            <h1>{siteHeader?.heroTitle}</h1>
            {siteHeader?.heroSubtitle ? (
              <p className="site-page-header-subtitle">{siteHeader.heroSubtitle}</p>
            ) : null}
          </div>
          {hasPromoBanner ? (
            <aside className="site-page-header-promo" aria-label="Рекламный баннер">
              {promoImageUrl ? (
                <img src={promoImageUrl} alt="" className="site-page-header-promo-image" />
              ) : null}
              {promoText ? <p className="site-page-header-promo-text">{promoText}</p> : null}
            </aside>
          ) : null}
        </div>
      </header>
    </>
  );
}

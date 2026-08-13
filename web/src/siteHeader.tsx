import { useEffect, useState } from 'react';
import type { SiteHeaderSettings } from './api';
import { api } from './api';

const DEFAULT_FAVICON = '/favicon.svg';

let cachedSettings: SiteHeaderSettings | null = null;
let settingsPromise: Promise<SiteHeaderSettings> | null = null;

export function applySiteHeaderBranding(settings: SiteHeaderSettings) {
  document.title = settings.tabTitle;

  const faviconHref = settings.faviconUrl?.trim() || DEFAULT_FAVICON;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");

  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  link.href = faviconHref;

  if (faviconHref.endsWith('.svg')) {
    link.type = 'image/svg+xml';
  } else if (faviconHref.endsWith('.png')) {
    link.type = 'image/png';
  } else if (faviconHref.endsWith('.ico')) {
    link.type = 'image/x-icon';
  } else {
    link.removeAttribute('type');
  }
}

export function invalidateSiteHeaderCache() {
  cachedSettings = null;
  settingsPromise = null;
}

export function fetchSiteHeaderSettings(force = false): Promise<SiteHeaderSettings> {
  if (!force && cachedSettings) {
    return Promise.resolve(cachedSettings);
  }

  if (!force && settingsPromise) {
    return settingsPromise;
  }

  settingsPromise = api.getSiteHeader().then((settings) => {
    cachedSettings = settings;
    applySiteHeaderBranding(settings);
    return settings;
  });

  return settingsPromise;
}

export function useSiteHeader() {
  const [settings, setSettings] = useState<SiteHeaderSettings | null>(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchSiteHeaderSettings()
      .then((result) => {
        if (!cancelled) {
          setSettings(result);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить настройки шапки');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loading, error };
}

export function SiteBrandMark({
  brandIconUrl,
  className,
}: {
  brandIconUrl?: string | null;
  className?: string;
}) {
  if (brandIconUrl?.trim()) {
    return <img src={brandIconUrl} alt="" className={className ?? 'site-brand-icon'} aria-hidden="true" />;
  }

  return <span className={className ?? 'catalog-brand-mark'} aria-hidden="true" />;
}

import { useEffect, useState } from 'react';
import type { ContactInfo } from '../api';
import { api } from '../api';
import { useSiteHeader } from '../siteHeader';

export function SiteFooter() {
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const { settings } = useSiteHeader();

  useEffect(() => {
    api.getContactInfo().then(setContactInfo).catch(() => setContactInfo(null));
  }, []);

  return (
    <div className="footer-contacts">
      {settings?.footerDisclaimer ? (
        <span className="footer-disclaimer">{settings.footerDisclaimer}</span>
      ) : null}
      {contactInfo ? (
        <span>
          {contactInfo.address}
          {' · '}
          <a href={`tel:${contactInfo.phone}`}>{contactInfo.phone}</a>
          {' · '}
          <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
        </span>
      ) : null}
    </div>
  );
}

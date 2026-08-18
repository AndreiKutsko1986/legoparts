import { useEffect, useState } from 'react';
import type { ContactInfo } from '../api';
import { api } from '../api';

export function SiteFooter() {
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);

  useEffect(() => {
    api.getContactInfo().then(setContactInfo).catch(() => setContactInfo(null));
  }, []);

  return (
    <div className="footer-contacts">
      <span className="footer-disclaimer">Все детали хоть и Б.У. но в очень хорошем состоянии. Все можно взять на тест. Цены на сайте носят исключительно информационный характер.</span>
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

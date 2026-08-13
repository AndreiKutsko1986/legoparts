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
      {contactInfo ? (
        <>
          <span>{contactInfo.storeName}</span>
          <span>{contactInfo.address}</span>
          <span>
            <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
          </span>
          <span>
            <a href={`tel:${contactInfo.phone}`}>{contactInfo.phone}</a>
          </span>
        </>
      ) : null}
    </div>
  );
}

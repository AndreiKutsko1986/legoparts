import './AdminActiveStatusIcon.css';

type AdminActiveStatusIconProps = {
  isActive: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
};

export function AdminActiveStatusIcon({
  isActive,
  activeLabel = 'Активен',
  inactiveLabel = 'Неактивен',
}: AdminActiveStatusIconProps) {
  const label = isActive ? activeLabel : inactiveLabel;

  return (
    <span className="admin-active-status" role="img" aria-label={label} title={label}>
      {isActive ? (
        <svg className="admin-active-status-icon admin-active-status-icon--active" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" fill="currentColor" opacity="0.14" />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.5 10.2 L8.8 12.5 L13.8 7.5"
          />
        </svg>
      ) : (
        <svg className="admin-active-status-icon admin-active-status-icon--inactive" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" fill="currentColor" opacity="0.14" />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            d="M7.1 7.1 L12.9 12.9 M12.9 7.1 L7.1 12.9"
          />
        </svg>
      )}
    </span>
  );
}

type BulkActionsBarProps = {
  selectedCount: number;
  disabled?: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onClone?: () => void;
};

export function BulkActionsBar({
  selectedCount,
  disabled = false,
  onActivate,
  onDeactivate,
  onDelete,
  onClone,
}: BulkActionsBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bulk-actions-bar">
      <span>Выбрано: {selectedCount}</span>
      {selectedCount === 1 && onClone && (
        <button type="button" disabled={disabled} onClick={onClone}>
          Клонировать
        </button>
      )}
      <button type="button" disabled={disabled} onClick={onActivate}>
        Активировать
      </button>
      <button type="button" className="secondary" disabled={disabled} onClick={onDeactivate}>
        Деактивировать
      </button>
      <button type="button" className="danger" disabled={disabled} onClick={onDelete}>
        Удалить
      </button>
    </div>
  );
}

export function formatBulkResult(processedCount: number, failedCount: number, errors: string[]) {
  if (failedCount === 0) {
    return `Обработано: ${processedCount}.`;
  }

  const details = errors.length > 0 ? ` ${errors.join(' ')}` : '';
  return `Обработано: ${processedCount}, ошибок: ${failedCount}.${details}`;
}

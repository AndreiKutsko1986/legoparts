export const orderStatusLabels: Record<string, string> = {
  Pending: 'Ожидает',
  Confirmed: 'Подтверждён',
  Shipped: 'Отправлен',
  Delivered: 'Выполнен',
  Cancelled: 'Отменён',
};

export function formatPrice(value: number) {
  return `${value.toFixed(2)} ₽`;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU');
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU');
}

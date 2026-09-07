export const orderStatusLabels: Record<string, string> = {
  Pending: 'Ожидает',
  Processing: 'В обработке',
  Confirmed: 'Подтверждён',
  Shipped: 'Отправлен',
  Delivered: 'Выполнен',
  Cancelled: 'Отменён',
};

export function formatPrice(value: number) {
  return `${value.toFixed(2)} BYN`;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU');
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU');
}

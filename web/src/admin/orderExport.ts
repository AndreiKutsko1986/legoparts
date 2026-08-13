import type { Order } from '../adminApi';
import { formatDateTime, orderStatusLabels } from '../labels';

const HEADERS = [
  'Номер заказа',
  'Дата',
  'Покупатель',
  'Email',
  'Телефон',
  'Адрес',
  'Статус',
  'Сумма заказа',
  'SKU',
  'Товар',
  'Количество',
  'Цена',
  'Сумма строки',
  'Комментарий',
] as const;

type ExportRow = string[];

function buildOrderRows(orders: Order[]): ExportRow[] {
  const rows: ExportRow[] = [Array.from(HEADERS)];

  for (const order of orders) {
    const statusLabel = orderStatusLabels[order.status] ?? order.status;
    const createdAt = formatDateTime(order.createdAt);
    const notes = order.notes?.trim() ?? '';

    if (order.items.length === 0) {
      rows.push([
        order.orderNumber,
        createdAt,
        order.customerName,
        order.customerEmail,
        order.customerPhone ?? '',
        order.shippingAddress,
        statusLabel,
        String(order.totalAmount),
        '',
        '',
        '',
        '',
        '',
        notes,
      ]);
      continue;
    }

    for (const item of order.items) {
      rows.push([
        order.orderNumber,
        createdAt,
        order.customerName,
        order.customerEmail,
        order.customerPhone ?? '',
        order.shippingAddress,
        statusLabel,
        String(order.totalAmount),
        item.productSku,
        item.productName,
        String(item.quantity),
        String(item.unitPrice),
        String(item.lineTotal),
        notes,
      ]);
    }
  }

  return rows;
}

function escapeCsvCell(value: string) {
  if (/[",;\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildExportFilename(extension: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `orders-${stamp}.${extension}`;
}

export function exportOrdersToCsv(orders: Order[]) {
  const rows = buildOrderRows(orders);
  const content = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n')}`;
  downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8;' }), buildExportFilename('csv'));
}

export function exportOrdersToExcel(orders: Order[]) {
  const rows = buildOrderRows(orders);
  const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('');

  const html = `\uFEFF<html><head><meta charset="UTF-8"></head><body><table>${tableRows}</table></body></html>`;
  downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), buildExportFilename('xls'));
}
